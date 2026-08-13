import type { StaticData } from '@/data';
import type { CharacterDraft, SourcedSelection } from '@/lib/character-draft';

export type StepStatus = 'complete' | 'incomplete' | 'warning';

export type StepAssessment = {
  status: StepStatus;
  messages: string[];
};

const BACKGROUND_STEPS = new Set([
  'background-region-settlement',
  'background-demographics',
  'background-age',
  'background-heritage',
  'background-social-rank',
  'background-personality',
  'background-tragedy-seed',
  'background-disabilities',
  'background-belief-worship',
]);

export function isBackgroundStep(stepValue: string): boolean {
  return BACKGROUND_STEPS.has(stepValue);
}

export function assessBackgroundStep(
  stepValue: string,
  draft: CharacterDraft,
  data: StaticData,
): StepAssessment {
  switch (stepValue) {
    case 'background-region-settlement':
      return draft.background.regionId && draft.background.settlementId
        ? { status: 'complete', messages: [] }
        : { status: 'incomplete', messages: ['Choose both a starting region and settlement.'] };

    case 'background-demographics': {
      const missing = [
        !draft.background.sex && 'Sex',
        !draft.background.gender && 'Gender',
        !draft.background.handedness && 'Handedness',
        !draft.background.ageGroup && 'Age Group',
        draft.background.ageYears == null && 'Age',
        draft.background.birthMonth == null && 'Birth Month',
      ].filter(Boolean);
      if (missing.length) return { status: 'incomplete', messages: [`Complete Demographics: ${missing.join(', ')}.`] };
      return { status: 'complete', messages: [
        `${draft.background.sex}; ${draft.background.gender}; ${draft.background.handedness}-handed; ${draft.background.ageGroup} age ${draft.background.ageYears}, month ${draft.background.birthMonth}.`,
      ] };
    }

    case 'background-age':
      if (!draft.background.ageGroup) {
        return { status: 'incomplete', messages: ['Choose an age group.'] };
      }
      if (draft.background.ageYears === null) {
        return {
          status: 'warning',
          messages: ['Age group is established. Exact years may be resolved after Species is chosen.'],
        };
      }
      return { status: 'complete', messages: [] };

    case 'background-heritage':
      return draft.background.culturalHeritageId &&
        draft.background.environHeritageId &&
        draft.background.societalHeritageId
        ? { status: 'complete', messages: [] }
        : {
            status: 'incomplete',
            messages: ['Choose one Culture, one Environs, and one Society Heritage package.'],
          };

    case 'background-social-rank':
      return draft.background.socialRankId
        ? { status: 'complete', messages: [] }
        : { status: 'incomplete', messages: ['Choose a social-rank entry.'] };

    case 'background-personality':
      return draft.background.personality.length > 0
        ? { status: 'complete', messages: [] }
        : { status: 'incomplete', messages: ['Choose at least one personality descriptor.'] };

    case 'background-tragedy-seed':
      return draft.background.tragedySeedId && draft.background.tragedySeedText
        ? { status: 'complete', messages: [] }
        : { status: 'incomplete', messages: ['Choose or generate a resolved tragedy seed.'] };

    case 'background-disabilities': {
      const required = requiredDisabilityCount(draft, data);
      const selected = draft.background.disabilities.length;
      if (selected < required) return { status: 'incomplete', messages: [`Age Group requires ${required} Disad${required === 1 ? '' : 's'}; ${selected} selected.`] };
      if (required > 0 && !draft.background.disabilitiesReviewed) return { status: 'incomplete', messages: ['Review the generated/selected Disabilities and confirm this step.'] };
      return { status: 'complete', messages: [`${selected} Disad${selected === 1 ? '' : 's'} selected; ${required} required by Age Group.`] };
    }

    case 'background-belief-worship': {
      if (!draft.background.beliefId) {
        return { status: 'incomplete', messages: ['Choose a belief.'] };
      }
      const belief = data.beliefs.find((item) => item.catalogId === draft.background.beliefId);
      if (belief?.isDeity && !draft.background.deityId) {
        return { status: 'incomplete', messages: ['Theist characters must choose a deity.'] };
      }
      return { status: 'complete', messages: [] };
    }

    default:
      return { status: 'incomplete', messages: [] };
  }
}

