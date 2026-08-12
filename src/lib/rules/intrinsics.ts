import type { StaticData } from '@/data';
import { makeCatalogId } from '@/data/catalog-policy';
import type { CharacterDraft, DraftAttribute, SelectionSource, SourcedSelection } from '@/lib/character-draft';
import {
  calculateCreationAttributeSkillpointCost,
  evaluateCandidacy,
  getAgeRankValue,
  getAttributeDm,
  parseTalent,
} from '@/lib/character-logic';
import type { StepAssessment } from './background';

export const ROLLED_ATTRIBUTES = ['CCA', 'RCA', 'REF', 'INT', 'KNO', 'PRE', 'POW', 'STR', 'FOR'] as const;
export type RolledAttribute = (typeof ROLLED_ATTRIBUTES)[number];

const PLAYER_ADJUSTMENT_DETAIL = 'Post-array Attribute adjustment';
const INTRINSIC_STEPS = new Set([
  'intrinsics-species',
  'intrinsics-attributes',
  'intrinsics-trade-specialization',
  'intrinsics-zed',
  'intrinsics-wealth',
]);

export function isIntrinsicStep(stepValue: string) {
  return INTRINSIC_STEPS.has(stepValue);
}

export function getSpeciesChoice(draft: CharacterDraft, data: StaticData) {
  for (const family of data.species) {
    const group = family.groups.find((entry) => entry.catalogId === draft.intrinsics.speciesId);
    if (group) return { family, group };
  }
  return null;
}

export function getLineageName(draft: CharacterDraft, data: StaticData) {
  const species = getSpeciesChoice(draft, data)?.group;
  if (!species || !draft.intrinsics.lineageId) return null;
  return species.lineages.find((lineage) => makeCatalogId('lineage', lineage) === draft.intrinsics.lineageId) ?? null;
}

function attributeTableForSpecies(speciesName: string, data: StaticData) {
  switch (speciesName) {
    case 'Alef': return data['adjustments-attributes-alef'];
    case 'Babbita': return data['adjustments-attributes-babbita'];
    case 'Cherigili': return data['adjustments-attributes-cherigili'];
    case 'Drauf': return data['adjustments-attributes-drauf'];
    case 'Gnoan': return data['adjustments-attributes-gnoan'];
    case 'Human': return data['adjustments-attributes-human'];
    case 'Klenari': return data['adjustments-attributes-klenari'];
    case 'Kriket': return data['adjustments-attributes-kriket'];
    case 'Stonefolk': return data['adjustments-attributes-stonefolk'];
    default: return [];
  }
}

function characteristicTableForSpecies(speciesName: string, data: StaticData) {
  switch (speciesName) {
    case 'Alef': return data['adjustments-characteristics-alef'];
    case 'Babbita': return data['adjustments-characteristics-babbita'];
    case 'Cherigili': return data['adjustments-characteristics-cherigili'];
    case 'Drauf': return data['adjustments-characteristics-drauf'];
    case 'Gnoan': return data['adjustments-characteristics-gnoan'];
    case 'Human': return data['adjustments-characteristics-human'];
    case 'Klenari': return data['adjustments-characteristics-klenari'];
    case 'Kriket': return data['adjustments-characteristics-kriket'];
    case 'Stonefolk': return data['adjustments-characteristics-stonefolk'];
    default: return [];
  }
}

type AdjustmentRow = Record<string, string | number | null | undefined> & { lineage?: string };

type NumericAdjustment = {
  amount: number;
  source: SelectionSource;
  sourceDetail: string;
};

function rowAdjustment(row: AdjustmentRow | undefined, attribute: string) {
  if (!row) return 0;
  const value = Number(row[attribute]);
  return Number.isFinite(value) ? value : 0;
}

function selectedRows(draft: CharacterDraft, data: StaticData) {
  const speciesName = getSpeciesChoice(draft, data)?.group.name;
  if (!speciesName) return { speciesName: null, baseline: undefined, lineage: undefined, age: undefined };

  const table = attributeTableForSpecies(speciesName, data) as AdjustmentRow[];
  const lineageName = getLineageName(draft, data);
  const baseline = table.find((row) => row.lineage === 'BASE-LINE');
  const lineage = lineageName ? table.find((row) => row.lineage === lineageName) : undefined;
  const ageRank = data.ageGroups.find((entry) => entry.ageGroup === draft.background.ageGroup)?.rank;
  const ageLabel = draft.background.ageGroup && ageRank ? `${draft.background.ageGroup} [${ageRank}]` : null;
  const age = ageLabel ? table.find((row) => row.lineage === ageLabel) : undefined;

  return { speciesName, baseline, lineage, age };
}

