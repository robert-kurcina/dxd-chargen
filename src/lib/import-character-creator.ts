import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sarnaLenData from '@/data';
import { createEmptyCharacterDraft, type CharacterDraft, type InventorySelection, type LanguageModifier, type LanguageSelection, type SourcedSelection } from '@/lib/character-draft';
import { makeCatalogId } from '@/data/catalog-policy';
import { physicalBreakdown } from '@/lib/rules/properties';
import { unresolvedBroadGrants } from '@/lib/rules/proficiencies';
import { ammunitionNote, inventoryAllowsCustomAppend } from '@/lib/rules/utilities';

type LegacyCharacter = Record<string, any>;

const COMPLETED_CREATOR_STEPS = [
  'background-region-settlement',
  'background-demographics',
  'background-heritage',
  'background-social-rank',
  'background-personality',
  'background-tragedy-seed',
  'background-disabilities',
  'background-belief-worship',
  'intrinsics-species',
  'intrinsics-attributes',
  'intrinsics-trade-specialization',
  'intrinsics-zed',
  'intrinsics-wealth',
  'proficiencies-pml',
  'proficiencies-skills-abilities-talents',
  'proficiencies-additional-skills',
  'proficiencies-languages',
  'properties-height-weight',
  'properties-calculations',
  'utilities-spells',
  'utilities-starting-gear',
  'utilities-magic-items',
  'utilities-name',
  'utilities-relationships',
  'notes-overview',
  'notes-portrait',
];

const slug = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unnamed';
const label = (value: unknown) => typeof value === 'string' ? value : value && typeof value === 'object' && 'name' in value ? String((value as { name: unknown }).name ?? '') : String(value ?? '');
const selection = (value: unknown, source: SourcedSelection['source'] = 'player', level?: number): SourcedSelection => { const name = label(value); return { id: makeCatalogId('import', name), name, source, ...(level == null ? {} : { level }) }; };
function inventoryQuantity(value: string) {
  const prefix = value.trim().match(/^(\d+)\s*[x×]\s*(.+)$/i);
  if (prefix) return { name: prefix[2].trim(), quantity: Number(prefix[1]) };
  const suffix = value.trim().match(/^(.+?)\s*[x×]\s*(\d+)$/i);
  if (suffix) return { name: suffix[1].trim(), quantity: Number(suffix[2]) };
  return { name: value.trim(), quantity: 1 };
}
const inventory = (name: string, sheetProperties?: string): InventorySelection => {
  const parsed = inventoryQuantity(name);
  const sizeMatch = parsed.name.match(/\s+SIZ\s+(\d+)\b/i);
  const cleanName = parsed.name.replace(/\s+SIZ\s+\d+\b/i, '').trim();
  return { ...selection(cleanName), quantity: parsed.quantity, unitPriceGp: 0, unitWeight: 0, ...(sizeMatch ? { sizedForSiz: Number(sizeMatch[1]) } : {}), ...(sheetProperties ? { sheetProperties } : {}) };
};
const heightInches = (value: unknown) => {
  const match = String(value ?? '').match(/(\d+)'\s*(\d+)/);
  return match ? Number(match[1]) * 12 + Number(match[2]) : null;
};

// Legacy BackNotes use both empty and whitespace-only lines as record separators.
// Treat either form as a paragraph boundary so item/property rows stay paired.
const blocks = (value: unknown) => String(value ?? '').split(/\r?\n[ \t]*\r?\n/).map((part) => part.trim()).filter(Boolean);
function itemPropertyLookup(sheet: LegacyCharacter) {
  const names = blocks(sheet.WeaponsArmorEquipment);
  const properties = blocks(sheet.WeaponsArmorEquipmentProperties);
  return new Map(names.map((name, index) => [name, properties[index] ?? '']));
}
const itemKey = (value: string) => value.toLocaleLowerCase()
  .replace(/shortsword/g, 'short sword')
  .replace(/\bsiz\s*\d+\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean).sort().join(' ');
function importedProperty(name: string, lookup: Map<string, string>) {
  const normalized = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+x\s*\d+$/, '').trim();
  const normalizedKey = itemKey(normalized);
  const entry = [...lookup.entries()].find(([candidate]) => candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate) || itemKey(candidate) === normalizedKey);
  return entry?.[1];
}
const importedDisplay = (name: string, detail: string) => ({ ...selection(name), sourceDetail: detail });
function curatedSheetInventory(sheet: LegacyCharacter) {
  return [...itemPropertyLookup(sheet).entries()].map(([name, properties]) => inventory(name, properties));
}

const HERITAGE_ALIASES: Record<string, string> = {
  Wilding: 'Wildling', Desert: 'Deserts', Forest: 'Forests', Mountains: 'Mountain',
  Herder: 'Herding', Aristocrat: 'Aristocrats', Gentry: 'Landed',
};
const LANGUAGE_MODIFIER_ORDER: LanguageModifier[] = ['Old', 'High', 'Low', 'War', 'Lingo', 'Barter'];
const LANGUAGE_ALIASES: Record<string, { name: string; modifiers?: LanguageModifier[] }> = {
  auldfar: { name: 'Ershthiikal' },
  ershthikal: { name: 'Ershthiikal' },
  bamini: { name: 'Heimneshi' },
  common: { name: 'Coro' },
  golbrin: { name: 'Ershthiikal' },
  jamarati: { name: 'Borensk', modifiers: ['Low'] },
  kahuzid: { name: 'Kahadi' },
  'common-lingo': { name: 'Coro', modifiers: ['Lingo'] },
  lorespeak: { name: 'Blacktongue', modifiers: ['Low'] },
  vanry: { name: 'Rasiya', modifiers: ['High'] },
  restani: { name: 'Rasiya' }, resta: { name: 'Rasiya' }, oruguku: { name: 'Orukugu' },
  'kadahdi barter': { name: 'Kahadi', modifiers: ['Barter'] }, 'kahadi barter': { name: 'Kahadi', modifiers: ['Barter'] }, kahudi: { name: 'Kahadi' }, warkahad: { name: 'Kahadi', modifiers: ['War'] },
  'kardik barter': { name: 'Stask', modifiers: ['Barter'] }, 'khardik barter': { name: 'Stask', modifiers: ['Barter'] }, 'middle khardik': { name: 'Stask' }, 'war vasikha': { name: 'Stask', modifiers: ['War'] },
  'coro-lingo': { name: 'Coro', modifiers: ['Lingo'] }, coromu: { name: 'Coro' }, 'corumu lingo': { name: 'Coro', modifiers: ['Lingo'] }, 'coromur lingo': { name: 'Coro', modifiers: ['Lingo'] }, 'middle coro': { name: 'Coro' },
  drusa: { name: 'Ithuuikal' }, drusi: { name: 'Ithuuikal' }, drusian: { name: 'Ithuuikal' },
  'low coasts': { name: 'Cher-gulo', modifiers: ['Low'] }, magespeak: { name: 'Blacktongue' },
};

function normalizeLanguageSelection(language: LanguageSelection): LanguageSelection {
  const raw = language.name.trim();
  let mapped = LANGUAGE_ALIASES[raw.toLowerCase()];
  if (!mapped) {
    const words = raw.split(/\s+/);
    const modifiers: LanguageModifier[] = [];
    const baseWords: string[] = [];
    for (const word of words) {
      const token = word.replace(/[^a-z]/gi, '').toLowerCase();
      if (token === 'middle') continue;
      const modifier = token === 'warlang' ? 'War' : LANGUAGE_MODIFIER_ORDER.find((candidate) => candidate.toLowerCase() === token);
      if (modifier) modifiers.push(modifier);
      else baseWords.push(word);
    }
    const base = baseWords.join(' ');
    const baseAlias = LANGUAGE_ALIASES[base.toLowerCase()];
    mapped = baseAlias
      ? { name: baseAlias.name, modifiers: [...(baseAlias.modifiers ?? []), ...modifiers] }
      : { name: base, modifiers };
  }
  const definition = sarnaLenData.languages.find((entry) => entry.name.localeCompare(mapped.name, undefined, { sensitivity: 'base' }) === 0);
  const selected = new Set<LanguageModifier>([...(language.modifiers ?? []), ...(mapped.modifiers ?? [])]);
  return {
    ...language,
    ...(definition ? { catalogId: definition.id, name: definition.name } : { name: mapped.name }),
    modifiers: LANGUAGE_MODIFIER_ORDER.filter((modifier) => selected.has(modifier)),
  };
}

