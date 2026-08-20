import type { StaticData } from '@/data';
import { makeCatalogId } from '@/data/catalog-policy';
import type { CharacterDraft, SourcedSelection } from '@/lib/character-draft';
import { resolveTragedySeed } from '@/lib/character-logic';
import { defaultSocialRankTitle, syncHeritageGrantedSelections, requiredDisabilityCount } from './background';
import { affinityCandidates, getTradePackage, setAttributeBaseValues, startingAgeForDraft, syncIntrinsics, type RolledAttribute, ROLLED_ATTRIBUTES } from './intrinsics';
import { addAdditionalSkill, setCoreLanguage, setGrantSpecialization, setGrantSpecializationRanks, setPml, specializationRequirement } from './proficiencies';
import { effectiveTraitLevel, syncProperties } from './properties';
import { generateCharacterName, suggestedNameLanguageId, toggleMagicItem, toggleSpell } from './utilities';
import { allowedEnvironNames, selectedSettlementOption, settlementCatalogId, weightedSettlementPick } from '@/lib/settlement-context';
import { nextGlobalRandom } from '@/lib/admin-settings';

function d6() { return 1 + Math.floor(nextGlobalRandom() * 6); }
function d66() { return d6() * 10 + d6(); }
function pick<T>(values: readonly T[]): T | null { return values.length ? values[Math.floor(nextGlobalRandom() * values.length)] ?? null : null; }
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
  if (stepValue === 'utilities-relationships' || stepValue === 'utilities-starting-gear' || stepValue === 'proficiencies-imported-traits-skills-talents' || stepValue.startsWith('customize-') || stepValue === 'notes-overview' || stepValue === 'notes-portrait') return false;
  if (stepValue === 'utilities-spells') return effectiveTraitLevel(draft, 'v-Magic') > 0;
  if (stepValue === 'background-heritage') return Boolean(draft.background.regionId && draft.background.settlementId);
  return Boolean(data);
}

