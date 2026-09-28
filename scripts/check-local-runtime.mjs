import Database from 'better-sqlite3';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';

function requireValue(value, message) {
  if (!value) throw new Error(message);
  return value;
}

const configuredDir = requireValue(process.env.DXD_DATA_DIR, 'Set DXD_DATA_DIR to the local account data directory.');
if (!path.isAbsolute(configuredDir)) throw new Error('DXD_DATA_DIR must be absolute.');
if (process.env.DXD_STORAGE_MODE !== 'accounts') throw new Error('Set DXD_STORAGE_MODE=accounts to check the account runtime.');
if (process.env.NODE_ENV === 'production') throw new Error('This account runtime is still development-only.');
const secret = requireValue(process.env.DXD_AUTH_SECRET, 'Set DXD_AUTH_SECRET.');
if (secret.length < 32) throw new Error('DXD_AUTH_SECRET must contain at least 32 characters.');
const baseURL = new URL(process.env.DXD_AUTH_BASE_URL ?? 'http://127.0.0.1:3000');
if (!['localhost', '127.0.0.1', '[::1]'].includes(baseURL.hostname) || !['http:', 'https:'].includes(baseURL.protocol) || baseURL.username || baseURL.password || baseURL.pathname !== '/' || baseURL.search || baseURL.hash) {
  throw new Error('DXD_AUTH_BASE_URL must be a loopback origin with no path or credentials.');
}
const dataDir = await realpath(path.resolve(configuredDir));
const directoryInfo = await stat(dataDir);
if (!directoryInfo.isDirectory() || (directoryInfo.mode & 0o077) !== 0) throw new Error('DXD_DATA_DIR must have owner-only permissions.');
const filename = path.join(dataDir, 'dxd.sqlite');
if (await realpath(filename) !== filename) throw new Error('The local database must not be a symlink.');
const databaseInfo = await stat(filename);
if (!databaseInfo.isFile() || (databaseInfo.mode & 0o077) !== 0) throw new Error('The local database must be a regular owner-only file.');

const expectedTables = ['user', 'account', 'session', 'verification', 'two_factor', 'auth_mail', 'security_events', 'security_changes', 'consumed_totp', 'auth_throttle', 'security_review_decisions', 'site_administrators', 'account_access', 'campaigns', 'campaign_memberships', 'campaign_invitations', 'campaign_invitation_joins', 'characters', 'character_versions'];
const db = new Database(filename, { readonly: true, fileMustExist: true });
try {
  const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name));
  const missingTables = expectedTables.filter(name => !tables.has(name));
  if (missingTables.length) throw new Error(`Database schema is incomplete; run npm run db:migrate:local. Missing: ${missingTables.join(', ')}.`);
  const seeds = db.prepare(`SELECT
    (SELECT count(*) FROM campaigns WHERE id='7841aa01-33f4-4a90-8d13-000000000001' AND name='Default Campaign' AND lifecycle='preparing' AND is_default=1 AND parent_campaign_id IS NULL) AS defaultCampaign,
    (SELECT count(*) FROM campaigns WHERE id='7841aa01-33f4-4a90-8d13-000000000002' AND name='Working Campaign' AND lifecycle='preparing' AND is_default=0 AND parent_campaign_id='7841aa01-33f4-4a90-8d13-000000000001') AS workingCampaign`).get();
  if (seeds.defaultCampaign !== 1 || seeds.workingCampaign !== 1) throw new Error('Default/Working campaign seeds are incomplete; run npm run db:migrate:local.');
  const migrations = db.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get().count;
  if (migrations !== 14) throw new Error(`Expected 14 reviewed local account migrations; found ${migrations}. Run npm run db:migrate:local.`);
  const requiredIndexes = ['auth_throttle_expiry', 'campaign_single_default', 'campaign_membership_campaign_user', 'campaign_create_idempotency', 'campaign_invitations_token_hash_unique', 'campaign_invitation_active', 'campaign_invitation_join_user', 'character_owner_create_idempotency', 'character_version_number', 'character_version_idempotency', 'character_version_history'];
  const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(row => row.name));
  const missingIndexes = requiredIndexes.filter(name => !indexes.has(name));
  if (missingIndexes.length) throw new Error(`Database indexes are incomplete; run npm run db:migrate:local. Missing: ${missingIndexes.join(', ')}.`);
  const requiredTriggers = ['account_access_audit_insert', 'account_access_audit_update', 'account_access_no_delete', 'campaign_audit_insert', 'campaign_audit_update', 'campaign_no_delete', 'campaign_default_immutable', 'campaign_membership_audit_insert', 'campaign_membership_audit_update', 'campaign_membership_no_delete', 'campaign_parent_immutable', 'campaign_invitation_audit_insert', 'campaign_invitation_update_guard', 'campaign_invitation_audit_update', 'campaign_invitation_no_delete', 'campaign_invitation_join_audit_insert', 'campaign_invitation_join_no_update', 'campaign_invitation_join_no_delete', 'character_audit_insert', 'character_audit_update', 'character_version_pointer_monotonic', 'character_no_delete', 'character_version_audit_insert', 'character_version_no_update', 'character_version_no_delete'];
  const triggers = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all().map(row => row.name));
  const missingTriggers = requiredTriggers.filter(name => !triggers.has(name));
  if (missingTriggers.length) throw new Error(`Authorization audit rules are incomplete; run npm run db:migrate:local. Missing: ${missingTriggers.join(', ')}.`);
  const integrity = db.pragma('integrity_check');
  if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') throw new Error('SQLite integrity check failed.');
  const foreignKeys = db.pragma('foreign_key_check');
  if (foreignKeys.length) throw new Error('SQLite foreign-key check failed.');
  console.log(JSON.stringify({ ready: true, mode: 'accounts', database: filename, migrations, authOrigin: baseURL.origin }));
} finally {
  db.close();
}
