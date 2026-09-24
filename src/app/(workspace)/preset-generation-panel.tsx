'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { localCampaign } from '@/lib/local-campaigns';
import { originEligibility } from '@/lib/campaign-origins';
import { makeCatalogId } from '@/data/catalog-policy';
import { creationContext, generatePreset, inputLabel, LOCK_SECTIONS, mechanicalPresets } from '@/lib/rules/preset-generation';
import { useWorkspace } from './workspace-provider';

const selectClass = 'min-h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm';

export default function PresetGenerationPanel() {
  const { data, draft, setDraft, setMessage } = useWorkspace();
  const context = creationContext(draft);
  const presets = mechanicalPresets(data);
  const [tag, setTag] = useState('all');
  const [presetId, setPresetId] = useState(context.presetId ?? presets[0]?.id ?? '');
  const [speciesId, setSpeciesId] = useState('');
  const [lineageId, setLineageId] = useState('');
  const groups = data.species.filter(family => family.selectable).flatMap(family => family.groups.filter(group => group.selectable));
  const group = groups.find(item => item.catalogId === speciesId);
  const filteredPresets = presets.filter(preset => tag === 'all' || preset.tags.includes(tag));
  const tags = Array.from(new Set(presets.flatMap(preset => preset.tags))).sort();
  const locks = new Set(context.locks);
  const changeLocks = (paths: string[], enabled: boolean) => setDraft(current => {
    const creation = creationContext(current);
    const next = new Set(creation.locks);
    for (const path of paths) { if (enabled) next.add(path); else next.delete(path); }
    return { ...current, creation: { ...creation, locks: [...next] } };
  });

  return <details className="mx-auto mb-4 max-w-[1440px] rounded-lg border bg-card">
    <summary className="min-h-11 cursor-pointer px-4 py-3 font-semibold">Presets and generation locks <span className="text-xs font-normal text-muted-foreground">({locks.size} locked)</span></summary>
    <div className="space-y-4 border-t p-4">
      <p className="text-sm text-muted-foreground">Choose a Rank 1 starting configuration, spin, then adjust it in Design. Each spin replaces unlocked generated choices and can be undone. Notes, portraits, relationships and possessions stay with the character. Review spells, gear and remaining rule choices before play.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="min-w-0 space-y-1 text-sm">Preset tag<select aria-label="Preset tag" className={selectClass} value={tag} onChange={event => {
          const value = event.target.value; setTag(value);
          const matching = presets.filter(p => value === 'all' || p.tags.includes(value));
          if (!matching.some(p => p.id === presetId)) setPresetId(matching[0]?.id ?? '');
        }}><option value="all">All presets</option>{tags.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="min-w-0 space-y-1 text-sm">Mechanical preset<select aria-label="Mechanical preset" className={selectClass} value={presetId} onChange={event => setPresetId(event.target.value)}>{filteredPresets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>
        <label className="min-w-0 space-y-1 text-sm">Ancestral Group<select aria-label="Ancestral Group" className={selectClass} value={speciesId} onChange={event => { setSpeciesId(event.target.value); setLineageId(''); }}><option value="">Random, respecting locks</option>{groups.map(item => <option key={item.catalogId} value={item.catalogId}>{item.name}</option>)}</select></label>
        <label className="min-w-0 space-y-1 text-sm">Lineage<select aria-label="Lineage" className={selectClass} value={lineageId} disabled={!group} onChange={event => setLineageId(event.target.value)}><option value="">Random, respecting locks</option>{group?.lineages.map(name => <option key={name} value={makeCatalogId('lineage', name)}>{name}</option>)}</select></label>
      </div>
      <Button type="button" className="min-h-11" disabled={!presetId} onClick={() => setDraft(current => {
        const generated = generatePreset(current, data, { presetId, speciesId, lineageId }, originEligibility(localCampaign(current.campaignId).originPolicy));
        setMessage('Character generated. Undo restores the previous character; review the remaining Design steps before play.');
        return generated;
      })}>Spin character</Button>
      {context.presetId && <div className="flex flex-wrap gap-2" aria-label="Next steps after generation">
        <Button asChild variant="outline" className="min-h-11"><Link href="/profile">Inspect character and remaining choices</Link></Button>
        <Button asChild variant="outline" className="min-h-11"><Link href="/sheet">Open printable sheet</Link></Button>
      </div>}
      <p className="text-xs text-muted-foreground">Locks protect generation inputs, including the Generate buttons in Design. You can still edit locked values manually. Derived values recalculate. The attribute creation method stays as selected in Design.</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(LOCK_SECTIONS).map(([section, paths]) => {
          const count = paths.filter(path => locks.has(path)).length;
          return <details key={section} className="min-w-0 rounded-md border p-3">
            <summary className="min-h-8 cursor-pointer text-sm font-medium">{section} <span className="text-xs text-muted-foreground">{count}/{paths.length} locked</span></summary>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" checked={count === paths.length} onChange={event => changeLocks(paths, event.target.checked)} aria-label={`Lock ${section} section`} />Lock section</label>
            {paths.map(path => <label key={path} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={locks.has(path)} onChange={event => changeLocks([path], event.target.checked)} aria-label={`Lock ${inputLabel(path)}`} />{inputLabel(path)}</label>)}
          </details>;
        })}
      </div>
    </div>
  </details>;
}
