'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import ConfirmDialog from '@/components/confirm-dialog';
import { Input } from '@/components/ui/input';
import TokenField from '@/components/token-field';
import { DEFAULT_ADMIN_SETTINGS, readAdminSettings, sortLibraryTags, writeAdminSettings, type AdminSettings } from '@/lib/admin-settings';

type CharacterTagRecord = { libraryTags?: string[] };

export default function GlobalAdminPanel() {
  const [persisted, setPersisted] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [seedValue, setSeedValue] = useState(0);
  const [seedUnlocked, setSeedUnlocked] = useState(false);
  const [tagsUnlocked, setTagsUnlocked] = useState(false);
  const [tagValue, setTagValue] = useState<string[]>([]);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [tagsConfirmOpen, setTagsConfirmOpen] = useState(false);
  const [message, setMessage] = useState('');

  const loadCounts = async (settings: AdminSettings) => {
    try {
      const response = await fetch('/api/character-files', { cache: 'no-store' });
      const payload = response.ok ? await response.json() : { characters: [] };
      const counts = Object.fromEntries(settings.libraryTags.map((tag) => [tag, 0]));
      for (const character of (payload.characters ?? []) as CharacterTagRecord[]) for (const tag of character.libraryTags ?? []) if (tag in counts) counts[tag] += 1;
      setTagCounts(counts);
    } catch { setTagCounts(Object.fromEntries(settings.libraryTags.map((tag) => [tag, 0]))); }
  };

  useEffect(() => {
    const current = readAdminSettings();
    setPersisted(current); setSeedValue(current.randomSeed); setTagValue(current.libraryTags);
    void loadCounts(current);
  }, []);

  const seedDirty = seedValue !== persisted.randomSeed;
  const normalizedTags = useMemo(() => sortLibraryTags(tagValue), [tagValue]);
  const tagsDirty = JSON.stringify(normalizedTags) !== JSON.stringify(persisted.libraryTags);
  const saveSeed = () => {
    const saved = writeAdminSettings({ ...persisted, randomSeed: Math.trunc(seedValue), randomSequence: 0 });
    setPersisted(saved); setSeedValue(saved.randomSeed); setSeedUnlocked(false); setSeedConfirmOpen(false); setMessage(`Global seed saved as ${saved.randomSeed}. Sequence reset to 0.`);
  };
  const saveTags = () => {
    const saved = writeAdminSettings({ ...persisted, libraryTags: normalizedTags });
    setPersisted(saved); setTagValue(saved.libraryTags); setTagsUnlocked(false); setTagsConfirmOpen(false); setMessage('Library tags saved.');
    void loadCounts(saved);
  };
  const revery = () => { setSeedValue(persisted.randomSeed); setSeedUnlocked(false); setMessage('Seed edit reverted.'); };

  return <div className="space-y-4">
    {message && <div className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground" role="status">{message}</div>}
    <Card><CardHeader><CardTitle>Admin Only</CardTitle><CardDescription>Protected global values used by deterministic Forge generation.</CardDescription></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[260px_minmax(0,1fr)] md:items-end"><label className="space-y-1"><span className="text-sm font-medium">Seed number</span><Input type="text" inputMode="numeric" disabled={!seedUnlocked} value={seedValue} onChange={(event) => setSeedValue(Number.parseInt(event.target.value || '0', 10) || 0)} /></label><div className="text-sm text-muted-foreground">Default seed: 0. Current sequence position: {persisted.randomSequence.toLocaleString()}.</div></div>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={seedUnlocked} onCheckedChange={(checked) => { const unlocked = checked === true; setSeedUnlocked(unlocked); if (!unlocked) setSeedValue(persisted.randomSeed); }} /><span>Change Seed Number</span></label>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={revery}>Revery</Button>{seedUnlocked && seedDirty && <Button onClick={() => setSeedConfirmOpen(true)}>Save</Button>}</div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Library</CardTitle><CardDescription>Global tag vocabulary. Tags are displayed in alphanumeric order with the number of filesystem characters currently assigned to each tag.</CardDescription></CardHeader><CardContent className="space-y-4">
      {!tagsUnlocked ? <div className="flex min-h-10 flex-wrap gap-2 rounded-md border bg-muted/30 p-3">{persisted.libraryTags.map((tag) => <span key={tag} className="rounded-full border bg-background px-2.5 py-1 text-xs">{tag} ({tagCounts[tag] ?? 0})</span>)}{!persisted.libraryTags.length && <span className="text-sm text-muted-foreground">No Library tags defined.</span>}</div> : <TokenField value={normalizedTags} onChange={setTagValue} placeholder="Type a tag and press Enter" ariaLabel="Global Library tags" />}
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={tagsUnlocked} onCheckedChange={(checked) => { const unlocked = checked === true; setTagsUnlocked(unlocked); if (!unlocked) setTagValue(persisted.libraryTags); }} /><span>Change Library Tags</span></label>
      {tagsUnlocked && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setTagValue(persisted.libraryTags); setTagsUnlocked(false); setMessage('Library tag edits canceled.'); }}>Cancel</Button>{tagsDirty && <Button onClick={() => setTagsConfirmOpen(true)}>Save</Button>}</div>}
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Global Constraints</CardTitle><CardDescription>Reserved for supported campaign-wide creation limits and constraints.</CardDescription></CardHeader></Card>

    <ConfirmDialog open={seedConfirmOpen} title="Save Seed Number?" onCancel={() => setSeedConfirmOpen(false)} onConfirm={saveSeed}><p>Update the global seed to <strong>{seedValue}</strong>? This resets the deterministic random sequence to its beginning.</p></ConfirmDialog>
    <ConfirmDialog open={tagsConfirmOpen} title="Update Library tags?" onCancel={() => setTagsConfirmOpen(false)} onConfirm={saveTags}><p>Replace the exposed Library tag vocabulary with the current token set? Character tag assignments are not changed by this action.</p></ConfirmDialog>
  </div>;
}
