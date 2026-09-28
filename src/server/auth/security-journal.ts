import 'server-only';
import { randomUUID } from 'node:crypto';
import { securityOperation } from './operation-context';
import type { openDatabase } from '../db/connection';

const actions = new Set(['admin/security-operations', 'admin/security-operation-review', 'sign-up/email', 'sign-in/email', 'sign-in/username', 'sign-out', 'verify-email', 'send-verification-email', 'request-password-reset', 'reset-password', 'change-password', 'change-email', 'two-factor/enable', 'two-factor/disable', 'two-factor/verify-totp', 'two-factor/verify-backup-code', 'review-security-operation', 'campaigns', 'campaign-fork', 'campaign-invitations', 'campaign-invitation-create', 'campaign-invitation-revoke', 'campaign-invitation-preview', 'campaign-invitation-accept', 'characters', 'character-create', 'character-read', 'character-history', 'character-update']);

export function createSecurityJournal(connection: ReturnType<typeof openDatabase>) {
  const db = connection.sqlite;
  const append = (operationId: string, phase: string, action: string, actorId: string | null, status: number | null) => {
    db.prepare('INSERT INTO security_events (id, operation_id, phase, action, actor_id, occurred_at, response_status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), operationId, phase, action, actorId, Date.now(), status);
  };
  return {
    async run(request: Request, actor: string | null | (() => Promise<string | null>), handler: (request: Request) => Promise<Response>) {
      const route = new URL(request.url).pathname.replace(/^\/api\/auth\//, '');
      // Never persist arbitrary paths, query strings, bodies, cookies or error messages.
      const method = ['GET', 'POST', 'PUT', 'DELETE'].includes(request.method) ? request.method : 'OTHER';
      const campaignInviteRoute = route.match(/^campaigns\/[0-9a-f-]{36}\/invitations(?:\/[0-9a-f-]{36})?$/i);
      const publicInviteRoute = route.match(/^invitations\/[A-Za-z0-9_-]{43}(?:\/accept)?$/);
      const campaignRoute = route === 'campaigns' && request.method === 'POST' ? 'campaign-fork'
        : campaignInviteRoute ? (route.endsWith('/invitations') && request.method === 'GET' ? 'campaign-invitations' : route.endsWith('/invitations') && request.method === 'POST' ? 'campaign-invitation-create' : route.includes('/invitations/') && request.method === 'DELETE' ? 'campaign-invitation-revoke' : 'unclassified')
        : publicInviteRoute ? (route.endsWith('/accept') && request.method === 'POST' ? 'campaign-invitation-accept' : !route.endsWith('/accept') && request.method === 'GET' ? 'campaign-invitation-preview' : 'unclassified') : route;
      const characterMatch = route.match(/^characters(?:\/([0-9a-f-]{36})(?:\/versions(?:\/\d+)?)?)?$/i);
      const journalRoute = /^admin\/security-operations\/[0-9a-f-]{36}\/review$/i.test(route) ? 'admin/security-operation-review'
        : campaignRoute !== route ? campaignRoute : characterMatch ? (request.method === 'POST' && route === 'characters' ? 'character-create' : request.method === 'PUT' && characterMatch[1] && !route.includes('/versions') ? 'character-update' : request.method === 'GET' && route.endsWith('/versions') ? 'character-history' : request.method === 'GET' && characterMatch[1] ? 'character-read' : request.method === 'GET' && route === 'characters' ? 'characters' : 'unclassified') : route;
      const action = method + ' ' + (actions.has(journalRoute) ? journalRoute : 'unclassified');
      let actorId = typeof actor === 'function' ? null : actor;
      const operationId = randomUUID();
      append(operationId, 'started', action, actorId, null); // Failure here prevents handler invocation.
      return securityOperation.run({ operationId, action, actorId }, async () => {
        let response: Response;
        try {
          if (typeof actor === 'function') actorId = await actor();
          securityOperation.getStore()!.actorId = actorId;
          response = await handler(request);
        }
        catch (error) { actorId = securityOperation.getStore()?.actorId ?? actorId; append(operationId, 'threw', action, actorId, null); throw error; }
        actorId = securityOperation.getStore()?.actorId ?? actorId;
        // Response status is not a claim that all credential mutations rolled back or committed.
        append(operationId, 'responded', action, actorId, response.status);
        return response;
      });
    },
    isSiteAdministrator(userId: string | null) {
      if (!userId) return false;
      return Boolean(db.prepare('SELECT 1 FROM site_administrators WHERE user_id = ?').get(userId));
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
                  WHERE c.operation_id = s.operation_id) AS recorded_changes,
                 (SELECT d.disposition FROM security_review_decisions d
                  WHERE d.source_operation_id = s.operation_id
                  ORDER BY d.occurred_at DESC, d.rowid DESC LIMIT 1) AS latest_review_disposition,
                 (SELECT d.reason_code FROM security_review_decisions d
                  WHERE d.source_operation_id = s.operation_id
                  ORDER BY d.occurred_at DESC, d.rowid DESC LIMIT 1) AS latest_review_reason_code,
                 (SELECT d.reviewer_id FROM security_review_decisions d
                  WHERE d.source_operation_id = s.operation_id
                  ORDER BY d.occurred_at DESC, d.rowid DESC LIMIT 1) AS latest_reviewer_id,
                 (SELECT d.occurred_at FROM security_review_decisions d
                  WHERE d.source_operation_id = s.operation_id
                  ORDER BY d.occurred_at DESC, d.rowid DESC LIMIT 1) AS latest_review_at
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
    recordReviewDecision(sourceOperationId: string, disposition: 'reviewed-no-automatic-retry' | 'follow-up-required') {
      const context = securityOperation.getStore();
      // This narrow self-service journal primitive requires the authenticated actor
      // resolved by run() and a dedicated review action. It does not grant staff scope.
      if (!context?.actorId || context.action !== 'POST review-security-operation') throw new Error('An authenticated review operation is required.');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceOperationId)) throw new Error('Invalid operation identifier.');
      if (!['reviewed-no-automatic-retry', 'follow-up-required'].includes(disposition)) throw new Error('Invalid review disposition.');
      return db.transaction(() => {
        const now = Date.now();
        const source = db.prepare(`SELECT s.actor_id, s.occurred_at,
          NOT EXISTS (SELECT 1 FROM security_events e WHERE e.operation_id=s.operation_id
            AND e.phase IN ('responded','threw')) OR EXISTS (SELECT 1 FROM security_events e WHERE e.operation_id=s.operation_id
            AND e.phase='responded' AND e.response_status >= 400) AS failed,
          (SELECT COUNT(*) FROM security_changes c WHERE c.operation_id=s.operation_id) AS changes
          FROM security_events s WHERE s.operation_id=? AND s.phase='started'`).get(sourceOperationId) as
          { actor_id: string | null; occurred_at: number; failed: number; changes: number } | undefined;
        if (!source || !source.actor_id || source.actor_id !== context.actorId || !source.failed || source.occurred_at > now - 300_000) {
          throw new Error('Operation is not an eligible self-review candidate.');
        }
        const reasonCode = source.changes > 0 ? 'change-evidence-recorded' : 'no-change-evidence-recorded';
        db.prepare(`INSERT INTO security_review_decisions
          (id, source_operation_id, review_operation_id, reviewer_id, disposition, reason_code, occurred_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), sourceOperationId, context.operationId, context.actorId, disposition, reasonCode, now);
        return { sourceOperationId, disposition, reasonCode, reviewerId: context.actorId, reviewedAt: now };
      })();
    },
    recordStaffReviewDecision(sourceOperationId: string, disposition: 'reviewed-no-automatic-retry' | 'follow-up-required') {
      const context = securityOperation.getStore();
      if (!context?.actorId || context.action !== 'POST admin/security-operation-review' ||
          !db.prepare('SELECT 1 FROM site_administrators WHERE user_id = ?').get(context.actorId)) {
        throw new Error('An authenticated Site Administrator review is required.');
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceOperationId)) throw new Error('Invalid operation identifier.');
      if (!['reviewed-no-automatic-retry', 'follow-up-required'].includes(disposition)) throw new Error('Invalid review disposition.');
      return db.transaction(() => {
        const now = Date.now();
        const source = db.prepare("SELECT s.occurred_at, NOT EXISTS (SELECT 1 FROM security_events e WHERE e.operation_id=s.operation_id AND e.phase IN ('responded','threw')) OR EXISTS (SELECT 1 FROM security_events e WHERE e.operation_id=s.operation_id AND e.phase='threw') OR EXISTS (SELECT 1 FROM security_events e WHERE e.operation_id=s.operation_id AND e.phase='responded' AND e.response_status >= 400) AS failed, (SELECT COUNT(*) FROM security_changes c WHERE c.operation_id=s.operation_id) AS changes FROM security_events s WHERE s.operation_id=? AND s.phase='started'").get(sourceOperationId) as
          { occurred_at: number; failed: number; changes: number } | undefined;
        if (!source || !source.failed || source.occurred_at > now - 300_000) throw new Error('Operation is not an eligible review candidate.');
        const reasonCode = source.changes > 0 ? 'change-evidence-recorded' : 'no-change-evidence-recorded';
        db.prepare('INSERT INTO security_review_decisions (id, source_operation_id, review_operation_id, reviewer_id, disposition, reason_code, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(randomUUID(), sourceOperationId, context.operationId, context.actorId, disposition, reasonCode, now);
        return { sourceOperationId, disposition, reasonCode, reviewerId: context.actorId, reviewedAt: now };
      })();
    },
    unresolved() {
      return db.prepare("SELECT operation_id, action, actor_id, occurred_at FROM security_events s WHERE phase = 'started' AND NOT EXISTS (SELECT 1 FROM security_events e WHERE e.operation_id = s.operation_id AND e.phase IN ('responded', 'threw')) ORDER BY occurred_at").all();
    },
  };
}
