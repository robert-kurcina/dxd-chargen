import 'server-only';
import { randomUUID } from 'node:crypto';
import type { openDatabase } from '../db/connection';

const BOOTSTRAP_ACTION = 'LOCAL bootstrap-site-administrator';

export function bootstrapVerifiedUsername(connection: ReturnType<typeof openDatabase>, username: string) {
  const requested = username.trim();
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(requested)) throw new Error('Provide a valid account username.');
  const db = connection.sqlite;
  return db.transaction(() => {
    if (db.prepare('SELECT 1 FROM site_administrators LIMIT 1').get()) throw new Error('A Site Administrator is already bootstrapped.');
    const account = db.prepare('SELECT id, username, email_verified FROM user WHERE username = ? COLLATE NOCASE').get(requested) as
      { id: string; username: string; email_verified: number } | undefined;
    if (!account) throw new Error('No account matches that username.');
    if (!account.email_verified) throw new Error('The account email must be verified before it can be bootstrapped.');
    const operationId = randomUUID(), now = Date.now();
    db.prepare('INSERT INTO security_events (id, operation_id, phase, action, actor_id, occurred_at, response_status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), operationId, 'started', BOOTSTRAP_ACTION, null, now, null);
    db.prepare('INSERT INTO site_administrators (user_id, granted_at, bootstrap_operation_id) VALUES (?, ?, ?)')
      .run(account.id, now, operationId);
    db.prepare('INSERT INTO security_changes (id, operation_id, actor_id, entity, entity_id, change, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), operationId, null, 'site_administrator', account.id, 'initial-bootstrap-grant', now);
    db.prepare('INSERT INTO security_events (id, operation_id, phase, action, actor_id, occurred_at, response_status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), operationId, 'responded', BOOTSTRAP_ACTION, null, now, 200);
    return { username: account.username, userId: account.id, grantedAt: now, operationId };
  }).immediate();
}