export function getTradePackage(draft: CharacterDraft, data: StaticData) {
  if (!draft.intrinsics.tradeId) return null;
  return data.tradePackages.find((pkg) => makeCatalogId('trade', pkg.trade) === draft.intrinsics.tradeId) ?? null;
}

export function getTradeSpecialization(draft: CharacterDraft, data: StaticData) {
  const pkg = getTradePackage(draft, data);
  if (!pkg || !draft.intrinsics.specializationId) return null;
  return pkg.specializations.find(
    (specialization) => makeCatalogId('specialization', `${pkg.trade}-${specialization.name}`) === draft.intrinsics.specializationId,
  ) ?? null;
}

function packageAdjustment(attribute: string, draft: CharacterDraft, data: StaticData) {
  const pkg = getTradePackage(draft, data);
  const specialization = getTradeSpecialization(draft, data);
  return rowAdjustment(pkg?.adjustments as AdjustmentRow | undefined, attribute)
    + rowAdjustment(specialization?.adjustments as AdjustmentRow | undefined, attribute);
}

export function nonPlayerAdjustmentsForAttribute(
  attribute: string,
  draft: CharacterDraft,
  data: StaticData,
): NumericAdjustment[] {
  const { speciesName, baseline, lineage, age } = selectedRows(draft, data);
  const lineageName = getLineageName(draft, data);
  const pkg = getTradePackage(draft, data);
  const specialization = getTradeSpecialization(draft, data);
  const adjustments: NumericAdjustment[] = [];

  const add = (amount: number, source: SelectionSource, sourceDetail: string) => {
    if (amount !== 0) adjustments.push({ amount, source, sourceDetail });
  };

  if (speciesName) add(rowAdjustment(baseline, attribute), 'species', `${speciesName} baseline`);
  if (speciesName && lineageName) add(rowAdjustment(lineage, attribute), 'lineage', `${lineageName} lineage`);
  if (speciesName && draft.background.ageGroup) {
    add(rowAdjustment(age, attribute), 'rule', `${speciesName} ${draft.background.ageGroup} age adjustment`);
  }
  if (pkg) add(rowAdjustment(pkg.adjustments as AdjustmentRow, attribute), 'trade', `${pkg.trade} Trade`);
  if (pkg && specialization) {
    add(rowAdjustment(specialization.adjustments as AdjustmentRow, attribute), 'trade', `${pkg.trade} — ${specialization.name}`);
  }

  return adjustments;
}

export function candidateAttributeValues(draft: CharacterDraft, data: StaticData): Record<string, number> {
  const { speciesName, baseline, lineage } = selectedRows(draft, data);
  const lineageName = getLineageName(draft, data);
  const values: Record<string, number> = {};

  for (const attribute of ROLLED_ATTRIBUTES) {
    const record = draft.intrinsics.attributes.find((entry) => entry.name === attribute);
    const base = record?.base ?? 0;
    values[attribute] = base
      + (speciesName ? rowAdjustment(baseline, attribute) : 0)
      + (lineageName ? rowAdjustment(lineage, attribute) : 0);
  }
  return values;
}

export function getFinalAttributeValue(attribute: string, draft: CharacterDraft) {
  const record = draft.intrinsics.attributes.find((entry) => entry.name === attribute);
  if (!record) return null;
  return record.base + record.adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
}

export function getPurchasedAttributeIncrease(attribute: string, draft: CharacterDraft) {
  const record = draft.intrinsics.attributes.find((entry) => entry.name === attribute);
  return record?.adjustments.find(
    (adjustment) => adjustment.source === 'player' && adjustment.sourceDetail === PLAYER_ADJUSTMENT_DETAIL,
  )?.amount ?? 0;
}

export function totalPurchasedAttributeIncreases(draft: CharacterDraft) {
  return ROLLED_ATTRIBUTES.reduce((sum, attribute) => sum + Math.max(0, getPurchasedAttributeIncrease(attribute, draft)), 0)
    + Math.max(0, draft.intrinsics.zedPurchasedIncrease);
}

