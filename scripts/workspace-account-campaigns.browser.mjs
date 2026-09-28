import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const projectCache = path.resolve('.cache');
await mkdir(path.join(projectCache, 'tmp'), { recursive: true });
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(projectCache, 'ms-playwright');
process.env.TMPDIR ??= path.join(projectCache, 'tmp');
const { chromium } = await import(process.env.DXD_PLAYWRIGHT_MODULE || 'playwright');
await import('./test-typescript-loader.mjs');
const { createEmptyCharacterDraft } = await import('../src/lib/character-draft.ts');
const baseUrl = process.env.DXD_BASE_URL || 'http://127.0.0.1:3000';
const defaultId = '7841aa01-33f4-4a90-8d13-000000000001';
let activeUserId = 'browser-test-user';
const accountLibraryKey = (ownerId = activeUserId) => `dxd-character-library-v1:account:${encodeURIComponent(ownerId)}`;
const guestDraft = createEmptyCharacterDraft();
guestDraft.characterId = 'guest-file-character';
guestDraft.utilities.name = 'Guest draft to claim';
const legacyAccountDraft = createEmptyCharacterDraft();
legacyAccountDraft.utilities.name = 'Legacy account-linked cache';
const guestLibrary = { schemaVersion: 1, activeId: 'guest-seed', entries: [
  { id: 'guest-seed', fileId: 'guest-file.json', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', draft: guestDraft },
  { id: 'legacy-account-cache', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', serverRecord: { id: 'c1010000-0000-4000-8000-000000000001', version: 1, isPrivate: true, mode: 'copy' }, draft: legacyAccountDraft },
] };
const guestLibraryJson = JSON.stringify(guestLibrary);
const scenarios = [
  { label: 'preparing player', campaign: { id: 'a1010000-0000-4000-8000-000000000001', name: 'Preparing Table', lifecycle: 'preparing', isDefault: false, canConfigure: false }, assigned: true },
  { label: 'active player', campaign: { id: 'a1020000-0000-4000-8000-000000000002', name: 'Active Table', lifecycle: 'active', isDefault: false, canConfigure: false }, assigned: false },
  { label: 'active campaign staff', campaign: { id: 'a1030000-0000-4000-8000-000000000003', name: 'Staff Table', lifecycle: 'active', isDefault: false, canConfigure: true }, assigned: true },
  { label: 'default campaign', campaign: { id: defaultId, name: 'Default Campaign', lifecycle: 'preparing', isDefault: true, canConfigure: false }, assigned: true },
];

const browser = await chromium.launch({ headless: true });
try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: { width: 480, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(({ json }) => localStorage.setItem('dxd-character-library-v1', json), { json: guestLibraryJson });
    let saveBody = null;
    let filesystemSaveAttempted = false;
    const campaigns = [scenario.campaign];
    if (scenario.campaign.id !== defaultId) campaigns.unshift({ id: defaultId, name: 'Default Campaign', lifecycle: 'preparing', isDefault: true, canConfigure: false });
    await page.route('**/api/auth/get-session', route => route.fulfill({ json: { user: { id: activeUserId } }, headers: { 'cache-control': 'no-store' } }));
    await page.route('**/api/auth/campaigns', route => route.fulfill({ json: { campaigns, canCreateCampaign: false }, headers: { 'cache-control': 'no-store' } }));
    await page.route('**/api/auth/campaigns/*/invitations', route => route.fulfill({ json: { invitations: [] }, headers: { 'cache-control': 'no-store' } }));
    await page.route('**/api/character-files', async route => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.request().method())) filesystemSaveAttempted = true;
      return route.fulfill({ status: 500, json: { error: 'Filesystem writes are disabled in this browser test.' } });
    });
    await page.route('**/api/character-files/**', async route => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.request().method())) filesystemSaveAttempted = true;
      return route.fulfill({ status: 500, json: { error: 'Filesystem writes are disabled in this browser test.' } });
    });
    await page.route('**/api/auth/characters', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { characters: [] }, headers: { 'cache-control': 'no-store' } });
      saveBody = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ status: 201, json: { id: 'b1010000-0000-4000-8000-000000000001', version: 1 }, headers: { 'cache-control': 'no-store' } });
    });

    await page.goto(`${baseUrl}/campaigns`, { waitUntil: 'networkidle' });
    await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Guest drafts on this device', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: /Copy Legacy account-linked cache/ }).count(), 0, `${scenario.label}: unscoped account-linked entries are not offered as guest imports`);
    await page.getByRole('button', { name: /Copy Guest draft to claim into this account/ }).click();
    await page.waitForURL(`${baseUrl}/`);
    const importedGuest = await page.waitForFunction(({ key }) => { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value?.entries.some(entry => entry.draft.utilities.name === 'Guest draft to claim') ? value : false; }, { key: accountLibraryKey() });
    const importedGuestValue = await importedGuest.jsonValue();
    const importedGuestEntry = importedGuestValue?.entries.find(entry => entry.draft.utilities.name === 'Guest draft to claim');
    assert.ok(importedGuestEntry, `${scenario.label}: selected guest draft copied into account-scoped storage`);
    assert.equal(importedGuestEntry.fileId, undefined, `${scenario.label}: source file is detached`);
    assert.equal(importedGuestEntry.draft.characterId, null, `${scenario.label}: prior file identity is detached`);
    assert.equal(importedGuestEntry.serverRecord, undefined, `${scenario.label}: no prior account ownership link is retained`);
    const guestSource = await page.evaluate(() => JSON.parse(localStorage.getItem('dxd-character-library-v1') || 'null'));
    assert.equal(guestSource.entries.find(entry => entry.id === 'guest-seed').draft.utilities.name, 'Guest draft to claim', `${scenario.label}: guest source remains unchanged`);
    await page.goto(`${baseUrl}/campaigns`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('combobox').first().selectOption(scenario.campaign.id);
    const createName = scenario.campaign.lifecycle === 'active' && !scenario.campaign.canConfigure
      ? 'Create unassigned character for this campaign'
      : 'Create a character in this campaign';
    await page.getByRole('button', { name: createName, exact: true }).click();
    await page.waitForURL(`${baseUrl}/`);
    const draftHandle = await page.waitForFunction(({ key, id }) => {
      const library = JSON.parse(localStorage.getItem(key) || 'null');
      const entry = library?.entries.find(item => item.id === library.activeId);
      return entry?.accountTargetCampaignId === id ? { draft: entry.draft, target: entry.accountTargetCampaignId } : false;
    }, { key: accountLibraryKey(), id: scenario.campaign.id });
    const draftInfo = await draftHandle.jsonValue();
    assert.equal(draftInfo.draft.campaignId, scenario.assigned ? scenario.campaign.id : null, `${scenario.label}: draft campaign scope`);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(({ key, id }) => {
      const library = JSON.parse(localStorage.getItem(key) || 'null');
      return library?.entries.find(item => item.id === library.activeId)?.accountTargetCampaignId === id;
    }, { key: accountLibraryKey(), id: scenario.campaign.id });
    assert.ok(await page.getByRole('button', { name: 'Save', exact: true }).isEnabled(), `${scenario.label}: save is enabled`);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('Save this character to your Account Library.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();
    await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes('Saved'));
    assert.ok(saveBody, `${scenario.label}: Account API save was sent`);
    assert.equal(saveBody.campaignId, scenario.assigned ? scenario.campaign.id : null, `${scenario.label}: server save campaign scope`);
    assert.equal(saveBody.draft.campaignId, scenario.assigned ? scenario.campaign.id : null, `${scenario.label}: saved draft scope`);
    assert.equal(filesystemSaveAttempted, false, `${scenario.label}: no character file API write`);
    if (scenario.label === 'preparing player') {
      const firstAccountKey = accountLibraryKey();
      activeUserId = 'browser-test-user-b';
      await page.reload({ waitUntil: 'networkidle' });
      const secondAccountKey = accountLibraryKey();
      await page.waitForFunction(key => Boolean(localStorage.getItem(key)), secondAccountKey);
      const secondAccountLibrary = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), secondAccountKey);
      assert.equal(secondAccountLibrary.entries.some(entry => entry.draft.utilities.name === 'Guest draft to claim'), false, 'account B does not load account A local copies');
      const firstAccountLibrary = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), firstAccountKey);
      assert.ok(firstAccountLibrary.entries.some(entry => entry.draft.utilities.name === 'Guest draft to claim'), 'account A local copy remains under account A scope');
      await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Guest drafts on this device', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: /Copy Guest draft to claim into this account/ }).count(), 1, 'guest source remains explicitly available for ownership selection');
      activeUserId = 'browser-test-user';
      await page.reload({ waitUntil: 'networkidle' });
      await page.goto(`${baseUrl}/library`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Guest draft to claim Unassigned/ }).waitFor();
      console.log('PASS account switch isolates local character caches and retains explicit guest import');
    }
    console.log(`PASS ${scenario.label}: campaign selector, character draft and account save scope`);
    await context.close();
  }
} finally {
  await browser.close();
}
