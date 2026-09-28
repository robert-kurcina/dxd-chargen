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
];

for (const mode of ['accounts', 'legacy-local', 'unrecognized-mode', undefined]) {
  test(`production keeps every legacy character route closed with DXD_STORAGE_MODE=${mode ?? '(unset)'}`, async () => {
    await withProductionServer(mode, async baseURL => {
      for (const [method, route] of requests) {
        const response = await fetch(`${baseURL}${route}`, {
          method,
          headers: method === 'POST' || method === 'PATCH' ? { 'content-type': 'application/json' } : undefined,
          body: method === 'POST' || method === 'PATCH' ? '{' : undefined,
        });
        assert.equal(response.status, 503, `${method} ${route}`);
        assert.equal(response.headers.get('cache-control'), 'no-store', `${method} ${route}`);
        assert.deepEqual(await response.json(), { error: 'Filesystem character storage is disabled in this storage mode.' }, `${method} ${route}`);
      }
    });
  });
}