export function setAttributeBaseValues(
  draft: CharacterDraft,
  method: CharacterDraft['intrinsics']['attributeMethod'],
  values: Record<RolledAttribute, number>,
  arrayId: CharacterDraft['intrinsics']['attributeArrayId'] = null,
): CharacterDraft {
  const prior = new Map(draft.intrinsics.attributes.map((attribute) => [attribute.name, attribute]));
  const attributes: DraftAttribute[] = ROLLED_ATTRIBUTES.map((name) => ({
    name,
    base: values[name],
    adjustments: prior.get(name)?.adjustments ?? [],
  }));
  return {
    ...draft,
    intrinsics: {
      ...draft.intrinsics,
      attributeMethod: method,
      attributeArrayId: arrayId,
      attributes,
      affinityAttribute: null,
      zed: null,
    },
  };
}

export function setPurchasedAttributeIncrease(
  draft: CharacterDraft,
  attribute: RolledAttribute,
  increase: number,
): CharacterDraft {
  const clamped = Math.max(0, Math.min(2, Math.trunc(increase)));
  const attributes = draft.intrinsics.attributes.map((entry) => {
    if (entry.name !== attribute) return entry;
    const adjustments = entry.adjustments.filter(
      (adjustment) => !(adjustment.source === 'player' && adjustment.sourceDetail === PLAYER_ADJUSTMENT_DETAIL),
    );
    if (clamped > 0) adjustments.push({ amount: clamped, source: 'player', sourceDetail: PLAYER_ADJUSTMENT_DETAIL });
    return { ...entry, adjustments };
  });
  return { ...draft, intrinsics: { ...draft.intrinsics, attributes } };
}

function traitCatalogIdForName(name: string, data: StaticData) {
  const base = (value: string) => value
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(' > ')[0]
    .replace(/\s+X$/, '')
    .trim()
    .toLowerCase();
  return data.traits.find((trait) => base(trait.trait) === base(name))?.catalogId;
}

function parseTalentList(
  talentText: string | undefined,
  source: 'species' | 'lineage',
  sourceDetail: string,
  data: StaticData,
): SourcedSelection[] {
  if (!talentText?.trim()) return [];
  return talentText
    .split(/\.\s*/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => {
      const parsed = parseTalent(text);
      return {
        id: makeCatalogId('grant', `${sourceDetail}-${parsed.name}-${parsed.specialization ?? ''}-${index}`),
        catalogId: traitCatalogIdForName(parsed.name, data),
        name: parsed.name,
        source,
        sourceDetail,
        level: parsed.level,
        specialization: parsed.specialization ?? undefined,
      } satisfies SourcedSelection;
    });
}

function syncIntrinsicGrantedSelections(draft: CharacterDraft, data: StaticData): CharacterDraft {
  const retained = draft.proficiencies.granted.filter(
    (item) => !['species', 'lineage', 'trade'].includes(item.source),
  );
  const grants: SourcedSelection[] = [];
  const speciesName = getSpeciesChoice(draft, data)?.group.name;
  const lineageName = getLineageName(draft, data);

  if (speciesName) {
    const characteristics = characteristicTableForSpecies(speciesName, data) as Array<{ lineage?: string; talents?: string }>;
    const baseline = characteristics.find((row) => row.lineage === 'BASE-LINE');
    grants.push(...parseTalentList(baseline?.talents, 'species', `${speciesName} baseline`, data));
    if (lineageName) {
      const lineage = characteristics.find((row) => row.lineage === lineageName);
      grants.push(...parseTalentList(lineage?.talents, 'lineage', `${lineageName} lineage`, data));
    }
  }

  const pkg = getTradePackage(draft, data);
  const specialization = getTradeSpecialization(draft, data);
  if (pkg) {
    const addTradeGrants = (
      items: Array<{ trait: string; specialization: string | null; level: number }>,
      detail: string,
      prefix: string,
    ) => {
      items.forEach((grant, index) => grants.push({
        id: makeCatalogId('grant', `${prefix}-${grant.trait}-${grant.specialization ?? ''}-${index}`),
        catalogId: traitCatalogIdForName(grant.trait, data),
        name: grant.trait,
        source: 'trade',
        sourceDetail: detail,
        level: grant.level,
        specialization: grant.specialization ?? undefined,
      }));
    };
    addTradeGrants(pkg.grants, `${pkg.trade} Trade`, `trade-${pkg.trade}`);
    if (specialization) {
      addTradeGrants(
        specialization.grants,
        `${pkg.trade} — ${specialization.name}`,
        `trade-${pkg.trade}-${specialization.name}`,
      );
    }
  }

  return { ...draft, proficiencies: { ...draft.proficiencies, granted: [...retained, ...grants] } };
}

