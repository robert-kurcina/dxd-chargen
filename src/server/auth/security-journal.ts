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
    reviewCandidates({ minimumAgeMs = 300_000, limit = 100 } = {}) {
      if (!Number.isSafeInteger(minimumAgeMs) || minimumAgeMs < 1 ||
          !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
        throw new RangeError('Review age must be positive; limit must be between 1 and 1000.');
      }
      // A consistent read snapshot, not a claim that an older request has stopped running.
      return db.transaction(() => {
        const observedAt = Date.now();
        const candidates = db.prepare(`
          SELECT s.operation_id, s.action, s.actor_id, s.occurred_at,
                 e.phase AS completion_phase, e.response_status,
                 CASE WHEN e.phase IS NULL THEN 'missing-completion'
                      WHEN e.phase = 'threw' THEN 'exception'
                      ELSE 'error-response' END AS reason,
                 (SELECT COUNT(*) FROM security_changes c
                  WHERE c.operation_id = s.operation_id) AS recorded_changes
          FROM security_events s
          LEFT JOIN security_events e ON e.operation_id = s.operation_id
            AND e.phase IN ('responded', 'threw')
          WHERE s.phase = 'started' AND s.occurred_at <= ?
            AND (e.phase IS NULL OR e.phase = 'threw' OR e.response_status >= 400)
          ORDER BY s.occurred_at, s.rowid LIMIT ?
        `).all(observedAt - minimumAgeMs, limit + 1);
        return { observedAt, minimumAgeMs, hasMore: candidates.length > limit, candidates: candidates.slice(0, limit) };
      })();
    },
    unresolved() {
      return db.prepare("SELECT operation_id, action, actor_id, occurred_at FROM security_events s WHERE phase = 'started' AND NOT EXISTS (SELECT 1 FROM security_events e WHERE e.operation_id = s.operation_id AND e.phase IN ('responded', 'threw')) ORDER BY occurred_at").all();
    },
  };
}
