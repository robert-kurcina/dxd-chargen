import type { StaticData } from '@/data';
import type {
  CharacterDraft,
  LanguageModifier,
  LanguageSelection,
  PmlVirtuosityChoice,
  SourcedSelection,
} from '@/lib/character-draft';
import { getAgeRankValue, getAttributeDm, parseIM } from '@/lib/character-logic';
import {
  getFinalAttributeValue,
  purchasedAttributeSkillpointCost,
  selectedSettlementName,
  zedPurchaseSkillpointCost,
  syncIntrinsics,
} from './intrinsics';
import type { StepAssessment } from './background';
import { geographicRegionName, selectedSettlementOption } from '@/lib/settlement-context';

const PROFICIENCY_STEPS = new Set([
  'proficiencies-pml',
  'proficiencies-granted-skills-traits-talents',
  'proficiencies-additional-traits-skills',
  'proficiencies-imported-traits-skills-talents',
  'proficiencies-languages',
]);

const PML_VIRTUOSITY_MILESTONES = [4, 8, 12, 16, 20] as const;

export const LANGUAGE_MODIFIERS: readonly LanguageModifier[] = ['Old High', 'High', 'Low', 'War', 'Lingo', 'Barter'];
export const LANGUAGE_RELEVANCE_MODIFIERS: readonly LanguageModifier[] = ['Old High', 'High', 'Low'];
export const LANGUAGE_REGISTER_MODIFIERS: readonly LanguageModifier[] = ['Barter', 'Lingo', 'War'];

function normalizeLanguageModifiers(modifiers: LanguageModifier[] | undefined) {
  const selected = modifiers ?? [];
  if (selected.includes('Old High')) return ['Old High'] as LanguageModifier[];
  return LANGUAGE_MODIFIERS.filter((modifier) => selected.includes(modifier)).slice(0, 1);
}

export function isProficiencyStep(stepValue: string) {
  return PROFICIENCY_STEPS.has(stepValue);
}

export function minimumAgeRankForPml(pml: number) {
  if (pml <= 0) return Number.NEGATIVE_INFINITY;
  if (pml <= 3) return 0;
  return Math.floor(pml / 4);
}

export function ageRankValue(draft: CharacterDraft, data: StaticData) {
  const rank = data.ageGroups.find((entry) => entry.ageGroup === draft.background.ageGroup)?.rank;
  return rank == null ? null : getAgeRankValue(rank);
}

export function pmlVirtuosityMilestones(pml: number | null) {
  if (!pml) return [] as number[];
  return PML_VIRTUOSITY_MILESTONES.filter((milestone) => milestone <= pml);
}

export function pmlTitle(pml: number | null, data: StaticData) {
  if (!pml) return null;
  for (const entry of data.pmlTitles) {
    const [lower, upper] = entry.pml.split('-').map(Number);
    if (Number.isFinite(lower) && Number.isFinite(upper) && pml >= lower && pml <= upper) {
      return `${entry.title} — ${entry.game}`;
    }
  }
  return pml > 20 ? 'Beyond Epic' : null;
}

export function pmlCreationSummary(pml: number | null) {
  const value = pml ?? 0;
  return {
    hitpointBonus: value * 3,
    favorDice: value,
    reserveBonus: Math.floor(value / 2),
    recoveryBonus: Math.floor(value / 3),
    maxAdvantage: value <= 0 ? 0 : 1 + Math.floor((value - 1) / 3),
    virtuosityChoices: pmlVirtuosityMilestones(value).length,
    secondaryMutations: Math.max(0, value - 5),
    psychologicalDisabilities: Math.max(0, value - 9),
  };
}

function traitDefinitionById(id: string | undefined, data: StaticData) {
  if (!id) return null;
  return data.traits.find((trait) => trait.catalogId === id) ?? null;
}

