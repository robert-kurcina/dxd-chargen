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
const settlementProfiles = read('settlementProfiles.json');
const localeProfiles = read('localeProfiles.json');
const citystates = read('citystates.json');
const physicalScale = read('physicalScale.json');
const heritageCharacteristicAdjustments = read('heritageCharacteristicAdjustments.json');
const characteristicModifiers = read('characteristicModifiers.json');
const itemArmors = read('itemArmors.json');

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
    if (!Number.isInteger(grant.maturityStars) || grant.maturityStars < 0) {
      throw new Error(`Missing/invalid canonical maturity asterisks in ${pkg.id}: ${grant.trait}`);
    }
    if (!Number.isFinite(grant.authorCalibration?.stars) || grant.authorCalibration.stars < 0) {
      throw new Error(`Missing/invalid author-calibration Stars in ${pkg.id}: ${grant.trait}`);
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
  ...settlementProfiles.map((entry) => entry.name),
]);
const defaultSettlements = new Set();
for (const mapping of languageDefaults) {
  if (!mapping.settlement || defaultSettlements.has(mapping.settlement)) throw new Error(`Duplicate/blank default-language settlement: ${mapping.settlement}`);
  defaultSettlements.add(mapping.settlement);
  if (!languageIds.has(mapping.languageId)) throw new Error(`Default language ${mapping.languageId} for ${mapping.settlement} is not in languages.json`);
  if (!knownSettlementNames.has(mapping.settlement)) throw new Error(`Unknown default-language settlement: ${mapping.settlement}`);
}


const heritageNames = new Set(heritage.map((entry) => entry.name));
const environHeritageNames = new Set(heritage.filter((entry) => entry.kind === 'environs').map((entry) => entry.name));
const cultureHeritageNames = new Set(heritage.filter((entry) => entry.kind === 'culture').map((entry) => entry.name));
const societyHeritageNames = new Set(heritage.filter((entry) => entry.kind === 'society').map((entry) => entry.name));
const deityNames = new Set(read('deities.json').map((entry) => entry.deity));
const empireNames = new Set(read('empires.json').map((entry) => entry.name));
const settlementProfileKeys = new Set();
for (const profile of settlementProfiles) {
  const key = `${profile.regionName}::${profile.name}`;
  if (!profile.name || settlementProfileKeys.has(key)) throw new Error(`Duplicate/blank detailed settlement profile: ${key}`);
  settlementProfileKeys.add(key);
  if (!empireNames.has(profile.regionName)) throw new Error(`Detailed settlement ${profile.name} references unknown political region ${profile.regionName}`);
  if (!Number.isInteger(profile.population) || profile.population < 0) throw new Error(`Detailed settlement ${profile.name} has invalid population`);
  if (!languageIds.has(profile.defaultLanguageId)) throw new Error(`Detailed settlement ${profile.name} has unknown default language ${profile.defaultLanguageId}`);
  for (const id of profile.heritageLanguageIds ?? []) if (!languageIds.has(id)) throw new Error(`Detailed settlement ${profile.name} has unknown Heritage language ${id}`);
  for (const environ of profile.environs ?? []) if (!environHeritageNames.has(environ)) throw new Error(`Detailed settlement ${profile.name} has unknown Environs Heritage ${environ}`);
  for (const culture of profile.cultureRecommendations ?? []) if (!cultureHeritageNames.has(culture)) throw new Error(`Detailed settlement ${profile.name} has unknown Culture Heritage recommendation ${culture}`);
  for (const society of profile.societyRecommendations ?? []) if (!societyHeritageNames.has(society)) throw new Error(`Detailed settlement ${profile.name} has unknown Society Heritage recommendation ${society}`);
  if (profile.currentDeity && !deityNames.has(profile.currentDeity)) throw new Error(`Detailed settlement ${profile.name} has unknown current deity ${profile.currentDeity}`);
  if (!Number.isFinite(profile.originWeight) || profile.originWeight <= 0) throw new Error(`Detailed settlement ${profile.name} has invalid origin weight`);
}
for (const locale of localeProfiles) {
  const localSettlements = settlementProfiles.filter((entry) => entry.localeId === locale.id);
  const total = localSettlements.reduce((sum, entry) => sum + entry.population, 0);
  if (total !== locale.population) throw new Error(`Locale ${locale.name} population mismatch: settlements ${total}, locale ${locale.population}`);
  if (!empireNames.has(locale.regionName)) throw new Error(`Locale ${locale.name} references unknown political region ${locale.regionName}`);
  if (!languageIds.has(locale.dominantLanguageId)) throw new Error(`Locale ${locale.name} has unknown dominant language ${locale.dominantLanguageId}`);
  for (const deity of locale.currentDeitySpheres ?? []) if (!deityNames.has(deity)) throw new Error(`Locale ${locale.name} has unknown current deity ${deity}`);
  if (locale.historicalDeity?.name && !deityNames.has(locale.historicalDeity.name)) throw new Error(`Locale ${locale.name} has unknown historical deity ${locale.historicalDeity.name}`);
}

