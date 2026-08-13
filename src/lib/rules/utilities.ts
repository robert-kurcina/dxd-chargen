import type { StaticData } from '@/data';
import { makeCatalogId } from '@/data/catalog-policy';
import type { CharacterDraft, InventorySelection, SourcedSelection } from '@/lib/character-draft';
import { formatNumberWithCommas } from '@/lib/utils';
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

const SIZE_ADJUSTMENTS = {
  0: { weaponWeightIndex: -8, weaponOr: 6, weaponDamage: -6, weaponMinStr: -8, weaponTca: -16, armorWeight: -12, armorRating: -8, armorDeflect: -4, armorTca: -8 },
  3: { weaponWeightIndex: -6, weaponOr: 4, weaponDamage: -4, weaponMinStr: -6, weaponTca: -12, armorWeight: -9, armorRating: -6, armorDeflect: -3, armorTca: -6 },
  6: { weaponWeightIndex: -4, weaponOr: 3, weaponDamage: -3, weaponMinStr: -4, weaponTca: -8, armorWeight: -6, armorRating: -4, armorDeflect: -2, armorTca: -4 },
  9: { weaponWeightIndex: -2, weaponOr: 2, weaponDamage: -1, weaponMinStr: -2, weaponTca: -4, armorWeight: -3, armorRating: -2, armorDeflect: -1, armorTca: -2 },
  12: { weaponWeightIndex: 0, weaponOr: 0, weaponDamage: 0, weaponMinStr: 0, weaponTca: 0, armorWeight: 0, armorRating: 0, armorDeflect: 0, armorTca: 0 },
  15: { weaponWeightIndex: 2, weaponOr: -2, weaponDamage: 1, weaponMinStr: 2, weaponTca: 4, armorWeight: 3, armorRating: 2, armorDeflect: 1, armorTca: 2 },
  18: { weaponWeightIndex: 4, weaponOr: -3, weaponDamage: 3, weaponMinStr: 4, weaponTca: 8, armorWeight: 6, armorRating: 4, armorDeflect: 2, armorTca: 4 },
} as const;

export function gearSizeAdjustment(draft: CharacterDraft) {
  if (draft.properties.siz == null) return null;
  const presumedSiz = Math.max(0, Math.min(18, Math.round(draft.properties.siz / 3) * 3)) as keyof typeof SIZE_ADJUSTMENTS;
  return { actualSiz: draft.properties.siz, presumedSiz, direction: presumedSiz < 12 ? 'smaller' as const : presumedSiz > 12 ? 'larger' as const : 'standard' as const, ...SIZE_ADJUSTMENTS[presumedSiz] };
}

function indexedScalar(value: number, adjustment: number, data: StaticData) {
  if (!value || !adjustment) return value;
  const closest = [...data.universalTable].sort((a, b) => Math.abs(scalarNumber(a.Scalar) - value) - Math.abs(scalarNumber(b.Scalar) - value))[0];
  const target = data.universalTable.find((row) => row.Index === closest.Index + adjustment);
  return target ? scalarNumber(target.Scalar) : value;
}

export function adjustedGearValues(category: InventoryCategory, item: { weight: number; priceGp: number; ora?: number; damageOffset?: number; armorRating?: number; deflectRating?: number; notes?: string[] }, draft: CharacterDraft, data: StaticData) {
  const adjustment = gearSizeAdjustment(draft);
  if (!adjustment || adjustment.direction === 'standard' || category === 'equipment') return { ...item, minStr: Number(item.notes?.join(' ').match(/minSTR:\s*(-?\d+)/i)?.[1] ?? 0), tca: 0 };
  if (category === 'weapons') return { ...item, weight: indexedScalar(Number(item.weight), adjustment.weaponWeightIndex, data), priceGp: indexedScalar(Number(item.priceGp) * 10, adjustment.weaponTca, data) / 10, ora: Number(item.ora ?? 0) + adjustment.weaponOr, damageOffset: Number(item.damageOffset ?? 0) + adjustment.weaponDamage, minStr: Number(item.notes?.join(' ').match(/minSTR:\s*(-?\d+)/i)?.[1] ?? 0) + adjustment.weaponMinStr, tca: adjustment.weaponTca };
  return { ...item, weight: Math.max(0.1, Number(item.weight) + adjustment.armorWeight), priceGp: indexedScalar(Number(item.priceGp) * 10, adjustment.armorTca, data) / 10, armorRating: Math.max(0, Number(item.armorRating ?? 0) + adjustment.armorRating), deflectRating: Math.max(0, Number(item.deflectRating ?? 0) + adjustment.armorDeflect), minStr: 0, tca: adjustment.armorTca };
}