function rebuildAttributeAdjustments(draft: CharacterDraft, data: StaticData): CharacterDraft {
  if (draft.intrinsics.attributes.length === 0) return draft;
  const attributes = ROLLED_ATTRIBUTES.map((name) => {
    const existing = draft.intrinsics.attributes.find((entry) => entry.name === name);
    const player = existing?.adjustments.filter((adjustment) => adjustment.source === 'player') ?? [];
    return {
      name,
      base: existing?.base ?? 7,
      adjustments: [...nonPlayerAdjustmentsForAttribute(name, draft, data), ...player],
    } satisfies DraftAttribute;
  });
  return { ...draft, intrinsics: { ...draft.intrinsics, attributes } };
}

export function tradeCandidacy(draft: CharacterDraft, data: StaticData) {
  const pkg = getTradePackage(draft, data);
  if (!pkg) return { eligible: false, ageEligible: false, formula: null as string | null, values: candidateAttributeValues(draft, data) };
  const profession = data.professions.find((entry) => entry.trade === pkg.trade);
  const values = candidateAttributeValues(draft, data);
  const formula = profession?.candidacy ?? null;
  const eligible = formula === 'Any' || evaluateCandidacy(formula, values);
  const ageRank = data.ageGroups.find((entry) => entry.ageGroup === draft.background.ageGroup)?.rank;
  const ageValue = ageRank == null ? null : getAgeRankValue(ageRank);
  const ageEligible = ageValue != null && ageValue >= pkg.minimumAgeRank;
  return { eligible, ageEligible, formula, values };
}

export function maximumTradeRank(draft: CharacterDraft, data: StaticData) {
  const ageRank = data.ageGroups.find((entry) => entry.ageGroup === draft.background.ageGroup)?.rank;
  if (ageRank == null) return 1;
  return Math.max(1, Math.min(10, getAgeRankValue(ageRank) - 3));
}

export function affinityCandidates(draft: CharacterDraft, data: StaticData): RolledAttribute[] {
  const pkg = getTradePackage(draft, data);
  if (!pkg || draft.intrinsics.attributes.length < ROLLED_ATTRIBUTES.length) return [];
  const critical = pkg.criticalAttributes.filter((attribute): attribute is RolledAttribute =>
    (ROLLED_ATTRIBUTES as readonly string[]).includes(attribute),
  );
  const rolls = critical.map((attribute) => ({
    attribute,
    value: draft.intrinsics.attributes.find((entry) => entry.name === attribute)?.base ?? Number.NEGATIVE_INFINITY,
  }));
  const highest = Math.max(...rolls.map((entry) => entry.value));
  return rolls.filter((entry) => entry.value === highest).map((entry) => entry.attribute);
}

export function directZedAdjustment(draft: CharacterDraft, data: StaticData) {
  const { speciesName, baseline, lineage, age } = selectedRows(draft, data);
  const lineageName = getLineageName(draft, data);
  return (speciesName ? rowAdjustment(baseline, 'ZED') : 0)
    + (lineageName ? rowAdjustment(lineage, 'ZED') : 0)
    + (speciesName && draft.background.ageGroup ? rowAdjustment(age, 'ZED') : 0)
    + packageAdjustment('ZED', draft, data);
}

export function calculateZed(draft: CharacterDraft, data: StaticData) {
  const affinity = draft.intrinsics.affinityAttribute;
  if (!affinity || !affinityCandidates(draft, data).includes(affinity as RolledAttribute)) return null;
  const affinityValue = draft.intrinsics.attributes.find((entry) => entry.name === affinity)?.base;
  if (affinityValue == null) return null;
  return affinityValue + directZedAdjustment(draft, data) + Math.max(0, draft.intrinsics.zedPurchasedIncrease);
}

export function pointBuySpent(draft: CharacterDraft, data: StaticData) {
  if (draft.intrinsics.attributeMethod !== 'point-buy') return null;
  const costs = new Map(data.pointBuyCosts.map((entry) => [entry.value, entry.cost]));
  return ROLLED_ATTRIBUTES.reduce((total, attribute) => {
    const value = draft.intrinsics.attributes.find((entry) => entry.name === attribute)?.base;
    return total + (value == null ? 0 : (costs.get(value) ?? Number.POSITIVE_INFINITY));
  }, 0);
}