function canonicalTraitBase(value: string) {
  const base = value
    .replace(/^[§$]\s*/, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(' > ')[0]
    .replace(/\s+X$/, '')
    .trim()
    .toLowerCase();
  return base === 'zedsurge' ? 'v-zedsurge' : base;
}

export function traitDefinitionForSelection(selection: SourcedSelection, data: StaticData) {
  const byId = traitDefinitionById(selection.catalogId ?? selection.id, data);
  if (byId) return byId;
  const base = canonicalTraitBase(selection.name);
  return data.traits.find((trait) => canonicalTraitBase(trait.trait) === base) ?? null;
}

export function capabilityAllowsLevels(selection: SourcedSelection, data: StaticData) {
  const definition = traitDefinitionForSelection(selection, data);
  const notation = definition?.trait ?? selection.name;
  return /(?:^|\s|\[)X(?:\s|\]|$|\s*>)/.test(notation);
}

function pmlGrant(choice: PmlVirtuosityChoice, data: StaticData): SourcedSelection | null {
  const trait = traitDefinitionById(choice.traitId, data);
  if (!trait) return null;
  return {
    id: `pml-virtuosity-${choice.milestone}`,
    catalogId: trait.catalogId,
    name: trait.trait,
    source: 'pml',
    sourceDetail: `PML ${choice.milestone} Virtuosity choice`,
    level: 1,
  };
}

export function syncPmlGrantedSelections(draft: CharacterDraft, data: StaticData): CharacterDraft {
  const pml = draft.proficiencies.pml ?? 0;
  const milestones = new Set(pmlVirtuosityMilestones(pml));
  const choices = draft.proficiencies.pmlVirtuosityChoices;
  const activeChoices = choices.filter((choice) => milestones.has(choice.milestone));
  const retained = draft.proficiencies.granted.filter((selection) => selection.source !== 'pml');
  const pmlGrants = activeChoices.map((choice) => pmlGrant(choice, data)).filter((value): value is SourcedSelection => Boolean(value));

  return {
    ...draft,
    proficiencies: {
      ...draft.proficiencies,
      pmlVirtuosityChoices: choices,
      granted: [...retained, ...pmlGrants],
    },
  };
}

export function setPml(draft: CharacterDraft, pml: number, data: StaticData) {
  const clamped = Math.max(1, Math.min(40, Math.trunc(pml)));
  return syncIntrinsics(syncPmlGrantedSelections({
    ...draft,
    proficiencies: { ...draft.proficiencies, pml: clamped },
  }, data), data);
}

export function setPmlVirtuosityChoice(
  draft: CharacterDraft,
  milestone: number,
  traitId: string,
  data: StaticData,
) {
  const trait = traitDefinitionById(traitId, data);
  if (!trait || !trait.isVirtuosity || trait.isDisability) return draft;
  const choice: PmlVirtuosityChoice = { milestone, traitId, name: trait.trait };
  const choices = [
    ...draft.proficiencies.pmlVirtuosityChoices.filter((entry) => entry.milestone !== milestone),
    choice,
  ].sort((a, b) => a.milestone - b.milestone);
  return syncIntrinsics(syncPmlGrantedSelections({
    ...draft,
    proficiencies: { ...draft.proficiencies, pmlVirtuosityChoices: choices },
  }, data), data);
}

function explicitSpecialization(selection: SourcedSelection, draft: CharacterDraft) {
  return selection.specialization?.trim() || draft.proficiencies.grantSpecializations[selection.id]?.trim() || null;
}

export function contextualGrantSpecialization(
  selection: SourcedSelection,
  draft: CharacterDraft,
  data: StaticData,
) {
  const explicit = explicitSpecialization(selection, draft);
  if (explicit) return explicit;
  if (!selection.name.includes(' > ')) return null;

  const placeholder = selection.name.split(' > ').slice(1).join(' > ').toLowerCase();
  // A Title is jurisdictional character data, not an origin-derived grant. Even
  // when the character has a known starting region, require the player to state
  // the Region in which the Title is held.
  if (canonicalTraitBase(selection.name) === 'title' && placeholder === 'region') return null;
  const region = geographicRegionName(draft, data);
  const settlement = selectedSettlementName(draft, data);
  const deity = data.deities.find((entry) => entry.catalogId === draft.background.deityId)?.deity ?? null;
  const belief = data.beliefs.find((entry) => entry.catalogId === draft.background.beliefId)?.keyword ?? null;
  const environ = data.heritagePackages.find((entry) => entry.id === draft.background.environHeritageId)?.name ?? null;
  const primaryLanguage = draft.proficiencies.languages.find((entry) => entry.kind === 'default')?.name ?? null;

  if (placeholder === 'region') return region;
  if (placeholder === 'settlement') return settlement;
  if (placeholder === 'deity') return deity;
  if (placeholder === 'belief') return belief;
  if (placeholder === 'environ') return environ;
  if (placeholder === 'language') return primaryLanguage;
  return null;
}


const BROAD_SPECIALIZATIONS: Record<string, string[]> = {
  academics: ['Alchemy', 'Design', 'Engineer', 'Medic', 'Science'],
  artist: ['Choreography', 'Comedy', 'Composer', 'Painter', 'Playwright', 'Poetry'],
  craft: ['Apothecary', 'Armorsmith', 'Carpentry', 'Clothier', 'Cosmetics', 'Hidecraft', 'Jewelcraft', 'Magicraft', 'Metalcraft', 'Pottery', 'Stonecraft', 'Textiles', 'Weaponsmith', 'Woodcraft'],
  detect: ['Heat', 'Magic', 'Sight', 'Smell', 'Sound', 'Starlight', 'Taste', 'Vibration'],
  design: ['Enterprise', 'Factories', 'Fortresses', 'Gardens', 'Living Spaces', 'Settlements', 'Ships', 'War Engines'],
  domus: ['Academic', 'Employer', 'Estate', 'Farmer', 'Fisher', 'Herder', 'Martial', 'Rancher', 'Shopkeeper', 'Trader', 'Trapper'],
  engineer: ['Civil', 'Contraptions', 'Constructs', 'Warfare'],
  gambling: ['Cards', 'Dice', 'Animal Racing', 'Pit-fighting'],
  expert: ['Axes', 'Bashing', 'Bludgeons', 'Bolas', 'Bows', 'Chains & Whips', 'Crossbows', 'Daggers & Knives', 'Firearms', 'Polearms', 'Reaping', 'Slings', 'Slingshots & Rocks', 'Spears', 'Staffs', 'Swords', 'Threshing', 'Thrown Weapons', 'Unusual Weapons'],
  imbue: ['Items', 'Originator', 'Artifice', 'Scrolls', 'Skills'],
  'v-imbue': ['Items', 'Weapons', 'Armor', 'Originator', 'Alchemy', 'Artifice', 'Scrolls', 'Witch', 'Skills'],
  labor: ['Baker', 'Beautician', 'Bouncer', 'Brewer', 'Butcher', 'Concierge', 'Cook', 'Groundskeeper', 'Miller', 'Wait Staff'],
  medic: ['Battlefield', 'Dentist', 'Generalist', 'Reproductive', 'Surgeon'],
  mercantile: ['Overland-trade', 'Sea-trade'],
  military: ['Infiltrate', 'Lockpicking', 'Navigation', 'Poisons', 'Siege', 'Tactics', 'Warfare'],
  office: ['Administration', 'Commerce', 'Courtier', 'Finance', 'Guild', 'Law', 'Magister'],
  perform: ['Act', 'Acrobatics', 'Dance', 'Humor', 'Music', 'Oration', 'Philosophy', 'Puppetry', 'Sing', 'Storytelling'],
  poisons: ['Poisons', 'Venoms', 'Toxins'],
  'rapid-shot': ['Bows', 'Crossbows', 'Longarms', 'Pistols', 'Thrown'],
  riding: ['Aurochs', 'Bear', 'Bison', 'Camelops', 'Grunks', 'Horse', 'Ostra', 'Sleeth', 'Tarn', 'Torse'],
  science: ['Chemistry', 'Energy', 'Geology', 'Biology', 'Magiviruses', 'Meterology', 'Picoswarms', 'Psychology', 'Materials', 'Physics'],
  studies: ['Artist', 'Deity', 'History', 'Investigator', 'Language', 'Lore', 'Maths', 'Peerage', 'Politics', 'Read'],
  survival: ['Badlands', 'Coastal', 'Chaparral', 'Deserts', 'Forests', 'Grassland', 'Hills', 'Jungle', 'Mangrove', 'Marsh', 'Mountain', 'Steppe', 'River', 'Savannah', 'Swamp', 'Taiga', 'Tundra', 'Woods', 'Arctic', 'Ice Sheet/Glacier', 'Benthic'],
  tactics: ['Aerial', 'Land', 'Naval', 'Siege', 'Urban'],
  warfare: ['Siege', 'Tactics', 'Engineering', 'Strategy', 'Logistics', 'Spycraft', 'Torture'],
  wares: ['Animals', 'Stone', 'Wood', 'Weapons & Armor', 'Jewelry', 'Magic'],
};

export type SpecializationRequirement = {
  qualifierRequired: boolean;
  qualifierLabel: string | null;
  qualifierOptions: string[];
  specializationMinimum: number;
  specializationMaximum: number;
  specializationOptions: string[];
  specializationLabel: string;
};

const LOCAL_SPECIALIZATION_RULES: Record<string, {
  cadence?: number;
  maximum?: number;
  required?: boolean;
  qualifierRequired?: boolean;
  qualifierLabel?: string;
  specializationLabel?: string;
  options?: string[];
}> = {
  // These schedules are local to the individual capability definitions. Do not
  // infer a universal specialization cadence from the chevron notation.
  academics: { cadence: 1, required: true, qualifierRequired: false, specializationLabel: 'Elective', options: ['Alchemy', 'Design', 'Engineer', 'Medic', 'Science'] },
  artist: { cadence: 3, required: false, qualifierRequired: true, qualifierLabel: 'Form', specializationLabel: 'Region' },
  craft: { cadence: 3, required: false, qualifierRequired: true, qualifierLabel: 'Tradecraft', specializationLabel: 'Goods' },
  herbalism: { cadence: 1, required: true, qualifierRequired: false, specializationLabel: 'Environ' },
  history: { cadence: 1, required: true, qualifierRequired: false, specializationLabel: 'Region' },
  husbandry: { cadence: 1, required: false, qualifierRequired: false, specializationLabel: 'Species Type' },
  manners: { cadence: 3, required: false, qualifierRequired: false, specializationLabel: 'Type' },
  military: { cadence: 1, required: true, qualifierRequired: false, specializationLabel: 'Elective', options: ['Infiltrate', 'Lockpicking', 'Navigation', 'Poisons', 'Siege', 'Tactics', 'Warfare'] },
  office: { cadence: 1, required: false, qualifierRequired: true, qualifierLabel: 'Office', specializationLabel: 'Region' },
  peerage: { cadence: 1, required: false, qualifierRequired: false, specializationLabel: 'Region' },
  perform: { cadence: 3, required: true, qualifierRequired: true, qualifierLabel: 'Form', specializationLabel: 'Performance Specialization', options: ['Assess', 'Sway', 'Target', 'Conclude'] },
  'v-psionics': { cadence: 1, required: false, qualifierRequired: false, specializationLabel: 'Type', options: ['Agrav', 'Augment', 'Deter', 'Displace', 'Drain', 'Dreambridge', 'Empathy', 'Enhance', 'Embed', 'Façade', 'Godlink', 'Link', 'Manipulate', 'Maze', 'Mindblast', 'Nullify', 'Physics', 'Psiblast', 'Sense', 'Shield', 'Suggest', 'Telepathy', 'Trade', 'Undercode', 'Vim', 'Zero State'] },
  'v-spellshaper': { cadence: 1, required: true, qualifierRequired: false, specializationLabel: 'Recipe' },
  sprint: { maximum: 1, required: false, qualifierRequired: false, specializationLabel: 'Type', options: ['Bipedal', 'Quadrupedal'] },
  steer: { maximum: 1, required: false, qualifierRequired: false, specializationLabel: 'Type', options: ['Aeronef', 'Boat', 'Ship', 'Yoked'] },
  strike: { maximum: 1, required: false, qualifierRequired: false, specializationLabel: 'Type', options: ['Melee', 'Thrown', 'Range'] },
  studies: { cadence: 1, required: true, qualifierRequired: false, specializationLabel: 'Elective', options: ['Artist', 'Deity', 'History', 'Investigator', 'Language', 'Lore', 'Maths', 'Peerage', 'Politics', 'Read'] },
  survival: { cadence: 1, required: false, qualifierRequired: false, specializationLabel: 'Environ' },
  tactics: { cadence: 1, required: true, qualifierRequired: false, specializationLabel: 'Type / sub-type' },
  teachings: { cadence: 1, required: true, qualifierRequired: true, qualifierLabel: 'Deity', specializationLabel: 'Elective', options: ['Deity', 'Teach', 'Discipline', 'Reason', 'Leadership', 'Persuade'] },
};

function placeholderForSelection(selection: SourcedSelection) {
  return selection.name.includes(' > ')
    ? selection.name.split(' > ').slice(1).join(' > ').replace(/\s+X$/, '').trim()
    : '';
}

function dynamicOptionsForLabel(label: string, selection: SourcedSelection, draft: CharacterDraft, data: StaticData) {
  const key = label.trim().toLowerCase();
  if (key === 'region') return Array.from(new Set([...data.empires.map((entry) => entry.region), geographicRegionName(draft, data)].filter((value): value is string => Boolean(value)))).sort();
  if (key === 'settlement') return Array.from(new Set([...Object.values(data.settlements).flat(), ...data.settlementProfiles.map((entry) => entry.name)])).sort();
  if (key === 'deity') return data.deities.map((entry) => entry.deity).sort();
  if (key === 'language') return data.languages.map((entry) => entry.name).sort();
  if (key === 'environ') return data.heritagePackages.filter((entry) => entry.kind === 'environs').map((entry) => entry.name).sort();
  if (key === 'trade') return data.tradePackages.map((entry) => entry.trade).sort();
  if (key === 'species' || key === 'species type') return data.species.flatMap((family) => family.groups.map((group) => group.name)).sort();
  if (key === 'form') return BROAD_SPECIALIZATIONS[canonicalTraitBase(selection.name)] ?? BROAD_SPECIALIZATIONS.perform;
  if (key === 'office') return BROAD_SPECIALIZATIONS.office;
  if (key === 'tradecraft') return BROAD_SPECIALIZATIONS.craft;
  if (key === 'type' && canonicalTraitBase(selection.name) === 'medic') return BROAD_SPECIALIZATIONS.medic;
  return [];
}

export function specializationRequirement(selection: SourcedSelection, draft: CharacterDraft, data: StaticData): SpecializationRequirement {
  const base = canonicalTraitBase(selection.name);
  const local = LOCAL_SPECIALIZATION_RULES[base];
  const placeholder = placeholderForSelection(selection);
  const level = Math.max(1, selection.level ?? 1);
  const qualifierRequired = local?.qualifierRequired ?? Boolean(placeholder);
  const qualifierLabel = qualifierRequired ? (local?.qualifierLabel ?? (placeholder || 'Specialization')) : null;
  const qualifierOptions = qualifierLabel ? (dynamicOptionsForLabel(qualifierLabel, selection, draft, data).length ? dynamicOptionsForLabel(qualifierLabel, selection, draft, data) : (BROAD_SPECIALIZATIONS[base] ?? [])) : [];
  if (local?.cadence || local?.maximum != null) {
    const maximum = local.maximum ?? Math.floor(level / Math.max(1, local.cadence ?? 1));
    const label = local.specializationLabel ?? placeholder ?? 'Specialization';
    const options = local.options ?? dynamicOptionsForLabel(label, selection, draft, data);
    return { qualifierRequired, qualifierLabel, qualifierOptions, specializationMinimum: local.required ? maximum : 0, specializationMaximum: maximum, specializationOptions: options, specializationLabel: label };
  }
  const generic = BROAD_SPECIALIZATIONS[base] ?? [];
  return { qualifierRequired, qualifierLabel, qualifierOptions, specializationMinimum: 0, specializationMaximum: generic.length ? 1 : 0, specializationOptions: generic, specializationLabel: 'Specialization' };
}

export function specializationIssue(selection: SourcedSelection, draft: CharacterDraft, data: StaticData) {
  const requirement = specializationRequirement(selection, draft, data);
  const qualifier = explicitSpecialization(selection, draft);
  const used = Object.values(levelSpecializationRanksForSelection(selection, draft)).reduce((sum, rank) => sum + Math.max(0, rank), 0);
  if (requirement.qualifierRequired && !qualifier) return `Choose ${requirement.qualifierLabel ?? 'a qualifier'}.`;
  if (used < requirement.specializationMinimum) return `Choose ${requirement.specializationMinimum - used} more ${requirement.specializationLabel} specialization${requirement.specializationMinimum - used === 1 ? '' : 's'}.`;
  if (used > requirement.specializationMaximum) return `Remove ${used - requirement.specializationMaximum} excess specialization${used - requirement.specializationMaximum === 1 ? '' : 's'} for the current level.`;
  return null;
}

export function specializationOptionsForTrait(selection: SourcedSelection, draft: CharacterDraft, data: StaticData) {
  const base = canonicalTraitBase(selection.name);
  const placeholder = selection.name.includes(' > ') ? selection.name.split(' > ').slice(1).join(' > ').replace(/\s+X$/, '').trim().toLowerCase() : '';
  if (placeholder === 'region') return Array.from(new Set([
    ...data.empires.map((entry) => entry.region),
    geographicRegionName(draft, data),
  ].filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true }));
  if (placeholder === 'settlement') return Array.from(new Set([
    ...Object.values(data.settlements).flat(),
    ...data.settlementProfiles.map((entry) => entry.name),
  ])).sort();
  if (placeholder === 'deity') return data.deities.map((entry) => entry.deity).sort();
  if (placeholder === 'language') return data.languages.map((entry) => entry.name).sort();
  if (placeholder === 'environ') return data.heritagePackages.filter((entry) => entry.kind === 'environs').map((entry) => entry.name).sort();
  if (placeholder === 'trade') return data.tradePackages.map((entry) => entry.trade).sort();
  if (placeholder === 'species') return data.species.flatMap((family) => family.groups.map((group) => group.name)).sort();
  if (placeholder === 'weapon' || placeholder === 'technical weapon') return Array.from(new Set([
    ...BROAD_SPECIALIZATIONS.expert,
    ...Object.keys(specializationRanksForSelection(selection, draft, data)),
    !genericSpecialization(selection.specialization) ? selection.specialization!.trim() : null,
  ].filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true }));
  return BROAD_SPECIALIZATIONS[base] ?? [];
}

