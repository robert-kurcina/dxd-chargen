'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { StaticData } from '@/data';
import CharacterLibraryPanel from './character-library-panel';
import ExpandedCharacterSheet from './expanded-character-sheet';
import Worksheet from './worksheet';
import Info from './info';
import Tests from './tests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { createEmptyCharacterDraft, migrateCharacterDraft, type CharacterDraft } from '@/lib/character-draft';
import { activeLibraryEntry, CHARACTER_LIBRARY_STORAGE_KEY, LEGACY_DRAFT_STORAGE_KEY, migrateCharacterLibrary, updateActiveDraft, type CharacterLibraryState } from '@/lib/character-library';
import { syncHeritageGrantedSelections } from '@/lib/rules/background';
import { syncIntrinsics } from '@/lib/rules/intrinsics';
import { syncProficiencies } from '@/lib/rules/proficiencies';
import { syncProperties } from '@/lib/rules/properties';
import { syncUtilities } from '@/lib/rules/utilities';

function normalizeDraft(draft: CharacterDraft, data: StaticData) { return syncUtilities(syncProperties(syncProficiencies(syncIntrinsics(syncHeritageGrantedSelections(draft, data), data), data), data), data); }
const comparableDraft = (draft: CharacterDraft) => JSON.stringify({ ...draft, updatedAt: '' });
const INITIAL_TIMESTAMP = '1970-01-01T00:00:00.000Z';
function initialLibraryState(): CharacterLibraryState { return { schemaVersion: 1, activeId: 'initial', entries: [{ id: 'initial', createdAt: INITIAL_TIMESTAMP, updatedAt: INITIAL_TIMESTAMP, draft: createEmptyCharacterDraft() }] }; }

export default function CharacterApp({ data }: { data: StaticData }) {
  const [library, setLibrary] = useState<CharacterLibraryState>(initialLibraryState);
  const [tab, setTab] = useState('forge');
  const [hydrated, setHydrated] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [libraryRefresh, setLibraryRefresh] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let savedLibrary: unknown = null; let legacyDraft: unknown = null;
    try { const rawLibrary = window.localStorage.getItem(CHARACTER_LIBRARY_STORAGE_KEY); if (rawLibrary) savedLibrary = JSON.parse(rawLibrary); const rawLegacy = window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY); if (rawLegacy) legacyDraft = JSON.parse(rawLegacy); } catch {}
    const migrated = migrateCharacterLibrary(savedLibrary, legacyDraft);
    setLibrary({ ...migrated, entries: migrated.entries.map((entry) => ({ ...entry, draft: normalizeDraft(entry.draft, data) })) });
    setHydrated(true);
  }, [data]);
  useEffect(() => { if (!hydrated) return; window.localStorage.setItem(CHARACTER_LIBRARY_STORAGE_KEY, JSON.stringify(library)); const active = activeLibraryEntry(library); if (active) window.localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, JSON.stringify(active.draft)); }, [library, hydrated]);

  const draft = activeLibraryEntry(library)?.draft ?? createEmptyCharacterDraft();
  const serialized = comparableDraft(draft);
  const dirty = activeFileId ? serialized !== savedSnapshot : serialized !== comparableDraft(normalizeDraft(createEmptyCharacterDraft(), data));
  const setDraft: Dispatch<SetStateAction<CharacterDraft>> = (action) => setLibrary((current) => updateActiveDraft(current, (currentDraft) => normalizeDraft(typeof action === 'function' ? (action as (value: CharacterDraft) => CharacterDraft)(currentDraft) : action, data)));
  const loadDraft = (idName: string, value: CharacterDraft) => { const next = normalizeDraft(migrateCharacterDraft(value), data); setDraft(next); setActiveFileId(idName); setSavedSnapshot(comparableDraft(next)); setMessage(`Loaded ${idName}`); setTab('forge'); };
  const save = async () => {
    const response = await fetch('/api/character-files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idName: activeFileId, draft }) });
    if (!response.ok) return setMessage('Save failed.');
    const value = await response.json(); setActiveFileId(value.idName); setSavedSnapshot(comparableDraft(draft)); setLibraryRefresh((key) => key + 1); setMessage(`Saved ${value.idName}`);
  };
  const revert = async () => { if (!activeFileId) return; const response = await fetch(`/api/character-files/${encodeURIComponent(activeFileId)}`, { cache: 'no-store' }); if (!response.ok) return setMessage('Revert failed.'); const value = await response.json(); loadDraft(activeFileId, value.draft); };
  const reset = () => { const empty = normalizeDraft(createEmptyCharacterDraft(), data); setDraft(empty); setActiveFileId(null); setSavedSnapshot(''); setMessage('Forge reset to a new character.'); };

  return <main className="min-h-screen p-4 md:p-8"><Tabs value={tab} onValueChange={setTab} className="w-full"><div className="sticky top-0 z-50 bg-white py-2 print:hidden"><TabsList className="mx-auto grid w-full max-w-[1080px] grid-cols-5"><TabsTrigger value="forge">Forge</TabsTrigger><TabsTrigger value="sheet">Sheet</TabsTrigger><TabsTrigger value="library">Library</TabsTrigger><TabsTrigger value="tests">Tests</TabsTrigger><TabsTrigger value="info">Info</TabsTrigger></TabsList></div><div className="pt-2"><TabsContent value="forge"><div className="mx-auto mb-3 flex max-w-[1440px] items-center justify-between rounded-lg border bg-card p-3"><div className="text-sm"><div className="font-medium">{activeFileId ?? 'Unsaved character'}</div>{message && <div className="text-xs text-muted-foreground">{message}</div>}</div><div className="flex gap-2"><Button variant="outline" disabled={!activeFileId || !dirty} onClick={() => void revert()}>Revert</Button><Button disabled={!dirty} onClick={() => void save()}>Save</Button></div></div><Worksheet data={data} draft={draft} setDraft={setDraft} onReset={reset} /></TabsContent><TabsContent value="sheet"><div className="mx-auto w-full max-w-[1200px]"><ExpandedCharacterSheet draft={draft} data={data} /></div></TabsContent><TabsContent value="library"><CharacterLibraryPanel data={data} refreshKey={libraryRefresh} onOpen={loadDraft} /></TabsContent><TabsContent value="tests"><Tests data={data} /></TabsContent><TabsContent value="info"><Info data={data} /></TabsContent></div></Tabs></main>;
}
