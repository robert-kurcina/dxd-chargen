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
  catalogId?: string;
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

export type InventorySelection = SourcedSelection & {
  quantity: number;
  unitPriceGp: number;
  unitWeight: number;
};

export type LanguageSelection = SourcedSelection & {
  kind: 'default' | 'heritage' | 'proficiency';
  primary: boolean;
  baseLevel: number;
  improvements: number;
  accentRemoved: boolean;
};

export type PmlVirtuosityChoice = {
  milestone: number;
  traitId: string;
  name: string;
};

export type CharacterDraft = {
  schemaVersion: 6;
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
    socialRankId: string | null;
    socialRank: number | string | null;
    personality: SourcedSelection[];
    tragedySeedId: string | null;
    tragedySeedText: string | null;
    disabilities: SourcedSelection[];
    disabilitiesReviewed: boolean;
    beliefId: string | null;
    deityId: string | null;
  };
  intrinsics: {
    speciesId: string | null;
    lineageId: string | null;
    attributeMethod: 'roll' | 'array' | 'point-buy' | null;
    attributeArrayId: 'A' | 'B' | 'C' | null;
    attributes: DraftAttribute[];
    tradeId: string | null;
    specializationId: string | null;
    tradeRank: number | null;
    affinityAttribute: string | null;
    zedPurchasedIncrease: number;
    zed: number | null;
    wealthRank: number | null;
  };
  proficiencies: {
    pml: number | null;
    pmlVirtuosityChoices: PmlVirtuosityChoice[];
    grantSpecializations: Record<string, string>;
    granted: SourcedSelection[];
    purchased: SourcedSelection[];
    additionalSkills: SourcedSelection[];
    languages: LanguageSelection[];
  };
  properties: {
    stature: number | null;
    build: number | null;
    baseBuild: number | null;
    weightAdjustment: number;
    heightInches: number | null;
    weightPounds: number | null;
    siz: number | null;
    profile: number | null;
    calculated: Record<string, number | string>;
  };
  utilities: {
    spells: SourcedSelection[];
    spellsReviewed: boolean;
    weapons: InventorySelection[];
    armor: InventorySelection[];
    equipment: InventorySelection[];
    gearReviewed: boolean;
    magicItems: SourcedSelection[];
    magicItemsReviewed: boolean;
    nameLanguageId: string | null;
    nameStyle: 'any' | 'masculine' | 'feminine';
    name: string;
    properName: string;
    relationships: SourcedSelection[];
  };
};

type LegacyProperties = {
  heightInches: number | null;
  weightPounds: number | null;
  calculated: Record<string, number | string>;
};

export type LegacyCharacterDraftV5 = Omit<CharacterDraft, 'schemaVersion' | 'utilities'> & {
  schemaVersion: 5;
  utilities: Omit<CharacterDraft['utilities'], 'spellsReviewed' | 'gearReviewed' | 'magicItemsReviewed' | 'nameLanguageId' | 'nameStyle'> & {
    weapons: SourcedSelection[];
    armor: SourcedSelection[];
    equipment: SourcedSelection[];
  };
};

export type LegacyCharacterDraftV4 = Omit<CharacterDraft, 'schemaVersion' | 'properties'> & {
  schemaVersion: 4;
  properties: LegacyProperties;
};

export type LegacyCharacterDraftV3 = Omit<CharacterDraft, 'schemaVersion' | 'proficiencies' | 'properties'> & {
  schemaVersion: 3;
  properties: LegacyProperties;
  proficiencies: {
    pml: number | null;
    granted: SourcedSelection[];
    purchased: SourcedSelection[];
    additionalSkills: SourcedSelection[];
    languages: SourcedSelection[];
  };
};

export type LegacyCharacterDraftV2 = Omit<LegacyCharacterDraftV3, 'schemaVersion' | 'intrinsics'> & {
  schemaVersion: 2;
  intrinsics: Omit<
    CharacterDraft['intrinsics'],
    'attributeMethod' | 'attributeArrayId' | 'affinityAttribute' | 'zedPurchasedIncrease'
  >;
};

export type LegacyCharacterDraftV1 = Omit<LegacyCharacterDraftV2, 'schemaVersion' | 'background'> & {
  schemaVersion: 1;
  background: Omit<
    CharacterDraft['background'],
    'socialRankId' | 'tragedySeedText' | 'disabilitiesReviewed'
  >;
};

export function createEmptyCharacterDraft(): CharacterDraft {
  return {
    schemaVersion: 6,
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
      socialRankId: null,
      socialRank: null,
      personality: [],
      tragedySeedId: null,
      tragedySeedText: null,
      disabilities: [],
      disabilitiesReviewed: false,
      beliefId: null,
      deityId: null,
    },
    intrinsics: {
      speciesId: null,
      lineageId: null,
      attributeMethod: null,
      attributeArrayId: null,
      attributes: [],
      tradeId: null,
      specializationId: null,
      tradeRank: null,
      affinityAttribute: null,
      zedPurchasedIncrease: 0,
      zed: null,
      wealthRank: null,
    },
    proficiencies: {
      pml: null,
      pmlVirtuosityChoices: [],
      grantSpecializations: {},
      granted: [],
      purchased: [],
      additionalSkills: [],
      languages: [],
    },
    properties: {
      stature: null,
      build: null,
      baseBuild: null,
      weightAdjustment: 0,
      heightInches: null,
      weightPounds: null,
      siz: null,
      profile: null,
      calculated: {},
    },
    utilities: {
      spells: [],
      spellsReviewed: false,
      weapons: [],
      armor: [],
      equipment: [],
      gearReviewed: false,
      magicItems: [],
      magicItemsReviewed: false,
      nameLanguageId: null,
      nameStyle: 'any',
      name: '',
      properName: '',
      relationships: [],
    },
  };
}

