import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, chmod, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
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

async function assertEventuallyChecked(locator) {
  await locator.waitFor({ state: 'visible' });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await locator.isChecked()) return;
    await delay(50);
  }
  assert.equal(await locator.isChecked(), true, 'the detached draft restores its Account Library privacy choice');
}

const dataDir = path.join(projectCache, `live-account-${process.pid}-${randomUUID().slice(0, 8)}`);
const databaseFile = path.join(dataDir, 'dxd.sqlite');
const secret = randomBytes(48).toString('base64url');
const username = `browser${randomUUID().slice(0, 8)}`;
const email = `${username}@example.test`;
const password = 'Live-Browser-Test-Password-492!';
const defaultCampaignId = '7841aa01-33f4-4a90-8d13-000000000001';
const portProbe = createServer();
await new Promise((resolve, reject) => portProbe.once('error', reject).listen(0, '127.0.0.1', resolve));
const port = portProbe.address().port;
await new Promise(resolve => portProbe.close(resolve));
const baseUrl = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  NODE_ENV: 'development',
  DXD_STORAGE_MODE: 'accounts',
  DXD_DATA_DIR: dataDir,
  DXD_AUTH_SECRET: secret,
  DXD_AUTH_BASE_URL: baseUrl,
  NEXT_TELEMETRY_DISABLED: '1',
  TMPDIR: tempRoot,
};
let server;
let serverOutput = '';
let browser;
let connection;

