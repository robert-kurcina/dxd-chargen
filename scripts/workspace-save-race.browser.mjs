const { chromium } = await import(process.env.DXD_PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
// All writes are intercepted: this test never writes a character file.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 480, height: 900 } });
  page.on('dialog', dialog => dialog.accept());
  const readDraft = () => page.evaluate(() => {
    const library = JSON.parse(localStorage.getItem('dxd-character-library-v1'));
    const draft = library.entries.find(entry => entry.id === library.activeId).draft;
    return { ...draft, updatedAt: null, characterId: null };
  });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let firstRequest;
  let received;
  const arrival = new Promise(resolve => { received = resolve; });
  await page.route('**/api/character-files', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const body = route.request().postDataJSON();
    firstRequest = body;
    received();
    await gate;
    await route.fulfill({ json: { idName: 'abc12345-race-fixture', draft: { ...body.draft, characterId: 'abc12345' } } });
  });
  await page.addInitScript(() => localStorage.setItem('dxd-selected-campaign-v1', '7841aa01-33f4-4a90-8d13-000000000002'));
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await arrival;
  // Emulate an already queued edit arriving while the confirmation request is in flight.
  await page.getByRole('button', { name: 'Generate', exact: true }).evaluate(button => button.click());
  const newer = await readDraft();
  assert.notDeepEqual(newer.background, firstRequest.draft.background);
  release();
  await page.getByRole('status').filter({ hasText: 'Newer edits remain unsaved' }).waitFor();
  assert.deepEqual(await readDraft(), newer);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Saved abc12345-race-fixture' }).waitFor();
  assert.equal(firstRequest.idName, 'abc12345-race-fixture');
  console.log('PASS delayed save preserves newer edits and subsequent save reuses file identity');
} finally { await browser.close(); }
