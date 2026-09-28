import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const { openDatabase, migrateDatabase } = await import('../src/server/db/connection.ts');
const { createLocalAccountHarness } = await import('../src/server/auth/local-harness.ts');
const { createEmptyCharacterDraft } = await import('../src/lib/character-draft.ts');

const origin = 'http://127.0.0.1:3000';
const cookies = response => response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');

test('development character API enforces ownership, privacy, campaign scope and immutable version concurrency', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-character-service-'));
  const connection = openDatabase(path.join(root, 'accounts.sqlite'));
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const { handle, takeMail } = createLocalAccountHarness(connection, origin, randomUUID() + randomUUID(), { disableRateLimitsForTests: true });
    const auth = async (route, { method = 'GET', body, cookie = '', requestOrigin = origin } = {}) => handle(new Request(`${origin}/api/auth/${route}`, {
      method, headers: { ...(requestOrigin ? { origin: requestOrigin } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }));
    async function user(username) {
      const email = `${username}@example.test`;
      const signed = await auth('sign-up/email', { method: 'POST', body: { email, password: 'Temporary-character-password-123!', name: username, username } });
      assert.equal(signed.status, 200);
      const verify = takeMail().find(mail => mail.kind === 'verify-email');
      await handle(new Request(verify.url));
      const login = await auth('sign-in/email', { method: 'POST', body: { email, password: 'Temporary-character-password-123!' } });
      assert.equal(login.status, 200);
      return { id: connection.sqlite.prepare('SELECT id FROM user WHERE username=?').get(username).id, cookie: cookies(login) };
    }
    const alice = await user('alice');
    const bob = await user('bob');
    const gm = await user('gamemaster');
    const campaign = randomUUID();
    connection.sqlite.prepare("INSERT INTO campaigns (id,name,lifecycle,is_default,created_at,created_by) VALUES (?,'Test','preparing',0,?,?)").run(campaign, Date.now(), gm.id);
    const member = connection.sqlite.prepare("INSERT INTO campaign_memberships (campaign_id,user_id,role,state,joined_at) VALUES (?,?,'player','active',?)");
    member.run(campaign, alice.id, Date.now()); member.run(campaign, bob.id, Date.now());
    connection.sqlite.prepare("INSERT INTO campaign_memberships (campaign_id,user_id,role,state,joined_at) VALUES (?,?,'gm','active',?)").run(campaign, gm.id, Date.now());

    const draft = createEmptyCharacterDraft(); draft.background.properName = 'Private Alice';
    const createKey = randomUUID();
    const created = await auth('characters', { method: 'POST', cookie: alice.cookie, body: { draft, campaignId: campaign, private: true, idempotencyKey: createKey } });
    assert.equal(created.status, 201, await created.clone().text());
    const character = await created.json();
    assert.throws(() => connection.sqlite.prepare('UPDATE characters SET current_version=2 WHERE id=?').run(character.id), /must advance to an existing next version/);
    const replayCreate = await auth('characters', { method: 'POST', cookie: alice.cookie, body: { draft, campaignId: campaign, private: true, idempotencyKey: createKey } });
    assert.equal(replayCreate.status, 200); assert.equal((await replayCreate.json()).id, character.id);
    assert.equal((await auth(`characters/${character.id}`, { cookie: bob.cookie })).status, 404);
    assert.equal((await auth('characters?campaignId=' + campaign, { cookie: bob.cookie })).status, 200);
    assert.equal((await (await auth('characters?campaignId=' + campaign, { cookie: bob.cookie })).json()).characters.length, 0);
    assert.equal((await auth(`characters/${character.id}`, { cookie: gm.cookie })).status, 200);

    const updateDraft = createEmptyCharacterDraft(); updateDraft.background.properName = 'Updated by GM';
    const updateKey = randomUUID();
    const changed = await auth(`characters/${character.id}`, { method: 'PUT', cookie: gm.cookie, body: { draft: updateDraft, expectedVersion: 1, idempotencyKey: updateKey, private: false } });
    assert.equal(changed.status, 200, await changed.clone().text()); assert.equal((await changed.json()).version, 2);
    const replay = await auth(`characters/${character.id}`, { method: 'PUT', cookie: gm.cookie, body: { draft: updateDraft, expectedVersion: 1, idempotencyKey: updateKey, private: false } });
    assert.equal(replay.status, 200); assert.equal((await replay.json()).replayed, true);
    const stale = await auth(`characters/${character.id}`, { method: 'PUT', cookie: alice.cookie, body: { draft: updateDraft, expectedVersion: 1, idempotencyKey: randomUUID(), private: false } });
    assert.equal(stale.status, 409); assert.equal((await stale.json()).currentVersion, 2);
    const history = await auth(`characters/${character.id}/versions`, { cookie: alice.cookie });
    assert.deepEqual((await history.json()).versions.map(version => version.version), [2, 1]);
    const oldVersion = await auth(`characters/${character.id}/versions/1`, { cookie: alice.cookie });
    assert.equal((await oldVersion.json()).draft.background.properName, 'Private Alice');
    assert.throws(() => connection.sqlite.prepare("UPDATE character_versions SET draft_json='{}'").run(), /immutable/);
    assert.throws(() => connection.sqlite.prepare('DELETE FROM characters WHERE id=?').run(character.id), /retention recovery is implemented/);
    const events = connection.sqlite.prepare("SELECT actor_id,entity,entity_id FROM security_changes WHERE entity IN ('character','character_version') AND entity_id=?").all(character.id);
    assert.ok(events.some(row => row.actor_id === alice.id && row.entity === 'character'));
    assert.ok(events.some(row => row.actor_id === gm.id && row.entity === 'character_version'));

    const activeCampaign = randomUUID();
    connection.sqlite.prepare("INSERT INTO campaigns (id,name,lifecycle,is_default,created_at,created_by) VALUES (?,'Active','active',0,?,?)").run(activeCampaign, Date.now(), gm.id);
    member.run(activeCampaign, alice.id, Date.now());
    connection.sqlite.prepare("INSERT INTO campaign_memberships (campaign_id,user_id,role,state,joined_at) VALUES (?,?,'gm','active',?)").run(activeCampaign, gm.id, Date.now());
    const blockedCampaignDraft = createEmptyCharacterDraft();
    const bypassReview = await auth('characters', { method: 'POST', cookie: alice.cookie, body: { draft: blockedCampaignDraft, campaignId: activeCampaign, private: false, idempotencyKey: randomUUID() } });
    assert.equal(bypassReview.status, 403);
    const staffCreate = await auth('characters', { method: 'POST', cookie: gm.cookie, body: { draft: blockedCampaignDraft, campaignId: activeCampaign, private: false, idempotencyKey: randomUUID() } });
    assert.equal(staffCreate.status, 201);

    const shared = createEmptyCharacterDraft(); shared.background.properName = 'Shared';
    const sharedResult = await auth('characters', { method: 'POST', cookie: alice.cookie, body: { draft: shared, private: false, idempotencyKey: randomUUID() } });
    const sharedId = (await sharedResult.json()).id;
    assert.equal((await auth(`characters/${sharedId}`, { cookie: bob.cookie })).status, 200);
    const wrongOrigin = await auth('characters', { method: 'POST', cookie: alice.cookie, requestOrigin: 'https://untrusted.example', body: { draft: shared, private: false, idempotencyKey: randomUUID() } });
    assert.equal(wrongOrigin.status, 403);
    const oversized = await handle(new Request(`${origin}/api/auth/characters`, { method: 'POST', headers: { origin, 'content-type': 'application/json', cookie: alice.cookie }, body: ' '.repeat(6 * 1024 * 1024 + 1) }));
    assert.equal(oversized.status, 413);
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});