async function readVerificationMail() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const reader = openDatabase(databaseFile);
    try {
      const mail = createLocalMailStore(reader, secret).pending().find(item => item.mail.kind === 'verify-email' && item.mail.to === email);
      if (mail) return mail.mail;
    } finally { reader.close(); }
    await delay(100);
  }
  throw new Error('Verification email did not appear in the isolated local inbox.');
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Next dev server exited early (${server.exitCode}). ${serverOutput.slice(-5000)}`);
    try { const response = await fetch(`${baseUrl}/account`); if (response.ok) return; } catch { /* server is compiling */ }
    await delay(250);
  }
  throw new Error(`Next dev server did not become ready. ${serverOutput.slice(-5000)}`);
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
  await page.getByLabel('Display name').fill('Browser Account Test');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Check the local account inbox' }).waitFor();

  const verification = await readVerificationMail();
  assert.match(verification.url, new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/auth/`));
  await page.goto(verification.url, { waitUntil: 'networkidle' });
  await page.goto(`${baseUrl}/account`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Sign in' }).click();
  await page.getByLabel('Email or username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();

  await page.goto(`${baseUrl}/campaigns`, { waitUntil: 'networkidle' });
  await page.getByRole('combobox').first().selectOption(defaultCampaignId);
  await page.getByRole('button', { name: 'Create a character in this campaign', exact: true }).click();
  await page.waitForURL(`${baseUrl}/`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Save this character to your Account Library.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Save', exact: true }).last().click();
  await page.getByRole('status').filter({ hasText: 'Saved the character to the selected account campaign.' }).waitFor();

  connection = openDatabase(databaseFile);
  const user = connection.sqlite.prepare('SELECT id, email_verified FROM user WHERE username=?').get(username);
  assert.ok(user?.id);
  assert.ok(user.email_verified);
  const saved = connection.sqlite.prepare('SELECT campaign_id, is_private, current_version FROM characters WHERE owner_id=?').all(user.id);
  assert.equal(await page.evaluate(() => localStorage.getItem('dxd-character-storage-owner-v1')), user.id, 'verified account identity scopes the browser workspace');
  const accountScopedKey = `dxd-character-library-v1:account:${encodeURIComponent(user.id)}`;
  assert.ok(await page.evaluate(key => localStorage.getItem(key), accountScopedKey), 'account workspace has its own persisted library');
  const guestCache = await page.evaluate(() => JSON.parse(localStorage.getItem('dxd-character-library-v1') || 'null'));
  assert.equal(guestCache?.entries.some(entry => entry.serverRecord), false, 'account records never enter the guest cache');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].campaign_id, defaultCampaignId);
  assert.equal(saved[0].is_private, 0);
  assert.equal(saved[0].current_version, 1);
  connection.close(); connection = undefined;

  await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Account Library', exact: true }).waitFor();
  await page.getByText('Default Campaign · Version 1', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Open to edit', exact: true }).click();
  await page.waitForURL(`${baseUrl}/`);
  await page.getByRole('status').filter({ hasText: 'Opened Account Library version 1.' }).waitFor();

  const competingPage = await context.newPage();
  const competingErrors = [];
  competingPage.on('pageerror', error => competingErrors.push(error.message));
  await competingPage.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
  await competingPage.getByRole('button', { name: 'Open to edit', exact: true }).click();
  await competingPage.waitForURL(`${baseUrl}/`);
  await competingPage.getByRole('status').filter({ hasText: 'Opened Account Library version 1.' }).waitFor();

  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.getByRole('button', { name: /Assign Name/ }).click();
  await page.getByLabel('Table / common name').fill('Server winner');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).last().click();
  await page.getByRole('status').filter({ hasText: 'Saved Account Library version 2.' }).waitFor();

  await competingPage.locator('summary[aria-label="Workspace menu"]').click();
  await competingPage.getByLabel('Private in Account Library').check();
  await competingPage.locator('summary[aria-label="Workspace menu"]').click();
  await competingPage.getByRole('button', { name: 'Open navigation menu' }).click();
  await competingPage.getByRole('button', { name: /Assign Name/ }).click();
  await competingPage.getByLabel('Table / common name').fill('Conflicted local edits');
  await competingPage.getByRole('button', { name: 'Save', exact: true }).click();
  await competingPage.getByRole('button', { name: 'Save', exact: true }).last().click();
  await competingPage.getByRole('status').filter({ hasText: 'preserved as a separate local draft' }).waitFor();
  await competingPage.locator('summary[aria-label="Workspace menu"]').click();
  assert.equal(await competingPage.getByLabel('Private in Account Library').isChecked(), true);
  await competingPage.locator('summary[aria-label="Workspace menu"]').click();
  await competingPage.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
  await competingPage.getByRole('button', { name: /Conflicted local edits/ }).waitFor();
  await competingPage.getByRole('button', { name: 'Open to edit', exact: true }).click();
  await competingPage.waitForURL(`${baseUrl}/`);
  await competingPage.getByRole('status').filter({ hasText: 'Opened Account Library version 2.' }).waitFor();
  await competingPage.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
  await competingPage.getByRole('button', { name: /Conflicted local edits/ }).click();
  await competingPage.waitForURL(`${baseUrl}/`);
  await competingPage.locator('summary[aria-label="Workspace menu"]').click();
  await assertEventuallyChecked(competingPage.getByLabel('Private in Account Library'));

  await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Show version history', exact: true }).click();
  await page.getByRole('button', { name: 'Restore version 1', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Restore version 1', exact: true }).click();
  await page.waitForURL(`${baseUrl}/`);
  await page.getByRole('status').filter({ hasText: 'Loaded saved Account Library version 1. Saving creates a new version based on the latest version 2.' }).waitFor();
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await page.getByRole('button', { name: 'Save', exact: true }).last().click();
  await page.getByRole('status').filter({ hasText: 'Saved Account Library version 3.' }).waitFor();
  connection = openDatabase(databaseFile);
  const restoredCharacter = connection.sqlite.prepare('SELECT id, current_version FROM characters WHERE owner_id=?').get(user.id);
  assert.equal(restoredCharacter.current_version, 3, 'restoring an old version appends a new current version');
  const versionNames = connection.sqlite.prepare('SELECT version, draft_json FROM character_versions WHERE character_id=? ORDER BY version').all(restoredCharacter.id).map(row => ({ version: row.version, name: JSON.parse(row.draft_json).utilities.name }));
  assert.deepEqual(versionNames.map(item => item.version), [1, 2, 3], 'prior versions remain immutable and present');
  assert.equal(versionNames[1].name, 'Server winner');
  assert.equal(versionNames[2].name, versionNames[0].name, 'the restored version becomes a new copy of the selected historical draft');
  connection.close(); connection = undefined;

  await page.goto(`${baseUrl}/account`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'You have signed out.' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('dxd-character-storage-owner-v1')), null, 'sign-out clears the remembered account cache scope');
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => localStorage.getItem('dxd-character-library-v1') !== null);
  const signedOutGuestCache = await page.evaluate(() => JSON.parse(localStorage.getItem('dxd-character-library-v1') || 'null'));
  assert.equal(signedOutGuestCache.entries.some(entry => entry.draft.utilities.name === 'Server winner' || entry.draft.utilities.name === 'Conflicted local edits'), false, 'account data stays out of the guest cache after sign-out');
  assert.deepEqual(competingErrors, []);
  assert.deepEqual(pageErrors, []);
  console.log('PASS account-scoped persistence, historical version restore as an append-only new version, sign-out isolation, and stale conflict preservation');
  await competingPage.close();
  await context.close();
} catch (error) {
  console.error('LIVE BROWSER SERVER OUTPUT', serverOutput.slice(-8000));
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
