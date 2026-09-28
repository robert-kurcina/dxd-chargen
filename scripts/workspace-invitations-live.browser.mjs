import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, chmod, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
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
const { bootstrapVerifiedUsername } = await import('../src/server/auth/site-admin.ts');

const dataDir = path.join(projectCache, `live-invitations-${process.pid}-${randomUUID().slice(0, 8)}`);
const databaseFile = path.join(dataDir, 'dxd.sqlite');
const secret = randomBytes(48).toString('base64url');
const suffix = randomUUID().slice(0, 8);
const admin = { username: `gm${suffix}`, email: `gm${suffix}@example.test`, password: 'Live-Invitation-Test-Password-492!' };
const player = { username: `player${suffix}`, email: `player${suffix}@example.test`, password: 'Live-Invitation-Test-Password-492!' };
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

async function verificationFor(email) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const reader = openDatabase(databaseFile);
    try {
      const mail = createLocalMailStore(reader, secret).pending().find(item => item.mail.kind === 'verify-email' && item.mail.to === email);
      if (mail) return mail.mail;
    } finally { reader.close(); }
    await delay(100);
  }
  throw new Error(`Verification email for ${email} did not appear in the isolated inbox.`);
}

async function createVerifiedAccount(context, account) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/account`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Display name').fill(account.username);
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Check the local account inbox' }).waitFor();
  const verification = await verificationFor(account.email);
  await page.goto(verification.url, { waitUntil: 'networkidle' });
  await page.goto(`${baseUrl}/account`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Sign in' }).click();
  await page.getByLabel('Email or username').fill(account.username);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
  page.testPageErrors = pageErrors;
  return page;
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

  const gmContext = await browser.newContext({ viewport: { width: 480, height: 900 } });
  const gmPage = await createVerifiedAccount(gmContext, admin);
  connection = openDatabase(databaseFile);
  bootstrapVerifiedUsername(connection, admin.username);
  connection.close(); connection = undefined;
  await gmPage.reload({ waitUntil: 'networkidle' });
  await gmPage.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
  await gmPage.getByLabel('Confirm your password to begin setup').fill(admin.password);
  await gmPage.getByRole('button', { name: 'Set up authenticator', exact: true }).click();
  const totpUri = await gmPage.locator('code').filter({ hasText: 'otpauth://' }).innerText();
  const enrollmentCode = currentTotp(totpUri);
  await gmPage.getByLabel('Authenticator code').fill(enrollmentCode);
  await gmPage.getByRole('button', { name: 'Confirm authenticator', exact: true }).click();
  await gmPage.getByRole('status').filter({ hasText: 'Authenticator enabled' }).waitFor();

  connection = openDatabase(databaseFile);
  const adminIdForStepUp = connection.sqlite.prepare('SELECT id FROM user WHERE username=?').get(admin.username).id;
  connection.sqlite.prepare('UPDATE session SET created_at=? WHERE user_id=?').run(Date.now() - 301_000, adminIdForStepUp);
  connection.sqlite.prepare('UPDATE consumed_totp SET expires_at=0 WHERE user_id=?').run(adminIdForStepUp);
  connection.close(); connection = undefined;

  await gmPage.goto(`${baseUrl}/campaigns`, { waitUntil: 'networkidle' });
  await gmPage.getByLabel('Campaign name').fill(`Browser Invite ${suffix}`);
  await gmPage.getByRole('button', { name: 'Create preparing campaign', exact: true }).click();
  await gmPage.getByRole('alert').filter({ hasText: 'Verify your authenticator again before this action' }).waitFor();
  await gmPage.getByRole('link', { name: 'Open account security', exact: true }).click();
  await gmPage.waitForURL(`${baseUrl}/account?returnTo=%2Fcampaigns`);
  await gmPage.getByLabel('Authenticator code').fill(currentTotp(totpUri, 1));
  await gmPage.getByRole('button', { name: 'Verify fresh code', exact: true }).click();
  await gmPage.waitForURL(`${baseUrl}/campaigns`);
  await gmPage.getByLabel('Campaign name').fill(`Browser Invite ${suffix}`);
  await gmPage.getByRole('button', { name: 'Create preparing campaign', exact: true }).click();
  await gmPage.getByRole('status').filter({ hasText: 'created as a preparing campaign' }).waitFor();
  connection = openDatabase(databaseFile);
  const campaignId = connection.sqlite.prepare('SELECT id FROM campaigns WHERE name=?').get(`Browser Invite ${suffix}`)?.id;
  connection.close(); connection = undefined;
  assert.ok(campaignId, 'forked campaign is persisted');

  const linkField = gmPage.getByLabel('New invitation link — copy it now');
  await gmPage.getByRole('button', { name: 'Create invitation link', exact: true }).click();
  await gmPage.getByRole('status').filter({ hasText: 'Invitation created' }).waitFor();
  const inviteUrl = await linkField.inputValue();
  const inviteToken = new URL(inviteUrl).pathname.split('/').pop();
  assert.match(inviteToken, /^[A-Za-z0-9_-]{43}$/);
  await delay(20);
  await gmPage.getByRole('button', { name: 'Create invitation link', exact: true }).click();
  await gmPage.waitForFunction(previous => document.querySelector('input[readonly]')?.value !== previous, inviteUrl);
  const revokedLink = await linkField.inputValue();
  const revokedToken = new URL(revokedLink).pathname.split('/').pop();
  await gmPage.getByText('Player · Available').nth(1).waitFor();
  await gmPage.getByRole('button', { name: 'Revoke', exact: true }).first().click();
  await gmPage.getByRole('status').filter({ hasText: 'Invitation revoked' }).waitFor();
  await gmPage.getByText('Player · Revoked').waitFor();

  const playerContext = await browser.newContext({ viewport: { width: 480, height: 900 } });
  const playerPage = await createVerifiedAccount(playerContext, player);
  await playerPage.goto(inviteUrl, { waitUntil: 'domcontentloaded' });
  await playerPage.getByText(`You are invited to join Browser Invite ${suffix}`, { exact: false }).waitFor();
  await playerPage.getByRole('button', { name: 'Accept invitation', exact: true }).click();
  await playerPage.getByRole('status').filter({ hasText: 'You joined the campaign.' }).waitFor();

  connection = openDatabase(databaseFile);
  const gm = connection.sqlite.prepare('SELECT id, two_factor_enabled FROM user WHERE username=?').get(admin.username);
  const joinedPlayer = connection.sqlite.prepare('SELECT id, email_verified FROM user WHERE username=?').get(player.username);
  assert.equal(gm.two_factor_enabled, 1);
  assert.equal(joinedPlayer.email_verified, 1);
  assert.deepEqual(connection.sqlite.prepare('SELECT role, state FROM campaign_memberships WHERE campaign_id=? AND user_id=?').get(campaignId, joinedPlayer.id), { role: 'player', state: 'active' });
  const activeInvite = connection.sqlite.prepare('SELECT uses, revoked_at FROM campaign_invitations WHERE campaign_id=? AND token_hash=?').get(campaignId, createHash('sha256').update('dxd-campaign-invite-v1\0').update(inviteToken).digest('hex'));
  const revokedInvite = connection.sqlite.prepare('SELECT uses, revoked_at FROM campaign_invitations WHERE campaign_id=? AND token_hash=?').get(campaignId, createHash('sha256').update('dxd-campaign-invite-v1\0').update(revokedToken).digest('hex'));
  assert.deepEqual(activeInvite, { uses: 1, revoked_at: null });
  assert.ok(revokedInvite?.revoked_at);
  assert.deepEqual([...gmPage.testPageErrors, ...playerPage.testPageErrors], []);
  assert.ok(connection.sqlite.prepare("SELECT count(*) AS count FROM security_events WHERE action LIKE '%campaign-invitation%' AND actor_id=?").get(gm.id).count >= 3);
  connection.close(); connection = undefined;

  const revokedPage = await playerContext.newPage();
  await revokedPage.goto(revokedLink, { waitUntil: 'domcontentloaded' });
  await revokedPage.getByRole('alert').filter({ hasText: 'expired, been revoked, or has no uses remaining' }).waitFor();
  await Promise.all([gmContext.close(), playerContext.close()]);
  console.log('PASS live stale-MFA reauthentication, protected campaign fork, invitation create/revoke, verified player join, membership persistence, and revoked-link rejection');
} catch (error) {
  console.error('LIVE INVITATION SERVER OUTPUT', serverOutput.slice(-8000));
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
