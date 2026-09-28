import './test-typescript-loader.mjs';
import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';

const username = process.argv[2];
if (!username || process.argv.length !== 3) throw new Error('Usage: npm run accounts:bootstrap-admin:local -- <verified-username>');
if (process.env.NODE_ENV === 'production') throw new Error('Site Administrator bootstrap is local-development only.');
if (process.env.DXD_STORAGE_MODE !== 'accounts') throw new Error('Set DXD_STORAGE_MODE=accounts before bootstrapping.');
const dataDir = process.env.DXD_DATA_DIR;
if (!dataDir || !path.isAbsolute(dataDir)) throw new Error('Set DXD_DATA_DIR to an absolute local account directory.');
const secret = process.env.DXD_AUTH_SECRET;
if (!secret || secret.length < 32) throw new Error('Set DXD_AUTH_SECRET to a value of at least 32 characters.');
const canonicalDir = realpathSync(dataDir);
if ((statSync(canonicalDir).mode & 0o077) !== 0) throw new Error('DXD_DATA_DIR must be owner-only (mode 0700).');
const filename = path.join(canonicalDir, 'dxd.sqlite');
if (realpathSync(filename) !== filename || (statSync(filename).mode & 0o077) !== 0) throw new Error('The local database must be an owner-only regular file.');
const { openDatabase } = await import('../src/server/db/connection.ts');
const { bootstrapVerifiedUsername } = await import('../src/server/auth/site-admin.ts');
const connection = openDatabase(filename);
try {
  const tables = new Set(connection.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name));
  if (!tables.has('site_administrators')) throw new Error('Site Administrator schema is missing. Run npm run db:migrate:local first.');
  const migrations = connection.sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get().n;
  if (migrations !== 14) throw new Error(`Expected 14 reviewed migrations; found ${migrations}. Run npm run db:migrate:local.`);
  const result = bootstrapVerifiedUsername(connection, username);
  console.log(JSON.stringify({ bootstrapped: true, ...result }));
} finally { connection.close(); }