function genericSpecialization(value: string | undefined) {
  return !value || ['any','region','settlement','deity','belief','environ','language','trade','species','weapon','technical weapon','type','field'].includes(value.trim().toLowerCase());
}

export function levelSpecializationRanksForSelection(selection: SourcedSelection, draft: CharacterDraft) {
  return selection.specializationRanks ?? draft.proficiencies.grantSpecializationRanks[selection.id] ?? {};
}

export function specializationRanksForSelection(selection: SourcedSelection, draft: CharacterDraft, data: StaticData) {
  const stored = selection.specializationRanks ?? draft.proficiencies.grantSpecializationRanks[selection.id] ?? {};
  const ranks: Record<string, number> = { ...stored };
  const explicit = selection.specialization?.trim() || draft.proficiencies.grantSpecializations[selection.id]?.trim();
  if (explicit && !genericSpecialization(explicit)) ranks[explicit] = Math.max(1, ranks[explicit] ?? 0);
  if (Object.keys(ranks).length) return ranks;
  const contextual = contextualGrantSpecialization({ ...selection, specialization: undefined }, draft, data);
  if (contextual && !genericSpecialization(contextual)) return { [contextual]: 1 };
  return {};
}

export function setGrantSpecializationRanks(draft: CharacterDraft, grantId: string, ranks: Record<string, number>) {
  const grantSpecializationRanks = { ...draft.proficiencies.grantSpecializationRanks };
  const cleaned = Object.fromEntries(Object.entries(ranks).filter(([name, rank]) => name.trim() && rank > 0).map(([name, rank]) => [name.trim(), Math.max(1, Math.trunc(rank))]));
  if (Object.keys(cleaned).length) grantSpecializationRanks[grantId] = cleaned;
  else delete grantSpecializationRanks[grantId];
  return { ...draft, proficiencies: { ...draft.proficiencies, grantSpecializationRanks } };
}