const speciesFamilies = new Map(species.map((family) => [family.name, family]));
for (const requiredFamily of ['Humaniki', 'Kriketai', 'Stonefolk']) {
  if (!speciesFamilies.has(requiredFamily)) throw new Error(`Missing canonical Species family ${requiredFamily}.`);
}
const humanikiGroups = speciesFamilies.get('Humaniki')?.groups.map((group) => group.name) ?? [];
const expectedHumanikiGroups = ['Human', 'Drauf', 'Alef', 'Klenari', 'Babbita', 'Gnoan', 'Cherigili'];
if (expectedHumanikiGroups.some((name) => !humanikiGroups.includes(name))) throw new Error('Humaniki Ancestral Group hierarchy is incomplete.');
const selectableGroups = humanikiGroups.filter((name) => name !== 'Cherigili' && Object.prototype.hasOwnProperty.call(ageBrackets, name));
if (selectableGroups.length !== expectedHumanikiGroups.length - 1) throw new Error('Every currently selectable Humaniki Group must have age brackets and Cherigili must remain non-selectable.');
const stonefolk = speciesFamilies.get('Stonefolk')?.groups.find((group) => group.name === 'Stonefolk');
if (!stonefolk?.lineages.includes('Plains') || !stonefolk?.lineages.includes('Mountains')) throw new Error('Disabled Stonefolk display should retain canonical Plains/Mountains Lines.');


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


const armorKinds = new Set(['sectional', 'gear', 'shield', 'helmet', 'set']);
const armorAtoms = new Set([
  'Skull','Face','Neck (Front)','Neck (Back)','Upper Chest','Chest','Abdomen','Upper Back','Lower Back',
  ...['Left','Right'].flatMap((side) => ['Shoulder','Upper Arm','Elbow','Forearm','Hand'].map((part) => `${part} (${side})`)),
  ...['Left','Right'].flatMap((side) => ['Thigh','Knee','Shin','Foot'].map((part) => `${part} (${side})`)),
]);
const sideTemplates = new Set(['Shoulder','Upper Arm','Elbow','Forearm','Hand','Thigh','Knee','Shin','Foot']);
for (const item of itemArmors) {
  if (!armorKinds.has(item.armorKind)) throw new Error(`Armor ${item.name} has invalid/missing armorKind ${item.armorKind}`);
  if (!Array.isArray(item.hitLocations) || !Array.isArray(item.fullCoverage) || !Array.isArray(item.coverageAtoms)) throw new Error(`Armor ${item.name} is missing structured coverage arrays.`);
  if (item.armorKind === 'set' && (!['Light','Medium','Heavy','Field'].includes(item.suitClass) || !item.setMaterial)) throw new Error(`Armor Set ${item.name} is missing Suit classification/material.`);
  if (['sectional','helmet'].includes(item.armorKind) && item.coverageAtoms.length === 0) throw new Error(`Detailed Armor ${item.name} has no granular body occupancy.`);
  if (item.sideRequired === true) {
    for (const atom of item.coverageAtoms) if (!sideTemplates.has(atom)) throw new Error(`Side-required Armor ${item.name} has invalid unsided atom template ${atom}.`);
  } else {
    for (const atom of item.coverageAtoms) if (!armorAtoms.has(atom)) throw new Error(`Armor ${item.name} has unknown granular body atom ${atom}.`);
  }
}
const armorSets = itemArmors.filter((item) => item.armorKind === 'set');
if (armorSets.length !== 7) throw new Error(`Expected seven canonical Armor Set quick-picks; found ${armorSets.length}.`);
if (armorSets.some((item) => item.abstractQuickPick !== true)) throw new Error('Every canonical Armor Set must be marked as an abstract quick-pick rather than an exact sectional recipe.');
const sectionalArmors = itemArmors.filter((item) => item.armorKind === 'sectional');
const derivedSectionals = sectionalArmors.filter((item) => item.derivedSectional === true);
if (sectionalArmors.length !== 67 || derivedSectionals.length !== 37) throw new Error(`Sectional Armor catalogue mismatch: ${sectionalArmors.length} total / ${derivedSectionals.length} derived.`);
for (const item of itemArmors) if (!item.materialClass) throw new Error(`Armor ${item.name} is missing normalized materialClass.`);
for (const item of derivedSectionals) if (item.bookParityStatus !== 'pending') throw new Error(`Derived Sectional Armor ${item.name} must remain flagged for book parity until the book tables are updated.`);
const personalArmorSlots = Object.fromEntries(['helmet','shield','gear'].map((kind) => [kind, itemArmors.filter((item) => item.armorKind === kind).length]));
if (personalArmorSlots.helmet !== 8 || personalArmorSlots.shield !== 5 || personalArmorSlots.gear !== 6) throw new Error(`Personal Armor slot catalogue mismatch: ${JSON.stringify(personalArmorSlots)}`);

