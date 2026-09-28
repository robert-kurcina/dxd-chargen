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
    assert.equal(count(), 14);
    migrateDatabase(connection, migrationsFolder); assert.equal(count(), 14);
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
    const campaignId = randomUUID();
    const characterId = randomUUID();
    connection.sqlite.prepare('INSERT INTO campaigns (id, name, lifecycle, is_default, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(campaignId, 'Backup fixture campaign', 'preparing', 0, Date.now(), response.user.id);
    connection.sqlite.prepare('INSERT INTO campaign_memberships (campaign_id, user_id, role, state, joined_at) VALUES (?, ?, ?, ?, ?)').run(campaignId, response.user.id, 'gm', 'active', Date.now());
    connection.sqlite.prepare('INSERT INTO characters (id, owner_id, campaign_id, is_private, is_locked, current_version, create_idempotency_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(characterId, response.user.id, campaignId, 1, 0, 1, randomUUID(), Date.now(), Date.now());
    connection.sqlite.prepare('INSERT INTO character_versions (id, character_id, version, draft_json, schema_version, edited_by, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), characterId, 1, JSON.stringify({ fixture: 'recoverable character version' }), 11, response.user.id, randomUUID(), Date.now());
    const auditBeforeBackup = connection.sqlite.prepare("SELECT entity, entity_id, change FROM security_changes WHERE entity IN ('campaign', 'campaign_membership', 'character', 'character_version') ORDER BY entity, entity_id, change").all();
    assert.ok(auditBeforeBackup.length >= 4, 'domain fixtures produced audit evidence');
    // A deliberately broken second migration must roll back its DDL and journal entry.
    const badFolder = path.join(root, 'bad-migrations'); await mkdir(path.join(badFolder, 'meta'), { recursive: true });
    await writeFile(path.join(badFolder, 'meta/_journal.json'), JSON.stringify({ version: '7', dialect: 'sqlite', entries: [{ idx: 0, version: '6', when: Date.now() + 10000, tag: 'broken', breakpoints: true }] }));
    await writeFile(path.join(badFolder, 'broken.sql'), 'CREATE TABLE rollback_probe (id TEXT);\n--> statement-breakpoint\nINSERT INTO nonexistent_table VALUES (1);');
    assert.throws(() => migrateDatabase(connection, badFolder));
    assert.equal(count(), 14);
    assert.equal(connection.sqlite.prepare("SELECT name FROM sqlite_master WHERE name = 'rollback_probe'").get(), undefined);
    const backup = path.join(root, 'backup.sqlite');
    await connection.sqlite.backup(backup);
    restored = openDatabase(backup);
    assert.deepEqual(restored.sqlite.pragma('integrity_check'), [{ integrity_check: 'ok' }]);
    assert.deepEqual(restored.sqlite.pragma('foreign_key_check'), []);
    assert.deepEqual(restored.db.select().from(schema.user).all(), connection.db.select().from(schema.user).all());
    assert.deepEqual(restored.db.select().from(schema.account).all(), connection.db.select().from(schema.account).all());
    for (const table of ['campaigns', 'campaign_memberships', 'characters', 'character_versions', 'security_changes']) {
      const sourceRows = connection.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
      const restoredRows = restored.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
      assert.deepEqual(restoredRows, sourceRows, `backup restore preserves ${table}`);
    }
    assert.deepEqual(restored.sqlite.prepare("SELECT entity, entity_id, change FROM security_changes WHERE entity IN ('campaign', 'campaign_membership', 'character', 'character_version') ORDER BY entity, entity_id, change").all(), auditBeforeBackup);
    migrateDatabase(restored, migrationsFolder);
    assert.equal(restored.sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get().n, 14);
  } finally { restored?.close(); connection.close(); await rm(root, { recursive: true, force: true }); }
});
