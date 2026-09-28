import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID, createHmac } from 'node:crypto';
const { openDatabase, migrateDatabase } = await import('../src/server/db/connection.ts');
const { createLocalAccountHarness } = await import('../src/server/auth/local-harness.ts');
const { bootstrapVerifiedUsername } = await import('../src/server/auth/site-admin.ts');

const origin = 'http://127.0.0.1:3000';
const cookies = response => response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
function totp(uri) {
  const url = new URL(uri), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...url.searchParams.get('secret').replace(/=+$/, '').toUpperCase()].map(c => alphabet.indexOf(c).toString(2).padStart(5, '0')).join('');
  const key = Buffer.from(bits.match(/.{8}/g).map(byte => parseInt(byte, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / Number(url.searchParams.get('period') || 30))));
  const mac = createHmac('sha1', key).update(counter).digest(), offset = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** Number(url.searchParams.get('digits') || 6)).padStart(6, '0');
}

test('campaign invitations preview without consuming uses and atomically join verified members', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-campaign-invitation-'));
  const connection = openDatabase(path.join(root, 'accounts.sqlite'));
  try {
    migrateDatabase(connection, path.resolve('migrations/auth'));
    const { handle, takeMail } = createLocalAccountHarness(connection, origin, randomUUID() + randomUUID(), { disableRateLimitsForTests: true });
    const request = (route, { method = 'GET', body, cookie = '', requestOrigin = origin } = {}) => handle(new Request(`${origin}/api/auth/${route}`, {
      method,
      headers: { ...(requestOrigin ? { origin: requestOrigin } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }));
    async function enableMfa(cookie, password) {
      const setup = await request('two-factor/enable', { method: 'POST', cookie, body: { password, issuer: 'DXD Test' } });
      assert.equal(setup.status, 200, await setup.clone().text());
      const enrollment = await setup.json();
      const verified = await request('two-factor/verify-totp', { method: 'POST', cookie, body: { code: totp(enrollment.totpURI) } });
      assert.equal(verified.status, 200, await verified.clone().text());
      return cookies(verified) || cookie;
    }
    async function createUser(username, verified = true) {
      const email = `${username}@example.test`, password = 'Temporary-invitation-password-123!';
      const signup = await request('sign-up/email', { method: 'POST', body: { email, password, username, name: username } });
      assert.equal(signup.status, 200, await signup.clone().text());
      const verification = takeMail().find(mail => mail.kind === 'verify-email');
      assert.ok(verification);
      const id = connection.sqlite.prepare('SELECT id FROM user WHERE username=?').get(username).id;
      if (!verified) return { id, email, password, verification };
      await handle(new Request(verification.url));
      const login = await request('sign-in/email', { method: 'POST', body: { email, password } });
      assert.equal(login.status, 200);
      return { id, email, password, cookie: cookies(login) };
    }

    const admin = await createUser('inviteadmin');
    bootstrapVerifiedUsername(connection, 'inviteadmin');
    const adminLogin = await request('sign-in/email', { method: 'POST', body: { email: admin.email, password: admin.password } });
    let adminCookie = cookies(adminLogin);
    adminCookie = await enableMfa(adminCookie, admin.password);
    const forkResponse = await request('campaigns', { method: 'POST', cookie: adminCookie, body: { name: 'Invitation Test Campaign', parentCampaignId: '7841aa01-33f4-4a90-8d13-000000000002', idempotencyKey: randomUUID() } });
    assert.equal(forkResponse.status, 201, await forkResponse.clone().text());
    const campaignId = (await forkResponse.json()).id;

    const gmInviteResponse = await request(`campaigns/${campaignId}/invitations`, { method: 'POST', cookie: adminCookie, body: { role: 'gm', maxUses: 2 } });
    assert.equal(gmInviteResponse.status, 201, await gmInviteResponse.clone().text());
    const gmInvite = await gmInviteResponse.json();
    const token = new URL(gmInvite.inviteUrl).pathname.split('/').pop();
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal((await request(`invitations/${token}`)).headers.get('cache-control'), 'no-store');
    assert.deepEqual((await (await request(`invitations/${token}`)).json()).usesRemaining, 2);
    assert.equal((await request(`invitations/${token}/accept`, { method: 'POST' })).status, 401);
    assert.equal((await request(`invitations/${token}/accept`, { method: 'POST', requestOrigin: 'https://untrusted.example' })).status, 403);

    const gm = await createUser('invitedgm');
    const joinedGmResponse = await request(`invitations/${token}/accept`, { method: 'POST', cookie: gm.cookie });
    assert.equal(joinedGmResponse.status, 200, await joinedGmResponse.clone().text());
    assert.equal((await joinedGmResponse.json()).role, 'gm');
    const replayGm = await request(`invitations/${token}/accept`, { method: 'POST', cookie: gm.cookie });
    assert.equal((await replayGm.json()).replayed, true);
    assert.equal(connection.sqlite.prepare('SELECT uses FROM campaign_invitations WHERE id=?').get(gmInvite.id).uses, 1);
    const blockedInvite = await request(`campaigns/${campaignId}/invitations`, { method: 'POST', cookie: gm.cookie, body: { role: 'player' } });
    assert.equal(blockedInvite.status, 403); assert.equal((await blockedInvite.json()).code, 'MFA_REQUIRED');
    gm.cookie = await enableMfa(gm.cookie, 'Temporary-invitation-password-123!');
    const escalated = await request(`campaigns/${campaignId}/invitations`, { method: 'POST', cookie: gm.cookie, body: { role: 'campaign-administrator' } });
    assert.equal(escalated.status, 403);
    const gmPlayerInviteResponse = await request(`campaigns/${campaignId}/invitations`, { method: 'POST', cookie: gm.cookie, body: { role: 'player', maxUses: 2 } });
    assert.equal(gmPlayerInviteResponse.status, 201, await gmPlayerInviteResponse.clone().text());
    const playerInvite = await gmPlayerInviteResponse.json();
    const playerToken = new URL(playerInvite.inviteUrl).pathname.split('/').pop();
    const unverified = await createUser('pendinginvite', false);
    assert.equal((await request(`invitations/${playerToken}/accept`, { method: 'POST', cookie: '' })).status, 401);
    assert.equal((await request('sign-in/email', { method: 'POST', body: { email: unverified.email, password: unverified.password } })).status, 403);
    const players = await Promise.all(['inviteplayera', 'inviteplayerb', 'inviteplayerc'].map(name => createUser(name)));
    const acceptResults = await Promise.all(players.map(player => request(`invitations/${playerToken}/accept`, { method: 'POST', cookie: player.cookie })));
    assert.deepEqual(acceptResults.map(result => result.status).sort(), [200, 200, 404]);
    assert.equal(connection.sqlite.prepare('SELECT uses FROM campaign_invitations WHERE id=?').get(playerInvite.id).uses, 2);
    assert.equal(connection.sqlite.prepare("SELECT count(*) AS n FROM campaign_memberships WHERE campaign_id=? AND role='player' AND state='active'").get(campaignId).n, 2);
    assert.equal((await request(`invitations/${playerToken}`)).status, 404);
    assert.equal((await request(`invitations/${new URL(gmInvite.inviteUrl).pathname.split('/').pop()}/accept`, { method: 'POST', cookie: gm.cookie })).status, 200);
    connection.sqlite.prepare("UPDATE campaign_memberships SET state='banned' WHERE campaign_id=? AND user_id=?").run(campaignId, gm.id);
    assert.equal((await request(`invitations/${token}/accept`, { method: 'POST', cookie: gm.cookie })).status, 403);

    const revocableResponse = await request(`campaigns/${campaignId}/invitations`, { method: 'POST', cookie: adminCookie, body: { role: 'player' } });
    const revocable = await revocableResponse.json(), revokeToken = new URL(revocable.inviteUrl).pathname.split('/').pop();
    assert.equal((await request(`campaigns/${campaignId}/invitations/${revocable.id}`, { method: 'DELETE', cookie: adminCookie, requestOrigin: 'https://untrusted.example' })).status, 403);
    assert.equal((await request(`campaigns/${campaignId}/invitations/${revocable.id}`, { method: 'DELETE', cookie: adminCookie })).status, 200);
    assert.equal((await request(`invitations/${revokeToken}`)).status, 404);
    assert.equal((await request(`campaigns/${campaignId}/invitations`, { cookie: adminCookie })).status, 200);
    const listed = await (await request(`campaigns/${campaignId}/invitations`, { cookie: adminCookie })).json();
    assert.ok(!JSON.stringify(listed).includes(token));
    assert.ok(!JSON.stringify(listed).includes(revokeToken));
    assert.throws(() => connection.sqlite.prepare('UPDATE campaign_invitations SET max_uses=99 WHERE id=?').run(revocable.id), /Only invitation use or revocation can change/);
    assert.throws(() => connection.sqlite.prepare('DELETE FROM campaign_invitations WHERE id=?').run(revocable.id), /Invitation history is immutable/);
    assert.throws(() => connection.sqlite.prepare('DELETE FROM campaign_invitation_joins').run(), /Invitation join history is immutable/);
    const securityEvents = connection.sqlite.prepare("SELECT action FROM security_events WHERE action LIKE '%campaign-invitation%' OR action LIKE '%campaign-invitations%'").all();
    assert.ok(securityEvents.length > 0);
    assert.ok(!JSON.stringify(securityEvents).includes(token));
    assert.ok(!JSON.stringify(securityEvents).includes(revokeToken));
    assert.equal((await request(`campaigns/${campaignId}/invitations`, { method: 'POST', requestOrigin: 'https://untrusted.example', cookie: adminCookie, body: { role: 'player' } })).status, 403);
    const expiringResponse = await request(`campaigns/${campaignId}/invitations`, { method: 'POST', cookie: adminCookie, body: { role: 'player', expiresInMinutes: 1 } });
    const expiring = await expiringResponse.json(), expiringToken = new URL(expiring.inviteUrl).pathname.split('/').pop();
    const realNow = Date.now;
    try { Date.now = () => expiring.expiresAt + 1; assert.equal((await request(`invitations/${expiringToken}`)).status, 404); }
    finally { Date.now = realNow; }
  } finally { connection.close(); await rm(root, { recursive: true, force: true }); }
});
