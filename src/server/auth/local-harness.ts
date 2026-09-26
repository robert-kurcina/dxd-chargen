import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { username, twoFactor } from 'better-auth/plugins';
import type { openDatabase } from '../db/connection';
import * as schema from '../db/auth-schema';

import { createSecurityJournal } from './security-journal';
import { createLocalMailStore, type LocalAccountMail } from './local-mail-store';

// Test/development harness only. No HTTP route or external mail transport.
export function createLocalAccountHarness(connection: ReturnType<typeof openDatabase>, baseURL: string, secret: string) {
  const origin = new URL(baseURL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) || !['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('The local account harness requires a loopback origin.');
  if (secret.length < 32) throw new Error('Provide a fresh test secret of at least 32 characters.');
  const inbox = createLocalMailStore(connection, secret);
  const deliver = async (mail: LocalAccountMail) => { inbox.enqueue(mail); };
  const auth = betterAuth({
    appName: 'Sarna Len local harness', baseURL: origin.origin, secret,
    trustedOrigins: [origin.origin],
    database: drizzleAdapter(connection.db, { provider: 'sqlite', schema }),
    emailAndPassword: {
      enabled: true, requireEmailVerification: true, revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => deliver({ kind: 'reset-password', to: user.email, url }),
    },
    emailVerification: {
      sendOnSignUp: true, autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => deliver({ kind: 'verify-email', to: user.email, url }),
    },
    session: { cookieCache: { enabled: false } },
    plugins: [username(), twoFactor()],
    advanced: { database: { generateId: 'uuid' } },
  });
  const journal = createSecurityJournal(connection);
  const handle = async (request: Request) => {
    return journal.run(request, async () => {
      const session = await auth.api.getSession({ headers: request.headers, query: { disableRefresh: true } });
      return session?.user.id ?? null;
    }, async incoming => {
      if (incoming.method !== 'POST' || new URL(incoming.url).pathname !== '/api/auth/change-password') return auth.handler(incoming);
      const session = await auth.api.getSession({ headers: incoming.headers, query: { disableRefresh: true } });
      if (!session) return Response.json({ code: 'UNAUTHORIZED' }, { status: 401 });
      const age = Date.now() - new Date(session.session.createdAt).getTime();
      if (!Number.isFinite(age) || age < 0 || age >= 5 * 60 * 1000) return Response.json({ code: 'REAUTHENTICATION_REQUIRED' }, { status: 403 });
      let body: unknown;
      try { body = await incoming.json(); } catch { return Response.json({ code: 'INVALID_JSON' }, { status: 400 }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ code: 'INVALID_JSON' }, { status: 400 });
      const headers = new Headers(incoming.headers); headers.delete('content-length');
      // Preserve Origin/Cookie headers so the library still enforces its request protections.
      return auth.handler(new Request(incoming.url, { method: 'POST', headers, body: JSON.stringify({ ...body, revokeOtherSessions: true }) }));
    });
  };
  return { auth, handle, journal, inbox, takeMail: () => connection.sqlite.transaction(() => { const rows = inbox.pending(); for (const row of rows) inbox.acknowledge(row.id); return rows.map(row => row.mail); })(), clearMail: inbox.clear };
}
