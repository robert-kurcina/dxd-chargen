'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/confirm-dialog';
import SuspenseSpinner from '@/components/suspense-spinner';
import Worksheet from '@/app/worksheet';
import ExpandedCharacterSheet from '@/app/expanded-character-sheet';
import CharacterLibraryPanel from '@/app/character-library-panel';
import { sortLibraryTags } from '@/lib/admin-settings';
import { LOCAL_CAMPAIGNS, localCampaign, campaignMatches } from '@/lib/local-campaigns';
import PresetGenerationPanel from './preset-generation-panel';
import { useWorkspace } from './workspace-provider';

export function ForgeWorkspaceView({ view = 'design' }: { view?: 'design' | 'profile' }) {
  const { data, draft, setDraft, activeFileId, dirty, message, availableTags, saving, reverting, save, revert, reset } = useWorkspace();
  const [confirmOpen, setConfirmOpen] = useState(false);
  return <>
    <div data-forge-modal-background className="mx-auto mb-3 hidden max-w-[1440px] lg:flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
      <div className="min-w-0 text-sm">
        <div className="truncate font-medium">{activeFileId ? <><span>Filename: </span><span className="font-mono">{activeFileId}</span></> : 'Unsaved character'}{dirty && <span className="ml-2 text-xs text-[#990000]">Unsaved changes</span>}</div>
        {message && <div className="text-xs text-muted-foreground" role="status" aria-live="polite">{message}</div>}
        {availableTags.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1"><span className="mr-1 text-xs text-muted-foreground">Library tags</span>{availableTags.map((tag) => { const active = draft.utilities.libraryTags.includes(tag); return <button key={tag} type="button" className={`rounded-full border px-2 py-0.5 text-[11px] ${active ? 'bg-foreground text-background' : 'text-muted-foreground'}`} onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, libraryTags: sortLibraryTags(active ? current.utilities.libraryTags.filter((value) => value !== tag) : [...current.utilities.libraryTags, tag]) } }))}>{tag}</button>; })}</div>}
      </div>
      <div className="ml-auto flex gap-2">
        <Button variant="outline" disabled={!activeFileId || !dirty || reverting || saving} onClick={() => void revert()}>{reverting ? <SuspenseSpinner compact label="Reverting…" className="text-current" /> : 'Revert'}</Button>
        <Button disabled={!dirty || saving || reverting} onClick={() => setConfirmOpen(true)}>{saving ? <SuspenseSpinner compact label="Saving…" className="text-current" /> : 'Save'}</Button>
      </div>
    </div>
    {view === 'design' && <PresetGenerationPanel />}
    <Worksheet view={view} data={data} draft={draft} setDraft={setDraft} onReset={reset} />
    <ConfirmDialog open={confirmOpen} title="Save character?" confirmLabel="Approve" busy={saving} onCancel={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); void save(); }}><p>Approve to write the current Forge state to {activeFileId ? <span className="font-mono">{activeFileId}</span> : 'a new character file'}. Cancel leaves the current changes unsaved.</p></ConfirmDialog>
  </>;
}

export function SheetWorkspaceView() {
  const { draft, data, activeFileId } = useWorkspace();
  return <div className="mx-auto h-full min-h-0 w-full max-w-[1200px]"><ExpandedCharacterSheet draft={draft} data={data} filename={activeFileId ?? undefined} /></div>;
}

export function LibraryWorkspaceView() {
  const { data, libraryRefresh, loadDraft, localEntries, openLocalDraft } = useWorkspace();
  const [filter, setFilter] = useState<string>('all');
  return <div className="space-y-4">
    <label className="flex flex-wrap items-center gap-2 text-sm font-medium">Campaign
      <select className="h-11 max-w-full rounded-md border bg-background px-3" value={filter} onChange={event => setFilter(event.target.value)}>
        <option value="all">All campaigns</option>{LOCAL_CAMPAIGNS.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
      </select>
    </label>
    <section className="rounded-lg border bg-card p-3"><h2 className="font-semibold">Browser drafts</h2><p className="mb-3 text-xs text-muted-foreground">Saved in this browser. Legacy and unassigned characters appear under Default Campaign.</p>
      <div className="grid gap-2 sm:grid-cols-2">{localEntries.filter(entry => campaignMatches(entry.draft.campaignId, filter)).map(entry => <Button key={entry.id} variant="outline" className="h-auto min-h-14 min-w-0 flex-col items-start whitespace-normal py-2 text-left" onClick={() => openLocalDraft(entry.id)}><span>{entry.draft.utilities.name || 'Unnamed character'}</span><span className="text-xs text-muted-foreground">{localCampaign(entry.draft.campaignId).name}</span></Button>)}</div>
    </section>
    <CharacterLibraryPanel data={data} refreshKey={libraryRefresh} onOpen={loadDraft} campaignFilter={filter} />
  </div>;
}
