import type { StaticData } from '@/data';
import type { CharacterDraft, InventorySelection, SourcedSelection } from '@/lib/character-draft';
import type { StepAssessment } from './background';
import { effectiveTraitLevel } from './properties';

const UTILITY_STEPS = new Set([
  'utilities-spells',
  'utilities-starting-gear',
  'utilities-magic-items',
  'utilities-name',
  'utilities-relationships',
]);

export type InventoryCategory = 'weapons' | 'armor' | 'equipment';

export function isUtilityStep(stepValue: string) {
  return UTILITY_STEPS.has(stepValue);
}

function scalarNumber(value: string) {
  const text = value.trim().toUpperCase().replace(/\s+/g, '');
  const match = text.match(/^(-?\d+(?:\.\d+)?)([KMG])?$/);
  if (!match) return 0;
  const multiplier = match[2] === 'K' ? 1_000 : match[2] === 'M' ? 1_000_000 : match[2] === 'G' ? 1_000_000_000 : 1;
  return Number(match[1]) * multiplier;
}

export function personalWealthGp(draft: CharacterDraft, data: StaticData) {
  if (draft.intrinsics.wealthRank == null) return null;
  const row = data.universalTable.find((entry) => entry.Index === Math.trunc(draft.intrinsics.wealthRank!));
  return row ? scalarNumber(row.Scalar) : null;
}

export function startingGearTotals(draft: CharacterDraft) {
  const items = [...draft.utilities.weapons, ...draft.utilities.armor, ...draft.utilities.equipment];
  return items.reduce(
    (total, item) => ({
      costGp: total.costGp + Math.max(0, item.quantity) * Math.max(0, item.unitPriceGp),
      weight: total.weight + Math.max(0, item.quantity) * Math.max(0, item.unitWeight),
      itemCount: total.itemCount + Math.max(0, item.quantity),
    }),
    { costGp: 0, weight: 0, itemCount: 0 },
  );
}

function inventoryCatalogue(category: InventoryCategory, data: StaticData) {
  if (category === 'weapons') return data.itemWeapons;
  if (category === 'armor') return data.itemArmors;
  return data.itemEquipments;
}

export function addInventoryItem(
  draft: CharacterDraft,
  category: InventoryCategory,
  catalogId: string,
  data: StaticData,
): CharacterDraft {
  const item = inventoryCatalogue(category, data).find((entry) => entry.catalogId === catalogId);
  if (!item) return draft;
  const current = draft.utilities[category];
  const existing = current.find((entry) => entry.catalogId === catalogId);
  const next: InventorySelection[] = existing
    ? current.map((entry) => entry.catalogId === catalogId ? { ...entry, quantity: entry.quantity + 1 } : entry)
    : [...current, {
        id: `inventory-${category}-${catalogId}`,
        catalogId,
        name: item.name,
        source: 'player',
        sourceDetail: 'Starting Gear',
        quantity: 1,
        unitPriceGp: Number(item.priceGp) || 0,
        unitWeight: Number(item.weight) || 0,
      }];
  return { ...draft, utilities: { ...draft.utilities, [category]: next } };
}

export function setInventoryQuantity(
  draft: CharacterDraft,
  category: InventoryCategory,
  catalogId: string,
  quantity: number,
): CharacterDraft {
  const value = Math.max(0, Math.min(999, Math.trunc(quantity)));
  const next = value === 0
    ? draft.utilities[category].filter((entry) => entry.catalogId !== catalogId)
    : draft.utilities[category].map((entry) => entry.catalogId === catalogId ? { ...entry, quantity: value } : entry);
  return { ...draft, utilities: { ...draft.utilities, [category]: next } };
}

export function toggleSpell(draft: CharacterDraft, catalogId: string, data: StaticData): CharacterDraft {
  const exists = draft.utilities.spells.some((entry) => entry.catalogId === catalogId);
  if (exists) {
    return { ...draft, utilities: { ...draft.utilities, spells: draft.utilities.spells.filter((entry) => entry.catalogId !== catalogId) } };
  }
  const spell = data.spells.find((entry) => entry.catalogId === catalogId);
  if (!spell) return draft;
  const selection: SourcedSelection = {
    id: `spell-selection-${catalogId}`,
    catalogId,
    name: spell.name,
    source: 'player',
    sourceDetail: 'Starting Spells',
    level: spell.level,
  };
  return { ...draft, utilities: { ...draft.utilities, spells: [...draft.utilities.spells, selection] } };
}


