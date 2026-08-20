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
  /** Number of identical selections when legacy/imported data records a stack. */
  quantity?: number;
  /** Presentation-only instance text for Magic Items, Tomes, Codexes, Scrolls, Jewelry, Gemstones, and designated physical variants. */
  customAppend?: string;
  specialization?: string;
  specializationRanks?: Record<string, number>;
};

export type DraftAttribute = {
  name: string;
  /** Recorded creation roll. For legacy imports this is reconstructed from the immutable Recorded Value. */
  base: number;
  /** Immutable final Attribute value read from a legacy imported sheet. Absent for native Forge characters. */
  recordedValue?: number;
  /** True once the legacy Recorded Roll has been reconstructed from the imported Recorded Value. */
  recordedRollDerived?: boolean;
  adjustments: Array<{
    amount: number;
    source: SelectionSource;
    sourceDetail: string;
  }>;
};

export type ArmorSuitClass = 'Light' | 'Medium' | 'Heavy' | 'Field';

export type ArmorEditorState = {
  /** Preset mode uses a canonical abstract Armor Set quick-pick; custom mode uses sectional detail when the fiction requires it. */
  mode: 'preset' | 'custom';
  /** Canonical preset classification. In custom mode this is derived from coverage plus calculated D/AR and is not user-selected. */
  suitClass: ArmorSuitClass | null;
  /** Canonical quick-pick from which sectional detail was started, retained as provenance/comparison guidance. */
  originPresetCatalogId: string | null;
  /** Field construction is an Armor Set classification condition, not a new Trait keyword. */
  fieldConstruction: boolean;
};

export type InventorySelection = SourcedSelection & {
  quantity: number;
  unitPriceGp: number;
  unitWeight: number;
  /** Legacy source-sheet properties retained only until catalog normalization. */
  sheetProperties?: string;
  /** Cultural provenance displayed with the item on the character sheet. */
  cultural?: string;
  /** Physical SIZ bracket this fitted/scaled item was made for. Standard is SIZ 12. */
  sizedForSiz?: number;
  /** Side occupied by a one-side Sectional Armor component. */
  armorSide?: 'Left' | 'Right';
};

export type LanguageModifier = 'Old High' | 'High' | 'Low' | 'War' | 'Lingo' | 'Barter';

export type LanguageSelection = SourcedSelection & {
  kind: 'default' | 'heritage' | 'proficiency';
  primary: boolean;
  baseLevel: number;
  improvements: number;
  accentRemoved: boolean;
  /** Register/mode prefixes which form compounds such as Old High Coro. */
  modifiers?: LanguageModifier[];
};

export type PmlVirtuosityChoice = {
  milestone: number;
  traitId: string;
  name: string;
};

