/**
 * Builder-state model for DXD character creation.
 *
 * This is deliberately separate from character-empty.json / character-sample.json.
 * Those files describe the presentation-oriented character sheet. CharacterDraft
 * preserves selections, provenance, and identifiers needed to safely revisit earlier
 * choices and recalculate downstream results.
 */

export type SelectionSource =
  | 'player'
  | 'species'
  | 'lineage'
  | 'heritage'
  | 'trade'
  | 'pml'
  | 'rule'
  | 'gm';

export type SourcedSelection = {
  id: string;
  name: string;
  source: SelectionSource;
  sourceDetail?: string;
  level?: number;
  specialization?: string;
};

export type DraftAttribute = {
  name: string;
  base: number;
  adjustments: Array<{
    amount: number;
    source: SelectionSource;
    sourceDetail: string;
  }>;
};

export type CharacterDraft = {
  schemaVersion: 1;
  updatedAt: string | null;
  completedSteps: string[];
  warnings: Array<{
    step: string;
    code: string;
    message: string;
  }>;
  background: {
    regionId: string | null;
    settlementId: string | null;
    demographicSelections: SourcedSelection[];
    ageGroup: string | null;
    ageYears: number | null;
    culturalHeritageId: string | null;
    environHeritageId: string | null;
    societalHeritageId: string | null;
    socialRank: number | null;
    personality: SourcedSelection[];
    tragedySeedId: string | null;
    disabilities: SourcedSelection[];
    beliefId: string | null;
    deityId: string | null;
  };
  intrinsics: {
    speciesId: string | null;
    lineageId: string | null;
    attributes: DraftAttribute[];
    tradeId: string | null;
    specializationId: string | null;
    tradeRank: number | null;
    zed: number | null;
    wealthRank: number | null;
  };
  proficiencies: {
    pml: number | null;
    granted: SourcedSelection[];
    purchased: SourcedSelection[];
    additionalSkills: SourcedSelection[];
    languages: SourcedSelection[];
  };
  properties: {
    heightInches: number | null;
    weightPounds: number | null;
    calculated: Record<string, number | string>;
  };
  utilities: {
    spells: SourcedSelection[];
    weapons: SourcedSelection[];
    armor: SourcedSelection[];
    equipment: SourcedSelection[];
    magicItems: SourcedSelection[];
    name: string;
    properName: string;
    relationships: SourcedSelection[];
  };
};

export function createEmptyCharacterDraft(): CharacterDraft {
  return {
    schemaVersion: 1,
    updatedAt: null,
    completedSteps: [],
    warnings: [],
    background: {
      regionId: null,
      settlementId: null,
      demographicSelections: [],
      ageGroup: null,
      ageYears: null,
      culturalHeritageId: null,
      environHeritageId: null,
      societalHeritageId: null,
      socialRank: null,
      personality: [],
      tragedySeedId: null,
      disabilities: [],
      beliefId: null,
      deityId: null,
    },
    intrinsics: {
      speciesId: null,
      lineageId: null,
      attributes: [],
      tradeId: null,
      specializationId: null,
      tradeRank: null,
      zed: null,
      wealthRank: null,
    },
    proficiencies: {
      pml: null,
      granted: [],
      purchased: [],
      additionalSkills: [],
      languages: [],
    },
    properties: {
      heightInches: null,
      weightPounds: null,
      calculated: {},
    },
    utilities: {
      spells: [],
      weapons: [],
      armor: [],
      equipment: [],
      magicItems: [],
      name: '',
      properName: '',
      relationships: [],
    },
  };
}
