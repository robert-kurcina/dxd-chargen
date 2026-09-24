import './test-typescript-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {default:data}=await import('../src/data/index.ts');
const {createEmptyCharacterDraft}=await import('../src/lib/character-draft.ts');
const {generatePreset,mechanicalPresets,normalizeGeneratedDraft,LOCK_SECTIONS}=await import('../src/lib/rules/preset-generation.ts');
const {tradeCandidacy}=await import('../src/lib/rules/intrinsics.ts');
const presets=mechanicalPresets(data);
const wizard=presets.find(p=>p.name==='Wizard > Necromancer');
const fresh=()=>normalizeGeneratedDraft(createEmptyCharacterDraft(),data);
test('all sourced presets have distinct UUIDs and produce eligible Rank 1 characters',()=>{
 assert.equal(new Set(presets.map(p=>p.id)).size,presets.length);
 for(const preset of presets){const result=generatePreset(fresh(),data,{presetId:preset.id});assert.equal(result.intrinsics.tradeRank,1,preset.name);assert.ok(tradeCandidacy(result,data).eligible,preset.name);assert.ok(result.utilities.properName,preset.name);}
});
test('deterministic generation has no input mutation or global RNG dependency',()=>{
 const before=fresh(),copy=structuredClone(before);
 const a=generatePreset(before,data,{presetId:wizard.id}),b=generatePreset(before,data,{presetId:wizard.id});
 assert.deepEqual(a,b);assert.deepEqual(before,copy);assert.ok(a.creation.sequence>0);
 const c=generatePreset(a,data,{presetId:wizard.id});assert.notDeepEqual(a.background,c.background);
});
test('locked origin and attribute remain intact; incompatible preset fails atomically',()=>{
 const before=generatePreset(fresh(),data,{presetId:wizard.id});
 before.creation.locks=[...LOCK_SECTIONS.Origin,'attribute.INT','intrinsics.tradeId'];
 const after=generatePreset(before,data,{presetId:wizard.id});
 assert.equal(after.background.regionId,before.background.regionId);assert.equal(after.background.settlementId,before.background.settlementId);
 assert.equal(after.intrinsics.attributes.find(a=>a.name==='INT').base,before.intrinsics.attributes.find(a=>a.name==='INT').base);
 const copy=structuredClone(before);assert.throws(()=>generatePreset(before,data,{presetId:presets.find(p=>p.name==='Warrior').id}),/locked Trade/);assert.deepEqual(before,copy);
});
test('campaign restrictions exclude candidates and reject denied presets',()=>{
 assert.throws(()=>generatePreset(fresh(),data,{presetId:wizard.id},()=>false),/unavailable/);
 const region=data.empires[0];const result=generatePreset(fresh(),data,{presetId:wizard.id},(kind,id)=>kind!=='region'||id===region.catalogId);assert.equal(result.background.regionId,region.catalogId);
});
test('preserves authored notes and possessions, replaces generated selections',()=>{
 const before=generatePreset(fresh(),data,{presetId:wizard.id});before.utilities.notes='Keep my story';before.proficiencies.additionalSkills=[{id:'test',name:'Test',source:'player'}];
 const after=generatePreset(before,data,{presetId:wizard.id});assert.equal(after.utilities.notes,'Keep my story');assert.equal(after.proficiencies.additionalSkills.length,0);
});

