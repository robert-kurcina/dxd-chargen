const { chromium } = await import(process.env.DXD_PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:480,height:900}});page.on('dialog',d=>d.accept());
 const active=()=>page.evaluate(()=>{const l=JSON.parse(localStorage.getItem('dxd-character-library-v1'));return l.entries.find(e=>e.id===l.activeId);});
 await page.goto('http://127.0.0.1:3000/',{waitUntil:'networkidle'});await page.waitForURL('**/campaigns');
 await page.getByRole('button',{name:/Working Campaign Preparing/}).click();await page.getByRole('button',{name:'Create a character',exact:true}).click();await page.waitForURL('http://127.0.0.1:3000/');
 const working=await active();assert.equal(working.draft.campaignId,'7841aa01-33f4-4a90-8d13-000000000002');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Generate',exact:true}).click();
 const changed=await active();
 await page.locator('summary[aria-label="Workspace menu"]').click();await page.getByRole('link',{name:'Campaigns',exact:true}).click();await page.waitForURL('**/campaigns');
 await page.getByRole('button',{name:/Default Campaign Immutable/}).click();assert.equal((await active()).id,working.id);
 await page.getByRole('button',{name:'Create a character',exact:true}).click();await page.waitForURL('http://127.0.0.1:3000/');
 assert.equal((await active()).draft.campaignId,'7841aa01-33f4-4a90-8d13-000000000001');
 assert.notEqual((await active()).id,working.id);
 await page.goto('http://127.0.0.1:3000/library',{waitUntil:'networkidle'});
 await page.getByRole('combobox',{name:'Campaign',exact:true}).selectOption('7841aa01-33f4-4a90-8d13-000000000002');
 const browserDrafts=page.getByRole('heading',{name:'Browser drafts'}).locator('..');
 await page.waitForFunction(() => [...document.querySelectorAll('h2')].find(e => e.textContent === 'Browser drafts')?.parentElement?.querySelectorAll('button').length === 1);
 assert.equal(await browserDrafts.getByRole('button').count(),1);
 await browserDrafts.getByRole('button').click();await page.waitForURL('http://127.0.0.1:3000/');
 assert.deepEqual((await active()).draft.background,changed.draft.background);assert.ok(await page.getByRole('button',{name:'Undo',exact:true}).isEnabled());
 console.log('PASS campaign selection, separate identities, filtered browser drafts and restored history');
 await page.goto('http://127.0.0.1:3000/maps',{waitUntil:'networkidle'});
 const original=await active();
 console.log('origin selectors',await page.getByRole('combobox').allTextContents());
 await page.getByRole('combobox').first().click();console.log('regions', (await page.getByRole('option').allTextContents()).slice(0,5));
 await page.getByRole('option').first().click();
 const combos=page.getByRole('combobox');await combos.nth(1).click();await page.getByRole('option').first().click();
 assert.deepEqual((await active()).draft,original.draft);
 await page.getByRole('button',{name:'Create a character from here'}).click();await page.waitForURL('http://127.0.0.1:3000/');
 assert.notEqual((await active()).id,original.id);assert.ok((await active()).draft.background.regionId);assert.ok((await active()).draft.background.settlementId);assert.deepEqual((await active()).draft.creation.locks,['background.regionId','background.settlementId']);
 console.log('PASS origin exploration does not edit current character; starts separate origin-based draft');
 for(const width of [320,480,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:3000/campaigns',{waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  if(width===480)await page.screenshot({path:'/private/tmp/dxd-mobile-baseline/campaigns-480.png',fullPage:true});
 }
 console.log('PASS campaign layout at 320/480/768/1440px');
} finally { await browser.close(); }