export function ageGroupRank(draft: CharacterDraft, data: StaticData) {
  return data.ageGroups.find((entry) => entry.ageGroup === draft.background.ageGroup)?.rank ?? null;
}

export function requiredDisabilityCount(draft: CharacterDraft, data: StaticData) {
  const row = data.characteristicModifiers.find((entry) => entry.Group === draft.background.ageGroup);
  return Math.max(0, Number(row?.Disads) || 0);
}

export function ageBonusText(draft: CharacterDraft, data: StaticData) {
  const speciesName = (() => {
    for (const family of data.species) {
      const group = family.groups.find((entry) => entry.catalogId === draft.intrinsics.speciesId);
      if (group) return group.name;
    }
    return null;
  })();
  if (!speciesName || !draft.background.ageGroup) return '';
  const rows = (data.ageBrackets as Record<string, Array<{ group: string; bonus: string }>>)[speciesName] ?? [];
  return rows.find((entry) => entry.group === draft.background.ageGroup)?.bonus ?? '';
}

export function formatGrantedCapabilities(items: SourcedSelection[]) {
  return [...items]
    .sort((a, b) => a.name.localeCompare(b.name) || (a.specialization ?? '').localeCompare(b.specialization ?? ''))
    .map((item) => `${item.name.replace(/\s+X$/, '')}${(item.level ?? 1) > 1 ? ` ${item.level}` : ''}${item.specialization ? ` > ${item.specialization}` : ''}`);
}

export function heritagePackagesForDraft(draft: CharacterDraft, data: StaticData) {
  const ids = new Set(
    [
      draft.background.culturalHeritageId,
      draft.background.environHeritageId,
      draft.background.societalHeritageId,
    ].filter((value): value is string => Boolean(value)),
  );
  return data.heritagePackages.filter((pkg) => ids.has(pkg.id));
}

export function heritageWealthAdjustment(draft: CharacterDraft, data: StaticData): number {
  return heritagePackagesForDraft(draft, data).reduce((total, pkg) => total + pkg.wealth, 0);
}

export function buildHeritageGrantedSelections(
  draft: CharacterDraft,
  data: StaticData,
): SourcedSelection[] {
  // Canonical Heritage tables are presented as "Talents from Youth[0]".
  // Each Age Rank above Youth removes one maturity asterisk; any remaining
  // asterisks reduce the granted level one-for-one.  The separate workbook
  // authorCalibration.stars field is intentionally NOT used here.
  const ageRankEntry = data.ageGroups.find((entry) => entry.ageGroup === draft.background.ageGroup)?.rank;
  const parsedAgeRank = Number.parseInt(String(ageRankEntry ?? '0'), 10);
  const effectiveAgeRank = Number.isFinite(parsedAgeRank) ? Math.max(0, parsedAgeRank) : 0;

  return heritagePackagesForDraft(draft, data).flatMap((pkg) =>
    pkg.grants.flatMap((grant, index) => {
      const remainingStars = Math.max(0, Number(grant.maturityStars ?? 0) - effectiveAgeRank);
      const adjustedLevel = Number(grant.level) - remainingStars;
      if (adjustedLevel < 1) return [];
      return [{
        id: `${pkg.id}:${grant.traitId}:${index + 1}`,
        catalogId: data.traits.find((trait) => {
          const base = (value: string) => value.replace(/^\[/, '').replace(/\]$/, '').split(' > ')[0].replace(/\s+X$/, '').trim().toLowerCase();
          return base(trait.trait) === base(grant.trait);
        })?.catalogId,
        name: grant.trait,
        source: 'heritage' as const,
        sourceDetail: `${pkg.kind}: ${pkg.name}${grant.maturityStars ? `; maturity *${grant.maturityStars}` : ''}`,
        level: adjustedLevel,
        specialization: grant.specialization ?? undefined,
      } satisfies SourcedSelection];
    }),
  );
}

export function syncHeritageGrantedSelections(
  draft: CharacterDraft,
  data: StaticData,
): CharacterDraft {
  const nonHeritage = draft.proficiencies.granted.filter((item) => item.source !== 'heritage');
  const heritage = buildHeritageGrantedSelections(draft, data);
  return {
    ...draft,
    proficiencies: {
      ...draft.proficiencies,
      granted: [...nonHeritage, ...heritage],
    },
  };
}
