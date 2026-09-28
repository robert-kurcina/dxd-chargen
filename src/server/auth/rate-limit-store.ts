import 'server-only';
import { createHmac } from 'node:crypto';
import type { openDatabase } from '../db/connection';

export function createRateLimitStore(connection: ReturnType<typeof openDatabase>, secret: string, clock = Date.now) {
  if (secret.length < 32) throw new Error('A rate-limit key secret is required.');
  const db = connection.sqlite;
  return {
    removeExpired(limit = 1000) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000) throw new RangeError('Cleanup limit must be between 1 and 10000.');
      const now = clock();
      if (!Number.isSafeInteger(now) || now < 0) throw new RangeError('Invalid rate-limit clock.');
      return db.prepare('DELETE FROM auth_throttle WHERE key IN (SELECT key FROM auth_throttle WHERE expires_at <= ? LIMIT ?)').run(now, limit).changes;
    },
    async consume(key: string, rule: { window: number; max: number }) {
      if (!Number.isSafeInteger(rule.window) || rule.window < 1 || rule.window > 86400 ||
          !Number.isSafeInteger(rule.max) || rule.max < 1) throw new RangeError('Invalid rate-limit rule.');
      // Include the window to avoid interpreting old counters under a different policy.
      const fingerprint = createHmac('sha256', secret).update('dxd-rate-limit-v1\0').update(`${rule.window}\0${key}`).digest('hex');
      return db.transaction(() => {
        const now = clock();
        if (!Number.isSafeInteger(now) || now < 0) throw new RangeError('Invalid rate-limit clock.');
        const row = db.prepare('SELECT count, expires_at FROM auth_throttle WHERE key = ?').get(fingerprint) as
          { count: number; expires_at: number } | undefined;
        if (row && row.expires_at > now && row.count >= rule.max) {
          return { allowed: false, retryAfter: Math.ceil((row.expires_at - now) / 1000) };
        }
        const count = row && row.expires_at > now ? row.count + 1 : 1;
        db.prepare('INSERT INTO auth_throttle (key, count, expires_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET count = excluded.count, expires_at = excluded.expires_at')
          .run(fingerprint, count, now + rule.window * 1000);
        return { allowed: true, retryAfter: null };
      }).immediate();
    },
  };
}
