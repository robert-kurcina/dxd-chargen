import 'server-only';
import { createHmac } from 'node:crypto';
import { securityOperation } from './operation-context';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { username, twoFactor } from 'better-auth/plugins';
import type { openDatabase } from '../db/connection';
import * as schema from '../db/auth-schema';

import { createRateLimitStore } from './rate-limit-store';
import { createSecurityJournal } from './security-journal';
import { createLocalMailStore, type LocalAccountMail } from './local-mail-store';
import { createCharacterService } from './character-service';
import { createCampaignService } from './campaign-service';

async function readBoundedJson(request: Request, maximumBytes: number): Promise<{ value?: unknown; error?: Response }> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) return { error: Response.json({ error: 'Request too large.' }, { status: 413, headers: { 'Cache-Control': 'no-store' } }) };
  if (!request.body) return { error: Response.json({ error: 'Invalid JSON.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }) };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) { await reader.cancel(); return { error: Response.json({ error: 'Request too large.' }, { status: 413, headers: { 'Cache-Control': 'no-store' } }) }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { error: Response.json({ error: 'Invalid JSON.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }) };
  }
}

// Test/development harness only. No HTTP route or external mail transport.
export function createLocalAccountHarness(connection: ReturnType<typeof openDatabase>, baseURL: string, secret: string, options: { disableRateLimitsForTests?: boolean } = {}) {
  const origin = new URL(baseURL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) || !['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('The local account harness requires a loopback origin.');
  if (secret.length < 32) throw new Error('Provide a fresh test secret of at least 32 characters.');
  const inbox = createLocalMailStore(connection, secret);
  const deliver = async (mail: LocalAccountMail) => { inbox.enqueue(mail); };
  const auth = betterAuth({
    appName: 'Sarna Len local harness', baseURL: origin.origin, secret,
    trustedOrigins: [origin.origin],
    rateLimit: { enabled: !options.disableRateLimitsForTests, customStorage: createRateLimitStore(connection, secret) },
    database: drizzleAdapter(connection.db, { provider: 'sqlite', schema }),
    emailAndPassword: {
      enabled: true, requireEmailVerification: true, revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => deliver({ kind: 'reset-password', to: user.email, url }),
    },
    emailVerification: {
      sendOnSignUp: true, autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => deliver({ kind: 'verify-email', to: user.email, url }),
    },
    user: { changeEmail: { enabled: true, updateEmailWithoutVerification: false } },
    session: { cookieCache: { enabled: false } },
    plugins: [username(), twoFactor({ totpOptions: { digits: 6, period: 30 } })],
    logger: { disabled: true },
    // Direct loopback harness: no reverse proxy is configured to sanitize headers.
    advanced: { database: { generateId: 'uuid' }, ipAddress: { ipAddressHeaders: [] } },
  });
  const journal = createSecurityJournal(connection);
  const characters = createCharacterService(connection);
  const campaigns = createCampaignService(connection);
  const invokeAuth = async (request: Request) => {
    const response = await auth.handler(request);
    // The pinned library uses X-Retry-After; also expose the standard header.
    if (response.status === 429 && response.headers.has('x-retry-after')) {
      response.headers.set('retry-after', response.headers.get('x-retry-after')!);
    }
    return securityOperation.getStore()?.totpReplayRejected
      ? Response.json({ code: 'TOTP_ALREADY_USED' }, { status: 401 }) : response;
  };
  const handle = async (request: Request) => {
    return journal.run(request, async () => {
      const session = await auth.api.getSession({ headers: request.headers, query: { disableRefresh: true } });
      return session?.user.id ?? null;
    }, async incoming => {
      const route = new URL(incoming.url).pathname;
      const adminActor = securityOperation.getStore()?.actorId ?? null;
      const reviewListPath = '/api/auth/admin/security-operations';
      const campaignRoot = '/api/auth/campaigns';
      if (route === campaignRoot && incoming.method === 'GET') return campaigns.list(securityOperation.getStore()?.actorId ?? null);
      if (route === campaignRoot && incoming.method === 'POST') {
        if (incoming.headers.get('origin') !== origin.origin) return Response.json({ error: 'Untrusted origin.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
        if (!incoming.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return Response.json({ error: 'JSON required.' }, { status: 415, headers: { 'Cache-Control': 'no-store' } });
        const parsed = await readBoundedJson(incoming, 4096);
        if (parsed.error) return parsed.error;
        return campaigns.createFork(securityOperation.getStore()?.actorId ?? null, parsed.value);
      }
      if (route.startsWith(campaignRoot + '/')) return Response.json({ error: 'Not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
      const characterRoot = '/api/auth/characters';
      const characterMatch = route.match(/^\/api\/auth\/characters\/([0-9a-f-]{36})(?:\/versions(?:\/(\d+))?)?$/i);
      const characterEndpoint = route === characterRoot || route.startsWith(characterRoot + '/');
      if (characterEndpoint) {
        const actorId = securityOperation.getStore()?.actorId ?? null;
        const noStore = { 'Cache-Control': 'no-store' };
        const isWrite = incoming.method === 'POST' || incoming.method === 'PUT';
        if (isWrite && incoming.headers.get('origin') !== origin.origin) return Response.json({ error: 'Untrusted origin.' }, { status: 403, headers: noStore });
        if (isWrite && !incoming.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return Response.json({ error: 'JSON required.' }, { status: 415, headers: noStore });
        if (incoming.method === 'GET' && route === characterRoot) {
          const campaignId = new URL(incoming.url).searchParams.get('campaignId');
          return characters.list(actorId, campaignId);
        }
        if (incoming.method === 'POST' && route === characterRoot) {
          const parsed = await readBoundedJson(incoming, 6 * 1024 * 1024);
          if (parsed.error) return parsed.error;
          return characters.create(actorId, parsed.value);
        }
        if (characterMatch && incoming.method === 'GET') {
          if (route.endsWith('/versions')) return characters.history(actorId, characterMatch[1]);
          return characters.read(actorId, characterMatch[1], characterMatch[2] ? Number(characterMatch[2]) : undefined);
        }
        if (characterMatch && !route.endsWith('/versions') && !characterMatch[2] && incoming.method === 'PUT') {
          const parsed = await readBoundedJson(incoming, 6 * 1024 * 1024);
          if (parsed.error) return parsed.error;
          return characters.update(actorId, characterMatch[1], parsed.value);
        }
        return Response.json({ error: 'Not found.' }, { status: 404, headers: noStore });
      }
      const reviewMatch = route.match(/^\/api\/auth\/admin\/security-operations\/([0-9a-f-]{36})\/review$/i);
      if (incoming.method === 'GET' && route === reviewListPath) {
        if (!journal.isSiteAdministrator(adminActor)) return Response.json({ error: 'Forbidden.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
        const rawLimit = new URL(incoming.url).searchParams.get('limit') ?? '100';
        if (!/^\d{1,3}$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 100) return Response.json({ error: 'Invalid limit.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
        return Response.json(journal.reviewCandidates({ limit: Number(rawLimit) }), { headers: { 'Cache-Control': 'no-store' } });
      }
      if (incoming.method === 'POST' && reviewMatch) {
        if (!journal.isSiteAdministrator(adminActor)) return Response.json({ error: 'Forbidden.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
        if (incoming.headers.get('origin') !== origin.origin) return Response.json({ error: 'Untrusted origin.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
        if (!incoming.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return Response.json({ error: 'JSON required.' }, { status: 415, headers: { 'Cache-Control': 'no-store' } });
        const raw = await incoming.text();
        if (Buffer.byteLength(raw, 'utf8') > 1024) return Response.json({ error: 'Request too large.' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
        let body;
        try { body = JSON.parse(raw); } catch { return Response.json({ error: 'Invalid JSON.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !['reviewed-no-automatic-retry', 'follow-up-required'].includes(body.disposition)) return Response.json({ error: 'Invalid review disposition.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
        try {
          const decision = journal.recordStaffReviewDecision(reviewMatch[1], body.disposition);
          return Response.json(decision, { headers: { 'Cache-Control': 'no-store' } });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Review could not be recorded.';
          return Response.json({ error: message }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
        }
      }
      if (incoming.method === 'POST' && route === '/api/auth/sign-up/email') {
        let body: unknown;
        try { body = await incoming.clone().json(); } catch { return Response.json({ code: 'INVALID_JSON' }, { status: 400 }); }
        if (!body || typeof body !== 'object' || !('username' in body) || typeof body.username !== 'string' || !body.username.trim()) return Response.json({ code: 'USERNAME_REQUIRED' }, { status: 400 });
      }

      if (incoming.method === 'POST' && new URL(incoming.url).pathname === '/api/auth/two-factor/verify-totp') {
        try {
          const body = await incoming.clone().json();
          if (typeof body?.code === 'string' && /^\d{6}$/.test(body.code)) {
            securityOperation.getStore()!.totpFingerprint = createHmac('sha256', secret).update('dxd-totp-replay-v1\0').update(body.code).digest('hex');
          }
        } catch { /* The library returns the input error without creating a session. */ }
      }
      if (incoming.method !== 'POST' || !['/api/auth/change-password', '/api/auth/change-email'].includes(route)) return invokeAuth(incoming);
      const session = await auth.api.getSession({ headers: incoming.headers, query: { disableRefresh: true } });
      if (!session) return Response.json({ code: 'UNAUTHORIZED' }, { status: 401 });
      const age = Date.now() - new Date(session.session.createdAt).getTime();
      if (!Number.isFinite(age) || age < 0 || age >= 5 * 60 * 1000) return Response.json({ code: 'REAUTHENTICATION_REQUIRED' }, { status: 403 });
      let body: unknown;
      try { body = await incoming.json(); } catch { return Response.json({ code: 'INVALID_JSON' }, { status: 400 }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ code: 'INVALID_JSON' }, { status: 400 });
      const headers = new Headers(incoming.headers); headers.delete('content-length');
      // Preserve Origin/Cookie headers so the library still enforces its request protections.
      return invokeAuth(new Request(incoming.url, { method: 'POST', headers, body: JSON.stringify(route === '/api/auth/change-password' ? { ...body, revokeOtherSessions: true } : body) }));
    });
  };
  return { auth, handle, journal, inbox, takeMail: () => connection.sqlite.transaction(() => { const rows = inbox.pending(); for (const row of rows) inbox.acknowledge(row.id); return rows.map(row => row.mail); })(), clearMail: inbox.clear };
}