export function migrateCharacterDraft(value: unknown): CharacterDraft {
  if (!value || typeof value !== 'object') return createEmptyCharacterDraft();

  const candidate = value as { schemaVersion?: number };
  if (candidate.schemaVersion === 6) return candidate as CharacterDraft;

  if (candidate.schemaVersion === 5) {
    const legacy = candidate as unknown as LegacyCharacterDraftV5;
    const toInventory = (items: SourcedSelection[]): InventorySelection[] => items.map((item) => ({
      ...item, quantity: 1, unitPriceGp: 0, unitWeight: 0,
    }));
    return {
      ...legacy,
      schemaVersion: 6,
      utilities: {
        ...legacy.utilities,
        spellsReviewed: legacy.utilities.spells.length > 0,
        weapons: toInventory(legacy.utilities.weapons),
        armor: toInventory(legacy.utilities.armor),
        equipment: toInventory(legacy.utilities.equipment),
        gearReviewed: legacy.utilities.weapons.length + legacy.utilities.armor.length + legacy.utilities.equipment.length > 0,
        magicItemsReviewed: legacy.utilities.magicItems.length > 0,
        nameLanguageId: null,
        nameStyle: 'any',
      },
    };
  }

  const upgradeProperties = (legacy: { heightInches: number | null; weightPounds: number | null; calculated: Record<string, number | string> }): CharacterDraft['properties'] => ({
    stature: null,
    build: null,
    baseBuild: null,
    weightAdjustment: 0,
    heightInches: legacy.heightInches,
    weightPounds: legacy.weightPounds,
    siz: null,
    profile: null,
    calculated: legacy.calculated ?? {},
  });

  if (candidate.schemaVersion === 4) {
    const legacy = candidate as unknown as LegacyCharacterDraftV4;
    const upgraded = { ...legacy, schemaVersion: 5, properties: upgradeProperties(legacy.properties) } as unknown as LegacyCharacterDraftV5;
    return migrateCharacterDraft(upgraded);
  }

  const upgradeProficiencies = (legacy: {
    pml: number | null;
    granted: SourcedSelection[];
    purchased: SourcedSelection[];
    additionalSkills: SourcedSelection[];
    languages: SourcedSelection[];
  }): CharacterDraft['proficiencies'] => ({
    ...legacy,
    pmlVirtuosityChoices: [],
    grantSpecializations: {},
    languages: legacy.languages.map((language, index) => ({
      ...language,
      kind: index === 0 ? 'default' : index === 1 ? 'heritage' : 'proficiency',
      primary: index === 0,
      baseLevel: language.level ?? 1,
      improvements: 0,
      accentRemoved: false,
    })),
  });

  if (candidate.schemaVersion === 3) {
    const legacy = candidate as unknown as LegacyCharacterDraftV3;
    return migrateCharacterDraft({
      ...legacy,
      schemaVersion: 5,
      proficiencies: upgradeProficiencies(legacy.proficiencies),
      properties: upgradeProperties(legacy.properties),
    } as unknown as LegacyCharacterDraftV5);
  }

  if (candidate.schemaVersion === 2) {
    const legacy = candidate as unknown as LegacyCharacterDraftV2;
    return migrateCharacterDraft({
      ...legacy,
      schemaVersion: 5,
      proficiencies: upgradeProficiencies(legacy.proficiencies),
      properties: upgradeProperties(legacy.properties),
      intrinsics: {
        ...legacy.intrinsics,
        attributeMethod: legacy.intrinsics.attributes.length > 0 ? 'array' : null,
        attributeArrayId: null,
        affinityAttribute: null,
        zedPurchasedIncrease: 0,
      },
    } as unknown as LegacyCharacterDraftV5);
  }

  if (candidate.schemaVersion === 1) {
    const legacy = candidate as unknown as LegacyCharacterDraftV1;
    return migrateCharacterDraft({
      ...legacy,
      schemaVersion: 5,
      proficiencies: upgradeProficiencies(legacy.proficiencies),
      properties: upgradeProperties(legacy.properties),
      background: {
        ...legacy.background,
        socialRankId: null,
        tragedySeedText: null,
        disabilitiesReviewed: legacy.background.disabilities.length > 0,
      },
      intrinsics: {
        ...legacy.intrinsics,
        attributeMethod: legacy.intrinsics.attributes.length > 0 ? 'array' : null,
        attributeArrayId: null,
        affinityAttribute: null,
        zedPurchasedIncrease: 0,
      },
    } as unknown as LegacyCharacterDraftV5);
  }

  return createEmptyCharacterDraft();
}
