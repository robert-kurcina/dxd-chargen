const { chromium } = await import(process.env.DXD_PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
// The merged mobile/campaign foundation, before this preset/profile branch.
const baseline = '926b07ccb471b61d55b7235f8db18209dc4546da';
const artifactDir = process.env.DXD_HANDOUT_ARTIFACTS || '/private/tmp/dxd-handout-comparison';
await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const setup = await browser.newPage({ viewport: { width: 480, height: 1000 } });
  setup.on('dialog', dialog => dialog.accept());
  await setup.addInitScript(() => {
    localStorage.setItem('dxd-selected-campaign-v1', '7841aa01-33f4-4a90-8d13-000000000002');
    window.addEventListener('message', event => { if (event.data?.type === 'dxd-character-sheet') window.testPayload = event.data.payload; });
  });
  await setup.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await setup.locator('summary').filter({ hasText: 'Presets and generation locks' }).click();
  await setup.getByLabel('Preset tag', { exact: true }).selectOption('Necromancer');
  await setup.getByRole('button', { name: 'Spin character', exact: true }).click();
  await setup.getByRole('navigation', { name: 'Character views', exact: true }).getByRole('link', { name: 'Sheet', exact: true }).click();
  const frame = setup.frameLocator('iframe[title="Sarna Len character sheet"]');
  await frame.locator('[data-field="Name"]').waitFor();
  await setup.waitForFunction(() => Boolean(document.querySelector('iframe')?.contentWindow?.testPayload));
  const generated = await setup.evaluate(() => document.querySelector('iframe').contentWindow.testPayload);
  // Compare both sides with a representative generated character and long authored notes.
  const payload = { ...generated, Name: 'Handout comparison — Necromancer', BackName: 'Handout comparison — Necromancer', BackNotes: 'A traveler records the settlements and lineages of Sarna Len.\n'.repeat(18) };
  async function render(useBaseline) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });
    if (useBaseline) await page.route('**/character-creator/**', route => {
      const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
      const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png' };
      try {
        const body = execFileSync('git', ['show', `${baseline}:public${pathname}`], { maxBuffer: 20 * 1024 * 1024 });
        return route.fulfill({ body, contentType: types[pathname.split('.').pop()] || 'application/octet-stream' });
      } catch { return route.abort(); }
    });
    await page.goto('http://127.0.0.1:3000/character-creator/index.html?embed=1', { waitUntil: 'networkidle' });
    await page.evaluate(payload => window.postMessage({ type: 'dxd-character-sheet', payload }, window.location.origin), payload);
    await page.waitForFunction(() => document.querySelector('[data-field="Name"]')?.value.includes('Handout comparison'));
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode().catch(() => {}))); });
    const results = [];
    for (const side of ['front', 'back']) {
      await page.getByRole('tab', { name: side === 'front' ? 'Front' : 'Back', exact: true }).click();
      const screenshot = await page.locator(`#${side}`).screenshot({ animations: 'disabled' });
      await writeFile(`${artifactDir}/${useBaseline ? 'baseline' : 'current'}-${side}.png`, screenshot);
      results.push(screenshot);
    }
    await page.close(); return results;
  }
  const current = await render(false), previous = await render(true);
  for (let i = 0; i < 2; i++) assert.deepEqual(current[i], previous[i], `Handout side ${i + 1} differs from baseline`);
  console.log(`PASS front/back handout render pixel-identically to ${baseline}; artifacts: ${artifactDir}`);
} finally { await browser.close(); }
