import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function withProductionServer(storageMode, callback) {
  const port = await freePort();
  const baseURL = `http://127.0.0.1:${port}`;
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(port) };
  if (storageMode === undefined) delete env.DXD_STORAGE_MODE;
  else env.DXD_STORAGE_MODE = storageMode;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(), env, stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
  try {
    let ready = false;
    const deadline = Date.now() + 30_000;
    while (!ready && Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Production server exited (${child.exitCode}): ${stderr}`);
      try {
        const response = await fetch(`${baseURL}/api/character-files`, { signal: AbortSignal.timeout(1000) });
        ready = response.status === 503;
      } catch { await delay(150); }
    }
    assert.ok(ready, `Production server did not become ready: ${stderr}`);
    await callback(baseURL);
  } finally {
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}

const requests = [
  ['GET', '/api/character-files'],
  ['POST', '/api/character-files'],
  ['GET', '/api/character-files/test-character'],
  ['GET', '/api/character-files/test-character/versions'],
  ['GET', '/api/character-files/test-character/image/portrait.png'],
  ['PATCH', '/api/character-files/tags'],
  ['GET', '/api/auth/get-session'],
  ['POST', '/api/auth/sign-in/email'],
  ['GET', '/api/auth/campaigns'],
  ['POST', '/api/auth/campaigns'],
  ['POST', '/api/auth/campaigns/7841aa01-33f4-4a90-8d13-000000000003/invitations'],
  ['DELETE', '/api/auth/campaigns/7841aa01-33f4-4a90-8d13-000000000003/invitations/7841aa01-33f4-4a90-8d13-000000000004'],
  ['GET', '/api/auth/invitations/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
  ['POST', '/api/auth/invitations/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/accept'],
  ['GET', '/api/auth/admin/security-operations'],
  ['POST', '/api/auth/admin/security-operations/7841aa01-33f4-4a90-8d13-000000000005/review'],
  ['GET', '/api/auth/characters'],
  ['POST', '/api/auth/characters'],
  ['PUT', '/api/auth/characters/7841aa01-33f4-4a90-8d13-000000000006'],
];

for (const mode of ['accounts', 'legacy-local', 'unrecognized-mode', undefined]) {
  test(`production keeps filesystem and account routes closed with DXD_STORAGE_MODE=${mode ?? '(unset)'}`, async () => {
    await withProductionServer(mode, async baseURL => {
      for (const [method, route] of requests) {
        const response = await fetch(`${baseURL}${route}`, {
          method,
          headers: ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) ? { 'content-type': 'application/json' } : undefined,
          body: ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) ? '{' : undefined,
        });
        assert.equal(response.status, 503, `${method} ${route}`);
        assert.equal(response.headers.get('cache-control'), 'no-store', `${method} ${route}`);
        assert.deepEqual(await response.json(), route.startsWith('/api/auth/')
          ? { error: 'Account APIs are unavailable in this environment.' }
          : { error: 'Filesystem character storage is disabled in this storage mode.' }, `${method} ${route}`);
      }
    });
  });
}
