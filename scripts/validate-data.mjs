import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve('src/data');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));

const jsonFiles = fs.readdirSync(dataDir).filter((name) => name.endsWith('.json'));
for (const name of jsonFiles) read(name);

const traits = read('traits.json');
const heritage = read('heritagePackages.json');
const languages = read('languages.json');
const nameGenerators = read('nameGenerators.json');
const languageDefaults = read('languageDefaults.json');
const ageBrackets = read('ageBrackets.json');
const species = read('species.json');
const magicItems = read('magicItems.json');
const tradePackages = read('tradePackages.json');
const professions = read('professions.json');
const settlements = read('settlements.json');
const citystates = read('citystates.json');
const physicalScale = read('physicalScale.json');
const heritageCharacteristicAdjustments = read('heritageCharacteristicAdjustments.json');
const characteristicModifiers = read('characteristicModifiers.json');

const traitKeys = new Set(traits.map((item) => item.Key));
const traitIds = new Set();
const duplicateTraitKeys = [];
for (const item of traits) {
  if (traitKeys.has(item.Key) && traitIds.has(item.Key)) duplicateTraitKeys.push(item.Key);
  traitIds.add(item.Key);
}

const heritageIds = new Set();
for (const pkg of heritage) {
  if (heritageIds.has(pkg.id)) throw new Error(`Duplicate Heritage id: ${pkg.id}`);
  heritageIds.add(pkg.id);
  if (!['culture', 'environs', 'society'].includes(pkg.kind)) throw new Error(`Unknown Heritage kind: ${pkg.kind}`);
  for (const grant of pkg.grants) {
    if (!grant.traitId || !grant.trait || !Number.isFinite(grant.level) || grant.level <= 0) {
      throw new Error(`Invalid Heritage grant in ${pkg.id}`);
    }
  }
}

const languageIds = new Set();
for (const language of languages) {
  if (languageIds.has(language.id)) throw new Error(`Duplicate language id: ${language.id}`);
  languageIds.add(language.id);
  if (!language.nameGenerator || !fs.existsSync(path.join(dataDir, language.nameGenerator))) {
    throw new Error(`Missing name generator for ${language.name}: ${language.nameGenerator}`);
  }
}

const generatorByLanguage = new Map();
for (const generator of nameGenerators) {
  if (!generator.languageId || generatorByLanguage.has(generator.languageId)) throw new Error(`Duplicate/blank structured name generator: ${generator.languageId}`);
  generatorByLanguage.set(generator.languageId, generator);
  if (!languageIds.has(generator.languageId)) throw new Error(`Structured name generator has unknown language: ${generator.languageId}`);
  if (!Array.isArray(generator.patterns) || generator.patterns.length !== 6) throw new Error(`Name generator ${generator.language} must contain six D6 patterns.`);
  if (generator.kind === 'borensk') {
    for (const key of ['votivePrefix', 'initial', 'kernel', 'ending']) {
      if (!Array.isArray(generator[key]) || generator[key].length !== 36) throw new Error(`Borensk generator ${key} must contain 36 D66 rows.`);
    }
  } else {
    if (!Array.isArray(generator.begin) || generator.begin.length !== 36 || !Array.isArray(generator.middle) || generator.middle.length !== 36) {
      throw new Error(`Name generator ${generator.language} must contain 36 Begin and 36 Middle rows.`);
    }
  }
}
for (const language of languages) {
  if (!generatorByLanguage.has(language.id)) throw new Error(`Missing structured name generator for ${language.name}`);
}

const knownSettlementNames = new Set([
  ...citystates.map((entry) => entry.name),
  ...Object.values(settlements).flat(),
]);
const defaultSettlements = new Set();
for (const mapping of languageDefaults) {
  if (!mapping.settlement || defaultSettlements.has(mapping.settlement)) throw new Error(`Duplicate/blank default-language settlement: ${mapping.settlement}`);
  defaultSettlements.add(mapping.settlement);
  if (!languageIds.has(mapping.languageId)) throw new Error(`Default language ${mapping.languageId} for ${mapping.settlement} is not in languages.json`);
  if (!knownSettlementNames.has(mapping.settlement)) throw new Error(`Unknown default-language settlement: ${mapping.settlement}`);
}

const playableSpecies = species
  .flatMap((family) => family.groups.map((group) => group.name))
  .filter((name) => Object.prototype.hasOwnProperty.call(ageBrackets, name));
if (playableSpecies.includes('Kriket')) throw new Error('Kriket should remain excluded until age brackets exist.');


const normalizeTraitFamily = (value) => String(value)
  .replace(/^\[/, '')
  .replace(/\]$/, '')
  .replace(/\s+>.*$/, '')
  .replace(/\s+X$/, '')
  .trim()
  .toLowerCase();
const traitFamilies = new Set(traits.map((item) => normalizeTraitFamily(item.trait)));
for (const pkg of heritage) {
  for (const grant of pkg.grants) {
    if (!traitFamilies.has(normalizeTraitFamily(grant.trait))) throw new Error(`Unresolved Heritage Trait ${grant.trait} in ${pkg.id}`);
  }
}

