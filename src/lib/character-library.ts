import { createEmptyCharacterDraft, migrateCharacterDraft, type CharacterDraft } from '@/lib/character-draft';

export const LEGACY_DRAFT_STORAGE_KEY = 'dxd-character-draft-v1';
export const CHARACTER_LIBRARY_STORAGE_KEY = 'dxd-character-library-v1';
export const PENDING_FILE_LOAD_STORAGE_KEY = 'dxd-character-pending-file-load-v1';

export type CharacterLibraryEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  draft: CharacterDraft;
};

export type CharacterLibraryState = {
  schemaVersion: 1;
  activeId: string;
  entries: CharacterLibraryEntry[];
};

export type CharacterExportEnvelope = {
  format: 'dxd-chargen-character';
  version: 1;
  exportedAt: string;
  character: CharacterLibraryEntry;
};

function now() { return new Date().toISOString(); }

export function makeCharacterId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `character-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createLibraryEntry(draft: CharacterDraft = createEmptyCharacterDraft(), id = makeCharacterId()): CharacterLibraryEntry {
  const timestamp = now();
  return { id, createdAt: timestamp, updatedAt: timestamp, draft: { ...draft, updatedAt: timestamp } };
}

export function createCharacterLibrary(draft: CharacterDraft = createEmptyCharacterDraft()): CharacterLibraryState {
  const entry = createLibraryEntry(draft);
  return { schemaVersion: 1, activeId: entry.id, entries: [entry] };
}

export function migrateCharacterLibrary(value: unknown, fallbackDraft?: unknown): CharacterLibraryState {
  if (value && typeof value === 'object') {
    const candidate = value as Partial<CharacterLibraryState>;
    if (candidate.schemaVersion === 1 && Array.isArray(candidate.entries)) {
      const entries = candidate.entries.map((entry) => ({
        id: typeof entry?.id === 'string' && entry.id ? entry.id : makeCharacterId(),
        createdAt: typeof entry?.createdAt === 'string' ? entry.createdAt : now(),
        updatedAt: typeof entry?.updatedAt === 'string' ? entry.updatedAt : now(),
        draft: migrateCharacterDraft(entry?.draft),
      }));
      if (entries.length) {
        const activeId = entries.some((entry) => entry.id === candidate.activeId) ? String(candidate.activeId) : entries[0].id;
        return { schemaVersion: 1, activeId, entries };
      }
    }
  }
  return createCharacterLibrary(migrateCharacterDraft(fallbackDraft));
}

export function activeLibraryEntry(library: CharacterLibraryState) {
  return library.entries.find((entry) => entry.id === library.activeId) ?? library.entries[0];
}

export function updateActiveDraft(
  library: CharacterLibraryState,
  update: CharacterDraft | ((draft: CharacterDraft) => CharacterDraft),
): CharacterLibraryState {
  const timestamp = now();
  return {
    ...library,
    entries: library.entries.map((entry) => {
      if (entry.id !== library.activeId) return entry;
      const next = typeof update === 'function' ? update(entry.draft) : update;
      return { ...entry, updatedAt: timestamp, draft: { ...next, updatedAt: timestamp } };
    }),
  };
}

export function duplicateCharacter(library: CharacterLibraryState, id = library.activeId): CharacterLibraryState {
  const source = library.entries.find((entry) => entry.id === id);
  if (!source) return library;
  const draft = {
    ...source.draft,
    utilities: {
      ...source.draft.utilities,
      name: source.draft.utilities.name ? `${source.draft.utilities.name} Copy` : 'Character Copy',
    },
  };
  const entry = createLibraryEntry(draft);
  return { ...library, activeId: entry.id, entries: [...library.entries, entry] };
}

export function newCharacter(library: CharacterLibraryState): CharacterLibraryState {
  const entry = createLibraryEntry();
  return { ...library, activeId: entry.id, entries: [...library.entries, entry] };
}

export function deleteCharacter(library: CharacterLibraryState, id: string): CharacterLibraryState {
  if (library.entries.length <= 1) return createCharacterLibrary();
  const index = library.entries.findIndex((entry) => entry.id === id);
  if (index < 0) return library;
  const entries = library.entries.filter((entry) => entry.id !== id);
  const activeId = library.activeId === id
    ? entries[Math.min(index, entries.length - 1)].id
    : library.activeId;
  return { ...library, activeId, entries };
}

export function importCharacter(value: unknown): CharacterLibraryEntry {
  const source = value && typeof value === 'object' && (value as Partial<CharacterExportEnvelope>).format === 'dxd-chargen-character'
    ? (value as CharacterExportEnvelope).character?.draft
    : value && typeof value === 'object' && 'draft' in value
      ? (value as { draft?: unknown }).draft
      : value;
  return createLibraryEntry(migrateCharacterDraft(source));
}

export function addImportedCharacter(library: CharacterLibraryState, value: unknown): CharacterLibraryState {
  const entry = importCharacter(value);
  return { ...library, activeId: entry.id, entries: [...library.entries, entry] };
}

export function exportCharacter(entry: CharacterLibraryEntry): CharacterExportEnvelope {
  return { format: 'dxd-chargen-character', version: 1, exportedAt: now(), character: entry };
}
