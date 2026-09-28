import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const { openDatabase, migrateDatabase } = await import('../src/server/db/connection.ts');
const { createSecurityJournal } = await import('../src/server/auth/security-journal.ts');

test('journal persists intent, excludes secrets, blocks edits and preserves interrupted operations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-security-'));
  const filename = path.join(root, 'db.sqlite');
  let db = openDatabase(filename);
  const request = () => new Request('http://localhost:3000/api/auth/reset-password?token=SECRET', { method: 'POST', headers: { cookie: 'SECRET' }, body: 'SECRET' });
  try {
    migrateDatabase(db, path.resolve('migrations/auth'));
    let journal = createSecurityJournal(db);
    await journal.run(request(), null, async () => new Response(null, { status: 200 }));
    assert.equal(journal.unresolved().length, 0);
    const events = db.sqlite.prepare('SELECT * FROM security_events').all();
    assert.equal(events.length, 2); assert.ok(!JSON.stringify(events).includes('SECRET'));
    assert.throws(() => db.sqlite.prepare("UPDATE security_events SET action='changed'").run(), /append-only/);
    assert.throws(() => db.sqlite.prepare('DELETE FROM security_events').run(), /expiry/);
    db.sqlite.exec("CREATE TRIGGER fail_start BEFORE INSERT ON security_events WHEN NEW.phase = 'started' BEGIN SELECT RAISE(ABORT, 'disk failure'); END");
    let invoked = false;
    await assert.rejects(journal.run(request(), null, async () => { invoked = true; return new Response(); })); assert.equal(invoked, false);
    db.sqlite.exec('DROP TRIGGER fail_start');
    db.sqlite.exec("CREATE TRIGGER fail_finish BEFORE INSERT ON security_events WHEN NEW.phase = 'responded' BEGIN SELECT RAISE(ABORT, 'disk failure'); END");
    await assert.rejects(journal.run(request(), null, async () => { invoked = true; return new Response(); })); assert.equal(invoked, true);
    db.close(); db = openDatabase(filename); journal = createSecurityJournal(db);
    assert.equal(journal.unresolved().length, 1); // A recovery worker must inspect; never automatically replay auth.
    db.sqlite.exec('DROP TRIGGER fail_finish');
    await assert.rejects(journal.run(request(), null, async () => { throw new Error('SECRET'); }));
    assert.equal(journal.unresolved().length, 1);
    assert.ok(!JSON.stringify(db.sqlite.prepare('SELECT * FROM security_events').all()).includes('SECRET'));
  } finally { db.close(); await rm(root, { recursive: true, force: true }); }
});

test('credential changes and evidence commit together; interrupted response can be reconciled without replay', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-security-evidence-'));
  const filename = path.join(root, 'db.sqlite'); let db = openDatabase(filename);
  try {
    migrateDatabase(db, path.resolve('migrations/auth'));
    let journal = createSecurityJournal(db);
    const request = () => new Request('http://localhost:3000/api/auth/sign-up/email', { method: 'POST' });
    const insert = id => db.sqlite.prepare('INSERT INTO user (id, name, email) VALUES (?, ?, ?)').run(id, 'Private name', `${id}@example.test`);
    db.sqlite.exec("CREATE TRIGGER fail_evidence BEFORE INSERT ON security_changes BEGIN SELECT RAISE(ABORT, 'evidence unavailable'); END");
    await assert.rejects(journal.run(request(), null, async () => { insert('rejected'); return new Response(); }));
    assert.equal(db.sqlite.prepare("SELECT id FROM user WHERE id='rejected'").get(), undefined);
    db.sqlite.exec('DROP TRIGGER fail_evidence');
    db.sqlite.exec("CREATE TRIGGER fail_completion BEFORE INSERT ON security_events WHEN NEW.phase='responded' BEGIN SELECT RAISE(ABORT, 'response journal unavailable'); END");
    await assert.rejects(journal.run(request(), 'server-actor', async () => { insert('committed'); return new Response(); }));
    db.close(); db = openDatabase(filename); journal = createSecurityJournal(db);
    const [interrupted] = journal.unresolved();
    assert.ok(db.sqlite.prepare("SELECT id FROM user WHERE id='committed'").get());
    const evidence = journal.evidence(interrupted.operation_id);
    assert.equal(evidence.length, 1); assert.equal(evidence[0].entity_id, 'committed'); assert.equal(evidence[0].actor_id, 'server-actor');
    assert.ok(!JSON.stringify(evidence).includes('Private name')); assert.ok(!JSON.stringify(evidence).includes('@example.test'));
    assert.throws(() => db.sqlite.prepare('DELETE FROM security_changes').run(), /expiry/);
    assert.throws(() => db.sqlite.prepare("UPDATE security_changes SET entity='other'").run(), /append-only/);
    db.sqlite.exec('DROP TRIGGER fail_completion');
    // Async interleaving must not attribute one operation's writes to another.
    await Promise.all(['a', 'b'].map(actor => journal.run(request(), actor, async () => { await new Promise(resolve => setTimeout(resolve, actor === 'a' ? 10 : 1)); insert(actor); return new Response(); })));
    const rows = db.sqlite.prepare("SELECT actor_id, entity_id FROM security_changes WHERE entity_id IN ('a','b') ORDER BY entity_id").all();
    assert.deepEqual(rows, [{ actor_id: 'a', entity_id: 'a' }, { actor_id: 'b', entity_id: 'b' }]);
  } finally { db.close(); await rm(root, { recursive: true, force: true }); }
});


