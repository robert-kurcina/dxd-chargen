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

    case 'background-demographics':
      return {
        status: 'complete',
        messages: ['Fine-grained demographic details are intentionally deferred in the current product scope.'],
      };

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

    case 'background-disabilities':
      return draft.background.disabilitiesReviewed
        ? { status: 'complete', messages: [] }
        : {
            status: 'incomplete',
            messages: ['Review disabilities and either select applicable entries or confirm none.'],
          };

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
  return heritagePackagesForDraft(draft, data).flatMap((pkg) =>
    pkg.grants.map((grant, index) => ({
      id: `${pkg.id}:${grant.traitId}:${index + 1}`,
      catalogId: data.traits.find((trait) => {
        const base = (value: string) => value.replace(/^\[/, '').replace(/\]$/, '').split(' > ')[0].replace(/\s+X$/, '').trim().toLowerCase();
        return base(trait.trait) === base(grant.trait);
      })?.catalogId,
      name: grant.trait,
      source: 'heritage' as const,
      sourceDetail: `${pkg.kind}: ${pkg.name}`,
      level: grant.level,
      specialization: grant.specialization ?? undefined,
    })),
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
