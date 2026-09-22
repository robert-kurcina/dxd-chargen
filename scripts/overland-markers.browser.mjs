const { chromium } = await import(process.env.DXD_PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
const page=await browser.newPage({viewport:{width:480,height:1000}});
await page.goto('http://127.0.0.1:3000/maps');
await page.getByRole('checkbox',{name:'Show Overland'}).check();
await page.waitForFunction(()=>document.querySelector('object')?.contentDocument?.querySelector('[data-dxd-overland-hit]'));
const markers=await page.evaluate(()=>[...document.querySelector('object').contentDocument.querySelectorAll('[data-dxd-overland-marker]')].map(g=>g.dataset.dxdOverlandMarker));
for (const marker of markers) {
await page.evaluate(marker=>{const doc=document.querySelector('object').contentDocument;doc.querySelectorAll('[data-dxd-overland-marker]').forEach(g=>g.querySelector('[data-dxd-overland-hit]').dispatchEvent(new PointerEvent('pointerleave')));const g=doc.querySelector(`[data-dxd-overland-marker="${marker}"]`);g.querySelector('[data-dxd-overland-hit]').dispatchEvent(new MouseEvent('click',{bubbles:true}));},marker);
await page.waitForFunction(marker=>{const doc=document.querySelector('object').contentDocument;const g=doc.querySelector(`[data-dxd-overland-marker="${marker}"]`);return g.getAttribute('aria-pressed')==='true'&&doc.defaultView.getComputedStyle(g.querySelector('circle')).stroke==='rgb(0, 102, 204)';},marker);
await page.waitForFunction(()=>!![...document.querySelectorAll('img')].find(i=>i.alt.endsWith('region map')&&i.complete&&i.naturalWidth&&!i.classList.contains('invisible'))||document.body.innerText.includes('Region map unavailable'),{},{timeout:60000});
const outcome=await page.evaluate(()=>[...document.querySelectorAll('img')].find(i=>i.alt.endsWith('region map'))?.getAttribute('src')??[...document.querySelectorAll('[role="status"]')].map(e=>e.textContent).join(' '));
console.log(marker,outcome);
if(marker==='free-city-gilgan')assert.ok(outcome.endsWith('free-city-gilban.png'));
}
console.log('PASS all',markers.length,'markers select blue and resolve an image or explicit unavailable state');
}finally{await browser.close();}
