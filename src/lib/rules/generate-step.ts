import type { StaticData } from '@/data';
import { makeCatalogId } from '@/data/catalog-policy';
import type { CharacterDraft, SourcedSelection } from '@/lib/character-draft';
import { getAgeInYears, resolveTragedySeed } from '@/lib/character-logic';
import { syncHeritageGrantedSelections, requiredDisabilityCount } from './background';
import { affinityCandidates, getTradePackage, setAttributeBaseValues, syncIntrinsics, type RolledAttribute, ROLLED_ATTRIBUTES } from './intrinsics';
import { addAdditionalSkill, setCoreLanguage, setGrantSpecializationRanks, setPml, specializationOptionsForTrait } from './proficiencies';
import { effectiveTraitLevel, syncProperties } from './properties';
import { addInventoryItem, generateCharacterName, personalWealthGp, startingGearTotals, suggestedNameLanguageId, toggleMagicItem, toggleSpell } from './utilities';

function d6() { return 1 + Math.floor(Math.random() * 6); }
function d66() { return d6() * 10 + d6(); }
function pick<T>(values: readonly T[]): T | null { return values.length ? values[Math.floor(Math.random() * values.length)] ?? null : null; }
function highTwo() { return [d6(), d6(), d6()].sort((a,b) => b-a).slice(0,2).reduce((a,b) => a+b,0); }

function d66AgeGroup(data: StaticData) {
  const roll = d66();
  return data.ageGroups.find((entry) => {
    const source = String(entry.d66 ?? '');
    if (!/\d/.test(source)) return false;
    const [lo, hi = lo] = source.split('-').map(Number);
    return roll >= lo && roll <= hi;
  })?.ageGroup ?? 'Youth';
}

export function canGenerateStep(stepValue: string, draft: CharacterDraft, data: StaticData) {
  if (stepValue === 'utilities-relationships') return false;
  if (stepValue === 'utilities-spells') return effectiveTraitLevel(draft, 'v-Magic') > 0;
  return Boolean(data);
}

