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

test('campaign catalog aligns stable Default and Working IDs and authorizes audited Site Administrator forks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-campaign-service-'));
  const connection = openDatabase(path.join(root, 'accounts.sqlite'));
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const seeds = connection.sqlite.prepare('SELECT id, name, is_default, parent_campaign_id FROM campaigns ORDER BY is_default DESC').all();
    assert.deepEqual(seeds, [
      { id: '7841aa01-33f4-4a90-8d13-000000000001', name: 'Default Campaign', is_default: 1, parent_campaign_id: null },
      { id: '7841aa01-33f4-4a90-8d13-000000000002', name: 'Working Campaign', is_default: 0, parent_campaign_id: '7841aa01-33f4-4a90-8d13-000000000001' },
    ]);
    const seedAudit = connection.sqlite.prepare("SELECT entity_id, actor_id, operation_id FROM security_changes WHERE entity='campaign' AND entity_id IN (?, ?) ORDER BY entity_id").all(seeds[0].id, seeds[1].id);
    assert.equal(seedAudit.length, 2); assert.ok(seedAudit.every(row => row.actor_id === null && row.operation_id === null));
    assert.throws(() => connection.sqlite.prepare("UPDATE campaigns SET name='Changed' WHERE is_default=1").run(), /Default campaign is immutable/);
    assert.throws(() => connection.sqlite.prepare('UPDATE campaigns SET parent_campaign_id=NULL WHERE id=?').run(seeds[1].id), /fork provenance is immutable/);

    const { handle, takeMail } = createLocalAccountHarness(connection, origin, randomUUID() + randomUUID(), { disableRateLimitsForTests: true });
    const request = (route, { method = 'GET', body, cookie = '', requestOrigin = origin } = {}) => handle(new Request(`${origin}/api/auth/${route}`, {
      method, headers: { ...(requestOrigin ? { origin: requestOrigin } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }));
    async function createUser(username) {
      const email = `${username}@example.test`;
      const signup = await request('sign-up/email', { method: 'POST', body: { email, password: 'Temporary-campaign-password-123!', username, name: username } });
      assert.equal(signup.status, 200);
      const verify = takeMail().find(mail => mail.kind === 'verify-email');
      await handle(new Request(verify.url));
      const login = await request('sign-in/email', { method: 'POST', body: { email, password: 'Temporary-campaign-password-123!' } });
      assert.equal(login.status, 200);
      return { id: connection.sqlite.prepare('SELECT id FROM user WHERE username=?').get(username).id, cookie: cookies(login) };
    }
    const player = await createUser('campaignplayer');
    const visibleToPlayer = await request('campaigns', { cookie: player.cookie });
    assert.equal(visibleToPlayer.status, 200);
    assert.deepEqual((await visibleToPlayer.json()).campaigns.map(campaign => campaign.id), [seeds[0].id]);
    const deniedFork = await request('campaigns', { method: 'POST', cookie: player.cookie, body: { name: 'Player Campaign', parentCampaignId: seeds[1].id, idempotencyKey: randomUUID() } });
    assert.equal(deniedFork.status, 403);

    await createUser('campaignadmin');
    bootstrapVerifiedUsername(connection, 'campaignadmin');
    const adminLogin = await request('sign-in/email', { method: 'POST', body: { email: 'campaignadmin@example.test', password: 'Temporary-campaign-password-123!' } });
    const adminCookie = cookies(adminLogin);
    assert.equal((await (await request('campaigns', { cookie: adminCookie })).json()).campaigns.length, 2);
    const key = randomUUID();
    const created = await request('campaigns', { method: 'POST', cookie: adminCookie, body: { name: 'The Folly of Giants', parentCampaignId: seeds[1].id, idempotencyKey: key } });
    assert.equal(created.status, 201, await created.clone().text());
    const fork = await created.json();
    assert.equal(fork.name, 'The Folly of Giants'); assert.equal(fork.parentCampaignId, seeds[1].id); assert.equal(fork.replayed, false);
    const replay = await request('campaigns', { method: 'POST', cookie: adminCookie, body: { name: 'The Folly of Giants', parentCampaignId: seeds[1].id, idempotencyKey: key } });
    assert.equal(replay.status, 200); assert.equal((await replay.json()).id, fork.id);
    assert.deepEqual(connection.sqlite.prepare('SELECT role, state FROM campaign_memberships WHERE campaign_id=?').get(fork.id), { role: 'campaign-administrator', state: 'active' });
    const start = connection.sqlite.prepare("SELECT s.operation_id FROM security_events s WHERE s.action='POST campaign-fork' AND s.phase='started' AND EXISTS (SELECT 1 FROM security_changes c WHERE c.operation_id=s.operation_id) ORDER BY s.occurred_at DESC LIMIT 1").get();
    const evidence = connection.sqlite.prepare("SELECT actor_id, entity FROM security_changes WHERE operation_id=? AND entity IN ('campaign','campaign_membership') ORDER BY entity").all(start.operation_id);
    assert.equal(evidence.length, 2); assert.ok(evidence.every(row => row.actor_id === connection.sqlite.prepare('SELECT id FROM user WHERE username=?').get('campaignadmin').id));
    const wrongOrigin = await request('campaigns', { method: 'POST', cookie: adminCookie, requestOrigin: 'https://untrusted.example', body: { name: 'Rejected', parentCampaignId: seeds[0].id, idempotencyKey: randomUUID() } });
    assert.equal(wrongOrigin.status, 403);
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});