export function updateAdditionalSkillSpecializations(draft: CharacterDraft, selectionId: string, ranks: Record<string, number>) {
  return { ...draft, proficiencies: { ...draft.proficiencies, additionalSkills: draft.proficiencies.additionalSkills.map((selection) => selection.id === selectionId ? { ...selection, specializationRanks: ranks } : selection) } };
}

export type CompressedCapability = { name: string; level: number; isSkill: boolean; specializations: Record<string, number>; sources: SourcedSelection[]; display: string };
export function compressedCapabilities(draft: CharacterDraft, data: StaticData): CompressedCapability[] {
  const all = [
    ...draft.proficiencies.granted,
    ...draft.proficiencies.additionalSkills,
    ...draft.background.disabilities,
  ];
  const groups = new Map<string, CompressedCapability>();
  for (const selection of all) {
    const selectedName = selection.name.split(' > ')[0].replace(/\s+X$/, '').trim();
    const key = canonicalTraitBase(selectedName);
    const baseName = key === 'v-zedsurge' ? 'v-Zedsurge' : selectedName;
    const definition = traitDefinitionForSelection(selection, data);
    const ranks = specializationRanksForSelection(selection, draft, data);
    const level = Math.max(1, selection.level ?? 1);
    const current = groups.get(key);
    if (!current) groups.set(key, { name: baseName, level, isSkill: Boolean(definition?.isSkill), specializations: { ...ranks }, sources: [selection], display: '' });
    else {
      current.level = Math.min(10, Math.max(current.level, level) + 1);
      current.sources.push(selection);
      for (const [name, rank] of Object.entries(ranks)) current.specializations[name] = (current.specializations[name] ?? 0) + rank;
    }
  }
  for (const item of groups.values()) {
    const specs = Object.entries(item.specializations).sort(([a],[b]) => a.localeCompare(b)).map(([name, rank]) => `${name}${rank > 1 ? ` ${rank}` : ''}`);
    item.display = `${item.name}${item.level > 1 ? ` ${item.level}` : ''}${specs.length ? ` > { ${specs.join(', ')} }` : ''}`;
  }
  return [...groups.values()].sort((a,b) => a.name.localeCompare(b.name));
}

