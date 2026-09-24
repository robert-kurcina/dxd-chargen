'use client';

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';
import { ForgeWorkspaceView, LibraryWorkspaceView, SheetWorkspaceView } from './workspace-views';
import { CampaignsView, MapsView } from './campaign-views';
import { useWorkspace } from './workspace-provider';
import SuspenseSpinner from '@/components/suspense-spinner';

const tabs = [{ href: '/', label: 'Design' }, { href: '/profile', label: 'Profile' }, { href: '/sheet', label: 'Sheet' }] as const;
type WorkspaceTab = '/' | '/profile' | '/sheet' | '/library' | '/campaigns' | '/maps';
const workspaceTab = (pathname: string): WorkspaceTab => pathname === '/sheet' || pathname === '/profile' || pathname === '/library' || pathname === '/campaigns' || pathname === '/maps' ? pathname : '/';

export default function WorkspaceShell({ children: _children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab = workspaceTab(pathname);
  const sheet = activeTab === '/sheet';
  const character = activeTab === '/' || activeTab === '/profile';
  const { draft, dirty, saving, save, reset, activeFileId, canUndo, canRedo, undo, redo, rememberHistory, setRememberHistory, historyNotice, storageWarning, message, selectedCampaign, downloadBackup, restoreBackup, setMessage } = useWorkspace();
  const [confirm, setConfirm] = useState<'save' | 'reset' | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const scrollPositions = useRef<Partial<Record<WorkspaceTab, number>>>({});
  useLayoutEffect(() => {
    window.scrollTo(0, scrollPositions.current[activeTab] ?? 0);
    return () => { scrollPositions.current[activeTab] = window.scrollY; };
  }, [activeTab]);
  const [mountedTabs, setMountedTabs] = useState<Set<WorkspaceTab>>(() => new Set([activeTab]));
  useEffect(() => {
    if (menu.current) menu.current.open = false;
    setMountedTabs(current => new Set([...current, activeTab]));
  }, [activeTab]);
  const closeMenu = () => { if (menu.current) menu.current.open = false; };
  const navigation = (mobile: boolean) => <nav aria-label={mobile ? 'Character views' : 'Workspace views'} className={cn('grid grid-cols-3 gap-1', mobile ? 'mx-auto max-w-[600px]' : 'flex-1 rounded-lg bg-muted p-1')}>
    {tabs.map(tab => <Link key={tab.href} href={tab.href} scroll={false} aria-current={activeTab === tab.href ? 'page' : undefined} className={cn('flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium', activeTab === tab.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{tab.label}</Link>)}
  </nav>;
  return <main className={cn(sheet ? 'h-dvh overflow-hidden' : 'min-h-screen', 'p-2 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:p-8')}><div className={cn('w-full', sheet && 'flex h-full min-h-0 flex-col')}>
    <header data-forge-modal-background className="sticky top-0 z-50 h-14 shrink-0 bg-background py-1.5 print:hidden">
      <div className="relative mx-auto flex h-11 w-full max-w-[1080px] items-center gap-2">
        <details ref={menu} className="shrink-0" onKeyDown={event => { if (event.key === 'Escape') { closeMenu(); menu.current?.querySelector('summary')?.focus(); } }}>
          <summary aria-label="Workspace menu" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border [&::-webkit-details-marker]:hidden"><Menu className="h-5 w-5" /></summary>
          <div className="absolute left-0 top-12 z-50 max-h-[calc(100dvh-8rem)] overflow-y-auto w-64 max-w-[calc(100vw-2rem)] rounded-lg border bg-background p-2 shadow-lg">
            <Link href="/campaigns" onClick={closeMenu} className="flex min-h-11 items-center rounded px-3 hover:bg-muted">Campaigns</Link>
            <Link href="/library" onClick={closeMenu} className="flex min-h-11 items-center rounded px-3 hover:bg-muted">Character Library</Link>
            <Link href="/admin" onClick={closeMenu} className="flex min-h-11 items-center rounded px-3 hover:bg-muted">Administration</Link>
            <button type="button" className="min-h-11 w-full rounded px-3 text-left hover:bg-muted" onClick={() => { closeMenu(); downloadBackup(); }}>Download character backup</button>
            <button type="button" className="min-h-11 w-full rounded px-3 text-left hover:bg-muted" onClick={() => { closeMenu(); backupInput.current?.click(); }}>Import character backup…</button>
            <p className="px-3 text-xs text-muted-foreground">Imports create a separate copy. Backups exclude undo history.</p>
            <div className="my-2 border-t" />
            <label className="flex min-h-11 items-center gap-2 px-3 text-sm"><input type="checkbox" checked={rememberHistory} onChange={event => setRememberHistory(event.target.checked)} />Remember undo history</label>
            <p className="px-3 pb-2 text-xs text-muted-foreground">Less than 10 KB per character.</p>
            {historyNotice && <p role="status" className="px-3 pb-2 text-xs">{historyNotice}</p>}
            <div className="my-2 border-t" />
            <button type="button" className="min-h-11 w-full rounded px-3 text-left text-destructive hover:bg-muted" onClick={() => { closeMenu(); setConfirm('reset'); }}>Reset character…</button>
          </div>
        </details>
        <div className="min-w-0 flex-1 lg:hidden">
          <div className="truncate text-sm font-medium">{activeTab === '/campaigns' ? 'Campaigns' : activeTab === '/maps' ? 'Explore origins' : activeTab === '/library' ? 'Character Library' : draft.utilities.name || 'New character'}</div>
          <div className="truncate text-xs text-muted-foreground">{!character && !sheet ? selectedCampaign.name : saving ? 'Saving…' : dirty ? 'Unsaved file changes' : activeFileId ? 'File saved' : 'Local draft'}</div>
        </div>
        <div className="hidden min-w-0 flex-1 lg:block">{navigation(false)}</div>
        <Button className={cn("h-11 shrink-0", !character && !sheet && "hidden")} disabled={!dirty || saving} onClick={() => setConfirm('save')}>Save</Button>
      </div>
    </header>
    <input ref={backupInput} type="file" accept=".json,application/json" aria-label="Import character backup" className="hidden" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      if (file.size > 20 * 1024 * 1024) { setMessage('Import failed. Backups must be smaller than 20 MB. Existing drafts are unchanged.'); return; }
      try { restoreBackup(await file.text()); } catch { setMessage('Import failed. The file could not be read. Existing drafts are unchanged.'); }
    }} />
    {message && <p role="status" className="my-2 text-sm">{message}</p>}
    {storageWarning && <p role="alert" className="my-2 rounded border border-destructive p-2 text-sm">{storageWarning}</p>}
    {character && <div className="flex items-center gap-2 pt-2" aria-label="Edit history">
      <Button variant="outline" size="sm" className="h-11" disabled={!canUndo} onClick={undo}><Undo2 />Undo</Button>
      <Button variant="outline" size="sm" className="h-11" disabled={!canRedo} onClick={redo}><Redo2 />Redo</Button>
      {historyNotice && <span role="status" className="text-xs text-muted-foreground">{historyNotice}</span>}
    </div>}
    <div className={cn('pt-2', sheet && 'min-h-0 flex-1')}>
      {activeTab === '/campaigns' && <CampaignsView />}
      {activeTab === '/maps' && <MapsView />}
      {(mountedTabs.has('/') || mountedTabs.has('/profile') || character) && <section hidden={!character} aria-hidden={!character}><Suspense fallback={<SuspenseSpinner panel label="Loading character…" />}><ForgeWorkspaceView view={activeTab === '/profile' ? 'profile' : 'design'} /></Suspense></section>}
      {(mountedTabs.has('/sheet') || sheet) && <section hidden={!sheet} aria-hidden={!sheet} className="h-full min-h-0"><Suspense fallback={<SuspenseSpinner panel label="Loading Sheet…" className="h-full" />}><SheetWorkspaceView /></Suspense></section>}
      {(mountedTabs.has('/library') || activeTab === '/library') && <section hidden={activeTab !== '/library'} aria-hidden={activeTab !== '/library'}><Suspense fallback={<SuspenseSpinner panel label="Loading Library…" />}><LibraryWorkspaceView /></Suspense></section>}
    </div>
    <div data-forge-modal-background className="fixed inset-x-0 bottom-0 z-40 border-t bg-background px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden print:hidden">{navigation(true)}</div>
    <ConfirmDialog open={confirm === 'save'} title="Save character?" confirmLabel="Save" busy={saving} onCancel={() => setConfirm(null)} onConfirm={() => { void save().then(ok => { if (ok) setConfirm(null); }); }}><p>Write the current character to {activeFileId || 'a new character file'}.</p></ConfirmDialog>
    <ConfirmDialog open={confirm === 'reset'} title="Reset character?" confirmLabel="Reset" onCancel={() => setConfirm(null)} onConfirm={() => { reset(); setConfirm(null); }}><p>Start a new empty draft in the selected campaign. Your current draft remains available in the Library.</p></ConfirmDialog>
  </div></main>;
}