export const MAGIC_ITEM_GRADE_RULES = {
  Common: { rarityExponent: 1, worthMultiplier: 10, equivalentGp: 100 },
  Lesser: { rarityExponent: 3, worthMultiplier: 100, equivalentGp: 1_000 },
  Greater: { rarityExponent: 5, worthMultiplier: 1_000, equivalentGp: 10_000 },
  Wondrous: { rarityExponent: 7, worthMultiplier: 10_000, equivalentGp: 100_000 },
  Legendary: { rarityExponent: 9, worthMultiplier: 100_000, equivalentGp: 1_000_000 },
} as const;

function canonicalMagicGrade(value: string) {
  if (value in MAGIC_ITEM_GRADE_RULES) return value as keyof typeof MAGIC_ITEM_GRADE_RULES;
  const first = value.split(/[–—-]/)[0]?.trim();
  return first && first in MAGIC_ITEM_GRADE_RULES ? first as keyof typeof MAGIC_ITEM_GRADE_RULES : 'Common';
}

export function magicItemGradeMetrics(item: StaticData['magicItems'][number]) {
  const grade = canonicalMagicGrade(item.gradeAvailability);
  return { grade, ...MAGIC_ITEM_GRADE_RULES[grade] };
}

const ACCESSORY_FORMS = ['Ring', 'Bangle', 'Bracer', 'Bracelet', 'Bracers', 'Amulet', 'Anklet', 'Anklets', 'Pendant', 'Necklace', 'Circlet'];
const HEAD_FORMS = ['Crown', 'Helm', 'Helmet', 'Hat', 'Goggles', 'Mask', 'Circlet', 'Veil'];
const WEAPON_FORMS = ['Weapon', 'Blade', 'Dagger', 'Knife', 'Mace', 'Club', 'Sword', 'Spear', 'Axe', 'Hammer', 'Glaive', 'Staff', 'Pistol'];
const ARMOR_FORMS = ['Shield', 'Armor', 'Suit', 'Breastplate', 'Robe', 'Raiment', 'Harness', 'Rig'];
const CARRIED_FORMS = ['Orb', 'Lens'];
const AMMUNITION_FORMS = ['Arrow', 'Arrows', 'Bolt', 'Bolts', 'Pellet', 'Pellets', 'Darts'];

export function magicItemFormOptions(item: StaticData['magicItems'][number]) {
  const value = item.form.trim();
  const group = [ACCESSORY_FORMS, HEAD_FORMS, WEAPON_FORMS, ARMOR_FORMS, CARRIED_FORMS, AMMUNITION_FORMS]
    .find((forms) => forms.some((form) => form.toLowerCase() === value.toLowerCase()));
  if (!group) return value ? [value] : [];
  return Array.from(new Set([value, ...group])).filter(Boolean);
}

export function setMagicItemForm(draft: CharacterDraft, catalogId: string, form: string) {
  const magicItemForms = { ...draft.utilities.magicItemForms };
  if (form.trim()) magicItemForms[catalogId] = form.trim(); else delete magicItemForms[catalogId];
  return { ...draft, utilities: { ...draft.utilities, magicItemForms } };
}

export function magicItemTotals(draft: CharacterDraft, data: StaticData) {
  let rarityProduct = 1;
  let worthGp = 0;
  for (const selection of draft.utilities.magicItems) {
    const item = data.magicItems.find((entry) => entry.catalogId === selection.catalogId);
    if (!item) continue;
    const metrics = magicItemGradeMetrics(item);
    rarityProduct *= metrics.worthMultiplier;
    worthGp += metrics.equivalentGp;
  }
  const selectedCount = draft.utilities.magicItems.length;
  const rarityProductLabel = selectedCount
    ? `×${Number.isSafeInteger(rarityProduct) ? rarityProduct.toLocaleString('en-US') : rarityProduct.toExponential(0)}`
    : '×1';
  return { rarityProduct, rarityProductLabel, worthGp };
}

