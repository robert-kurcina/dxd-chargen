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
  capabilityDispositionCounts,
  formatLanguageRecord,
  specializationRanksForSelection,
  specializationIssue,
  traitDefinitionForSelection,
} from '@/lib/rules/proficiencies';
import { calculateProperties } from '@/lib/rules/properties';
import { displayInventoryQuantity, displayMagicItemSelection, displaySpellName, magicItemInventoryForm, resolveWornArmor } from '@/lib/rules/utilities';

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
    allies: string;
    tragedy: string;
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
  disposition: { distressing: number; ameliorative: number };
  combat: Array<{ name: string; value: string }>;
};

const ATTRIBUTE_ORDER = ['CCA', 'RCA', 'REF', 'INT', 'KNO', 'PRE', 'POW', 'STR', 'FOR', 'MOV', 'SIZ', 'ZED'] as const;

function signed(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

function listInventory(items: CharacterDraft['utilities']['equipment']) {
  const grouped = new Map<string, { name: string; customAppend?: string; quantity: number }>();
  for (const item of items) {
    const append = item.customAppend?.trim() || '';
    const key = `${item.name}\u0000${append}`;
    const existing = grouped.get(key);
    if (existing) existing.quantity += Math.max(1, item.quantity);
    else grouped.set(key, { name: item.name, ...(append ? { customAppend: append } : {}), quantity: Math.max(1, item.quantity) });
  }
  return [...grouped.values()].map(({ name, quantity, customAppend }) => displayInventoryQuantity(name, quantity, customAppend)).join('; ');
}

function selectionRecord(selection: SourcedSelection) {
  const name = selection.name.split(' > ')[0].replace(/\s+X$/, '');
  const level = Math.max(1, selection.level ?? 1);
  const specialization = selection.specialization?.trim();
  return `${name} ${level}${specialization ? ` > ${specialization}` : ''}`;
}

function capabilityKey(value: string) {
  return value
    .replace(/^[§$]\s*/, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(' > ')[0]
    .replace(/\s+X$/, '')
    .trim()
    .toLowerCase();
}

function projectedCapabilities(draft: CharacterDraft, data: StaticData) {
  const capabilities = compressedCapabilities(draft, data);
  const isTraitOrTalent = (entry: typeof capabilities[number]) => {
    if (entry.name.replace(/^\[/, '').replace(/\s+X\]?$/, '').toLowerCase() === 'hatred') return false;
    const definitions = entry.sources.map((source) => traitDefinitionForSelection(source, data));
    return definitions.some((definition) => definition && (!definition.isSkill || definition.isVirtuosity));
  };
  const requiresSpecialization = (entry: typeof capabilities[number]) => entry.sources.some((source) => Boolean(specializationIssue(source, draft, data)));
  const isDisability = (entry: typeof capabilities[number]) => entry.sources.some((source) => traitDefinitionForSelection(source, data)?.isDisability);
  const format = (entry: typeof capabilities[number]) => {
    const disability = isDisability(entry);
    const interdisciplinary = entry.sources.some((source) => traitDefinitionForSelection(source, data)?.keywords?.includes('Interdisciplinary'));
    const stripped = entry.name.replace(/^[§$]\s*/, '').replace(/^\[/, '').replace(/\]$/, '').replace(/\s+X$/, '');
    const name = interdisciplinary ? `§${stripped}` : stripped;
    const specs = Object.entries(entry.specializations).sort(([a], [b]) => a.localeCompare(b)).map(([value, rank]) => interdisciplinary && rank > 1 ? `+${value}` : `${value}${rank > 1 ? `-${rank}` : ''}`).join(', ');
    if (disability) return `[${name}${entry.level > 1 ? `-${entry.level}` : ''}${specs ? ` > ${specs}` : ''}]`;
    return `${name}${entry.level > 1 ? `-${entry.level}` : ''}${specs ? ` > ${specs}` : ''}`;
  };
  const authoredKeys = new Set(capabilities.map((entry) => capabilityKey(entry.name)));
  const imported = (draft.proficiencies.importedCapabilities ?? []).filter((selection) => !authoredKeys.has(capabilityKey(selection.name)));
  const importedIsTrait = (selection: SourcedSelection) => {
    const definition = traitDefinitionForSelection(selection, data);
    return Boolean(definition && (!definition.isSkill || definition.isVirtuosity)) || /^v-/i.test(selection.name);
  };
  const importedFormat = (selection: SourcedSelection) => {
    const definition = traitDefinitionForSelection(selection, data);
    const interdisciplinary = Boolean(definition?.keywords?.includes('Interdisciplinary'));
    const disability = Boolean(definition?.isDisability);
    const stripped = selection.name.split(' > ')[0].replace(/^[§$]\s*/, '').replace(/^\[/, '').replace(/\]$/, '').replace(/\s+X$/, '');
    const name = interdisciplinary ? `§${stripped}` : stripped;
    const level = Math.max(1, selection.level ?? 1);
    const specs = Object.entries(specializationRanksForSelection(selection, draft, data))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, rank]) => interdisciplinary && rank > 1 ? `+${value}` : `${value}${rank > 1 ? `-${rank}` : ''}`)
      .join(', ');
    const body = `${name}${level > 1 ? `-${level}` : ''}${specs ? ` > ${specs}` : ''}`;
    return disability ? `[${body}]` : body;
  };
  const importedTerm = (selection: SourcedSelection) => ({
    text: importedFormat(selection),
    unresolved: Boolean(specializationIssue(selection, draft, data)),
  });
  const pidgin = capabilities.filter((entry) => capabilityKey(entry.name) === 'pidgin');
  const importedPidgin = imported.filter((entry) => capabilityKey(entry.name) === 'pidgin');
  const presentationSort = (left: typeof capabilities[number], right: typeof capabilities[number]) => Number(isDisability(right)) - Number(isDisability(left)) || left.name.replace(/^[§$\[]\s*/, '').localeCompare(right.name.replace(/^[§$\[]\s*/, ''), undefined, { sensitivity: 'base', numeric: true });
  const skills = capabilities.filter((entry) => !isTraitOrTalent(entry) && !pidgin.includes(entry)).sort(presentationSort);
  const traits = capabilities.filter(isTraitOrTalent).sort(presentationSort);
  const importedSkills = imported.filter((entry) => !importedIsTrait(entry) && !importedPidgin.includes(entry));
  const importedTraits = imported.filter(importedIsTrait);
  const skillTerms = [
    ...skills.map((entry) => ({ text: format(entry), unresolved: requiresSpecialization(entry) })),
    ...importedSkills.map(importedTerm),
  ].sort((left, right) => left.text.replace(/^[§$\[]\s*/, '').localeCompare(right.text.replace(/^[§$\[]\s*/, ''), undefined, { sensitivity: 'base', numeric: true }));
  const traitTerms = [
    ...traits.map((entry) => ({ text: format(entry), unresolved: requiresSpecialization(entry) })),
    ...importedTraits.map(importedTerm),
  ].sort((left, right) => left.text.replace(/^[§$\[]\s*/, '').localeCompare(right.text.replace(/^[§$\[]\s*/, ''), undefined, { sensitivity: 'base', numeric: true }));
  const pidginTerms = [...pidgin.map(format), ...importedPidgin.map(importedFormat)];
  return { skills: skillTerms.map((entry) => entry.text).join(', '), traits: traitTerms.map((entry) => entry.text).join(', '), pidgin: pidginTerms.join(', '), skillsUnresolved: skillTerms.some((entry) => entry.unresolved), traitsUnresolved: traitTerms.some((entry) => entry.unresolved), skillTerms, traitTerms };
}

function heightText(inches: number | null) {
  if (inches == null) return '';
  const feet = Math.floor(inches / 12);
  return `${feet}'${inches % 12}\"`;
}

function titleCaseId(value: string) {
  return value.split('-').filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ');
}

function importedSpecializationName(trade: string, specializationId: string | null) {
  if (!specializationId) return '';
  let value = specializationId.replace(/^specialization-/, '');
  const tradePrefix = trade ? `${trade.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-` : '';
  if (tradePrefix && value.startsWith(tradePrefix)) value = value.slice(tradePrefix.length);
  return titleCaseId(value);
}

function noteList(notes: string, heading: string) {
  const match = notes.match(new RegExp(`(?:^|\\n)\\s*${heading}\\s*[;:]\\s*([^\\n]+)`, 'i'));
  return match ? match[1].split(/\s*,\s*/).map((entry) => entry.trim()).filter(Boolean) : [];
}

function tragedyFromNotes(notes: string) {
  const match = notes.match(/(?:^|\n)\s*Tragedy\s*(?:[-;:]|—)\s*([^\n]+)/i);
  return match?.[1]?.trim() ?? '';
}

function uniqueText(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function projectCharacterSheet(draft: CharacterDraft, data: StaticData): CharacterSheetData {
  const capabilities = projectedCapabilities(draft, data);
  const disposition = capabilityDispositionCounts(draft, data);
  const legalArmor = resolveWornArmor(draft.utilities.armor, data).worn;
  const importedDetail = (detail: string) => draft.background.demographicSelections.find((entry) => entry.sourceDetail === detail)?.name ?? '';
  const speciesChoice = getSpeciesChoice(draft, data);
  const strifePairing = draft.intrinsics.childOfStrife ? getStrifePairing(draft) : null;
  const species = speciesChoice?.family.displayName ?? (strifePairing ? 'Humaniki' : '');
  const group = speciesChoice?.group.name ?? strifePairing?.exonym ?? '';
  const lineage = getLineageName(draft, data) ?? (strifePairing ? [draft.intrinsics.strifeFatherLineageId, draft.intrinsics.strifeMotherLineageId].map((id) => id?.replace(/^lineage-/, '').replace(/(^|-)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)).filter(Boolean).join('-') : '');
  const trade = getTradePackage(draft, data)?.trade ?? '';
  const specialization = getTradeSpecialization(draft, data)?.name ?? importedSpecializationName(trade, draft.intrinsics.specializationId);
  const tradeRank = draft.intrinsics.tradeRank;
  const namingPractice = data.professions.find((entry) => entry.trade === trade)?.namingPractice ?? '';
  const titleRecord = tradeRank == null ? null : data.namingPracticeTitles.find((entry) => Number(entry.Rank) === tradeRank) ?? null;
  const professionTitle = titleRecord && namingPractice ? String((titleRecord as Record<string, string>)[namingPractice] ?? '') : '';
  const regionEntry = regionByDraft(draft, data);
  const geographicRegion = geographicRegionName(draft, data) ?? '';
  const region = importedDetail('Imported region') || geographicRegion || regionEntry?.name || '';
  const settlement = importedDetail('Imported settlement') || selectedSettlementDisplayName(draft, data) || '';
  const belief = data.beliefs.find((entry) => entry.catalogId === draft.background.beliefId)?.keyword ?? '';
  const deityEntry = data.deities.find((entry) => entry.catalogId === draft.background.deityId) ?? null;
  const deity = deityEntry?.deity ?? importedDetail('Imported religion detail');
  const religion = /^theist$/i.test(belief)
    ? [[belief, deity].filter(Boolean).join(' > '), deityEntry?.domains?.join(', ') ?? ''].filter(Boolean)
    : [belief].filter(Boolean);
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
  const recordedAttribute = (name: string) => draft.intrinsics.attributes.find((entry) => entry.name === name)?.recordedValue;
  const mov = (derived?.mov ?? numberCalc('MOV')) || 0;
  const siz = draft.properties.siz ?? 0;
  const zed = draft.intrinsics.zed ?? 0;
  const attributes = ATTRIBUTE_ORDER.map((name) => {
    const value = name === 'MOV' ? mov : name === 'SIZ' ? siz : name === 'ZED' ? zed
      : (recordedAttribute(name) ?? getFinalAttributeValue(name, draft)) ?? 0;
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
  const notes = draft.utilities.notes ?? '';
  const spells = uniqueText([
    ...draft.utilities.spells.map((entry) => displaySpellName(entry.name)),
    ...noteList(notes, 'Spells').map(displaySpellName),
  ]);
  const magicInventory = draft.utilities.weapons.filter((item) => {
    const definition = data.itemWeapons.find((entry) => entry.catalogId === item.catalogId)
      ?? data.itemWeapons.find((entry) => entry.name === item.name);
    return Boolean(definition?.traits?.some((trait) => /^mana(?:trigger|store)/i.test(trait)));
  }).map((item) => item.name);
  const magicItems = uniqueText([
    ...draft.utilities.magicItems.map((entry) => {
      const form = magicItemInventoryForm(entry, draft, data);
      const displayName = displayMagicItemSelection(entry, draft, data);
      return `${displayName}${form ? ` [${form.displayName}, ${form.weight}#]` : entry.catalogId && draft.utilities.magicItemForms[entry.catalogId] ? ` [${draft.utilities.magicItemForms[entry.catalogId]}]` : ''}`;
    }),
    ...magicInventory,
  ]);

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
        tradeRank != null ? [`Rank ${tradeRank}`, professionTitle].filter(Boolean).join(' > ') : '',
      ].filter(Boolean),
      settlement: [region, settlement].filter(Boolean),
      religion,
      personality: draft.background.personality.map((entry) => entry.name).join(', '),
      notableFeatures,
    },
    history: {
      allies: draft.utilities.relationships.map((entry) => entry.name).join(', '),
      tragedy: draft.background.tragedySeedText ?? tragedyFromNotes(notes),
      equipment: listInventory(draft.utilities.equipment),
      weapons: listInventory(draft.utilities.weapons),
      armor: listInventory(legalArmor),
      magicItems: magicItems.join(', '),
      spells: spells.join(', '),
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
    disposition,
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