import type { StaticData } from '@/data';
import { makeCatalogId } from '@/data/catalog-policy';
import { createEmptyCharacterDraft, type CharacterDraft } from '@/lib/character-draft';
import { generateStep } from './generate-step';
import { assessBackgroundStep, defaultSocialRankTitle, socialRankTitleOptions, syncHeritageGrantedSelections } from './background';
import { syncIntrinsics, tradeCandidacy, getTradePackage, getSpeciesChoice, getLineageName, assessIntrinsicStep, ROLLED_ATTRIBUTES, setAttributeBaseValues, type RolledAttribute } from './intrinsics';
import { syncProficiencies } from './proficiencies';
import { syncProperties } from './properties';
import { syncUtilities } from './utilities';
import { allowedEnvironNames, settlementOptionsForRegion } from '@/lib/settlement-context';
export class GenerationConflict extends Error {
}
export const normalizeGeneratedDraft = (draft: CharacterDraft, data: StaticData) => syncUtilities(syncProperties(syncProficiencies(syncIntrinsics(syncHeritageGrantedSelections(draft, data), data), data), data), data);
// Only authored inputs belong here. Calculated projections must remain free to change.
export const LOCK_SECTIONS: Record<string, string[]> = {
  Origin: ['background.regionId', 'background.settlementId'],
  Demographics: ['background.sex', 'background.gender', 'background.geneticallyFemale', 'background.handedness', 'background.ageGroup', 'background.ageYears', 'background.birthMonth', 'background.demographicSelections'],
  Heritage: ['background.culturalHeritageId', 'background.environHeritageId', 'background.societalHeritageId'],
  Background: ['background.socialRankId', 'background.socialRank', 'background.socialRankTitle', 'background.personality', 'background.tragedySeedId', 'background.tragedySeedText', 'background.disabilities', 'background.disabilitiesReviewed', 'background.beliefId', 'background.deityId'],
  Lineage: ['intrinsics.speciesFamilyId', 'intrinsics.speciesId', 'intrinsics.lineageId', 'intrinsics.childOfStrife', 'intrinsics.strifeMixedLineage', 'intrinsics.strifePairingId', 'intrinsics.strifeMotherFirst', 'intrinsics.strifeFatherLineageId', 'intrinsics.strifeMotherLineageId', 'intrinsics.strifeAttributeRolls', 'intrinsics.strifeBonusParent'],
  Attributes: ['intrinsics.attributeMethod', 'intrinsics.attributeArrayId', ...ROLLED_ATTRIBUTES.map(name => `attribute.${name}`), 'intrinsics.zedPurchasedIncrease'],
  Profession: ['intrinsics.tradeId', 'intrinsics.specializationId', 'intrinsics.tradeRank', 'intrinsics.affinityAttribute'],
  Proficiencies: ['proficiencies.pml', 'proficiencies.pmlVirtuosityChoices', 'proficiencies.grantSpecializations', 'proficiencies.grantSpecializationRanks', 'proficiencies.additionalSkills', 'proficiencies.languages'],
  Spells: ['utilities.spells', 'utilities.spellsReviewed'],
  'Magic items': ['utilities.magicItems', 'utilities.magicItemsReviewed', 'utilities.magicItemForms'],
  Body: ['properties.statureAdjustment', 'properties.buildAdjustment', 'properties.weightAdjustment'],
  Name: ['utilities.nameLanguageId', 'utilities.nameStyle', 'utilities.name', 'utilities.properName'],
};
const paths = new Set(Object.values(LOCK_SECTIONS).flat());
export function inputLabel(path: string) { return path.startsWith('attribute.') ? `${path.slice(10)} roll and purchased adjustments` : path.split('.')[1].replace(/Id$/, '').replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()); }
export function creationContext(draft: CharacterDraft) {
  const value = draft.creation;
  return { version: 1 as const, presetId: value?.presetId ?? null, locks: Array.isArray(value?.locks) ? value.locks.filter(path => paths.has(path)) : [], seed: Number.isSafeInteger(value?.seed) ? value!.seed >>> 0 : 0, sequence: Number.isSafeInteger(value?.sequence) && value!.sequence >= 0 ? value!.sequence : 0 };
}
function readInput(draft: CharacterDraft, path: string): unknown {
  if (path.startsWith('attribute.')) {
    const attribute = draft.intrinsics.attributes.find(a => a.name === path.slice(10));
    return attribute ? { name: attribute.name, base: attribute.base, adjustments: attribute.adjustments.filter(a => a.source === 'player') } : null;
  }
  if (path === 'proficiencies.languages')
    return draft.proficiencies.languages.filter(l => l.kind !== 'default').map(({ baseLevel: _base, level: _level, ...input }) => input);
  const [section, key] = path.split('.');
  return (draft[section as keyof CharacterDraft] as unknown as Record<string, unknown>)[key];
}
function writeInput(draft: CharacterDraft, path: string, value: unknown) {
  if (!paths.has(path))
    throw new GenerationConflict(`Unknown generation input: ${path}`);
  if (path.startsWith('attribute.')) {
    draft.intrinsics.attributes = draft.intrinsics.attributes.filter(a => a.name !== path.slice(10));
    if (value)
      draft.intrinsics.attributes.push(structuredClone(value) as CharacterDraft['intrinsics']['attributes'][number]);
  }
  else {
    const [section, key] = path.split('.');
    (draft[section as keyof CharacterDraft] as unknown as Record<string, unknown>)[key] = structuredClone(value);
  }
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function assertLocks(before: CharacterDraft, after: CharacterDraft) {
  const changed = creationContext(before).locks.filter(path => !equal(readInput(before, path), readInput(after, path)));
  if (changed.length)
    throw new GenerationConflict(`Generation conflicts with locked ${changed.map(inputLabel).join(', ')}. Adjust the concept or unlock these inputs.`);
}
export type MechanicalPreset = {
  id: string;
  version: 1;
  name: string;
  tags: string[];
  tradeId: string;
  specializationId: string | null;
};
// Stable UUIDs are independent of display labels and catalog ordering.
const tradeIds: Record<string, string> = { Academic: '01', Cleric: '02', Entertainer: '03', Knight: '04', Mariner: '05', Merchant: '06', Rabble: '07', Ranger: '08', Rogue: '09', Service: '0a', Warrior: '0b', Wizard: '0c' };
export function mechanicalPresets(data: StaticData): MechanicalPreset[] {
  return data.tradePackages.filter(pkg => tradeIds[pkg.trade]).map<MechanicalPreset>(pkg => ({ id: `7ed05401-4341-4a30-8c01-0000000000${tradeIds[pkg.trade] ?? '0c'}`, version: 1 as const, name: pkg.trade, tags: [pkg.trade, 'Rank 1'], tradeId: makeCatalogId('trade', pkg.trade), specializationId: null })).concat(data.tradePackages.some(pkg => pkg.trade === 'Wizard' && pkg.specializations.some(s => s.name === 'Necromancer')) ? [{ id: '7ed05401-4341-4a30-8c01-00000000000d', version: 1 as const, name: 'Wizard > Necromancer', tags: ['Wizard', 'Necromancer', 'Rank 1'], tradeId: makeCatalogId('trade', 'Wizard'), specializationId: makeCatalogId('specialization', 'Wizard-Necromancer') }] : []);
}
export type PresetOptions = {
  presetId: string;
  speciesId?: string;
  lineageId?: string;
};
export type GenerationEligibility = (kind: 'preset' | 'region' | 'settlement' | 'species' | 'lineage' | 'trade' | 'specialization', id: string) => boolean;
const allowEverything: GenerationEligibility = () => true;
function randomStream(seed: number, sequence: number) {
  let position = sequence;
  return { next: () => { let t = (seed + Math.imul(++position, 0x6D2B79F5)) | 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }, position: () => position };
}
export function generatePreset(before: CharacterDraft, data: StaticData, options: PresetOptions, eligible: GenerationEligibility = allowEverything): CharacterDraft {
  const context = creationContext(before);
  const preset = mechanicalPresets(data).find(p => p.id === options.presetId);
  if (!preset || !eligible('preset', preset.id))
    throw new GenerationConflict('This preset is unavailable in this campaign.');
  if (before.intrinsics.attributeMethod === 'imported')
    throw new GenerationConflict('Imported attributes require review. Choose a native attribute creation method before using presets.');
  const rng = randomStream(context.seed, context.sequence);
  const pick = <T,>(values: T[]): T => { if (!values.length)
    throw new GenerationConflict('No eligible options remain for this concept and campaign.'); return values[Math.floor(rng.next() * values.length)]; };
  const locked = new Set(context.locks);
  const restore = (draft: CharacterDraft) => { for (const path of locked)
    writeInput(draft, path, readInput(before, path)); return draft; };
  const assign = (draft: CharacterDraft, path: string, value: unknown) => {
    if (locked.has(path) && !equal(readInput(before, path), value))
      throw new GenerationConflict(`The preset conflicts with locked ${inputLabel(path)}. Change the preset or unlock this input.`);
    writeInput(draft, path, value);
  };
  let next = createEmptyCharacterDraft();
  // Preserve identity, authored material and possessions; presets replace generated choices.
  next = { ...next, characterId: before.characterId, campaignId: before.campaignId, finances: structuredClone(before.finances), utilities: { ...structuredClone(before.utilities), name: '', properName: '', nameLanguageId: before.utilities.nameLanguageId, nameStyle: before.utilities.nameStyle } };
  restore(next);
  next.intrinsics.attributeMethod = before.intrinsics.attributeMethod ?? 'roll';
  next.intrinsics.attributeArrayId = before.intrinsics.attributeArrayId;
  assign(next, 'intrinsics.tradeId', preset.tradeId);
  assign(next, 'intrinsics.tradeRank', 1);
  const pkg = getTradePackage(next, data);
  if (!pkg || !eligible('trade', preset.tradeId))
    throw new GenerationConflict('This Trade is unavailable.');
  const specializationId = preset.specializationId ?? (locked.has('intrinsics.specializationId') ? before.intrinsics.specializationId : (pkg.specializations.length ? makeCatalogId('specialization', `${pkg.trade}-${pick(pkg.specializations.filter(s => eligible('specialization', makeCatalogId('specialization', `${pkg.trade}-${s.name}`)))).name}`) : null));
  assign(next, 'intrinsics.specializationId', specializationId);
  if (pkg.specializations.length ? (!specializationId || !pkg.specializations.some(s => makeCatalogId('specialization', `${pkg.trade}-${s.name}`) === specializationId) || !eligible('specialization', specializationId)) : specializationId !== null)
    throw new GenerationConflict('The locked Profession does not belong to the chosen Trade or is unavailable.');
  const groups = data.species.filter(f => f.selectable).flatMap(f => f.groups.filter(g => g.selectable && eligible('species', g.catalogId) && (!(options.lineageId || (locked.has('intrinsics.lineageId') && before.intrinsics.lineageId)) || g.lineages.some(l => makeCatalogId('lineage', l) === (options.lineageId || before.intrinsics.lineageId)))).map(g => ({ f, g })));
  const speciesId = options.speciesId || (locked.has('intrinsics.speciesId') ? before.intrinsics.speciesId : pick(groups).g.catalogId);
  const species = groups.find(({ g }) => g.catalogId === speciesId);
  if (!species)
    throw new GenerationConflict('Choose an available Ancestral Group.');
  assign(next, 'intrinsics.speciesFamilyId', species.f.catalogId);
  assign(next, 'intrinsics.speciesId', species.g.catalogId);
  const lineageId = options.lineageId || (locked.has('intrinsics.lineageId') ? before.intrinsics.lineageId : makeCatalogId('lineage', pick(species.g.lineages.filter(l => eligible('lineage', makeCatalogId('lineage', l))))));
  assign(next, 'intrinsics.lineageId', lineageId);
  if (!species.g.lineages.some(l => makeCatalogId('lineage', l) === lineageId) || !lineageId || !eligible('lineage', lineageId))
    throw new GenerationConflict('The locked Lineage is incompatible with this Ancestral Group.');
  if (next.intrinsics.childOfStrife)
    throw new GenerationConflict('Child of Strife presets need a verified pairing configuration. Use the existing editor for this character.');
  const regionId = locked.has('background.regionId') ? before.background.regionId : pick(data.empires.filter(r => eligible('region', r.catalogId) && (!locked.has('background.settlementId') || settlementOptionsForRegion(r.name, data).some(s => s.id === before.background.settlementId)))).catalogId;
  const region = data.empires.find(r => r.catalogId === regionId);
  if (!region || !eligible('region', region.catalogId))
    throw new GenerationConflict('The locked region is unavailable.');
  assign(next, 'background.regionId', region.catalogId);
  const settlements = settlementOptionsForRegion(region.name, data).filter(s => eligible('settlement', s.id));
  const settlementId = locked.has('background.settlementId') ? before.background.settlementId : pick(settlements).id;
  if (!settlements.some(s => s.id === settlementId))
    throw new GenerationConflict('The locked settlement is outside the selected region or is unavailable. Lock its region too, or change the origin.');
  assign(next, 'background.settlementId', settlementId);
  const step = (name: string) => { next = restore(generateStep(name, next, data, rng.next)); };
  step('background-demographics');
  if (!locked.has('background.geneticallyFemale'))
    next.background.geneticallyFemale = next.background.sex === 'Female';
  if (next.background.geneticallyFemale && !locked.has('background.sex') && next.background.sex === 'Male')
    next.background.sex = 'Female';
  if (!locked.has('background.ageGroup'))
    next.background.ageGroup = pkg.minimumAgeGroup;
  if (!locked.has('background.ageYears'))
    next.background.ageYears = null;
  const ageTrack = data.ageBrackets[species.g.name as keyof StaticData['ageBrackets']];
  if (locked.has('background.ageYears') && !locked.has('background.ageGroup') && next.background.ageYears != null) {
    next.background.ageGroup = [...ageTrack].reverse().find(entry => next.background.ageYears! >= entry.age)?.group ?? null;
  }
  next = normalizeGeneratedDraft(next, data);
  const ageIndex = ageTrack.findIndex(entry => entry.group === next.background.ageGroup);
  if (ageIndex < 0 || next.background.ageYears == null || next.background.ageYears < ageTrack[ageIndex].age || (ageTrack[ageIndex + 1] && next.background.ageYears >= ageTrack[ageIndex + 1].age))
    throw new GenerationConflict('Locked age and Age Group do not agree for this Ancestral Group.');
  const socialRanks = data.socialRanks.filter(rank => (!locked.has('background.socialRankId') || rank.catalogId === before.background.socialRankId) &&
    (!locked.has('background.socialRank') || rank.socialRank === before.background.socialRank) &&
    (!locked.has('background.socialRankTitle') || socialRankTitleOptions(rank, next.background.gender).includes(before.background.socialRankTitle ?? '')));
  const social = pick(socialRanks);
  next.background.socialRankId = social.catalogId;
  next.background.socialRank = social.socialRank;
  next.background.socialRankTitle = locked.has('background.socialRankTitle') ? before.background.socialRankTitle : defaultSocialRankTitle(social, next.background.gender);
  for (const name of ['background-heritage', 'background-personality', 'background-tragedy-seed', 'background-disabilities', 'background-belief-worship'])
    step(name);
  const allowed = allowedEnvironNames(next, data);
  const environ = data.heritagePackages.find(p => p.id === next.background.environHeritageId);
  if (!environ || (allowed.length && !allowed.includes(environ.name)))
    throw new GenerationConflict('The locked Environs Heritage is incompatible with the origin.');
  const method = next.intrinsics.attributeMethod ?? 'roll';
  for (let attempt = 0; attempt < 128; attempt++) {
    if (method === 'array') {
      const arrayId = next.intrinsics.attributeArrayId ?? 'A';
      const pool = [...data.attributeArrays[arrayId]];
      const lockedValues = new Map<RolledAttribute, number>();
      for (const attribute of ROLLED_ATTRIBUTES)
        if (locked.has(`attribute.${attribute}`)) {
          const value = before.intrinsics.attributes.find(a => a.name === attribute)?.base;
          const index = value == null ? -1 : pool.indexOf(value);
          if (index < 0)
            throw new GenerationConflict('Locked attribute rolls do not fit the selected array.');
          lockedValues.set(attribute, pool.splice(index, 1)[0]);
        }
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      next = setAttributeBaseValues(next, method, Object.fromEntries(ROLLED_ATTRIBUTES.map(a => [a, lockedValues.get(a) ?? pool.pop()!])) as Record<RolledAttribute, number>, arrayId);
    }
    else if (method === 'point-buy') {
      const values = Object.fromEntries(ROLLED_ATTRIBUTES.map(a => [a, locked.has(`attribute.${a}`) ? before.intrinsics.attributes.find(entry => entry.name === a)?.base ?? 6 : 6])) as Record<RolledAttribute, number>;
      const cost = (v: number) => data.pointBuyCosts.find(c => c.value === v)?.cost ?? Infinity;
      for (let n = 0; n < 60; n++) {
        const critical = ROLLED_ATTRIBUTES.filter(a => pkg.criticalAttributes.includes(a));
        const a = pick(n < 30 && critical.length ? critical : [...ROLLED_ATTRIBUTES]);
        if (!locked.has(`attribute.${a}`) && values[a] < 12 && Object.values(values).reduce((sum, v) => sum + cost(v), 0) + cost(values[a] + 1) - cost(values[a]) <= 75)
          values[a]++;
      }
      next = setAttributeBaseValues(next, method, values);
    }
    else
      next = generateStep('intrinsics-attributes', next, data, rng.next);
    next = normalizeGeneratedDraft(restore(next), data);
    const candidate = tradeCandidacy(next, data);
    const arrayValid = method !== 'array' || equal(next.intrinsics.attributes.map(a => a.base).sort((a, b) => a - b), [...data.attributeArrays[next.intrinsics.attributeArrayId ?? 'A']].sort((a, b) => a - b));
    if (candidate.eligible && candidate.ageEligible && arrayValid && assessIntrinsicStep('intrinsics-attributes', next, data).status === 'complete')
      break;
    if (attempt === 127)
      throw new GenerationConflict(`No eligible ${pkg.trade} found with these inputs after 128 attempts. Review locked attributes, age, and creation method. Candidacy: ${candidate.formula ?? 'unavailable'}. No changes applied.`);
  }
  for (const name of ['intrinsics-zed', 'proficiencies-pml', 'proficiencies-granted-skills-traits-talents', 'proficiencies-languages', 'properties-calculations', 'utilities-name'])
    step(name);
  next = normalizeGeneratedDraft(next, data);
  assertLocks(before, next);
  for (const name of ['background-demographics', 'background-heritage', 'background-disabilities', 'background-belief-worship']) {
    const assessment = assessBackgroundStep(name, next, data);
    if (assessment.status !== 'complete')
      throw new GenerationConflict(assessment.messages.join(' '));
  }
  if (next.background.sex === 'Male' && next.background.geneticallyFemale)
    throw new GenerationConflict('Locked Female Differentiation conflicts with the generated Sex. Lock a compatible Sex or unlock Female Differentiation.');
  if (!getSpeciesChoice(next, data) || !getLineageName(next, data))
    throw new GenerationConflict('The generated lineage could not be resolved.');
  next.creation = { ...context, presetId: preset.id, sequence: rng.position() };
  return next;
}
/** Per-character seed; no reads/writes to shared Administrator random state. */
export function seedForCharacter(id: string, administratorSeed = 0) {
  let seed = 2166136261 ^ administratorSeed;
  for (const char of id)
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return seed >>> 0;
}
export function generateLockedStep(step: string, before: CharacterDraft, data: StaticData): CharacterDraft {
  const context = creationContext(before);
  const inputs: Record<string, string[]> = {
    'background-region-settlement': LOCK_SECTIONS.Origin,
    'background-demographics': LOCK_SECTIONS.Demographics,
    'background-heritage': LOCK_SECTIONS.Heritage,
    'intrinsics-species': LOCK_SECTIONS.Lineage,
    'intrinsics-attributes': LOCK_SECTIONS.Attributes,
    'intrinsics-trade-specialization': LOCK_SECTIONS.Profession,
    'utilities-name': LOCK_SECTIONS.Name,
  };
  if (inputs[step]?.every(path => context.locks.includes(path)))
    return before;
  return withCharacterRandom(before, data, (candidate, random) => generateStep(step, candidate, data, random), true);
}
/** Explicit manual choices may change locked inputs; random generation must preserve them. */
export function withCharacterRandom(before: CharacterDraft, data: StaticData, transform: (candidate: CharacterDraft, random: () => number) => CharacterDraft, respectLocks = false): CharacterDraft {
  const context = creationContext(before);
  const rng = randomStream(context.seed, context.sequence);
  let next = transform(structuredClone(before), rng.next);
  if (respectLocks)
    for (const path of context.locks)
      writeInput(next, path, readInput(before, path));
  next = normalizeGeneratedDraft(next, data);
  if (respectLocks)
    assertLocks(before, next);
  if (equal({ ...before, updatedAt: null }, { ...next, updatedAt: null }))
    return before;
  return { ...next, creation: { ...context, sequence: rng.position() } };
}
