import type { CharacterDraft, LanguageSelection, SourcedSelection } from '@/lib/character-draft';
import { makeCatalogId } from '@/data/catalog-policy';

export const LEGACY_SHEET_FRONT_REPAIR_STEP = 'migration-legacy-sheet-front-v1';

type LegacyCapability = {
  name?: unknown;
  rank?: unknown;
  disability?: unknown;
  specializations?: Array<{ name?: unknown; rank?: unknown }>;
};

type LegacyLanguage = {
  name?: unknown;
  rank?: unknown;
  isDefault?: unknown;
  accented?: unknown;
};

type LegacyCharacterSource = {
  details?: {
    background?: {
      personalityFeatures?: {
        tragedies?: unknown[];
      };
    };
  };
  historyNotes?: {
    allies?: unknown[];
    skills?: LegacyCapability[];
    traits?: LegacyCapability[];
    spells?: unknown[];
    languages?: LegacyLanguage[];
    notes?: unknown;
  };
};

const text = (value: unknown) => String(value ?? '').trim();

function sourceSelection(name: string, suffix = name): SourcedSelection {
  return {
    id: makeCatalogId('import', suffix),
    name,
    source: 'player',
    sourceDetail: 'Imported character reference',
  };
}

function sourceCapability(item: LegacyCapability): SourcedSelection | null {
  const name = text(item.name);
  if (!name) return null;
  const specializations = (item.specializations ?? [])
    .map((entry) => ({ name: text(entry.name), rank: Math.max(1, Math.trunc(Number(entry.rank) || 1)) }))
    .filter((entry) => entry.name);
  const specializationRanks = Object.fromEntries(specializations.map((entry) => [entry.name, entry.rank]));
  const level = Math.max(1, Math.trunc(Number(item.rank) || 1));
  return {
    ...sourceSelection(name),
    level,
    ...(specializations[0] ? { specialization: specializations[0].name } : {}),
    ...(specializations.length ? { specializationRanks } : {}),
  };
}

function sourceLanguage(item: LegacyLanguage): LanguageSelection | null {
  const name = text(item.name);
  if (!name) return null;
  const isDefault = Boolean(item.isDefault);
  return {
    ...sourceSelection(name, `language-${name}`),
    kind: isDefault ? 'default' : 'proficiency',
    primary: isDefault,
    baseLevel: Math.max(1, Math.trunc(Number(item.rank) || 1)),
    improvements: 0,
    accentRemoved: item.accented === false,
    modifiers: [],
  };
}

function noteList(notes: string, heading: string) {
  const match = notes.match(new RegExp(`(?:^|\\n)\\s*${heading}\\s*[;:]\\s*([^\\n]+)`, 'i'));
  if (!match) return [];
  return match[1].split(/\s*,\s*/).map((entry) => entry.trim()).filter(Boolean);
}

function tragedyFromNotes(notes: string) {
  const match = notes.match(/(?:^|\n)\s*Tragedy\s*(?:[-;:]|—)\s*([^\n]+)/i);
  return match?.[1]?.trim() ?? '';
}

function mergeSelections(current: SourcedSelection[], incoming: SourcedSelection[]) {
  const output = [...current];
  const keys = new Set(current.map((entry) => `${entry.name.toLowerCase()}|${entry.level ?? 1}|${entry.specialization?.toLowerCase() ?? ''}`));
  for (const entry of incoming) {
    const key = `${entry.name.toLowerCase()}|${entry.level ?? 1}|${entry.specialization?.toLowerCase() ?? ''}`;
    if (!keys.has(key)) {
      keys.add(key);
      output.push(entry);
    }
  }
  return output;
}

function mergeLanguages(current: LanguageSelection[], incoming: LanguageSelection[]) {
  const output = [...current];
  const keys = new Set(current.map((entry) => `${entry.name.toLowerCase()}|${(entry.modifiers ?? []).join('|').toLowerCase()}`));
  for (const entry of incoming) {
    const key = `${entry.name.toLowerCase()}|${(entry.modifiers ?? []).join('|').toLowerCase()}`;
    if (!keys.has(key)) {
      keys.add(key);
      output.push(entry);
    }
  }
  return output;
}

/**
 * Repairs presentation-reference data that the first legacy conversion omitted.
 * The migration is intentionally one-shot: once a repaired draft is saved, later
 * player edits are authoritative and the source snapshot is not reapplied.
 */
export function repairLegacySheetFrontConversion(
  draft: CharacterDraft,
  source: LegacyCharacterSource,
): CharacterDraft {
  if (draft.completedSteps.includes(LEGACY_SHEET_FRONT_REPAIR_STEP)) return draft;
  if (draft.intrinsics.attributeMethod !== 'imported') return draft;

  const history = source.historyNotes ?? {};
  const notes = text(history.notes);
  const sourceCapabilities = [
    ...(history.skills ?? []).filter((entry) => !entry.disability),
    ...(history.traits ?? []),
  ].map(sourceCapability).filter((entry): entry is SourcedSelection => Boolean(entry));
  const sourceLanguages = (history.languages ?? []).map(sourceLanguage).filter((entry): entry is LanguageSelection => Boolean(entry));
  const sourceSpells = [
    ...(history.spells ?? []).map((entry) => text(typeof entry === 'object' && entry && 'name' in entry ? (entry as { name?: unknown }).name : entry)),
    ...noteList(notes, 'Spells'),
  ].filter(Boolean).map((name) => sourceSelection(name, `spell-${name}`));
  const sourceAllies = (history.allies ?? []).map(text).filter(Boolean).map((name) => sourceSelection(name, `ally-${name}`));
  const sourceTragedies = (source.details?.background?.personalityFeatures?.tragedies ?? []).map(text).filter(Boolean);
  const tragedy = sourceTragedies.join('; ') || tragedyFromNotes(notes);

  return {
    ...draft,
    completedSteps: [...draft.completedSteps, LEGACY_SHEET_FRONT_REPAIR_STEP],
    background: {
      ...draft.background,
      tragedySeedText: draft.background.tragedySeedText || tragedy || null,
    },
    proficiencies: {
      ...draft.proficiencies,
      importedCapabilities: sourceCapabilities.length ? sourceCapabilities : draft.proficiencies.importedCapabilities,
      languages: mergeLanguages(draft.proficiencies.languages, sourceLanguages),
    },
    utilities: {
      ...draft.utilities,
      spells: mergeSelections(draft.utilities.spells, sourceSpells),
      relationships: mergeSelections(draft.utilities.relationships, sourceAllies),
    },
  };
}
