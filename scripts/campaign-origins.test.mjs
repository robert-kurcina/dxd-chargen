import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { default: data } = await import('../src/data/index.ts');
const { originAllowed, originChangeAllowed, originEligibility, libraryTagMatches } = await import('../src/lib/campaign-origins.ts');
const { campaignMatches, campaignLabel, DEFAULT_CAMPAIGN_ID } = await import('../src/lib/local-campaigns.ts');
const { settlementOptionsForRegion } = await import('../src/lib/settlement-context.ts');
const { generatePreset, mechanicalPresets } = await import('../src/lib/rules/preset-generation.ts');
const { createEmptyCharacterDraft } = await import('../src/lib/character-draft.ts');
test('Disallow affects new selection but preserves existing characters and readable catalog details',()=>{
 const options=settlementOptionsForRegion(data.empires[0].name,data), settlement=options[0];
 const policy={settlementTags:{[settlement.id]:['Coastal',' disALLOW ']}};
 assert.equal(originAllowed(policy,settlement.id),false);
 assert.equal(originChangeAllowed(policy,null,settlement.id),false);
 assert.equal(originChangeAllowed(policy,settlement.id,settlement.id),true);
 assert.deepEqual(settlementOptionsForRegion(data.empires[0].name,data),options);
});
test('preset generation observes settlement tags before committing a candidate',()=>{
 const region=data.empires[0];const options=settlementOptionsForRegion(region.name,data);
 const policy={settlementTags:Object.fromEntries(options.map(s=>[s.id,['Disallow']]))};
 const before=createEmptyCharacterDraft(), copy=structuredClone(before);
 const gate=originEligibility(policy);
 assert.throws(()=>generatePreset(before,data,{presetId:mechanicalPresets(data)[0].id},(kind,id)=>kind==='region'?id===region.catalogId:gate(kind,id)),/No eligible/);
 assert.deepEqual(before,copy);
 const allAllowed=generatePreset(before,data,{presetId:mechanicalPresets(data)[0].id},originEligibility({settlementTags:{}}));
 assert.ok(allAllowed.background.settlementId);
});
test('combined Library filters preserve unassigned context and exact case-insensitive tag matches',()=>{
 const rows=[{id:'local',campaignId:null,tags:['NPC']},{id:'file',campaignId:DEFAULT_CAMPAIGN_ID,tags:['npc']},{id:'other',campaignId:'another',tags:['NPC ally']}];
 assert.deepEqual(rows.filter(r=>campaignMatches(r.campaignId,DEFAULT_CAMPAIGN_ID)&&libraryTagMatches(r.tags,' npc ')).map(r=>r.id),['local','file']);
 assert.deepEqual(rows.filter(r=>campaignMatches(r.campaignId,'unassigned')).map(r=>r.id),['local']);
 assert.equal(campaignLabel('another'),'Other campaign');assert.equal(campaignLabel(null),'Unassigned');
});
