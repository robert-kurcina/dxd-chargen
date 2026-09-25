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
    const { handle, takeMail } = createLocalAccountHarness(connection, 'http://localhost:3000', secret);
    const origin = 'http://localhost:3000';
    async function request(route, body, cookie = '') {
      return handle(new Request(`${origin}/api/auth/${route}`, { method: body ? 'POST' : 'GET', headers: { origin, ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    }
    const credentials = { email: 'player@example.test', password: 'Temporary-password-123!', name: 'Player', username: 'player' };
    let response = await request('sign-up/email', credentials);
    assert.equal(response.status, 200); assert.equal((await response.json()).token, null);
    const verification = takeMail().find(mail => mail.kind === 'verify-email');
    assert.equal(verification.to, credentials.email);
    response = await request('sign-in/email', credentials); assert.equal(response.status, 403);
    takeMail();
    response = await handle(new Request(verification.url)); assert.ok(response.status < 400);
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
    const hostile = await handle(new Request(`${origin}/api/auth/sign-out`, { method: 'POST', headers: { origin: 'https://untrusted.example', 'content-type': 'application/json', cookie: current }, body: '{}' }));
    assert.equal(hostile.status, 403);
    response = await request('get-session', undefined, current); assert.ok((await response.json()).user);
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});

test('MFA requires confirmed enrollment, gates login and consumes recovery codes', async () => {
  const { createHmac } = await import('node:crypto');
  const totp = uri => {
    const url = new URL(uri), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits = [...url.searchParams.get('secret').replace(/=+$/, '').toUpperCase()].map(c => alphabet.indexOf(c).toString(2).padStart(5, '0')).join('');
    const key = Buffer.from(bits.match(/.{8}/g).map(byte => parseInt(byte, 2)));
    const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / Number(url.searchParams.get('period') || 30))));
    const mac = createHmac('sha1', key).update(counter).digest();
    const offset = mac[mac.length - 1] & 15;
    const digits = Number(url.searchParams.get('digits') || 6);
    return String((mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).padStart(digits, '0');
  };
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-mfa-'));
  const connection = openDatabase(path.join(root, 'accounts.sqlite'));
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const { handle, takeMail } = createLocalAccountHarness(connection, 'http://localhost:3000', randomUUID() + randomUUID());
    const request = (route, body, cookie = '') => handle(new Request(`http://localhost:3000/api/auth/${route}`, { method: body ? 'POST' : 'GET', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', cookie }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    const cookies = r => r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    const credentials = { email: 'mfa@example.test', password: 'Temporary-mfa-password-123!', username: 'mfatest', name: 'MFA' };
    assert.equal((await request('sign-up/email', credentials)).status, 200);
    await handle(new Request(takeMail()[0].url));
    let response = await request('sign-in/email', credentials), session = cookies(response);
    response = await request('two-factor/enable', { password: 'Wrong-password-123!' }, session); assert.ok(response.status >= 400);
    response = await request('two-factor/enable', { password: credentials.password }, session); assert.equal(response.status, 200);
    const enrollment = await response.json(); assert.ok(enrollment.backupCodes.length);
    assert.equal(connection.sqlite.prepare('SELECT two_factor_enabled FROM user').get().two_factor_enabled, 0);
    response = await request('two-factor/verify-totp', { code: 'invalid' }, session); assert.ok(response.status >= 400);
    response = await request('two-factor/verify-totp', { code: totp(enrollment.totpURI) }, session); assert.equal(response.status, 200);
    session = cookies(response) || session;
    assert.equal(connection.sqlite.prepare('SELECT two_factor_enabled FROM user').get().two_factor_enabled, 1);
    await request('sign-out', {}, session);
    response = await request('sign-in/email', credentials); assert.equal(response.status, 200);
    assert.equal((await response.json()).twoFactorRedirect, true);
    let challenge = cookies(response);
    response = await request('get-session', undefined, challenge); assert.equal(await response.json(), null);
    response = await request('two-factor/verify-backup-code', { code: enrollment.backupCodes[0] }, challenge); assert.equal(response.status, 200);
    session = cookies(response);
    response = await request('get-session', undefined, session); assert.ok((await response.json()).user);
    await request('sign-out', {}, session);
    response = await request('sign-in/email', credentials); challenge = cookies(response);
    response = await request('two-factor/verify-backup-code', { code: enrollment.backupCodes[0] }, challenge); assert.ok(response.status >= 400);
    response = await request('get-session', undefined, challenge); assert.equal(await response.json(), null);
    response = await request('two-factor/verify-backup-code', { code: enrollment.backupCodes[1] }, challenge); assert.equal(response.status, 200);
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});

test('local mail survives reopening, stays encrypted and requires explicit acknowledgement', async () => {
  const { createLocalMailStore } = await import('../src/server/auth/local-mail-store.ts');
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-mail-'));
  const filename = path.join(root, 'mail.sqlite'), secret = randomUUID() + randomUUID();
  let connection = openDatabase(filename);
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const mail = { kind: 'verify-email', to: 'private@example.test', url: 'http://localhost:3000/verify?token=never-log-this' };
    const id = createLocalMailStore(connection, secret).enqueue(mail);
    const raw = connection.sqlite.prepare('SELECT encrypted_payload FROM auth_mail').get().encrypted_payload;
    assert.ok(!raw.includes(mail.to)); assert.ok(!raw.includes('never-log-this'));
    connection.close(); connection = openDatabase(filename);
    const inbox = createLocalMailStore(connection, secret);
    assert.deepEqual(inbox.pending(), [{ id, mail }]);
    assert.throws(() => createLocalMailStore(connection, randomUUID() + randomUUID()).pending());
    assert.deepEqual(inbox.pending(), [{ id, mail }]);
    inbox.acknowledge(id); assert.deepEqual(inbox.pending(), []);
    inbox.enqueue(mail); connection.sqlite.prepare('UPDATE auth_mail SET expires_at = 0').run();
    assert.deepEqual(inbox.pending(), []); inbox.removeExpired();
    assert.equal(connection.sqlite.prepare('SELECT count(*) AS n FROM auth_mail').get().n, 0);
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});
