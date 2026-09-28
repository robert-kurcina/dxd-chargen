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
    const { handle, takeMail } = createLocalAccountHarness(connection, 'http://localhost:3000', secret, { disableRateLimitsForTests: true });
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
    response = await request('change-password', { currentPassword: changed, newPassword: 'Manual-change-password-987!', revokeOtherSessions: false }, current);
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
    connection.sqlite.prepare('UPDATE session SET created_at = ?').run(Date.now() - 301000);
    response = await request('change-password', { currentPassword: 'Manual-change-password-987!', newPassword: 'Stale-session-password-000!' }, current);
    assert.equal(response.status, 403); assert.equal((await response.json()).code, 'REAUTHENTICATION_REQUIRED');
    await login('Manual-change-password-987!');

  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});

test('MFA requires confirmed enrollment, gates login and consumes recovery codes', async () => {
  const { createHmac } = await import('node:crypto');
  const totp = (uri, stepOffset = 0) => {
    const url = new URL(uri), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits = [...url.searchParams.get('secret').replace(/=+$/, '').toUpperCase()].map(c => alphabet.indexOf(c).toString(2).padStart(5, '0')).join('');
    const key = Buffer.from(bits.match(/.{8}/g).map(byte => parseInt(byte, 2)));
    const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / Number(url.searchParams.get('period') || 30)) + stepOffset));
    const mac = createHmac('sha1', key).update(counter).digest();
    const offset = mac[mac.length - 1] & 15;
    const digits = Number(url.searchParams.get('digits') || 6);
    return String((mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).padStart(digits, '0');
  };
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-mfa-'));
  const connection = openDatabase(path.join(root, 'accounts.sqlite'));
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const { handle, takeMail } = createLocalAccountHarness(connection, 'http://localhost:3000', randomUUID() + randomUUID(), { disableRateLimitsForTests: true });
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
    const replay = await request('two-factor/verify-backup-code', { code: enrollment.backupCodes[3] }, challenge);
    assert.ok(replay.status >= 400, 'A completed login challenge cannot be reused even with another valid recovery code');

    await request('sign-out', {}, session);
    response = await request('sign-in/email', credentials); challenge = cookies(response);
    response = await request('two-factor/verify-backup-code', { code: enrollment.backupCodes[0] }, challenge); assert.ok(response.status >= 400);
    response = await request('get-session', undefined, challenge); assert.equal(await response.json(), null);
    response = await request('two-factor/verify-backup-code', { code: enrollment.backupCodes[1] }, challenge); assert.equal(response.status, 200);
    session = cookies(response);
    response = await request('two-factor/disable', { password: 'Wrong-password-123!' }, session); assert.ok(response.status >= 400);
    assert.equal(connection.sqlite.prepare('SELECT two_factor_enabled FROM user').get().two_factor_enabled, 1);
    await request('sign-out', {}, session);
    const attempts = await Promise.all([request('sign-in/email', credentials), request('sign-in/email', credentials)]);
    const outcomes = await Promise.all(attempts.map(r => request('two-factor/verify-backup-code', { code: enrollment.backupCodes[2] }, cookies(r))));
    assert.equal(outcomes.filter(r => r.status === 200).length, 1, 'A recovery code can authorize only one concurrent login');
    const totpChallenges = await Promise.all([request('sign-in/email', credentials), request('sign-in/email', credentials)]);
    const sameCode = totp(enrollment.totpURI, 1);
    const repeated = await Promise.all(totpChallenges.map(r => request('two-factor/verify-totp', { code: sameCode }, cookies(r))));
    assert.equal(repeated.filter(r => r.status === 200).length, 1, 'One TOTP code must not authorize two distinct login challenges');
    assert.equal(repeated.find(r => r.status !== 200).status, 401);
    response = await request('sign-in/email', credentials); challenge = cookies(response);
    // Exercise the threshold with nine prior failures already persisted.
    connection.sqlite.prepare('UPDATE two_factor SET failed_verification_count = 9').run();
    response = await request('two-factor/verify-totp', { code: 'invalid' }, challenge); assert.ok(response.status >= 400);
    const locked = connection.sqlite.prepare('SELECT failed_verification_count, locked_until FROM two_factor').get();
    assert.ok(locked.failed_verification_count >= 10); assert.ok(locked.locked_until > Date.now());
    response = await request('two-factor/verify-backup-code', { code: enrollment.backupCodes[4] }, challenge); assert.equal(response.status, 429);
    connection.sqlite.prepare('UPDATE two_factor SET locked_until = ?').run(Date.now() - 1);
    response = await request('sign-in/email', credentials); challenge = cookies(response);
    response = await request('two-factor/verify-backup-code', { code: enrollment.backupCodes[4] }, challenge); assert.equal(response.status, 200);
    await request('request-password-reset', { email: credentials.email, redirectTo: 'http://localhost:3000/reset' });
    const resetMail = takeMail().find(mail => mail.kind === 'reset-password');
    const resetToken = new URL(resetMail.url).pathname.split('/').pop();
    response = await request('reset-password', { token: resetToken, newPassword: 'MFA-reset-password-456!' }); assert.equal(response.status, 200);
    response = await request('sign-in/email', { email: credentials.email, password: 'MFA-reset-password-456!' });
    assert.equal(response.status, 200); assert.equal((await response.json()).twoFactorRedirect, true);
    response = await request('get-session', undefined, cookies(response)); assert.equal(await response.json(), null);




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

