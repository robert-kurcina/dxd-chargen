import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { openDatabase } from '../db/connection';
import type { CampaignRole } from './access-policy';
import { isAuthorized } from './access-policy';
import { resolveAuthorizationPrincipal } from './authorization-context';

type Connection = ReturnType<typeof openDatabase>;
type InvitationRow = { id: string; campaign_id: string; role: CampaignRole; expires_at: number; max_uses: number; uses: number; created_by: string; revoked_at: number | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
const digest = (token: string) => createHash('sha256').update('dxd-campaign-invite-v1\0').update(token).digest('hex');
const roles: CampaignRole[] = ['player', 'gm', 'campaign-administrator'];

function invitationRow(connection: Connection, token: string) {
  if (!tokenPattern.test(token)) return undefined;
  return connection.sqlite.prepare(`SELECT i.id, i.campaign_id, i.role, i.expires_at, i.max_uses, i.uses, i.created_by, i.revoked_at,
      c.name AS campaign_name, c.lifecycle AS campaign_lifecycle, c.is_default AS campaign_is_default
    FROM campaign_invitations i JOIN campaigns c ON c.id=i.campaign_id WHERE i.token_hash=?`).get(digest(token)) as
    (InvitationRow & { campaign_name: string; campaign_lifecycle: string; campaign_is_default: number }) | undefined;
}
function usable(row: InvitationRow & { campaign_lifecycle: string }, now: number) {
  return row.revoked_at === null && row.expires_at > now && row.uses < row.max_uses && row.campaign_lifecycle !== 'archived';
}
function issuerCanInvite(connection: Connection, row: InvitationRow) {
  const issuer = resolveAuthorizationPrincipal(connection, row.created_by);
  if (!issuer || !isAuthorized(issuer, 'campaign.configure', { campaignId: row.campaign_id })) return false;
  if (row.role === 'campaign-administrator') return issuer.siteAdministrator || issuer.memberships.some(m => m.campaignId === row.campaign_id && m.state === 'active' && m.role === 'campaign-administrator');
  return true;
}

export function createCampaignInvitationService(connection: Connection, origin: string) {
  const db = connection.sqlite;
  function campaignManager(actorId: string | null, campaignId: string, allowArchived = false) {
    const principal = actorId ? resolveAuthorizationPrincipal(connection, actorId) : null;
    const campaign = db.prepare('SELECT is_default, lifecycle FROM campaigns WHERE id=?').get(campaignId) as { is_default: number; lifecycle: string } | undefined;
    if (!principal) return { error: response({ error: 'Authentication required.' }, 401) };
    if (!campaign || campaign.is_default || (!allowArchived && campaign.lifecycle === 'archived')) return { error: response({ error: 'Campaign unavailable.' }, 404) };
    if (!isAuthorized(principal, 'campaign.configure', { campaignId })) return { error: response({ error: 'Forbidden.' }, 403) };
    return { principal, campaign };
  }
  return {
    preview(token: string) {
      const row = invitationRow(connection, token);
      if (!row || !usable(row, Date.now())) return response({ error: 'Invitation is invalid or no longer available.' }, 404);
      return response({ campaign: { id: row.campaign_id, name: row.campaign_name, lifecycle: row.campaign_lifecycle }, role: row.role, expiresAt: row.expires_at, usesRemaining: row.max_uses - row.uses });
    },
    list(actorId: string | null, campaignId: string) {
      if (!uuid.test(campaignId)) return response({ error: 'Campaign unavailable.' }, 404);
      const access = campaignManager(actorId, campaignId);
      if (access.error) return access.error;
      const invitations = db.prepare(`SELECT id, role, expires_at AS expiresAt, max_uses AS maxUses, uses,
          created_at AS createdAt, revoked_at AS revokedAt
        FROM campaign_invitations WHERE campaign_id=? ORDER BY created_at DESC, id`).all(campaignId);
      return response({ invitations });
    },
    create(actorId: string | null, campaignId: string, body: unknown) {
      if (!uuid.test(campaignId)) return response({ error: 'Campaign unavailable.' }, 404);
      const access = campaignManager(actorId, campaignId);
      if (access.error) return access.error;
      if (!body || typeof body !== 'object' || Array.isArray(body)) return response({ error: 'Invalid invitation request.' }, 400);
      const value = body as Record<string, unknown>;
      const allowed = new Set(['role', 'expiresInMinutes', 'maxUses']);
      if (Object.keys(value).some(key => !allowed.has(key)) || !roles.includes(value.role as CampaignRole)) return response({ error: 'Invalid invitation request.' }, 400);
      const role = value.role as CampaignRole;
      const ownRole = access.principal.memberships.find(m => m.campaignId === campaignId && m.state === 'active')?.role;
      if (role === 'campaign-administrator' && !access.principal.siteAdministrator && ownRole !== 'campaign-administrator') return response({ error: 'Only Campaign Administrators can invite Campaign Administrators.' }, 403);
      const expiresInMinutes = value.expiresInMinutes === undefined ? 60 : value.expiresInMinutes;
      const maxUses = value.maxUses === undefined ? 3 : value.maxUses;
      if (!Number.isSafeInteger(expiresInMinutes) || (expiresInMinutes as number) < 1 || (expiresInMinutes as number) > 43_200 || !Number.isSafeInteger(maxUses) || (maxUses as number) < 1 || (maxUses as number) > 100) return response({ error: 'Invitation lifetime must be 1–43,200 minutes and use limit 1–100.' }, 400);
      const token = randomBytes(32).toString('base64url');
      const id = randomUUID(), now = Date.now(), expiresAt = now + Number(expiresInMinutes) * 60_000;
      db.prepare(`INSERT INTO campaign_invitations (id, campaign_id, token_hash, role, expires_at, max_uses, uses, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`).run(id, campaignId, digest(token), role, expiresAt, maxUses, access.principal.userId, now);
      const inviteUrl = new URL(`/invite/${token}`, origin).toString();
      return response({ id, campaignId, role, createdAt: now, expiresAt, maxUses, uses: 0, inviteUrl }, 201);
    },
    revoke(actorId: string | null, campaignId: string, invitationId: string) {
      if (!uuid.test(campaignId) || !uuid.test(invitationId)) return response({ error: 'Invitation not found.' }, 404);
      const access = campaignManager(actorId, campaignId, true);
      if (access.error) return access.error;
      const invitation = db.prepare('SELECT id, revoked_at FROM campaign_invitations WHERE id=? AND campaign_id=?').get(invitationId, campaignId) as { id: string; revoked_at: number | null } | undefined;
      if (!invitation) return response({ error: 'Invitation not found.' }, 404);
      if (invitation.revoked_at === null) db.prepare('UPDATE campaign_invitations SET revoked_at=? WHERE id=?').run(Date.now(), invitationId);
      return response({ id: invitationId, revoked: true });
    },
    accept(actorId: string | null, token: string) {
      if (!actorId) return response({ error: 'Sign in to accept this invitation.' }, 401);
      if (!tokenPattern.test(token)) return response({ error: 'Invitation is invalid or no longer available.' }, 404);
      const principal = resolveAuthorizationPrincipal(connection, actorId);
      if (!principal) return response({ error: 'Sign in to accept this invitation.' }, 401);
      if (!principal.emailVerified || principal.accountState !== 'active') return response({ error: 'A verified, active account is required to join a campaign.' }, 403);
      const now = Date.now();
      const result = db.transaction(() => {
        const row = invitationRow(connection, token);
        if (!row) return { response: response({ error: 'Invitation is invalid or no longer available.' }, 404) };
        const priorJoin = db.prepare('SELECT id FROM campaign_invitation_joins WHERE invitation_id=? AND user_id=?').get(row.id, actorId);
        if (priorJoin) {
          const membership = db.prepare('SELECT role, state FROM campaign_memberships WHERE campaign_id=? AND user_id=?').get(row.campaign_id, actorId) as { role: CampaignRole; state: string } | undefined;
          if (!membership || membership.state !== 'active') return { response: response({ error: 'This account cannot rejoin the campaign.' }, 403) };
          return { response: response({ campaignId: row.campaign_id, role: membership.role, joined: true, replayed: true }) };
        }
        if (!usable(row, now) || !issuerCanInvite(connection, row)) return { response: response({ error: 'Invitation is invalid or no longer available.' }, 404) };
        const existing = db.prepare('SELECT role, state FROM campaign_memberships WHERE campaign_id=? AND user_id=?').get(row.campaign_id, actorId) as { role: CampaignRole; state: string } | undefined;
        if (existing?.state === 'banned') return { response: response({ error: 'This account cannot rejoin the campaign.' }, 403) };
        if (existing?.state === 'active') return { response: response({ campaignId: row.campaign_id, role: existing.role, joined: true, alreadyMember: true }) };
        if (existing) {
          db.prepare(`UPDATE campaign_memberships SET role=?, state='active', invited_by_user_id=? WHERE campaign_id=? AND user_id=?`).run(row.role, row.created_by, row.campaign_id, actorId);
        } else {
          db.prepare(`INSERT INTO campaign_memberships (campaign_id, user_id, role, state, invited_by_user_id, joined_at)
            VALUES (?, ?, ?, 'active', ?, ?)`).run(row.campaign_id, actorId, row.role, row.created_by, now);
        }
        db.prepare('INSERT INTO campaign_invitation_joins (id, invitation_id, user_id, joined_at) VALUES (?, ?, ?, ?)').run(randomUUID(), row.id, actorId, now);
        db.prepare('UPDATE campaign_invitations SET uses=uses+1 WHERE id=?').run(row.id);
        return { response: response({ campaignId: row.campaign_id, role: row.role, joined: true, replayed: false }) };
      }).immediate();
      return result.response;
    },
  };
}