export type CharacterDraft = {
  schemaVersion: 11;
  /** Stable filesystem/library identity. It is independent of the character name and survives version saves. */
  characterId: string | null;
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
    sex: 'Male' | 'Female' | 'Intersex' | null;
    gender: 'Male' | 'Female' | 'Non-binary' | null;
    geneticallyFemale: boolean;
    handedness: 'Left' | 'Right' | null;
    ageGroup: string | null;
    ageYears: number | null;
    birthMonth: number | null;
    culturalHeritageId: string | null;
    environHeritageId: string | null;
    societalHeritageId: string | null;
    socialRankId: string | null;
    socialRank: number | string | null;
    /** Human-readable social title/honorific paired with the numeric Social Rank. */
    socialRankTitle: string | null;
    personality: SourcedSelection[];
    tragedySeedId: string | null;
    tragedySeedText: string | null;
    disabilities: SourcedSelection[];
    disabilitiesReviewed: boolean;
    beliefId: string | null;
    deityId: string | null;
  };
  intrinsics: {
    speciesFamilyId: string | null;
    speciesId: string | null;
    lineageId: string | null;
    childOfStrife: boolean;
    strifeMixedLineage: boolean;
    strifePairingId: string | null;
    strifeMotherFirst: boolean;
    strifeFatherLineageId: string | null;
    strifeMotherLineageId: string | null;
    strifeAttributeRolls: Record<string, number>;
    strifeBonusParent: 'father' | 'mother' | null;
    attributeMethod: 'roll' | 'array' | 'point-buy' | 'imported' | null;
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
  finances: {
    /** Authoritative current gp when known. Null falls back to Wealth Rank until the first committed purchase. */
    availableGp: number | null;
    /** Purchases committed through the Forge; imported historical spending is not reconstructed. */
    gpSpent: number;
    /** Current-session purchases that become historical when the character is saved/unloaded. */
    pendingSpentGp: number;
  };
  proficiencies: {
    pml: number | null;
    pmlVirtuosityChoices: PmlVirtuosityChoice[];
    grantSpecializations: Record<string, string>;
    grantSpecializationRanks: Record<string, Record<string, number>>;
    granted: SourcedSelection[];
    /** Read-only reference snapshot loaded from an imported character. Never contributes to authored rules output. */
    importedCapabilities: SourcedSelection[];
    /** @deprecated schema <=9 import bucket; migrated into importedCapabilities and kept empty thereafter. */
    purchased?: SourcedSelection[];
    additionalSkills: SourcedSelection[];
    languages: LanguageSelection[];
  };
  properties: {
    stature: number | null;
    build: number | null;
    baseBuild: number | null;
    statureAdjustment: number;
    buildAdjustment: number;
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
    /** Forge-only structured armor editor state. Existing characters may omit this until edited. */
    armorEditor?: ArmorEditorState;
    equipment: InventorySelection[];
    gearReviewed: boolean;
    startingGearTrade?: string | null;
    magicItems: SourcedSelection[];
    magicItemsReviewed: boolean;
    magicItemForms: Record<string, string>;
    nameLanguageId: string | null;
    nameStyle: 'any' | 'masculine' | 'feminine';
    name: string;
    properName: string;
    relationships: SourcedSelection[];
    /** Administrator-defined labels exposed by the Character Library. */
    libraryTags: string[];
    notes: string;
    backstory: string;
    portraitDataUrl: string;
    portraitSourceDataUrl?: string;
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

export function isLegacyImportedCharacter(draft: CharacterDraft) {
  return draft.intrinsics.attributeMethod === 'imported'
    || draft.intrinsics.attributes.some((attribute) => Number.isFinite(attribute.recordedValue));
}

export function createEmptyCharacterDraft(): CharacterDraft {
  return {
    schemaVersion: 11,
    characterId: null,
    updatedAt: null,
    completedSteps: [],
    warnings: [],
    background: {
      // New characters begin in the canonical Eastlands origin. These IDs are
      // deterministic runtime catalogue IDs for Djorkan and Citystate Corom.
      regionId: 'region-djorkan',
      settlementId: 'settlement-djorkan-corom',
      demographicSelections: [],
      sex: null,
      gender: null,
      geneticallyFemale: false,
      handedness: 'Right',
      ageGroup: null,
      ageYears: null,
      birthMonth: null,
      culturalHeritageId: null,
      environHeritageId: null,
      societalHeritageId: null,
      socialRankId: null,
      socialRank: null,
      socialRankTitle: null,
      personality: [],
      tragedySeedId: null,
      tragedySeedText: null,
      disabilities: [],
      disabilitiesReviewed: false,
      beliefId: null,
      deityId: null,
    },
    intrinsics: {
      speciesFamilyId: null,
      speciesId: null,
      lineageId: null,
      childOfStrife: false,
      strifeMixedLineage: false,
      strifePairingId: null,
      strifeMotherFirst: false,
      strifeFatherLineageId: null,
      strifeMotherLineageId: null,
      strifeAttributeRolls: {},
      strifeBonusParent: null,
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
    finances: {
      availableGp: null,
      gpSpent: 0,
      pendingSpentGp: 0,
    },
    proficiencies: {
      pml: null,
      pmlVirtuosityChoices: [],
      grantSpecializations: {},
      grantSpecializationRanks: {},
      granted: [],
      importedCapabilities: [],
      purchased: [],
      additionalSkills: [],
      languages: [],
    },
    properties: {
      stature: null,
      build: null,
      baseBuild: null,
      statureAdjustment: 0,
      buildAdjustment: 0,
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
      armorEditor: { mode: 'preset', suitClass: null, originPresetCatalogId: null, fieldConstruction: false },
      equipment: [],
      gearReviewed: false,
      startingGearTrade: null,
      magicItems: [],
      magicItemsReviewed: false,
      magicItemForms: {},
      nameLanguageId: null,
      nameStyle: 'any',
      name: '',
      properName: '',
      relationships: [],
      libraryTags: [],
      notes: '',
      backstory: '',
      portraitDataUrl: '',
      portraitSourceDataUrl: '',
    },
  };
}


const PROFICIENCY_STEP_ID_MIGRATIONS: Record<string, string> = {
  'proficiencies-skills-abilities-talents': 'proficiencies-granted-skills-traits-talents',
  'proficiencies-additional-skills': 'proficiencies-additional-traits-skills',
};

function normalizeCompletedStepIds(steps: unknown): string[] {
  if (!Array.isArray(steps)) return [];
  return Array.from(new Set(steps.map((step) => PROFICIENCY_STEP_ID_MIGRATIONS[String(step)] ?? String(step))));
}

function normalizeWarningStepIds(
  warnings: CharacterDraft['warnings'] | undefined,
): CharacterDraft['warnings'] {
  if (!Array.isArray(warnings)) return [];
  return warnings.map((warning) => ({
    ...warning,
    step: PROFICIENCY_STEP_ID_MIGRATIONS[warning.step] ?? warning.step,
  }));
}

export function migrateCharacterDraft(value: unknown): CharacterDraft {
  if (!value || typeof value !== 'object') return createEmptyCharacterDraft();

  const candidate = value as { schemaVersion?: number };
  if (candidate.schemaVersion === 11) {
    const current = candidate as CharacterDraft;
    current.utilities.portraitDataUrl ??= '';
    current.utilities.portraitSourceDataUrl ??= '';
    const pending = Math.max(0, Number(current.finances?.pendingSpentGp) || 0);
    const importedCapabilities = Array.isArray(current.proficiencies.importedCapabilities)
      ? current.proficiencies.importedCapabilities
      : Array.isArray(current.proficiencies.purchased) ? current.proficiencies.purchased : [];
    return {
      ...current,
      schemaVersion: 11,
      characterId: typeof current.characterId === 'string' && current.characterId.trim() ? current.characterId.trim() : null,
      completedSteps: normalizeCompletedStepIds(current.completedSteps),
      warnings: normalizeWarningStepIds(current.warnings),
      background: { ...current.background, socialRankTitle: current.background.socialRankTitle ?? null },
      finances: {
        availableGp: Number.isFinite(current.finances?.availableGp) ? Number(current.finances.availableGp) : null,
        gpSpent: Math.max(0, Number(current.finances?.gpSpent) || 0) + pending,
        pendingSpentGp: 0,
      },
      intrinsics: { ...current.intrinsics, strifeMixedLineage: current.intrinsics.strifeMixedLineage ?? false, strifeBonusParent: current.intrinsics.strifeBonusParent ?? null },
      proficiencies: { ...current.proficiencies, importedCapabilities, purchased: [] },
      properties: { ...current.properties, statureAdjustment: current.properties.statureAdjustment ?? 0, buildAdjustment: current.properties.buildAdjustment ?? 0 },
      utilities: {
        ...current.utilities,
        armorEditor: current.utilities.armorEditor ?? { mode: 'preset', suitClass: null, originPresetCatalogId: null, fieldConstruction: false },
        libraryTags: Array.isArray(current.utilities.libraryTags) ? Array.from(new Set(current.utilities.libraryTags.map((tag) => String(tag).trim()).filter(Boolean))) : [],
      },
    };
  }


  if (candidate.schemaVersion === 10) {
    const legacy = candidate as any;
    const imported = legacy.intrinsics?.attributeMethod === 'imported'
      || Boolean(legacy.background?.demographicSelections?.some((entry: any) => entry?.sourceDetail === 'Imported region'))
      || Boolean(legacy.intrinsics?.attributes?.some((attribute: any) => String(attribute?.name).toUpperCase() === 'MOV'));
    const rolledNames = new Set(['CCA', 'RCA', 'REF', 'INT', 'KNO', 'PRE', 'POW', 'STR', 'FOR']);
    return migrateCharacterDraft({
      ...legacy,
      schemaVersion: 11,
      intrinsics: {
        ...legacy.intrinsics,
        attributeMethod: imported ? 'imported' : legacy.intrinsics?.attributeMethod ?? null,
        attributes: Array.isArray(legacy.intrinsics?.attributes)
          ? legacy.intrinsics.attributes.map((attribute: any) => imported && rolledNames.has(String(attribute.name).toUpperCase())
            ? {
                ...attribute,
                recordedValue: Number.isFinite(attribute.recordedValue) ? Number(attribute.recordedValue) : Number(attribute.base),
                recordedRollDerived: Boolean(attribute.recordedRollDerived),
              }
            : attribute)
          : [],
      },
    });
  }

  if (candidate.schemaVersion === 9) {
    const legacy = candidate as any;
    return migrateCharacterDraft({
      ...legacy,
      schemaVersion: 10,
      characterId: legacy.characterId ?? null,
      background: { ...legacy.background, socialRankTitle: legacy.background?.socialRankTitle ?? null },
      proficiencies: {
        ...legacy.proficiencies,
        importedCapabilities: Array.isArray(legacy.proficiencies?.importedCapabilities) ? legacy.proficiencies.importedCapabilities : (legacy.proficiencies?.purchased ?? []),
        purchased: [],
      },
    });
  }

  if (candidate.schemaVersion === 8) {
    const legacy = candidate as any;
    const legacyGold = legacy.properties?.calculated?.gold;
    return migrateCharacterDraft({
      ...legacy,
      schemaVersion: 9,
      finances: {
        availableGp: Number.isFinite(legacyGold) ? Number(legacyGold) : null,
        gpSpent: 0,
        pendingSpentGp: 0,
      },
    });
  }

  if (candidate.schemaVersion === 7) {
    const legacy = candidate as any;
    return migrateCharacterDraft({
      ...legacy,
      schemaVersion: 8,
      intrinsics: {
        ...legacy.intrinsics,
        childOfStrife: false,
        strifeMixedLineage: false,
        strifePairingId: null,
        strifeMotherFirst: false,
        strifeFatherLineageId: null,
        strifeMotherLineageId: null,
        strifeAttributeRolls: {},
        strifeBonusParent: null,
      },
      utilities: { ...legacy.utilities, notes: '', backstory: '' },
    });
  }

  if (candidate.schemaVersion === 6) {
    const legacy = candidate as any;
    return migrateCharacterDraft({
      ...legacy,
      schemaVersion: 7,
      background: {
        ...legacy.background,
        sex: legacy.background.sex ?? null,
        gender: legacy.background.gender ?? null,
        geneticallyFemale: Boolean(legacy.background.geneticallyFemale),
        handedness: legacy.background.handedness ?? null,
        birthMonth: legacy.background.birthMonth ?? null,
      },
      intrinsics: {
        ...legacy.intrinsics,
        speciesFamilyId: legacy.intrinsics.speciesFamilyId ?? null,
      },
      proficiencies: {
        ...legacy.proficiencies,
        grantSpecializationRanks: legacy.proficiencies.grantSpecializationRanks ?? Object.fromEntries(
          Object.entries(legacy.proficiencies.grantSpecializations ?? {}).map(([id, specialization]) => [id, specialization ? { [String(specialization)]: 1 } : {}]),
        ),
      },
      utilities: {
        ...legacy.utilities,
        magicItemForms: legacy.utilities.magicItemForms ?? {},
      },
    });
  }

  if (candidate.schemaVersion === 5) {
    const legacy = candidate as unknown as LegacyCharacterDraftV5;
    const toInventory = (items: SourcedSelection[]): InventorySelection[] => items.map((item) => ({
      ...item, quantity: 1, unitPriceGp: 0, unitWeight: 0,
    }));
    return migrateCharacterDraft({
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
    });
  }

  const upgradeProperties = (legacy: { heightInches: number | null; weightPounds: number | null; calculated: Record<string, number | string> }): CharacterDraft['properties'] => ({
    stature: null,
    build: null,
    baseBuild: null,
    statureAdjustment: 0,
    buildAdjustment: 0,
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
    importedCapabilities: legacy.purchased ?? [],
    purchased: [],
    pmlVirtuosityChoices: [],
    grantSpecializations: {},
    grantSpecializationRanks: {},
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
