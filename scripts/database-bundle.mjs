import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const fixture = await mkdtemp(path.join(root, '.db-bundle-'));
try {
  await mkdir(path.join(fixture, 'app/probe'), { recursive: true });
  await writeFile(path.join(fixture, 'package.json'), JSON.stringify({ private: true }));
  await writeFile(path.join(fixture, 'next.config.mjs'), `export default { turbopack: { root: ${JSON.stringify(root)} }, distDir: '.next' };`);
  await writeFile(path.join(fixture, 'app/layout.tsx'), 'export default function Layout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }');
  await writeFile(path.join(fixture, 'app/probe/route.ts'), `
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { username, twoFactor } from 'better-auth/plugins';
import { openDatabase, migrateDatabase } from '../../../src/server/db/connection';
import * as schema from '../../../src/server/db/auth-schema';
export const runtime = 'nodejs';
export const dynamic = 'force-static';
export async function GET() {
  const directory = await mkdtemp(path.join(tmpdir(), 'dxd-bundle-db-'));
  const db = openDatabase(path.join(directory, 'probe.sqlite'));
  try {
    migrateDatabase(db, ${JSON.stringify(path.join(root, 'migrations/auth'))});
    const auth = betterAuth({ secret: 'build-probe-only-never-a-live-credential-00000000', baseURL: 'http://localhost:3000', database: drizzleAdapter(db.db, { provider: 'sqlite', schema }), plugins: [username(), twoFactor()] });
    await auth.$context;
    return Response.json({ sqlite: db.sqlite.prepare('select sqlite_version() as version').get(), authReady: true });
  } finally { db.close(); await rm(directory, { recursive: true, force: true }); }
}
`);
  const result = await promisify(execFile)(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build', fixture], { cwd: root, maxBuffer: 5 * 1024 * 1024 });
  const { readFile } = await import('node:fs/promises');
  const body = JSON.parse(await readFile(path.join(fixture, '.next/server/app/probe.body'), 'utf8'));
  assert.equal(body.authReady, true); assert.ok(body.sqlite.version);
  console.log(`PASS production Next bundle executes native SQLite migrations and auth adapter (SQLite ${body.sqlite.version})`);
} catch (error) { console.error(error.stdout || '', error.stderr || ''); throw error; }
finally { await rm(fixture, { recursive: true, force: true }); }