export function setGrantSpecialization(draft: CharacterDraft, grantId: string, specialization: string) {
  const grantSpecializations = { ...draft.proficiencies.grantSpecializations };
  const value = specialization.trim();
  if (value) grantSpecializations[grantId] = value;
  else delete grantSpecializations[grantId];
  return { ...draft, proficiencies: { ...draft.proficiencies, grantSpecializations } };
}

export function unresolvedBroadGrants(draft: CharacterDraft, data: StaticData) {
  return draft.proficiencies.granted.filter((selection) => Boolean(specializationIssue(selection, draft, data)));
}

export function unresolvedAdditionalCapabilities(draft: CharacterDraft, data: StaticData) {
  return draft.proficiencies.additionalSkills.filter((selection) => Boolean(specializationIssue(selection, draft, data)));
}

export type ImportedCapabilityStatus = 'match' | 'new' | 'exceeds' | 'below' | 'specialization-mismatch';
export type ImportedCapabilityComparison = { imported: SourcedSelection; status: ImportedCapabilityStatus; authored: CompressedCapability | null; message: string };

function normalizedImportedSpecializationEntries(selection: SourcedSelection) {
  const ranks: Record<string, number> = { ...(selection.specializationRanks ?? {}) };
  const explicit = selection.specialization?.trim();
  if (explicit && !genericSpecialization(explicit)) ranks[explicit] = Math.max(1, ranks[explicit] ?? 0);
  return Object.entries(ranks).map(([name, rank]) => `${name.toLowerCase()}::${rank}`).sort();
}

export function importedCapabilityReconciliation(draft: CharacterDraft, data: StaticData): ImportedCapabilityComparison[] {
  const authored = new Map(compressedCapabilities(draft, data).map((entry) => [canonicalTraitBase(entry.name), entry]));
  return (draft.proficiencies.importedCapabilities ?? []).map((imported) => {
    const match = authored.get(canonicalTraitBase(imported.name)) ?? null;
    const importedLevel = Math.max(1, imported.level ?? 1);
    if (!match) return { imported, status: 'new', authored: null, message: 'New in imported data; add it under Additional Traits and Skills.' };
    if (importedLevel > match.level) return { imported, status: 'exceeds', authored: match, message: `Imported level ${importedLevel} exceeds authored level ${match.level}.` };
    if (importedLevel < match.level) return { imported, status: 'below', authored: match, message: `Imported level ${importedLevel} is below authored level ${match.level}.` };
    const importedSpecs = normalizedImportedSpecializationEntries(imported);
    const authoredSpecs = Object.entries(match.specializations).map(([name, rank]) => `${name.toLowerCase()}::${rank}`).sort();
    if (JSON.stringify(importedSpecs) !== JSON.stringify(authoredSpecs)) return { imported, status: 'specialization-mismatch', authored: match, message: 'Level matches, but qualifier or specializations differ.' };
    return { imported, status: 'match', authored: match, message: 'Matches Granted + Additional.' };
  });
}

export function capabilityDispositionCounts(draft: CharacterDraft, data: StaticData) {
  const capabilities = compressedCapabilities(draft, data);
  let distressing = 0; let ameliorative = 0;
  for (const capability of capabilities) {
    const definitions = capability.sources.map((source) => traitDefinitionForSelection(source, data)).filter(Boolean);
    if (definitions.some((definition) => Boolean(definition?.isDistressing))) distressing += 1;
    if (definitions.some((definition) => Boolean(definition?.isAmeliorative))) ameliorative += 1;
  }
  return { distressing, ameliorative };
}

export type CombinedTrait = {
  key: string;
  name: string;
  level: number;
  specialization: string | null;
  sources: SourcedSelection[];
};

export function combinedGrantedTraits(draft: CharacterDraft, data: StaticData): CombinedTrait[] {
  const groups = new Map<string, CombinedTrait>();

  for (const selection of draft.proficiencies.granted) {
    const specialization = contextualGrantSpecialization(selection, draft, data);
    const unresolvedBroad = selection.name.includes(' > ') && !specialization;
    const base = canonicalTraitBase(selection.name);
    const key = unresolvedBroad ? `${base}::unresolved::${selection.id}` : `${base}::${specialization ?? ''}`;
    const existing = groups.get(key);
    const level = Math.max(1, selection.level ?? 1);
    if (!existing) {
      groups.set(key, {
        key,
        name: selection.name.split(' > ')[0].replace(/\s+X$/, ''),
        level,
        specialization,
        sources: [selection],
      });
      continue;
    }
    existing.level = Math.min(10, Math.max(existing.level, level) + 1);
    existing.sources.push(selection);
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name) || (a.specialization ?? '').localeCompare(b.specialization ?? ''));
}

export function ageSkillpoints(ageYears: number | null) {
  if (ageYears == null || !Number.isFinite(ageYears) || ageYears < 0) return null;
  const age = Math.floor(ageYears);
  if (age < 24) return age;
  return Math.min(40, 24 + Math.floor((age - 24) / 4));
}

