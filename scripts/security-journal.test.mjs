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
