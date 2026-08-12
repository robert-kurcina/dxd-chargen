'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Printer } from 'lucide-react';

import type { StaticData } from '@/data';
import CharacterSheet from './character-sheet';
import CharacterLibraryPanel from './character-library-panel';
import Worksheet from './worksheet';
import Info from './info';
import Tests from './tests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createEmptyCharacterDraft, type CharacterDraft } from '@/lib/character-draft';
import {
  activeLibraryEntry,
  addImportedCharacter,
  CHARACTER_LIBRARY_STORAGE_KEY,
  deleteCharacter,
  duplicateCharacter,
  LEGACY_DRAFT_STORAGE_KEY,
  migrateCharacterLibrary,
  newCharacter,
  updateActiveDraft,
  type CharacterLibraryState,
} from '@/lib/character-library';
import { projectCharacterSheet } from '@/lib/character-sheet-projection';
import { syncHeritageGrantedSelections } from '@/lib/rules/background';
import { syncIntrinsics } from '@/lib/rules/intrinsics';
import { syncProficiencies } from '@/lib/rules/proficiencies';
import { syncProperties } from '@/lib/rules/properties';
import { syncUtilities } from '@/lib/rules/utilities';
import { validateCharacterDraft } from '@/lib/rules/finalization';

function normalizeDraft(draft: CharacterDraft, data: StaticData) {
  return syncUtilities(
    syncProperties(
      syncProficiencies(
        syncIntrinsics(syncHeritageGrantedSelections(draft, data), data),
        data,
      ),
      data,
    ),
    data,
  );
}

const INITIAL_TIMESTAMP = '1970-01-01T00:00:00.000Z';

function initialLibraryState(): CharacterLibraryState {
  return {
    schemaVersion: 1,
    activeId: 'initial',
    entries: [{
      id: 'initial',
      createdAt: INITIAL_TIMESTAMP,
      updatedAt: INITIAL_TIMESTAMP,
      draft: createEmptyCharacterDraft(),
    }],
  };
}

export default function CharacterApp({
  data,
  sampleData,
}: {
  data: StaticData;
  sampleData: Parameters<typeof CharacterSheet>[0]['characterData'];
}) {
  const [library, setLibrary] = useState<CharacterLibraryState>(initialLibraryState);
  const [tab, setTab] = useState('forge');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let savedLibrary: unknown = null;
    let legacyDraft: unknown = null;
    try {
      const rawLibrary = window.localStorage.getItem(CHARACTER_LIBRARY_STORAGE_KEY);
      if (rawLibrary) savedLibrary = JSON.parse(rawLibrary);
      const rawLegacy = window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY);
      if (rawLegacy) legacyDraft = JSON.parse(rawLegacy);
    } catch {
      // A malformed local value is ignored; migration will create a fresh library.
    }
    const migrated = migrateCharacterLibrary(savedLibrary, legacyDraft);
    setLibrary({
      ...migrated,
      entries: migrated.entries.map((entry) => ({ ...entry, draft: normalizeDraft(entry.draft, data) })),
    });
    setHydrated(true);
  }, [data]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CHARACTER_LIBRARY_STORAGE_KEY, JSON.stringify(library));
    const active = activeLibraryEntry(library);
    if (active) window.localStorage.setItem(LEGACY_DRAFT_STORAGE_KEY, JSON.stringify(active.draft));
  }, [library, hydrated]);

  const active = activeLibraryEntry(library);
  const draft = active?.draft ?? createEmptyCharacterDraft();
  const sheet = useMemo(() => projectCharacterSheet(draft, data), [draft, data]);
  const validation = useMemo(() => validateCharacterDraft(draft, data), [draft, data]);

  const setDraft: Dispatch<SetStateAction<CharacterDraft>> = (action) => {
    setLibrary((current) => updateActiveDraft(current, (currentDraft) => normalizeDraft(
      typeof action === 'function'
        ? (action as (value: CharacterDraft) => CharacterDraft)(currentDraft)
        : action,
      data,
    )));
  };

  const selectCharacter = (id: string) => setLibrary((current) => ({ ...current, activeId: id }));

  return (
    <main className="flex h-screen flex-col p-4 md:p-8">
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 w-full flex-1 flex-col">
        <div className="shrink-0">
          <div className="sticky top-0 z-30 bg-white py-2 print:hidden">
            <TabsList className="mx-auto grid w-full max-w-[1080px] grid-cols-6">
              <TabsTrigger value="forge">Forge</TabsTrigger>
              <TabsTrigger value="sheet">Sheet</TabsTrigger>
              <TabsTrigger value="library">Library</TabsTrigger>
              <TabsTrigger value="sample">Sample</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 [grid-template-areas:stack] pt-2">
          <TabsContent value="forge" className="[grid-area:stack] overflow-y-auto">
            <Worksheet data={data} draft={draft} setDraft={setDraft} />
          </TabsContent>
          <TabsContent value="sheet" className="[grid-area:stack] overflow-y-auto print:overflow-visible">
            <div className="mx-auto mb-3 flex w-full max-w-[960px] flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">Finished CRS projection</span>
                <Badge variant={validation.ready ? 'default' : 'secondary'}>{validation.ready ? 'Ready' : `${validation.incompleteSteps} incomplete`}</Badge>
                {validation.warningSteps > 0 && <Badge variant="outline">{validation.warningSteps} warning steps</Badge>}
              </div>
              <Button variant="outline" onClick={() => window.print()}><Printer />Print / Save PDF</Button>
            </div>
            <CharacterSheet characterData={sheet} />
          </TabsContent>
          <TabsContent value="library" className="[grid-area:stack] overflow-y-auto">
            <CharacterLibraryPanel
              data={data}
              library={library}
              onSelect={selectCharacter}
              onNew={() => setLibrary((current) => newCharacter(current))}
              onDuplicate={(id) => setLibrary((current) => duplicateCharacter(current, id))}
              onDelete={(id) => setLibrary((current) => deleteCharacter(current, id))}
              onImport={(value) => setLibrary((current) => {
                const next = addImportedCharacter(current, value);
                return {
                  ...next,
                  entries: next.entries.map((entry) => entry.id === next.activeId ? { ...entry, draft: normalizeDraft(entry.draft, data) } : entry),
                };
              })}
              onEdit={() => setTab('forge')}
              onOpenSheet={() => setTab('sheet')}
            />
          </TabsContent>
          <TabsContent value="sample" className="[grid-area:stack] overflow-y-auto">
            <CharacterSheet characterData={sampleData} />
          </TabsContent>
          <TabsContent value="tests" className="[grid-area:stack] overflow-y-auto">
            <Tests data={data} />
          </TabsContent>
          <TabsContent value="info" className="[grid-area:stack] overflow-y-auto">
            <Info data={data} />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
