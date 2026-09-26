import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const { openDatabase, migrateDatabase } = await import('../src/server/db/connection.ts');
const { createLocalAccountHarness } = await import('../src/server/auth/local-harness.ts');

test('local account rate limits bound concurrent requests and journal rejections', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dxd-rate-limit-'));
  const db = openDatabase(path.join(root, 'db.sqlite'));
  try {
    migrateDatabase(db, path.resolve('migrations/auth'));
    const { handle, inbox } = createLocalAccountHarness(db, 'http://localhost:3000', randomUUID() + randomUUID());
    const request = (route, body) => handle(new Request('http://localhost:3000/api/auth/' + route, {
      method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify(body),
    }));
    const reset = await Promise.all(Array.from({ length: 6 }, (_, i) => request('request-password-reset', { email: `absent${i}@example.test` })));
    assert.equal(reset.filter(r => r.status === 200).length, 3);
    assert.equal(reset.filter(r => r.status === 429).length, 3);
    for (const response of reset.filter(r => r.status === 429)) {
      const retry = Number(response.headers.get('retry-after'));
      assert.ok(retry > 0 && retry <= 60);
    }
    assert.equal(inbox.pending().length, 0);
    const login = await Promise.all(Array.from({ length: 6 }, () => request('sign-in/email', { email: 'absent@example.test', password: 'wrong-password' })));
    assert.equal(login.filter(r => r.status === 401).length, 3);
    assert.equal(login.filter(r => r.status === 429).length, 3);
    assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM security_events WHERE response_status = 429').get().n, 6);
    assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM session').get().n, 0);
  } finally { db.close(); await rm(root, { recursive: true, force: true }); }
});