export function purchasedAttributeSkillpointCost(draft: CharacterDraft, data: StaticData) {
  return ROLLED_ATTRIBUTES.reduce((sum, attribute) => {
    const record = draft.intrinsics.attributes.find((entry) => entry.name === attribute);
    if (!record) return sum;
    const purchased = getPurchasedAttributeIncrease(attribute, draft);
    if (purchased <= 0) return sum;
    const beforePlayer = record.base + record.adjustments
      .filter((adjustment) => adjustment.source !== 'player')
      .reduce((subtotal, adjustment) => subtotal + adjustment.amount, 0);
    return sum + calculateCreationAttributeSkillpointCost(attribute, beforePlayer, purchased, data);
  }, 0);
}

export function zedPurchaseSkillpointCost(draft: CharacterDraft, data: StaticData) {
  const increase = Math.max(0, draft.intrinsics.zedPurchasedIncrease);
  if (increase === 0) return 0;
  const baseZed = calculateZed({
    ...draft,
    intrinsics: { ...draft.intrinsics, zedPurchasedIncrease: 0 },
  }, data);
  return baseZed == null ? 0 : calculateCreationAttributeSkillpointCost('ZED', baseZed, increase, data);
}

export function selectedSettlementName(draft: CharacterDraft, data: StaticData) {
  const region = data.empires.find((entry) => entry.catalogId === draft.background.regionId);
  if (!region || !draft.background.settlementId) return null;
  const names = Array.from(new Set(data.settlements[region.name as keyof typeof data.settlements] ?? []));
  return names.find(
    (name) => makeCatalogId('settlement', `${region.name}-${name}`) === draft.background.settlementId,
  ) ?? null;
}

export function wealthBreakdown(draft: CharacterDraft, data: StaticData) {
  const heritage = [
    draft.background.culturalHeritageId,
    draft.background.environHeritageId,
    draft.background.societalHeritageId,
  ]
    .map((id) => data.heritagePackages.find((pkg) => pkg.id === id)?.wealth ?? 0)
    .reduce((sum, value) => sum + value, 0);
  const kno = getFinalAttributeValue('KNO', draft);
  const knoDm = kno == null ? 0 : getAttributeDm(kno);
  const settlement = selectedSettlementName(draft, data);
  const citystate = settlement ? data.citystates.find((entry) => entry.name === settlement) : undefined;
  const socialRank = typeof draft.background.socialRank === 'number'
    ? draft.background.socialRank
    : Number(draft.background.socialRank);
  let economy = 0;
  const economyNotes: string[] = [];

  if (Number.isFinite(socialRank) && socialRank >= 1 && citystate?.economicStatus.includes('Impoverished')) {
    economy -= 3;
    economyNotes.push('Impoverished settlement −3');
  }
  if (Number.isFinite(socialRank) && socialRank >= 1 && citystate?.economicStatus.includes('Affluent')) {
    economy += 3;
    economyNotes.push('Affluent settlement +3');
  }
  if (settlement === 'Sarken' && Number.isFinite(socialRank)) {
    const rising = 3 + (socialRank - 4);
    economy += rising;
    economyNotes.push(`Sarken rising-imperial adjustment ${rising >= 0 ? '+' : ''}${rising}`);
  }

  return {
    heritage,
    kno,
    knoDm,
    settlement,
    economicStatus: citystate?.economicStatus ?? null,
    economy,
    economyNotes,
    total: heritage + knoDm + economy,
  };
}

export function wealthTitle(rank: number | null, data: StaticData) {
  if (rank == null) return null;
  for (const entry of data.wealthTitles) {
    const label = entry.rank.trim();
    if (label.startsWith('<')) {
      const upper = Number(label.replace(/\D/g, ''));
      if (rank < upper) return entry.title;
      continue;
    }
    if (label.endsWith('+')) {
      const lower = Number(label.replace(/\D/g, ''));
      if (rank >= lower) return entry.title;
      continue;
    }
    const [lower, upper] = label.split('-').map(Number);
    if (Number.isFinite(lower) && Number.isFinite(upper) && rank >= lower && rank <= upper) return entry.title;
  }
  return null;
}