export function startingGearTotals(draft: CharacterDraft, data?: StaticData) {
  const items = [...draft.utilities.weapons, ...draft.utilities.armor, ...draft.utilities.equipment];
  return items.reduce(
    (total, item) => {
      const category: InventoryCategory = draft.utilities.weapons.includes(item) ? 'weapons' : draft.utilities.armor.includes(item) ? 'armor' : 'equipment';
      const catalogueItem = data && item.catalogId ? inventoryCatalogue(category, data).find((entry) => entry.catalogId === item.catalogId) : null;
      const values = catalogueItem && data ? adjustedGearValues(category, catalogueItem, draft, data) : { priceGp: item.unitPriceGp, weight: item.unitWeight };
      return ({
      costGp: total.costGp + Math.max(0, item.quantity) * Math.max(0, values.priceGp),
      purchasedCostGp: total.purchasedCostGp + (item.sourceDetail === 'Canonical Starting Gear' ? 0 : Math.max(0, item.quantity) * Math.max(0, values.priceGp)),
      weight: total.weight + Math.max(0, item.quantity) * Math.max(0, values.weight),
      itemCount: total.itemCount + Math.max(0, item.quantity),
    }); },
    { costGp: 0, purchasedCostGp: 0, weight: 0, itemCount: 0 },
  );
}

const CANONICAL_STARTING_GEAR: Record<string, Array<[InventoryCategory, string, number?]>> = {
  Academic: [['equipment', 'Wardrobe']],
  Cleric: [['equipment', 'Idol or Figurine'], ['weapons', 'Club, Wood'], ['armor', 'Armor Set, Light (Soft)'], ['armor', 'Shield, Small'], ['weapons', 'Knife, Small']],
  Entertainer: [['equipment', 'Wardrobe', 2]],
  Knight: [['weapons', 'Sword, Long'], ['armor', 'Shield, Large'], ['armor', 'Helmet, Full'], ['weapons', 'Dagger, Standard'], ['armor', 'Breastplate, Metal'], ['equipment', 'Wardrobe', 2]],
  Mariner: [['weapons', 'Axe, Throwing × 2'], ['weapons', 'Dagger, Standard'], ['weapons', 'Hands, Garrote'], ['equipment', 'Bag, Large × 1'], ['equipment', 'Herbs & Spices × 100'], ['equipment', 'Perfume kit']],
  Rabble: [['weapons', 'Club, Wood']],
  Ranger: [['equipment', 'Large Book'], ['weapons', 'Bow, Short'], ['weapons', 'Staff, Quarter'], ['equipment', 'Quiver, Large'], ['equipment', 'Arrow × 10', 3], ['weapons', 'Knife, Hunting']],
  Service: [['equipment', 'Wardrobe', 2]],
  Rogue: [['equipment', 'Lockpick kit'], ['armor', 'Armor Set, Light (Soft)'], ['weapons', 'Dagger, Standard'], ['equipment', 'Pouch, Small × 10']],
  Warrior: [['weapons', 'Sword, Long'], ['armor', 'Armor Set, Medium (Mail)'], ['armor', 'Shield, Medium']],
  Wizard: [['equipment', 'Large Book'], ['weapons', '❶ Magestick, Wand'], ['armor', 'Armor Set, Light (Soft)'], ['weapons', 'Knife, Small']],
};

