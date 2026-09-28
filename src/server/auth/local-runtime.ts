import 'server-only';
import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { openDatabase } from '../db/connection';
import { createLocalAccountHarness } from './local-harness';

const migrationCount = 13;
const requiredTables = ['user', 'account', 'session', 'verification', 'two_factor', 'auth_mail', 'security_events', 'security_changes', 'consumed_totp', 'auth_throttle', 'security_review_decisions', 'site_administrators', 'account_access', 'campaigns', 'campaign_memberships', 'characters', 'character_versions'];
type LocalRuntime = ReturnType<typeof createLocalAccountHarness> & { close: () => void };
type RuntimeGlobal = typeof globalThis & { __dxdLocalAccountRuntime?: LocalRuntime };

function createRuntime(): LocalRuntime {
  if (process.env.NODE_ENV !== 'development' || process.env.DXD_STORAGE_MODE !== 'accounts') {
    throw new Error('Local account APIs are disabled.');
  }
  const dataDir = process.env.DXD_DATA_DIR;
  const secret = process.env.DXD_AUTH_SECRET;
  if (!dataDir || !path.isAbsolute(dataDir) || !secret || secret.length < 32) throw new Error('Local account configuration is incomplete.');
  const canonicalDir = realpathSync(dataDir);
  if ((statSync(canonicalDir).mode & 0o077) !== 0) throw new Error('Local account data directory permissions are unsafe.');
  const filename = path.join(canonicalDir, 'dxd.sqlite');
  if (realpathSync(filename) !== filename || (statSync(filename).mode & 0o077) !== 0) throw new Error('Local account database permissions are unsafe.');
  const connection = openDatabase(filename);
  try {
    const tableRows = connection.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const tables = new Set(tableRows.map(row => row.name));
    if (requiredTables.some(table => !tables.has(table))) throw new Error('Local account database schema is incomplete.');
    const seeds = connection.sqlite.prepare(`SELECT
      (SELECT count(*) FROM campaigns WHERE id='7841aa01-33f4-4a90-8d13-000000000001' AND name='Default Campaign' AND lifecycle='preparing' AND is_default=1 AND parent_campaign_id IS NULL) AS defaultCampaign,
      (SELECT count(*) FROM campaigns WHERE id='7841aa01-33f4-4a90-8d13-000000000002' AND name='Working Campaign' AND lifecycle='preparing' AND is_default=0 AND parent_campaign_id='7841aa01-33f4-4a90-8d13-000000000001') AS workingCampaign`).get() as { defaultCampaign: number; workingCampaign: number };
    if (seeds.defaultCampaign !== 1 || seeds.workingCampaign !== 1) throw new Error('Local account campaign seeds are incomplete.');
    const count = connection.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get() as { count: number };
    if (count.count !== migrationCount) throw new Error('Local account database migrations are outdated.');
    const requiredIndexes = ['auth_throttle_expiry', 'campaign_single_default', 'campaign_membership_campaign_user', 'campaign_create_idempotency', 'character_owner_create_idempotency', 'character_version_number', 'character_version_idempotency', 'character_version_history'];
    const indexes = new Set((connection.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>).map(row => row.name));
    if (requiredIndexes.some(name => !indexes.has(name))) throw new Error('Local account authorization indexes are incomplete.');
    const requiredTriggers = ['account_access_audit_insert', 'account_access_audit_update', 'account_access_no_delete', 'campaign_audit_insert', 'campaign_audit_update', 'campaign_no_delete', 'campaign_default_immutable', 'campaign_membership_audit_insert', 'campaign_membership_audit_update', 'campaign_membership_no_delete', 'campaign_parent_immutable', 'character_audit_insert', 'character_audit_update', 'character_version_pointer_monotonic', 'character_no_delete', 'character_version_audit_insert', 'character_version_no_update', 'character_version_no_delete'];
    const triggers = new Set((connection.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all() as Array<{ name: string }>).map(row => row.name));
    if (requiredTriggers.some(name => !triggers.has(name))) throw new Error('Local account authorization audit rules are incomplete.');
    const runtime = createLocalAccountHarness(connection, process.env.DXD_AUTH_BASE_URL ?? 'http://127.0.0.1:3000', secret);
    return { ...runtime, close: connection.close };
  } catch (error) {
    connection.close();
    throw error;
  }
}

export function getLocalAccountRuntime() {
  const root = globalThis as RuntimeGlobal;
  if (!root.__dxdLocalAccountRuntime) root.__dxdLocalAccountRuntime = createRuntime();
  return root.__dxdLocalAccountRuntime;
}