export function disabilityBonusSkillpoints(draft: CharacterDraft, data: StaticData) {
  return draft.background.disabilities.reduce((sum, selection) => {
    const record = data.disabilities.find((entry) => entry.catalogId === selection.id);
    if (!record) return sum;
    return sum + Math.abs(Number(record.cost) || 0) * Math.max(1, selection.level ?? 1);
  }, 0);
}

export type SkillSourceStrength = 'ordinary' | 'background' | 'professional' | 'signature';

function sourceStrength(selection: SourcedSelection): SkillSourceStrength {
  if (selection.source === 'pml') return 'signature';
  if (selection.source === 'trade' && selection.sourceDetail?.includes(' — ')) return 'signature';
  if (selection.source === 'trade') return 'professional';
  if (['species', 'lineage', 'heritage'].includes(selection.source)) return 'background';
  return 'ordinary';
}

const SOURCE_LIMIT_BASE: Record<SkillSourceStrength, number> = {
  ordinary: 1,
  background: 2,
  professional: 3,
  signature: 4,
};
const SOURCE_RANK: Record<SkillSourceStrength, number> = { ordinary: 0, background: 1, professional: 2, signature: 3 };

export function strongestSourceForTrait(traitName: string, draft: CharacterDraft) {
  const base = canonicalTraitBase(traitName);
  const matching = draft.proficiencies.granted.filter((selection) => canonicalTraitBase(selection.name) === base);
  let strength: SkillSourceStrength = 'ordinary';
  for (const selection of matching) {
    const candidate = sourceStrength(selection);
    if (SOURCE_RANK[candidate] > SOURCE_RANK[strength]) strength = candidate;
  }
  return { strength, matching };
}

export function startingSkillLimit(traitName: string, draft: CharacterDraft) {
  const intValue = getFinalAttributeValue('INT', draft);
  const knoValue = getFinalAttributeValue('KNO', draft);
  const highestDm = Math.max(
    intValue == null ? 0 : getAttributeDm(intValue),
    knoValue == null ? 0 : getAttributeDm(knoValue),
  );
  const { strength, matching } = strongestSourceForTrait(traitName, draft);
  const tradeRelevant = matching.some((selection) => selection.source === 'trade');
  const tradeBonus = tradeRelevant ? Math.floor((draft.intrinsics.tradeRank ?? 0) / 3) : 0;
  return {
    strength,
    tradeRelevant,
    limit: Math.max(1, Math.min(10, SOURCE_LIMIT_BASE[strength] + highestDm + tradeBonus)),
  };
}

export function additionalSkillCost(selection: SourcedSelection, draft: CharacterDraft, data: StaticData) {
  const definition = traitDefinitionForSelection(selection, data);
  if (!definition) return { im: 0, base: 0, surcharge: 0, total: 0, limit: 1, strength: 'ordinary' as SkillSourceStrength };
  const level = Math.max(1, selection.level ?? 1);
  const im = Math.max(0, parseIM(definition.im));
  const base = im * level;
  const source = startingSkillLimit(definition.trait, draft);
  const supported = source.strength !== 'ordinary' && level <= source.limit;
  const surcharge = supported ? 0 : level === 4 ? 5 : level === 5 ? 10 : 0;
  return { im, base, surcharge, total: base + surcharge, limit: source.limit, strength: source.strength };
}

export function additionalSkillSpent(draft: CharacterDraft, data: StaticData) {
  return draft.proficiencies.additionalSkills.reduce(
    (sum, selection) => sum + additionalSkillCost(selection, draft, data).total,
    0,
  );
}

export function skillpointBudget(draft: CharacterDraft, data: StaticData) {
  const age = ageSkillpoints(draft.background.ageYears);
  const pml = Math.max(1, draft.proficiencies.pml ?? 1);
  const tradeRank = Math.max(1, draft.intrinsics.tradeRank ?? 1);
  const disability = disabilityBonusSkillpoints(draft, data);
  const available = age == null ? null : age + (pml - 1) * 10 + (tradeRank - 1) * 10 + disability;
  const attributes = purchasedAttributeSkillpointCost(draft, data) + zedPurchaseSkillpointCost(draft, data);
  const skills = additionalSkillSpent(draft, data);
  const spent = attributes + skills;
  return {
    age,
    pml: (pml - 1) * 10,
    tradeRank: (tradeRank - 1) * 10,
    disability,
    available,
    attributeSpent: attributes,
    skillSpent: skills,
    spent,
    remaining: available == null ? null : available - spent,
  };
}

export function addAdditionalSkill(draft: CharacterDraft, traitId: string, data: StaticData) {
  const trait = traitDefinitionById(traitId, data);
  if (!trait || trait.isDisability || Math.max(0, parseIM(trait.im)) <= 0) return draft;
  const ordinal = draft.proficiencies.additionalSkills.filter((entry) => entry.catalogId === traitId).length + 1;
  const selection: SourcedSelection = {
    id: `additional-${traitId}-${ordinal}`,
    catalogId: traitId,
    name: trait.trait,
    source: 'player',
    sourceDetail: 'Assign Additional Traits and Skills',
    level: 1,
  };
  return {
    ...draft,
    proficiencies: {
      ...draft.proficiencies,
      additionalSkills: [...draft.proficiencies.additionalSkills, selection],
    },
  };
}

export function updateAdditionalSkill(
  draft: CharacterDraft,
  selectionId: string,
  changes: Partial<Pick<SourcedSelection, 'level' | 'specialization' | 'specializationRanks'>>,
) {
  const additionalSkills = draft.proficiencies.additionalSkills.map((selection) => {
    if (selection.id !== selectionId) return selection;
    const level = changes.level == null ? selection.level : Math.max(1, Math.min(10, Math.trunc(changes.level)));
    return { ...selection, ...changes, level };
  });
  return { ...draft, proficiencies: { ...draft.proficiencies, additionalSkills } };
}

export function removeAdditionalSkill(draft: CharacterDraft, selectionId: string) {
  return {
    ...draft,
    proficiencies: {
      ...draft.proficiencies,
      additionalSkills: draft.proficiencies.additionalSkills.filter((selection) => selection.id !== selectionId),
    },
  };
}

function languageById(id: string, data: StaticData) {
  return data.languages.find((language) => language.id === id) ?? null;
}

