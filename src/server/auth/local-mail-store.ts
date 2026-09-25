import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import type { openDatabase } from '../db/connection';
export type LocalAccountMail = { kind: 'verify-email' | 'reset-password'; to: string; url: string };

// Local inbox only: explicit acknowledgement, no network delivery or public reader.
export function createLocalMailStore(connection: ReturnType<typeof openDatabase>, secret: string) {
  if (secret.length < 32) throw new Error('A high-entropy mail encryption secret is required.');
  const key = createHash('sha256').update('dxd-local-auth-mail-v1\0').update(secret).digest();
  const db = connection.sqlite;
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
      return rows.map(row => {
        const bytes = Buffer.from(row.encrypted_payload, 'base64');
        const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
        decipher.setAAD(Buffer.from(row.id)); decipher.setAuthTag(bytes.subarray(12, 28));
        const mail = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')) as LocalAccountMail;
        return { id: row.id, mail };
      });
    },
    acknowledge(id: string) { db.prepare('DELETE FROM auth_mail WHERE id = ?').run(id); },
    clear() { db.prepare('DELETE FROM auth_mail').run(); },
    removeExpired() { db.prepare('DELETE FROM auth_mail WHERE expires_at <= ?').run(Date.now()); },
  };
}
