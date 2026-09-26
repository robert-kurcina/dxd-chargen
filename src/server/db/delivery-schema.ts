import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Local harness queue; encrypted payloads contain verification/reset links.
export const authMail = sqliteTable('auth_mail', {
  id: text('id').primaryKey(),
  encryptedPayload: text('encrypted_payload').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  leaseToken: text('lease_token'),
  leaseUntil: integer('lease_until').notNull().default(0),
  attempts: integer('attempts').notNull().default(0),
  availableAt: integer('available_at').notNull().default(0),
});