export function defaultLanguageSuggestion(draft: CharacterDraft, data: StaticData) {
  const profile = selectedSettlementOption(draft, data);
  if (profile?.defaultLanguageId) return languageById(profile.defaultLanguageId, data);
  const settlement = selectedSettlementName(draft, data);
  if (!settlement) return null;
  const mapping = data.languageDefaults.find((entry) => entry.settlement === settlement);
  if (!mapping) return null;
  return languageById(mapping.languageId, data);
}

export function languageProficiencyPoints(draft: CharacterDraft) {
  const intValue = getFinalAttributeValue('INT', draft);
  return intValue == null ? 0 : Math.max(0, getAttributeDm(intValue));
}

function defaultLanguageBaseLevel(draft: CharacterDraft) {
  const intValue = getFinalAttributeValue('INT', draft);
  const knoValue = getFinalAttributeValue('KNO', draft);
  const dm = Math.max(
    intValue == null ? 0 : getAttributeDm(intValue),
    knoValue == null ? 0 : getAttributeDm(knoValue),
  );
  return Math.max(1, 3 + dm);
}

function heritageLanguageBaseLevel(draft: CharacterDraft) {
  const knoValue = getFinalAttributeValue('KNO', draft);
  return Math.max(1, 1 + (knoValue == null ? 0 : getAttributeDm(knoValue)));
}

function additionalLanguageBaseLevel(draft: CharacterDraft, languagesAlreadyKnown: number) {
  const knoValue = getFinalAttributeValue('KNO', draft);
  const knoDm = knoValue == null ? 0 : getAttributeDm(knoValue);
  return Math.max(1, knoDm + 3 - languagesAlreadyKnown);
}

function recalculateLanguages(languages: LanguageSelection[], draft: CharacterDraft) {
  const ordered = [...languages].sort((a, b) => {
    const order = { default: 0, heritage: 1, proficiency: 2 } as const;
    return order[a.kind] - order[b.kind];
  });
  let known = 0;
  return ordered.map((language) => {
    let baseLevel = language.baseLevel;
    if (language.kind === 'default') baseLevel = defaultLanguageBaseLevel(draft);
    else if (language.kind === 'heritage') baseLevel = heritageLanguageBaseLevel(draft);
    else baseLevel = additionalLanguageBaseLevel(draft, known);
    known += 1;
    return {
      ...language,
      baseLevel,
      level: Math.max(1, baseLevel + Math.max(0, language.improvements)),
    };
  });
}

function buildLanguageSelection(
  languageId: string,
  kind: LanguageSelection['kind'],
  draft: CharacterDraft,
  data: StaticData,
): LanguageSelection | null {
  const language = languageById(languageId, data);
  if (!language) return null;
  const baseLevel = kind === 'default'
    ? defaultLanguageBaseLevel(draft)
    : kind === 'heritage'
      ? heritageLanguageBaseLevel(draft)
      : additionalLanguageBaseLevel(draft, draft.proficiencies.languages.length);
  return {
    id: `language-selection-${kind}-${language.id}`,
    catalogId: language.id,
    name: language.name,
    source: kind === 'heritage' ? 'heritage' : kind === 'default' ? 'rule' : 'player',
    sourceDetail: kind === 'default' ? 'Default regional language' : kind === 'heritage' ? 'Heritage language' : 'Language proficiency',
    kind,
    primary: kind === 'default',
    baseLevel,
    level: baseLevel,
    improvements: 0,
    accentRemoved: false,
    modifiers: [],
  };
}

export function setCoreLanguage(
  draft: CharacterDraft,
  kind: 'default' | 'heritage',
  languageId: string,
  data: StaticData,
) {
  const selection = buildLanguageSelection(languageId, kind, draft, data);
  if (!selection) return draft;
  const retained = draft.proficiencies.languages.filter((language) => language.kind !== kind);
  const next = { ...draft, proficiencies: { ...draft.proficiencies, languages: [...retained, selection] } };
  return { ...next, proficiencies: { ...next.proficiencies, languages: recalculateLanguages(next.proficiencies.languages, next) } };
}

export function addProficiencyLanguage(draft: CharacterDraft, languageId: string, data: StaticData) {
  const selection = buildLanguageSelection(languageId, 'proficiency', draft, data);
  if (!selection) return draft;
  let ordinal = 1;
  const ids = new Set(draft.proficiencies.languages.map((language) => language.id));
  while (ids.has(`${selection.id}-${ordinal}`)) ordinal += 1;
  const variant = { ...selection, id: `${selection.id}-${ordinal}` };
  const next = { ...draft, proficiencies: { ...draft.proficiencies, languages: [...draft.proficiencies.languages, variant] } };
  return { ...next, proficiencies: { ...next.proficiencies, languages: recalculateLanguages(next.proficiencies.languages, next) } };
}

export function updateLanguage(
  draft: CharacterDraft,
  selectionId: string,
  changes: Partial<Pick<LanguageSelection, 'improvements' | 'accentRemoved' | 'modifiers'>>,
) {
  const languages = draft.proficiencies.languages.map((language) => {
    if (language.id !== selectionId) return language;
    return {
      ...language,
      ...changes,
      modifiers: changes.modifiers ? normalizeLanguageModifiers(changes.modifiers) : normalizeLanguageModifiers(language.modifiers),
      improvements: Math.max(0, changes.improvements ?? language.improvements),
    };
  });
  const next = { ...draft, proficiencies: { ...draft.proficiencies, languages } };
  return { ...next, proficiencies: { ...next.proficiencies, languages: recalculateLanguages(languages, next) } };
}

export function removeProficiencyLanguage(draft: CharacterDraft, selectionId: string) {
  const languages = draft.proficiencies.languages.filter(
    (language) => language.id !== selectionId || language.kind !== 'proficiency',
  );
  const next = { ...draft, proficiencies: { ...draft.proficiencies, languages } };
  return { ...next, proficiencies: { ...next.proficiencies, languages: recalculateLanguages(languages, next) } };
}

export function languageProficiencySpent(draft: CharacterDraft) {
  return draft.proficiencies.languages.reduce((sum, language) => (
    sum
    + (language.kind === 'proficiency' ? 1 : 0)
    + Math.max(0, language.improvements)
    + (language.accentRemoved ? 1 : 0)
  ), 0);
}

