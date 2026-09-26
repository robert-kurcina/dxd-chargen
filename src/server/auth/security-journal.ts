import 'server-only';
import { randomUUID } from 'node:crypto';
import { securityOperation } from './operation-context';
import type { openDatabase } from '../db/connection';

const actions = new Set(['sign-up/email', 'sign-in/email', 'sign-in/username', 'sign-out', 'verify-email', 'send-verification-email', 'request-password-reset', 'reset-password', 'change-password', 'change-email', 'two-factor/enable', 'two-factor/disable', 'two-factor/verify-totp', 'two-factor/verify-backup-code']);

export function createSecurityJournal(connection: ReturnType<typeof openDatabase>) {
  const db = connection.sqlite;
  const append = (operationId: string, phase: string, action: string, actorId: string | null, status: number | null) => {
    db.prepare('INSERT INTO security_events (id, operation_id, phase, action, actor_id, occurred_at, response_status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), operationId, phase, action, actorId, Date.now(), status);
  };
  return {
    async run(request: Request, actor: string | null | (() => Promise<string | null>), handler: (request: Request) => Promise<Response>) {
      const route = new URL(request.url).pathname.replace(/^\/api\/auth\//, '');
      // Never persist arbitrary paths, query strings, bodies, cookies or error messages.
      const method = ['GET', 'POST'].includes(request.method) ? request.method : 'OTHER';
      const action = `${method} ${actions.has(route) ? route : 'unclassified'}`;
      let actorId = typeof actor === 'function' ? null : actor;
      const operationId = randomUUID();
      append(operationId, 'started', action, actorId, null); // Failure here prevents handler invocation.
      return securityOperation.run({ operationId, actorId }, async () => {
        let response: Response;
        try {
          if (typeof actor === 'function') actorId = await actor();
          securityOperation.getStore()!.actorId = actorId;
          response = await handler(request);
        }
        catch (error) { append(operationId, 'threw', action, actorId, null); throw error; }
        // Response status is not a claim that all credential mutations rolled back or committed.
        append(operationId, 'responded', action, actorId, response.status);
        return response;
      });
    },
    evidence(operationId: string) {
      return db.prepare('SELECT entity, entity_id, change, actor_id, occurred_at FROM security_changes WHERE operation_id = ? ORDER BY occurred_at, rowid').all(operationId);
    },
    unresolved() {
      return db.prepare("SELECT operation_id, action, actor_id, occurred_at FROM security_events s WHERE phase = 'started' AND NOT EXISTS (SELECT 1 FROM security_events e WHERE e.operation_id = s.operation_id AND e.phase IN ('responded', 'threw')) ORDER BY occurred_at").all();
    },
  };
}