test('recovery review is bounded, read-only and does not mistake evidence for complete success', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-security-review-'));
  const db = openDatabase(path.join(root, 'db.sqlite'));
  try {
    migrateDatabase(db, path.resolve('migrations/auth'));
    const journal = createSecurityJournal(db);
    const old = Date.now() - 600_000;
    const event = db.sqlite.prepare('INSERT INTO security_events (id, operation_id, phase, action, occurred_at, response_status) VALUES (?, ?, ?, ?, ?, ?)');
    for (const [id, phase, status] of [['missing', null, null], ['threw', 'threw', null], ['error', 'responded', 500], ['ok', 'responded', 200]]) {
      event.run(id + '-start', id, 'started', 'POST reset-password', old, null);
      if (phase) event.run(id + '-finish', id, phase, 'POST reset-password', old + 1, status);
    }
    event.run('live-start', 'live', 'started', 'POST reset-password', Date.now(), null);
    db.sqlite.prepare('INSERT INTO security_changes (id, operation_id, entity, entity_id, change, occurred_at) VALUES (?, ?, ?, ?, ?, ?)').run('evidence', 'threw', 'user', 'user-id', 'update', old);
    const before = db.sqlite.prepare('SELECT total_changes() AS count').get().count;
    const report = journal.reviewCandidates();
    assert.deepEqual(report.candidates.map(row => [row.operation_id, row.reason, row.recorded_changes]), [
      ['missing', 'missing-completion', 0], ['threw', 'exception', 1], ['error', 'error-response', 0],
    ]);
    assert.equal(report.hasMore, false);
    assert.equal(journal.reviewCandidates({ limit: 2 }).hasMore, true);
    assert.equal(journal.reviewCandidates({ limit: 2 }).candidates.length, 2);
    assert.equal(db.sqlite.prepare('SELECT total_changes() AS count').get().count, before);
    assert.equal(journal.unresolved().length, 2); // Review never resolves or retries requests.
    for (const options of [{ limit: 0 }, { limit: 1001 }, { limit: 1.5 }, { minimumAgeMs: 0 }, { minimumAgeMs: NaN }]) {
      assert.throws(() => journal.reviewCandidates(options), RangeError);
    }
  } finally { db.close(); await rm(root, { recursive: true, force: true }); }
});

test('incident review decisions require the source actor and remain append-only', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-security-decision-'));
  const db = openDatabase(path.join(root, 'db.sqlite'));
  try {
    migrateDatabase(db, path.resolve('migrations/auth'));
    const journal = createSecurityJournal(db);
    const source = randomUUID(), old = Date.now() - 600_000;
    const event = db.sqlite.prepare('INSERT INTO security_events (id, operation_id, phase, action, actor_id, occurred_at, response_status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    event.run(randomUUID(), source, 'started', 'POST change-password', 'source-actor', old, null);
    event.run(randomUUID(), source, 'responded', 'POST change-password', 'source-actor', old + 1, 500);

    const wrongRequest = () => new Request('http://localhost:3000/api/auth/review-security-operation', { method: 'POST' });
    await assert.rejects(journal.run(wrongRequest(), 'different-actor', async () => {
      journal.recordReviewDecision(source, 'reviewed-no-automatic-retry');
      return new Response();
    }), /not an eligible self-review candidate/);

    let decision;
    const reviewResponse = await journal.run(wrongRequest(), 'source-actor', async () => {
      decision = journal.recordReviewDecision(source, 'follow-up-required');
      return new Response(null, { status: 200 });
    });
    assert.equal(reviewResponse.status, 200);
    assert.equal(decision.reasonCode, 'no-change-evidence-recorded');
    assert.equal(decision.reviewerId, 'source-actor');
    const report = journal.reviewCandidates();
    assert.equal(report.candidates.length, 1);
    assert.equal(report.candidates[0].latest_review_disposition, 'follow-up-required');
    assert.equal(report.candidates[0].latest_reviewer_id, 'source-actor');
    assert.throws(() => db.sqlite.prepare("UPDATE security_review_decisions SET disposition='reviewed-no-automatic-retry'").run(), /append-only/);
    assert.throws(() => db.sqlite.prepare('DELETE FROM security_review_decisions').run(), /retention policy/);
  } finally { db.close(); await rm(root, { recursive: true, force: true }); }
});