export function generateStep(stepValue: string, draft: CharacterDraft, data: StaticData): CharacterDraft {
  if (stepValue === 'background-region-settlement') {
    const region = pick(data.empires); if (!region) return draft;
    const settlement = weightedSettlementPick(region.name, data, nextGlobalRandom);
    const next = {
      ...draft,
      background: {
        ...draft.background,
        regionId: region.catalogId,
        settlementId: settlement ? settlementCatalogId(region.name, settlement.name) : null,
        environHeritageId: null,
      },
      proficiencies: {
        ...draft.proficiencies,
        languages: draft.proficiencies.languages.filter((language) => language.kind !== 'default'),
      },
    };
    return syncIntrinsics(syncHeritageGrantedSelections(next, data), data);
  }
  if (stepValue === 'background-demographics') {
    const sexRoll = Math.floor(nextGlobalRandom() * 100) + 1;
    const sex: CharacterDraft['background']['sex'] = sexRoll === 100 ? 'Intersex' : sexRoll <= 50 ? 'Female' : 'Male';
    const gender: CharacterDraft['background']['gender'] = pick(['Male','Female','Non-binary'] as const) ?? 'Male';
    const ageGroup = d66AgeGroup(data);
    const notable = data.notableFeatures.find((entry) => Number(entry.d66) === d66()) ?? pick(data.notableFeatures);
    const blemishRow = data.physicalBlemishes.find((entry) => Number(entry.d66) === d66()) ?? pick(data.physicalBlemishes);
    const blemishBand = d6() <= 3 ? '1,2,3' : '4,5,6';
    const blemish = blemishRow ? String(blemishRow[blemishBand as keyof typeof blemishRow] ?? '') : '';
    const demographicSelections: SourcedSelection[] = [
      notable ? { id: makeCatalogId('notable-feature', notable.feature), name: notable.feature, source: 'rule', sourceDetail: `Notable feature D66 ${notable.d66}`, level: 1 } : null,
      blemish ? { id: makeCatalogId('physical-blemish', blemish), name: blemish, source: 'rule', sourceDetail: `Physical blemish D66 ${blemishRow?.d66}/${blemishBand}`, level: 1 } : null,
    ].filter(Boolean) as SourcedSelection[];
    const withDemographics: CharacterDraft = { ...draft, intrinsics: { ...draft.intrinsics, strifeBonusParent: draft.intrinsics.childOfStrife ? (nextGlobalRandom() < 0.5 ? 'father' : 'mother') : draft.intrinsics.strifeBonusParent }, background: { ...draft.background, demographicSelections, sex, gender, geneticallyFemale: sex === 'Female', handedness: nextGlobalRandom() < 0.15 ? 'Left' : 'Right', ageGroup, ageYears: null, birthMonth: 1 + Math.floor(nextGlobalRandom() * 12) } };
    const ageYears = startingAgeForDraft(withDemographics, data);
    return syncIntrinsics(
      syncHeritageGrantedSelections({ ...withDemographics, background: { ...withDemographics.background, ageYears } }, data),
      data,
    );
  }
  if (stepValue === 'background-heritage') {
    if (!draft.background.regionId || !draft.background.settlementId) return draft;
    const settlement = selectedSettlementOption(draft, data);
    const allowedEnvirons = new Set(allowedEnvironNames(draft, data));
    const culturePool = settlement?.cultureRecommendations.length
      ? data.heritagePackages.filter((p) => p.kind === 'culture' && settlement.cultureRecommendations.includes(p.name))
      : data.heritagePackages.filter((p) => p.kind === 'culture');
    const societyPool = settlement?.societyRecommendations.length
      ? data.heritagePackages.filter((p) => p.kind === 'society' && settlement.societyRecommendations.includes(p.name))
      : data.heritagePackages.filter((p) => p.kind === 'society');
    const environPool = data.heritagePackages.filter((p) => p.kind === 'environs' && (!allowedEnvirons.size || allowedEnvirons.has(p.name)));
    const culture = pick(culturePool);
    const environs = pick(environPool);
    const society = pick(societyPool);
    return syncIntrinsics(syncHeritageGrantedSelections({ ...draft, background: { ...draft.background, culturalHeritageId: culture?.id ?? null, environHeritageId: environs?.id ?? null, societalHeritageId: society?.id ?? null } }, data), data);
  }
  if (stepValue === 'background-social-rank') {
    const rank = pick(data.socialRanks); if (!rank) return draft;
    const title = defaultSocialRankTitle(rank, draft.background.gender);
    return syncIntrinsics({ ...draft, background: { ...draft.background, socialRankId: rank.catalogId, socialRank: rank.socialRank, socialRankTitle: title } }, data);
  }
  if (stepValue === 'background-personality') {
    const row = data.descriptors.find((entry) => Number(entry.d66) === d66()) ?? pick(data.descriptors); if (!row) return draft;
    const ones = d6(); const band = ones <= 2 ? '1,2' : ones <= 4 ? '3,4' : '5,6'; const name = String(row[band as keyof typeof row] ?? ''); if (!name) return draft;
    const selection: SourcedSelection = { id: makeCatalogId('personality', name), name, source: 'player', sourceDetail: `Descriptor ${row.d66}/${band}`, level: 1 };
    return { ...draft, background: { ...draft.background, personality: [selection] } };
  }
  if (stepValue === 'background-tragedy-seed') {
    const seed = pick(data.tragedySeeds); if (!seed) return draft;
    return { ...draft, background: { ...draft.background, tragedySeedId: seed.catalogId, tragedySeedText: resolveTragedySeed(seed.seed, data.randomPersonItemDeity, nextGlobalRandom) } };
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
    if (draft.intrinsics.childOfStrife) {
      const rolls = Object.fromEntries([...ROLLED_ATTRIBUTES, 'MOV', 'ZED'].map((attribute) => [attribute, d6()]));
      return syncIntrinsics({ ...draft, intrinsics: { ...draft.intrinsics, strifeAttributeRolls: rolls, strifeBonusParent: nextGlobalRandom() < 0.5 ? 'father' : 'mother' }, background: { ...draft.background, ageYears: null } }, data);
    }
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
  if (stepValue === 'proficiencies-granted-skills-traits-talents') {
    let next = draft;
    for (const selection of draft.proficiencies.granted) {
      const requirement = specializationRequirement(selection, next, data);
      if (requirement.qualifierRequired && requirement.qualifierOptions.length) {
        const qualifier = pick(requirement.qualifierOptions);
        if (qualifier) next = setGrantSpecialization(next, selection.id, qualifier);
      }
      if (requirement.specializationMinimum > 0 && requirement.specializationOptions.length) {
        const ranks: Record<string, number> = {};
        for (let index = 0; index < requirement.specializationMinimum; index += 1) {
          const choice = pick(requirement.specializationOptions);
          if (choice) ranks[choice] = (ranks[choice] ?? 0) + 1;
        }
        next = setGrantSpecializationRanks(next, selection.id, ranks);
      }
    }
    return next;
  }
  if (stepValue === 'proficiencies-additional-traits-skills') {
    const trait = pick(data.traits.filter((entry) => !entry.isDisability && Number(entry.im) > 0)); return trait ? addAdditionalSkill(draft, trait.catalogId, data) : draft;
  }
  if (stepValue === 'proficiencies-languages') {
    const language = pick(data.languages); return language ? setCoreLanguage(draft, 'heritage', language.id, data) : draft;
  }
  if (stepValue === 'properties-height-weight' || stepValue === 'properties-calculations') return syncProperties(draft, data);
  if (stepValue === 'utilities-spells') { const selected = new Set(draft.utilities.spells.map((item) => item.id)); const spell = pick(data.spells.filter((item) => !selected.has(item.catalogId))); return spell ? toggleSpell(draft, spell.catalogId, data) : draft; }
  if (stepValue === 'utilities-magic-items') { const selected = new Set(draft.utilities.magicItems.map((item) => item.id)); const item = pick(data.magicItems.filter((entry) => !selected.has(entry.catalogId))); return item ? toggleMagicItem(draft, item.catalogId, data) : draft; }
  if (stepValue === 'utilities-name') { const languageId = draft.utilities.nameLanguageId ?? suggestedNameLanguageId(draft, data); if (!languageId) return draft; const name = generateCharacterName(languageId, draft.utilities.nameStyle, data, nextGlobalRandom); return name ? { ...draft, utilities: { ...draft.utilities, nameLanguageId: languageId, properName: name, name: draft.utilities.name || name } } : draft; }
  return draft;
}
