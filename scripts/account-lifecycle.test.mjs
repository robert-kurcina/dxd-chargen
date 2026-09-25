import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const { openDatabase, migrateDatabase } = await import('../src/server/db/connection.ts');
const { createLocalAccountHarness } = await import('../src/server/auth/local-harness.ts');

test('local verification, login/logout, password reset and session revocation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-account-'));
  const connection = openDatabase(path.join(root, 'accounts.sqlite'));
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const secret = randomUUID() + randomUUID();
    assert.throws(() => createLocalAccountHarness(connection, 'https://example.test', secret), /loopback/);
    const { auth, takeMail } = createLocalAccountHarness(connection, 'http://localhost:3000', secret);
    const origin = 'http://localhost:3000';
    async function request(route, body, cookie = '') {
      return auth.handler(new Request(`${origin}/api/auth/${route}`, { method: body ? 'POST' : 'GET', headers: { origin, ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    }
    const credentials = { email: 'player@example.test', password: 'Temporary-password-123!', name: 'Player', username: 'player' };
    let response = await request('sign-up/email', credentials);
    assert.equal(response.status, 200); assert.equal((await response.json()).token, null);
    const verification = takeMail().find(mail => mail.kind === 'verify-email');
    assert.equal(verification.to, credentials.email);
    response = await request('sign-in/email', credentials); assert.equal(response.status, 403);
    takeMail();
    response = await auth.handler(new Request(verification.url)); assert.ok(response.status < 400);
    const login = async password => {
      const r = await request('sign-in/email', { email: credentials.email, password });
      assert.equal(r.status, 200);
      const cookies = r.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
      assert.ok(cookies.includes('session_token'));
      assert.match(r.headers.get('set-cookie'), /httponly/i);
      return cookies;
    };
    const first = await login(credentials.password);
    response = await request('get-session', undefined, first); assert.equal((await response.json()).user.email, credentials.email);
    response = await request('sign-out', {}, first); assert.equal(response.status, 200);
    response = await request('get-session', undefined, first); assert.equal(await response.json(), null);
    const second = await login(credentials.password);
    const third = await login(credentials.password);
    const known = await request('request-password-reset', { email: credentials.email, redirectTo: `${origin}/reset` });
    const resetMail = takeMail().find(mail => mail.kind === 'reset-password'); assert.ok(resetMail);
    const unknown = await request('request-password-reset', { email: 'missing@example.test', redirectTo: `${origin}/reset` });
    assert.equal(known.status, unknown.status); assert.deepEqual(await known.json(), await unknown.json()); assert.equal(takeMail().length, 0);
    const token = new URL(resetMail.url).pathname.split('/').pop();
    const changed = 'Changed-password-456!';
    response = await request('reset-password', { token, newPassword: changed }); assert.equal(response.status, 200);
    response = await request('reset-password', { token, newPassword: 'Replay-password-789!' }); assert.ok(response.status >= 400);
    for (const cookie of [second, third]) { response = await request('get-session', undefined, cookie); assert.equal(await response.json(), null); }
    response = await request('sign-in/email', credentials); assert.equal(response.status, 401);
    let current = await login(changed);
    const other = await login(changed);
    response = await request('change-password', { currentPassword: changed, newPassword: 'Manual-change-password-987!', revokeOtherSessions: true }, current);
    assert.equal(response.status, 200);
    const rotated = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    assert.ok(rotated.includes('session_token')); current = rotated;
    response = await request('get-session', undefined, other); assert.equal(await response.json(), null);
    response = await request('get-session', undefined, current); assert.ok((await response.json()).user);
    await request('request-password-reset', { email: credentials.email, redirectTo: `${origin}/reset` });
    const expiredToken = new URL(takeMail().find(mail => mail.kind === 'reset-password').url).pathname.split('/').pop();
    connection.sqlite.prepare('UPDATE verification SET expires_at = 0').run();
    response = await request('reset-password', { token: expiredToken, newPassword: 'Expired-password-000!' }); assert.ok(response.status >= 400);
    await login('Manual-change-password-987!');
    const hostile = await auth.handler(new Request(`${origin}/api/auth/sign-out`, { method: 'POST', headers: { origin: 'https://untrusted.example', 'content-type': 'application/json', cookie: current }, body: '{}' }));
    assert.equal(hostile.status, 403);
    response = await request('get-session', undefined, current); assert.ok((await response.json()).user);
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});