test('account identity edge cases and verified email changes preserve ownership', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-identity-'));
  const connection = openDatabase(path.join(root, 'accounts.sqlite'));
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const { handle, takeMail } = createLocalAccountHarness(connection, 'http://localhost:3000', randomUUID() + randomUUID(), { disableRateLimitsForTests: true });
    const request = (route, body, cookie = '') => handle(new Request(`http://localhost:3000/api/auth/${route}`, { method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', cookie }, body: JSON.stringify(body) }));
    const base = { email: 'First@Example.test', username: 'FirstPlayer', name: 'First', password: 'Identity-password-123!' };
    for (const username of [undefined, '', '   ']) {
      const response = await request('sign-up/email', { ...base, username }); assert.equal(response.status, 400);
    }
    assert.equal(connection.sqlite.prepare('SELECT count(*) AS n FROM user').get().n, 0);
    let response = await request('sign-up/email', base); assert.equal(response.status, 200);
    const first = connection.sqlite.prepare('SELECT * FROM user').get();
    assert.equal(first.email, 'first@example.test'); assert.equal(first.username, 'firstplayer');
    await handle(new Request(takeMail()[0].url));
    response = await request('sign-up/email', { ...base, email: 'FIRST@example.test', username: 'separate' });
    assert.equal(response.status, 200); assert.equal((await response.json()).token, null);
    assert.equal(connection.sqlite.prepare('SELECT count(*) AS n FROM user').get().n, 1);
    response = await request('sign-up/email', { ...base, email: 'second@example.test', username: 'FIRSTPLAYER' });
    assert.ok(response.status >= 400); assert.equal(connection.sqlite.prepare('SELECT count(*) AS n FROM user').get().n, 1);
    takeMail();
    response = await request('sign-in/username', { username: 'FIRSTPLAYER', password: base.password }); assert.equal(response.status, 200);
    const cookie = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    response = await request('change-email', { newEmail: 'replacement@example.test', callbackURL: '/' }, cookie); assert.equal(response.status, 200);
    assert.equal(connection.sqlite.prepare('SELECT email FROM user').get().email, first.email);
    const mail = takeMail().find(m => m.to === 'replacement@example.test'); assert.ok(mail);
    response = await handle(new Request(mail.url)); assert.ok(response.status < 400);
    const changed = connection.sqlite.prepare('SELECT * FROM user').get();
    assert.equal(changed.id, first.id); assert.equal(changed.email, 'replacement@example.test'); assert.equal(changed.email_verified, 1);
    response = await request('sign-in/email', { email: first.email, password: base.password }); assert.equal(response.status, 401);
    response = await request('sign-in/email', { email: changed.email, password: base.password }); assert.equal(response.status, 200);
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});
