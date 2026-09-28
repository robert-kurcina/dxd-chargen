import { user } from './auth-schema';
import { sqliteTable, text, integer, uniqueIndex, index, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const securityEvents = sqliteTable('security_events', {
  id: text('id').primaryKey(),
  operationId: text('operation_id').notNull(),
  phase: text('phase', { enum: ['started', 'responded', 'threw'] }).notNull(),
  action: text('action').notNull(),
  actorId: text('actor_id'),
  occurredAt: integer('occurred_at').notNull(),
  responseStatus: integer('response_status'),
}, table => [uniqueIndex('security_operation_phase').on(table.operationId, table.phase)]);

// Written by auth-table triggers in the same SQLite transaction as each change.
export const securityChanges = sqliteTable('security_changes', {
  id: text('id').primaryKey(),
  operationId: text('operation_id'),
  actorId: text('actor_id'),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  change: text('change').notNull(),
  occurredAt: integer('occurred_at').notNull(),
});

export const consumedTotp = sqliteTable('consumed_totp', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  fingerprint: text('fingerprint').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, table => [uniqueIndex('consumed_totp_user_code').on(table.userId, table.fingerprint)]);


// Operational counters, separate from immutable security evidence.
export const authThrottle = sqliteTable('auth_throttle', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, table => [index('auth_throttle_expiry').on(table.expiresAt)]);


// Human review metadata; never claims the underlying credential operation succeeded.
export const siteAdministrators = sqliteTable('site_administrators', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'restrict' }),
  grantedAt: integer('granted_at').notNull(),
  bootstrapOperationId: text('bootstrap_operation_id').notNull().unique(),
});

export const securityReviewDecisions = sqliteTable('security_review_decisions', {
  id: text('id').primaryKey(),
  sourceOperationId: text('source_operation_id').notNull(),
  reviewOperationId: text('review_operation_id').notNull(),
  reviewerId: text('reviewer_id').notNull(),
  disposition: text('disposition', { enum: ['reviewed-no-automatic-retry', 'follow-up-required'] }).notNull(),
  reasonCode: text('reason_code', { enum: ['change-evidence-recorded', 'no-change-evidence-recorded', 'outcome-uncertain'] }).notNull(),
  occurredAt: integer('occurred_at').notNull(),
}, table => [uniqueIndex('security_review_request').on(table.reviewOperationId), index('security_review_source').on(table.sourceOperationId, table.occurredAt)]);

export const accountAccess = sqliteTable('account_access', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'restrict' }),
  status: text('status', { enum: ['active', 'disabled', 'banned'] }).notNull().default('active'),
  changedAt: integer('changed_at').notNull(),
  changedBy: text('changed_by').references(() => user.id, { onDelete: 'restrict' }),
}, table => [check('account_access_status_valid', sql`${table.status} IN ('active', 'disabled', 'banned')`)]);

import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const campaigns = sqliteTable('campaigns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  lifecycle: text('lifecycle', { enum: ['preparing', 'active', 'archived'] }).notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  parentCampaignId: text('parent_campaign_id').references((): AnySQLiteColumn => campaigns.id, { onDelete: 'restrict' }),
  createIdempotencyKey: text('create_idempotency_key'),
  createdAt: integer('created_at').notNull(),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'restrict' }),
}, table => [
  uniqueIndex('campaign_single_default').on(table.isDefault).where(sql`${table.isDefault} = 1`),
  uniqueIndex('campaign_create_idempotency').on(table.createdBy, table.createIdempotencyKey).where(sql`${table.createIdempotencyKey} IS NOT NULL`),
  check('campaign_lifecycle_valid', sql`${table.lifecycle} IN ('preparing', 'active', 'archived')`),
]);

export const campaignMemberships = sqliteTable('campaign_memberships', {
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'restrict' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  role: text('role', { enum: ['player', 'gm', 'campaign-administrator'] }).notNull(),
  state: text('state', { enum: ['active', 'banned', 'removed'] }).notNull(),
  invitedByUserId: text('invited_by_user_id').references(() => user.id, { onDelete: 'restrict' }),
  joinedAt: integer('joined_at').notNull(),
}, table => [
  uniqueIndex('campaign_membership_campaign_user').on(table.campaignId, table.userId),
  check('campaign_membership_role_valid', sql`${table.role} IN ('player', 'gm', 'campaign-administrator')`),
  check('campaign_membership_state_valid', sql`${table.state} IN ('active', 'banned', 'removed')`),
]);

export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  campaignId: text('campaign_id').references(() => campaigns.id, { onDelete: 'restrict' }),
  isPrivate: integer('is_private', { mode: 'boolean' }).notNull().default(false),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  currentVersion: integer('current_version').notNull(),
  createIdempotencyKey: text('create_idempotency_key').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [
  uniqueIndex('character_owner_create_idempotency').on(table.ownerId, table.createIdempotencyKey),
  check('character_current_version_positive', sql`${table.currentVersion} > 0`),
]);

export const characterVersions = sqliteTable('character_versions', {
  id: text('id').primaryKey(),
  characterId: text('character_id').notNull().references(() => characters.id, { onDelete: 'restrict' }),
  version: integer('version').notNull(),
  draftJson: text('draft_json').notNull(),
  schemaVersion: integer('schema_version').notNull(),
  editedBy: text('edited_by').notNull().references(() => user.id, { onDelete: 'restrict' }),
  idempotencyKey: text('idempotency_key').notNull(),
  createdAt: integer('created_at').notNull(),
}, table => [
  uniqueIndex('character_version_number').on(table.characterId, table.version),
  uniqueIndex('character_version_idempotency').on(table.characterId, table.idempotencyKey),
  index('character_version_history').on(table.characterId, table.createdAt),
  check('character_version_number_positive', sql`${table.version} > 0`),
  check('character_version_schema_valid', sql`${table.schemaVersion} BETWEEN 1 AND 11`),
  check('character_version_json_valid', sql`json_valid(${table.draftJson})`),
]);


export const campaignInvitations = sqliteTable('campaign_invitations', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'restrict' }),
  tokenHash: text('token_hash').notNull().unique(),
  role: text('role', { enum: ['player', 'gm', 'campaign-administrator'] }).notNull(),
  expiresAt: integer('expires_at').notNull(),
  maxUses: integer('max_uses').notNull(),
  uses: integer('uses').notNull().default(0),
  createdBy: text('created_by').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: integer('created_at').notNull(),
  revokedAt: integer('revoked_at'),
}, table => [
  index('campaign_invitation_active').on(table.campaignId, table.expiresAt, table.revokedAt),
  check('campaign_invitation_role_valid', sql`${table.role} IN ('player', 'gm', 'campaign-administrator')`),
  check('campaign_invitation_use_limit', sql`${table.maxUses} BETWEEN 1 AND 100 AND ${table.uses} BETWEEN 0 AND ${table.maxUses}`),
]);

export const campaignInvitationJoins = sqliteTable('campaign_invitation_joins', {
  id: text('id').primaryKey(),
  invitationId: text('invitation_id').notNull().references(() => campaignInvitations.id, { onDelete: 'restrict' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  joinedAt: integer('joined_at').notNull(),
}, table => [
  uniqueIndex('campaign_invitation_join_user').on(table.invitationId, table.userId),
]);
