import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const { openDatabase, migrateDatabase } = await import('../src/server/db/connection.ts');
const { resolveAuthorizationPrincipal } = await import('../src/server/auth/authorization-context.ts');
const { isAuthorized } = await import('../src/server/auth/access-policy.ts');
const { createSecurityJournal } = await import('../src/server/auth/security-journal.ts');

function insertUser(connection, id, username) {
  connection.sqlite.prepare('INSERT INTO user (id, name, email, email_verified, username) VALUES (?, ?, ?, 1, ?)')
    .run(id, username, `${username}@example.test`, username);
}

test('authorization principal is resolved fresh from account and membership tables with audit-coupled changes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-authorization-context-'));
  const connection = openDatabase(path.join(root, 'authorization.sqlite'));
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const playerId = randomUUID(), gmId = randomUUID(), campaignId = randomUUID();
    insertUser(connection, playerId, 'policyplayer');
    insertUser(connection, gmId, 'policygm');
    connection.sqlite.prepare("INSERT INTO campaigns (id, name, lifecycle, is_default, created_at, created_by) VALUES (?, 'Policy Campaign', 'preparing', 0, ?, ?)")
      .run(campaignId, Date.now(), gmId);
    const defaultCampaignId = '7841aa01-33f4-4a90-8d13-000000000001';
    assert.throws(() => connection.sqlite.prepare("INSERT INTO campaigns (id, name, lifecycle, is_default, created_at, created_by) VALUES (?, 'Second Default', 'preparing', 1, ?, ?)")
      .run(randomUUID(), Date.now(), gmId), /UNIQUE constraint failed/);
    assert.throws(() => connection.sqlite.prepare("UPDATE campaigns SET name = 'Modified Default' WHERE id = ?").run(defaultCampaignId), /Default campaign is immutable/);
    connection.sqlite.prepare("INSERT INTO campaign_memberships (campaign_id, user_id, role, state, invited_by_user_id, joined_at) VALUES (?, ?, 'player', 'active', ?, ?)")
      .run(campaignId, playerId, gmId, Date.now());
    connection.sqlite.prepare("INSERT INTO campaign_memberships (campaign_id, user_id, role, state, invited_by_user_id, joined_at) VALUES (?, ?, 'gm', 'active', NULL, ?)")
      .run(campaignId, gmId, Date.now());

    const player = resolveAuthorizationPrincipal(connection, playerId);
    assert.equal(player.userId, playerId);
    assert.equal(player.emailVerified, true);
    assert.equal(player.accountState, 'active');
    assert.deepEqual(player.memberships, [{ campaignId, role: 'player', state: 'active', invitedByUserId: gmId }]);
    assert.equal(isAuthorized(player, 'campaign.read', { campaignId }), true);
    assert.equal(isAuthorized(player, 'campaign.configure', { campaignId }), false);
    assert.equal(resolveAuthorizationPrincipal(connection, randomUUID()), null);

    const now = Date.now();
    connection.sqlite.prepare("INSERT INTO account_access (user_id, status, changed_at, changed_by) VALUES (?, 'disabled', ?, ?)")
      .run(playerId, now, gmId);
    const disabled = resolveAuthorizationPrincipal(connection, playerId);
    assert.equal(disabled.accountState, 'disabled');
    assert.equal(isAuthorized(disabled, 'campaign.read', { campaignId }), false);
    assert.throws(() => connection.sqlite.prepare("UPDATE account_access SET status = 'superuser' WHERE user_id = ?").run(playerId), /CHECK constraint failed/);
    assert.throws(() => connection.sqlite.prepare("INSERT INTO campaign_memberships (campaign_id, user_id, role, state, joined_at) VALUES (?, ?, 'owner', 'active', ?)")
      .run(campaignId, randomUUID(), Date.now()), /CHECK constraint failed/);
    assert.throws(() => connection.sqlite.prepare('DELETE FROM account_access WHERE user_id = ?').run(playerId), /must be changed, not deleted/);

    const journal = createSecurityJournal(connection);
    const operation = await journal.run(new Request('http://127.0.0.1:3000/api/auth/membership-update', { method: 'POST' }), gmId, async () => {
      connection.sqlite.prepare("UPDATE campaign_memberships SET state = 'banned' WHERE campaign_id = ? AND user_id = ?").run(campaignId, playerId);
      return Response.json({ ok: true });
    });
    assert.equal(operation.status, 200);
    const operationId = connection.sqlite.prepare("SELECT operation_id FROM security_events WHERE phase='started' AND action='POST unclassified' ORDER BY occurred_at DESC LIMIT 1").get().operation_id;
    const evidence = connection.sqlite.prepare("SELECT actor_id, entity, entity_id, change FROM security_changes WHERE operation_id = ? AND entity='campaign_membership'").get(operationId);
    assert.deepEqual(evidence, {
      actor_id: gmId, entity: 'campaign_membership', entity_id: `${campaignId}:${playerId}`,
      change: 'role:player->player;state:active->banned',
    });
    const banned = resolveAuthorizationPrincipal(connection, playerId);
    assert.equal(isAuthorized(banned, 'campaign.read', { campaignId }), false);
    assert.throws(() => connection.sqlite.prepare('DELETE FROM campaign_memberships WHERE campaign_id = ? AND user_id = ?').run(campaignId, playerId), /history is append\/update only/);
    assert.throws(() => connection.sqlite.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId), /must be archived or recovered/);
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});
