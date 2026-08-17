import type { StaticData } from '@/data';
import type { ArmorEditorState, ArmorSuitClass, CharacterDraft, InventorySelection } from '@/lib/character-draft';
import { adjustedGearValues, addInventoryItem, displayInventoryName, gearSizeAdjustment, setInventoryQuantity } from './utilities';

export type ArmorKind = 'sectional' | 'gear' | 'shield' | 'helmet' | 'set' | 'other';

type ArmorItem = StaticData['itemArmors'][number];

const CLASS_ORDER: ArmorSuitClass[] = ['Light', 'Medium', 'Heavy', 'Field'];

export function armorKind(item: ArmorItem): ArmorKind {
  return (item.armorKind ?? 'other') as ArmorKind;
}


export type ArmorSide = 'Left' | 'Right';
export type ArmorAtom = string;

export type ArmorDecompositionSuggestion = {
  id: string;
  label: string;
  description: string;
  components: Array<{ name: string; side?: ArmorSide }>;
};

const ARMOR_DECOMPOSITION_SUGGESTIONS: Record<string, ArmorDecompositionSuggestion[]> = {
  'Armor Set, Light (Soft)': [
    { id: 'light-soft-quilted', label: 'Quilted torso', description: 'Default Soft interpretation: a quilted full-torso jacket.', components: [{ name: 'Jacket, Quilted' }] },
    { id: 'light-soft-padded', label: 'Padded torso', description: 'A thicker padded full-torso construction in the Soft material family.', components: [{ name: 'Jacket, Padded' }] },
    { id: 'light-soft-fur', label: 'Fur torso', description: 'A fur full-torso construction in the Soft material family.', components: [{ name: 'Jacket, Fur' }] },
  ],
  'Armor Set, Light (Boiled)': [
    {
      id: 'light-boiled-jacket-sleeves', label: 'Boiled jacket + sleeves',
      description: 'A boiled-hide torso jacket with separate left and right sleeves.',
      components: [{ name: 'Jacket, Boiled' }, { name: 'Sleeve, Boiled × 1', side: 'Left' }, { name: 'Sleeve, Boiled × 1', side: 'Right' }],
    },
  ],
  'Armor Set, Medium (Reinforced)': [
    {
      id: 'medium-reinforced-jacket-sleeves', label: 'Reinforced jacket + sleeves',
      description: 'A reinforced full-torso jacket with separate reinforced sleeves.',
      components: [{ name: 'Jacket, Reinforced' }, { name: 'Sleeve, Reinforced × 1', side: 'Left' }, { name: 'Sleeve, Reinforced × 1', side: 'Right' }],
    },
  ],
  'Armor Set, Medium (Mail)': [
    {
      id: 'medium-mail-brigandine-sleeves', label: 'Mail torso + sleeves',
      description: 'A mail torso with separate left and right mail sleeves.',
      components: [{ name: 'Brigandine, Mail' }, { name: 'Sleeve, Mail × 1', side: 'Left' }, { name: 'Sleeve, Mail × 1', side: 'Right' }],
    },
  ],
  'Armor Set, Heavy (Reinforced + Plate)': [
    {
      id: 'heavy-reinforced-plate', label: 'Plate torso + reinforced limbs',
      description: 'A plate cuirass with reinforced sleeves and leggings. Components occupy distinct body regions.',
      components: [{ name: 'Cuirass, Metal' }, { name: 'Sleeve, Reinforced × 1', side: 'Left' }, { name: 'Sleeve, Reinforced × 1', side: 'Right' }, { name: 'Leggings, Reinforced' }],
    },
  ],
  'Armor Set, Heavy (Mail + Plate)': [
    {
      id: 'heavy-mail-plate', label: 'Plate torso + mail limbs',
      description: 'A plate cuirass with mail sleeves and leggings. Components occupy distinct body regions.',
      components: [{ name: 'Cuirass, Metal' }, { name: 'Sleeve, Mail × 1', side: 'Left' }, { name: 'Sleeve, Mail × 1', side: 'Right' }, { name: 'Leggings, Mail' }],
    },
  ],
  'Armor Set, Field (Plate)': [
    {
      id: 'field-plate-articulated', label: 'Articulated plate core',
      description: 'A non-overlapping plate core: cuirass, shoulder pieces, articulated sleeves, leggings, and sollerets. Fine joint and hand coverage can be described when the fiction requires it.',
      components: [
        { name: 'Cuirass, Metal' },
        { name: 'Pauldron, Metal × 1', side: 'Left' }, { name: 'Pauldron, Metal × 1', side: 'Right' },
        { name: 'Sleeve, Metal × 1', side: 'Left' }, { name: 'Sleeve, Metal × 1', side: 'Right' },
        { name: 'Leggings, Metal' }, { name: 'Sollerets, Metal' },
      ],
    },
  ],
};

