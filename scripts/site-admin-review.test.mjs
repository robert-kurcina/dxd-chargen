import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const { openDatabase, migrateDatabase } = await import('../src/server/db/connection.ts');
const { createLocalAccountHarness } = await import('../src/server/auth/local-harness.ts');
const { bootstrapVerifiedUsername } = await import('../src/server/auth/site-admin.ts');

const origin = 'http://127.0.0.1:3000';
const cookies = response => response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');

async function accountApi(connection) {
  const { handle, takeMail } = createLocalAccountHarness(connection, origin, randomUUID() + randomUUID(), { disableRateLimitsForTests: true });
  const request = (route, body, cookie = '', requestOrigin = origin) => handle(new Request(`${origin}/api/auth/${route}`, {
    method: body ? 'POST' : 'GET',
    headers: { ...(requestOrigin ? { origin: requestOrigin } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  async function createUser(username, verify = true) {
    const email = `${username}@example.test`;
    const signedUp = await request('sign-up/email', { email, password: 'Temporary-account-password-123!', username, name: username });
    assert.equal(signedUp.status, 200, await signedUp.clone().text());
    const verification = takeMail().find(mail => mail.kind === 'verify-email');
    assert.ok(verification);
    if (!verify) return { email, verification, id: connection.sqlite.prepare('SELECT id FROM user WHERE username = ?').get(username).id };
    await handle(new Request(verification.url));
    const signedIn = await request('sign-in/email', { email, password: 'Temporary-account-password-123!' });
    assert.equal(signedIn.status, 200);
    return { email, cookie: cookies(signedIn), id: connection.sqlite.prepare('SELECT id FROM user WHERE username = ?').get(username).id };
  }
  return { request, createUser, handle };
}

test('Site Administrator bootstrap requires a verified account and is one-time with audit evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-siteadmin-bootstrap-'));
  const connection = openDatabase(path.join(root, 'accounts.sqlite'));
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const api = await accountApi(connection);
    const pending = await api.createUser('pendingadmin', false);
    assert.throws(() => bootstrapVerifiedUsername(connection, 'pendingadmin'), /email must be verified/);
    assert.ok(pending.verification);
    await api.handle(new Request(pending.verification.url));
    const grant = bootstrapVerifiedUsername(connection, 'PENDINGADMIN');
    assert.equal(grant.userId, pending.id);
    assert.equal(connection.sqlite.prepare('SELECT count(*) AS n FROM site_administrators').get().n, 1);
    assert.throws(() => bootstrapVerifiedUsername(connection, 'pendingadmin'), /already bootstrapped/);
    const evidence = connection.sqlite.prepare("SELECT action, phase FROM security_events WHERE operation_id = ? ORDER BY phase").all(grant.operationId);
    assert.equal(evidence.length, 2);
    assert.ok(evidence.every(row => row.action === 'LOCAL bootstrap-site-administrator'));
    assert.equal(connection.sqlite.prepare("SELECT change FROM security_changes WHERE operation_id = ?").get(grant.operationId).change, 'initial-bootstrap-grant');
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});

test('only Site Administrators can inspect bounded candidates and append a review for another actor', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-siteadmin-review-'));
  const connection = openDatabase(path.join(root, 'accounts.sqlite'));
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const api = await accountApi(connection);
    const staff = await api.createUser('siteadmin');
    bootstrapVerifiedUsername(connection, 'siteadmin');
    const player = await api.createUser('player');
    const sourceOperationId = randomUUID(), old = Date.now() - 600_000;
    const event = connection.sqlite.prepare('INSERT INTO security_events (id, operation_id, phase, action, actor_id, occurred_at, response_status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    event.run(randomUUID(), sourceOperationId, 'started', 'POST reset-password', player.id, old, null);
    event.run(randomUUID(), sourceOperationId, 'responded', 'POST reset-password', player.id, old + 1, 500);
    const exceptionOperationId = randomUUID();
    event.run(randomUUID(), exceptionOperationId, 'started', 'POST change-password', player.id, old, null);
    event.run(randomUUID(), exceptionOperationId, 'threw', 'POST change-password', player.id, old + 1, null);

    assert.equal((await api.request('admin/security-operations')).status, 403);
    assert.equal((await api.request('admin/security-operations', undefined, player.cookie)).status, 403);
    const report = await api.request('admin/security-operations?limit=1', undefined, staff.cookie);
    assert.equal(report.status, 200);
    assert.equal(report.headers.get('cache-control'), 'no-store');
    const body = await report.json();
    assert.equal(body.candidates.length, 1);
    assert.equal(body.candidates[0].operation_id, sourceOperationId);
    assert.equal(body.candidates[0].actor_id, player.id);
    const exceptionReport = await api.request('admin/security-operations?limit=2', undefined, staff.cookie);
    assert.equal((await exceptionReport.json()).candidates[1].reason, 'exception');
    assert.ok(!JSON.stringify(body).includes(player.email));
    assert.equal((await api.request('admin/security-operations?limit=101', undefined, staff.cookie)).status, 400);

    const reviewPath = `admin/security-operations/${sourceOperationId}/review`;
    assert.equal((await api.request(reviewPath, { disposition: 'follow-up-required' }, player.cookie)).status, 403);
    assert.equal((await api.request(reviewPath, { disposition: 'follow-up-required' }, staff.cookie, 'https://untrusted.example')).status, 403);
    const result = await api.request(reviewPath, { disposition: 'follow-up-required' }, staff.cookie);
    assert.equal(result.status, 200);
    const decision = await result.json();
    assert.equal(decision.sourceOperationId, sourceOperationId);
    assert.equal(decision.disposition, 'follow-up-required');
    assert.equal(decision.reasonCode, 'no-change-evidence-recorded');
    assert.equal(decision.reviewerId, staff.id);
    assert.ok(Number.isSafeInteger(decision.reviewedAt));
    const row = connection.sqlite.prepare('SELECT reviewer_id, disposition FROM security_review_decisions WHERE source_operation_id = ?').get(sourceOperationId);
    assert.deepEqual(row, { reviewer_id: staff.id, disposition: 'follow-up-required' });
    assert.throws(() => connection.sqlite.prepare("UPDATE security_review_decisions SET disposition='reviewed-no-automatic-retry'").run(), /append-only/);
    assert.throws(() => connection.sqlite.prepare('DELETE FROM security_review_decisions').run(), /retention policy/);
    const exceptionReview = await api.request(`admin/security-operations/${exceptionOperationId}/review`, { disposition: 'reviewed-no-automatic-retry' }, staff.cookie);
    assert.equal(exceptionReview.status, 200, await exceptionReview.clone().text());
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});
