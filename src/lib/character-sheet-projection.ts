import type { StaticData } from '@/data';
import type { CharacterDraft, SourcedSelection } from '@/lib/character-draft';
import { getAttributeDm } from '@/lib/character-logic';
import {
  getFinalAttributeValue,
  getLineageName,
  getSpeciesChoice,
  getTradePackage,
  getTradeSpecialization,
  getStrifePairing,
} from '@/lib/rules/intrinsics';
import { geographicRegionName, regionByDraft, selectedSettlementDisplayName } from '@/lib/settlement-context';
import {
  compressedCapabilities,
  formatLanguageRecord,
  specializationOptionsForTrait,
  specializationRanksForSelection,
  traitDefinitionForSelection,
} from '@/lib/rules/proficiencies';
import { calculateProperties } from '@/lib/rules/properties';
import { displayInventoryQuantity, displaySpellName, magicItemInventoryForm } from '@/lib/rules/utilities';

export type CharacterSheetData = {
  name: string;
  properName: string;
  affinityAttribute?: string | null;
  details: { environ: string; species: string; bio: string; physique: string };
  pml: number;
  attributes: Array<{ name: string; value: number; modifier: string }>;
  background: {
    profession: string[];
    settlement: string[];
    religion: string[];
    personality: string;
    notableFeatures: string[];
  };
  history: {
    equipment: string;
    weapons: string;
    armor: string;
    magicItems: string;
    spells?: string;
    skills: string;
    traits: string;
    skillsUnresolved: boolean;
    traitsUnresolved: boolean;
    skillTerms: Array<{ text: string; unresolved: boolean }>;
    traitTerms: Array<{ text: string; unresolved: boolean }>;
    languages: string;
  };
  performance: Array<{ name: string; value: number }>;
  concerns: Array<{ name: string; value: number }>;
  miscellaneous: Array<{ name: string; value: number }>;
  combat: Array<{ name: string; value: string }>;
};

const ATTRIBUTE_ORDER = ['CCA', 'RCA', 'REF', 'INT', 'KNO', 'PRE', 'POW', 'STR', 'FOR', 'MOV', 'SIZ', 'ZED'] as const;

