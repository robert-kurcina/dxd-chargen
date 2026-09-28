'use client';

import { useEffect, useState } from 'react';
import type { StaticData } from '@/data';
import type { CharacterDraft } from '@/lib/character-draft';
import { libraryTagMatches } from '@/lib/campaign-origins';
import { campaignMatches } from '@/lib/local-campaigns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ExpandedCharacterSheet from '@/app/expanded-character-sheet';

type AccountCharacter = {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
  private: boolean;
  canEdit: boolean;
  version: number;
  updatedAt: number;
  name: string;
  libraryTags: string[];
};
type AccountState = 'loading' | 'ready' | 'signed-out' | 'offline';
type AccountDetail = { id: string; version: number; currentVersion: number; private: boolean; canEdit: boolean; draft: CharacterDraft; error?: string };
type AccountVersion = { version: number; editedAt: number; editedBy: string };

export default function AccountCharacterLibraryPanel({
  data, refreshKey, campaignFilter, tagFilter, accountPrivate, setAccountPrivate, saving, accountDirty, hasAccountRecord, onSave, onOpen,
}: {
  data: StaticData;
  refreshKey: number;
  campaignFilter: string;
  tagFilter: string;
  accountPrivate: boolean;
  setAccountPrivate: (value: boolean) => void;
  saving: boolean;
  accountDirty: boolean;
  hasAccountRecord: boolean;
  onSave: () => Promise<boolean>;
  onOpen: (id: string, draft: CharacterDraft, version: number, isPrivate: boolean, restoreFromVersion?: number) => void;
}) {
  const [state, setState] = useState<AccountState>('loading');
  const [characters, setCharacters] = useState<AccountCharacter[]>([]);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ id: string; draft: CharacterDraft } | null>(null);
  const [savingCopy, setSavingCopy] = useState(false);
  const [versionLists, setVersionLists] = useState<Record<string, AccountVersion[]>>({});
  const [loadingVersions, setLoadingVersions] = useState<Set<string>>(new Set());
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const reload = async () => {
    setError(''); setState('loading');
    try {
      const response = await fetch('/api/auth/characters', { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 503 || response.status === 404) { setState('offline'); return; }
      if (response.status === 401) { setState('signed-out'); return; }
      const result = await response.json().catch(() => ({})) as { characters?: AccountCharacter[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? `Account Library request failed (${response.status}).`);
      setCharacters(result.characters ?? []); setState('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to read the Account Library.'); setState('ready');
    }
  };

  useEffect(() => { void reload(); }, [refreshKey]);

  const visible = characters.filter(character => campaignMatches(character.campaignId, campaignFilter) && libraryTagMatches(character.libraryTags, tagFilter));
  const open = async (character: AccountCharacter) => {
    setError('');
    try {
      const response = await fetch(`/api/auth/characters/${character.id}`, { cache: 'no-store', credentials: 'same-origin' });
      const detail = await response.json().catch(() => ({})) as AccountDetail;
      if (!response.ok) throw new Error(detail.error ?? `Character could not be loaded (${response.status}).`);
      if (detail.canEdit) onOpen(detail.id, detail.draft, detail.currentVersion, detail.private);
      else setPreview({ id: detail.id, draft: detail.draft });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Character could not be loaded.'); }
  };
  const saveCurrent = async () => {
    setSavingCopy(true);
    try { await onSave(); }
    finally { setSavingCopy(false); }
  };
  const toggleVersions = async (character: AccountCharacter) => {
    if (expandedVersions.has(character.id)) {
      setExpandedVersions(current => { const next = new Set(current); next.delete(character.id); return next; });
      return;
    }
    setExpandedVersions(current => new Set(current).add(character.id));
    if (versionLists[character.id]) return;
    setLoadingVersions(current => new Set(current).add(character.id));
    try {
      const response = await fetch(`/api/auth/characters/${character.id}/versions`, { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json().catch(() => ({})) as { versions?: AccountVersion[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? `Version history request failed (${response.status}).`);
      setVersionLists(current => ({ ...current, [character.id]: result.versions ?? [] }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to read saved versions.');
      setExpandedVersions(current => { const next = new Set(current); next.delete(character.id); return next; });
    } finally { setLoadingVersions(current => { const next = new Set(current); next.delete(character.id); return next; }); }
  };
  const openVersion = async (character: AccountCharacter, version: AccountVersion) => {
    setError('');
    try {
      const response = await fetch(`/api/auth/characters/${character.id}/versions/${version.version}`, { cache: 'no-store', credentials: 'same-origin' });
      const detail = await response.json().catch(() => ({})) as AccountDetail;
      if (!response.ok) throw new Error(detail.error ?? `Saved version could not be loaded (${response.status}).`);
      if (detail.canEdit) onOpen(detail.id, detail.draft, detail.currentVersion, detail.private, detail.version);
      else setPreview({ id: detail.id, draft: detail.draft });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Saved version could not be loaded.'); }
  };

  return <section className="space-y-3 rounded-lg border bg-card p-3" aria-labelledby="account-library-heading">
    <header><h2 id="account-library-heading" className="font-semibold">Account Library</h2><p className="text-xs text-muted-foreground">Shared, non-private campaign characters and your private characters. Server permissions decide what appears and whether you can edit it.</p></header>
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" className="min-h-11" disabled={saving || savingCopy || (hasAccountRecord && !accountDirty)} onClick={() => void saveCurrent()}>{saving || savingCopy ? 'Saving…' : hasAccountRecord ? 'Save Account character' : 'Save current character to Account Library'}</Button>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={accountPrivate} disabled={saving || savingCopy} onChange={event => setAccountPrivate(event.target.checked)} />Private</label>
      <Button variant="ghost" className="min-h-11" disabled={state === 'loading'} onClick={() => void reload()}>Refresh</Button>
    </div>
    <p className="text-xs text-muted-foreground">New account saves are unassigned from a campaign and do not change the local/file copy. Private status applies when you save to the Account Library.</p>
    {state === 'loading' && <p role="status" className="py-2 text-sm text-muted-foreground">Loading account characters…</p>}
    {state === 'offline' && <p role="status" className="rounded-md bg-muted p-3 text-sm">The local account service is offline. Your browser and file characters remain available.</p>}
    {state === 'signed-out' && <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted p-3 text-sm"><span>Sign in with a verified account to use the Account Library.</span><Link className="underline" href="/account">Sign in or create an account</Link></div>}
    {state === 'ready' && <>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!visible.length ? <p className="py-2 text-sm text-muted-foreground">No account characters match these campaign and tag filters.</p> : <ul className="space-y-2">{visible.map(character => <li key={character.id} className="space-y-2 rounded-lg border p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm"><p className="truncate font-medium">{character.name || 'Unnamed character'}{character.private && <span className="ml-2 rounded border px-1.5 py-0.5 text-xs">Private</span>}</p><p className="text-xs text-muted-foreground">{character.campaignName || 'Unassigned'} · Version {character.version} · {new Date(character.updatedAt).toLocaleString()}</p><p className="text-xs text-muted-foreground">{character.libraryTags.join(', ') || 'No tags'}{character.canEdit ? ' · Editable' : ' · View only'}</p></div>
          <div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" className="min-h-11" aria-expanded={expandedVersions.has(character.id)} onClick={() => void toggleVersions(character)}>{expandedVersions.has(character.id) ? 'Hide versions' : 'Show version history'}</Button><Button variant={character.canEdit ? 'default' : 'outline'} className="min-h-11" onClick={() => void open(character)}>{character.canEdit ? 'Open to edit' : 'View sheet'}</Button></div>
        </div>
        {expandedVersions.has(character.id) && <div className="space-y-2 border-t pt-2" aria-label={`Saved versions for ${character.name || 'character'}`}>
          {loadingVersions.has(character.id) && <p role="status" className="text-sm text-muted-foreground">Loading saved versions…</p>}
          {!loadingVersions.has(character.id) && (versionLists[character.id] ?? []).map(version => <div key={version.version} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Version {version.version}{version.version === character.version ? ' · Current' : ''} · {new Date(version.editedAt).toLocaleString()}</span><Button variant="outline" size="sm" className="min-h-10" disabled={version.version === character.version && character.canEdit} onClick={() => void openVersion(character, version)}>{character.canEdit ? version.version === character.version ? 'Current version' : `Restore version ${version.version}` : `View version ${version.version}`}</Button></div>)}
        </div>}
      </li>)}</ul>}
    </>}
    {preview && <div className="space-y-2 rounded-lg border p-2 sm:p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Read-only character sheet</h3><Button variant="outline" className="min-h-10" onClick={() => setPreview(null)}>Close</Button></div><div className="max-h-[80dvh] overflow-auto"><ExpandedCharacterSheet draft={preview.draft} data={data} filename={preview.id} /></div></div>}
  </section>;
}