function normalizeLanguages(languages: LanguageSelection[]) {
  const grouped = new Map<string, LanguageSelection>();
  for (const language of languages.map(normalizeLanguageSelection)) {
    const modifiers = language.modifiers ?? [];
    const key = `${language.catalogId ?? language.name.toLowerCase()}|${modifiers.join('|').toLowerCase()}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, language);
      continue;
    }
    const defaultLanguage = existing.kind === 'default' ? existing : language.kind === 'default' ? language : existing;
    grouped.set(key, {
      ...defaultLanguage,
      kind: existing.kind === 'default' || language.kind === 'default' ? 'default' : 'proficiency',
      primary: existing.primary || language.primary,
      baseLevel: Math.max(existing.baseLevel, language.baseLevel),
      improvements: Math.max(existing.improvements, language.improvements),
      accentRemoved: existing.accentRemoved || language.accentRemoved,
    });
  }
  return [...grouped.values()];
}

const CAPABILITY_ALIASES: Record<string, string> = {
  acrobatics: 'Acrobatic X',
  archer: 'Archery X',
  barrter: 'Barter X',
  climbing: 'Climb X',
  compass: 'v-Compass X',
  'knife-fighting': 'Knife-fighter X',
  leader: 'Leadership X',
  rider: 'Riding X > Type',
  slippery: 'v-Slippery X',
  stirke: 'Strike X > Type',
};

function capabilityBase(value: string) {
  const base = value.replace(/^[§$]\s*/, '').replace(/^\[/, '').replace(/\]$/, '').split(' > ')[0].replace(/\s+X$/, '').trim().toLowerCase();
  return base === 'zedsurge' ? 'v-zedsurge' : base;
}

function capabilityDefinition(selection: SourcedSelection) {
  const byId = selection.catalogId
    ? sarnaLenData.traits.find((trait) => trait.catalogId === selection.catalogId)
    : null;
  if (byId) return byId;
  const base = capabilityBase(selection.name);
  return sarnaLenData.traits.find((trait) => capabilityBase(trait.trait) === base) ?? null;
}

function normalizeCapabilitySelection(selection: SourcedSelection): SourcedSelection {
  const alias = CAPABILITY_ALIASES[selection.name.trim().toLowerCase()];
  const aliased = alias ? { ...selection, name: alias } : selection;
  const definition = capabilityDefinition(aliased);
  const level = Math.max(1, Math.trunc(selection.level ?? 1));
  if (!definition) return { ...aliased, level };
  // Ordinary Detect is a Skill and remains unspecialized. Explicit Detect X is
  // the catalogue's Genetic Trait and retains its required Type specialization.
  const canonicalBroadName = capabilityBase(aliased.name) !== 'detect' && definition.trait.includes(' > ')
    ? definition.trait
    : aliased.name;
  return { ...aliased, catalogId: definition.catalogId, name: canonicalBroadName, level };
}

function disabilitySelection(selection: SourcedSelection) {
  return Boolean(capabilityDefinition(selection)?.isDisability);
}

function disabilityKey(selection: SourcedSelection) {
  const ranks = Object.entries(selection.specializationRanks ?? {}).sort(([left], [right]) => left.localeCompare(right));
  return `${capabilityBase(selection.name)}|${selection.specialization?.trim().toLowerCase() ?? ''}|${JSON.stringify(ranks)}`;
}

function normalizeCapabilityStorage(draft: CharacterDraft): CharacterDraft {
  const granted = draft.proficiencies.granted.map(normalizeCapabilitySelection);
  const purchased = draft.proficiencies.purchased.map(normalizeCapabilitySelection);
  const additionalSkills = draft.proficiencies.additionalSkills.map(normalizeCapabilitySelection);
  const existingDisabilities = draft.background.disabilities.map(normalizeCapabilitySelection);
  const movedDisabilities = [
    ...granted.filter(disabilitySelection),
    ...purchased.filter(disabilitySelection),
    ...additionalSkills.filter(disabilitySelection),
  ];
  const disabilities = new Map<string, SourcedSelection>();
  for (const selection of [...existingDisabilities, ...movedDisabilities]) {
    const definition = capabilityDefinition(selection);
    const tableEntry = sarnaLenData.disabilities.find((entry) => capabilityBase(entry.disability) === capabilityBase(selection.name));
    const normalized = {
      ...selection,
      ...(tableEntry ? { id: tableEntry.catalogId } : {}),
      ...(definition ? { catalogId: definition.catalogId, name: definition.trait } : {}),
      level: Math.max(1, Math.trunc(selection.level ?? 1)),
    };
    const key = disabilityKey(normalized);
    const current = disabilities.get(key);
    if (!current || (normalized.level ?? 1) > (current.level ?? 1)) disabilities.set(key, normalized);
  }
  let normalizedDraft: CharacterDraft = {
    ...draft,
    background: {
      ...draft.background,
      disabilities: [...disabilities.values()].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base', numeric: true })),
      disabilitiesReviewed: draft.background.disabilitiesReviewed || disabilities.size > 0,
    },
    proficiencies: {
      ...draft.proficiencies,
      granted: granted.filter((selection) => !disabilitySelection(selection)),
      purchased: purchased.filter((selection) => !disabilitySelection(selection)),
      additionalSkills: additionalSkills.filter((selection) => !disabilitySelection(selection)),
    },
  };
  const unresolved = unresolvedBroadGrants(normalizedDraft, sarnaLenData);
  const warningCode = 'unresolved-broad-specializations';
  const warnings = normalizedDraft.warnings.filter((warning) => warning.code !== warningCode);
  if (unresolved.length) {
    const names = Array.from(new Set(unresolved.map((selection) => selection.name.split(' > ')[0].replace(/^[§$\[]\s*/, '').replace(/\s+X\]?$/, '')))).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true }));
    warnings.push({
      step: 'proficiencies-skills-abilities-talents',
      code: warningCode,
      message: `Broad Skill/Trait specializations still require review: ${names.join(', ')}.`,
    });
  }
  normalizedDraft = {
    ...normalizedDraft,
    warnings,
    completedSteps: unresolved.length
      ? normalizedDraft.completedSteps.filter((step) => step !== 'proficiencies-skills-abilities-talents')
      : normalizedDraft.completedSteps,
  };
  return normalizedDraft;
}
const ITEM_ALIASES: Record<string, string> = {
  'Fanny-pacl': 'Fanny-pack', 'Lockpit Kit': 'Lockpick kit', Lockpicks: 'Lockpick kit',
  'Leather armor': 'Leather Armor', 'Stilettoes': 'Stilettos', Garrotte: 'Garrote',
  'Milita Arrow issued by the Pazkani Army': 'Militia Arrow issued by the Pazkani Army',
  'Bracers of Repellation': 'Bracers of Repulsion',
};
const INVENTORY_CATALOG_ALIASES: Record<string, string> = {
  backpack: 'Backpack, Frameless',
  'armor light': 'Armor Set, Light (Boiled)',
  'armor light [thickened]': 'Armor Set, Light (Boiled)',
  'armor medium': 'Armor Set, Medium (Mail)',
  'armor heavy': 'Armor Set, Heavy (Reinforced + Plate)',
  boatcloak: 'Cloak Or Cape',
  bedroll: 'Bed roll, Simple',
  'arrow quiver': 'Quiver, Small',
  'small bolt quiver': 'Case, Small',
  'skill book': 'Skill Tome',
  cookbook: 'Skill Tome',
  spellbook: 'Blank Codex',
  'boiled leather': 'Armor Set, Light (Boiled)',
  'boiled leather armor': 'Armor Set, Light (Boiled)',
  breastplate: 'Cuirass, Metal',
  broadsword: 'Sword, Broad',
  'chainmail hauberk': 'Armor Set, Medium (Mail)',
  claw: 'Hands, Claws',
  cuirass: 'Cuirass, Metal',
  'flask of oil': 'Oil Flask',
  flintstone: 'Tinderbox',
  'fragrant soap': 'Bathing Kit',
  'full helm': 'Helmet, Full',
  garrote: 'Hands, Garrote',
  greatsword: 'Sword, Great',
  'half helm & mantle': 'Helmet, Half Mantled',
  'hand crossbow': 'Crossbow, Hand',
  'hunting knife': 'Knife, Hunting',
  'jewelry box': 'Chest, Small',
  rings: 'Jewelry, Ring',
  'bracelets & bangles': 'Jewelry, Bracelet',
  'necklaces & amulets': 'Jewelry, Necklace',
  'knife and spit': 'Cooking kit',
  'leather armor': 'Armor Set, Light (Boiled)',
  'large sack': 'Bag, Large × 1',
  'magestick staff': 'Magestick, Staff',
  'magestick wand': 'Magestick, Wand',
  'magestick small wand +manaclamp': 'Magestick, Small Wand',
  'medium bow': 'Bow, Medium',
  'medium shield': 'Shield, Medium',
  cookware: 'Cooking kit',
  'knives and spit': 'Cooking kit',
  'knives and spits': 'Cooking kit',
  silverware: 'Dining kit',
  'soap and perfume': 'Bathing Kit',
  'spice bag': 'Herbs & Spices × 100',
  'spice bags': 'Herbs & Spices × 100',
  rapier: 'Sword, Rapier',
  'short bow': 'Bow, Short', shortbow: 'Bow, Short',
  'small crossbow': 'Crossbow, Light',
  'small knife': 'Knife, Small',
  'small shield': 'Shield, Small',
  'small purse': 'Purse',
  'small box': 'Chest, Small',
  'whetting stone': 'Whetting Kit',
  'wardrobe kit': 'Wardrobe',
  'whetting stone + oils': 'Whetting Kit',
  dagger: 'Dagger, Standard', daggers: 'Dagger, Standard', daggres: 'Dagger, Standard',
  'war hammer': 'Hammer, War', warhammer: 'Hammer, War',
  longsword: 'Sword, Long', longswords: 'Sword, Long', 'long sword': 'Sword, Long', 'long swords': 'Sword, Long',
  shortsword: 'Sword, Short', shortswords: 'Sword, Short', 'short sword': 'Sword, Short', 'short swords': 'Sword, Short',
  spear: 'Spear, Medium', spears: 'Spear, Medium',
  stiletto: 'Dagger, Stiletto', stilettos: 'Dagger, Stiletto', stilleto: 'Dagger, Stiletto', stilletos: 'Dagger, Stiletto',
};
const MAGIC_ITEM_CATALOG_ALIASES: Record<string, { name: string; level?: number; quantity?: number }> = {
  '10 x gems of radiance': { name: 'Gems of Radiance X', quantity: 10 },
  '10 × gems of radiance': { name: 'Gems of Radiance X', quantity: 10 },
  'bangle of hygiene': { name: 'Bangle of Hygiene X' },
  'banhammer-2': { name: 'Greater Banhammer X', level: 2 },
  'bansword-2': { name: 'Banweapon X', level: 2 },
  'belt of silence': { name: 'Belt of Silence X' },
  'dagger of stabbing': { name: 'Dagger of Stabbing X' },
  'goggles of night': { name: 'Goggles of Nightvision X' },
  'mask of bardic oration': { name: 'Mask of Bardic Oration X' },
  'militia arrow issued by the pazkani army': { name: 'Militia Arrow X' },
  'robe of many colors': { name: 'Robe of Many Colors X' },
  suncloak: { name: 'Suncloak X' },
  'vorpal sword': { name: 'Vorpal Weapon X' },
  whetcoin: { name: 'Whetcoin X' },
};
const SPELL_ALIASES: Record<string, string> = {
  armor: 'Armored Carapace',
  disintegrate: 'Woundshell',
  disentigrate: 'Woundshell',
  'detect undead': 'Detect Undying',
  dispel: 'Dispel Magic',
  'faith shield': 'Faithshield',
  heal: 'Cure Major Wounds',
  'life sense': 'Lifesense',
  lifesense: 'Lifesense',
  light: 'Light',
  'magic missile': 'Magic Missle',
  'magick missile': 'Magic Missle',
  'magick missiles': 'Magic Missle',
  prismafan: 'Prismafan of Lightning',
  'turn undead': 'Turn Undying',
  'cure minor wound': 'Cure Minor Wounds',
  'cure wounds': 'Cure Minor Wounds',
};
const TRADE_CRITICAL_ATTRIBUTES: Record<string, string[]> = {
  Academic: ['INT','KNO','POW'], Cleric: ['INT','KNO','PRE','POW'], Entertainer: ['REF','INT','PRE'],
  Knight: ['PRE','POW','STR','FOR'], Mariner: ['PRE','POW','STR','FOR'], Rabble: ['REF','STR','FOR'],
  Ranger: ['PRE','POW','STR','FOR'], Rogue: ['CCA','RCA','REF','INT'], Service: ['INT','KNO','POW'],
  Warrior: ['PRE','POW','STR','FOR'], Wizard: ['INT','KNO','PRE','POW'],
};
const normalizeItemName = (value: string) => {
  let name = value.trim().replace(/\bcuin\b/gi, 'cubic-inch').replace(/\btacklebox\b/gi, 'tackle box');
  for (const [from, to] of Object.entries(ITEM_ALIASES)) name = name.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), to);
  return name.replace(/\s+/g, ' ').trim();
};
function trailingCustomAppend(value: string) {
  const match = value.trim().match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!match || !match[1].trim() || !match[2].trim()) return null;
  return { base: match[1].trim(), append: match[2].trim() };
}
const inventoryLookupKey = (value: string) => value
  .replace(/\s+SIZ\s+\d+\b/ig, '')
  .replace(/[,_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()
  .split(' ')
  .map((word) => word === 'knives' ? 'knife'
    : word === 'staves' ? 'staff'
      : /[^s]ies$/.test(word) ? `${word.slice(0, -3)}y`
        : word.length > 3 && /[^s]s$/.test(word) ? word.slice(0, -1)
          : word)
  .join(' ');
function culturalInventoryMarker(value: string) {
  const match = value.trim().match(/^(?:all\s+are\s+)?cultural\s*>\s*(.+)$/i);
  return match ? `Cultural > ${match[1].trim()}` : null;
}
function normalizeInventory(items: InventorySelection[], category: 'weapons' | 'armor' | 'equipment') {
  const catalogue = category === 'weapons' ? sarnaLenData.itemWeapons : category === 'armor' ? sarnaLenData.itemArmors : sarnaLenData.itemEquipments;
  const inheritedCultural = items.map((item) => culturalInventoryMarker(item.name)).find((value): value is string => Boolean(value));
  const normalized = items.filter((item) => !culturalInventoryMarker(item.name)).map((item) => {
    const parsed = inventoryQuantity(normalizeItemName(item.name));
    const sizeMatch = parsed.name.match(/\s+SIZ\s+(\d+)\b/i);
    const sizedForSiz = item.sizedForSiz ?? (sizeMatch ? Number(sizeMatch[1]) : undefined);
    let importedName = parsed.name.replace(/\s+SIZ\s+\d+\b/i, '').trim();
    let customAppend = item.customAppend?.trim() || '';
    const originalLookup = inventoryLookupKey(importedName);
    const resolveDefinition = (value: string) => {
      const alias = INVENTORY_CATALOG_ALIASES[inventoryLookupKey(value)];
      const candidate = alias ?? value;
      return catalogue.find((entry) => inventoryLookupKey(entry.name) === inventoryLookupKey(candidate));
    };
    let definition = resolveDefinition(importedName);
    if (!definition && category === 'equipment') {
      const parsedAppend = trailingCustomAppend(importedName);
      if (parsedAppend) {
        const appendedDefinition = resolveDefinition(parsedAppend.base);
        if (appendedDefinition && inventoryAllowsCustomAppend(appendedDefinition.name)) {
          definition = appendedDefinition;
          importedName = parsedAppend.base;
          if (!customAppend) customAppend = parsedAppend.append;
        }
      }
    }
    if (category === 'equipment' && originalLookup === 'cookbook') customAppend = customAppend || 'Cook';
    const name = definition?.name ?? importedName;
    const catalogId = definition?.catalogId ?? item.catalogId ?? makeCatalogId(category === 'weapons' ? 'weapon' : category === 'armor' ? 'armor' : 'equipment', name);
    return {
      ...item,
      id: item.id || `inventory-${category}-${catalogId}`,
      catalogId,
      name,
      quantity: Math.max(1, item.quantity, parsed.quantity),
      ...(sizedForSiz ? { sizedForSiz } : { sizedForSiz: undefined }),
      ...(customAppend && definition && category === 'equipment' && inventoryAllowsCustomAppend(definition.name) ? { customAppend } : { customAppend: undefined }),
      ...(definition ? {
        unitPriceGp: Number(definition.priceGp) || 0,
        unitWeight: Number(definition.weight) || 0,
        sheetProperties: undefined,
      } : {}),
      ...(!item.cultural && inheritedCultural ? { cultural: inheritedCultural } : {}),
    };
  });
  const detailedOnly = normalized.filter((item, index, all) => {
    const broad = item.name.toLocaleLowerCase().replace(/s$/, '');
    const detailed = all.find((candidate) => candidate !== item && candidate.sheetProperties && candidate.name.toLocaleLowerCase().startsWith(`${broad},`));
    if (!detailed) return true;
    detailed.quantity = Math.max(detailed.quantity, item.quantity);
    return false;
  });
  const grouped = new Map<string, InventorySelection>();
  for (const item of detailedOnly) {
    const key = `${item.catalogId ?? ''}|${item.name.toLocaleLowerCase()}|siz:${item.sizedForSiz ?? 12}|${item.customAppend?.trim().toLocaleLowerCase() ?? ''}`;
    const existing = grouped.get(key);
    // Legacy imports contain the same owned item once in History and again in
    // the sheet property table. Treat matching rows as two renditions of one
    // selection; Forge itself stores repeated append-capable books/scrolls as
    // distinct assigned instances so different appends can coexist.
    if (existing) {
      existing.quantity = Math.max(existing.quantity, Math.max(1, item.quantity));
      if (!existing.sheetProperties && item.sheetProperties) existing.sheetProperties = item.sheetProperties;
      if (!existing.cultural && item.cultural) existing.cultural = item.cultural;
      if (!existing.sizedForSiz && item.sizedForSiz) existing.sizedForSiz = item.sizedForSiz;
    }
    else grouped.set(key, { ...item, quantity: Math.max(1, item.quantity) });
  }
  return [...grouped.values()];
}
function normalizeSpells(items: SourcedSelection[]) {
  const normalized = items.flatMap((item) => {
    const rawName = item.name.trim();
    const requestedNames = rawName.toLowerCase() === 'cure minor wounds guidance'
      ? ['Cure Minor Wounds', 'Guidance']
      : [SPELL_ALIASES[rawName.toLowerCase()] ?? rawName];
    return requestedNames.map((requested) => {
      const key = requested.replace(/±$/, '').trim();
      const definition = sarnaLenData.spells.find((spell) => spell.name.replace(/±$/, '').trim().localeCompare(key, undefined, { sensitivity: 'base' }) === 0);
      return definition
        ? {
            ...item,
            ...(requestedNames.length > 1 ? { id: makeCatalogId('import', definition.name) } : {}),
            catalogId: definition.catalogId,
            name: definition.name,
          }
        : item;
    });
  });
  const seen = new Set<string>();
  return normalized.filter((item) => {
    const key = item.catalogId ?? item.name.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function normalizeMagicItems(items: SourcedSelection[]) {
  return items.map((item) => {
    let normalized = normalizeItemName(item.name).replace(/\s*\[[^\]]*\]\s*$/, '').trim();
    let customAppend = item.customAppend?.trim() || '';
    const parsedAppend = trailingCustomAppend(normalized);
    if (parsedAppend) {
      const possibleBase = parsedAppend.base;
      const possibleAlias = MAGIC_ITEM_CATALOG_ALIASES[possibleBase.toLowerCase()];
      const possibleDefinition = sarnaLenData.magicItems.find((entry) =>
        entry.name.localeCompare(possibleAlias?.name ?? possibleBase, undefined, { sensitivity: 'base' }) === 0
        || entry.name.replace(/\s+X$/i, '').localeCompare(possibleAlias?.name ?? possibleBase, undefined, { sensitivity: 'base' }) === 0,
      );
      if (possibleDefinition) {
        normalized = possibleBase;
        if (!customAppend) customAppend = parsedAppend.append;
      }
    }
    const explicitLevel = normalized.match(/^(.*?)[ -](\d+)$/);
    const baseName = explicitLevel ? explicitLevel[1].trim() : normalized;
    const alias = MAGIC_ITEM_CATALOG_ALIASES[normalized.toLowerCase()] ?? MAGIC_ITEM_CATALOG_ALIASES[baseName.toLowerCase()];
    const requested = alias?.name ?? baseName;
    const definition = sarnaLenData.magicItems.find((entry) =>
      entry.name.localeCompare(requested, undefined, { sensitivity: 'base' }) === 0
      || entry.name.replace(/\s+X$/i, '').localeCompare(requested, undefined, { sensitivity: 'base' }) === 0,
    );
    if (!definition) return normalized === item.name ? item : { ...item, id: makeCatalogId('import', normalized), name: normalized };
    const level = alias?.level ?? (explicitLevel ? Math.max(1, Number(explicitLevel[2])) : item.level ?? definition.gradeLevel ?? 1);
    return {
      ...item,
      id: item.id || makeCatalogId('import', definition.name),
      catalogId: definition.catalogId,
      name: definition.name,
      level,
      ...(customAppend ? { customAppend } : { customAppend: undefined }),
      ...(alias?.quantity ? { quantity: alias.quantity } : {}),
    };
  });
}
function appendLegacyNote(notes: string, value: string) {
  const existing = notes.trimEnd();
  if (existing.split(/\r?\n/).some((line) => line.trim().localeCompare(value, undefined, { sensitivity: 'base' }) === 0)) return notes;
  return `${existing}${existing ? '\n\n' : ''}${value}`;
}

function removeLegacyNote(notes: string, value: string) {
  const lines = notes.split(/\r?\n/);
  const filtered = lines.filter((line) => line.trim().localeCompare(value, undefined, { sensitivity: 'base' }) !== 0);
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function unresolvedPossessionNote(characterName: string, item: { name: string; quantity?: number; level?: number }) {
  const name = item.name.trim().replace(/,+$/, '');
  const key = `${characterName}|${name}`.toLowerCase();
  // Legacy sheet detail duplicates: preserve the owner's original possession once.
  if (key === 'theo|knife, throwing') return null;
  if (key === 'khao|banweapon x') return null;
  if (/^bracers of repulsion$/i.test(name)) return 'Bracers of Repulsion';
  if (/^bracelet armor$/i.test(name)) return 'Bracelet Armor';
  if (/^small sack$/i.test(name)) return 'Small Bag';
  const looseAmmunition = name.match(/^(?:(small|large|heavy|very small|very very small)\s+)?(arrows?|bolts?|bullets?|rounds?|pellets?|arrowheads?|boltheads?|shots?)\s*[x×]\s*(\d+)$/i);
  if (looseAmmunition) {
    const count = Math.max(1, Number(looseAmmunition[3]) || 1);
    const size = looseAmmunition[1] ? `${looseAmmunition[1].replace(/\b\w/g, (letter) => letter.toUpperCase())} ` : '';
    const noun = looseAmmunition[2].replace(/s$/i, '');
    return `${count} x ${size}${count === 1 ? noun : `${noun}s`}`;
  }
  const quantity = Math.max(1, Math.trunc(item.quantity ?? 1));
  const quantityAmmunition = name.match(/^(?:(small|large|heavy|very small|very very small)\s+)?(arrows?|bolts?|bullets?|rounds?|pellets?|arrowheads?|boltheads?|shots?)$/i);
  if (quantity > 1 && quantityAmmunition) {
    const size = quantityAmmunition[1] ? `${quantityAmmunition[1].replace(/\b\w/g, (letter) => letter.toUpperCase())} ` : '';
    const noun = quantityAmmunition[2].replace(/s$/i, '');
    return `${quantity} x ${size}${noun}s`;
  }
  if (quantity > 1) return `${name} x ${quantity}`;
  if (/\s+X$/i.test(name) && (item.level ?? 1) > 1) return `${name.replace(/\s+X$/i, '')} ${Math.trunc(item.level!)}`;
  return name;
}

/**
 * After legacy aliases and explicit possession decisions, an assigned item must
 * resolve to an actual runtime catalogue record.  Unresolved legacy possessions
 * are retained in Notes instead of being stored under synthetic catalogue IDs.
 */
function moveUnmappedPossessionsToNotes(draft: CharacterDraft): CharacterDraft {
  const characterName = draft.utilities.name.trim().toLowerCase();
  let notes = draft.utilities.notes;
  const keepInventory = (category: 'weapons' | 'armor' | 'equipment', items: InventorySelection[]) => {
    const catalogue = category === 'weapons' ? sarnaLenData.itemWeapons : category === 'armor' ? sarnaLenData.itemArmors : sarnaLenData.itemEquipments;
    return items.filter((item) => {
      const mapped = Boolean(item.catalogId && catalogue.some((entry) => entry.catalogId === item.catalogId && entry.name === item.name));
      if (mapped && category === 'equipment') {
        const expendableNote = ammunitionNote(item.name, item.quantity);
        if (expendableNote) {
          notes = appendLegacyNote(notes, expendableNote);
          return false;
        }
      }
      if (!mapped) {
        const note = unresolvedPossessionNote(characterName, item);
        if (note) notes = appendLegacyNote(notes, note);
      }
      return mapped;
    });
  };
  const magicItems = draft.utilities.magicItems.filter((item) => {
    const mapped = Boolean(item.catalogId && sarnaLenData.magicItems.some((entry) => entry.catalogId === item.catalogId && entry.name === item.name));
    const customLevel = (item.level ?? 1) > 1;
    if (!mapped || customLevel) {
      const note = unresolvedPossessionNote(characterName, item);
      if (note) notes = appendLegacyNote(notes, note);
      return false;
    }
    return true;
  });
  const validMagicIds = new Set(magicItems.map((item) => item.catalogId).filter(Boolean));
  const magicItemForms = Object.fromEntries(Object.entries(draft.utilities.magicItemForms).filter(([catalogId]) => validMagicIds.has(catalogId)));
  return {
    ...draft,
    utilities: {
      ...draft.utilities,
      weapons: keepInventory('weapons', draft.utilities.weapons),
      armor: keepInventory('armor', draft.utilities.armor),
      equipment: keepInventory('equipment', draft.utilities.equipment),
      magicItems,
      magicItemForms,
      notes,
    },
  };
}

function applyLegacyPossessionDecisions(draft: CharacterDraft): CharacterDraft {
  const name = draft.utilities.name.trim().toLowerCase();
  let notes = removeLegacyNote(draft.utilities.notes, 'Spellbook');
  let weapons = [...draft.utilities.weapons];
  let armor = [...draft.utilities.armor];
  let equipment = [...draft.utilities.equipment];
  let magicItems = [...draft.utilities.magicItems];
  let magicItemForms = { ...draft.utilities.magicItemForms };
  const addNotes = (...values: string[]) => { for (const value of values) notes = appendLegacyNote(notes, value); };
  const addCatalogEquipment = (canonicalName: string, source: SourcedSelection['source'] = 'player') => {
    const definition = sarnaLenData.itemEquipments.find((item) => item.name === canonicalName);
    if (!definition || equipment.some((item) => item.catalogId === definition.catalogId || item.name === definition.name)) return;
    equipment.push({
      id: makeCatalogId('import', definition.name),
      catalogId: definition.catalogId,
      name: definition.name,
      source,
      quantity: 1,
      unitPriceGp: Number(definition.priceGp) || 0,
      unitWeight: Number(definition.weight) || 0,
    });
  };

  // Historical combined quiver descriptions split into a durable catalogue container
  // plus an unstructured ammunition Note.  The Note has no price/weight relationship.
  const combinedQuivers = equipment.filter((item) => /^quiver of \d+ arrows$/i.test(item.name.trim()));
  if (combinedQuivers.length) {
    equipment = equipment.filter((item) => !/^quiver of \d+ arrows$/i.test(item.name.trim()));
    for (const item of combinedQuivers) {
      const count = Number(item.name.match(/\d+/)?.[0] ?? 0);
      if (count <= 0) continue;
      addCatalogEquipment(count > 20 ? 'Quiver, Large' : count > 10 ? 'Quiver, Small' : 'Quiver, Belt', item.source);
      addNotes(`${count} x Arrows`);
    }
  }

  // Some legacy histories listed the Magestick physical form under Magic Items while
  // the detailed sheet correctly records the same object as a weapon.  Keep only the
  // canonical weapon record; do not duplicate the legacy label in Notes.
  magicItems = magicItems.filter((item) => {
    const target = INVENTORY_CATALOG_ALIASES[item.name.trim().toLowerCase()];
    return !(target?.startsWith('Magestick,') && weapons.some((weapon) => weapon.name === target));
  });

  // Spellbook is legacy/presentation terminology for the canonical Blank Codex.
  // Equipment Spellbooks have already normalized through INVENTORY_CATALOG_ALIASES;
  // older characters sometimes stored Spellbook under Magic Items, so migrate those
  // to equipment and preserve the canonical catalogue data there.
  const magicSpellbooks = magicItems.filter((item) => item.name.localeCompare('Spellbook', undefined, { sensitivity: 'base' }) === 0);
  if (magicSpellbooks.length) {
    magicItems = magicItems.filter((item) => item.name.localeCompare('Spellbook', undefined, { sensitivity: 'base' }) !== 0);
    const definition = sarnaLenData.itemEquipments.find((item) => item.name === 'Blank Codex');
    if (definition && !equipment.some((item) => item.name === definition.name)) {
      const source = magicSpellbooks[0]?.source ?? 'player';
      equipment.push({
        id: magicSpellbooks[0]?.id || 'import-blank-codex',
        catalogId: definition.catalogId,
        name: definition.name,
        source,
        quantity: 1,
        unitPriceGp: Number(definition.priceGp) || 0,
        unitWeight: Number(definition.weight) || 0,
      });
    }
  }

  if (name === 'periwinkle') {
    equipment = equipment.filter((item) => item.name !== 'Alchemy kit');
    weapons = weapons.filter((item) => item.name !== 'Sentient Flaming Sword');
    magicItems = magicItems.filter((item) => item.name !== 'Sentient Ornate (Dragon) Flaming Sword');
    addNotes('Alchemy kit', 'Dragon Sword (Flaming Soulbound)');
  } else if (name === 'twinkles') {
    equipment = equipment.filter((item) => item.name.toLowerCase() !== 'handful of gems');
    magicItems = magicItems.filter((item) => !['Dragon Teeth x 2', 'Prayer Beads [+1 Prayer]'].includes(item.name));
    addNotes('Handful of Gems', 'Dragon Teeth x 2', 'Prayer Beads +1');
  } else if (name === 'honri heminsur') {
    equipment = equipment.filter((item) => !['Fishing rod x 2 with tackle box', 'Trapping Kit'].includes(item.name));
    notes = removeLegacyNote(removeLegacyNote(notes, 'Cookbook'), 'Skill Tome (Cook)');
    const skillTome = sarnaLenData.itemEquipments.find((item) => item.name === 'Skill Tome');
    if (skillTome && !equipment.some((item) => item.catalogId === skillTome.catalogId && item.customAppend?.trim().toLowerCase() === 'cook')) {
      equipment.push({
        id: 'import-skill-tome-cook',
        catalogId: skillTome.catalogId,
        name: skillTome.name,
        source: 'player',
        sourceDetail: 'Legacy possession — Cookbook',
        quantity: 1,
        unitPriceGp: Number(skillTome.priceGp) || 0,
        unitWeight: Number(skillTome.weight) || 0,
        customAppend: 'Cook',
      });
    }
  } else if (name === 'giovanna manroad') {
    equipment = equipment.filter((item) => item.name !== 'Stun Poison');
    addNotes('Stun Poison x 3');
  } else if (name === 'moise') {
    equipment = equipment.filter((item) => item.name !== 'Telescope');
    addNotes('Telescope +3');
  } else if (name === 'illian the wizard') {
    equipment = equipment.filter((item) => item.name !== 'Goggles of Night');
    armor = armor.filter((item) => item.name !== 'Robe of Armor');
    // Illian's Magewand is an upgraded/customized Magestick (+Manaclamp), not the
    // ordinary catalogue weapon. Preserve it only as an editable historical Note.
    weapons = weapons.filter((item) => !(item.name === 'Lesser Staff of Power' || (item.name === 'Magestick, Small Wand' && /manaclamp/i.test(item.sheetProperties ?? ''))));
    magicItems = magicItems.filter((item) => !['Robe of Armor', 'Lesser Staff', 'Magewand'].includes(item.name));
    addNotes('Robe of Armor', 'Magewand');
  } else if (name === 'margiela') {
    weapons = weapons.filter((item) => !item.name.startsWith("Poisoner's Awl"));
    addNotes("Poisoner's Awl");
  } else if (name === 'dj') {
    magicItems = magicItems.filter((item) => item.name !== 'Has a Wyvern egg');
    addNotes('Wyvern egg');
  } else if (name === 'stella') {
    // Ordinary Magestick is structured inventory; remove the older duplicate Note.
    if (weapons.some((item) => item.name === 'Magestick, Staff')) notes = removeLegacyNote(notes, 'Magestick');
  } else if (name === 'zoey the short') {
    // X=1 Dagger of Stabbing remains structured; the legacy Note is redundant.
    notes = removeLegacyNote(notes, 'Dagger of Stabbing');
    const dagger = magicItems.find((item) => item.name === 'Dagger of Stabbing X' && (item.level ?? 1) === 1);
    if (dagger?.catalogId) magicItemForms[dagger.catalogId] = 'Dagger, Standard';
  } else if (name === 'john stone') {
    // Historical Vorpal Sword remains an ad hoc Note even though X=1 Vorpal Weapon
    // is available to newly created characters with a normalized weapon form.
    for (const item of magicItems.filter((entry) => entry.name === 'Vorpal Weapon X')) if (item.catalogId) delete magicItemForms[item.catalogId];
    magicItems = magicItems.filter((item) => item.name !== 'Vorpal Weapon X');
    addNotes('Vorpal Sword');
  } else if (/sir mand[ao]lore/i.test(name)) {
    // The historical Banhammer is X=2, so it is GM/custom Notes-only material.
    for (const item of magicItems.filter((entry) => /banhammer|banweapon/i.test(entry.name))) if (item.catalogId) delete magicItemForms[item.catalogId];
    magicItems = magicItems.filter((item) => !/banhammer|banweapon/i.test(item.name));
    addNotes('Banhammer-2');
  } else if (name === 'khao') {
    // Historical Bansword is an X=2 form of Banweapon and remains Notes-only.
    for (const item of magicItems.filter((entry) => entry.name === 'Banweapon X')) if (item.catalogId) delete magicItemForms[item.catalogId];
    magicItems = magicItems.filter((item) => item.name !== 'Banweapon X');
    addNotes('Bansword-2');
  }

  return { ...draft, utilities: { ...draft.utilities, weapons, armor, equipment, magicItems, magicItemForms, notes } };
}

function normalizeImportedDraft(draft: CharacterDraft): CharacterDraft {
  const heritageIds: Record<string, string> = {
    'heritage-culture-herder': 'heritage-culture-herding',
    'heritage-environs-desert': 'heritage-environs-deserts',
    'heritage-environs-forest': 'heritage-environs-forests',
    'heritage-environs-mountains': 'heritage-environs-mountain',
    'heritage-society-aristocrat': 'heritage-society-aristocrats',
    'heritage-society-gentry': 'heritage-society-landed',
  };
  let environHeritageId = draft.background.environHeritageId ? (heritageIds[draft.background.environHeritageId] ?? draft.background.environHeritageId) : null;
  let societalHeritageId = draft.background.societalHeritageId ? (heritageIds[draft.background.societalHeritageId] ?? draft.background.societalHeritageId) : null;
  if (environHeritageId && societalHeritageId
      && /heritage-environs-(?:tribal|peasant|slumfolk|townsfolk|cityfolk|landed|aristocrats|nobles|royalty|imperial)$/.test(environHeritageId)
      && /heritage-society-(?:badlands|coastal|deserts|forests|hills|jungle|marsh|mountain|steppe|river|grassland|savannah|swamp|tundra|taiga|woods)$/.test(societalHeritageId)) {
    const environName = societalHeritageId.replace('heritage-society-', '');
    const societyName = environHeritageId.replace('heritage-environs-', '');
    environHeritageId = `heritage-environs-${environName}`;
    societalHeritageId = `heritage-society-${societyName}`;
  }
  const sirMandalore = /sir mand[ao]lore/i.test(draft.utilities.name);
  const namedIdentity: Record<string, { speciesId: string; lineageId: string }> = {
    'stella': { speciesId: 'species-human', lineageId: 'lineage-baminati' },
    'john stone': { speciesId: 'species-human', lineageId: 'lineage-baminati' },
    'zoey the short': { speciesId: 'species-klenari', lineageId: 'lineage-farleen' },
    'theo': { speciesId: 'species-klenari', lineageId: 'lineage-stepmir' },
    'giovanna manroad': { speciesId: 'species-klenari', lineageId: 'lineage-farleen' },
  };
  const identity = namedIdentity[draft.utilities.name.trim().toLowerCase()];
  const normalizedName = draft.utilities.name.trim().toLowerCase();
  const namedProfession: Record<string, { tradeId: string; specializationId: string }> = {
    'honri heminsur': { tradeId: 'trade-warrior', specializationId: 'specialization-warrior-engineer' },
    'twinkles': { tradeId: 'trade-cleric', specializationId: 'specialization-cleric-cloister' },
    'alba': { tradeId: 'trade-wizard', specializationId: 'specialization-wizard-witch' },
    'dj': { tradeId: 'trade-ranger', specializationId: 'specialization-ranger-wanderer' },
  };
  const professionIdentity = namedProfession[normalizedName];
  const dawn = /^dawn\b/i.test(draft.utilities.name);
  const camilla = /^camill?a$/i.test(draft.utilities.name);
  const importedRegion = draft.background.demographicSelections.find((entry) => entry.sourceDetail === 'Imported region');
  const importedSettlement = draft.background.demographicSelections.find((entry) => entry.sourceDetail === 'Imported settlement');
  const customRegionName = importedRegion && /isles of waste|argeleb twins/i.test(importedRegion.name)
    ? (importedRegion.name.match(/isles of waste/i)?.[0] ?? importedRegion.name.split('>')[0].trim())
    : importedSettlement?.name.match(/isles of waste/i)?.[0] ?? null;
  const customSettlementName = customRegionName
    ? importedSettlement
      ? (importedSettlement.name.match(/^farton/i)?.[0] ?? importedSettlement.name)
      : /argeleb twins\s*>/i.test(importedRegion?.name ?? '')
        ? importedRegion!.name.split('>').slice(1).join('>').trim()
        : null
    : null;
  const locationSelections = customRegionName
    ? [
        ...draft.background.demographicSelections.filter((entry) => !['Imported region', 'Imported settlement', 'Custom region', 'Custom settlement'].includes(entry.sourceDetail ?? '')),
        { id: makeCatalogId('custom', `region-${customRegionName}`), name: customRegionName, source: 'player' as const, sourceDetail: 'Custom region' },
        ...(customSettlementName ? [{ id: makeCatalogId('custom', `settlement-${customSettlementName}`), name: customSettlementName, source: 'player' as const, sourceDetail: 'Custom settlement' }] : []),
      ]
    : draft.background.demographicSelections;
  const normalizedPurchased = draft.proficiencies.purchased.map((item) => {
    if (/^(?:v-)?zedsurge$/i.test(item.name)) return { ...item, id: 'import-v-zedsurge', catalogId: makeCatalogId('trait', 'v-Zedsurge X'), name: 'v-Zedsurge', ...(sirMandalore ? { level: 2 } : {}) };
    if (/^magic$/i.test(item.name)) return { ...item, id: 'import-v-magic', catalogId: makeCatalogId('trait', 'v-Magic X'), name: 'v-Magic' };
    if (normalizedName === 'giovanna manroad' && /^crafting$/i.test(item.name)) return { ...item, id: 'import-craft', catalogId: makeCatalogId('trait', 'Craft X > Tradecraft'), name: 'Craft X > Tradecraft' };
    const importedWeaponSkill = item.name.match(/^(crossbow|daggers?|spear|sword)$/i)?.[1];
    if (importedWeaponSkill) {
      const specialization = /^daggers?$/i.test(importedWeaponSkill)
        ? 'Dagger'
        : importedWeaponSkill.replace(/^./, (letter) => letter.toUpperCase());
      return {
        ...item,
        id: `import-expert-${specialization.toLowerCase()}`,
        catalogId: makeCatalogId('trait', 'Expert X > Weapon'),
        name: 'Expert X > Weapon',
        specialization,
      };
    }
    if (/^title(?:\s*\([^)]*\)|-[a-z]+)?$/i.test(item.name)) return { ...item, id: 'import-title', catalogId: makeCatalogId('trait', 'Title X > Region'), name: 'Title X > Region' };
    if (sirMandalore && /^brawn$/i.test(item.name)) return { ...item, level: 3 };
    return item;
  });
  const normalizedAttributes = draft.intrinsics.attributes.map((attribute) =>
    sirMandalore && attribute.name === 'MOV' ? { ...attribute, base: 12 } : attribute);
  const targetProperties = {
    stature: sirMandalore ? 52 : draft.properties.stature,
    build: sirMandalore ? 53 : draft.properties.build,
    heightInches: sirMandalore ? 74 : draft.properties.heightInches,
    weightPounds: sirMandalore ? 205 : draft.properties.weightPounds,
    siz: sirMandalore ? 13 : draft.properties.siz,
    profile: sirMandalore ? 52 : draft.properties.profile,
  };
  const frameCandidate: CharacterDraft = {
    ...draft,
    proficiencies: { ...draft.proficiencies, purchased: normalizedPurchased },
    properties: { ...draft.properties, statureAdjustment: 0, buildAdjustment: 0, weightAdjustment: 0 },
  };
  const unframed = physicalBreakdown(frameCandidate, sarnaLenData);
  const statureAdjustment = unframed && targetProperties.stature != null
    ? Math.max(-2, Math.min(2, targetProperties.stature - unframed.finalStature)) : 0;
  const statureFramed = physicalBreakdown({ ...frameCandidate, properties: { ...frameCandidate.properties, statureAdjustment } }, sarnaLenData);
  const buildDifference = statureFramed && targetProperties.build != null ? targetProperties.build - statureFramed.build : 0;
  const buildAdjustment = sirMandalore ? -2 : Math.max(-2, Math.min(2, buildDifference));
  const weightAdjustment = sirMandalore ? -2 : Math.max(-9, Math.min(9, buildDifference - buildAdjustment));
  const normalized: CharacterDraft = {
    ...draft,
    background: {
      ...draft.background,
      disabilities: camilla ? draft.background.disabilities.map((item) => /^coward$/i.test(item.name) ? { ...item, catalogId: makeCatalogId('trait', '[Coward X]'), level: 3 } : /^hatred$/i.test(item.name) ? { ...item, catalogId: makeCatalogId('trait', '[Hatred X > Demographic]') } : item) : draft.background.disabilities,
      ...(camilla ? { regionId: 'region-djorkan', settlementId: 'settlement-djorkan-corom' } : {}),
      ...(customRegionName ? { regionId: 'region-other', settlementId: 'settlement-other', demographicSelections: locationSelections } : {}),
      culturalHeritageId: draft.background.culturalHeritageId ? (heritageIds[draft.background.culturalHeritageId] ?? draft.background.culturalHeritageId) : null,
      environHeritageId,
      societalHeritageId,
    },
    proficiencies: { ...draft.proficiencies, purchased: normalizedPurchased, languages: normalizeLanguages(draft.proficiencies.languages) },
    intrinsics: {
      ...draft.intrinsics,
      speciesFamilyId: identity ? 'species-family-humaniki' : draft.intrinsics.speciesFamilyId,
      speciesId: identity?.speciesId ?? draft.intrinsics.speciesId,
      lineageId: identity?.lineageId ?? draft.intrinsics.lineageId,
      tradeId: professionIdentity?.tradeId ?? draft.intrinsics.tradeId,
      specializationId: professionIdentity?.specializationId ?? draft.intrinsics.specializationId,
      ...(dawn ? { childOfStrife: true, strifePairingId: 'hobit', strifeMotherFirst: true, strifeFatherLineageId: 'lineage-indelan', strifeMotherLineageId: 'lineage-farleen', speciesFamilyId: 'species-family-humaniki', speciesId: null, lineageId: null } : {}),
      attributes: normalizedAttributes,
      affinityAttribute: camilla ? 'INT' : draft.intrinsics.affinityAttribute,
      zed: camilla ? 14 : draft.intrinsics.zed,
      tradeRank: sirMandalore ? 4 : draft.intrinsics.tradeRank,
    },
    properties: {
      ...draft.properties,
      calculated: camilla ? { ...draft.properties.calculated, Manapool: 13, manapool: 13 } : draft.properties.calculated,
      statureAdjustment: sirMandalore ? -2 : statureAdjustment,
      buildAdjustment,
      weightAdjustment,
      ...targetProperties,
      baseBuild: targetProperties.build != null ? targetProperties.build - weightAdjustment : draft.properties.baseBuild,
    },
    utilities: {
      ...draft.utilities,
      properName: /^\[?error\]?$/i.test(draft.utilities.properName.trim()) ? '' : draft.utilities.properName,
      weapons: normalizeInventory(draft.utilities.weapons, 'weapons'), armor: normalizeInventory(draft.utilities.armor, 'armor'),
      equipment: normalizeInventory(draft.utilities.equipment, 'equipment'), magicItems: normalizeMagicItems(draft.utilities.magicItems),
      spells: normalizeSpells(draft.utilities.spells),
    },
  };
  return normalizeCapabilityStorage(moveUnmappedPossessionsToNotes(applyLegacyPossessionDecisions(normalized)));
}

export function normalizeCharacterDraftForStorage(draft: CharacterDraft) {
  return normalizeImportedDraft(draft);
}

function normalizeLegacyAgeGroup(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  if (/^eary teen$/i.test(normalized)) return 'Early Teen';
  return normalized || null;
}

function toDraft(raw: LegacyCharacter, portraitDataUrl: string, sheet: LegacyCharacter = {}) {
  const draft = createEmptyCharacterDraft();
  const details = raw.details ?? {};
  const background = details.background ?? {};
  const biology = details.biology ?? {};
  const genebase = details.genebase ?? {};
  const history = raw.historyNotes ?? {};
  const attributes = raw.attributes ?? {};
  const calculated = raw.calculatedScores ?? {};
  const profession = background.profession ?? {};
  const personality = background.personalityFeatures ?? {};
  const sheetProperties = itemPropertyLookup(sheet);

  draft.updatedAt = new Date().toISOString();
  // These source files are completed character sheets, not half-finished Forge
  // sessions. Preserve that approval state even where the legacy format cannot
  // reconstruct every modern catalogue identifier.
  draft.completedSteps = [...COMPLETED_CREATOR_STEPS];
  draft.utilities.name = raw.name?.exonym ?? '';
  draft.utilities.properName = /^\[?error\]?$/i.test(String(raw.name?.endonym ?? '').trim()) ? '' : (raw.name?.endonym ?? '');
  draft.utilities.notes = history.notes ?? '';
  draft.utilities.portraitDataUrl = portraitDataUrl;
  draft.utilities.portraitSourceDataUrl = portraitDataUrl;
  // The old sheet stores the geographic region, while Forge keys the governing
  // region record (Eastlands -> Djorkan) and its settlement beneath that record.
  const geographicRegion = background.ethnicity?.region;
  const settlementName = String(background.ethnicity?.settlement ?? '').replace(/^Citystate\s+/i, '');
  const canonicalSettlementRegions: Record<string, string> = {
    Corom: 'Djorkan', Stagin: 'Vashtur', Quagkh: 'Vashtur', Quel: 'Vashtur',
    Pazkan: 'Pazkani', Dar: 'Pazkani', Herost: 'Drusi', Khardik: 'Galsathil',
    Boral: 'Boron', Sarken: 'Sarukhen', Indel: 'Sarukhen', Paelon: 'Palten',
    Paltesh: 'Palten', Aquorica: 'Western', Riaton: 'Western',
    'Castle Hol': 'Argeleb Twins Balun',
  };
  const legacyRegion = String(geographicRegion ?? '');
  const regionName = canonicalSettlementRegions[settlementName]
    ?? (/Eastlands|Jorkanale/i.test(legacyRegion) ? 'Djorkan'
      : /Bendeni/i.test(legacyRegion) ? 'Pazkani'
      : /Vasik|Vaisk/i.test(legacyRegion) ? 'Galsathil'
      : legacyRegion === 'Southlands' ? 'Vashtur'
      : legacyRegion === 'Northlands' ? 'Boron'
      : legacyRegion);
  draft.background.regionId = regionName ? makeCatalogId('region', regionName) : null;
  draft.background.settlementId = regionName && settlementName ? makeCatalogId('settlement', `${regionName}-${settlementName}`) : null;
  const formative = { ...(background.formative ?? {}) };
  const environs = new Set(['Badlands','Coastal','Deserts','Forests','Hills','Jungle','Marsh','Mountain','Steppe','River','Grassland','Savannah','Swamp','Tundra','Taiga','Woods']);
  const societies = new Set(['Tribal','Peasant','Slumfolk','Townsfolk','Cityfolk','Landed','Aristocrats','Nobles','Royalty','Imperial']);
  formative.environ = HERITAGE_ALIASES[formative.environ] ?? formative.environ;
  formative.society = HERITAGE_ALIASES[formative.society] ?? formative.society;
  formative.culture = HERITAGE_ALIASES[formative.culture] ?? formative.culture;
  if (societies.has(formative.environ) && environs.has(formative.society)) [formative.environ, formative.society] = [formative.society, formative.environ];
  const culture = formative.culture;
  draft.background.culturalHeritageId = culture ? makeCatalogId('heritage-culture', culture) : null;
  draft.background.environHeritageId = formative.environ ? makeCatalogId('heritage-environs', formative.environ) : null;
  draft.background.societalHeritageId = formative.society ? makeCatalogId('heritage-society', formative.society) : null;
  draft.background.beliefId = background.religion?.practice ? makeCatalogId('belief', background.religion.practice) : null;
  draft.background.deityId = background.religion?.deity?.name ? makeCatalogId('deity', background.religion.deity.name) : null;
  draft.background.sex = ['Male', 'Female', 'Intersex'].includes(biology.sex) ? biology.sex : null;
  draft.background.geneticallyFemale = biology.sex === 'Female';
  draft.background.gender = biology.sex === 'Female' ? 'Female' : biology.sex === 'Male' ? 'Male' : null;
  draft.background.ageGroup = normalizeLegacyAgeGroup(biology.ageGroup);
  if (typeof biology.ageYearsMonth === 'number') {
    draft.background.ageYears = Math.trunc(biology.ageYearsMonth);
    draft.background.birthMonth = Math.round((biology.ageYearsMonth % 1) * 10);
  }
  draft.background.personality = [...(personality.personality ?? []), ...(personality.blemishes ?? []), ...(personality.descriptors ?? []), ...(personality.other ?? [])].map((value) => selection(value));
  draft.background.personality = draft.background.personality.map((item) => ({ ...item, id: makeCatalogId('personality', item.name) }));
  draft.background.demographicSelections = [
    ...(background.ethnicity?.region ? [importedDisplay(background.ethnicity.region, 'Imported region')] : []),
    ...(background.ethnicity?.settlement ? [importedDisplay(background.ethnicity.settlement, 'Imported settlement')] : []),
    ...(background.religion?.deity?.name ? [importedDisplay(background.religion.deity.name, 'Imported religion detail')] : []),
    ...String(sheet.Features ?? '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean).map((value) => importedDisplay(value, 'Notable feature')),
  ];
  draft.background.tragedySeedText = (personality.tragedies ?? []).join('; ') || null;
  if (draft.background.tragedySeedText) draft.background.tragedySeedId = makeCatalogId('tragedy-imported', draft.background.tragedySeedText);
  const importedDisabilities = [
    ...(personality.disabilities ?? []),
    ...(history.skills ?? []).filter((item: any) => item.disability).map((item: any) => item.name),
  ];
  draft.background.disabilities = importedDisabilities.map((value: unknown) => selection(value));
  draft.background.disabilitiesReviewed = true;
  draft.intrinsics.speciesFamilyId = genebase.species ? makeCatalogId('species-family', genebase.species) : null;
  if (genebase.group === 'Hobit') {
    const [first, second] = String(genebase.lineage ?? '').split(/\s*&\s*/);
    draft.intrinsics.childOfStrife = true;
    draft.intrinsics.strifePairingId = 'hobit';
    draft.intrinsics.strifeFatherLineageId = second ? makeCatalogId('lineage', second) : null;
    draft.intrinsics.strifeMotherLineageId = first ? makeCatalogId('lineage', first) : null;
    draft.intrinsics.speciesId = null;
    draft.intrinsics.lineageId = null;
  } else {
    draft.intrinsics.speciesId = genebase.group ? makeCatalogId('species', genebase.group) : null;
    draft.intrinsics.lineageId = genebase.lineage ? makeCatalogId('lineage', genebase.lineage) : null;
  }
  draft.intrinsics.tradeId = profession.trade ? makeCatalogId('trade', profession.trade) : null;
  draft.intrinsics.specializationId = profession.profession ? makeCatalogId('specialization', `${profession.trade}-${profession.profession}`) : null;
  draft.intrinsics.tradeRank = typeof profession.rank === 'number' ? profession.rank : null;
  draft.intrinsics.wealthRank = calculated.misc?.wealthRank ?? null;
  draft.background.socialRank = calculated.misc?.socialRank ?? null;
  if (formative.society) draft.background.socialRankId = makeCatalogId('social-rank', formative.society);
  const critical = TRADE_CRITICAL_ATTRIBUTES[profession.trade] ?? [];
  draft.intrinsics.affinityAttribute = critical.length
    ? critical.reduce((best, candidate) => Number(attributes[candidate.toLowerCase()] ?? -Infinity) > Number(attributes[best.toLowerCase()] ?? -Infinity) ? candidate : best, critical[0])
    : (biology.affinity === 'ZED' ? null : biology.affinity ?? null);
  draft.intrinsics.zed = typeof attributes.zed === 'number' ? attributes.zed : null;
  draft.intrinsics.attributes = ['CCA', 'RCA', 'REF', 'INT', 'KNO', 'PRE', 'POW', 'STR', 'FOR', 'MOV'].flatMap((name) => typeof attributes[name.toLowerCase()] === 'number' ? [{ name, base: attributes[name.toLowerCase()], adjustments: [] }] : []);
  draft.proficiencies.pml = typeof biology.pml === 'number' ? biology.pml : null;
  draft.proficiencies.purchased = [...(history.skills ?? []), ...(history.traits ?? [])].map((item: any) => selection(item.name ?? String(item), 'player', item.rank));
  draft.proficiencies.languages = (history.languages ?? []).map((item: any) => ({ ...selection(item.name, 'player'), kind: item.isDefault ? 'default' : 'proficiency', primary: Boolean(item.isDefault), baseLevel: item.rank ?? 0, improvements: 0, accentRemoved: item.accented === false }));
  draft.properties.stature = biology.stature ?? null;
  draft.properties.build = biology.build ?? null;
  draft.properties.baseBuild = biology.build ?? null;
  draft.properties.profile = biology.profile ?? null;
  draft.properties.heightInches = heightInches(biology.heightFeetInches);
  draft.properties.weightPounds = biology.weightPounds ?? null;
  draft.properties.siz = attributes.siz ?? null;
  draft.properties.calculated = { ...(calculated.performance ?? {}), ...(calculated.misc ?? {}), ...(calculated.combat ?? {}), ...(calculated.resources ?? {}) };
  if (Number.isFinite(calculated.resources?.gold)) draft.finances.availableGp = Number(calculated.resources.gold);
  draft.utilities.weapons = (history.weapons ?? []).map((name: string) => inventory(name));
  draft.utilities.armor = (history.armor ?? []).map((name: string) => inventory(name));
  draft.utilities.equipment = (history.equipment ?? []).map((name: string) => inventory(name));
  for (const item of curatedSheetInventory(sheet)) {
    const collections = [draft.utilities.weapons, draft.utilities.armor, draft.utilities.equipment];
    const existing = collections.flat().find((candidate) => itemKey(candidate.name) === itemKey(item.name));
    if (existing) {
      existing.sheetProperties = item.sheetProperties;
      if (item.sizedForSiz) existing.sizedForSiz = item.sizedForSiz;
    }
    else if (/\bdeflect\b|\barmor\b/i.test(item.sheetProperties ?? '') || /helm|armor|cuirass|shield/i.test(item.name)) draft.utilities.armor.push(item);
    else if (/\bora\b|damage/i.test(item.sheetProperties ?? '')) draft.utilities.weapons.push(item);
    else draft.utilities.equipment.push(item);
  }
  draft.utilities.magicItems = (history.magicItems ?? []).map((value: unknown) => selection(value));
  draft.utilities.spells = (history.spells ?? []).map((spell: any) => selection(typeof spell === 'string' ? spell : spell.name));
  draft.utilities.gearReviewed = true;
  draft.utilities.magicItemsReviewed = true;
  draft.utilities.spellsReviewed = true;
  return normalizeImportedDraft(draft);
}

/** Imports the copied character-creator dataset once into the writable folder library. */
export async function importCharacterCreatorData(root: string) {
  const convertedRoot = path.join(process.cwd(), 'public', 'character-creator', 'data', 'converted');
  const portraitRoot = path.join(process.cwd(), 'public', 'character-creator', 'portraits');
  let files: string[];
  try { files = (await readdir(convertedRoot)).filter((name) => name.endsWith('.json')); } catch { return; }
  await mkdir(root, { recursive: true });
  for (const filename of files) {
    const sourceSlug = filename.replace(/\.json$/i, '');
    const raw = JSON.parse(await readFile(path.join(convertedRoot, filename), 'utf8')) as LegacyCharacter;
    const legacySheet = JSON.parse(await readFile(path.join(process.cwd(), 'public', 'character-creator', 'data', filename), 'utf8')) as LegacyCharacter;
    const name = raw.name?.exonym || sourceSlug;
    const stableId = createHash('sha256').update(`character-creator:${sourceSlug}`).digest('hex').slice(0, 8);
    const idName = `${stableId}-${slug(name)}`;
    try {
      const characterPath = path.join(root, idName, 'character.json');
      const existingDraft = JSON.parse(await readFile(characterPath, 'utf8')) as CharacterDraft;
      const repaired = toDraft(raw, existingDraft.utilities.portraitDataUrl, legacySheet);
      // Repair only imported fields that were absent or mapped to obsolete IDs.
      existingDraft.background = { ...existingDraft.background,
        regionId: repaired.background.regionId, settlementId: repaired.background.settlementId,
        culturalHeritageId: repaired.background.culturalHeritageId ?? existingDraft.background.culturalHeritageId,
        environHeritageId: repaired.background.environHeritageId ?? existingDraft.background.environHeritageId,
        societalHeritageId: repaired.background.societalHeritageId ?? existingDraft.background.societalHeritageId,
        beliefId: existingDraft.background.beliefId ?? repaired.background.beliefId,
        deityId: existingDraft.background.deityId ?? repaired.background.deityId,
        socialRankId: repaired.background.socialRankId ?? existingDraft.background.socialRankId,
        socialRank: existingDraft.background.socialRank ?? repaired.background.socialRank,
        personality: repaired.background.personality.length ? repaired.background.personality : existingDraft.background.personality,
        tragedySeedId: repaired.background.tragedySeedId ?? existingDraft.background.tragedySeedId,
        tragedySeedText: repaired.background.tragedySeedText ?? existingDraft.background.tragedySeedText,
        disabilities: repaired.background.disabilities,
        disabilitiesReviewed: repaired.background.disabilitiesReviewed,
        demographicSelections: [
          ...existingDraft.background.demographicSelections.filter((item) => !/^Imported (?:region|settlement|religion detail)$|^Notable feature$/i.test(item.sourceDetail ?? '')),
          ...repaired.background.demographicSelections,
        ],
      };
      existingDraft.intrinsics = { ...existingDraft.intrinsics,
        wealthRank: existingDraft.intrinsics.wealthRank ?? repaired.intrinsics.wealthRank,
        affinityAttribute: repaired.intrinsics.affinityAttribute ?? existingDraft.intrinsics.affinityAttribute,
        ...(raw.details?.genebase?.group === 'Hobit' ? {
          childOfStrife: repaired.intrinsics.childOfStrife, strifePairingId: repaired.intrinsics.strifePairingId,
          strifeFatherLineageId: repaired.intrinsics.strifeFatherLineageId,
          strifeMotherLineageId: repaired.intrinsics.strifeMotherLineageId,
          speciesId: repaired.intrinsics.speciesId, lineageId: repaired.intrinsics.lineageId,
        } : {}),
      };
      if (/^\[?error\]?$/i.test(existingDraft.utilities.properName.trim())) existingDraft.utilities.properName = '';
      const repairInventory = (current: InventorySelection[], source: InventorySelection[]) => {
        const repairedItems: InventorySelection[] = current.map((item) => {
          const sheetItem = source.find((candidate) => itemKey(candidate.name) === itemKey(item.name) && candidate.sheetProperties);
          return { ...item, ...(sheetItem ? { name: sheetItem.name, sheetProperties: sheetItem.sheetProperties, ...(sheetItem.sizedForSiz ? { sizedForSiz: sheetItem.sizedForSiz } : {}) } : { sheetProperties: undefined }) };
        });
        for (const sourceItem of source.filter((item) => item.sheetProperties)) if (!repairedItems.some((item) => itemKey(item.name) === itemKey(sourceItem.name))) repairedItems.push(sourceItem);
        return repairedItems;
      };
      existingDraft.utilities.weapons = repairInventory(existingDraft.utilities.weapons, repaired.utilities.weapons);
      existingDraft.utilities.armor = repairInventory(existingDraft.utilities.armor, repaired.utilities.armor);
      existingDraft.utilities.equipment = repairInventory(existingDraft.utilities.equipment, repaired.utilities.equipment);
      if (existingDraft.completedSteps.length < COMPLETED_CREATOR_STEPS.length) {
        existingDraft.completedSteps = [...COMPLETED_CREATOR_STEPS];
      }
      const normalized = normalizeImportedDraft(existingDraft);
      await writeFile(characterPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
      continue;
    } catch {}
    const portraitFiles = await readdir(portraitRoot);
    const portraitName = portraitFiles.find((item) => item.toLowerCase().startsWith(`decal-${sourceSlug.toLowerCase()}.`));
    let portraitDataUrl = '';
    if (portraitName) {
      const extension = path.extname(portraitName).slice(1).toLowerCase();
      const mime = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
      portraitDataUrl = `data:${mime};base64,${(await readFile(path.join(portraitRoot, portraitName))).toString('base64')}`;
    }
    const folder = path.join(root, idName);
    await mkdir(folder, { recursive: true });
    const draft = toDraft(raw, portraitDataUrl, legacySheet);
    await writeFile(path.join(folder, 'character.json'), `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
    await copyFile(path.join(convertedRoot, filename), path.join(folder, 'source-character.json'));
    if (portraitName) {
      const extension = path.extname(portraitName).toLowerCase();
      await copyFile(path.join(portraitRoot, portraitName), path.join(folder, `source-image${extension}`));
      await copyFile(path.join(portraitRoot, portraitName), path.join(folder, `portrait${extension}`));
    }
  }
  // Apply the same safe aliases to user-saved copies, not only stable imports.
  for (const folderName of await readdir(root)) {
    const characterPath = path.join(root, folderName, 'character.json');
    try {
      const draft = JSON.parse(await readFile(characterPath, 'utf8')) as CharacterDraft;
      await writeFile(characterPath, `${JSON.stringify(normalizeImportedDraft(draft), null, 2)}\n`, 'utf8');
    } catch {}
  }
}

/** Normalize the filesystem library without retaining the retired legacy import bundle. */
export async function normalizeCharacterLibrary(root: string) {
  await mkdir(root, { recursive: true });
  for (const folderName of await readdir(root)) {
    const characterPath = path.join(root, folderName, 'character.json');
    try {
      const current = await readFile(characterPath, 'utf8');
      const draft = JSON.parse(current) as CharacterDraft;
      const normalized = `${JSON.stringify(normalizeImportedDraft(draft), null, 2)}\n`;
      if (normalized !== current) await writeFile(characterPath, normalized, 'utf8');
    } catch {}
  }
}
