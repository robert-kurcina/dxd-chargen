import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
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
export const securityReviewDecisions = sqliteTable('security_review_decisions', {
  id: text('id').primaryKey(),
  sourceOperationId: text('source_operation_id').notNull(),
  reviewOperationId: text('review_operation_id').notNull(),
  reviewerId: text('reviewer_id').notNull(),
  disposition: text('disposition', { enum: ['reviewed-no-automatic-retry', 'follow-up-required'] }).notNull(),
  reasonCode: text('reason_code', { enum: ['change-evidence-recorded', 'no-change-evidence-recorded', 'outcome-uncertain'] }).notNull(),
  occurredAt: integer('occurred_at').notNull(),
}, table => [uniqueIndex('security_review_request').on(table.reviewOperationId), index('security_review_source').on(table.sourceOperationId, table.occurredAt)]);
