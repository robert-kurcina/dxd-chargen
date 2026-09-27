import Database from 'better-sqlite3';
import { existsSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

const dataDir = process.env.DXD_DATA_DIR;
if (!dataDir || !path.isAbsolute(dataDir)) throw new Error('Set DXD_DATA_DIR to an existing absolute local data directory.');
const realDataDir = realpathSync(dataDir);
if (!statSync(realDataDir).isDirectory()) throw new Error('DXD_DATA_DIR must name a directory.');
const databasePath = path.join(realDataDir, 'dxd.sqlite');
if (!existsSync(databasePath) || realpathSync(databasePath) !== databasePath || !statSync(databasePath).isFile()) {
  throw new Error('Expected an existing, non-symlink dxd.sqlite inside DXD_DATA_DIR; refusing to create a database.');
}
const limit = Number(process.env.DXD_MAINTENANCE_BATCH_SIZE ?? 1000);
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000) throw new Error('DXD_MAINTENANCE_BATCH_SIZE must be an integer from 1 to 10000.');

const db = new Database(databasePath, { fileMustExist: true });
try {
  db.pragma('busy_timeout = 5000');
  const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name));
  for (const table of ['auth_throttle', 'auth_mail']) {
    if (!tables.has(table)) throw new Error(`Required local account table is missing: ${table}. Apply reviewed migrations first.`);
  }
  const index = db.prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'index' AND name = 'auth_throttle_expiry'").get();
  if (!index) throw new Error('Required auth_throttle_expiry index is missing. Apply reviewed migrations first.');
  const now = Date.now();
  const result = db.transaction(() => {
    const throttle = db.prepare(`DELETE FROM auth_throttle WHERE key IN
      (SELECT key FROM auth_throttle WHERE expires_at <= ? ORDER BY expires_at LIMIT ?)`).run(now, limit).changes;
    const mail = db.prepare(`DELETE FROM auth_mail WHERE id IN
      (SELECT id FROM auth_mail WHERE expires_at <= ? ORDER BY expires_at LIMIT ?)`).run(now, limit).changes;
    return { throttle, mail };
  }).immediate();
  console.log(JSON.stringify({ completedAt: new Date(now).toISOString(), deletedThrottleCounters: result.throttle, deletedExpiredMail: result.mail, batchSize: limit }));
} finally {
  db.close();
}
