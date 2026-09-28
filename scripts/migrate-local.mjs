import Database from 'better-sqlite3';
import { chmod, mkdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const configuredDir = process.env.DXD_DATA_DIR;
if (!configuredDir || !path.isAbsolute(configuredDir)) {
  throw new Error('Set DXD_DATA_DIR to an absolute local data directory outside public assets.');
}
const configuredPath = path.resolve(configuredDir);
await mkdir(configuredPath, { recursive: true, mode: 0o700 });
const dataDir = await realpath(configuredPath);
const directoryInfo = await stat(dataDir);
if (!directoryInfo.isDirectory() || (directoryInfo.mode & 0o077) !== 0) {
  throw new Error('DXD_DATA_DIR must be a directory accessible only to its owner (mode 0700).');
}
const filename = path.join(dataDir, 'dxd.sqlite');
const migrationsFolder = fileURLToPath(new URL('../migrations/auth', import.meta.url));
const db = new Database(filename);
try {
  // Migration-time campaign seeds run through the same database audit triggers.
  db.function('dxd_event_id', () => randomUUID());
  db.function('dxd_operation_id', () => null);
  db.function('dxd_actor_id', () => null);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  await chmod(filename, 0o600);
  const before = db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'").get().count;
  migrate(drizzle(db), { migrationsFolder });
  const applied = db.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get().count;
  console.log(JSON.stringify({ database: filename, appliedMigrations: applied, initialized: before === 0 }));
} finally {
  db.close();
}
