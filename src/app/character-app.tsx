'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { StaticData } from '@/data';
import CharacterLibraryPanel from './character-library-panel';
import ExpandedCharacterSheet from './expanded-character-sheet';
import Worksheet from './worksheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { createEmptyCharacterDraft, migrateCharacterDraft, type CharacterDraft } from '@/lib/character-draft';
import { activeLibraryEntry, CHARACTER_LIBRARY_STORAGE_KEY, LEGACY_DRAFT_STORAGE_KEY, migrateCharacterLibrary, updateActiveDraft, type CharacterLibraryState } from '@/lib/character-library';
import { syncHeritageGrantedSelections } from '@/lib/rules/background';
import { syncIntrinsics } from '@/lib/rules/intrinsics';
import { syncProficiencies } from '@/lib/rules/proficiencies';
import { syncProperties } from '@/lib/rules/properties';
import { syncUtilities } from '@/lib/rules/utilities';
import { cn } from '@/lib/utils';
import { ADMIN_SETTINGS_EVENT, readAdminSettings } from '@/lib/admin-settings';

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
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const scrollPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    let savedLibrary: unknown = null; let legacyDraft: unknown = null;
    try { const rawLibrary = window.localStorage.getItem(CHARACTER_LIBRARY_STORAGE_KEY); if (rawLibrary) savedLibrary = JSON.parse(rawLibrary); const rawLegacy = window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY); if (rawLegacy) legacyDraft = JSON.parse(rawLegacy); } catch {}
    const migrated = migrateCharacterLibrary(savedLibrary, legacyDraft);
    setLibrary({ ...migrated, entries: migrated.entries.map((entry) => ({ ...entry, draft: normalizeDraft(entry.draft, data) })) });
    setHydrated(true);
  }, [data]);
  useEffect(() => { if (!hydrated) return; window.localStorage.setItem(CHARACTER_LIBRARY_STORAGE_KEY, JSON.stringify(library)); const active = activeLibraryEntry(library); if (active) window.localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, JSON.stringify(active.draft)); }, [library, hydrated]);
  useEffect(() => {
    const syncTags = () => setAvailableTags(readAdminSettings().libraryTags);
    syncTags();
    window.addEventListener(ADMIN_SETTINGS_EVENT, syncTags as EventListener);
    return () => window.removeEventListener(ADMIN_SETTINGS_EVENT, syncTags as EventListener);
  }, []);
  useEffect(() => {
    if (!savePromptOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSavePromptOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [savePromptOpen]);

  const draft = activeLibraryEntry(library)?.draft ?? createEmptyCharacterDraft();
  const serialized = comparableDraft(draft);
  const dirty = activeFileId ? serialized !== savedSnapshot : serialized !== comparableDraft(normalizeDraft(createEmptyCharacterDraft(), data));
  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [dirty]);

  const changeTab = (nextTab: string) => {
    scrollPositions.current[tab] = window.scrollY;
    setTab(nextTab);
    window.requestAnimationFrame(() => window.scrollTo({ top: scrollPositions.current[nextTab] ?? 0 }));
  };
  const setDraft: Dispatch<SetStateAction<CharacterDraft>> = (action) => setLibrary((current) => updateActiveDraft(current, (currentDraft) => normalizeDraft(typeof action === 'function' ? (action as (value: CharacterDraft) => CharacterDraft)(currentDraft) : action, data)));
  const loadDraft = (idName: string, value: CharacterDraft) => { const next = normalizeDraft(migrateCharacterDraft(value), data); setDraft(next); setActiveFileId(idName); setSavedSnapshot(comparableDraft(next)); setMessage(`Loaded ${idName}`); changeTab('forge'); };
  const save = async () => {
    setSavePromptOpen(false);
    const response = await fetch('/api/character-files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idName: activeFileId, draft }) });
    if (!response.ok) return setMessage('Save failed.');
    const value = await response.json(); setActiveFileId(value.idName); setSavedSnapshot(comparableDraft(draft)); setLibraryRefresh((key) => key + 1); setMessage(`Saved ${value.idName}`);
  };
  const revert = async () => { if (!activeFileId) return; const response = await fetch(`/api/character-files/${encodeURIComponent(activeFileId)}`, { cache: 'no-store' }); if (!response.ok) return setMessage('Revert failed.'); const value = await response.json(); loadDraft(activeFileId, value.draft); };
  const reset = () => { const empty = normalizeDraft(createEmptyCharacterDraft(), data); setDraft({ ...empty, completedSteps: [] }); setActiveFileId(null); setSavedSnapshot(''); setMessage('Forge reset to a new character.'); };

  return <main className={cn(tab === 'sheet' ? 'h-dvh overflow-hidden' : 'min-h-screen', 'p-2 md:p-8')}>
    <Tabs value={tab} onValueChange={changeTab} className={cn('w-full', tab === 'sheet' && 'flex h-full min-h-0 flex-col')}>
      <div data-forge-modal-background className="sticky top-0 z-50 shrink-0 bg-white py-2 print:hidden">
        <div className="mx-auto flex w-full max-w-[1080px] items-center gap-2">
          <TabsList className="grid min-w-0 flex-1 grid-cols-3"><TabsTrigger value="forge">Forge</TabsTrigger><TabsTrigger value="sheet">Sheet</TabsTrigger><TabsTrigger value="library">Library</TabsTrigger></TabsList>
          <Button asChild variant="outline"><a href="/admin">Admin</a></Button>
        </div>
      </div>
      <div className={cn('pt-2', tab === 'sheet' && 'min-h-0 flex-1')}>
        <TabsContent value="forge"><div data-forge-modal-background className="mx-auto mb-3 flex max-w-[1440px] flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3"><div className="min-w-0 text-sm"><div className="truncate font-medium">{activeFileId ?? 'Unsaved character'}{dirty && <span className="ml-2 text-xs text-[#990000]">Unsaved changes</span>}</div>{message && <div className="text-xs text-muted-foreground" role="status" aria-live="polite">{message}</div>}{availableTags.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1"><span className="mr-1 text-xs text-muted-foreground">Library tags</span>{availableTags.map((tag) => { const active = draft.utilities.libraryTags.includes(tag); return <button key={tag} type="button" className={`rounded-full border px-2 py-0.5 text-[11px] ${active ? 'bg-foreground text-background' : 'text-muted-foreground'}`} onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, libraryTags: active ? current.utilities.libraryTags.filter((value) => value !== tag) : [...current.utilities.libraryTags, tag] } }))}>{tag}</button>; })}</div>}</div><div className="ml-auto flex gap-2"><Button variant="outline" disabled={!activeFileId || !dirty} onClick={() => void revert()}>Revert</Button><Button disabled={!dirty} onClick={() => setSavePromptOpen(true)}>Save</Button></div></div><Worksheet data={data} draft={draft} setDraft={setDraft} onReset={reset} /></TabsContent>
        <TabsContent value="sheet" className="h-full min-h-0"><div className="mx-auto h-full min-h-0 w-full max-w-[1200px]"><ExpandedCharacterSheet draft={draft} data={data} /></div></TabsContent>
        <TabsContent value="library"><CharacterLibraryPanel data={data} refreshKey={libraryRefresh} onOpen={loadDraft} /></TabsContent>
      </div>
    </Tabs>
    {savePromptOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 print:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSavePromptOpen(false); }}><div role="dialog" aria-modal="true" aria-labelledby="save-character-title" className="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl"><h2 id="save-character-title" className="text-lg font-semibold">Save character?</h2><p className="mt-2 text-sm text-muted-foreground">Approve to write the current Forge state to {activeFileId ? <span className="font-mono">{activeFileId}</span> : 'a new character file'}. Cancel leaves the current changes unsaved.</p><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setSavePromptOpen(false)}>Cancel</Button><Button onClick={() => void save()}>Approve</Button></div></div></div>}
  </main>;
}