export function generateStep(stepValue: string, draft: CharacterDraft, data: StaticData): CharacterDraft {
  if (stepValue === 'background-region-settlement') {
    const region = pick(data.empires); if (!region) return draft;
    const names = data.settlements[region.name as keyof typeof data.settlements] ?? [];
    const settlement = pick(names);
    return syncIntrinsics({ ...draft, background: { ...draft.background, regionId: region.catalogId, settlementId: settlement ? makeCatalogId('settlement', `${region.name}-${settlement}`) : null } }, data);
  }
  if (stepValue === 'background-demographics') {
    const sexRoll = Math.floor(Math.random() * 100) + 1;
    const sex: CharacterDraft['background']['sex'] = sexRoll === 100 ? 'Intersex' : sexRoll <= 50 ? 'Female' : 'Male';
    const gender: CharacterDraft['background']['gender'] = pick(['Male','Female','Non-binary'] as const) ?? 'Male';
    const ageGroup = d66AgeGroup(data);
    const speciesGroup = data.species.flatMap((family) => family.groups).find((group) => group.catalogId === draft.intrinsics.speciesId);
    const ageYears = speciesGroup?.hasAgeBrackets
      ? getAgeInYears(speciesGroup.name as keyof StaticData['ageBrackets'], ageGroup, data.ageBrackets, data.ageGroups)
      : null;
    return syncIntrinsics(
      syncHeritageGrantedSelections({ ...draft, background: { ...draft.background, sex, gender, geneticallyFemale: sex === 'Female', handedness: Math.random() < 0.15 ? 'Left' : 'Right', ageGroup, ageYears, birthMonth: 1 + Math.floor(Math.random() * 12) } }, data),
      data,
    );
  }
  if (stepValue === 'background-heritage') {
    const culture = pick(data.heritagePackages.filter((p) => p.kind === 'culture'));
    const environs = pick(data.heritagePackages.filter((p) => p.kind === 'environs'));
    const society = pick(data.heritagePackages.filter((p) => p.kind === 'society'));
    return syncIntrinsics(syncHeritageGrantedSelections({ ...draft, background: { ...draft.background, culturalHeritageId: culture?.id ?? null, environHeritageId: environs?.id ?? null, societalHeritageId: society?.id ?? null } }, data), data);
  }
  if (stepValue === 'background-social-rank') {
    const rank = pick(data.socialRanks); if (!rank) return draft;
    return syncIntrinsics({ ...draft, background: { ...draft.background, socialRankId: rank.catalogId, socialRank: rank.socialRank } }, data);
  }
  if (stepValue === 'background-personality') {
    const row = data.descriptors.find((entry) => Number(entry.d66) === d66()) ?? pick(data.descriptors); if (!row) return draft;
    const ones = d6(); const band = ones <= 2 ? '1,2' : ones <= 4 ? '3,4' : '5,6'; const name = String(row[band as keyof typeof row] ?? ''); if (!name) return draft;
    const selection: SourcedSelection = { id: makeCatalogId('personality', name), name, source: 'player', sourceDetail: `Descriptor ${row.d66}/${band}`, level: 1 };
    return { ...draft, background: { ...draft.background, personality: [selection] } };
  }
  if (stepValue === 'background-tragedy-seed') {
    const seed = pick(data.tragedySeeds); if (!seed) return draft;
    return { ...draft, background: { ...draft.background, tragedySeedId: seed.catalogId, tragedySeedText: resolveTragedySeed(seed.seed, data.randomPersonItemDeity) } };
  }
  if (stepValue === 'background-disabilities') {
    const count = requiredDisabilityCount(draft, data); const used = new Set<string>(); const selections: SourcedSelection[] = [];
    for (let i=0;i<count;i++) { let item = data.disabilities.find((entry) => Number(entry.d66) === d66() && !used.has(entry.catalogId)) ?? pick(data.disabilities.filter((entry) => !used.has(entry.catalogId))); if (!item) break; used.add(item.catalogId); selections.push({ id:item.catalogId, catalogId:item.catalogId, name:item.disability, source:'player', sourceDetail:`D66 ${item.d66}`, level:1 }); }
    return { ...draft, background: { ...draft.background, disabilities: selections, disabilitiesReviewed: true } };
  }
  if (stepValue === 'background-belief-worship') {
    const belief = pick(data.beliefs); if (!belief) return draft;
    const deity = belief.isDeity ? pick(data.deities) : null;
    return { ...draft, background: { ...draft.background, beliefId: belief.catalogId, deityId: deity?.catalogId ?? null } };
  }
  if (stepValue === 'intrinsics-species') {
    const family = data.species.find((entry) => entry.selectable); const group = family ? pick(family.groups.filter((entry) => entry.selectable)) : null; if (!family || !group) return draft; const lineage = pick(group.lineages);
    return syncIntrinsics({ ...draft, intrinsics: { ...draft.intrinsics, speciesFamilyId: family.catalogId, speciesId: group.catalogId, lineageId: lineage ? makeCatalogId('lineage', lineage) : null }, background: { ...draft.background, ageYears: null } }, data);
  }
  if (stepValue === 'intrinsics-attributes') {
    const values = Object.fromEntries(ROLLED_ATTRIBUTES.map((attribute) => [attribute, highTwo()])) as Record<RolledAttribute, number>;
    return syncIntrinsics(setAttributeBaseValues(draft, 'roll', values), data);
  }
  if (stepValue === 'intrinsics-trade-specialization') {
    const pkg = pick(data.tradePackages); if (!pkg) return draft; const spec = pick(pkg.specializations);
    return syncIntrinsics({ ...draft, intrinsics: { ...draft.intrinsics, tradeId: makeCatalogId('trade', pkg.trade), specializationId: spec ? makeCatalogId('specialization', `${pkg.trade}-${spec.name}`) : null, tradeRank: 1, affinityAttribute: null } }, data);
  }
  if (stepValue === 'intrinsics-zed') {
    const candidates = affinityCandidates(draft, data); const affinity = pick(candidates); return syncIntrinsics({ ...draft, intrinsics: { ...draft.intrinsics, affinityAttribute: affinity } }, data);
  }
  if (stepValue === 'intrinsics-wealth') return syncIntrinsics(draft, data);
  if (stepValue === 'proficiencies-pml') return setPml(draft, 1, data);
  if (stepValue === 'proficiencies-skills-abilities-talents') {
    let next = draft;
    for (const selection of draft.proficiencies.granted) { const options = specializationOptionsForTrait(selection, next, data); if (selection.name.includes(' > ') && options.length) { const choice = pick(options); if (choice) next = setGrantSpecializationRanks(next, selection.id, { [choice]: 1 }); } }
    return next;
  }
  if (stepValue === 'proficiencies-additional-skills') {
    const trait = pick(data.traits.filter((entry) => !entry.isDisability && Number(entry.im) > 0)); return trait ? addAdditionalSkill(draft, trait.catalogId, data) : draft;
  }
  if (stepValue === 'proficiencies-languages') {
    const language = pick(data.languages); return language ? setCoreLanguage(draft, 'heritage', language.id, data) : draft;
  }
  if (stepValue === 'properties-height-weight' || stepValue === 'properties-calculations') return syncProperties(draft, data);
  if (stepValue === 'utilities-spells') { const selected = new Set(draft.utilities.spells.map((item) => item.id)); const spell = pick(data.spells.filter((item) => !selected.has(item.catalogId))); return spell ? toggleSpell(draft, spell.catalogId, data) : draft; }
  if (stepValue === 'utilities-starting-gear') {
    const budget = personalWealthGp(draft, data); const spent = startingGearTotals(draft).costGp; const remaining = budget == null ? Infinity : Math.max(0, budget - spent);
    const candidates = data.itemEquipments.filter((item) => Number(item.priceGp) <= remaining); const item = pick(candidates); return item ? addInventoryItem(draft, 'equipment', item.catalogId, data) : draft;
  }
  if (stepValue === 'utilities-magic-items') { const selected = new Set(draft.utilities.magicItems.map((item) => item.id)); const item = pick(data.magicItems.filter((entry) => !selected.has(entry.catalogId))); return item ? toggleMagicItem(draft, item.catalogId, data) : draft; }
  if (stepValue === 'utilities-name') { const languageId = draft.utilities.nameLanguageId ?? suggestedNameLanguageId(draft, data); if (!languageId) return draft; const name = generateCharacterName(languageId, draft.utilities.nameStyle, data); return name ? { ...draft, utilities: { ...draft.utilities, nameLanguageId: languageId, properName: name, name: draft.utilities.name || name } } : draft; }
  return draft;
}