export function armorDecompositionSuggestions(presetName: string | null | undefined) {
  return presetName ? ARMOR_DECOMPOSITION_SUGGESTIONS[presetName] ?? [] : [];
}

export function armorDecompositionConflict(
  draft: CharacterDraft,
  presetCatalogId: string,
  suggestionId: string,
  data: StaticData,
) {
  const preset = data.itemArmors.find((item) => item.catalogId === presetCatalogId && armorKind(item) === 'set');
  if (!preset) return { reason: 'Unknown Armor Set.', atoms: [] as string[], withName: null as string | null };
  const suggestion = armorDecompositionSuggestions(preset.name).find((entry) => entry.id === suggestionId);
  if (!suggestion) return { reason: 'Unknown decomposition.', atoms: [] as string[], withName: null as string | null };
  let test = removeArmorKinds(draft, data, ['set', 'sectional']);
  for (const component of suggestion.components) {
    const definition = data.itemArmors.find((item) => item.name === component.name && armorKind(item) === 'sectional');
    if (!definition) return { reason: `Missing component ${component.name}.`, atoms: [] as string[], withName: null as string | null };
    const conflict = armorCandidateConflict(test, data, definition, component.side);
    if (conflict) return conflict;
    test = appendSectionalSelection(test, definition, component.side);
  }
  return null;
}

export function applyArmorDecomposition(
  draft: CharacterDraft,
  presetCatalogId: string,
  suggestionId: string,
  data: StaticData,
) {
  const preset = data.itemArmors.find((item) => item.catalogId === presetCatalogId && armorKind(item) === 'set');
  if (!preset) return draft;
  const suggestion = armorDecompositionSuggestions(preset.name).find((entry) => entry.id === suggestionId);
  if (!suggestion) return draft;

  let next = removeArmorKinds(draft, data, ['set', 'sectional']);
  next = withArmorEditor(next, {
    mode: 'custom',
    suitClass: null,
    originPresetCatalogId: presetCatalogId,
    fieldConstruction: preset.suitClass === 'Field',
  });
  for (const component of suggestion.components) {
    const definition = data.itemArmors.find((item) => item.name === component.name && armorKind(item) === 'sectional');
    if (!definition) continue;
    next = addArmorComponent(next, definition.catalogId, data, component.side);
  }
  return next;
}

export function armorItemsByKind(data: StaticData, kind: ArmorKind) {
  return data.itemArmors.filter((item) => armorKind(item) === kind);
}

export function selectedArmorDefinition(selection: InventorySelection, data: StaticData) {
  return data.itemArmors.find((item) => item.catalogId === selection.catalogId)
    ?? data.itemArmors.find((item) => item.name.localeCompare(selection.name, undefined, { sensitivity: 'base' }) === 0)
    ?? null;
}

export function selectedArmorByKind(draft: CharacterDraft, data: StaticData, kind: ArmorKind) {
  return draft.utilities.armor.filter((selection) => {
    const definition = selectedArmorDefinition(selection, data);
    return definition ? armorKind(definition) === kind : false;
  });
}

