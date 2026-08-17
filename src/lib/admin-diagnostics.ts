import type { StaticData } from '@/data';
import { getAttributeDm, calculateAttributeDM } from '@/lib/character-logic';
import { ROLLED_ATTRIBUTES } from '@/lib/rules/intrinsics';
import { armorKind } from '@/lib/rules/armor';

export type DiagnosticStatus = 'pass' | 'fail' | 'warn';

export type ForgeDiagnostic = {
  id: string;
  group: string;
  title: string;
  status: DiagnosticStatus;
  summary: string;
  details?: string[];
};

function result(
  id: string,
  group: string,
  title: string,
  status: DiagnosticStatus,
  summary: string,
  details: string[] = [],
): ForgeDiagnostic {
  return { id, group, title, status, summary, details };
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function duplicates(values: string[]) {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  values.forEach((value) => (seen.has(value) ? dupes.add(value) : seen.add(value)));
  return [...dupes].sort((a, b) => a.localeCompare(b));
}

function adjustmentRows(data: StaticData, groupName: string, kind: 'attributes' | 'characteristics') {
  const key = `adjustments-${kind}-${groupName.toLowerCase()}`;
  return ((data as unknown as Record<string, unknown>)[key] as Array<{ lineage?: string }> | undefined) ?? [];
}

function activeLineages(data: StaticData) {
  return data.species
    .flatMap((family) => family.groups.filter((group) => group.selectable).map((group) => ({ family: family.name, group })))
    .flatMap(({ family, group }) => group.lineages.map((lineage) => ({ family, group: group.name, lineage })));
}

export function buildForgeDiagnostics(data: StaticData): ForgeDiagnostic[] {
  const tests: ForgeDiagnostic[] = [];

  const catalogues: Array<[string, Array<{ catalogId?: string }>]> = [
    ['Traits', data.traits], ['Weapons', data.itemWeapons], ['Armor', data.itemArmors],
    ['Equipment', data.itemEquipments], ['Spells', data.spells], ['Magic Items', data.magicItems],
    ['Citystates', data.citystates], ['Deities', data.deities], ['Trades bridge', data.professions],
    ['Beliefs', data.beliefs], ['Disabilities', data.disabilities], ['Regions', data.empires],
    ['Social Ranks', data.socialRanks], ['Tragedy Seeds', data.tragedySeeds],
  ];
  const duplicateCatalogIds = catalogues.flatMap(([name, rows]) =>
    duplicates(rows.map((row) => row.catalogId ?? '')).filter(Boolean).map((id) => `${name}: ${id}`),
  );
  tests.push(result(
    'catalog-ids', 'Runtime data', 'Runtime catalog IDs are unique',
    duplicateCatalogIds.length ? 'fail' : 'pass',
    duplicateCatalogIds.length ? `${duplicateCatalogIds.length} duplicate runtime IDs found.` : `${catalogues.reduce((n, [, rows]) => n + rows.length, 0)} catalog records checked.`,
    duplicateCatalogIds,
  ));

  const selectableGroups = data.species.flatMap((family) => family.groups.filter((group) => group.selectable));
  const missingAgeBrackets = selectableGroups.filter((group) => !group.hasAgeBrackets).map((group) => group.name);
  tests.push(result(
    'selectable-age-brackets', 'Species & lineage', 'Selectable Groups have Age Brackets',
    missingAgeBrackets.length ? 'fail' : 'pass',
    missingAgeBrackets.length ? `${missingAgeBrackets.length} selectable Groups cannot resolve Age Brackets.` : `${selectableGroups.length} selectable Groups have Age Brackets.`,
    missingAgeBrackets,
  ));

  const lineageCoverageProblems: string[] = [];
  for (const { group, lineage } of activeLineages(data)) {
    const attributeNames = adjustmentRows(data, group, 'attributes').map((row) => row.lineage).filter(Boolean);
    const characteristicNames = adjustmentRows(data, group, 'characteristics').map((row) => row.lineage).filter(Boolean);
    if (!attributeNames.includes(lineage)) lineageCoverageProblems.push(`${group} / ${lineage}: missing Attribute adjustment row`);
    if (!characteristicNames.includes(lineage)) lineageCoverageProblems.push(`${group} / ${lineage}: missing Characteristic adjustment row`);
  }
  tests.push(result(
    'lineage-adjustment-coverage', 'Species & lineage', 'Selectable Lineages resolve exact adjustment rows',
    lineageCoverageProblems.length ? 'fail' : 'pass',
    lineageCoverageProblems.length ? `${lineageCoverageProblems.length} exact-name references do not resolve.` : `${activeLineages(data).length} selectable Lineages resolve both adjustment sources.`,
    lineageCoverageProblems,
  ));

  const activeLineageNamesByGroup = new Map<string, Set<string>>();
  for (const family of data.species) for (const group of family.groups) {
    activeLineageNamesByGroup.set(group.name, new Set(group.lineages));
  }
  const orphanRows: string[] = [];
  for (const group of selectableGroups) {
    const valid = activeLineageNamesByGroup.get(group.name) ?? new Set<string>();
    for (const kind of ['attributes', 'characteristics'] as const) {
      for (const row of adjustmentRows(data, group.name, kind)) {
        const name = row.lineage ?? '';
        if (!name || name === 'BASE-LINE') continue;
        if (!valid.has(name) && !/^(female|male|Child|Youth|Early Teen|Teenager|Young Adult|Adult|Mature|Old|Elderly)/i.test(name)) {
          orphanRows.push(`${group.name} ${kind}: ${name}`);
        }
      }
    }
  }
  tests.push(result(
    'lineage-adjustment-orphans', 'Species & lineage', 'Active adjustment rows name defined Lineages',
    orphanRows.length ? 'fail' : 'pass',
    orphanRows.length ? `${orphanRows.length} active adjustment rows use an undefined Lineage name.` : 'No undefined active Lineage names found in adjustment rows.',
    orphanRows,
  ));

  const professionByTrade = new Map(data.professions.map((entry) => [entry.trade, entry]));
  const missingProfessionBridges = data.tradePackages
    .filter((pkg) => !professionByTrade.get(pkg.trade)?.candidacy)
    .map((pkg) => pkg.trade);
  tests.push(result(
    'trade-candidacy-bridge', 'Trades', 'Selectable Trades have candidacy metadata',
    missingProfessionBridges.length ? 'fail' : 'pass',
    missingProfessionBridges.length ? `${missingProfessionBridges.length} selectable Trades lack candidacy metadata.` : `${data.tradePackages.length} selectable Trades resolve their candidacy bridge.`,
    missingProfessionBridges,
  ));

  const invalidCritical = data.tradePackages.flatMap((pkg) => pkg.criticalAttributes
    .filter((attribute) => !(ROLLED_ATTRIBUTES as readonly string[]).includes(attribute))
    .map((attribute) => `${pkg.trade}: ${attribute}`));
  tests.push(result(
    'trade-critical-attributes', 'Trades', 'Trade Critical Attributes are rolled Attributes',
    invalidCritical.length ? 'fail' : 'pass',
    invalidCritical.length ? `${invalidCritical.length} invalid Critical Attribute references.` : 'All selectable Trade Critical Attributes resolve to the nine rolled Attributes.',
    invalidCritical,
  ));

  const merchantBridge = professionByTrade.get('Merchant');
  const merchantSelectable = data.tradePackages.some((pkg) => pkg.trade === 'Merchant');
  tests.push(result(
    'merchant-deferred', 'Trades', 'Merchant remains explicitly deferred',
    merchantSelectable || merchantBridge?.candidacy ? 'warn' : 'pass',
    merchantSelectable || merchantBridge?.candidacy
      ? 'Merchant no longer matches the Forge’s documented deferred state; review the Trade UI and bridge data.'
      : 'Merchant exists only in the compatibility Trade table with null candidacy and is not selectable.',
  ));

  const heritageIds = data.heritagePackages.map((pkg) => pkg.id);
  const duplicateHeritageIds = duplicates(heritageIds);
  tests.push(result(
    'heritage-ids', 'Heritage', 'Heritage package IDs are unique',
    duplicateHeritageIds.length ? 'fail' : 'pass',
    duplicateHeritageIds.length ? `${duplicateHeritageIds.length} duplicate Heritage IDs.` : `${heritageIds.length} structured Heritage packages checked.`,
    duplicateHeritageIds,
  ));

  const traitBase = (value: string) => value.replace(/^\[/, '').replace(/\]$/, '').split(' > ')[0].replace(/\s+X$/, '').trim().toLowerCase();
  const runtimeTraitBases = new Set(data.traits.map((trait) => traitBase(trait.trait)));
  const unresolvedHeritageTraits = data.heritagePackages.flatMap((pkg) => pkg.grants
    .filter((grant) => !runtimeTraitBases.has(traitBase(grant.trait)))
    .map((grant) => `${pkg.name}: ${grant.trait}`));
  tests.push(result(
    'heritage-traits', 'Heritage', 'Heritage grants resolve current Trait definitions',
    unresolvedHeritageTraits.length ? 'fail' : 'pass',
    unresolvedHeritageTraits.length ? `${unresolvedHeritageTraits.length} Heritage grants do not resolve by the Forge's current base-name rule.` : 'All structured Heritage grants resolve a runtime Trait using the same base-name rule as character creation.',
    unresolvedHeritageTraits,
  ));

  const languageIds = new Set(data.languages.map((language) => language.id));
  const generatorLanguageIds = new Set(data.nameGenerators.map((generator) => generator.languageId));
  const languageProblems = [
    ...data.languages.filter((language) => !generatorLanguageIds.has(language.id)).map((language) => `${language.name}: missing name generator`),
    ...data.nameGenerators.filter((generator) => !languageIds.has(generator.languageId)).map((generator) => `${generator.language}: generator has unknown languageId ${generator.languageId}`),
    ...data.languageDefaults.filter((entry) => !languageIds.has(entry.languageId)).map((entry) => `${entry.settlement}: unknown default language ${entry.languageId}`),
  ];
  tests.push(result(
    'language-links', 'Languages & settlements', 'Languages, defaults, and name generators cross-reference',
    languageProblems.length ? 'fail' : 'pass',
    languageProblems.length ? `${languageProblems.length} language cross-reference problems.` : `${data.languages.length} languages and ${data.nameGenerators.length} name generators cross-reference cleanly.`,
    languageProblems,
  ));

  const settlementLanguageProblems = data.settlementProfiles.flatMap((profile) => {
    const ids = [profile.defaultLanguageId, ...profile.heritageLanguageIds].filter(Boolean) as string[];
    return ids.filter((id) => !languageIds.has(id)).map((id) => `${profile.displayName}: ${id}`);
  });
  tests.push(result(
    'settlement-languages', 'Languages & settlements', 'Settlement language references resolve',
    settlementLanguageProblems.length ? 'fail' : 'pass',
    settlementLanguageProblems.length ? `${settlementLanguageProblems.length} settlement language references are unresolved.` : `${data.settlementProfiles.length} settlement profiles checked.`,
    settlementLanguageProblems,
  ));

  const arrays = Object.entries(data.attributeArrays);
  const invalidArrays = arrays.filter(([, values]) => values.length !== ROLLED_ATTRIBUTES.length || values.some((value) => !Number.isInteger(value)))
    .map(([name]) => name);
  tests.push(result(
    'attribute-arrays', 'Attributes', 'Canonical Attribute arrays contain nine integer rolls',
    invalidArrays.length ? 'fail' : 'pass',
    invalidArrays.length ? `Invalid arrays: ${invalidArrays.join(', ')}` : `${arrays.length} Attribute arrays contain ${ROLLED_ATTRIBUTES.length} assignable values each.`,
    invalidArrays,
  ));

  const attributeDefinitions = data.attributeDefinitions.flatMap((group) => group.attributes);
  const creationImProblems = attributeDefinitions.filter((attribute) => !Number.isFinite(Number(attribute.creationIm))).map((attribute) => attribute.abbreviation);
  tests.push(result(
    'creation-im', 'Attributes', 'Every Attribute has a creation IM',
    creationImProblems.length ? 'fail' : 'pass',
    creationImProblems.length ? `${creationImProblems.length} Attributes lack creation IM.` : `${attributeDefinitions.length} Attribute definitions include ordinary IM and creation IM.`,
    creationImProblems,
  ));

  const pointBuy = new Map(data.pointBuyCosts.map((entry) => [entry.value, entry.cost]));
  const missingPointBuy = Array.from({ length: 7 }, (_, i) => i + 6).filter((value) => !pointBuy.has(value));
  tests.push(result(
    'point-buy-range', 'Attributes', 'Player Point Buy range 6–12 is represented',
    missingPointBuy.length ? 'fail' : 'pass',
    missingPointBuy.length ? `Missing Point Buy costs for: ${missingPointBuy.join(', ')}` : 'All player-character Point Buy values 6 through 12 have costs; Forge applies the 75-point cap in the UI.',
    missingPointBuy.map(String),
  ));

  const dmDivergence: string[] = [];
  for (const attribute of attributeDefinitions.map((entry) => entry.abbreviation)) {
    for (let value = 4; value <= 14; value += 1) {
      const runtime = getAttributeDm(value);
      const alternate = calculateAttributeDM(attribute, value);
      if (runtime !== alternate) dmDivergence.push(`${attribute} ${value}: runtime getAttributeDm=${runtime}, alternate calculateAttributeDM=${alternate}`);
    }
  }
  tests.push(result(
    'attribute-dm-helper-divergence', 'Attributes', 'Alternate Attribute-DM helper agrees with active runtime helper',
    dmDivergence.length ? 'warn' : 'pass',
    dmDivergence.length ? `${dmDivergence.length} value/Attribute combinations diverge. The active Forge uses getAttributeDm; the alternate helper should not be treated as authoritative.` : 'No helper divergence detected.',
    dmDivergence.slice(0, 20),
  ));

  const pmlMinimums = data.pmlAgeMinimums.map((row) => row.pml);
  tests.push(result(
    'pml-data', 'PML', 'PML rules expose creation defaults and age minimums',
    data.pmlRules.defaultPcPml == null || pmlMinimums.length === 0 ? 'fail' : 'pass',
    `Default PC PML ${data.pmlRules.defaultPcPml}; ${pmlMinimums.length} age-minimum bands; ${data.pmlTitles.length} title bands.`,
  ));

  const armorCatalogIds = data.itemArmors.map((item) => item.catalogId);
  const armorDuplicates = duplicates(armorCatalogIds);
  const sectionalWithoutCoverage = data.itemArmors
    .filter((item) => armorKind(item) === 'sectional' && (!item.coverageAtoms || item.coverageAtoms.length === 0))
    .map((item) => item.name);
  tests.push(result(
    'armor-runtime', 'Armor & equipment', 'Armor catalogue has unique IDs and sectional coverage atoms',
    armorDuplicates.length || sectionalWithoutCoverage.length ? 'fail' : 'pass',
    armorDuplicates.length || sectionalWithoutCoverage.length
      ? `${armorDuplicates.length} duplicate Armor IDs; ${sectionalWithoutCoverage.length} sectional entries lack coverage atoms.`
      : `${data.itemArmors.length} Armor records checked; every sectional entry has coverage atoms.`,
    [...armorDuplicates.map((id) => `Duplicate ID: ${id}`), ...sectionalWithoutCoverage.map((name) => `No coverage: ${name}`)],
  ));

  const referenceLineages = new Set<string>();
  const favored = data.favoredTradesByLineage as Record<string, Record<string, Record<string, unknown>>>;
  for (const family of Object.values(favored)) for (const group of Object.values(family)) for (const lineage of Object.keys(group)) referenceLineages.add(lineage);
  const currentLineageNames = activeLineages(data).map((entry) => entry.lineage);
  const missingFavored = currentLineageNames.filter((lineage) => !referenceLineages.has(lineage));
  tests.push(result(
    'reference-favored-trades', 'Reference-only data', 'Favored Trades reference covers current selectable Lineages',
    missingFavored.length ? 'warn' : 'pass',
    missingFavored.length ? `${missingFavored.length} current selectable Lineages are absent from the reference-only Favored Trades table.` : 'Reference Favored Trades table covers current selectable Lineages.',
    missingFavored,
  ));

  return tests;
}

export function diagnosticCounts(tests: ForgeDiagnostic[]) {
  return tests.reduce((counts, test) => {
    counts[test.status] += 1;
    return counts;
  }, { pass: 0, fail: 0, warn: 0 });
}

export function runtimeDataSummary(data: StaticData) {
  const selectableGroups = data.species.flatMap((family) => family.groups.filter((group) => group.selectable));
  const heritageKinds = data.heritagePackages.reduce<Record<string, number>>((acc, pkg) => {
    acc[pkg.kind] = (acc[pkg.kind] ?? 0) + 1;
    return acc;
  }, {});
  const armorKinds = data.itemArmors.reduce<Record<string, number>>((acc, item) => {
    const kind = armorKind(item);
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});
  return {
    selectableGroups: selectableGroups.length,
    selectableLineages: selectableGroups.reduce((sum, group) => sum + group.lineages.length, 0),
    heritageKinds,
    armorKinds,
    trades: data.tradePackages.length,
    traits: data.traits.length,
    languages: data.languages.length,
    settlements: data.settlementProfiles.length,
    weapons: data.itemWeapons.length,
    armor: data.itemArmors.length,
    equipment: data.itemEquipments.length,
    spells: data.spells.length,
    magicItems: data.magicItems.length,
  };
}
