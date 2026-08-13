import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createEmptyCharacterDraft, type CharacterDraft, type InventorySelection, type SourcedSelection } from '@/lib/character-draft';
import { makeCatalogId } from '@/data/catalog-policy';

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
const inventory = (name: string, sheetProperties?: string): InventorySelection => {
  const quantityMatch = name.match(/(?:\s+x\s*|^)(\d+)$/i);
  const cleanName = quantityMatch ? name.slice(0, quantityMatch.index).trim() : name.trim();
  return { ...selection(cleanName), quantity: quantityMatch ? Number(quantityMatch[1]) : 1, unitPriceGp: 0, unitWeight: 0, ...(sheetProperties ? { sheetProperties } : {}) };
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
const LANGUAGE_ALIASES: Record<string, string> = {
  Restani: 'Rasiya', Resta: 'Rasiya', Oruguku: 'Orukugu',
  'Kadahdi Barter': 'Kahadi', 'Kahadi Barter': 'Kahadi', Kahudi: 'Kahadi', Warkahad: 'Kahadi',
  'Kardik Barter': 'Stask', 'Khardik Barter': 'Stask', 'Middle Khardik': 'Stask', 'War Vasikha': 'Stask',
  'Coro-Lingo': 'Coro', Coromu: 'Coro', 'Corumu Lingo': 'Coro', 'Coromur Lingo': 'Coro', 'Middle Coro': 'Coro',
  Drusa: 'Ithuuikal', Drusi: 'Ithuuikal', Drusian: 'Ithuuikal',
  'Low Coasts': 'Cher-gulo', Magespeak: 'Blacktongue',
};
const ITEM_ALIASES: Record<string, string> = {
  'Fanny-pacl': 'Fanny-pack', 'Lockpit Kit': 'Lockpick kit', Lockpicks: 'Lockpick kit',
  'Leather armor': 'Leather Armor', 'Stilettoes': 'Stilettos', Garrotte: 'Garrote',
  'Milita Arrow issued by the Pazkani Army': 'Militia Arrow issued by the Pazkani Army',
  'Bracers of Repellation': 'Bracers of Repulsion',
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
function normalizeSelections<T extends SourcedSelection>(items: T[], aliases: Record<string, string> = {}) {
  const seen = new Set<string>();
  return items.map((item) => {
    const name = aliases[item.name] ?? item.name;
    return name === item.name ? item : { ...item, id: makeCatalogId('import', name), name };
  }).filter((item) => {
    const key = item.name.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function normalizeInventory(items: InventorySelection[], category: 'weapons' | 'armor' | 'equipment') {
  const normalized = items.map((item) => {
    const name = normalizeItemName(item.name);
    const catalogueName = name.replace(/\s+SIZ\s+\d+\b/i, '').trim();
    const catalogId = item.catalogId ?? makeCatalogId(category === 'weapons' ? 'weapon' : category === 'armor' ? 'armor' : 'equipment', catalogueName);
    return { ...item, id: item.id || `inventory-${category}-${catalogId}`, catalogId, name };
  });
  return normalized.filter((item, index, all) => {
    const broad = item.name.toLocaleLowerCase().replace(/s$/, '');
    const detailed = all.find((candidate) => candidate !== item && candidate.sheetProperties && candidate.name.toLocaleLowerCase().startsWith(`${broad},`));
    if (!detailed) return true;
    detailed.quantity = Math.max(detailed.quantity, item.quantity);
    return false;
  });
}
function normalizeMagicItems(items: SourcedSelection[]) {
  return items.map((item) => {
    const name = normalizeItemName(item.name);
    return name === item.name ? item : { ...item, id: makeCatalogId('import', name), name };
  });
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
  return {
    ...draft,
    background: {
      ...draft.background,
      culturalHeritageId: draft.background.culturalHeritageId ? (heritageIds[draft.background.culturalHeritageId] ?? draft.background.culturalHeritageId) : null,
      environHeritageId,
      societalHeritageId,
    },
    proficiencies: { ...draft.proficiencies, languages: normalizeSelections(draft.proficiencies.languages, LANGUAGE_ALIASES) },
    utilities: {
      ...draft.utilities,
      properName: /^\[?error\]?$/i.test(draft.utilities.properName.trim()) ? '' : draft.utilities.properName,
      weapons: normalizeInventory(draft.utilities.weapons, 'weapons'), armor: normalizeInventory(draft.utilities.armor, 'armor'),
      equipment: normalizeInventory(draft.utilities.equipment, 'equipment'), magicItems: normalizeMagicItems(draft.utilities.magicItems),
    },
  };
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
  draft.background.ageGroup = biology.ageGroup ?? null;
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
  draft.utilities.weapons = (history.weapons ?? []).map((name: string) => inventory(name));
  draft.utilities.armor = (history.armor ?? []).map((name: string) => inventory(name));
  draft.utilities.equipment = (history.equipment ?? []).map((name: string) => inventory(name));
  for (const item of curatedSheetInventory(sheet)) {
    const collections = [draft.utilities.weapons, draft.utilities.armor, draft.utilities.equipment];
    const existing = collections.flat().find((candidate) => itemKey(candidate.name) === itemKey(item.name));
    if (existing) existing.sheetProperties = item.sheetProperties;
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
          return { ...item, ...(sheetItem ? { name: sheetItem.name, sheetProperties: sheetItem.sheetProperties } : { sheetProperties: undefined }) };
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