function canonicalStartingGear(draft: CharacterDraft, data: StaticData): CharacterDraft {
  const trade = data.tradePackages.find((entry) => makeCatalogId('trade', entry.trade) === draft.intrinsics.tradeId)?.trade;
  if (!trade || draft.utilities.startingGearTrade === trade) return draft;
  const withoutPrior = (category: InventoryCategory) => draft.utilities[category].filter((item) => item.sourceDetail !== 'Canonical Starting Gear');
  const next: CharacterDraft = { ...draft, utilities: { ...draft.utilities, weapons: withoutPrior('weapons'), armor: withoutPrior('armor'), equipment: withoutPrior('equipment'), startingGearTrade: trade, gearReviewed: false } };
  const entries: Array<[InventoryCategory, string, number?]> = [['equipment', 'Wardrobe'], ...(CANONICAL_STARTING_GEAR[trade] ?? [])];
  for (const [category, name, quantity = 1] of entries) {
    const item = inventoryCatalogue(category, data).find((candidate) => candidate.name === name);
    if (!item) continue;
    const current = next.utilities[category];
    const existing = current.find((selection) => selection.catalogId === item.catalogId);
    const selection: InventorySelection = { id: `inventory-${category}-${item.catalogId}`, catalogId: item.catalogId, name: item.name, source: 'trade', sourceDetail: 'Canonical Starting Gear', quantity, unitPriceGp: Number(item.priceGp) || 0, unitWeight: Number(item.weight) || 0 };
    next.utilities[category] = existing
      ? current.map((entry) => entry.catalogId === item.catalogId && entry.sourceDetail === 'Canonical Starting Gear' ? { ...entry, quantity: Math.max(entry.quantity, quantity) } : entry)
      : [...current, selection];
  }
  return next;
}

export function resetCanonicalStartingGear(draft: CharacterDraft, data: StaticData) {
  return canonicalStartingGear({ ...draft, utilities: { ...draft.utilities, weapons: [], armor: [], equipment: [], startingGearTrade: null, gearReviewed: false } }, data);
}

export function clearStartingGear(draft: CharacterDraft, data: StaticData) {
  const trade = data.tradePackages.find((entry) => makeCatalogId('trade', entry.trade) === draft.intrinsics.tradeId)?.trade ?? null;
  return { ...draft, utilities: { ...draft.utilities, weapons: [], armor: [], equipment: [], startingGearTrade: trade, gearReviewed: false } };
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
  draft = canonicalStartingGear(draft, data);
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
  const nameStyle = draft.utilities.nameStyle === 'any' && draft.background.gender
    ? (draft.background.gender === 'Female' ? 'feminine' : draft.background.gender === 'Male' ? 'masculine' : 'any')
    : draft.utilities.nameStyle;
  return {
    ...draft,
    utilities: {
      ...draft.utilities,
      weapons: hydrateInventory('weapons'),
      armor: hydrateInventory('armor'),
      equipment: hydrateInventory('equipment'),
      nameLanguageId,
      nameStyle,
    },
  };
}

export function assessUtilityStep(stepValue: string, draft: CharacterDraft, data: StaticData): StepAssessment {
  if (stepValue === 'utilities-spells') {
    const vMagic = effectiveTraitLevel(draft, 'v-Magic');
    if (vMagic <= 0 && draft.utilities.spells.length === 0) {
      return { status: 'complete', messages: ['No v-Magic source is present; Assign Spells is not required.'] };
    }
    if (vMagic <= 0) {
      return { status: 'warning', messages: ['Starting Spells are recorded, but the current character has no v-Magic source. Keep only if another explicit rule grants access.'] };
    }
    if (!draft.utilities.spellsReviewed) return { status: 'incomplete', messages: ['Review starting Spells and explicitly finish this step, including when the character begins with none.'] };
    return { status: 'complete', messages: [`${draft.utilities.spells.length} starting Spell${draft.utilities.spells.length === 1 ? '' : 's'} recorded.`] };
  }
  if (stepValue === 'utilities-starting-gear') {
    const budget = personalWealthGp(draft, data);
    const totals = startingGearTotals(draft, data);
    if (!draft.utilities.gearReviewed) return { status: 'warning', messages: ['Review and approve the canonical Starting Gear package. Its worth is informational and is not deducted from Personal Wealth.'] };
    if (budget != null && totals.purchasedCostGp > budget) {
      return { status: 'warning', messages: [`Additional purchased gear costs ${formatNumberWithCommas(totals.purchasedCostGp, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gp, above Personal Wealth ${formatNumberWithCommas(budget, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gp.`] };
    }
    return { status: 'complete', messages: [`${formatNumberWithCommas(totals.itemCount)} item${totals.itemCount === 1 ? '' : 's'} recorded; ${formatNumberWithCommas(totals.costGp, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gp total.`] };
  }
  if (stepValue === 'utilities-magic-items') {
    if (!draft.utilities.magicItemsReviewed) return { status: 'warning', messages: ['Review and approve the Magic Item selection, including when none are assigned.'] };
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
