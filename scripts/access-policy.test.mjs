import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { isAuthorized } = await import('../src/server/auth/access-policy.ts');

const campaignA = 'campaign-a';
const campaignB = 'campaign-b';
const principal = (overrides = {}) => ({
  userId: 'user-player', emailVerified: true, accountState: 'active', siteAdministrator: false,
  memberships: [{ campaignId: campaignA, role: 'player', state: 'active', invitedByUserId: null }],
  ...overrides,
});
const member = (role, overrides = {}) => principal({
  memberships: [{ campaignId: campaignA, role, state: 'active', invitedByUserId: null }], ...overrides,
});

test('account verification and status gate every action, including Site Administrator access', () => {
  const actions = ['site.manage', 'campaign.read', 'campaign.configure', 'campaign.rename', 'campaign.manage-members', 'campaign.ban-player', 'campaign.ban-invited-gm', 'character.create', 'character.read', 'character.edit'];
  for (const changes of [{ emailVerified: false }, { accountState: 'disabled' }, { accountState: 'banned' }]) {
    const blocked = principal({ ...changes, siteAdministrator: true });
    for (const action of actions) assert.equal(isAuthorized(blocked, action, { campaignId: campaignA }), false, `${JSON.stringify(changes)} ${action}`);
  }
  assert.equal(isAuthorized(null, 'character.create'), false);
});

test('campaign membership is scoped and ambiguous or inactive rows fail closed', () => {
  assert.equal(isAuthorized(principal(), 'campaign.read', { campaignId: campaignA }), true);
  assert.equal(isAuthorized(principal(), 'campaign.read', { campaignId: campaignB }), false);
  assert.equal(isAuthorized(principal({ memberships: [{ campaignId: campaignA, role: 'gm', state: 'banned', invitedByUserId: null }] }), 'campaign.configure', { campaignId: campaignA }), false);
  assert.equal(isAuthorized(principal({ memberships: [
    { campaignId: campaignA, role: 'player', state: 'active', invitedByUserId: null },
    { campaignId: campaignA, role: 'gm', state: 'active', invitedByUserId: null },
  ] }), 'campaign.configure', { campaignId: campaignA }), false);
});

test('players see shared non-private characters but private content stays owner/staff scoped', () => {
  const player = principal();
  assert.equal(isAuthorized(player, 'character.read', { characterOwnerId: 'another-user', private: false }), true);
  assert.equal(isAuthorized(player, 'character.read', { characterOwnerId: 'another-user', campaignId: campaignA, private: false }), true);
  assert.equal(isAuthorized(player, 'character.read', { characterOwnerId: 'another-user', campaignId: campaignB, private: false }), false);
  assert.equal(isAuthorized(player, 'character.read', { characterOwnerId: 'another-user', campaignId: campaignA, private: true }), false);
  assert.equal(isAuthorized(player, 'character.read', { characterOwnerId: player.userId, campaignId: campaignA, private: true }), true);
  assert.equal(isAuthorized(member('gm'), 'character.read', { characterOwnerId: 'another-user', campaignId: campaignA, private: true }), true);
  assert.equal(isAuthorized(member('gm'), 'character.read', { characterOwnerId: 'another-user', campaignId: campaignB, private: true }), false);
});

test('players edit only their own server-approved editable characters', () => {
  const player = principal();
  assert.equal(isAuthorized(player, 'character.edit', { characterOwnerId: player.userId, ownerEditAllowed: true }), true);
  assert.equal(isAuthorized(player, 'character.edit', { characterOwnerId: player.userId, ownerEditAllowed: false }), false);
  assert.equal(isAuthorized(player, 'character.edit', { characterOwnerId: 'other-user', ownerEditAllowed: true }), false);
  assert.equal(isAuthorized(player, 'character.edit', { characterOwnerId: player.userId, campaignId: campaignB, ownerEditAllowed: true }), false);
  assert.equal(isAuthorized(member('gm'), 'character.edit', { characterOwnerId: 'other-user', campaignId: campaignA, ownerEditAllowed: false }), true);
});

test('campaign roles keep rename, role assignment, and inviter-limited GM bans distinct', () => {
  for (const role of ['gm', 'campaign-administrator']) {
    assert.equal(isAuthorized(member(role), 'campaign.configure', { campaignId: campaignA }), true);
    assert.equal(isAuthorized(member(role), 'campaign.ban-player', { campaignId: campaignA, targetRole: 'player' }), true);
    assert.equal(isAuthorized(member(role), 'campaign.ban-player', { campaignId: campaignA, targetRole: 'campaign-administrator' }), false);
  }
  assert.equal(isAuthorized(member('player'), 'campaign.configure', { campaignId: campaignA }), false);
  assert.equal(isAuthorized(member('gm'), 'campaign.rename', { campaignId: campaignA }), false);
  assert.equal(isAuthorized(member('gm'), 'campaign.manage-members', { campaignId: campaignA }), false);
  assert.equal(isAuthorized(member('campaign-administrator'), 'campaign.rename', { campaignId: campaignA }), true);
  assert.equal(isAuthorized(member('campaign-administrator'), 'campaign.manage-members', { campaignId: campaignA }), true);
  assert.equal(isAuthorized(member('gm'), 'campaign.ban-invited-gm', { campaignId: campaignA, targetRole: 'gm', targetInvitedByActor: true }), true);
  assert.equal(isAuthorized(member('gm'), 'campaign.ban-invited-gm', { campaignId: campaignA, targetRole: 'gm', targetInvitedByActor: false }), false);
  assert.equal(isAuthorized(member('gm'), 'campaign.ban-invited-gm', { campaignId: campaignA, targetRole: 'campaign-administrator', targetInvitedByActor: true }), false);
});

test('Site Administrator has cross-campaign scope only while the account is active and verified', () => {
  const admin = principal({ siteAdministrator: true, memberships: [] });
  assert.equal(isAuthorized(admin, 'site.manage'), true);
  assert.equal(isAuthorized(admin, 'campaign.rename', { campaignId: campaignB }), true);
  assert.equal(isAuthorized(admin, 'character.read', { campaignId: campaignB, characterOwnerId: 'other-user', private: true }), true);
  assert.equal(isAuthorized(admin, 'character.edit', { campaignId: campaignB, characterOwnerId: 'other-user' }), true);
});
