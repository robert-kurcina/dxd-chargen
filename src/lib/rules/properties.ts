import type { StaticData } from '@/data';
import type { CharacterDraft, SourcedSelection } from '@/lib/character-draft';
import { getAttributeDm } from '@/lib/character-logic';
import { getFinalAttributeValue, getLineageName, getSpeciesChoice, getTradePackage, getTradeSpecialization, nonPlayerAdjustmentsForAttribute, strifeParents } from './intrinsics';
import type { StepAssessment } from './background';

const PROPERTY_STEPS = new Set(['properties-height-weight', 'properties-calculations']);

export function isPropertyStep(stepValue: string) {
  return PROPERTY_STEPS.has(stepValue);
}

type CharacteristicRow = {
  lineage?: string;
  stature?: number;
  build?: number;
  bodypoints?: number;
};

type AdjustmentLine = { label: string; stature: number; build: number; bodypoints?: number };

function characteristicTable(speciesName: string, data: StaticData): CharacteristicRow[] {
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

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeName(value: string) {
  return value
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(' > ')[0]
    .replace(/\s+X$/, '')
    .trim()
    .toLowerCase();
}

function allSelections(draft: CharacterDraft): SourcedSelection[] {
  return [
    ...draft.proficiencies.granted,
    ...draft.proficiencies.purchased,
    ...draft.proficiencies.additionalSkills,
    ...draft.background.disabilities,
  ];
}

function propertyAttributeValue(name: string, draft: CharacterDraft) {
  const importedFinal = draft.background.demographicSelections.some((entry) => entry.sourceDetail === 'Imported region');
  if (importedFinal) return draft.intrinsics.attributes.find((entry) => entry.name === name)?.base ?? null;
  return getFinalAttributeValue(name, draft);
}

/** Combine duplicate trait sources as highest level +1 per duplicate, capped at 10. */
export function effectiveTraitLevel(draft: CharacterDraft, traitName: string) {
  const key = normalizeName(traitName);
  const importedFinal = draft.background.demographicSelections.some((entry) => entry.sourceDetail === 'Imported region')
    ? draft.proficiencies.purchased.filter((selection) => normalizeName(selection.name) === key)
    : [];
  if (importedFinal.length) return Math.min(10, Math.max(...importedFinal.map((selection) => Math.max(1, selection.level ?? 1))));
  const matches = allSelections(draft).filter((selection) => normalizeName(selection.name) === key);
  if (!matches.length) return 0;
  const levels = matches.map((selection) => Math.max(1, selection.level ?? 1)).sort((a, b) => b - a);
  return Math.min(10, levels[0] + levels.length - 1);
}

function scaleRow(value: number, data: StaticData) {
  const clamped = Math.max(0, Math.min(99, Math.trunc(value)));
  return {
    row: data.physicalScale.find((entry) => entry.value === clamped) ?? data.physicalScale[0],
    clamped: clamped !== Math.trunc(value),
  };
}

export function physicalBreakdown(draft: CharacterDraft, data: StaticData) {
  const species = getSpeciesChoice(draft, data)?.group.name ?? (draft.intrinsics.childOfStrife ? strifeParents(draft)?.fatherGroup : null) ?? null;
  const lineageName = getLineageName(draft, data);
  if (!species) return null;
  const table = characteristicTable(species, data);
  const baseline = table.find((row) => row.lineage === 'BASE-LINE');
  const lineage = lineageName ? table.find((row) => row.lineage === lineageName) : undefined;
  const physicalAgeRank = data.ageGroups.find((row) => row.ageGroup === draft.background.ageGroup)?.rank;
  const adultOrOlder = physicalAgeRank != null && /^\d+$/.test(physicalAgeRank) && Number(physicalAgeRank) >= 4;
  const female = draft.background.geneticallyFemale && adultOrOlder ? table.find((row) => row.lineage === 'female') : undefined;
  if (!baseline) return null;

  const age = data.characteristicModifiers.find((row) => row.Group === draft.background.ageGroup);
  const trade = getTradePackage(draft, data);
  const specialization = getTradeSpecialization(draft, data);
  const fort = propertyAttributeValue('FOR', draft);
  if (fort == null) return null;

  const lines: AdjustmentLine[] = [
    { label: `${species} baseline`, stature: num(baseline.stature), build: num(baseline.build), bodypoints: num(baseline.bodypoints) },
  ];
  if (lineageName && lineage) lines.push({ label: `${lineageName} lineage`, stature: num(lineage.stature), build: num(lineage.build), bodypoints: num(lineage.bodypoints) });
  if (female) lines.push({ label: 'Genetically Female', stature: num(female.stature), build: num(female.build), bodypoints: num(female.bodypoints) });
  if (age) lines.push({ label: `${age.Group} Age Group`, stature: num(age.Stature), build: num(age.Build), bodypoints: num(age.Bodypoints) });
  if (trade) lines.push({ label: `${trade.trade} Trade`, stature: num(trade.adjustments.stature), build: num(trade.adjustments.build), bodypoints: num(trade.adjustments.bodypoints) });
  if (trade && specialization) lines.push({ label: `${trade.trade} — ${specialization.name}`, stature: num(specialization.adjustments.stature), build: num(specialization.adjustments.build), bodypoints: num(specialization.adjustments.bodypoints) });

  // Stature starts from Species Stature; Species Build is applied only after final Stature becomes Build's base.
  const statureAdjustment = Math.max(-2, Math.min(2, Math.trunc(draft.properties.statureAdjustment ?? 0)));
  const buildAdjustment = Math.max(-2, Math.min(2, Math.trunc(draft.properties.buildAdjustment ?? 0)));
  const finalStature = Math.trunc(
    num(baseline.stature)
    + num(lineage?.stature)
    + num(female?.stature)
    + num(age?.Stature)
    + num(trade?.adjustments.stature)
    + num(specialization?.adjustments.stature)
    + statureAdjustment
  );

  const brawn = effectiveTraitLevel(draft, 'Brawn');
  const baseBuild = Math.trunc(
    finalStature
    + num(baseline.build)
    + num(lineage?.build)
    + num(female?.build)
    + num(age?.Build)
    + num(trade?.adjustments.build)
    + num(specialization?.adjustments.build)
    + getAttributeDm(fort)
    + brawn
    + buildAdjustment
  );
  const weightAdjustment = Math.max(-9, Math.min(9, Math.trunc(draft.properties.weightAdjustment ?? 0)));
  const build = baseBuild + weightAdjustment;
  const statureScale = scaleRow(finalStature, data);
  const buildScale = scaleRow(build, data);
  const bodyBuildScale = scaleRow(weightAdjustment > 0 ? baseBuild : build, data);
  const bodyAdjustment = num(baseline.bodypoints)
    + num(lineage?.bodypoints)
    + num(female?.bodypoints)
    + num(age?.Bodypoints)
    + num(trade?.adjustments.bodypoints)
    + num(specialization?.adjustments.bodypoints);

  return {
    species,
    lineageName,
    lines,
    finalStature,
    baseBuild,
    build,
    weightAdjustment,
    statureAdjustment,
    buildAdjustment,
    height: statureScale.row.height,
    heightInches: statureScale.row.heightInches,
    weightPounds: buildScale.row.weightPounds,
    siz: buildScale.row.siz,
    bodySiz: bodyBuildScale.row.siz,
    bodyAdjustment,
    bodypoints: Math.max(1, bodyBuildScale.row.siz + bodyAdjustment),
    profile: Math.trunc((finalStature + build) / 2),
    clamped: statureScale.clamped || buildScale.clamped || bodyBuildScale.clamped,
    brawn,
  };
}

function scalar(index: number, data: StaticData) {
  const direct = data.universalTable.find((entry) => entry.Index === Math.trunc(index))?.Scalar;
  if (direct) return direct;
  return String(index);
}

function scalarNumber(index: number, data: StaticData) {
  const text = scalar(index, data).replace(/\s+/g, '').toUpperCase();
  const m = text.match(/^(-?\d+(?:\.\d+)?)([KMG])?$/);
  if (!m) return 0;
  const multiplier = m[2] === 'K' ? 1e3 : m[2] === 'M' ? 1e6 : m[2] === 'G' ? 1e9 : 1;
  return Number(m[1]) * multiplier;
}

export function calculateProperties(draft: CharacterDraft, data: StaticData) {
  const physical = physicalBreakdown(draft, data);
  if (!physical) return null;
  const attr = (name: string) => propertyAttributeValue(name, draft) ?? 0;
  const dm = (name: string) => getAttributeDm(attr(name));
  const pml = Math.max(1, draft.proficiencies.pml ?? 1);
  const allometricSpeciesName = getSpeciesChoice(draft, data)?.group.name;
  const allometricSpeciesBuild = (() => {
    if (!allometricSpeciesName) return 50;
    const baseline = characteristicTable(allometricSpeciesName, data).find((row) => row.lineage === 'BASE-LINE');
    return num(baseline?.stature) + num(baseline?.build);
  })();
  const speciesSiz = scaleRow(allometricSpeciesBuild, data).row.siz;
  // Page 114 provides canonical species SIZ bands for playable Sophonts. Use
  // those named bands where established; the scalar formula remains a fallback
  // for species not listed in the reference table.
  const canonicalAllometricBySpecies: Record<string, number> = {
    Human: 0, Alef: 0,
    Drauf: 1, Babbita: 1,
    Klenari: 2, Gnoan: 2, Kriket: 2,
    Stonefolk: -1,
  };
  const allometric = allometricSpeciesName && allometricSpeciesName in canonicalAllometricBySpecies
    ? canonicalAllometricBySpecies[allometricSpeciesName]
    : Math.floor((13 - speciesSiz) / 3);
  const brawn = physical.brawn;
  const thrower = effectiveTraitLevel(draft, 'Thrower');
  const leap = effectiveTraitLevel(draft, 'Leap');
  const sprint = effectiveTraitLevel(draft, 'Sprint');
  const athletics = effectiveTraitLevel(draft, 'Athletics');
  const focused = effectiveTraitLevel(draft, 'v-Focused');
  const affliction = effectiveTraitLevel(draft, 'Affliction');
  const prissy = effectiveTraitLevel(draft, 'Prissy');
  const zucked = effectiveTraitLevel(draft, 'Zucked');
  const deity = effectiveTraitLevel(draft, 'Deity');
  const regenerate = effectiveTraitLevel(draft, 'v-Regenerate');
  const robust = effectiveTraitLevel(draft, 'Robust');

  const siz = physical.siz;
  const adjMov = dm('STR') + dm('REF') - getAttributeDm(siz);
  const walk = Math.trunc(physical.finalStature / 20 + 5 + adjMov / 4);
  const jog = walk + 3;
  const runBase = Math.trunc(jog + 3 + adjMov / 2);
  const importedMov = draft.background.demographicSelections.some((entry) => entry.sourceDetail === 'Imported region')
    ? draft.intrinsics.attributes.find((entry) => entry.name === 'MOV')?.base
    : null;
  const directMovAdjustment = importedMov != null
    ? importedMov - runBase
    : nonPlayerAdjustmentsForAttribute('MOV', draft, data)
      .reduce((total, adjustment) => total + adjustment.amount, 0);
  const run = runBase + directMovAdjustment + sprint;
  const mov = run;
  const movDm = getAttributeDm(mov);

  const lob = Math.trunc(attr('STR') - 15 + brawn / 2 + thrower / 2);
  const pitch = Math.trunc(attr('STR') - 12 + brawn / 2 + thrower / 2);
  const hurl = Math.trunc(attr('STR') + siz - 12 + brawn / 2 + thrower / 2);

  const physicality = Math.max(attr('STR'), siz);
  const lift = Math.trunc(siz + attr('STR') / 2 - 9) + allometric + brawn;
  const shoulder = physicality - 9 + allometric + brawn;
  const carry = Math.min(attr('STR'), physicality - 9) - 3 + allometric + brawn;
  const maxEffortBonus = 5 + dm('FOR');

  const upward = Math.max(attr('STR') - siz - 6, mov - 24) + allometric + leap;
  const broad = Math.trunc(upward + physical.finalStature / 10);
  const downward = Math.max(mov - 12, upward + 3);

  const hitpoints = Math.max(1, 10 + dm('REF') + dm('POW') + dm('PRE') + movDm + pml * 3);
  const recovery = Math.max(1, Math.trunc(3 + dm('POW') + dm('FOR') + siz / 5 + pml / 3));
  const ageRank = data.ageGroups.find((row) => row.ageGroup === draft.background.ageGroup)?.rank;
  const femaleConcernBonus = draft.background.geneticallyFemale && Number(ageRank) >= 1 ? 1 : 0;
  const endurance = Math.max(1, Math.trunc(3 + attr('FOR') + pml / 2) + athletics + sprint - affliction - prissy + femaleConcernBonus);
  const resilienceAge = num(data.characteristicModifiers.find((row) => row.Group === draft.background.ageGroup)?.Resilience);
  const resilience = Math.max(1, Math.trunc(3 + (2 * attr('POW')) / 3 + pml / 2) + focused + resilienceAge + femaleConcernBonus);
  const resistance = Math.max(1, Math.trunc(3 + (4 * siz) / 3 + pml / 2) - zucked);
  const manapool = Math.max(0, (draft.intrinsics.zed ?? 0) + getAttributeDm(siz) - zucked);
  const cellburn = Math.max(1, dm('PRE') + dm('KNO') + dm('POW'));
  const favorDice = Math.max(0, pml + deity);
  const maxAdvantage = Math.max(1, 1 + Math.trunc((pml - 1) / 3));
  const gaspTurns = attr('FOR') - 10;
  const sleepHours = attr('FOR') - 5;
  const gaspTurnsScalar = scalar(gaspTurns, data);
  const sleepHoursScalar = scalar(sleepHours, data);

  return {
    ...physical,
    allometric,
    speciesSiz,
    hitpoints,
    bodypoints: physical.bodypoints,
    recovery,
    physicality,
    gaspTurns,
    sleepHours,
    gaspTurnsScalar,
    sleepHoursScalar,
    maxAdvantage,
    endurance,
    resilience,
    resistance,
    favorDice,
    manapool,
    cellburn,
    walk, jog, run, mov, adjMov, directMovAdjustment,
    agilityFeet: scalarNumber(mov, data) / 10,
    runMph: scalar(mov - 12, data),
    lob, pitch, hurl,
    lift, shoulder, carry,
    maxLift: lift + maxEffortBonus,
    maxShoulder: shoulder + maxEffortBonus,
    maxCarry: carry + maxEffortBonus,
    upward, broad, downward,
    runningUpward: upward + 2,
    runningBroad: broad + 3,
    meleeAttackDm: dm('CCA'),
    meleeDefendDm: dm('CCA'),
    rangeAttackDm: dm('RCA'),
    rangeDefendDm: dm('REF'),
    hastyActions: Math.max(0, Math.trunc(dm('REF') / 3)),
    attentiveRegenerationBonus: regenerate > 0 ? pml * regenerate : 0,
    robustRecoveryBonus: robust,
    dms: { CCA: dm('CCA'), RCA: dm('RCA'), REF: dm('REF'), INT: dm('INT'), KNO: dm('KNO'), PRE: dm('PRE'), POW: dm('POW'), STR: dm('STR'), FOR: dm('FOR'), SIZ: getAttributeDm(siz), MOV: movDm },
    traitAdjustments: { brawn, thrower, leap, sprint, athletics, focused, affliction, prissy, zucked, deity, regenerate, robust },
    scalars: {
      lob: scalar(lob, data), pitch: scalar(pitch, data), hurl: scalar(hurl, data),
      lift: scalar(lift, data), shoulder: scalar(shoulder, data), carry: scalar(carry, data),
      maxLift: scalar(lift + maxEffortBonus, data), maxShoulder: scalar(shoulder + maxEffortBonus, data), maxCarry: scalar(carry + maxEffortBonus, data),
      walk: scalar(walk, data), jog: scalar(jog, data), run: scalar(run, data),
      upward: scalar(upward, data), broad: scalar(broad, data), downward: scalar(downward, data),
    },
  };
}

export function syncProperties(draft: CharacterDraft, data: StaticData): CharacterDraft {
  const completedImport = draft.completedSteps.includes('properties-calculations')
    && draft.background.demographicSelections.some((entry) => entry.sourceDetail === 'Imported region')
    && draft.properties.stature != null
    && draft.properties.build != null
    && draft.properties.heightInches != null
    && draft.properties.weightPounds != null
    && draft.properties.siz != null
    && Object.keys(draft.properties.calculated).length > 0;
  // Imported sheets already contain the final, canonical physique and derived
  // scores. Replaying newer Forge rules would double-apply parts of their legacy
  // build (for example Brawn) and inflate SIZ/weight.
  if (completedImport) return draft;
  const result = calculateProperties(draft, data);
  if (!result) {
    // A loaded, completed sheet may contain authoritative calculated values from
    // the legacy character creator even when its historical species/heritage IDs
    // cannot be replayed by the current Forge catalogues. Do not erase those
    // persisted values merely because modern recalculation is unavailable.
    if (draft.completedSteps.includes('properties-calculations') && Object.keys(draft.properties.calculated).length > 0) return draft;
    return {
      ...draft,
      properties: {
        ...draft.properties,
        stature: null,
        build: null,
        baseBuild: null,
        heightInches: null,
        weightPounds: null,
        siz: null,
        profile: null,
        calculated: {},
      },
    };
  }
  const calculated: Record<string, number | string> = {
    Hitpoints: result.hitpoints, Bodypoints: result.bodypoints, Recovery: result.recovery,
    Physicality: result.physicality, GaspLimitTurns: result.gaspTurns, SleepLimitHours: result.sleepHours,
    MaxAdvantage: result.maxAdvantage, Endurance: result.endurance, Resilience: result.resilience, Resistance: result.resistance,
    FavorDice: result.favorDice, Manapool: result.manapool, Cellburn: result.cellburn,
    MOV: result.mov, Walk: result.walk, Jog: result.jog, Run: result.run,
    Lob: result.lob, Pitch: result.pitch, Hurl: result.hurl,
    Lift: result.lift, Shoulder: result.shoulder, Carry: result.carry,
    Upward: result.upward, Broad: result.broad, Downward: result.downward,
    HastyActions: result.hastyActions, MeleeAttack: result.meleeAttackDm, MeleeDefend: result.meleeDefendDm,
    RangeAttack: result.rangeAttackDm, RangeDefend: result.rangeDefendDm,
  };
  return {
    ...draft,
    properties: {
      ...draft.properties,
      stature: result.finalStature,
      build: result.build,
      baseBuild: result.baseBuild,
      heightInches: result.heightInches,
      weightPounds: result.weightPounds,
      siz: result.siz,
      profile: result.profile,
      calculated,
    },
  };
}

export function setWeightAdjustment(draft: CharacterDraft, value: number) {
  return {
    ...draft,
    properties: {
      ...draft.properties,
      weightAdjustment: Math.max(-9, Math.min(9, Math.trunc(value))),
    },
  };
}

export function setBodyFrameAdjustment(draft: CharacterDraft, kind: 'stature' | 'build', value: number) {
  const adjusted = Math.max(-2, Math.min(2, Math.trunc(value)));
  return {
    ...draft,
    properties: {
      ...draft.properties,
      [kind === 'stature' ? 'statureAdjustment' : 'buildAdjustment']: adjusted,
    },
  };
}

export function assessPropertyStep(stepValue: string, draft: CharacterDraft, data: StaticData): StepAssessment {
  const result = calculateProperties(draft, data);
  if (!result) return { status: 'incomplete', messages: ['Complete Species, Age, Attributes, Trade, and Proficiencies before calculating physical properties.'] };
  if (stepValue === 'properties-height-weight') {
    const messages: string[] = [];
    if (result.clamped) messages.push('A Stature or Build value falls outside the current 0–99 physical lookup table and was clamped for display.');
    if (result.weightAdjustment > 0) messages.push(`Overweight ${result.weightAdjustment}: Bodypoints use pre-Overweight Build as required by the creation rule.`);
    if (result.weightAdjustment < 0) messages.push(`Underweight ${Math.abs(result.weightAdjustment)} is recorded as a Build adjustment.`);
    // Sturdy has no Stature or Build adjustment. Tall remains unresolved until
    // its canonical numeric physical adjustment is represented in static data.
    const unresolvedPhysicalTraits = ['Tall'].filter((trait) => effectiveTraitLevel(draft, trait) > 0);
    if (unresolvedPhysicalTraits.length) {
      messages.push(`${unresolvedPhysicalTraits.join(' / ')} is present, but the current structured sources do not specify its numeric Stature/Build adjustment. Review that physical adjustment manually.`);
    }
    return { status: messages.length ? 'warning' : 'complete', messages };
  }
  if (stepValue === 'properties-calculations') return { status: 'complete', messages: [] };
  return { status: 'incomplete', messages: [] };
}