export function inferredArmorEditorState(draft: CharacterDraft, data: StaticData): ArmorEditorState {
  const stored = draft.utilities.armorEditor;
  if (stored?.mode === 'custom') {
    return {
      ...stored,
      // Custom Armor capability is derived from coverage and calculated protection.
      // Preserve the field-construction flag and origin only; ignore legacy requested classes.
      suitClass: null,
    };
  }
  const preset = selectedArmorByKind(draft, data, 'set')[0];
  const presetDef = preset ? selectedArmorDefinition(preset, data) : null;
  if (presetDef?.suitClass) {
    return {
      mode: 'preset',
      suitClass: presetDef.suitClass as ArmorSuitClass,
      originPresetCatalogId: presetDef.catalogId,
      fieldConstruction: presetDef.suitClass === 'Field',
    };
  }
  if (stored) return stored;
  return {
    mode: selectedArmorByKind(draft, data, 'sectional').length ? 'custom' : 'preset',
    suitClass: null,
    originPresetCatalogId: null,
    fieldConstruction: false,
  };
}

function withArmorEditor(draft: CharacterDraft, armorEditor: ArmorEditorState) {
  return { ...draft, utilities: { ...draft.utilities, armorEditor } };
}

function removeArmorKinds(draft: CharacterDraft, data: StaticData, kinds: ArmorKind[]) {
  const kindSet = new Set(kinds);
  return {
    ...draft,
    utilities: {
      ...draft.utilities,
      armor: draft.utilities.armor.filter((selection) => {
        const definition = selectedArmorDefinition(selection, data);
        return !definition || !kindSet.has(armorKind(definition));
      }),
    },
  };
}

/** Pick one canonical Armor Set. The set is an abstract quick-pick, not a mandatory sectional recipe. */
export function pickArmorSet(draft: CharacterDraft, catalogId: string | null, data: StaticData) {
  let next = removeArmorKinds(draft, data, ['set', 'sectional']);
  if (!catalogId) {
    return withArmorEditor(next, { mode: 'preset', suitClass: null, originPresetCatalogId: null, fieldConstruction: false });
  }
  const definition = data.itemArmors.find((item) => item.catalogId === catalogId && armorKind(item) === 'set');
  if (!definition) return draft;
  next = addInventoryItem(next, 'armor', catalogId, data);
  return withArmorEditor(next, {
    mode: 'preset',
    suitClass: (definition.suitClass ?? null) as ArmorSuitClass | null,
    originPresetCatalogId: catalogId,
    fieldConstruction: definition.suitClass === 'Field',
  });
}

const ALLOWED_OVERLAP_ATOMS = new Set(['Elbow (Left)', 'Elbow (Right)', 'Knee (Left)', 'Knee (Right)']);
const ARM_CORE_ATOMS = ['Upper Arm', 'Elbow', 'Forearm'] as const;
const LEG_CORE_ATOMS = ['Thigh', 'Knee', 'Shin'] as const;
const FRONT_TORSO_ATOMS = ['Upper Chest', 'Chest', 'Abdomen'] as const;
const BACK_TORSO_ATOMS = ['Upper Back', 'Lower Back'] as const;

export function armorRequiresSide(item: ArmorItem) {
  return item.sideRequired === true;
}

export function armorItemCoverageAtoms(item: ArmorItem, side?: ArmorSide): ArmorAtom[] {
  const atoms = (item.coverageAtoms ?? []) as readonly string[];
  if (!armorRequiresSide(item)) return [...atoms];
  if (!side) return [];
  return atoms.map((atom) => `${atom} (${side})`);
}

export function armorSelectionCoverageAtoms(selection: InventorySelection, item: ArmorItem): ArmorAtom[] {
  if (!armorRequiresSide(item)) return armorItemCoverageAtoms(item);
  if (selection.armorSide) return armorItemCoverageAtoms(item, selection.armorSide);
  // Legacy v125/v126 decompositions sometimes stored two one-side pieces as quantity 2.
  if ((selection.quantity ?? 1) >= 2) return [...armorItemCoverageAtoms(item, 'Left'), ...armorItemCoverageAtoms(item, 'Right')];
  return [];
}

function occupancyRows(draft: CharacterDraft, data: StaticData, excludeSelectionId?: string) {
  return draft.utilities.armor.flatMap((selection) => {
    if (selection.id === excludeSelectionId) return [];
    const definition = selectedArmorDefinition(selection, data);
    if (!definition || !['sectional', 'helmet'].includes(armorKind(definition))) return [];
    const atoms = armorSelectionCoverageAtoms(selection, definition);
    return [{ selection, definition, atoms }];
  });
}

