import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { openDatabase, migrateDatabase } = await import('../src/server/db/connection.ts');

test('authoritative table mutations have transaction-coupled audit or explicit immutable evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-audit-coverage-'));
  const connection = openDatabase(path.join(root, 'audit.sqlite'));
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const triggers = connection.sqlite.prepare("SELECT name, tbl_name, lower(sql) AS sql FROM sqlite_master WHERE type='trigger'").all();
    const auditMutations = {
      user: ['insert', 'update', 'delete'],
      account: ['insert', 'update', 'delete'],
      session: ['insert', 'update', 'delete'],
      two_factor: ['insert', 'update', 'delete'],
      account_access: ['insert', 'update'],
      campaigns: ['insert', 'update'],
      campaign_memberships: ['insert', 'update'],
      campaign_invitations: ['insert', 'update'],
      campaign_invitation_joins: ['insert'],
      characters: ['insert', 'update'],
      character_versions: ['insert'],
    };
    for (const [table, actions] of Object.entries(auditMutations)) {
      for (const action of actions) {
        const trigger = triggers.find(row => row.tbl_name === table && row.sql.includes(`after ${action} on`));
        assert.ok(trigger, `${table} ${action} has an audit trigger`);
        assert.match(trigger.sql, /insert into security_changes/, `${trigger.name} writes evidence in the same statement`);
      }
    }

    const immutableMutations = [
      ['security_events', 'update'], ['security_events', 'delete'],
      ['security_changes', 'update'], ['security_changes', 'delete'],
      ['security_review_decisions', 'update'], ['security_review_decisions', 'delete'],
      ['account_access', 'delete'], ['campaigns', 'delete'], ['campaign_memberships', 'delete'],
      ['campaign_invitations', 'delete'], ['campaign_invitation_joins', 'update'], ['campaign_invitation_joins', 'delete'],
      ['characters', 'delete'], ['character_versions', 'update'], ['character_versions', 'delete'],
    ];
    for (const [table, action] of immutableMutations) {
      const trigger = triggers.find(row => row.tbl_name === table && row.sql.includes(`before ${action} on`));
      assert.ok(trigger, `${table} ${action} is blocked until a recoverable operation exists`);
      assert.match(trigger.sql, /raise\(abort/, `${trigger.name} blocks mutation at the database boundary`);
    }

    const bootstrapSource = await readFile(path.resolve('src/server/auth/site-admin.ts'), 'utf8');
    assert.match(bootstrapSource, /db\.transaction\(\(\) =>[\s\S]*INSERT INTO site_administrators[\s\S]*INSERT INTO security_changes/,
      'the one-time Site Administrator grant and its audit evidence share one transaction');
    const reviewSource = await readFile(path.resolve('src/server/auth/security-journal.ts'), 'utf8');
    assert.match(reviewSource, /db\.transaction\(\(\) =>[\s\S]*INSERT INTO security_review_decisions/,
      'incident review decisions commit with the review operation transaction');
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});
