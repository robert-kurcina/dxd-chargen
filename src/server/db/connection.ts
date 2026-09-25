import 'server-only';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './auth-schema';

// Explicit opt-in only: importing this module never opens or migrates a database.
export function openDatabase(filename: string) {
  if (!path.isAbsolute(filename)) throw new Error('An absolute database filename is required.');
  const sqlite = new Database(filename);
  try {
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('busy_timeout = 5000');
    const db = drizzle(sqlite, { schema });
    return { sqlite, db, close: () => sqlite.close() };
  } catch (error) { sqlite.close(); throw error; }
}

export function migrateDatabase(connection: ReturnType<typeof openDatabase>, migrationsFolder: string) {
  // The caller supplies a reviewed migration directory; never run on a web request.
  migrate(connection.db, { migrationsFolder });
}
