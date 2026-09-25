import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
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
