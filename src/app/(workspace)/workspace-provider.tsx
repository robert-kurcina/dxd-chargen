'use client';

import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import type { StaticData } from '@/data';
import { createEmptyCharacterDraft, migrateCharacterDraft, type CharacterDraft } from '@/lib/character-draft';
import { activeLibraryEntry, CHARACTER_LIBRARY_STORAGE_KEY, LEGACY_DRAFT_STORAGE_KEY, migrateCharacterLibrary, updateActiveDraft, type CharacterLibraryState } from '@/lib/character-library';
import { syncHeritageGrantedSelections } from '@/lib/rules/background';
import { syncIntrinsics } from '@/lib/rules/intrinsics';
import { syncProficiencies } from '@/lib/rules/proficiencies';
import { syncProperties } from '@/lib/rules/properties';
import { syncUtilities } from '@/lib/rules/utilities';
import { ADMIN_SETTINGS_EVENT, readAdminSettings, sortLibraryTags } from '@/lib/admin-settings';

function normalizeDraft(draft: CharacterDraft, data: StaticData) { return syncUtilities(syncProperties(syncProficiencies(syncIntrinsics(syncHeritageGrantedSelections(draft, data), data), data), data), data); }
const comparableDraft = (draft: CharacterDraft) => JSON.stringify({ ...draft, updatedAt: '' });
const INITIAL_TIMESTAMP = '1970-01-01T00:00:00.000Z';
function initialLibraryState(): CharacterLibraryState { return { schemaVersion: 1, activeId: 'initial', entries: [{ id: 'initial', createdAt: INITIAL_TIMESTAMP, updatedAt: INITIAL_TIMESTAMP, draft: createEmptyCharacterDraft() }] }; }

type WorkspaceContextValue = {
  data: StaticData;
  draft: CharacterDraft;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
  activeFileId: string | null;
  dirty: boolean;
  message: string;
  setMessage: (value: string) => void;
  availableTags: string[];
  libraryRefresh: number;
  save: () => Promise<boolean>;
  revert: () => Promise<void>;
  reset: () => void;
  loadDraft: (idName: string, value: CharacterDraft) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ data, children }: { data: StaticData; children: React.ReactNode }) {
  const router = useRouter();
  const [library, setLibrary] = useState<CharacterLibraryState>(initialLibraryState);
  const [hydrated, setHydrated] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [libraryRefresh, setLibraryRefresh] = useState(0);
  const [message, setMessage] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    let savedLibrary: unknown = null; let legacyDraft: unknown = null;
    try { const rawLibrary = window.localStorage.getItem(CHARACTER_LIBRARY_STORAGE_KEY); if (rawLibrary) savedLibrary = JSON.parse(rawLibrary); const rawLegacy = window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY); if (rawLegacy) legacyDraft = JSON.parse(rawLegacy); } catch {}
    const migrated = migrateCharacterLibrary(savedLibrary, legacyDraft);
    setLibrary({ ...migrated, entries: migrated.entries.map((entry) => ({ ...entry, draft: normalizeDraft(entry.draft, data) })) });
    setHydrated(true);
  }, [data]);
  useEffect(() => { if (!hydrated) return; window.localStorage.setItem(CHARACTER_LIBRARY_STORAGE_KEY, JSON.stringify(library)); const active = activeLibraryEntry(library); if (active) window.localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, JSON.stringify(active.draft)); }, [library, hydrated]);
  useEffect(() => {
    const syncTags = () => setAvailableTags(sortLibraryTags(readAdminSettings().libraryTags));
    syncTags(); window.addEventListener(ADMIN_SETTINGS_EVENT, syncTags as EventListener);
    return () => window.removeEventListener(ADMIN_SETTINGS_EVENT, syncTags as EventListener);
  }, []);

  const draft = activeLibraryEntry(library)?.draft ?? createEmptyCharacterDraft();
  const serialized = comparableDraft(draft);
  const dirty = activeFileId ? serialized !== savedSnapshot : serialized !== comparableDraft(normalizeDraft(createEmptyCharacterDraft(), data));
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);

  const setDraft: Dispatch<SetStateAction<CharacterDraft>> = (action) => setLibrary((current) => updateActiveDraft(current, (currentDraft) => normalizeDraft(typeof action === 'function' ? (action as (value: CharacterDraft) => CharacterDraft)(currentDraft) : action, data)));
  const loadDraft = (idName: string, value: CharacterDraft) => { const next = normalizeDraft(migrateCharacterDraft(value), data); setDraft(next); setActiveFileId(idName); setSavedSnapshot(comparableDraft(next)); setMessage(`Loaded ${idName}`); router.push('/'); };
  const save = async () => {
    const response = await fetch('/api/character-files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idName: activeFileId, draft }) });
    if (!response.ok) { setMessage('Save failed.'); return false; }
    const value = await response.json(); setActiveFileId(value.idName); setSavedSnapshot(comparableDraft(draft)); setLibraryRefresh((key) => key + 1); setMessage(`Saved ${value.idName}`); return true;
  };
  const revert = async () => { if (!activeFileId) return; const response = await fetch(`/api/character-files/${encodeURIComponent(activeFileId)}`, { cache: 'no-store' }); if (!response.ok) return setMessage('Revert failed.'); const value = await response.json(); loadDraft(activeFileId, value.draft); };
  const reset = () => { const empty = normalizeDraft(createEmptyCharacterDraft(), data); setDraft({ ...empty, completedSteps: [] }); setActiveFileId(null); setSavedSnapshot(''); setMessage('Forge reset to a new character.'); };

  const value = useMemo<WorkspaceContextValue>(() => ({ data, draft, setDraft, activeFileId, dirty, message, setMessage, availableTags, libraryRefresh, save, revert, reset, loadDraft }), [data, draft, activeFileId, dirty, message, availableTags, libraryRefresh]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('Workspace context is unavailable.');
  return value;
}
