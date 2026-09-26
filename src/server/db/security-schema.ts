import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
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