function conflictingAtoms(a: readonly string[], b: readonly string[]) {
  const bSet = new Set(b);
  return a.filter((atom) => bSet.has(atom) && !ALLOWED_OVERLAP_ATOMS.has(atom));
}

export function armorCandidateConflict(
  draft: CharacterDraft,
  data: StaticData,
  candidate: ArmorItem,
  side?: ArmorSide,
  excludeSelectionId?: string,
) {
  if (!['sectional', 'helmet'].includes(armorKind(candidate))) return null;
  const atoms = armorItemCoverageAtoms(candidate, side);
  if (armorRequiresSide(candidate) && !side) return { reason: 'Choose Left or Right.', atoms: [] as string[], withName: null as string | null };
  for (const row of occupancyRows(draft, data, excludeSelectionId)) {
    const overlap = conflictingAtoms(atoms, row.atoms);
    if (overlap.length) return { reason: `Overlaps ${displayInventoryName(row.definition.name)}.`, atoms: overlap, withName: row.definition.name };
  }
  return null;
}

export function armorOccupancyReport(draft: CharacterDraft, data: StaticData) {
  const rows = occupancyRows(draft, data);
  const conflicts: Array<{ aId: string; bId: string; aName: string; bName: string; atoms: string[] }> = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const overlap = conflictingAtoms(rows[i].atoms, rows[j].atoms);
      if (overlap.length) conflicts.push({ aId: rows[i].selection.id, bId: rows[j].selection.id, aName: rows[i].definition.name, bName: rows[j].definition.name, atoms: overlap });
    }
  }
  const occupiedAtoms = [...new Set(rows.flatMap((row) => row.atoms))];
  const unresolvedSides = rows.filter((row) => armorRequiresSide(row.definition) && !row.selection.armorSide && (row.selection.quantity ?? 1) < 2)
    .map((row) => ({ selectionId: row.selection.id, name: row.definition.name }));
  return { rows, conflicts, occupiedAtoms, unresolvedSides };
}

function appendSectionalSelection(draft: CharacterDraft, definition: ArmorItem, side?: ArmorSide) {
  const sizeAdjustment = gearSizeAdjustment(draft);
  const sizedForSiz = sizeAdjustment && sizeAdjustment.presumedSiz !== 12 ? sizeAdjustment.presumedSiz : undefined;
  const suffix = side ? `-${side.toLowerCase()}` : '';
  let id = `inventory-armor-${definition.catalogId}${suffix}`;
  let ordinal = 2;
  while (draft.utilities.armor.some((entry) => entry.id === id)) id = `inventory-armor-${definition.catalogId}${suffix}-${ordinal++}`;
  const selection: InventorySelection = {
    id,
    catalogId: definition.catalogId,
    name: definition.name,
    source: 'player',
    sourceDetail: 'Customized Gear',
    quantity: 1,
    unitPriceGp: Number(definition.priceSp ?? (Number(definition.priceGp) * 10)) / 10 || 0,
    unitWeight: Number(definition.weight) || 0,
    ...(sizedForSiz ? { sizedForSiz } : {}),
    ...(side ? { armorSide: side } : {}),
  };
  return { ...draft, utilities: { ...draft.utilities, armor: [...draft.utilities.armor, selection] } };
}

/** Helm, Shield, and Gear are independent one-each Personal Armor slots. Gear is an under-armor layer and does not consume outer sectional occupancy. */
export function pickArmorSlot(draft: CharacterDraft, kind: 'helmet' | 'shield' | 'gear', catalogId: string | null, data: StaticData) {
  let next = removeArmorKinds(draft, data, [kind]);
  if (!catalogId) return next;
  const definition = data.itemArmors.find((item) => item.catalogId === catalogId && armorKind(item) === kind);
  if (!definition) return draft;
  if (kind === 'helmet' && armorCandidateConflict(next, data, definition)) return draft;
  return addInventoryItem(next, 'armor', catalogId, data);
}