function signed(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

function listInventory(items: CharacterDraft['utilities']['equipment']) {
  const grouped = new Map<string, number>();
  for (const item of items) {
    const name = item.name;
    grouped.set(name, (grouped.get(name) ?? 0) + Math.max(1, item.quantity));
  }
  return [...grouped].map(([name, quantity]) => displayInventoryQuantity(name, quantity)).join('; ');
}

function selectionRecord(selection: SourcedSelection) {
  const name = selection.name.split(' > ')[0].replace(/\s+X$/, '');
  const level = Math.max(1, selection.level ?? 1);
  const specialization = selection.specialization?.trim();
  return `${name} ${level}${specialization ? ` > ${specialization}` : ''}`;
}

function projectedCapabilities(draft: CharacterDraft, data: StaticData) {
  const capabilities = compressedCapabilities(draft, data);
  const isTraitOrTalent = (entry: typeof capabilities[number]) => {
    if (entry.name.replace(/^\[/, '').replace(/\s+X\]?$/, '').toLowerCase() === 'hatred') return false;
    const definitions = entry.sources.map((source) => traitDefinitionForSelection(source, data));
    return definitions.some((definition) => definition && (!definition.isSkill || definition.isVirtuosity));
  };
  const requiresSpecialization = (entry: typeof capabilities[number]) => entry.sources.some((source) => specializationOptionsForTrait(source, draft, data).length > 0 && Object.keys(specializationRanksForSelection(source, draft, data)).length === 0);
  const isDisability = (entry: typeof capabilities[number]) => entry.sources.some((source) => traitDefinitionForSelection(source, data)?.isDisability);
  const format = (entry: typeof capabilities[number]) => {
    const disability = isDisability(entry);
    const name = entry.name.replace(/^[§$]\s*/, '').replace(/^\[/, '').replace(/\]$/, '').replace(/\s+X$/, '');
    const specs = Object.entries(entry.specializations).sort(([a], [b]) => a.localeCompare(b)).map(([value, rank]) => `${value}${rank > 1 ? `-${rank}` : ''}`).join(', ');
    if (disability) return `[${name}${entry.level > 1 ? `-${entry.level}` : ''}${specs ? ` > ${specs}` : ''}]`;
    return `${name}${entry.level > 1 ? `-${entry.level}` : ''}${specs ? ` > ${specs}` : ''}`;
  };
  const pidgin = capabilities.filter((entry) => entry.name.replace(/^[§$]\s*/, '').replace(/\s+X$/, '').toLowerCase() === 'pidgin');
  const presentationSort = (left: typeof capabilities[number], right: typeof capabilities[number]) => Number(isDisability(right)) - Number(isDisability(left)) || left.name.replace(/^[§$\[]\s*/, '').localeCompare(right.name.replace(/^[§$\[]\s*/, ''), undefined, { sensitivity: 'base', numeric: true });
  const skills = capabilities.filter((entry) => !isTraitOrTalent(entry) && !pidgin.includes(entry)).sort(presentationSort);
  const traits = capabilities.filter(isTraitOrTalent).sort(presentationSort);
  const skillTerms = skills.map((entry) => ({ text: format(entry), unresolved: requiresSpecialization(entry) }));
  const traitTerms = traits.map((entry) => ({ text: format(entry), unresolved: requiresSpecialization(entry) }));
  return { skills: skillTerms.map((entry) => entry.text).join(', '), traits: traitTerms.map((entry) => entry.text).join(', '), pidgin: pidgin.map(format).join(', '), skillsUnresolved: skillTerms.some((entry) => entry.unresolved), traitsUnresolved: traitTerms.some((entry) => entry.unresolved), skillTerms, traitTerms };
}

function heightText(inches: number | null) {
  if (inches == null) return '';
  const feet = Math.floor(inches / 12);
  return `${feet}'${inches % 12}\"`;
}

export function projectCharacterSheet(draft: CharacterDraft, data: StaticData): CharacterSheetData {
  const capabilities = projectedCapabilities(draft, data);
  const importedDetail = (detail: string) => draft.background.demographicSelections.find((entry) => entry.sourceDetail === detail)?.name ?? '';
  const speciesChoice = getSpeciesChoice(draft, data);
  const strifePairing = draft.intrinsics.childOfStrife ? getStrifePairing(draft) : null;
  const species = speciesChoice?.family.displayName ?? (strifePairing ? 'Humaniki' : '');
  const group = speciesChoice?.group.name ?? strifePairing?.exonym ?? '';
  const lineage = getLineageName(draft, data) ?? (strifePairing ? [draft.intrinsics.strifeFatherLineageId, draft.intrinsics.strifeMotherLineageId].map((id) => id?.replace(/^lineage-/, '').replace(/(^|-)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)).filter(Boolean).join('-') : '');
  const trade = getTradePackage(draft, data)?.trade ?? '';
  const specialization = getTradeSpecialization(draft, data)?.name ?? '';
  const regionEntry = regionByDraft(draft, data);
  const geographicRegion = geographicRegionName(draft, data) ?? '';
  const region = [geographicRegion, regionEntry?.name].filter(Boolean).join(' / ') || importedDetail('Imported region');
  const settlement = selectedSettlementDisplayName(draft, data) ?? importedDetail('Imported settlement');
  const belief = data.beliefs.find((entry) => entry.catalogId === draft.background.beliefId)?.keyword ?? '';
  const deity = data.deities.find((entry) => entry.catalogId === draft.background.deityId)?.deity ?? importedDetail('Imported religion detail');
  const heritage = [draft.background.environHeritageId, draft.background.societalHeritageId, draft.background.culturalHeritageId]
    .map((id) => data.heritagePackages.find((entry) => entry.id === id)?.name)
    .filter((value): value is string => Boolean(value));
  const calculated = draft.properties.calculated;
  const calculatedAliases: Record<string, string[]> = {
    Hitpoints: ['hitpoints'], Bodypoints: ['bodypoints'], Recovery: ['recoveryRate'],
    Endurance: ['endurance'], Resilience: ['resilience'], Resistance: ['resistance'],
    FavorDice: ['favorDice'], Cellburn: ['cellburnLimit'], Manapool: ['manapool'],
    MOV: ['mov'], HastyActions: ['actions'], MeleeAttack: ['meleeAttack'],
    MeleeDefend: ['meleeDefend'], RangeAttack: ['rangeAttack'], RangeDefend: ['rangeDefend'],
    MaxAdvantage: ['maxAdvantage'],
  };
  const numberCalc = (key: string) => Number(calculated[key] ?? calculatedAliases[key]?.map((alias) => calculated[alias]).find((value) => value != null)) || 0;
  const derived = calculateProperties(draft, data);
  const importedFinal = draft.background.demographicSelections.some((entry) => entry.sourceDetail === 'Imported region');
  const recordedAttribute = (name: string) => draft.intrinsics.attributes.find((entry) => entry.name === name)?.base;
  const mov = (derived?.mov ?? numberCalc('MOV')) || 0;
  const siz = draft.properties.siz ?? 0;
  const zed = draft.intrinsics.zed ?? 0;

  const attributes = ATTRIBUTE_ORDER.map((name) => {
    const value = name === 'MOV' ? mov : name === 'SIZ' ? siz : name === 'ZED' ? zed
      : (importedFinal ? recordedAttribute(name) : getFinalAttributeValue(name, draft)) ?? 0;
    return { name, value, modifier: signed(getAttributeDm(value)) };
  });

  const importedFeatures = draft.background.demographicSelections.filter((entry) => entry.sourceDetail === 'Notable feature').map((entry) => entry.name);
  const notableFeatures = importedFeatures.length ? importedFeatures : draft.background.disabilities.map(selectionRecord);
  const sex = draft.background.sex ?? draft.background.gender;
  const age = draft.background.ageYears != null
    ? `${draft.background.ageYears}.${draft.background.birthMonth ?? 0}`
    : null;
  const bio = [sex, draft.background.ageGroup && age
    ? `${draft.background.ageGroup} age ${age}`
    : draft.background.ageGroup ?? (age ? `age ${age}` : null)]
    .filter(Boolean)
    .join(' > ');

  return {
    name: draft.utilities.name,
    properName: draft.utilities.properName,
    affinityAttribute: draft.intrinsics.affinityAttribute,
    details: {
      environ: heritage.join(' > '),
      species: [species, group, lineage].filter(Boolean).join(' > '),
      bio,
      physique: [heightText(draft.properties.heightInches), draft.properties.weightPounds != null ? `${draft.properties.weightPounds}-pounds` : ''].filter(Boolean).join(' and '),
    },
    pml: draft.proficiencies.pml ?? 0,
    attributes,
    background: {
      profession: [
        [trade, specialization].filter(Boolean).join(' > '),
        draft.intrinsics.tradeRank != null ? `Rank ${draft.intrinsics.tradeRank}` : '',
      ].filter(Boolean),
      settlement: [[region, settlement].filter(Boolean).join(' / ')].filter(Boolean),
      religion: [belief, deity ? `[${deity}]` : ''].filter(Boolean),
      personality: draft.background.personality.map((entry) => entry.name).join(', '),
      notableFeatures,
    },
    history: {
      equipment: listInventory(draft.utilities.equipment),
      weapons: listInventory(draft.utilities.weapons),
      armor: listInventory(draft.utilities.armor),
      magicItems: draft.utilities.magicItems.map((entry) => {
        const form = magicItemInventoryForm(entry, draft, data);
        return `${entry.name}${form ? ` [${form.displayName}, ${form.weight}#]` : entry.catalogId && draft.utilities.magicItemForms[entry.catalogId] ? ` [${draft.utilities.magicItemForms[entry.catalogId]}]` : ''}`;
      }).join(', '),
      spells: draft.utilities.spells.map((entry) => displaySpellName(entry.name)).join(', '),
      skills: capabilities.skills,
      traits: capabilities.traits,
      skillsUnresolved: capabilities.skillsUnresolved,
      traitsUnresolved: capabilities.traitsUnresolved,
      skillTerms: capabilities.skillTerms,
      traitTerms: capabilities.traitTerms,
      languages: [...draft.proficiencies.languages.map(formatLanguageRecord), capabilities.pidgin].filter(Boolean).join(', '),
    },
    performance: [
      { name: 'Hitpoints', value: numberCalc('Hitpoints') },
      { name: 'Bodypoints', value: numberCalc('Bodypoints') },
      { name: 'Recovery Rate', value: numberCalc('Recovery') },
      { name: 'Endurance', value: numberCalc('Endurance') },
      { name: 'Resilience', value: numberCalc('Resilience') },
      { name: 'Resistance', value: numberCalc('Resistance') },
    ],
    concerns: ['Superficial', 'Injury', 'Fatigue', 'Weariness', 'Stress', 'Rads'].map((name) => ({ name, value: 0 })),
    miscellaneous: [
      { name: 'Wealth Rank', value: draft.intrinsics.wealthRank ?? numberCalc('wealthRank') },
      { name: 'Social Rank', value: Number(draft.background.socialRank ?? calculated.socialRank) || 0 },
      { name: 'Trade Rank', value: draft.intrinsics.tradeRank ?? 0 },
      { name: 'Favor Dice', value: numberCalc('FavorDice') },
      { name: 'Cellburn Limit', value: numberCalc('Cellburn') },
      { name: 'Manapool', value: derived?.manapool ?? numberCalc('Manapool') },
    ],
    combat: [
      { name: 'Actions', value: signed(numberCalc('HastyActions')) },
      { name: 'Melee Attack', value: signed(numberCalc('MeleeAttack')) },
      { name: 'Melee Defend', value: signed(numberCalc('MeleeDefend')) },
      { name: 'Range Attack', value: signed(numberCalc('RangeAttack')) },
      { name: 'Range Defend', value: signed(numberCalc('RangeDefend')) },
      { name: 'Max Advantage', value: signed(numberCalc('MaxAdvantage')) },
    ],
  };
}
