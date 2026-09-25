import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { username, twoFactor } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
const { openDatabase, migrateDatabase } = await import('../src/server/db/connection.ts');
const schema = await import('../src/server/db/auth-schema.ts');
const migrationsFolder = path.resolve('migrations/auth');

test('SQLite migrations, adapter, constraints, rollback and consistent backup restore', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-auth-db-'));
  const connection = openDatabase(path.join(root, 'source.sqlite'));
  let restored;
  try {
    migrateDatabase(connection, migrationsFolder);
    const count = () => connection.sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get().n;
    assert.equal(count(), 1);
    migrateDatabase(connection, migrationsFolder); assert.equal(count(), 1);
    assert.equal(connection.sqlite.pragma('foreign_keys', { simple: true }), 1);
    assert.equal(connection.sqlite.pragma('journal_mode', { simple: true }), 'wal');
    assert.equal(connection.sqlite.pragma('busy_timeout', { simple: true }), 5000);
    const auth = betterAuth({
      appName: 'Sarna Len test', baseURL: 'http://localhost:3000',
      secret: randomUUID() + randomUUID(),
      database: drizzleAdapter(connection.db, { provider: 'sqlite', schema }),
      emailAndPassword: { enabled: true, requireEmailVerification: true },
      plugins: [username(), twoFactor()],
      advanced: { database: { generateId: 'uuid' } },
      // This test never sends email; H02b will supply a local mail transport.
    });
    const response = await auth.api.signUpEmail({ body: { email: 'fixture@example.test', password: 'Temporary-test-password-123!', name: 'Fixture', username: 'fixture' } });
    assert.equal(response.token, null);
    assert.match(response.user.id, /^[0-9a-f-]{36}$/);
    const stored = connection.db.select().from(schema.user).where(eq(schema.user.id, response.user.id)).get();
    assert.equal(stored.emailVerified, false); assert.equal(stored.username, 'fixture');
    const account = connection.db.select().from(schema.account).get();
    assert.ok(account.password); assert.notEqual(account.password, 'Temporary-test-password-123!');
    assert.throws(() => connection.db.insert(schema.user).values({ ...stored, id: randomUUID() }).run(), /UNIQUE/);
    assert.throws(() => connection.db.insert(schema.session).values({ id: randomUUID(), userId: 'missing', token: randomUUID(), expiresAt: new Date(), updatedAt: new Date() }).run(), /FOREIGN KEY/);
    // A deliberately broken second migration must roll back its DDL and journal entry.
    const badFolder = path.join(root, 'bad-migrations'); await mkdir(path.join(badFolder, 'meta'), { recursive: true });
    await writeFile(path.join(badFolder, 'meta/_journal.json'), JSON.stringify({ version: '7', dialect: 'sqlite', entries: [{ idx: 0, version: '6', when: Date.now() + 10000, tag: 'broken', breakpoints: true }] }));
    await writeFile(path.join(badFolder, 'broken.sql'), 'CREATE TABLE rollback_probe (id TEXT);\n--> statement-breakpoint\nINSERT INTO nonexistent_table VALUES (1);');
    assert.throws(() => migrateDatabase(connection, badFolder));
    assert.equal(count(), 1);
    assert.equal(connection.sqlite.prepare("SELECT name FROM sqlite_master WHERE name = 'rollback_probe'").get(), undefined);
    const backup = path.join(root, 'backup.sqlite');
    await connection.sqlite.backup(backup);
    restored = openDatabase(backup);
    assert.deepEqual(restored.sqlite.pragma('integrity_check'), [{ integrity_check: 'ok' }]);
    assert.deepEqual(restored.sqlite.pragma('foreign_key_check'), []);
    assert.deepEqual(restored.db.select().from(schema.user).all(), connection.db.select().from(schema.user).all());
    assert.deepEqual(restored.db.select().from(schema.account).all(), connection.db.select().from(schema.account).all());
    migrateDatabase(restored, migrationsFolder);
    assert.equal(restored.sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get().n, 1);
  } finally { restored?.close(); connection.close(); await rm(root, { recursive: true, force: true }); }
});
