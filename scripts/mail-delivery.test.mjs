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


test('delivery runner uses stable identity, retries privately, and preserves uncertain completion', async () => {
  const { deliverNextMail } = await import('../src/server/auth/mail-delivery.ts');
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-mail-runner-'));
  const db = openDatabase(path.join(root, 'db.sqlite'));
  try {
    migrateDatabase(db, path.resolve('migrations/auth'));
    const queue = createLocalMailStore(db, 'disposable-test-secret-at-least-32-characters');
    let sends = 0;
    assert.deepEqual(await deliverNextMail(queue, async () => { sends++; }), { status: 'idle' });
    assert.equal(sends, 0);
    const mail = { kind: 'reset-password', to: 'private@example.test', url: 'http://localhost/SECRET' };
    const id = queue.enqueue(mail);
    const keys = [];
    const failed = await deliverNextMail(queue, async message => {
      assert.deepEqual(message.mail, mail); keys.push(message.idempotencyKey);
      throw new Error('SECRET private@example.test');
    });
    assert.deepEqual(failed, { id, status: 'retry-scheduled' });
    assert.equal(queue.pending().length, 1);
    assert.equal((await deliverNextMail(queue, async () => { sends++; })).status, 'idle');
    assert.equal(sends, 0);
    db.sqlite.prepare('UPDATE auth_mail SET available_at = 0').run();
    assert.deepEqual(await deliverNextMail(queue, async message => { keys.push(message.idempotencyKey); }), { id, status: 'accepted' });
    assert.deepEqual(keys, [id, id]); assert.equal(queue.pending().length, 0);
    const lost = queue.enqueue(mail);
    assert.deepEqual(await deliverNextMail(queue, async () => {
      db.sqlite.prepare('UPDATE auth_mail SET lease_until = 0').run();
      assert.ok(queue.claim()); // Another worker takes ownership before completion.
    }), { id: lost, status: 'lease-lost' });
    assert.equal(queue.pending().length, 1);
    queue.clear();
    queue.enqueue(mail);
    db.sqlite.exec("CREATE TRIGGER fail_ack BEFORE DELETE ON auth_mail BEGIN SELECT RAISE(ABORT, 'disk failure'); END");
    await assert.rejects(deliverNextMail(queue, async () => {}), /disk failure/);
    assert.equal(queue.pending().length, 1);
    assert.equal(queue.claim(), null); // Failed acknowledgement retains its lease.
  } finally { db.close(); await rm(root, { recursive: true, force: true }); }
});
