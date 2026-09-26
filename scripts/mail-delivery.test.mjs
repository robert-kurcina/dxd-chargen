import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { openDatabase, migrateDatabase } = await import('../src/server/db/connection.ts');
const { createLocalMailStore } = await import('../src/server/auth/local-mail-store.ts');

test('delivery leases survive restart, exclude competing workers and reject stale acknowledgements', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-mail-delivery-'));
  const filename = path.join(root, 'db.sqlite');
  let db = openDatabase(filename);
  let other;
  const secret = 'disposable-test-secret-at-least-32-characters';
  try {
    migrateDatabase(db, path.resolve('migrations/auth'));
    let queue = createLocalMailStore(db, secret);
    const id = queue.enqueue({ kind: 'verify-email', to: 'test@example.test', url: 'http://localhost/SECRET' });
    assert.throws(() => createLocalMailStore(db, secret + 'wrong').claim());
    const first = queue.claim();
    assert.equal(first.id, id); assert.equal(first.attempts, 1);
    other = openDatabase(filename);
    assert.equal(createLocalMailStore(other, secret).claim(), null);
    db.close(); db = openDatabase(filename); queue = createLocalMailStore(db, secret);
    assert.equal(queue.claim(), null);
    db.sqlite.prepare('UPDATE auth_mail SET lease_until = 0 WHERE id = ?').run(id);
    const second = queue.claim();
    assert.equal(second.id, id); assert.equal(second.attempts, 2);
    assert.notEqual(second.token, first.token);
    assert.equal(queue.complete(id, first.token), false);
    assert.equal(queue.retry(id, first.token, 0), false);
    assert.equal(queue.retry(id, second.token, 60_000), true);
    assert.equal(queue.claim(), null);
    db.sqlite.prepare('UPDATE auth_mail SET available_at = 0 WHERE id = ?').run(id);
    const third = queue.claim(); assert.equal(third.attempts, 3);
    assert.equal(queue.complete(id, third.token), true);
    assert.equal(queue.complete(id, third.token), false);
    const expired = queue.enqueue(first.mail);
    db.sqlite.prepare('UPDATE auth_mail SET expires_at = 0 WHERE id = ?').run(expired);
    assert.equal(queue.claim(), null);
    queue.removeExpired(); assert.equal(queue.pending().length, 0);
    assert.throws(() => queue.claim(0), RangeError);
    assert.throws(() => queue.retry(id, first.token, -1), RangeError);
  } finally { other?.close(); db.close(); await rm(root, { recursive: true, force: true }); }
});
