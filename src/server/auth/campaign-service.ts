import 'server-only';
import { randomUUID } from 'node:crypto';
import type { openDatabase } from '../db/connection';
import { isAuthorized } from './access-policy';
import { resolveAuthorizationPrincipal } from './authorization-context';

type Connection = ReturnType<typeof openDatabase>;
type CampaignRow = { id: string; name: string; lifecycle: 'preparing' | 'active' | 'archived'; is_default: number; parent_campaign_id: string | null; created_at: number };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export function createCampaignService(connection: Connection) {
  const db = connection.sqlite;
  return {
    list(actorId: string | null) {
      if (!actorId) return response({ error: 'Authentication required.' }, 401);
      const principal = resolveAuthorizationPrincipal(connection, actorId);
      if (!principal) return response({ error: 'Authentication required.' }, 401);
      const rows = db.prepare('SELECT id, name, lifecycle, is_default, parent_campaign_id, created_at FROM campaigns ORDER BY is_default DESC, name COLLATE NOCASE, id').all() as CampaignRow[];
      const campaigns = rows.filter(row => isAuthorized(principal, 'campaign.read', { campaignId: row.id, campaignIsDefault: row.is_default === 1 })).map(row => ({
        id: row.id, name: row.name, lifecycle: row.lifecycle, isDefault: row.is_default === 1,
        parentCampaignId: row.parent_campaign_id, createdAt: row.created_at,
        canConfigure: isAuthorized(principal, 'campaign.configure', { campaignId: row.id }),
      }));
      return response({ campaigns, canCreateCampaign: isAuthorized(principal, 'site.manage') });
    },
    createFork(actorId: string | null, body: unknown) {
      if (!actorId) return response({ error: 'Authentication required.' }, 401);
      const principal = resolveAuthorizationPrincipal(connection, actorId);
      if (!principal) return response({ error: 'Authentication required.' }, 401);
      if (!isAuthorized(principal, 'site.manage')) return response({ error: 'Forbidden.' }, 403);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return response({ error: 'Invalid campaign request.' }, 400);
      const value = body as Record<string, unknown>;
      if (Object.keys(value).some(key => !['name', 'parentCampaignId', 'idempotencyKey'].includes(key)) || typeof value.name !== 'string' || !value.name.trim() || value.name.trim().length > 100 || typeof value.parentCampaignId !== 'string' || !uuid.test(value.parentCampaignId) || typeof value.idempotencyKey !== 'string' || !uuid.test(value.idempotencyKey)) return response({ error: 'Invalid campaign request.' }, 400);
      const parent = db.prepare('SELECT id FROM campaigns WHERE id=?').get(value.parentCampaignId);
      if (!parent) return response({ error: 'Source campaign not found.' }, 404);
      const id = randomUUID(), now = Date.now(), name = value.name.trim().replace(/\s+/g, ' ');
      const create = db.transaction(() => {
        const replay = db.prepare('SELECT id, name, parent_campaign_id FROM campaigns WHERE created_by=? AND create_idempotency_key=?').get(actorId, value.idempotencyKey) as { id: string; name: string; parent_campaign_id: string } | undefined;
        if (replay) return { id: replay.id, name: replay.name, parentCampaignId: replay.parent_campaign_id, replayed: true };
        db.prepare(`INSERT INTO campaigns (id, name, lifecycle, is_default, parent_campaign_id, create_idempotency_key, created_at, created_by)
          VALUES (?, ?, 'preparing', 0, ?, ?, ?, ?)`).run(id, name, value.parentCampaignId, value.idempotencyKey, now, actorId);
        db.prepare(`INSERT INTO campaign_memberships (campaign_id, user_id, role, state, invited_by_user_id, joined_at)
          VALUES (?, ?, 'campaign-administrator', 'active', NULL, ?)`).run(id, actorId, now);
        return { id, name, parentCampaignId: value.parentCampaignId, replayed: false };
      }).immediate();
      return response(create, create.replayed ? 200 : 201);
    },
  };
}
