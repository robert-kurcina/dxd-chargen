import 'server-only';
import { randomUUID } from 'node:crypto';
import type { openDatabase } from '../db/connection';
import { migrateCharacterDraft } from '@/lib/character-draft';
import { normalizeCharacterDraftForStorage } from '@/lib/import-character-creator';
import { isAuthorized } from './access-policy';
import { resolveAuthorizationPrincipal } from './authorization-context';

type Connection = ReturnType<typeof openDatabase>;
type CharacterRow = { id: string; owner_id: string; campaign_id: string | null; is_private: number; is_locked: number; current_version: number; lifecycle: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function canonicalDraft(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid draft.');
  const parsed = value as Record<string, unknown>;
  if (!Number.isSafeInteger(parsed.schemaVersion) || Number(parsed.schemaVersion) < 1 || Number(parsed.schemaVersion) > 11) throw new Error('Invalid draft schema.');
  return normalizeCharacterDraftForStorage(migrateCharacterDraft(parsed));
}
function readDraft(raw: string) { return canonicalDraft(JSON.parse(raw)); }
function record(connection: Connection, id: string): CharacterRow | undefined {
  return connection.sqlite.prepare(`SELECT c.id, c.owner_id, c.campaign_id, c.is_private, c.is_locked, c.current_version, p.lifecycle
    FROM characters c LEFT JOIN campaigns p ON p.id=c.campaign_id WHERE c.id=?`).get(id) as CharacterRow | undefined;
}
function canRead(connection: Connection, actorId: string, row: CharacterRow) {
  const principal = resolveAuthorizationPrincipal(connection, actorId);
  return principal && isAuthorized(principal, 'character.read', { campaignId: row.campaign_id, characterOwnerId: row.owner_id, private: row.is_private === 1 }) ? principal : null;
}
function canEdit(connection: Connection, actorId: string, row: CharacterRow) {
  const principal = resolveAuthorizationPrincipal(connection, actorId);
  return principal && isAuthorized(principal, 'character.edit', {
    campaignId: row.campaign_id, characterOwnerId: row.owner_id,
    ownerEditAllowed: row.is_locked !== 1 && (!row.campaign_id || row.lifecycle === 'preparing'),
  }) ? principal : null;
}
function insertVersion(connection: Connection, input: { id: string; version: number; draft: unknown; actorId: string; idempotencyKey: string; now: number }) {
  connection.sqlite.prepare(`INSERT INTO character_versions (id, character_id, version, draft_json, schema_version, edited_by, idempotency_key, created_at)
    VALUES (?, ?, ?, ?, 11, ?, ?, ?)`).run(randomUUID(), input.id, input.version, JSON.stringify(input.draft), input.actorId, input.idempotencyKey, input.now);
}

export function createCharacterService(connection: Connection) {
  const db = connection.sqlite;
  return {
    list(actorId: string | null, campaignId: string | null) {
      if (!actorId) return response({ error: 'Authentication required.' }, 401);
      const principal = resolveAuthorizationPrincipal(connection, actorId);
      if (!principal) return response({ error: 'Authentication required.' }, 401);
      if (campaignId && !isAuthorized(principal, 'campaign.read', { campaignId })) return response({ error: 'Forbidden.' }, 403);
      const rows = db.prepare(`SELECT c.id, c.owner_id, c.campaign_id, c.is_private, c.is_locked, c.current_version,
        v.draft_json, v.created_at AS version_created_at FROM characters c
        JOIN character_versions v ON v.character_id=c.id AND v.version=c.current_version
        WHERE (? IS NULL OR c.campaign_id=?) ORDER BY c.updated_at DESC, c.id`).all(campaignId, campaignId) as Array<CharacterRow & { draft_json: string; version_created_at: number }>;
      const items = rows.filter(row => canRead(connection, actorId, row)).map(row => {
        let name = '';
        try { const draft = JSON.parse(row.draft_json); name = typeof draft.background?.properName === 'string' && draft.background.properName ? draft.background.properName : typeof draft.background?.name === 'string' ? draft.background.name : ''; } catch { /* stored integrity is checked on detail reads */ }
        return { id: row.id, campaignId: row.campaign_id, private: row.is_private === 1, version: row.current_version, updatedAt: row.version_created_at, name };
      });
      return response({ characters: items });
    },
    create(actorId: string | null, body: any) {
      if (!actorId) return response({ error: 'Authentication required.' }, 401);
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['draft', 'campaignId', 'private', 'idempotencyKey'].includes(key)) || !uuid.test(body.idempotencyKey ?? '') || typeof body.private !== 'boolean' || !body.draft || typeof body.draft !== 'object') return response({ error: 'Invalid character request.' }, 400);
      const campaignId = body.campaignId ?? null;
      if (campaignId !== null && (typeof campaignId !== 'string' || !uuid.test(campaignId))) return response({ error: 'Invalid campaign.' }, 400);
      const principal = resolveAuthorizationPrincipal(connection, actorId);
      if (!principal) return response({ error: 'Authentication required.' }, 401);
      if (!isAuthorized(principal, 'character.create', { campaignId })) return response({ error: 'Forbidden.' }, 403);
      if (campaignId) {
        const campaign = db.prepare('SELECT lifecycle FROM campaigns WHERE id=?').get(campaignId) as { lifecycle: string } | undefined;
        if (!campaign || campaign.lifecycle === 'archived') return response({ error: 'Campaign unavailable.' }, 404);
        const membership = principal.memberships.find(item => item.campaignId === campaignId && item.state === 'active');
        if (campaign.lifecycle === 'active' && !principal.siteAdministrator && membership?.role !== 'gm' && membership?.role !== 'campaign-administrator') {
          return response({ error: 'Player characters must be reviewed before entering an active campaign.' }, 403);
        }
      }
      let draft;
      try { draft = canonicalDraft(body.draft); }
      catch { return response({ error: 'Invalid character draft.' }, 400); }
      const now = Date.now();
      const id = randomUUID();
      draft.characterId = id; draft.campaignId = campaignId; draft.updatedAt = new Date(now).toISOString();
      try {
        const create = db.transaction(() => {
          const existing = db.prepare('SELECT id, current_version FROM characters WHERE owner_id=? AND create_idempotency_key=?').get(actorId, body.idempotencyKey) as { id: string; current_version: number } | undefined;
          if (existing) return { id: existing.id, version: existing.current_version, replayed: true };
          db.prepare(`INSERT INTO characters (id, owner_id, campaign_id, is_private, current_version, create_idempotency_key, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)`).run(id, actorId, campaignId, body.private ? 1 : 0, body.idempotencyKey, now, now);
          insertVersion(connection, { id, version: 1, draft, actorId, idempotencyKey: body.idempotencyKey, now });
          return { id, version: 1, replayed: false };
        }).immediate();
        return response(create, create.replayed ? 200 : 201);
      } catch (error) {
        if (String(error).includes('character_owner_create_idempotency')) {
          const existing = db.prepare('SELECT id, current_version FROM characters WHERE owner_id=? AND create_idempotency_key=?').get(actorId, body.idempotencyKey) as { id: string; current_version: number } | undefined;
          if (existing) return response({ id: existing.id, version: existing.current_version, replayed: true });
        }
        throw error;
      }
    },
    read(actorId: string | null, id: string, version?: number) {
      if (!actorId) return response({ error: 'Authentication required.' }, 401);
      if (!uuid.test(id)) return response({ error: 'Not found.' }, 404);
      const row = record(connection, id);
      if (!row || !canRead(connection, actorId, row)) return response({ error: 'Not found.' }, 404);
      const targetVersion = version ?? row.current_version;
      if (!Number.isSafeInteger(targetVersion) || targetVersion < 1) return response({ error: 'Invalid version.' }, 400);
      const saved = db.prepare('SELECT version, draft_json, created_at, edited_by FROM character_versions WHERE character_id=? AND version=?').get(id, targetVersion) as { version: number; draft_json: string; created_at: number; edited_by: string } | undefined;
      if (!saved) return response({ error: 'Not found.' }, 404);
      try { return response({ id, version: saved.version, currentVersion: row.current_version, editedAt: saved.created_at, editedBy: saved.edited_by, draft: readDraft(saved.draft_json) }); }
      catch { return response({ error: 'Stored character draft is invalid.' }, 500); }
    },
    history(actorId: string | null, id: string) {
      if (!actorId) return response({ error: 'Authentication required.' }, 401);
      if (!uuid.test(id)) return response({ error: 'Not found.' }, 404);
      const row = record(connection, id);
      if (!row || !canRead(connection, actorId, row)) return response({ error: 'Not found.' }, 404);
      const versions = db.prepare('SELECT version, created_at AS editedAt, edited_by AS editedBy FROM character_versions WHERE character_id=? ORDER BY version DESC').all(id);
      return response({ id, currentVersion: row.current_version, versions });
    },
    update(actorId: string | null, id: string, body: any) {
      if (!actorId) return response({ error: 'Authentication required.' }, 401);
      if (!uuid.test(id)) return response({ error: 'Not found.' }, 404);
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['draft', 'expectedVersion', 'idempotencyKey', 'private'].includes(key)) || !Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 1 || !uuid.test(body.idempotencyKey ?? '') || typeof body.private !== 'boolean' || !body.draft || typeof body.draft !== 'object') return response({ error: 'Invalid character update.' }, 400);
      const now = Date.now();
      try {
        const result = db.transaction(() => {
          const row = record(connection, id);
          if (!row) return { response: response({ error: 'Not found.' }, 404) };
          if (!canEdit(connection, actorId, row)) return { response: response({ error: 'Forbidden.' }, 403) };
          const replay = db.prepare('SELECT version, edited_by FROM character_versions WHERE character_id=? AND idempotency_key=?').get(id, body.idempotencyKey) as { version: number; edited_by: string } | undefined;
          if (replay) return { response: replay.edited_by === actorId ? response({ id, version: replay.version, replayed: true }) : response({ error: 'Conflict.' }, 409) };
          if (row.current_version !== body.expectedVersion) return { response: response({ error: 'Version conflict.', currentVersion: row.current_version }, 409) };
          let draft;
          try { draft = canonicalDraft(body.draft); }
          catch { return { response: response({ error: 'Invalid character draft.' }, 400) }; }
          const nextVersion = row.current_version + 1;
          draft.characterId = id; draft.campaignId = row.campaign_id; draft.updatedAt = new Date(now).toISOString();
          insertVersion(connection, { id, version: nextVersion, draft, actorId, idempotencyKey: body.idempotencyKey, now });
          db.prepare('UPDATE characters SET current_version=?, is_private=?, updated_at=? WHERE id=?').run(nextVersion, body.private ? 1 : 0, now, id);
          return { response: response({ id, version: nextVersion, replayed: false }) };
        }).immediate();
        return result.response;
      } catch (error) {
        if (String(error).includes('character_version_number')) {
          const current = record(connection, id);
          return response({ error: 'Version conflict.', ...(current ? { currentVersion: current.current_version } : {}) }, 409);
        }
        throw error;
      }
    },
  };
}
