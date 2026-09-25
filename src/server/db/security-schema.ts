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