export function toggleMagicItem(draft: CharacterDraft, catalogId: string, data: StaticData): CharacterDraft {
  const exists = draft.utilities.magicItems.some((entry) => entry.catalogId === catalogId);
  if (exists) {
    const magicItemForms = { ...draft.utilities.magicItemForms };
    delete magicItemForms[catalogId];
    return { ...draft, utilities: { ...draft.utilities, magicItems: draft.utilities.magicItems.filter((entry) => entry.catalogId !== catalogId), magicItemForms } };
  }
  const item = data.magicItems.find((entry) => entry.catalogId === catalogId);
  if (!item) return draft;
  const selection: SourcedSelection = {
    id: `magic-item-selection-${catalogId}`,
    catalogId,
    name: item.name,
    source: 'player',
    sourceDetail: `Starting Magic Item — ${item.gradeAvailability}`,
    level: item.gradeLevel,
  };
  return { ...draft, utilities: { ...draft.utilities, magicItems: [...draft.utilities.magicItems, selection] } };
}

function choice<T>(values: readonly T[], random: () => number): T | null {
  if (!values.length) return null;
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))] ?? null;
}

function d6(random: () => number) { return 1 + Math.floor(random() * 6); }
function d66(random: () => number) { return d6(random) * 10 + d6(random); }

function tableValue(table: ReadonlyArray<{ roll: number; value: string }>, random: () => number) {
  const roll = d66(random);
  return table.find((entry) => entry.roll === roll)?.value ?? choice(table, random)?.value ?? '';
}

