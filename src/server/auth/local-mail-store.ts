import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import type { openDatabase } from '../db/connection';
export type LocalAccountMail = { kind: 'verify-email' | 'reset-password'; to: string; url: string };

// Local inbox only: explicit acknowledgement, no network delivery or public reader.
export function createLocalMailStore(connection: ReturnType<typeof openDatabase>, secret: string) {
  if (secret.length < 32) throw new Error('A high-entropy mail encryption secret is required.');
  const key = createHash('sha256').update('dxd-local-auth-mail-v1\0').update(secret).digest();
  const db = connection.sqlite;
  const decrypt = (row: { id: string; encrypted_payload: string }) => {
    const bytes = Buffer.from(row.encrypted_payload, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(row.id)); decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')) as LocalAccountMail;
  };
  return {
    enqueue(mail: LocalAccountMail) {
      const id = randomUUID(), iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(id));
      const body = Buffer.concat([cipher.update(JSON.stringify(mail), 'utf8'), cipher.final()]);
      const encrypted = Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
      const now = Date.now();
      db.prepare('INSERT INTO auth_mail (id, encrypted_payload, created_at, expires_at) VALUES (?, ?, ?, ?)').run(id, encrypted, now, now + 3600000);
      return id;
    },
    pending() {
      const rows = db.prepare('SELECT id, encrypted_payload FROM auth_mail WHERE expires_at > ? ORDER BY created_at, rowid').all(Date.now()) as Array<{ id: string; encrypted_payload: string }>;
      return rows.map(row => ({ id: row.id, mail: decrypt(row) }));
    },
    // Claim and decrypt atomically. A wrong key rolls back the lease and attempt count.
    claim(leaseMs = 60_000) {
      if (!Number.isSafeInteger(leaseMs) || leaseMs < 1 || leaseMs > 300_000) throw new RangeError('Lease must be between 1 and 300000 ms.');
      return db.transaction(() => {
        const now = Date.now(), token = randomUUID();
        const row = db.prepare(`UPDATE auth_mail SET lease_token = ?, lease_until = ?, attempts = attempts + 1
          WHERE id = (SELECT id FROM auth_mail WHERE expires_at > ? AND available_at <= ? AND lease_until <= ?
            ORDER BY created_at, rowid LIMIT 1)
          RETURNING id, encrypted_payload, attempts`).get(token, now + leaseMs, now, now, now) as
          { id: string; encrypted_payload: string; attempts: number } | undefined;
        return row ? { id: row.id, token, attempts: row.attempts, mail: decrypt(row) } : null;
      })();
    },
    complete(id: string, token: string) {
      return db.prepare('DELETE FROM auth_mail WHERE id = ? AND lease_token = ? AND lease_until > ?').run(id, token, Date.now()).changes === 1;
    },
    retry(id: string, token: string, delayMs = 30_000) {
      if (!Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > 3_600_000) throw new RangeError('Retry delay must be between 0 and 3600000 ms.');
      const now = Date.now();
      return db.prepare('UPDATE auth_mail SET lease_token = NULL, lease_until = 0, available_at = ? WHERE id = ? AND lease_token = ? AND lease_until > ?')
        .run(now + delayMs, id, token, now).changes === 1;
    },
    // Harness-only inspection/drain helpers; delivery workers must use token-bound methods.
    acknowledge(id: string) { db.prepare('DELETE FROM auth_mail WHERE id = ?').run(id); },
    clear() { db.prepare('DELETE FROM auth_mail').run(); },
    removeExpired() { db.prepare('DELETE FROM auth_mail WHERE expires_at <= ?').run(Date.now()); },
  };
}
