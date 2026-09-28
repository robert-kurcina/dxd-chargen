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

export const campaigns = sqliteTable('campaigns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  lifecycle: text('lifecycle', { enum: ['preparing', 'active', 'archived'] }).notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'restrict' }),
}, table => [
  uniqueIndex('campaign_single_default').on(table.isDefault).where(sql`${table.isDefault} = 1`),
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
