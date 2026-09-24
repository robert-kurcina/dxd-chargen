const { chromium } = await import(process.env.DXD_PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 480, height: 1000 } });
  page.on('dialog', dialog => dialog.accept());
  await page.addInitScript(() => localStorage.setItem('dxd-selected-campaign-v1', '7841aa01-33f4-4a90-8d13-000000000002'));
  const library = () => page.evaluate(() => JSON.parse(localStorage.getItem('dxd-character-library-v1')));
  const canonical = draft => ({ ...draft, updatedAt: null, characterId: null });
  let saved;
  await page.route('**/api/character-files', route => {
    if (route.request().method() !== 'POST') return route.fulfill({ json: { characters: [] } });
    saved = route.request().postDataJSON();
    return route.fulfill({ json: { idName: 'abcd1234-copy', draft: { ...saved.draft, characterId: 'abcd1234' } } });
  });
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await page.locator('summary').filter({ hasText: 'Presets and generation locks' }).click();
  await page.getByRole('button', { name: 'Spin character', exact: true }).click();
  const before = await library();
  const source = before.entries.find(entry => entry.id === before.activeId);
  await page.getByLabel('Workspace menu', { exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download character backup', exact: true }).click();
  const download = await downloading;
  assert.equal(await download.failure(), null);
  const chunks = []; for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  const envelope = JSON.parse(backup.toString());
  assert.equal(envelope.format, 'dxd-chargen-character');
  assert.deepEqual(envelope.character.draft, source.draft);
  assert.deepEqual(await library(), before);
  // Simulate a file-bound backup: importing must detach its identity.
  envelope.character.fileId = 'old12345-original';
  envelope.character.draft.characterId = 'old12345';
  const upload = contents => page.getByLabel('Import character backup', { exact: true }).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
  await upload(JSON.stringify(envelope));
  await page.getByRole('status').filter({ hasText: 'Imported a separate browser copy' }).waitFor();
  const after = await library();
  assert.equal(after.entries.length, before.entries.length + 1);
  assert.notEqual(after.activeId, before.activeId);
  assert.deepEqual(after.entries.find(entry => entry.id === before.activeId), source);
  const copy = after.entries.find(entry => entry.id === after.activeId);
  assert.equal(copy.fileId, undefined);
  assert.equal(copy.draft.characterId, null);
  assert.deepEqual(canonical(copy.draft), canonical(source.draft));
  assert.ok(await page.getByRole('button', { name: 'Undo', exact: true }).isDisabled());
  await page.reload({ waitUntil: 'networkidle' });
  assert.deepEqual(canonical((await library()).entries.find(entry => entry.id === copy.id).draft), canonical(copy.draft));
  for (const bad of ['not JSON', JSON.stringify({ Name: 'Sheet projection' }), JSON.stringify({ ...envelope, version: 99 }), JSON.stringify({ schemaVersion: 11 })]) {
    const intact = await library();
    await upload(bad);
    await page.getByRole('status').filter({ hasText: 'Import failed.' }).waitFor();
    assert.deepEqual(await library(), intact);
  }
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Saved abcd1234-copy' }).waitFor();
  assert.equal(saved.idName, null); assert.equal(saved.draft.characterId, null);
  for (const width of [320, 480, 768, 1440]) {
    await page.setViewportSize({ width, height: 700 });
    await page.getByLabel('Workspace menu', { exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.keyboard.press('Escape');
  }
  console.log('PASS backup download, detached import, reload, invalid input, save isolation and responsive menu');
} finally { await browser.close(); }
