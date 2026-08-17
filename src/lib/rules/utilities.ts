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
  'customize-weapons',
  'customize-armor',
  'customize-equipment',
]);

export type InventoryCategory = 'weapons' | 'armor' | 'equipment';

type CataloguePackage = { baseName: string; packageSize: number };
type AmmunitionPackage = { noun: string; modifier: string; packageSize: number };

function cataloguePackage(name: string): CataloguePackage | null {
  const match = name.trim().match(/^(.*?)\s*[×x]\s*(\d+)$/i);
  if (!match) return null;
  return { baseName: match[1].trim(), packageSize: Math.max(1, Number(match[2]) || 1) };
}

const AMMUNITION_NOUNS: Record<string, string> = {
  arrow: 'Arrow', arrows: 'Arrow',
  bolt: 'Bolt', bolts: 'Bolt',
  bullet: 'Bullet', bullets: 'Bullet',
  round: 'Round', rounds: 'Round',
  pellet: 'Pellet', pellets: 'Pellet',
  arrowhead: 'Arrowhead', arrowheads: 'Arrowhead',
  bolthead: 'Bolthead', boltheads: 'Bolthead',
  shot: 'Shot',
  gunpowder: 'Gunpowder', blackpowder: 'Blackpowder',
};

/** Ordinary ammunition is purchased in catalogue packages but becomes unstructured Notes once assigned. */
export function ammunitionPackage(name: string): AmmunitionPackage | null {
  const pack = cataloguePackage(name);
  if (!pack) return null;
  const match = pack.baseName.match(/^([^,]+?)(?:,\s*(.+))?$/);
  if (!match) return null;
  const noun = AMMUNITION_NOUNS[match[1].trim().toLowerCase()];
  if (!noun) return null;
  return { noun, modifier: (match[2] ?? '').trim(), packageSize: pack.packageSize };
}