/** Enter detailed sectional mode without changing the current quick-pick mechanics yet. */
export function startCustomArmor(draft: CharacterDraft, data: StaticData) {
  const preset = selectedArmorByKind(draft, data, 'set')[0];
  const definition = preset ? selectedArmorDefinition(preset, data) : null;
  const current = inferredArmorEditorState(draft, data);
  return withArmorEditor(draft, {
    mode: 'custom',
    suitClass: null,
    originPresetCatalogId: definition?.catalogId ?? current.originPresetCatalogId,
    fieldConstruction: (definition?.suitClass ?? null) === 'Field' || current.fieldConstruction,
  });
}

export function setFieldArmorConstruction(draft: CharacterDraft, fieldConstruction: boolean) {
  const current = draft.utilities.armorEditor ?? { mode: 'custom' as const, suitClass: null, originPresetCatalogId: null, fieldConstruction: false };
  return withArmorEditor(draft, { ...current, mode: 'custom', suitClass: null, fieldConstruction });
}

export function addArmorComponent(draft: CharacterDraft, catalogId: string, data: StaticData, side?: ArmorSide) {
  const definition = data.itemArmors.find((item) => item.catalogId === catalogId);
  if (!definition || armorKind(definition) !== 'sectional') return draft;
  if (armorCandidateConflict(draft, data, definition, side)) return draft;
  let next = draft;
  if (selectedArmorByKind(next, data, 'set').length) {
    next = startCustomArmor(next, data);
    // The first actual sectional edit makes the Suit non-canonical.
    next = removeArmorKinds(next, data, ['set']);
  }
  next = appendSectionalSelection(next, definition, side);
  const state = inferredArmorEditorState(next, data);
  return withArmorEditor(next, { ...state, mode: 'custom', suitClass: null });
}

/** Retained for legacy imported selections; new sectional editing uses one physical component per selection. */
export function setArmorComponentQuantity(draft: CharacterDraft, catalogId: string, quantity: number, selectionId?: string) {
  return setInventoryQuantity(draft, 'armor', catalogId, quantity, selectionId);
}

export function setArmorComponentSide(draft: CharacterDraft, selectionId: string, side: ArmorSide, data: StaticData) {
  const selection = draft.utilities.armor.find((entry) => entry.id === selectionId);
  if (!selection) return draft;
  const definition = selectedArmorDefinition(selection, data);
  if (!definition || !armorRequiresSide(definition)) return draft;
  if (armorCandidateConflict(draft, data, definition, side, selectionId)) return draft;
  return {
    ...draft,
    utilities: {
      ...draft.utilities,
      armor: draft.utilities.armor.map((entry) => entry.id === selectionId ? { ...entry, quantity: 1, armorSide: side } : entry),
    },
  };
}

function parsedTrait(value: string) {
  const match = value.trim().match(/^(.+?)(?:\s+(\d+))?$/);
  return { name: match?.[1]?.trim() ?? value.trim(), level: Math.max(1, Number(match?.[2]) || 1) };
}

function combineTraits(items: Array<{ traits?: string[]; quantity?: number }>) {
  const state = new Map<string, { level: number; repeats: number }>();
  for (const item of items) {
    const quantity = Math.max(1, Math.trunc(item.quantity ?? 1));
    for (const raw of item.traits ?? []) {
      const trait = parsedTrait(raw);
      const current = state.get(trait.name) ?? { level: 0, repeats: 0 };
      state.set(trait.name, { level: Math.max(current.level, trait.level), repeats: current.repeats + quantity });
    }
  }
  return [...state.entries()].map(([name, value]) => {
    const level = value.level + Math.max(0, value.repeats - 1);
    return level > 1 ? `${name} ${level}` : name;
  });
}

function localMax(values: number[]) { return values.length ? Math.max(...values) : 0; }

function atomsIncludeSide(atoms: readonly string[], base: string, side: ArmorSide) {
  return atoms.includes(`${base} (${side})`);
}

function allAtomsPresent(occupied: Set<string>, atoms: readonly string[]) {
  return atoms.every((atom) => occupied.has(atom));
}