function cleanGeneratedName(value: string) {
  let text = value.replace(/[-–—]/g, '').replace(/\s+/g, '');
  // The conlang generator instructions universally require duplicate-letter cleanup.
  text = text.replace(/(.)\1+/giu, '$1');
  if (!text) return text;
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

export function suggestedNameLanguageId(draft: CharacterDraft, data: StaticData) {
  const primary = draft.proficiencies.languages.find((entry) => entry.primary)?.catalogId;
  if (primary && data.nameGenerators.some((generator) => generator.languageId === primary)) return primary;
  const heritage = draft.proficiencies.languages.find((entry) => entry.kind === 'heritage')?.catalogId;
  if (heritage && data.nameGenerators.some((generator) => generator.languageId === heritage)) return heritage;
  return data.nameGenerators[0]?.languageId ?? null;
}

export function generateCharacterName(
  languageId: string,
  style: CharacterDraft['utilities']['nameStyle'],
  data: StaticData,
  random: () => number = Math.random,
) {
  const generator = data.nameGenerators.find((entry) => entry.languageId === languageId);
  if (!generator) return '';
  const pattern = generator.patterns.find((entry) => entry.roll === d6(random))?.pattern ?? generator.patterns[0]?.pattern ?? '';

  if (generator.kind === 'borensk' && generator.votivePrefix && generator.initial && generator.kernel && generator.ending) {
    const parts = pattern.match(/Votive Prefix|Initial|Kernel|Ending/gi) ?? [];
    const pieces = parts.map((part) => {
      const key = part.toLowerCase();
      if (key === 'votive prefix') return tableValue(generator.votivePrefix ?? [], random);
      if (key === 'initial') return tableValue(generator.initial ?? [], random);
      if (key === 'kernel') return tableValue(generator.kernel ?? [], random);
      return tableValue(generator.ending ?? [], random);
    });
    return cleanGeneratedName(pieces.join(''));
  }

  let suffixes = generator.referentSuffixes ?? [];
  if (style === 'masculine') suffixes = suffixes.filter((entry) => entry.referent.includes('MALE HUMAN'));
  if (style === 'feminine') suffixes = suffixes.filter((entry) => entry.referent.includes('FEMALE HUMAN'));
  if (style === 'any') {
    const human = suffixes.filter((entry) => entry.referent.includes('HUMAN'));
    if (human.length) suffixes = human;
  }
  const nextSuffix = () => choice(suffixes, random)?.value
    ?? choice(generator.morphologicalSuffixes ?? [], random)?.value
    ?? '';

  const parts = pattern.match(/Begin|Middle|Suffix/gi) ?? [];
  const pieces = parts.map((part) => {
    const key = part.toLowerCase();
    if (key === 'begin') return tableValue(generator.begin ?? [], random);
    if (key === 'middle') return tableValue(generator.middle ?? [], random);
    return nextSuffix();
  });
  // Some generator patterns explain suffix use in prose without spelling the token.
  if (!parts.some((part) => part.toLowerCase() === 'suffix')) pieces.push(nextSuffix());
  return cleanGeneratedName(pieces.join(''));
}

export function syncUtilities(draft: CharacterDraft, data: StaticData): CharacterDraft {
  const hydrateInventory = (category: InventoryCategory): InventorySelection[] => {
    const catalogue = inventoryCatalogue(category, data);
    return draft.utilities[category].map((selection) => {
      const item = catalogue.find((entry) => entry.catalogId === selection.catalogId);
      return item ? {
        ...selection,
        name: item.name,
        quantity: Math.max(1, Math.trunc(selection.quantity || 1)),
        unitPriceGp: Number(item.priceGp) || 0,
        unitWeight: Number(item.weight) || 0,
      } : selection;
    });
  };
  const nameLanguageId = draft.utilities.nameLanguageId
    ?? suggestedNameLanguageId(draft, data);
  return {
    ...draft,
    utilities: {
      ...draft.utilities,
      weapons: hydrateInventory('weapons'),
      armor: hydrateInventory('armor'),
      equipment: hydrateInventory('equipment'),
      nameLanguageId,
    },
  };
}

export function assessUtilityStep(stepValue: string, draft: CharacterDraft, data: StaticData): StepAssessment {
  if (stepValue === 'utilities-spells') {
    if (!draft.utilities.spellsReviewed) return { status: 'incomplete', messages: ['Review starting Spells and explicitly finish this step, including when the character begins with none.'] };
    if (draft.utilities.spells.length > 0 && effectiveTraitLevel(draft, 'v-Magic') <= 0) {
      return { status: 'warning', messages: ['Starting Spells are recorded, but the current character has no v-Magic source. Keep only if another explicit rule grants access.'] };
    }
    return { status: 'complete', messages: [`${draft.utilities.spells.length} starting Spell${draft.utilities.spells.length === 1 ? '' : 's'} recorded.`] };
  }
  if (stepValue === 'utilities-starting-gear') {
    if (!draft.utilities.gearReviewed) return { status: 'incomplete', messages: ['Review starting weapons, armor, and equipment, then finish the gear step.'] };
    const budget = personalWealthGp(draft, data);
    const totals = startingGearTotals(draft);
    if (budget != null && totals.costGp > budget) {
      return { status: 'warning', messages: [`Recorded starting gear costs ${totals.costGp.toFixed(2)} gp, above Personal Wealth ${budget.toFixed(2)} gp. A GM grant, Assets, or another explicit source is needed.`] };
    }
    return { status: 'complete', messages: [`${totals.itemCount} item${totals.itemCount === 1 ? '' : 's'} recorded; ${totals.costGp.toFixed(2)} gp total.`] };
  }
  if (stepValue === 'utilities-magic-items') {
    if (!draft.utilities.magicItemsReviewed) return { status: 'incomplete', messages: ['Review complete Magic Items and explicitly finish this step, including when none are assigned.'] };
    return { status: 'complete', messages: [`${draft.utilities.magicItems.length} complete-data Magic Item${draft.utilities.magicItems.length === 1 ? '' : 's'} recorded.`] };
  }
  if (stepValue === 'utilities-name') {
    if (!draft.utilities.name.trim()) return { status: 'incomplete', messages: ['Record or generate the character’s name.'] };
    return { status: 'complete', messages: [draft.utilities.nameLanguageId ? 'Name source/generator retained with the character draft.' : 'Character name recorded.'] };
  }
  if (stepValue === 'utilities-relationships') {
    return { status: 'complete', messages: ['Relationships are deferred by the current implementation scope and do not block character completion.'] };
  }
  return { status: 'incomplete', messages: [] };
}
