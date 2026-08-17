'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/confirm-dialog';
import Worksheet from '@/app/worksheet';
import { sortLibraryTags } from '@/lib/admin-settings';
import { useWorkspace } from './workspace-provider';

export default function ForgePage() {
  const { data, draft, setDraft, activeFileId, dirty, message, availableTags, save, revert, reset } = useWorkspace();
  const [confirmOpen, setConfirmOpen] = useState(false);
  return <><div data-forge-modal-background className="mx-auto mb-3 flex max-w-[1440px] flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3"><div className="min-w-0 text-sm"><div className="truncate font-medium">{activeFileId ?? 'Unsaved character'}{dirty && <span className="ml-2 text-xs text-[#990000]">Unsaved changes</span>}</div>{message && <div className="text-xs text-muted-foreground" role="status" aria-live="polite">{message}</div>}{availableTags.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1"><span className="mr-1 text-xs text-muted-foreground">Library tags</span>{availableTags.map((tag) => { const active = draft.utilities.libraryTags.includes(tag); return <button key={tag} type="button" className={`rounded-full border px-2 py-0.5 text-[11px] ${active ? 'bg-foreground text-background' : 'text-muted-foreground'}`} onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, libraryTags: sortLibraryTags(active ? current.utilities.libraryTags.filter((value) => value !== tag) : [...current.utilities.libraryTags, tag]) } }))}>{tag}</button>; })}</div>}</div><div className="ml-auto flex gap-2"><Button variant="outline" disabled={!activeFileId || !dirty} onClick={() => void revert()}>Revert</Button><Button disabled={!dirty} onClick={() => setConfirmOpen(true)}>Save</Button></div></div><Worksheet data={data} draft={draft} setDraft={setDraft} onReset={reset} /><ConfirmDialog open={confirmOpen} title="Save character?" confirmLabel="Approve" onCancel={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); void save(); }}><p>Approve to write the current Forge state to {activeFileId ? <span className="font-mono">{activeFileId}</span> : 'a new character file'}. Cancel leaves the current changes unsaved.</p></ConfirmDialog></>;
}
