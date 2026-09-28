import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, chmod, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const projectCache = path.resolve('.cache');
const tempRoot = path.join(projectCache, 'tmp');
await mkdir(tempRoot, { recursive: true });
process.env.TMPDIR ??= tempRoot;
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(projectCache, 'ms-playwright');
const { chromium } = await import(process.env.DXD_PLAYWRIGHT_MODULE || 'playwright');
await import('./test-typescript-loader.mjs');
const { openDatabase } = await import('../src/server/db/connection.ts');
const { createLocalMailStore } = await import('../src/server/auth/local-mail-store.ts');

const dataDir = path.join(projectCache, `live-recovery-${process.pid}-${randomUUID().slice(0, 8)}`);
const databaseFile = path.join(dataDir, 'dxd.sqlite');
const secret = randomBytes(48).toString('base64url');
const username = `recover${randomUUID().slice(0, 8)}`;
const email = `${username}@example.test`;
const originalPassword = 'Live-Recovery-Original-Password-492!';
const replacementPassword = 'Live-Recovery-Replacement-Password-593!';
const portProbe = createServer();
await new Promise((resolve, reject) => portProbe.once('error', reject).listen(0, '127.0.0.1', resolve));
const port = portProbe.address().port;
await new Promise(resolve => portProbe.close(resolve));
const baseUrl = `http://127.0.0.1:${port}`;
const env = { ...process.env, NODE_ENV: 'development', DXD_STORAGE_MODE: 'accounts', DXD_DATA_DIR: dataDir, DXD_AUTH_SECRET: secret, DXD_AUTH_BASE_URL: baseUrl, NEXT_TELEMETRY_DISABLED: '1', TMPDIR: tempRoot };
let server;
let serverOutput = '';
let browser;
let connection;

function currentTotp(uri, stepOffset = 0) {
  const url = new URL(uri), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...url.searchParams.get('secret').replace(/=+$/, '').toUpperCase()].map(char => alphabet.indexOf(char).toString(2).padStart(5, '0')).join('');
  const key = Buffer.from(bits.match(/.{8}/g).map(byte => Number.parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / Number(url.searchParams.get('period') || 30)) + stepOffset));
  const digest = createHmac('sha1', key).update(counter).digest(), offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** Number(url.searchParams.get('digits') || 6)).padStart(6, '0');
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Next dev server exited early (${server.exitCode}). ${serverOutput.slice(-5000)}`);
    try { if ((await fetch(`${baseUrl}/account`)).ok) return; } catch { /* compiling */ }
    await delay(250);
  }
  throw new Error(`Next dev server did not become ready. ${serverOutput.slice(-5000)}`);
}

async function localMail(kind) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const reader = openDatabase(databaseFile);
    try {
      const mail = createLocalMailStore(reader, secret).pending().find(item => item.mail.kind === kind && item.mail.to === email);
      if (mail) return mail.mail;
    } finally { reader.close(); }
    await delay(100);
  }
  throw new Error(`${kind} email did not appear in the isolated local inbox.`);
}

try {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  await chmod(dataDir, 0o700);
  const migration = spawnSync(process.execPath, ['scripts/migrate-local.mjs'], { cwd: process.cwd(), env, encoding: 'utf8' });
  if (migration.status !== 0) throw new Error(`Disposable database migration failed. ${migration.stderr || migration.stdout}`);
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.setEncoding('utf8').on('data', chunk => { serverOutput = (serverOutput + chunk).slice(-12000); });
  server.stderr.setEncoding('utf8').on('data', chunk => { serverOutput = (serverOutput + chunk).slice(-12000); });
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 480, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/account`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Display name').fill('Recovery Browser Test');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(originalPassword);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Check the local account inbox' }).waitFor();
  const verification = await localMail('verify-email');
  await page.goto(verification.url, { waitUntil: 'networkidle' });
  await page.goto(`${baseUrl}/account`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Sign in' }).click();
  await page.getByLabel('Email or username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(originalPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();

  await page.getByLabel('Confirm your password to begin setup').fill(originalPassword);
  await page.getByRole('button', { name: 'Set up authenticator', exact: true }).click();
  const totpUri = await page.locator('code').filter({ hasText: 'otpauth://' }).innerText();
  await page.getByLabel('Authenticator code').fill(currentTotp(totpUri));
  await page.getByRole('button', { name: 'Confirm authenticator', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Authenticator enabled' }).waitFor();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('tab', { name: 'Sign in' }).waitFor();

  await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Request reset link', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'reset link is waiting in the local account inbox' }).waitFor();
  const reset = await localMail('reset-password');
  await page.goto(reset.url, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('New password').fill(replacementPassword);
  await page.getByRole('button', { name: 'Set new password', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Password changed. Sign in with your new password.' }).waitFor();

  connection = openDatabase(databaseFile);
  const recovered = connection.sqlite.prepare('SELECT id, two_factor_enabled FROM user WHERE username=?').get(username);
  assert.equal(recovered.two_factor_enabled, 1, 'password recovery preserves authenticator enrollment');
  assert.equal(connection.sqlite.prepare('SELECT count(*) AS count FROM session WHERE user_id=?').get(recovered.id).count, 0, 'password recovery revokes all prior sessions');
  connection.close(); connection = undefined;

  await page.getByLabel('Email or username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(originalPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: /invalid|incorrect|wrong/i }).waitFor();
  await page.getByLabel('Email or username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(replacementPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByText('Enter the current code from your authenticator app.').waitFor();
  await page.getByLabel('Authenticator code').fill(currentTotp(totpUri, 1));
  await page.getByRole('button', { name: 'Verify and sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
  assert.deepEqual(pageErrors, []);
  console.log('PASS live account verification, MFA enrollment, encrypted password recovery, session revocation, MFA preservation, and fresh-factor sign-in');
  await context.close();
} catch (error) {
  console.error('LIVE RECOVERY SERVER OUTPUT', serverOutput.slice(-8000));
  throw error;
} finally {
  if (browser) await browser.close();
  if (connection) connection.close();
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), delay(5000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
  await rm(dataDir, { recursive: true, force: true });
}