/**
 * Detailed sectional calculation uses atomic body occupancy to prevent one arm or leg
 * from being counted repeatedly when several non-overlapping components cover it.
 */
function customSuitAggregate(draft: CharacterDraft, data: StaticData) {
  const selections = selectedArmorByKind(draft, data, 'sectional');
  const adjusted = selections.flatMap((selection) => {
    const definition = selectedArmorDefinition(selection, data);
    if (!definition) return [];
    const values = adjustedGearValues('armor', definition, draft, data, selection.sizedForSiz);
    const atoms = armorSelectionCoverageAtoms(selection, definition);
    return [{ selection, definition, values, atoms, quantity: Math.max(1, selection.quantity || 1) }];
  });

  const ar = { front: [] as number[], back: [] as number[], leftArm: [] as number[], rightArm: [] as number[], leftLeg: [] as number[], rightLeg: [] as number[] };
  const d = { front: [] as number[], back: [] as number[], leftArm: [] as number[], rightArm: [] as number[], leftLeg: [] as number[], rightLeg: [] as number[] };
  const occupied = new Set<string>();

  for (const row of adjusted) {
    row.atoms.forEach((atom) => occupied.add(atom));
    const arValue = Number(row.values.armorRating ?? 0);
    const dValue = Number(row.values.deflectRating ?? 0);
    if (row.atoms.some((atom) => FRONT_TORSO_ATOMS.includes(atom as typeof FRONT_TORSO_ATOMS[number]))) { ar.front.push(arValue); d.front.push(dValue); }
    if (row.atoms.some((atom) => BACK_TORSO_ATOMS.includes(atom as typeof BACK_TORSO_ATOMS[number]))) { ar.back.push(arValue); d.back.push(dValue); }
    if (row.atoms.some((atom) => / \(Left\)$/.test(atom) && ['Shoulder','Upper Arm','Elbow','Forearm','Hand'].some((part) => atom.startsWith(part)))) { ar.leftArm.push(arValue); d.leftArm.push(dValue); }
    if (row.atoms.some((atom) => / \(Right\)$/.test(atom) && ['Shoulder','Upper Arm','Elbow','Forearm','Hand'].some((part) => atom.startsWith(part)))) { ar.rightArm.push(arValue); d.rightArm.push(dValue); }
    if (row.atoms.some((atom) => / \(Left\)$/.test(atom) && ['Thigh','Knee','Shin','Foot'].some((part) => atom.startsWith(part)))) { ar.leftLeg.push(arValue); d.leftLeg.push(dValue); }
    if (row.atoms.some((atom) => / \(Right\)$/.test(atom) && ['Thigh','Knee','Shin','Foot'].some((part) => atom.startsWith(part)))) { ar.rightLeg.push(arValue); d.rightLeg.push(dValue); }
  }

  const aggregateFacing = (primary: 'front' | 'back') => {
    const opposite = primary === 'front' ? 'back' : 'front';
    const baseAr = localMax(ar[primary]);
    const baseD = localMax(d[primary]);
    if (baseAr <= 0 && baseD <= 0) return { armorRating: 0, deflect: 0 };
    const arOthers = [localMax(ar[opposite]), localMax(ar.leftArm), localMax(ar.rightArm), localMax(ar.leftLeg), localMax(ar.rightLeg)];
    const dOthers = [localMax(d[opposite]), localMax(d.leftArm), localMax(d.rightArm), localMax(d.leftLeg), localMax(d.rightLeg)];
    const arBonus = arOthers.filter((value) => baseAr > 0 && value > 0 && value >= baseAr - 5).length;
    const dBonus = dOthers.filter((value) => baseD > 0 && value > 0 && value >= baseD - 2).length;
    return { armorRating: baseAr > 0 ? baseAr + arBonus : 0, deflect: baseD > 0 ? baseD + dBonus : 0 };
  };

  const front = aggregateFacing('front');
  const rear = aggregateFacing('back');
  const fullFront = allAtomsPresent(occupied, FRONT_TORSO_ATOMS);
  const fullBack = allAtomsPresent(occupied, BACK_TORSO_ATOMS);
  const fullArm = (side: ArmorSide) => ARM_CORE_ATOMS.every((atom) => atomsIncludeSide([...occupied], atom, side));
  const fullLeg = (side: ArmorSide) => LEG_CORE_ATOMS.every((atom) => atomsIncludeSide([...occupied], atom, side));
  const coverage = { front: fullFront, back: fullBack, arms: Number(fullArm('Left')) + Number(fullArm('Right')), legs: Number(fullLeg('Left')) + Number(fullLeg('Right')) };
  return {
    selections,
    adjusted,
    weight: adjusted.reduce((sum, row) => sum + Number(row.values.weight || 0) * row.quantity, 0),
    costGp: adjusted.reduce((sum, row) => sum + Number(row.values.priceGp || 0) * row.quantity, 0),
    deflect: Math.max(front.deflect, rear.deflect),
    armorRating: Math.max(front.armorRating, rear.armorRating),
    frontDeflect: front.deflect,
    frontArmorRating: front.armorRating,
    rearDeflect: rear.deflect,
    rearArmorRating: rear.armorRating,
    coverage,
    occupiedAtoms: [...occupied],
    traits: combineTraits(adjusted.map((row) => ({ traits: row.definition.traits, quantity: row.quantity }))),
  };
}