export function formatLanguageRecord(language: LanguageSelection) {
  const selected = new Set(language.modifiers ?? []);
  const compound = [...LANGUAGE_MODIFIERS].filter((modifier) => selected.has(modifier));
  const core = `${[...compound, language.name].join(' ')} ${language.level ?? 1}`;
  const accented = language.accentRemoved ? core : `[${core}]`;
  return `${language.primary ? '+' : ''}${accented}`;
}

export function syncLanguages(draft: CharacterDraft, data: StaticData) {
  let languages = recalculateLanguages(draft.proficiencies.languages, draft);
  if (!languages.some((language) => language.kind === 'default')) {
    const suggestion = defaultLanguageSuggestion(draft, data);
    if (suggestion) {
      const selection = buildLanguageSelection(suggestion.id, 'default', draft, data);
      if (selection) languages = recalculateLanguages([...languages, selection], draft);
    }
  }
  return { ...draft, proficiencies: { ...draft.proficiencies, languages } };
}

export function syncProficiencies(draft: CharacterDraft, data: StaticData): CharacterDraft {
  const withDefaultPml = draft.proficiencies.pml == null
    ? { ...draft, proficiencies: { ...draft.proficiencies, pml: data.pmlRules.defaultPcPml ?? 1 } }
    : draft;
  return syncLanguages(syncPmlGrantedSelections(withDefaultPml, data), data);
}

export function assessProficiencyStep(stepValue: string, draft: CharacterDraft, data: StaticData): StepAssessment {
  if (stepValue === 'proficiencies-pml') {
    if (draft.proficiencies.pml == null) return { status: 'incomplete', messages: ['Assign starting PML. Standard PCs begin at PML 1.'] };
    const ageRank = ageRankValue(draft, data);
    const required = minimumAgeRankForPml(draft.proficiencies.pml);
    if (ageRank == null) return { status: 'incomplete', messages: ['Assign Age before validating PML.'] };
    const messages: string[] = [];
    if (ageRank < required) messages.push(`PML ${draft.proficiencies.pml} requires minimum Age Rank ${required}.`);
    if (draft.proficiencies.pml > 12) messages.push('PML above 12 is beyond the ordinary PC Late tier and requires an explicitly advanced campaign.');
    if (draft.proficiencies.pml > 5) messages.push(`${Math.max(0, draft.proficiencies.pml - 5)} Secondary Mutation assignment(s) are required; advanced mutation selection is not yet automated.`);
    if (draft.proficiencies.pml > 9) messages.push(`${Math.max(0, draft.proficiencies.pml - 9)} PML-linked psychological Disability assignment(s) are required; advanced mutation selection is not yet automated.`);
    if (messages.length) return { status: 'warning', messages };
    return { status: 'complete', messages: [] };
  }

  if (stepValue === 'proficiencies-granted-skills-traits-talents') {
    const required = pmlVirtuosityMilestones(draft.proficiencies.pml).length;
    const activeMilestones = new Set(pmlVirtuosityMilestones(draft.proficiencies.pml));
    const chosen = draft.proficiencies.pmlVirtuosityChoices.filter((choice) => activeMilestones.has(choice.milestone)).length;
    if (chosen < required) {
      return { status: 'incomplete', messages: [`Choose ${required - chosen} remaining PML Virtuosity trait${required - chosen === 1 ? '' : 's'}.`] };
    }
    const unresolvedSelections = unresolvedBroadGrants(draft, data);
    if (unresolvedSelections.length > 0) {
      const messages = unresolvedSelections.map((selection) => `${selection.name.split(' > ')[0].replace(/\s+X$/, '')}: ${specializationIssue(selection, draft, data)}`);
      return { status: 'warning', messages };
    }
    return { status: 'complete', messages: [] };
  }

  if (stepValue === 'proficiencies-additional-traits-skills') {
    const budget = skillpointBudget(draft, data);
    if (budget.available == null) return { status: 'incomplete', messages: ['Resolve exact Age before the Age Skillpoint pool can be calculated.'] };
    if (budget.remaining != null && budget.remaining < 0) {
      return { status: 'warning', messages: [`Skillpoint spending exceeds the available creation pool by ${Math.abs(budget.remaining)}.`] };
    }
    const messages: string[] = [];
    const tooHigh = draft.proficiencies.additionalSkills.filter((selection) => (selection.level ?? 1) > startingSkillLimit(selection.name, draft).limit);
    if (tooHigh.length) messages.push(`${tooHigh.length} purchased Skill${tooHigh.length === 1 ? '' : 's'} exceed their current source-based starting limit.`);
    for (const selection of unresolvedAdditionalCapabilities(draft, data)) {
      const issue = specializationIssue(selection, draft, data);
      if (issue) messages.push(`${selection.name.split(' > ')[0].replace(/\s+X$/, '')}: ${issue}`);
    }
    if (messages.length) return { status: 'warning', messages };
    return { status: 'complete', messages: [] };
  }

  if (stepValue === 'proficiencies-imported-traits-skills-talents') {
    const comparisons = importedCapabilityReconciliation(draft, data);
    const exceptions = comparisons.filter((entry) => entry.status !== 'match');
    if (exceptions.length) return { status: 'warning', messages: [`${exceptions.length} imported capability exception${exceptions.length === 1 ? '' : 's'} remain. Edit Additional Traits and Skills until the authored character matches the imported reference.`] };
    return { status: 'complete', messages: [] };
  }

  if (stepValue === 'proficiencies-languages') {
    const hasDefault = draft.proficiencies.languages.some((language) => language.kind === 'default');
    const hasHeritage = draft.proficiencies.languages.some((language) => language.kind === 'heritage');
    if (!hasDefault || !hasHeritage) {
      return { status: 'incomplete', messages: ['Assign both the free regional default language and the free Heritage language.'] };
    }
    const available = languageProficiencyPoints(draft);
    const spent = languageProficiencySpent(draft);
    if (spent > available) {
      return { status: 'warning', messages: [`Language proficiency spending exceeds available points (${spent}/${available}).`] };
    }
    const invalidAccentRemoval = draft.proficiencies.languages.some((language) => language.accentRemoved && (language.level ?? 1) < 4);
    if (invalidAccentRemoval) {
      return { status: 'warning', messages: ['An accent can only be removed from a Language at level 4 or greater.'] };
    }
    return { status: 'complete', messages: [] };
  }

  return { status: 'incomplete', messages: [] };
}
