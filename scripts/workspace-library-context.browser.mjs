const { chromium } = await import(process.env.DXD_PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:480,height:1000}});page.on('dialog',d=>d.accept());
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const defaultId='7841aa01-33f4-4a90-8d13-000000000001',workingId='7841aa01-33f4-4a90-8d13-000000000002';
 await page.addInitScript(()=>localStorage.setItem('dxd-selected-campaign-v1','7841aa01-33f4-4a90-8d13-000000000002'));
 await page.route('**/api/character-files',route=>route.fulfill({json:{characters:[
  {idName:'test-npc',name:'File NPC',properName:'',campaignId:defaultId,libraryTags:['NPC'],speciesId:null,lineageId:null,tradeId:null,professionId:null,thumbnailUrl:null,updatedAt:'2026-09-24T00:00:00Z'},
  {idName:'test-hero',name:'File Hero',properName:'',campaignId:workingId,libraryTags:['Hero'],speciesId:null,lineageId:null,tradeId:null,professionId:null,thumbnailUrl:null,updatedAt:'2026-09-24T00:00:00Z'}
 ]}}));
 await page.goto('http://127.0.0.1:3000/',{waitUntil:'networkidle'});
 await page.evaluate(({defaultId,workingId})=>{
  const library=JSON.parse(localStorage.getItem('dxd-character-library-v1')),base=library.entries[0];
  library.entries=[['local-npc',defaultId,'Local NPC','NPC'],['local-hero',workingId,'Local Hero','Hero'],['local-free',null,'Local Unassigned','NPC']].map(([id,campaignId,name,tag])=>({...structuredClone(base),id,draft:{...structuredClone(base.draft),campaignId,utilities:{...base.draft.utilities,name,libraryTags:[tag]}}}));
  library.activeId='local-npc';localStorage.setItem('dxd-character-library-v1',JSON.stringify(library));
 },{defaultId,workingId});
 await page.goto('http://127.0.0.1:3000/library',{waitUntil:'networkidle'});
 const campaign=page.getByRole('combobox',{name:'Campaign',exact:true});
 await page.getByLabel('Library tag',{exact:true}).fill(' npc ');
 await campaign.selectOption(defaultId);
 await page.getByRole('button',{name:/Local NPC/}).waitFor();await page.getByRole('button',{name:/Local Unassigned/}).waitFor();
 assert.equal(await page.getByRole('button',{name:/Local Hero/}).count(),0);
 await page.getByText('File NPC',{exact:true}).first().waitFor();assert.equal(await page.getByText('File Hero',{exact:true}).count(),0);
 await campaign.selectOption('unassigned');assert.equal(await page.getByRole('button',{name:/Local NPC/}).count(),0);assert.equal(await page.getByText('File NPC',{exact:true}).count(),0);
 await page.getByRole('button',{name:/Local Unassigned/}).waitFor();
 await campaign.selectOption(workingId);await page.getByLabel('Library tag',{exact:true}).fill('Hero');
 await page.getByRole('button',{name:/Local Hero/}).waitFor();await page.getByText('File Hero',{exact:true}).first().waitFor();
 console.log('PASS shared tag/campaign filters across browser drafts and saved files, including unassigned');
 for(const width of [320,480,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);}
 await page.setViewportSize({width:480,height:1000});
 await page.getByRole('button',{name:/Local Hero/}).click();await page.waitForURL('http://127.0.0.1:3000/');
 await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
 await page.getByRole('button',{name:/Assign Granted Skills/}).click();
 const help=page.locator('summary').filter({hasText:'Skill level and specialization rank'});
 await help.click();await page.getByText('Technical Expert / Expert (Technical)',{exact:true}).waitFor();
 assert.ok(await page.getByText(/Science 4/).count());assert.deepEqual(errors,[]);
 console.log('PASS mobile skill help and responsive Library controls');
} finally {await browser.close();}