test('Alef/Akrunai Necromancer supports each native creation method and remains normalized',()=>{
 const group=data.species.flatMap(f=>f.groups).find(g=>g.name==='Alef');
 for(const method of ['roll','array','point-buy']){
  const before=fresh();before.intrinsics.attributeMethod=method;before.intrinsics.attributeArrayId=method==='array'?'A':null;
  const result=generatePreset(before,data,{presetId:wizard.id,speciesId:group.catalogId,lineageId:'lineage-akrunai'});
  assert.equal(result.intrinsics.attributeMethod,method);assert.deepEqual(normalizeGeneratedDraft(result,data),result);assert.equal(result.intrinsics.lineageId,'lineage-akrunai');
 }
});
test('all populated section locks survive a spin, including derived language projection',()=>{
 const before=generatePreset(fresh(),data,{presetId:wizard.id});
 before.creation.locks=Object.values(LOCK_SECTIONS).flat();
 const result=generatePreset(before,data,{presetId:wizard.id});
 assert.deepEqual(result.background,before.background);assert.deepEqual(result.intrinsics,before.intrinsics);
});
test('locked invalid attributes reject without consuming owned random sequence',()=>{
 const before=generatePreset(fresh(),data,{presetId:wizard.id});
 for(const a of before.intrinsics.attributes)a.base=1;
 before.creation.locks=LOCK_SECTIONS.Attributes;const copy=structuredClone(before);
 assert.throws(()=>generatePreset(before,data,{presetId:wizard.id}),/No eligible/);assert.deepEqual(before,copy);
});
test('partially locked arrays preserve their multiset and point-buy stays within budget',()=>{
 for(const method of ['array','point-buy']) {
  const before=fresh();before.intrinsics.attributeMethod=method;before.intrinsics.attributeArrayId=method==='array'?'A':null;
  const generated=generatePreset(before,data,{presetId:wizard.id});
  generated.creation.locks=[...LOCK_SECTIONS.Lineage,'attribute.INT','attribute.KNO','attribute.POW','attribute.STR'];
  const after=generatePreset(generated,data,{presetId:wizard.id});
  for(const name of ['INT','KNO','POW','STR']) assert.equal(after.intrinsics.attributes.find(a=>a.name===name).base,generated.intrinsics.attributes.find(a=>a.name===name).base);
 }
});

test('unlocked preset catalog works across independent seeds',()=>{
 for(let seed=1;seed<=8;seed++)for(const preset of presets){
  const before=fresh();before.creation={version:1,presetId:null,locks:[],seed,sequence:0};
  const result=generatePreset(before,data,{presetId:preset.id});assert.ok(tradeCandidacy(result,data).eligible,`${preset.name} seed ${seed}`);
 }
});
test('normalization cannot silently change a locked input',()=>{
 const before=generatePreset(fresh(),data,{presetId:wizard.id});
 before.background.ageYears=null;before.creation.locks=['background.ageYears'];
 const copy=structuredClone(before);
 assert.throws(()=>generatePreset(before,data,{presetId:wizard.id}),/locked Age Years/);assert.deepEqual(before,copy);
});
test('step generation is deterministic and preserves a fully locked section without advancing RNG',async()=>{
 const {generateLockedStep}=await import('../src/lib/rules/preset-generation.ts');
 const before=generatePreset(fresh(),data,{presetId:wizard.id});before.creation.locks=LOCK_SECTIONS.Origin;
 const after=generateLockedStep('background-region-settlement',before,data);
 assert.deepEqual(after,before);
 const demographic=generateLockedStep('background-demographics',before,data);
 assert.deepEqual(generateLockedStep('background-demographics',before,data),demographic);
});

test('random callback failure leaves draft and sequence untouched; manual choices may edit locks',async()=>{
 const {withCharacterRandom,seedForCharacter}=await import('../src/lib/rules/preset-generation.ts');
 const before=generatePreset(fresh(),data,{presetId:wizard.id});before.creation.locks=['utilities.name'];const copy=structuredClone(before);
 assert.throws(()=>withCharacterRandom(before,data,(candidate,random)=>{random();candidate.utilities.name='Broken';throw new Error('failure');}),/failure/);
 assert.deepEqual(before,copy);
 const result=withCharacterRandom(before,data,(candidate,random)=>{random();candidate.utilities.name='Manual choice';return candidate;});
 assert.equal(result.utilities.name,'Manual choice');assert.ok(result.creation.sequence>before.creation.sequence);
 assert.notEqual(seedForCharacter('one'),seedForCharacter('two'));assert.notEqual(seedForCharacter('one'),seedForCharacter('one',1));
});

test('language locks keep authored choices but allow derived levels to recalculate',()=>{
 const before=generatePreset(fresh(),data,{presetId:wizard.id});before.creation.locks=['proficiencies.languages'];
 const after=generatePreset(before,data,{presetId:wizard.id});
 const inputs=draft=>draft.proficiencies.languages.filter(l=>l.kind!=='default').map(({baseLevel,level,...input})=>input);
 assert.deepEqual(inputs(before),inputs(after));
 assert.ok(after.proficiencies.languages.every(l=>Number.isFinite(l.baseLevel)&&Number.isFinite(l.level)));
});
