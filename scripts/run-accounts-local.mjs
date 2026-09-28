import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const port = process.env.PORT ?? '3000';
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('PORT must be a valid TCP port.');
const env = {
  ...process.env,
  DXD_STORAGE_MODE: 'accounts',
  DXD_AUTH_BASE_URL: process.env.DXD_AUTH_BASE_URL ?? `http://127.0.0.1:${port}`,
};
const preflight = spawnSync(npmCommand, ['run', 'accounts:check:local'], { cwd: projectRoot, env, stdio: 'inherit' });
if (preflight.error) throw preflight.error;
if (preflight.status !== 0) process.exit(preflight.status ?? 1);
const result = spawnSync(npmCommand, ['run', 'dev', '--', '--hostname', '127.0.0.1'], { cwd: projectRoot, env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