function titleModifier(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pluralizeDisplayLabel(value: string) {
  const parts = value.trim().split(/\s+/);
  if (!parts.length) return value;
  const last = parts[parts.length - 1];
  const lower = last.toLowerCase();
  const irregular: Record<string, string> = {
    knife: 'Knives', pouch: 'Pouches', box: 'Boxes', battery: 'Batteries',
    manica: 'Manicas', staff: 'Staves', foot: 'Feet', tooth: 'Teeth',
  };
  if (irregular[lower]) parts[parts.length - 1] = irregular[lower];
  else if (/s$/i.test(last) && !/(?:ss|us)$/i.test(last)) return value;
  else if (/(?:s|x|z|ch|sh)$/i.test(last)) parts[parts.length - 1] = `${last}es`;
  else if (/[^aeiou]y$/i.test(last)) parts[parts.length - 1] = `${last.slice(0, -1)}ies`;
  else parts[parts.length - 1] = `${last}s`;
  return parts.join(' ');
}

/** Convert an ammunition catalogue purchase unit to its plain Notes wording. */
export function ammunitionNote(name: string, packageQuantity = 1) {
  const parsed = ammunitionPackage(name);
  if (!parsed) return null;
  const count = parsed.packageSize * Math.max(1, Math.trunc(packageQuantity || 1));
  const singular = `${parsed.modifier ? `${titleModifier(parsed.modifier)} ` : ''}${parsed.noun}`;
  return `${count} x ${count === 1 ? singular : pluralizeDisplayLabel(singular)}`;
}

function appendUnstructuredNote(notes: string, value: string) {
  const existing = notes.trimEnd();
  if (existing.split(/\r?\n/).some((line) => line.trim().localeCompare(value, undefined, { sensitivity: 'base' }) === 0)) return notes;
  return `${existing}${existing ? '\n\n' : ''}${value}`;
}

const ALLOWED_ARMOR_OVERLAP = /^(?:Elbow|Knee) \((?:Left|Right)\)$/i;

function armorDefinition(selection: InventorySelection, data: StaticData) {
  return selection.catalogId
    ? data.itemArmors.find((entry) => entry.catalogId === selection.catalogId)
    : data.itemArmors.find((entry) => entry.name.localeCompare(selection.name, undefined, { sensitivity: 'base' }) === 0);
}

function armorWearPriority(selection: InventorySelection, data: StaticData) {
  const definition = armorDefinition(selection, data);
  // A concrete sectional description supersedes an abstract Armor Set when legacy
  // data contains both descriptions of the same worn suit.
  const specificity = definition?.armorKind === 'sectional' ? 40 + Math.min(9, definition.coverageAtoms?.length ?? 0) : 0;
  if (selection.sourceDetail === 'Legacy Sheet Equipment') return 100 + specificity;
  if (selection.sourceDetail === 'Customized Gear') return 90 + specificity;
  if (selection.source === 'player') return 80 + specificity;
  if (selection.sourceDetail === 'Legacy History Possession') return 70 + specificity;
  if (selection.sourceDetail === 'Canonical Starting Gear') return 60 + specificity;
  if (selection.source === 'trade') return 50 + specificity;
  return 40 + specificity;
}

function armorSelectionAtoms(selection: InventorySelection, definition: StaticData['itemArmors'][number]) {
  const atoms = (definition.coverageAtoms ?? []).map((atom) => String(atom));
  if (definition.sideRequired !== true) return atoms;
  if (selection.armorSide) return atoms.map((atom) => `${atom} (${selection.armorSide})`);
  if ((selection.quantity ?? 1) >= 2) return atoms.flatMap((atom) => [`${atom} (Left)`, `${atom} (Right)`]);
  // Unsided one-side legacy pieces cannot safely claim a limb. Keep them unresolved;
  // the detailed Armor editor will require a side before accepting the configuration.
  return [];
}

export function armorSelectionsConflict(left: InventorySelection, right: InventorySelection, data: StaticData) {
  const leftDefinition = armorDefinition(left, data);
  const rightDefinition = armorDefinition(right, data);
  if (!leftDefinition || !rightDefinition) return false;
  const leftKind = leftDefinition.armorKind ?? 'other';
  const rightKind = rightDefinition.armorKind ?? 'other';

  // Armor Sets and Sectional Armor are alternate descriptions of the Suit slot.
  if (leftKind === 'set' && (rightKind === 'set' || rightKind === 'sectional')) return true;
  if (rightKind === 'set' && leftKind === 'sectional') return true;
  // Only one Helm, Shield, or Gear layer can be worn at a time.
  if (leftKind === rightKind && ['helmet', 'shield', 'gear'].includes(leftKind)) return true;

  if (!['sectional', 'helmet'].includes(leftKind) || !['sectional', 'helmet'].includes(rightKind)) return false;
  const leftAtoms = new Set(armorSelectionAtoms(left, leftDefinition));
  for (const atom of armorSelectionAtoms(right, rightDefinition)) {
    if (leftAtoms.has(atom) && !ALLOWED_ARMOR_OVERLAP.test(atom)) return true;
  }
  return false;
}

export function resolveWornArmor(selections: InventorySelection[], data: StaticData) {
  const ordered = selections.map((item, index) => ({ item, index }))
    .sort((a, b) => armorWearPriority(b.item, data) - armorWearPriority(a.item, data) || a.index - b.index);
  const worn: InventorySelection[] = [];
  const unworn: InventorySelection[] = [];
  for (const row of ordered) {
    if (worn.some((candidate) => armorSelectionsConflict(candidate, row.item, data))) unworn.push(row.item);
    else worn.push(row.item);
  }
  // Preserve the original inventory order for presentation after conflict resolution.
  const wornIds = new Set(worn.map((item) => item.id));
  const unwornIds = new Set(unworn.map((item) => item.id));
  return {
    worn: selections.filter((item) => wornIds.has(item.id)),
    unworn: selections.filter((item) => unwornIds.has(item.id)),
  };
}

/**
 * Enforce the worn-armor invariant on any draft, including migrated browser state.
 * Losing physical pieces become Notes. A losing Armor Set is only a redundant
 * abstraction of a surviving sectional suit and is discarded rather than duplicated.
 */
export function normalizeArmorWearState(draft: CharacterDraft, data: StaticData): CharacterDraft {
  const { worn, unworn } = resolveWornArmor(draft.utilities.armor, data);
  if (!unworn.length) return draft;
  let notes = draft.utilities.notes;
  for (const item of unworn) {
    const definition = armorDefinition(item, data);
    const redundantSet = definition?.armorKind === 'set' && worn.some((candidate) => {
      const candidateDefinition = armorDefinition(candidate, data);
      return candidateDefinition?.armorKind === 'sectional' && armorSelectionsConflict(candidate, item, data);
    });
    if (redundantSet) continue;
    const quantity = Math.max(1, Math.trunc(item.quantity ?? 1));
    const side = item.armorSide ? `${item.armorSide} ` : '';
    const label = `${side}${displayInventoryName(item.name)}`;
    notes = appendUnstructuredNote(notes, quantity > 1 ? `${label} x ${quantity}` : label);
  }
  return { ...draft, utilities: { ...draft.utilities, armor: worn, notes } };
}

/** Convert canonical catalogue labels to natural reading order for display only. */
export function displayInventoryName(name: string): string {
  const pack = cataloguePackage(name);
  if (pack) {
    if (/^Pouch,\s*Small$/i.test(pack.baseName)) return pack.packageSize > 1 ? `${pack.packageSize} x Small Pouches` : 'Pouch, Small';
    const base = displayInventoryName(pack.baseName);
    return pack.packageSize > 1 ? `${pack.packageSize} x ${pluralizeDisplayLabel(base)}` : base;
  }
  const armorSet = name.trim().match(/^Armor Set,\s*(Light|Medium|Heavy|Field)\s*\((.+)\)$/i);
  if (armorSet) return `Armor, ${titleModifier(armorSet[1])} (${armorSet[2]})`;
  const aliases: Record<string, string> = {
    'blank codex': 'Spellbook',
    'bow, short': 'Shortbow',
    'cloak or cape': 'Cloak or Cape',
    'helmet, full': 'Full Helm',
    'helmet, full mantled': 'Full Helm & Mantle',
    'helmet, half mantled': 'Half Helm & Mantle',
    'knife, small': 'Small Knife',
    'pouch, small': 'Pouch, Small',
    'jewelry, ring': 'Ring',
    'jewelry, bracelet': 'Bracelet',
    'jewelry, necklace': 'Necklace',
    'jewelry, circlet': 'Circlet',
    'jewelry, belt': 'Belt',
    'jewelry, ornament': 'Ornament',
    'sword, broad': 'Broadsword',
    'sword, great': 'Greatsword',
    'sword, rapier': 'Rapier',
  };
  const alias = aliases[name.trim().toLowerCase()];
  if (alias) return alias;
  const [noun, ...modifiers] = name.split(',').map((part) => part.trim());
  if (/^dagger$/i.test(noun) && modifiers.some((part) => /^stiletto$/i.test(part))) return 'Stiletto';
  const meaningful = modifiers.filter((part) => !/^(?:standard|medium|average)$/i.test(part));
  return meaningful.length ? `${meaningful.map(titleModifier).join(' ')} ${noun}` : noun;
}

function cleanCustomAppend(value?: string) {
  return value?.trim().replace(/^\(([\s\S]*)\)$/, '$1').trim() ?? '';
}

/** Append nonmechanical instance text without changing catalogue identity. */
export function displayCustomAppend(base: string, customAppend?: string) {
  const append = cleanCustomAppend(customAppend);
  return append ? `${base} (${append})` : base;
}

/** Tomes, Codexes, Scrolls, Jewelry, Gemstones, and designated pouch variants may carry presentation-only instance text. */
export function inventoryAllowsCustomAppend(name: string) {
  const normalized = name.trim();
  if (/^(?:Case,|Scroll Case\b)/i.test(normalized)) return false;
  if (/^(?:Jewelry,|Gemstone,)/i.test(normalized)) return true;
  if (/^Pouch,\s*Small$/i.test(normalized)) return true;
  return /\b(?:Tome|Codex|Scroll)\b/i.test(normalized);
}

export function displayInventoryQuantity(name: string, quantity = 1, customAppend?: string) {
  if (/^Pouch,\s*Small$/i.test(name.trim()) && cleanCustomAppend(customAppend)) {
    const base = quantity > 1 ? `${quantity} x Small Pouches` : 'Pouch, Small';
    return displayCustomAppend(base, customAppend);
  }
  const pack = cataloguePackage(name);
  if (pack) {
    const count = pack.packageSize * Math.max(1, Math.trunc(quantity || 1));
    if (/^Pouch,\s*Small$/i.test(pack.baseName)) return displayCustomAppend(count > 1 ? `${count} x Small Pouches` : 'Pouch, Small', customAppend);
    const base = displayInventoryName(pack.baseName);
    const display = count > 1 ? `${count} x ${pluralizeDisplayLabel(base)}` : base;
    return displayCustomAppend(display, customAppend);
  }
  const display = displayInventoryName(name);
  return displayCustomAppend(quantity > 1 ? `${quantity} x ${pluralizeDisplayLabel(display)}` : display, customAppend);
}

/** Present a canonical Foo X Magic Item without changing its stored catalogue name. */
export function displayMagicItemName(name: string, level = 1) {
  const normalizedLevel = Math.max(1, Math.trunc(level || 1));
  if (!/\s+X$/i.test(name.trim())) return name.trim();
  const base = name.trim().replace(/\s+X$/i, '');
  return normalizedLevel > 1 ? `${base} ${normalizedLevel}` : base;
}

export function displayMagicItemQuantity(name: string, level = 1, quantity = 1, customAppend?: string) {
  const display = displayMagicItemName(name, level);
  return displayCustomAppend(quantity > 1 ? `${quantity} × ${display}` : display, customAppend);
}

/** Display a selected Magic Item, including form-driven names such as Bracelet of Armor. */
export function displayMagicItemSelection(selection: SourcedSelection, draft: CharacterDraft, data: StaticData) {
  const definition = data.magicItems.find((entry) => entry.catalogId === selection.catalogId);
  let base = displayMagicItemName(selection.name, selection.level ?? 1);
  if (definition?.name === 'Armor X') {
    const form = magicItemInventoryForm(selection, draft, data);
    if (form && !form.fallback) base = `${form.displayName} of Armor`;
  }
  const quantity = Math.max(1, selection.quantity ?? 1);
  const display = quantity > 1 ? `${quantity} × ${base}` : base;
  return displayCustomAppend(display, selection.customAppend);
}

export function displaySpellName(name: string) {
  return name.replace(/±$/, '').trim();
}

export const MAGIC_ITEM_FALLBACK_WEIGHT_LB = 0.01;

export function magicItemInventoryForm(selection: SourcedSelection, draft: CharacterDraft, data: StaticData) {
  const definition = data.magicItems.find((entry) => entry.catalogId === selection.catalogId);
  if (!definition) return null;
  const options = magicItemFormOptions(definition, data);
  const configured = selection.catalogId ? draft.utilities.magicItemForms[selection.catalogId] : null;
  const canonicalName = configured && options.includes(configured)
    ? configured
    : options.length === 1
      ? options[0]
      : null;
  if (!canonicalName) {
    const zeroWeight = /^(?:Gems?|Jewelry|Ring|Amulet|Pendant|Necklace|Bangle|Bracelets?|Anklets?|Belt|Girdle|Circlet|Crown|Charm)$/i.test(definition.form.trim());
    return { category: 'equipment' as const, name: definition.form, displayName: definition.form, weight: zeroWeight ? 0 : MAGIC_ITEM_FALLBACK_WEIGHT_LB, fallback: true };
  }
  const category: InventoryCategory = data.itemWeapons.some((item) => item.name === canonicalName)
    ? 'weapons'
    : data.itemArmors.some((item) => item.name === canonicalName)
      ? 'armor'
      : 'equipment';
  const item = inventoryCatalogue(category, data).find((entry) => entry.name === canonicalName);
  if (!item) return { category: 'equipment' as const, name: canonicalName, displayName: displayInventoryName(canonicalName), weight: MAGIC_ITEM_FALLBACK_WEIGHT_LB, fallback: true };
  const adjusted = adjustedGearValues(category, item, draft, data);
  const pack = category === 'equipment' ? cataloguePackage(item.name) : null;
  const weight = pack ? (Number(adjusted.weight) || 0) / pack.packageSize : Number(adjusted.weight) || 0;
  const displayName = pack ? displayInventoryName(pack.baseName) : displayInventoryName(item.name);
  return { category, name: item.name, displayName, weight, fallback: false };
}

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

/** Current spendable Gold. Imported/recorded gp is authoritative; otherwise Wealth Rank supplies the initial amount. */
export function availableGoldGp(draft: CharacterDraft, data: StaticData) {
  return draft.finances.availableGp ?? personalWealthGp(draft, data);
}

function spendPendingGold(draft: CharacterDraft, amountGp: number, data: StaticData) {
  const amount = Math.max(0, Number(amountGp) || 0);
  if (amount <= 0) return draft;
  const available = availableGoldGp(draft, data);
  if (available != null && amount > available + 1e-9) return null;
  return {
    ...draft,
    finances: {
      ...draft.finances,
      availableGp: available == null ? null : Math.max(0, available - amount),
      pendingSpentGp: draft.finances.pendingSpentGp + amount,
    },
  } as CharacterDraft;
}

/** Commit current-session spending when a character is saved/unloaded. */
export function commitPendingGold(draft: CharacterDraft): CharacterDraft {
  const pending = Math.max(0, Number(draft.finances.pendingSpentGp) || 0);
  if (!pending) return draft;
  return {
    ...draft,
    finances: {
      ...draft.finances,
      gpSpent: Math.max(0, Number(draft.finances.gpSpent) || 0) + pending,
      pendingSpentGp: 0,
    },
  };
}

const SIZE_ADJUSTMENTS = {
  // Refined page-192 fitted-size bands. Weapons retain the practical two-Index
  // progression; armor and worn shell-like gear scale by surface area and keep
  // the same protective thickness, AR, and Deflect.
  6: { weaponWeightIndex: -4, weaponOr: 2, weaponDamage: -2, weaponMinStr: -4, weaponTca: -8, armorWeightIndex: -4, armorRating: 0, armorDeflect: 0, armorTca: -4 },
  9: { weaponWeightIndex: -2, weaponOr: 1, weaponDamage: -1, weaponMinStr: -2, weaponTca: -4, armorWeightIndex: -2, armorRating: 0, armorDeflect: 0, armorTca: -2 },
  12: { weaponWeightIndex: 0, weaponOr: 0, weaponDamage: 0, weaponMinStr: 0, weaponTca: 0, armorWeightIndex: 0, armorRating: 0, armorDeflect: 0, armorTca: 0 },
  15: { weaponWeightIndex: 2, weaponOr: -1, weaponDamage: 1, weaponMinStr: 2, weaponTca: 4, armorWeightIndex: 2, armorRating: 0, armorDeflect: 0, armorTca: 2 },
  18: { weaponWeightIndex: 4, weaponOr: -2, weaponDamage: 2, weaponMinStr: 4, weaponTca: 8, armorWeightIndex: 4, armorRating: 0, armorDeflect: 0, armorTca: 4 },
} as const;

type GearSizedItem = {
  name?: string;
  notes?: string[];
  weight: number;
  priceGp: number;
  priceSp?: number;
  ora?: number;
  acc?: number;
  impact?: number;
  isBracket?: boolean;
  damageDice?: number;
  damageOffset?: number;
  armorRating?: number;
  deflectRating?: number;
  traits?: string[];
  tca?: number;
};

/** Clothing and fitted harness-like gear scale with the wearer for mass, like Armor. */
export function isWornEquipment(item: Pick<GearSizedItem, 'name' | 'notes'>) {
  const notes = item.notes?.join(' ') ?? '';
  return /Category:\s*Clothing\b/i.test(notes)
    || /^(?:Backpack|Quiver),/i.test(item.name ?? '');
}

function fittedSizBracket(value: number) {
  const bracket = Math.round(Number(value) / 3) * 3;
  return Math.max(6, Math.min(18, bracket)) as keyof typeof SIZE_ADJUSTMENTS;
}

export function gearSizeAdjustment(draft: CharacterDraft, sizedForSiz?: number | null) {
  const actualSiz = draft.properties.siz;
  const sourceSiz = sizedForSiz ?? actualSiz;
  if (sourceSiz == null) return null;
  const presumedSiz = fittedSizBracket(sourceSiz);
  return { actualSiz: actualSiz ?? sourceSiz, presumedSiz, direction: presumedSiz < 12 ? 'smaller' as const : presumedSiz > 12 ? 'larger' as const : 'standard' as const, ...SIZE_ADJUSTMENTS[presumedSiz] };
}

/** Convert a scalar to its R10 floor Index, then apply an Index adjustment. */
function indexedScalar(value: number, adjustment: number, data: StaticData) {
  if (!Number.isFinite(value) || value <= 0 || !adjustment) return value;
  const rows = data.universalTable
    .map((row) => ({ ...row, scalar: scalarNumber(row.Scalar) }))
    .filter((row) => Number.isFinite(row.scalar) && row.scalar > 0)
    .sort((a, b) => a.scalar - b.scalar);
  const floor = rows.filter((row) => row.scalar <= value + 1e-9).at(-1) ?? rows[0];
  const target = data.universalTable.find((row) => row.Index === floor.Index + adjustment);
  return target ? scalarNumber(target.Scalar) : value;
}

export function adjustedGearValues(category: InventoryCategory, item: GearSizedItem, draft: CharacterDraft, data: StaticData, sizedForSiz?: number | null) {
  const adjustment = gearSizeAdjustment(draft, sizedForSiz);
  const baseTca = Number(item.tca) || 0;
  const minStr = Number(item.notes?.join(' ').match(/minSTR:\s*(-?\d+)/i)?.[1] ?? 0);
  if (!adjustment || adjustment.direction === 'standard') return { ...item, minStr, tca: baseTca };
  if (category === 'weapons') return { ...item, weight: indexedScalar(Number(item.weight), adjustment.weaponWeightIndex, data), priceGp: indexedScalar(Number(item.priceGp) * 10, adjustment.weaponTca, data) / 10, ora: Number(item.ora ?? 0) + adjustment.weaponOr, damageOffset: Number(item.damageOffset ?? 0) + adjustment.weaponDamage, minStr: minStr + adjustment.weaponMinStr, tca: baseTca + adjustment.weaponTca };
  if (category === 'armor') {
    const basePriceSp = Number(item.priceSp ?? (Number(item.priceGp) * 10));
    const priceSp = indexedScalar(basePriceSp, adjustment.armorTca, data);
    return { ...item, weight: indexedScalar(Number(item.weight), adjustment.armorWeightIndex, data), priceSp, priceGp: priceSp / 10, armorRating: Math.max(0, Number(item.armorRating ?? 0) + adjustment.armorRating), deflectRating: Math.max(0, Number(item.deflectRating ?? 0) + adjustment.armorDeflect), minStr: 0, tca: baseTca + adjustment.armorTca };
  }
  if (isWornEquipment(item)) return { ...item, weight: indexedScalar(Number(item.weight), adjustment.armorWeightIndex, data), minStr: 0, tca: baseTca };
  return { ...item, minStr, tca: baseTca };
}

export function startingGearTotals(draft: CharacterDraft, data?: StaticData) {
  const items = [...draft.utilities.weapons, ...draft.utilities.armor, ...draft.utilities.equipment];
  const totals = items.reduce(
    (total, item) => {
      const category: InventoryCategory = draft.utilities.weapons.includes(item) ? 'weapons' : draft.utilities.armor.includes(item) ? 'armor' : 'equipment';
      const catalogueItem = data && item.catalogId ? inventoryCatalogue(category, data).find((entry) => entry.catalogId === item.catalogId) : null;
      const values = catalogueItem && data ? adjustedGearValues(category, catalogueItem, draft, data, item.sizedForSiz) : { priceGp: item.unitPriceGp, weight: item.unitWeight };
      return ({
      costGp: total.costGp + Math.max(0, item.quantity) * Math.max(0, values.priceGp),
      purchasedCostGp: total.purchasedCostGp + (item.sourceDetail === 'Canonical Starting Gear' ? 0 : Math.max(0, item.quantity) * Math.max(0, values.priceGp)),
      weight: total.weight + Math.max(0, item.quantity) * Math.max(0, values.weight),
      itemCount: total.itemCount + Math.max(0, item.quantity),
    }); },
    { costGp: 0, purchasedCostGp: 0, weight: 0, itemCount: 0 },
  );
  if (data) {
    for (const magicItem of draft.utilities.magicItems) {
      const form = magicItemInventoryForm(magicItem, draft, data);
      if (form) totals.weight += form.weight;
    }
  }
  return totals;
}


/**
 * Weight currently carried for Shoulder/Burden sheet accounting.
 *
 * Notes and ordinary ammunition are intentionally unstructured and therefore do not
 * contribute. Jewelry and ordinary gemstones are deliberately weight-negligible for
 * character-sheet accounting even if later catalogue provenance records physical mass.
 * Structured X=1 Magic Items contribute the weight of their normalized physical form,
 * except Jewelry/Gemstone forms.
 */
export function carriedItemWeight(draft: CharacterDraft, data: StaticData) {
  let weight = 0;

  const selectionWeight = (category: InventoryCategory, selection: InventorySelection) => {
    const catalogue = inventoryCatalogue(category, data);
    const definition = catalogue.find((entry) => entry.catalogId === selection.catalogId)
      ?? catalogue.find((entry) => entry.name.localeCompare(selection.name, undefined, { sensitivity: 'base' }) === 0);
    const canonicalName = definition?.name ?? selection.name;
    const values = definition
      ? adjustedGearValues(category, definition, draft, data, selection.sizedForSiz)
      : { weight: selection.unitWeight };
    return {
      canonicalName,
      unitWeight: Math.max(0, Number(values.weight) || 0),
      quantity: Math.max(0, Math.trunc(selection.quantity || 1)),
    };
  };

  for (const selection of draft.utilities.weapons) {
    const values = selectionWeight('weapons', selection);
    weight += values.quantity * values.unitWeight;
  }

  // Helmets are optional wear and do not contribute to the sheet Shoulder burden.
  // A character can wear only one Armor Set at a time; when several are owned,
  // use the lightest set for this carried/worn burden calculation.
  let lightestArmorSetWeight: number | null = null;
  const legalArmor = resolveWornArmor(draft.utilities.armor, data).worn;
  for (const selection of legalArmor) {
    const values = selectionWeight('armor', selection);
    if (/^Helmet,/i.test(values.canonicalName)) continue;
    if (/^Armor Set,/i.test(values.canonicalName)) {
      const candidate = values.unitWeight; // one worn set, regardless of owned quantity
      lightestArmorSetWeight = lightestArmorSetWeight == null ? candidate : Math.min(lightestArmorSetWeight, candidate);
      continue;
    }
    weight += values.quantity * values.unitWeight;
  }
  if (lightestArmorSetWeight != null) weight += lightestArmorSetWeight;

  for (const selection of draft.utilities.equipment) {
    const values = selectionWeight('equipment', selection);
    if (/^(?:Jewelry|Gemstone),/i.test(values.canonicalName)) continue;
    if (ammunitionPackage(values.canonicalName)) continue;
    weight += values.quantity * values.unitWeight;
  }

  for (const selection of draft.utilities.magicItems) {
    const form = magicItemInventoryForm(selection, draft, data);
    if (!form) continue;
    if (/^(?:Jewelry|Gemstone),/i.test(form.name)) continue;
    if (/^(?:Gems?|Jewelry)$/i.test(form.name.trim())) continue;
    weight += Math.max(1, Math.trunc(selection.quantity ?? 1)) * Math.max(0, Number(form.weight) || 0);
  }
  return Number(weight.toFixed(6));
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
  Wizard: [['equipment', 'Large Book'], ['weapons', 'Magestick, Wand'], ['armor', 'Armor Set, Light (Soft)'], ['weapons', 'Knife, Small']],
};

/** Canonical Trade package preview used by the baseline Starting Gear step. */
export function canonicalStartingGearPreview(draft: CharacterDraft, data: StaticData) {
  const trade = data.tradePackages.find((entry) => makeCatalogId('trade', entry.trade) === draft.intrinsics.tradeId)?.trade ?? null;
  if (!trade) return { trade: null, entries: [] as Array<{ category: InventoryCategory; name: string; displayName: string; quantity: number; noteOnly: boolean }> };
  const requested: Array<[InventoryCategory, string, number?]> = [['equipment', 'Wardrobe'], ...(CANONICAL_STARTING_GEAR[trade] ?? [])];
  const merged = new Map<string, [InventoryCategory, string, number]>();
  for (const [category, name, quantity = 1] of requested) {
    const key = `${category}|${name}`;
    const prior = merged.get(key);
    merged.set(key, [category, name, Math.max(prior?.[2] ?? 0, quantity)]);
  }
  const entries = Array.from(merged.values()).flatMap(([category, name, quantity]) => {
    const item = inventoryCatalogue(category, data).find((candidate) => candidate.name === name);
    if (!item) return [];
    const note = category === 'equipment' ? ammunitionNote(item.name, quantity) : null;
    return [{ category, name: item.name, displayName: note ?? displayInventoryQuantity(item.name, quantity), quantity, noteOnly: Boolean(note) }];
  });
  return { trade, entries };
}

function preserveEstablishedImportedStartingGear(draft: CharacterDraft, data: StaticData): CharacterDraft {
  if (draft.utilities.startingGearTrade || !draft.completedSteps.includes('utilities-starting-gear')) return draft;
  const trade = data.tradePackages.find((entry) => makeCatalogId('trade', entry.trade) === draft.intrinsics.tradeId)?.trade ?? null;
  if (!trade) return draft;
  const inventory = [...draft.utilities.weapons, ...draft.utilities.armor, ...draft.utilities.equipment];
  const looksEstablished = inventory.some((item) => item.source === 'player' || /^(?:Legacy|Customized Gear)/i.test(item.sourceDetail ?? ''));
  if (!looksEstablished) return draft;
  // Completed imported/legacy characters already possess their established equipment.
  // A null marker in old browser state means "migration predates this field", not
  // "inject the current Trade starting package again".
  return { ...draft, utilities: { ...draft.utilities, startingGearTrade: trade } };
}

function canonicalStartingGear(draft: CharacterDraft, data: StaticData): CharacterDraft {
  const trade = data.tradePackages.find((entry) => makeCatalogId('trade', entry.trade) === draft.intrinsics.tradeId)?.trade;
  if (!trade || draft.utilities.startingGearTrade === trade) return draft;
  const withoutPrior = (category: InventoryCategory) => draft.utilities[category].filter((item) => item.sourceDetail !== 'Canonical Starting Gear');
  const next: CharacterDraft = { ...draft, utilities: { ...draft.utilities, weapons: withoutPrior('weapons'), armor: withoutPrior('armor'), equipment: withoutPrior('equipment'), startingGearTrade: trade, gearReviewed: false } };
  const entries: Array<[InventoryCategory, string, number?]> = [['equipment', 'Wardrobe'], ...(CANONICAL_STARTING_GEAR[trade] ?? [])];
  for (const [category, name, quantity = 1] of entries) {
    const item = inventoryCatalogue(category, data).find((candidate) => candidate.name === name);
    if (!item) continue;
    const expendableNote = category === 'equipment' ? ammunitionNote(item.name, quantity) : null;
    if (expendableNote) {
      next.utilities.notes = appendUnstructuredNote(next.utilities.notes, expendableNote);
      continue;
    }
    const current = next.utilities[category];
    const existing = current.find((selection) => selection.catalogId === item.catalogId);
    const sizeAdjustment = gearSizeAdjustment(next);
    const fitted = category === 'weapons' || category === 'armor' || (category === 'equipment' && isWornEquipment(item));
    const sizedForSiz = fitted && sizeAdjustment && sizeAdjustment.presumedSiz !== 12 ? sizeAdjustment.presumedSiz : undefined;
    const selection: InventorySelection = { id: `inventory-${category}-${item.catalogId}`, catalogId: item.catalogId, name: item.name, source: 'trade', sourceDetail: 'Canonical Starting Gear', quantity, unitPriceGp: Number(item.priceGp) || 0, unitWeight: Number(item.weight) || 0, ...(sizedForSiz ? { sizedForSiz } : {}) };
    next.utilities[category] = existing
      ? current.map((entry) => entry.catalogId === item.catalogId && entry.sourceDetail === 'Canonical Starting Gear' ? { ...entry, quantity: Math.max(entry.quantity, quantity) } : entry)
      : [...current, selection];
  }
  return next;
}

export function resetCanonicalStartingGear(draft: CharacterDraft, data: StaticData) {
  return canonicalStartingGear({ ...draft, utilities: { ...draft.utilities, weapons: [], armor: [], armorEditor: { mode: 'preset', suitClass: null, originPresetCatalogId: null, fieldConstruction: false }, equipment: [], startingGearTrade: null, gearReviewed: false } }, data);
}

export function clearStartingGear(draft: CharacterDraft, data: StaticData) {
  const trade = data.tradePackages.find((entry) => makeCatalogId('trade', entry.trade) === draft.intrinsics.tradeId)?.trade ?? null;
  return { ...draft, utilities: { ...draft.utilities, weapons: [], armor: [], armorEditor: { mode: 'preset', suitClass: null, originPresetCatalogId: null, fieldConstruction: false }, equipment: [], startingGearTrade: trade, gearReviewed: false } };
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
  if (category === 'equipment') {
    const expendableNote = ammunitionNote(item.name);
    if (expendableNote) {
      const paid = spendPendingGold(draft, Number(item.priceGp) || 0, data);
      if (!paid) return draft;
      const notes = appendUnstructuredNote(paid.utilities.notes, expendableNote);
      return { ...paid, utilities: { ...paid.utilities, notes } };
    }
  }
  const current = draft.utilities[category];
  const sizeAdjustment = gearSizeAdjustment(draft);
  const fitted = category === 'weapons' || category === 'armor' || (category === 'equipment' && isWornEquipment(item));
  const sizedForSiz = fitted && sizeAdjustment && sizeAdjustment.presumedSiz !== 12 ? sizeAdjustment.presumedSiz : undefined;
  const separateInstance = category === 'equipment' && inventoryAllowsCustomAppend(item.name);
  // Keep the automatic Trade package distinct from optional customization. Adding
  // another copy of a canonical item creates/updates a Customized Gear selection
  // rather than changing the package-provenance quantity.
  const existing = separateInstance ? undefined : current.find((entry) => entry.catalogId === catalogId && entry.sourceDetail !== 'Canonical Starting Gear');
  let ordinal = 1;
  if (separateInstance) while (current.some((entry) => entry.id === `inventory-${category}-${catalogId}-${ordinal}`)) ordinal += 1;
  const next: InventorySelection[] = existing
    ? current.map((entry) => entry.id === existing.id ? { ...entry, quantity: entry.quantity + 1 } : entry)
    : [...current, {
        id: `inventory-${category}-${catalogId}${separateInstance ? `-${ordinal}` : ''}`,
        catalogId,
        name: item.name,
        source: 'player',
        sourceDetail: 'Customized Gear',
        quantity: 1,
        unitPriceGp: Number(item.priceGp) || 0,
        unitWeight: Number(item.weight) || 0,
        ...(/^Jewelry,/i.test(item.name) ? { level: 1 } : {}),
        ...(sizedForSiz ? { sizedForSiz } : {}),
      }];
  return { ...draft, utilities: { ...draft.utilities, [category]: next } };
}

export function setInventoryQuantity(
  draft: CharacterDraft,
  category: InventoryCategory,
  catalogId: string,
  quantity: number,
  selectionId?: string,
): CharacterDraft {
  const value = Math.max(0, Math.min(999, Math.trunc(quantity)));
  const matches = (entry: InventorySelection) => selectionId ? entry.id === selectionId : entry.catalogId === catalogId;
  const next = value === 0
    ? draft.utilities[category].filter((entry) => !matches(entry))
    : draft.utilities[category].map((entry) => matches(entry) ? { ...entry, quantity: value } : entry);
  return { ...draft, utilities: { ...draft.utilities, [category]: next } };
}

export function setInventoryCustomAppend(
  draft: CharacterDraft,
  category: InventoryCategory,
  catalogId: string,
  value: string,
  selectionId?: string,
): CharacterDraft {
  const append = cleanCustomAppend(value);
  const matches = (entry: InventorySelection) => selectionId ? entry.id === selectionId : entry.catalogId === catalogId;
  const next = draft.utilities[category].map((entry) => matches(entry)
    ? { ...entry, ...(append ? { customAppend: append } : { customAppend: undefined }) }
    : entry);
  return { ...draft, utilities: { ...draft.utilities, [category]: next } };
}

/** Jewelry uses the existing selection level as Ornate X; default X=1. */
export function setInventoryOrnateLevel(
  draft: CharacterDraft,
  category: InventoryCategory,
  catalogId: string,
  level: number,
  selectionId?: string,
): CharacterDraft {
  const value = Math.max(1, Math.min(12, Math.trunc(level || 1)));
  const matches = (entry: InventorySelection) => selectionId ? entry.id === selectionId : entry.catalogId === catalogId;
  const next = draft.utilities[category].map((entry) => matches(entry) ? { ...entry, level: value } : entry);
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

const GENERIC_WEAPON_FORMS = new Set(['Weapon']);

function eligibleMagicWeaponForms(data: StaticData) {
  return data.itemWeapons.filter((item) => {
    const name = item.name;
    if (/^(?:1H|2H)\b/i.test(name)) return false; // rocks / improvised forms
    if (/^Feet,/i.test(name)) return false; // bare feet, boots, talons
    if (/^Hands,\s*(?:Bare|Claws|Gauntlet)/i.test(name)) return false;
    if (/^Spiked,\s*(?:Boot|Gauntlet)/i.test(name)) return false;
    return true;
  });
}

function weaponClassOptions(form: string, data: StaticData) {
  const weapons = eligibleMagicWeaponForms(data);
  if (GENERIC_WEAPON_FORMS.has(form)) return weapons.map((item) => item.name);
  const patterns: Record<string, RegExp> = {
    Axe: /^Axe,/i,
    Club: /^Club,/i,
    Dagger: /^Dagger,/i,
    Glaive: /^Polearm,\s*Glaive$/i,
    Hammer: /^(?:Hammer,|War Hammer,)/i,
    Knife: /^Knife,/i,
    Mace: /(?:^|,\s*)(?:War |Spiked )?Mace$/i,
    Pistol: /^Pistol,/i,
    Spear: /^Spear,/i,
    Staff: /^Staff,/i,
    Sword: /^Sword,/i,
  };
  const pattern = patterns[form];
  return pattern ? weapons.filter((item) => pattern.test(item.name)).map((item) => item.name) : [];
}

function armorClassOptions(form: string, data: StaticData) {
  const patterns: Record<string, RegExp> = {
    Armor: /^Armor Set,/i,
    Breastplate: /^Breastplate,/i,
    Bracer: /^Vambraces,/i,
    Bracers: /^Vambraces,/i,
    Helm: /^Helmet,/i,
    Helmet: /^Helmet,/i,
    Leggings: /^Leggings,/i,
    Shield: /^Shield,/i,
    Sleeve: /^Sleeve,/i,
  };
  const pattern = patterns[form];
  return pattern ? data.itemArmors.filter((item) => pattern.test(item.name)).map((item) => item.name) : [];
}

function wearableFormOptions(data: StaticData) {
  const allowed = new Set([
    'Cloak Or Cape', 'Headgear, Cap or Hat', 'Robe', 'Sandals', 'Shirt, Leather',
    'Boots, Fashion', 'Boots, Rugged', 'Boots, Soft', 'Glove, Leather × 2', 'Glove, Silk × 2',
    'Jewelry, Ring', 'Jewelry, Bracelet', 'Jewelry, Necklace', 'Jewelry, Circlet', 'Jewelry, Belt', 'Jewelry, Ornament',
  ]);
  return data.itemEquipments.filter((item) => allowed.has(item.name)).map((item) => item.name);
}

function equipmentFormOptions(form: string, data: StaticData) {
  const exact = data.itemEquipments.find((item) => item.name.localeCompare(form, undefined, { sensitivity: 'base' }) === 0);
  if (exact) return [exact.name];
  if (form === 'Wearable') return wearableFormOptions(data);
  const aliases: Record<string, string> = {
    Anklets: 'Jewelry, Bracelet',
    Amulet: 'Jewelry, Necklace',
    Bangle: 'Jewelry, Bracelet',
    Belt: 'Jewelry, Belt',
    Bracelet: 'Jewelry, Bracelet',
    Bracelets: 'Jewelry, Bracelet',
    Brooch: 'Jewelry, Ornament',
    Charm: 'Jewelry, Ornament',
    Circlet: 'Jewelry, Circlet',
    Earrings: 'Jewelry, Ornament',
    Cloak: 'Cloak Or Cape',
    Crown: 'Jewelry, Circlet',
    Flask: 'Flasks × 10',
    Girdle: 'Jewelry, Belt',
    Hat: 'Headgear, Cap or Hat',
    Necklace: 'Jewelry, Necklace',
    Ornament: 'Jewelry, Ornament',
    Pendant: 'Jewelry, Necklace',
    Pin: 'Jewelry, Ornament',
    Ring: 'Jewelry, Ring',
    'Ring (traditional; variable worn form)': 'Jewelry, Ring',
    Raiment: 'Raiments',
    Tassel: 'Jewelry, Ornament',
    Tiara: 'Jewelry, Circlet',
    Tome: 'Blank Tome',
  };
  const alias = aliases[form];
  if (alias && data.itemEquipments.some((item) => item.name === alias)) return [alias];
  if (form === 'Bag') return data.itemEquipments.filter((item) => /^Bag,/i.test(item.name)).map((item) => item.name);
  if (/^Jewelry$/i.test(form)) return data.itemEquipments.filter((item) => /^Jewelry,/i.test(item.name)).map((item) => item.name);

  // Magic ammunition is a structured Magic Item even though ordinary ammunition
  // becomes Notes. Resolve a singular physical projectile to the standard purchase
  // package so its unit weight can be derived without creating a resource datatype.
  const ammunitionBase: Record<string, string> = {
    Arrow: 'Arrow × 10', Arrows: 'Arrow × 10',
    Bolt: 'Bolt × 10', Bolts: 'Bolt × 10',
    Pellet: 'Pellets × 100', Pellets: 'Pellets × 100',
  };
  const ammo = ammunitionBase[form];
  return ammo && data.itemEquipments.some((item) => item.name === ammo) ? [ammo] : [];
}

/** Canonical physical catalogue forms available to a structured X=1 Magic Item. */
export function magicItemFormOptions(item: StaticData['magicItems'][number], data: StaticData) {
  const form = item.form.trim();
  if (!form) return [];
  const directWeapon = data.itemWeapons.find((entry) => entry.name.localeCompare(form, undefined, { sensitivity: 'base' }) === 0);
  if (directWeapon) return [directWeapon.name];
  const directArmor = data.itemArmors.find((entry) => entry.name.localeCompare(form, undefined, { sensitivity: 'base' }) === 0);
  if (directArmor) return [directArmor.name];
  const weapons = weaponClassOptions(form, data);
  if (weapons.length) return weapons;
  const armor = armorClassOptions(form, data);
  if (armor.length) return armor;
  return equipmentFormOptions(form, data);
}

export function setMagicItemForm(draft: CharacterDraft, catalogId: string, form: string) {
  const magicItemForms = { ...draft.utilities.magicItemForms };
  if (form.trim()) magicItemForms[catalogId] = form.trim(); else delete magicItemForms[catalogId];
  return { ...draft, utilities: { ...draft.utilities, magicItemForms } };
}

export function setMagicItemCustomAppend(draft: CharacterDraft, catalogId: string, value: string) {
  const append = cleanCustomAppend(value);
  const magicItems = draft.utilities.magicItems.map((entry) => entry.catalogId === catalogId
    ? { ...entry, ...(append ? { customAppend: append } : { customAppend: undefined }) }
    : entry);
  return { ...draft, utilities: { ...draft.utilities, magicItems } };
}

export function magicItemTotals(draft: CharacterDraft, data: StaticData) {
  let rarityProduct = 1;
  let worthGp = 0;
  let weight = 0;
  for (const selection of draft.utilities.magicItems) {
    const item = data.magicItems.find((entry) => entry.catalogId === selection.catalogId);
    if (!item) continue;
    const metrics = magicItemGradeMetrics(item);
    rarityProduct *= metrics.worthMultiplier;
    worthGp += metrics.equivalentGp;
    weight += magicItemInventoryForm(selection, draft, data)?.weight ?? 0;
  }
  const selectedCount = draft.utilities.magicItems.length;
  const rarityProductLabel = selectedCount
    ? `×${Number.isSafeInteger(rarityProduct) ? rarityProduct.toLocaleString('en-US') : rarityProduct.toExponential(0)}`
    : '×1';
  return { rarityProduct, rarityProductLabel, worthGp, weight };
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
    level: 1,
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
  draft = preserveEstablishedImportedStartingGear(draft, data);
  draft = canonicalStartingGear(draft, data);
  let notes = draft.utilities.notes;
  const retainedEquipment = draft.utilities.equipment.filter((selection) => {
    const note = ammunitionNote(selection.name, selection.quantity);
    if (!note) return true;
    notes = appendUnstructuredNote(notes, note);
    return false;
  });
  draft = { ...draft, utilities: { ...draft.utilities, equipment: retainedEquipment, notes } };
  const hydrateInventory = (category: InventoryCategory): InventorySelection[] => {
    const catalogue = inventoryCatalogue(category, data);
    const defaultSize = gearSizeAdjustment(draft);
    return draft.utilities[category].map((selection) => {
      const item = catalogue.find((entry) => entry.catalogId === selection.catalogId);
      if (!item) return selection;
      const fitted = category === 'weapons' || category === 'armor' || (category === 'equipment' && isWornEquipment(item));
      const sizedForSiz = selection.sizedForSiz ?? (fitted && defaultSize && defaultSize.presumedSiz !== 12 ? defaultSize.presumedSiz : undefined);
      return {
        ...selection,
        name: item.name,
        quantity: Math.max(1, Math.trunc(selection.quantity || 1)),
        unitPriceGp: Number(item.priceGp) || 0,
        unitWeight: Number(item.weight) || 0,
        ...(sizedForSiz ? { sizedForSiz } : { sizedForSiz: undefined }),
      };
    });
  };
  const nameLanguageId = draft.utilities.nameLanguageId
    ?? suggestedNameLanguageId(draft, data);
  const nameStyle = draft.utilities.nameStyle === 'any' && draft.background.gender
    ? (draft.background.gender === 'Female' ? 'feminine' : draft.background.gender === 'Male' ? 'masculine' : 'any')
    : draft.utilities.nameStyle;
  const synced: CharacterDraft = {
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
  return normalizeArmorWearState(synced, data);
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
    const preview = canonicalStartingGearPreview(draft, data);
    if (!preview.trade) return { status: 'warning', messages: ['Starting Gear is assigned from Trade after a Trade is selected.'] };
    if (draft.utilities.startingGearTrade !== preview.trade) return { status: 'warning', messages: ['Starting Gear is waiting for the current Trade package to synchronize.'] };
    return { status: 'complete', messages: [`Canonical ${preview.trade} Starting Gear assigned automatically. Optional changes are available under 7. Customize.`] };
  }
  if (stepValue === 'customize-weapons' || stepValue === 'customize-armor' || stepValue === 'customize-equipment') {
    return { status: 'complete', messages: [] };
  }
  if (stepValue === 'utilities-magic-items') {
    const unresolvedForms = draft.utilities.magicItems.filter((selection) => {
      const item = data.magicItems.find((entry) => entry.catalogId === selection.catalogId);
      if (!item) return false;
      const options = magicItemFormOptions(item, data);
      if (options.length <= 1) return false;
      const configured = selection.catalogId ? draft.utilities.magicItemForms[selection.catalogId] : null;
      return !configured || !options.includes(configured);
    });
    if (unresolvedForms.length) return { status: 'incomplete', messages: [`Choose a canonical physical form for ${unresolvedForms.map((item) => displayMagicItemName(item.name, 1)).join(', ')} so its weight can be determined.`] };
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