export function syncIntrinsics(draft: CharacterDraft, data: StaticData): CharacterDraft {
  let next = rebuildAttributeAdjustments(draft, data);
  next = syncIntrinsicGrantedSelections(next, data);

  const affinityOptions = affinityCandidates(next, data);
  if (next.intrinsics.affinityAttribute && !affinityOptions.includes(next.intrinsics.affinityAttribute as RolledAttribute)) {
    next = { ...next, intrinsics: { ...next.intrinsics, affinityAttribute: null, zed: null } };
  }
  if (!next.intrinsics.affinityAttribute && affinityOptions.length === 1) {
    next = { ...next, intrinsics: { ...next.intrinsics, affinityAttribute: affinityOptions[0] } };
  }
  const zed = calculateZed(next, data);
  const hasWealthInputs = Boolean(
    next.background.culturalHeritageId
    && next.background.environHeritageId
    && next.background.societalHeritageId
    && next.background.settlementId
    && getFinalAttributeValue('KNO', next) != null,
  );
  const wealthRank = hasWealthInputs ? wealthBreakdown(next, data).total : null;
  const maxRank = maximumTradeRank(next, data);
  const tradeRank = next.intrinsics.tradeId
    ? Math.max(1, Math.min(next.intrinsics.tradeRank ?? 1, maxRank))
    : null;

  return {
    ...next,
    intrinsics: {
      ...next.intrinsics,
      tradeRank,
      zed,
      wealthRank,
    },
  };
}

export function assessIntrinsicStep(stepValue: string, draft: CharacterDraft, data: StaticData): StepAssessment {
  if (stepValue === 'intrinsics-species') {
    if (!draft.intrinsics.speciesId || !draft.intrinsics.lineageId) {
      return { status: 'incomplete', messages: ['Choose a playable Species and Lineage.'] };
    }
    return { status: 'complete', messages: [] };
  }

  if (stepValue === 'intrinsics-attributes') {
    if (!draft.intrinsics.attributeMethod || draft.intrinsics.attributes.length !== ROLLED_ATTRIBUTES.length) {
      return { status: 'incomplete', messages: ['Generate and assign all nine Attribute Rolls.'] };
    }
    if (draft.intrinsics.attributeMethod === 'point-buy') {
      const values = draft.intrinsics.attributes.map((entry) => entry.base);
      if (values.some((value) => value < 6 || value > 12)) {
        return { status: 'warning', messages: ['Player-character point-buy Attribute Rolls must remain from 6 through 12.'] };
      }
      const spent = pointBuySpent(draft, data);
      if (spent == null || spent > 75) {
        return { status: 'warning', messages: [`Point Buy exceeds the 75-point budget (${spent ?? 0}/75).`] };
      }
    }
    if (totalPurchasedAttributeIncreases(draft) > 4) {
      return { status: 'warning', messages: ['Standard novice creation allows no more than +4 purchased raw Attribute increases total, including ZED.'] };
    }
    return { status: 'complete', messages: [] };
  }

  if (stepValue === 'intrinsics-trade-specialization') {
    const pkg = getTradePackage(draft, data);
    if (!pkg) return { status: 'incomplete', messages: ['Choose a Trade. Merchant remains deferred until its chargen data is complete.'] };
    if (pkg.specializations.length > 0 && !getTradeSpecialization(draft, data)) {
      return { status: 'incomplete', messages: ['Choose a Specialization for this Trade.'] };
    }
    const candidacy = tradeCandidacy(draft, data);
    const messages: string[] = [];
    if (!candidacy.ageEligible) messages.push(`This Trade requires ${pkg.minimumAgeGroup} or older.`);
    if (!candidacy.eligible) messages.push(`Current Species/Lineage-adjusted Attribute Rolls do not satisfy: ${candidacy.formula ?? 'candidacy unavailable'}.`);
    if (messages.length) return { status: 'warning', messages };
    return { status: 'complete', messages: [] };
  }

  if (stepValue === 'intrinsics-zed') {
    if (!getTradePackage(draft, data) || draft.intrinsics.attributes.length !== ROLLED_ATTRIBUTES.length) {
      return { status: 'incomplete', messages: ['Assign Attributes and Trade before establishing Affinity and ZED.'] };
    }
    if (!draft.intrinsics.affinityAttribute || draft.intrinsics.zed == null) {
      return { status: 'incomplete', messages: ['Choose the Affinity Attribute from the tied highest Critical Attribute Rolls.'] };
    }
    if (totalPurchasedAttributeIncreases(draft) > 4) {
      return { status: 'warning', messages: ['Purchased Attribute and ZED increases exceed the standard novice +4 total limit.'] };
    }
    return { status: 'complete', messages: [] };
  }

  if (stepValue === 'intrinsics-wealth') {
    if (draft.intrinsics.wealthRank == null) {
      return { status: 'incomplete', messages: ['Complete Heritage, starting settlement, and KNO before Wealth can be calculated.'] };
    }
    return { status: 'complete', messages: [] };
  }

  return { status: 'incomplete', messages: [] };
}