const disallowedOverlap = (left, right) => {
  const allowed = new Set(['Elbow (Left)','Elbow (Right)','Knee (Left)','Knee (Right)']);
  return left.filter((atom) => right.includes(atom) && !allowed.has(atom));
};
const armorByName = new Map(itemArmors.map((item) => [item.name, item]));
const cuirass = armorByName.get('Cuirass, Metal');
const breastplate = armorByName.get('Breastplate, Metal');
if (!cuirass || !breastplate || disallowedOverlap(cuirass.coverageAtoms, breastplate.coverageAtoms).length === 0) throw new Error('Cuirass/Breastplate occupancy regression: overlapping torso armor must be detectable.');
const rerebraces = armorByName.get('Rerebraces, Metal');
const vambraces = armorByName.get('Vambraces, Metal');
if (!rerebraces || !vambraces || disallowedOverlap(rerebraces.coverageAtoms, vambraces.coverageAtoms).length !== 0) throw new Error('Rerebrace/Vambrace occupancy regression: adjacent upper/lower arm components should remain compatible.');
if (armorByName.get('Backplate, Metal')?.bodyParts !== 'Back Torso') throw new Error('Backplate structured body-part coverage must be Back Torso.');
const silhouette = fs.readFileSync(path.resolve('public/armor/hit-locations.svg'), 'utf8').toLowerCase();
for (const atom of armorAtoms) if (!silhouette.includes(`inkscape:label=\"${atom.toLowerCase()}\"`)) throw new Error(`Armor silhouette is missing semantic layer ${atom}.`);

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
console.log(`Detailed settlement profiles: ${settlementProfiles.length}; locale profiles: ${localeProfiles.length}.`);
console.log(`Complete playable Trade packages: ${tradePackages.length}.`);
console.log(`Physical scale: ${physicalScale.length} rows; Heritage body rules: ${heritageCharacteristicAdjustments.length}.`);
console.log(`Selectable Humaniki Groups: ${selectableGroups.length} (${selectableGroups.join(', ')}); Cherigili Group plus Kriket and Stonefolk families retained but disabled.`);
console.log(`Personal Armor: ${armorSets.length} Armor Sets; ${personalArmorSlots.helmet} Helms; ${personalArmorSlots.shield} Shields; ${personalArmorSlots.gear} Gear; ${sectionalArmors.length} sectional components (${derivedSectionals.length} derived parity candidates).`);
console.log(`Complete magic items exposed by policy: ${completeMagicItems.length}/${magicItems.length}.`);
if (duplicateTraitKeys.length) {
  console.warn(`Legacy duplicate Trait keys retained for compatibility: ${[...new Set(duplicateTraitKeys)].join(', ')}`);
}
