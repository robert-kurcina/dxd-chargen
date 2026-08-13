import type { StaticData } from '@/data';
import type { CharacterDraft, SourcedSelection } from '@/lib/character-draft';
import { getAttributeDm } from '@/lib/character-logic';
import {
  getFinalAttributeValue,
  getLineageName,
  getSpeciesChoice,
  getTradePackage,
  getTradeSpecialization,
  selectedSettlementName,
} from '@/lib/rules/intrinsics';
import {
  compressedCapabilities,
  formatLanguageRecord,
} from '@/lib/rules/proficiencies';

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
  return items.map((item) => item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name).join(', ');
}

function selectionRecord(selection: SourcedSelection) {
  const name = selection.name.split(' > ')[0].replace(/\s+X$/, '');
  const level = Math.max(1, selection.level ?? 1);
  const specialization = selection.specialization?.trim();
  return `${name} ${level}${specialization ? ` > ${specialization}` : ''}`;
}

function projectedSkills(draft: CharacterDraft, data: StaticData) {
  return compressedCapabilities(draft, data).map((entry) => entry.display).join(', ');
}

function heightText(inches: number | null) {
  if (inches == null) return '';
  const feet = Math.floor(inches / 12);
  return `${feet}'${inches % 12}\"`;
}

export function projectCharacterSheet(draft: CharacterDraft, data: StaticData): CharacterSheetData {
  const speciesChoice = getSpeciesChoice(draft, data);
  const species = speciesChoice?.family.displayName ?? '';
  const group = speciesChoice?.group.name ?? '';
  const lineage = getLineageName(draft, data) ?? '';
  const trade = getTradePackage(draft, data)?.trade ?? '';
  const specialization = getTradeSpecialization(draft, data)?.name ?? '';
  const region = data.empires.find((entry) => entry.catalogId === draft.background.regionId)?.name ?? '';
  const settlement = selectedSettlementName(draft, data) ?? '';
  const belief = data.beliefs.find((entry) => entry.catalogId === draft.background.beliefId)?.keyword ?? '';
  const deity = data.deities.find((entry) => entry.catalogId === draft.background.deityId)?.deity ?? '';
  const heritage = [draft.background.environHeritageId, draft.background.societalHeritageId, draft.background.culturalHeritageId]
    .map((id) => data.heritagePackages.find((entry) => entry.id === id)?.name)
    .filter((value): value is string => Boolean(value));
  const demographic = [draft.background.sex, draft.background.gender, draft.background.handedness ? `${draft.background.handedness}-handed` : null, draft.background.geneticallyFemale ? 'Genetically Female' : null].filter((value): value is string => Boolean(value));
  const calculated = draft.properties.calculated;
  const numberCalc = (key: string) => Number(calculated[key]) || 0;
  const mov = numberCalc('MOV');
  const siz = draft.properties.siz ?? 0;
  const zed = draft.intrinsics.zed ?? 0;

  const attributes = ATTRIBUTE_ORDER.map((name) => {
    const value = name === 'MOV' ? mov : name === 'SIZ' ? siz : name === 'ZED' ? zed : (getFinalAttributeValue(name, draft) ?? 0);
    return { name, value, modifier: signed(getAttributeDm(value)) };
  });

  const notableFeatures = draft.background.disabilities.map(selectionRecord);
  const bioParts = [...demographic];
  if (draft.background.ageGroup) bioParts.push(draft.background.ageGroup);
  if (draft.background.ageYears != null) bioParts.push(`age ${draft.background.ageYears}`);
  if (draft.background.birthMonth != null) bioParts.push(`birth month ${draft.background.birthMonth}`);

  return {
    name: draft.utilities.name,
    properName: draft.utilities.properName,
    affinityAttribute: draft.intrinsics.affinityAttribute,
    details: {
      environ: heritage.join(' > '),
      species: [species, group, lineage].filter(Boolean).join(' > '),
      bio: bioParts.join(' > '),
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
      magicItems: draft.utilities.magicItems.map((entry) => `${entry.name}${entry.catalogId && draft.utilities.magicItemForms[entry.catalogId] ? ` [${draft.utilities.magicItemForms[entry.catalogId]}]` : ''}`).join(', '),
      spells: draft.utilities.spells.map((entry) => entry.name).join(', '),
      skills: projectedSkills(draft, data),
      languages: draft.proficiencies.languages.map(formatLanguageRecord).join(', '),
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
      { name: 'Wealth Rank', value: draft.intrinsics.wealthRank ?? 0 },
      { name: 'Social Rank', value: Number(draft.background.socialRank) || 0 },
      { name: 'Trade Rank', value: draft.intrinsics.tradeRank ?? 0 },
      { name: 'Favor Dice', value: numberCalc('FavorDice') },
      { name: 'Cellburn Limit', value: numberCalc('Cellburn') },
      { name: 'Manapool', value: numberCalc('Manapool') },
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