/** Protection thresholds are anchored to the seven canonical quick-pick Armor Sets. */
export function armorProtectionBand(deflect: number, armorRating: number, fieldConstruction = false): ArmorSuitClass {
  if (fieldConstruction && deflect >= 8 && armorRating >= 24) return 'Field';
  if (deflect >= 6 && armorRating >= 18) return 'Heavy';
  if (deflect >= 4 && armorRating >= 12) return 'Medium';
  return 'Light';
}

/**
 * Coverage caps capability. A superb torso plate can reach Medium abstract capability,
 * but Heavy/Field require full torso, both arms, and both legs. Hit Locations remain optional;
 * when used, uncovered locations simply receive no protection from the Suit.
 */
export function armorCoverageCap(coverage: { front: boolean; back: boolean; arms: number; legs: number }, fieldConstruction = false): ArmorSuitClass | null {
  if (!coverage.front && !coverage.back) return null;
  const fullBody = coverage.front && coverage.back && coverage.arms >= 2 && coverage.legs >= 2;
  if (fullBody) return fieldConstruction ? 'Field' : 'Heavy';
  return 'Medium';
}

export function deriveCustomArmorClass(
  coverage: { front: boolean; back: boolean; arms: number; legs: number },
  deflect: number,
  armorRating: number,
  fieldConstruction = false,
): ArmorSuitClass | null {
  const cap = armorCoverageCap(coverage, fieldConstruction);
  if (!cap) return null;
  const protection = armorProtectionBand(deflect, armorRating, fieldConstruction);
  return CLASS_ORDER[Math.min(CLASS_ORDER.indexOf(cap), CLASS_ORDER.indexOf(protection))] ?? null;
}

function slotSummary(kind: 'helmet' | 'shield' | 'gear', draft: CharacterDraft, data: StaticData) {
  const selection = selectedArmorByKind(draft, data, kind)[0];
  if (!selection) return null;
  const definition = selectedArmorDefinition(selection, data);
  if (!definition) return null;
  const values = adjustedGearValues('armor', definition, draft, data, selection.sizedForSiz);
  return {
    kind,
    selection,
    definition,
    displayName: displayInventoryName(definition.name),
    costGp: Number(values.priceGp || 0),
    weight: Number(values.weight || 0),
    deflect: Number(values.deflectRating ?? 0),
    armorRating: Number(values.armorRating ?? 0),
    traits: definition.traits ?? [],
  };
}