const rolledAttributes = new Set(['CCA', 'RCA', 'REF', 'INT', 'KNO', 'PRE', 'POW', 'STR', 'FOR']);
const professionByTrade = new Map(professions.map((item) => [item.trade, item]));
const tradeIds = new Set();
for (const pkg of tradePackages) {
  if (!pkg.trade || tradeIds.has(pkg.trade)) throw new Error(`Duplicate or blank Trade package: ${pkg.trade}`);
  tradeIds.add(pkg.trade);
  if (pkg.trade === 'Merchant') throw new Error('Merchant must remain deferred until candidacy/Affinity data is complete.');
  if (!professionByTrade.has(pkg.trade)) throw new Error(`Trade package missing profession catalogue entry: ${pkg.trade}`);
  if (!Array.isArray(pkg.criticalAttributes) || pkg.criticalAttributes.length === 0) throw new Error(`Trade has no Critical Attributes: ${pkg.trade}`);
  for (const attribute of pkg.criticalAttributes) {
    if (!rolledAttributes.has(attribute)) throw new Error(`Invalid Critical Attribute ${attribute} in ${pkg.trade}`);
  }
  if (!Number.isInteger(pkg.minimumAgeRank)) throw new Error(`Invalid minimum Age Rank in ${pkg.trade}`);
  const specializationIds = new Set();
  for (const specialization of pkg.specializations) {
    if (!specialization.name || specializationIds.has(specialization.name)) throw new Error(`Duplicate/blank specialization in ${pkg.trade}`);
    specializationIds.add(specialization.name);
  }
  for (const [source, grants] of [
    [pkg.trade, pkg.grants],
    ...pkg.specializations.map((specialization) => [`${pkg.trade} / ${specialization.name}`, specialization.grants]),
  ]) {
    for (const grant of grants) {
      if (!grant.trait || !Number.isFinite(grant.level) || grant.level <= 0) throw new Error(`Invalid Trade grant in ${source}`);
      if (!traitFamilies.has(normalizeTraitFamily(grant.trait))) throw new Error(`Unresolved Trade Trait ${grant.trait} in ${source}`);
      if (!Number.isFinite(grant.stars) || grant.stars < 0) throw new Error(`Invalid author-calibration Stars in ${source}`);
    }
  }
}
if (tradePackages.length !== 11) throw new Error(`Expected 11 complete playable Trade packages; found ${tradePackages.length}.`);


if (physicalScale.length !== 100) throw new Error(`Expected 100 physical-scale rows; found ${physicalScale.length}.`);
for (let index = 0; index < physicalScale.length; index += 1) {
  const row = physicalScale[index];
  if (row.value !== index || !row.height || !Number.isInteger(row.heightInches) || !Number.isFinite(row.weightPounds) || !Number.isFinite(row.siz)) {
    throw new Error(`Invalid physical-scale row ${index}.`);
  }
}
const physicalHeritageKinds = new Set(['economy', 'society', 'environs', 'culture']);
for (const rule of heritageCharacteristicAdjustments) {
  if (!physicalHeritageKinds.has(rule.kind) || !Array.isArray(rule.entries) || rule.entries.length === 0 || !Number.isFinite(rule.stature) || !Number.isFinite(rule.build)) {
    throw new Error(`Invalid Heritage characteristic adjustment: ${JSON.stringify(rule)}`);
  }
}
const ageCharacteristicGroups = new Set(characteristicModifiers.map((row) => row.Group));
for (const group of ['Child','Youth','Early Teen','Teenager','Young Adult','Adult','Mature','Middle Age','Elder','Aged','Venerable']) {
  if (!ageCharacteristicGroups.has(group)) throw new Error(`Missing physical Age Group adjustment: ${group}`);
}

const completeMagicItems = magicItems.filter((item) =>
  item.name?.trim() &&
  item.form?.trim() &&
  item.gradeAvailability?.trim() &&
  item.description?.trim() &&
  !item.description.toLowerCase().includes('no detailed effect entry is currently specified')
);

console.log(`Validated ${jsonFiles.length} JSON files.`);
console.log(`Heritage packages: ${heritage.length}.`);
console.log(`Languages/name generators: ${languages.length}; structured D66 generators: ${nameGenerators.length}; explicit settlement defaults: ${languageDefaults.length}.`);
console.log(`Complete playable Trade packages: ${tradePackages.length}.`);
console.log(`Physical scale: ${physicalScale.length} rows; Heritage body rules: ${heritageCharacteristicAdjustments.length}.`);
console.log(`Playable species with age data: ${playableSpecies.length} (${playableSpecies.join(', ')}).`);
console.log(`Complete magic items exposed by policy: ${completeMagicItems.length}/${magicItems.length}.`);
if (duplicateTraitKeys.length) {
  console.warn(`Legacy duplicate Trait keys retained for compatibility: ${[...new Set(duplicateTraitKeys)].join(', ')}`);
}