export function armorEditorProfile(draft: CharacterDraft, data: StaticData) {
  const editor = inferredArmorEditorState(draft, data);
  const presetSelection = selectedArmorByKind(draft, data, 'set')[0] ?? null;
  const presetDefinition = presetSelection ? selectedArmorDefinition(presetSelection, data) : null;
  let suit: {
    mode: 'preset' | 'custom'; displayName: string; suitClass: ArmorSuitClass | null; material: string | null;
    canonical: boolean; costGp: number; weight: number; deflect: number; armorRating: number; rawDeflect: number; rawArmorRating: number;
    frontDeflect: number; frontArmorRating: number; rearDeflect: number; rearArmorRating: number;
    traits: string[]; coverage: { front: boolean; back: boolean; arms: number; legs: number };
  } | null = null;
  if (presetSelection && presetDefinition) {
    const values = adjustedGearValues('armor', presetDefinition, draft, data, presetSelection.sizedForSiz);
    const coverage = {
      front: presetDefinition.hitLocations.includes('Front Torso'),
      back: presetDefinition.hitLocations.includes('Back Torso'),
      arms: presetDefinition.hitLocations.includes('Arms') ? 2 : 0,
      legs: presetDefinition.hitLocations.includes('Legs') ? 2 : 0,
    };
    const bonus = Number(presetDefinition.noHitLocationBonus ?? 0);
    const suitClass = (presetDefinition.suitClass ?? null) as ArmorSuitClass | null;
    const rawDeflect = Number(values.deflectRating ?? 0);
    const rawArmorRating = Number(values.armorRating ?? 0);
    suit = {
      mode: 'preset', displayName: displayInventoryName(presetDefinition.name), suitClass, material: presetDefinition.setMaterial ?? presetDefinition.material ?? null,
      canonical: true, costGp: Number(values.priceGp || 0), weight: Number(values.weight || 0),
      rawDeflect, rawArmorRating,
      deflect: rawDeflect + bonus, armorRating: rawArmorRating + bonus,
      frontDeflect: rawDeflect, frontArmorRating: rawArmorRating,
      rearDeflect: coverage.back ? rawDeflect : 0, rearArmorRating: coverage.back ? rawArmorRating : 0,
      traits: presetDefinition.traits ?? [], coverage,
    };
  } else {
    const custom = customSuitAggregate(draft, data);
    if (custom.selections.length || editor.mode === 'custom') {
      const suitClass = deriveCustomArmorClass(custom.coverage, custom.deflect, custom.armorRating, editor.fieldConstruction);
      suit = {
        mode: 'custom', displayName: suitClass ? `Armor, ${suitClass} (Custom)` : 'Custom Sectional Armor', suitClass,
        material: null, canonical: false, costGp: custom.costGp, weight: custom.weight,
        rawDeflect: custom.deflect, rawArmorRating: custom.armorRating, deflect: custom.deflect, armorRating: custom.armorRating,
        frontDeflect: custom.frontDeflect, frontArmorRating: custom.frontArmorRating,
        rearDeflect: custom.rearDeflect, rearArmorRating: custom.rearArmorRating,
        traits: custom.traits, coverage: custom.coverage,
      };
    }
  }
  const helmet = slotSummary('helmet', draft, data);
  const shield = slotSummary('shield', draft, data);
  const gear = slotSummary('gear', draft, data);
  const slotRows = [helmet, shield, gear].filter(Boolean) as NonNullable<ReturnType<typeof slotSummary>>[];
  const totalWeight = (suit?.weight ?? 0) + slotRows.reduce((sum, row) => sum + row.weight, 0);
  const totalCostGp = (suit?.costGp ?? 0) + slotRows.reduce((sum, row) => sum + row.costGp, 0);
  const highestDeflect = Math.max(suit?.deflect ?? 0, ...slotRows.map((row) => row.deflect));
  const highestArmorRating = Math.max(suit?.armorRating ?? 0, ...slotRows.map((row) => row.armorRating));
  const allTraits = combineTraits([
    ...(suit ? [{ traits: suit.traits, quantity: 1 }] : []),
    ...slotRows.map((row) => ({ traits: row.traits, quantity: 1 })),
  ]);
  return {
    editor, suit, helmet, shield, gear,
    totalWeight, totalCostGp,
    highestDeflect, highestArmorRating,
    traits: allTraits,
    sizedForSiz: gearSizeAdjustment(draft)?.presumedSiz ?? 12,
  };
}

export function armorClassIndex(value: ArmorSuitClass | null) {
  return value ? CLASS_ORDER.indexOf(value) : -1;
}
