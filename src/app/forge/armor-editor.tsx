'use client';

import SuspenseSpinner from '@/components/suspense-spinner';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';

import type { StaticData } from '@/data';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CharacterDraft } from '@/lib/character-draft';
import {
  addArmorComponent,
  applyArmorDecomposition,
  armorCandidateConflict,
  armorCoverageRatings,
  armorDecompositionConflict,
  armorDecompositionSuggestions,
  armorEditorProfile,
  armorItemsByKind,
  armorOccupancyReport,
  armorRequiresSide,
  armorSelectionCoverageAtoms,
  pickArmorSet,
  pickArmorSlot,
  selectedArmorByKind,
  selectedArmorDefinition,
  setArmorComponentQuantity,
  setArmorComponentSide,
  setFieldArmorConstruction,
  startCustomArmor,
  type ArmorSide,
} from '@/lib/rules/armor';
import { adjustedGearValues, displayInventoryName, gearSizeAdjustment } from '@/lib/rules/utilities';
import { cn, formatNumberWithCommas } from '@/lib/utils';

type Props = {
  data: StaticData;
  draft: CharacterDraft;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
};

function formatTraits(traits: string[]) {
  return traits.length ? traits.map((trait) => trait.replace(/^\[|\]$/g, '')).join(', ') : '—';
}

function conflictLabel(conflict: ReturnType<typeof armorCandidateConflict>) {
  if (!conflict) return null;
  return conflict.atoms.length ? `${conflict.reason} ${conflict.atoms.join(', ')}` : conflict.reason;
}

type ArmorResetSnapshot = {
  armor: CharacterDraft['utilities']['armor'];
  armorEditor: CharacterDraft['utilities']['armorEditor'];
};

function armorResetSnapshot(draft: CharacterDraft): ArmorResetSnapshot {
  return {
    armor: draft.utilities.armor.map((selection) => ({ ...selection })),
    armorEditor: draft.utilities.armorEditor ? { ...draft.utilities.armorEditor } : undefined,
  };
}

function armorStateSignature(draft: CharacterDraft) {
  return JSON.stringify({
    armor: draft.utilities.armor,
    armorEditor: draft.utilities.armorEditor ?? null,
  });
}

function SlotSelect({ title, kind, data, draft, setDraft }: Props & { title: string; kind: 'helmet' | 'shield' | 'gear' }) {
  const options = armorItemsByKind(data, kind);
  const selected = selectedArmorByKind(draft, data, kind)[0];
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <Select
        value={selected?.catalogId ?? 'none'}
        onValueChange={(value) => setDraft((current) => pickArmorSlot(current, kind, value === 'none' ? null : value, data))}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {options.map((item) => {
            const conflict = kind === 'helmet' ? armorCandidateConflict(draft, data, item, undefined, selected?.id) : null;
            return <SelectItem key={item.catalogId} value={item.catalogId} disabled={Boolean(conflict)}>{displayInventoryName(item.name)}{conflict ? ' — overlaps armor' : ''}</SelectItem>;
          })}
        </SelectContent>
      </Select>
      {selected && (() => {
        const definition = selectedArmorDefinition(selected, data);
        if (!definition) return null;
        const values = adjustedGearValues('armor', definition, draft, data, selected.sizedForSiz);
        const atoms = armorSelectionCoverageAtoms(selected, definition);
        return <div className="text-xs text-muted-foreground">D {values.deflectRating ?? 0} • AR {values.armorRating ?? 0} • {formatNumberWithCommas(values.weight)}# • {formatNumberWithCommas(Number(values.priceSp ?? values.priceGp * 10))} sp{kind === 'helmet' && atoms.length ? ` • ${atoms.join(', ')}` : ''}</div>;
      })()}
    </div>
  );
}

const SVG_ATOMS = new Set([
  'skull', 'face', 'neck (front)', 'neck (back)', 'upper chest', 'chest', 'abdomen', 'upper back', 'lower back',
  ...['left', 'right'].flatMap((side) => ['shoulder', 'upper arm', 'elbow', 'forearm', 'hand'].map((part) => `${part} (${side})`)),
  ...['left', 'right'].flatMap((side) => ['thigh', 'knee', 'shin', 'foot'].map((part) => `${part} (${side})`)),
]);

const INKSCAPE_NAMESPACE = 'http://www.inkscape.org/namespaces/inkscape';

const COVERAGE_COLORS = {
  red: '#dc2626',
  orange: '#f59e0b',
  yellow: '#f2c94c',
  green: '#2f8f46',
  blue: '#5874a6',
} as const;

function coverageColor(armorRating: number) {
  if (armorRating <= 0) return null;
  if (armorRating <= 2) return COVERAGE_COLORS.red;
  if (armorRating <= 11) return COVERAGE_COLORS.orange;
  if (armorRating <= 17) return COVERAGE_COLORS.yellow;
  if (armorRating <= 23) return COVERAGE_COLORS.green;
  return COVERAGE_COLORS.blue;
}

export function ArmorCoveragePanel({ data, draft }: Pick<Props, 'data' | 'draft'>) {
  const [markup, setMarkup] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const report = armorOccupancyReport(draft, data);
  const coverage = useMemo(() => armorCoverageRatings(draft, data), [draft, data]);
  const femaleSilhouette = draft.background.sex === 'Female'
    || (draft.background.sex === 'Intersex' && draft.background.gender === 'Female');
  const silhouette = femaleSilhouette ? 'female' : 'male';
  const coverageKey = [...coverage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([atom, armorRating]) => `${atom.toLowerCase()}:${armorRating}`)
    .join('|');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadFailed(false);
    setMarkup('');
    fetch(`/armor/hit-locations_${silhouette}.svg`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Coverage silhouette returned ${response.status}.`);
        return response.text();
      })
      .then((source) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(source, 'image/svg+xml');
        if (doc.querySelector('parsererror')) throw new Error('Coverage silhouette is invalid SVG.');
        doc.querySelectorAll('script').forEach((node) => node.remove());
        const effectiveAr = new Map([...coverage.entries()].map(([atom, value]) => [atom.toLowerCase(), value]));
        doc.querySelectorAll('*').forEach((node) => {
          for (const attribute of Array.from(node.attributes)) if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
          const label = (node.getAttributeNS(INKSCAPE_NAMESPACE, 'label') ?? node.getAttribute('inkscape:label') ?? '').toLowerCase();
          if (!SVG_ATOMS.has(label)) return;
          const color = coverageColor(effectiveAr.get(label) ?? 0);
          // AR 0 deliberately preserves the authored SVG fill for that body object.
          if (!color) return;
          const svgNode = node as SVGElement;
          svgNode.style.fill = color;
          svgNode.style.fillOpacity = '1';
          svgNode.style.stroke = '#111111';
          svgNode.style.strokeWidth = '1px';
          svgNode.style.strokeLinejoin = 'round';
          svgNode.setAttribute('vector-effect', 'non-scaling-stroke');
        });
        const root = doc.documentElement;
        root.removeAttribute('width');
        root.removeAttribute('height');
        root.setAttribute('style', 'display:block;width:100%;height:auto;max-height:380px');
        setMarkup(root.outerHTML);
        setLoading(false);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setMarkup('');
        setLoadFailed(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [coverage, coverageKey, silhouette]);

  const legend = [
    ['AR 1–2', COVERAGE_COLORS.red],
    ['AR 3–11', COVERAGE_COLORS.orange],
    ['AR 12–17', COVERAGE_COLORS.yellow],
    ['AR 18–23', COVERAGE_COLORS.green],
    ['AR 24+', COVERAGE_COLORS.blue],
  ];

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Visual Armor Coverage</h3>
          <p className="mt-1 text-xs text-muted-foreground">Effective SIZ-adjusted AR by canonical Hit Location. Armor Set no-Hit-Location bonuses do not apply to this view.</p>
        </div>
        <Badge variant="outline">{silhouette === 'female' ? 'Female' : 'Male'} silhouette</Badge>
      </div>
      <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-md border bg-background p-2 sm:min-h-[300px]">
        {loading ? (
          <SuspenseSpinner label="Loading armor silhouette…" />
        ) : markup ? (
          <div className="w-full max-w-[560px]" aria-label={`${silhouette === 'female' ? 'Female' : 'Male'} armor body coverage`} dangerouslySetInnerHTML={{ __html: markup }} />
        ) : loadFailed ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Armor silhouette unavailable.</div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>AR 0 = default</span>
        {legend.map(([label, color]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-black" style={{ backgroundColor: color }} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
      {report.unresolvedSides.length > 0 && (
        <div className="text-xs text-muted-foreground">One-side components remain uncolored until Left or Right is assigned.</div>
      )}
    </section>
  );
}

function ArmorSummary({ data, draft }: Pick<Props, 'data' | 'draft'>) {
  const profile = armorEditorProfile(draft, data);
  const size = gearSizeAdjustment(draft);
  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" />Personal Armor result</div>
          <div className="mt-1 text-xs text-muted-foreground">Armor Sets are convenient abstractions. Detailed sectional coverage is used only when the fiction needs it. Cost and Weight include Suit, Helm, Shield, and Gear.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">SIZ {size?.presumedSiz ?? 12}</Badge>
          <Badge variant={profile.suit?.canonical ? 'secondary' : 'outline'}>{profile.suit?.canonical ? 'Canonical quick-pick' : profile.suit ? 'Custom sectional armor' : 'No Suit'}</Badge>
        </div>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Armor capability</CardTitle></CardHeader><CardContent className="text-sm"><div className="font-medium">{profile.suit?.suitClass ? `Armor, ${profile.suit.suitClass}` : 'None'}</div><div className="text-xs text-muted-foreground">{profile.suit?.canonical ? profile.suit.displayName : profile.suit?.displayName ?? '—'}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Deflect</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{profile.suit?.deflect ?? 0}</div>{profile.suit?.mode === 'preset' && profile.suit.deflect !== profile.suit.rawDeflect && <div className="text-xs text-muted-foreground">D {profile.suit.rawDeflect} by Hit Location</div>}{profile.suit?.mode === 'custom' && profile.suit.frontDeflect !== profile.suit.rearDeflect && <div className="text-xs text-muted-foreground">Front {profile.suit.frontDeflect} • Rear {profile.suit.rearDeflect}</div>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Armor Rating</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{profile.suit?.armorRating ?? 0}</div>{profile.suit?.mode === 'preset' && profile.suit.armorRating !== profile.suit.rawArmorRating && <div className="text-xs text-muted-foreground">AR {profile.suit.rawArmorRating} by Hit Location</div>}{profile.suit?.mode === 'custom' && profile.suit.frontArmorRating !== profile.suit.rearArmorRating && <div className="text-xs text-muted-foreground">Front {profile.suit.frontArmorRating} • Rear {profile.suit.rearArmorRating}</div>}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Total Weight</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{formatNumberWithCommas(profile.totalWeight)}#</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Total Cost</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{formatNumberWithCommas(profile.totalCostGp * 10)} sp</div><div className="text-xs text-muted-foreground">{formatNumberWithCommas(profile.totalCostGp)} gp equivalent</div></CardContent></Card>
      </div>
      <div className="grid gap-2 text-xs [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
        {[profile.suit ? { label: 'Suit', name: profile.suit.displayName, d: profile.suit.deflect, ar: profile.suit.armorRating, traits: profile.suit.traits } : null, profile.helmet ? { label: 'Helm', name: profile.helmet.displayName, d: profile.helmet.deflect, ar: profile.helmet.armorRating, traits: profile.helmet.traits } : null, profile.shield ? { label: 'Shield', name: profile.shield.displayName, d: profile.shield.deflect, ar: profile.shield.armorRating, traits: profile.shield.traits } : null, profile.gear ? { label: 'Gear', name: profile.gear.displayName, d: profile.gear.deflect, ar: profile.gear.armorRating, traits: profile.gear.traits } : null].filter(Boolean).map((row) => row && <div key={row.label} className="rounded-md border bg-background p-2"><div className="font-semibold">{row.label}: {row.name}</div><div className="text-muted-foreground">D {row.d} • AR {row.ar} • {formatTraits(row.traits)}</div></div>)}
      </div>
      {profile.suit?.mode === 'custom' && <div className="rounded-md border p-2 text-xs">Detailed coverage: Front Torso {profile.suit.coverage.front ? 'yes' : 'no'} • Back Torso {profile.suit.coverage.back ? 'yes' : 'no'} • Arms {profile.suit.coverage.arms}/2 • Legs {profile.suit.coverage.legs}/2. Armor capability is derived from coverage and calculated D/AR; an uncovered Hit Location receives no Suit protection when Hit Locations are used.</div>}
    </section>
  );
}

export default function ArmorEditor({ data, draft, setDraft }: Props) {
  const sets = armorItemsByKind(data, 'set');
  const selectedSet = selectedArmorByKind(draft, data, 'set')[0];
  const sectionals = armorItemsByKind(data, 'sectional');
  const selectedSectionals = selectedArmorByKind(draft, data, 'sectional');
  const profile = armorEditorProfile(draft, data);
  const editor = profile.editor;
  const size = gearSizeAdjustment(draft);
  const occupancy = armorOccupancyReport(draft, data);
  const originSet = editor.originPresetCatalogId ? data.itemArmors.find((item) => item.catalogId === editor.originPresetCatalogId) ?? null : null;
  const decompositionSuggestions = armorDecompositionSuggestions(originSet?.name ?? (selectedSet ? selectedArmorDefinition(selectedSet, data)?.name : null));
  const resetSnapshotRef = useRef<ArmorResetSnapshot>(armorResetSnapshot(draft));
  const resetSignatureRef = useRef(armorStateSignature(draft));
  const armorDirty = armorStateSignature(draft) !== resetSignatureRef.current;
  const noSuitSelected = !selectedSet && selectedSectionals.length === 0;

  const resetArmor = () => {
    const snapshot = resetSnapshotRef.current;
    setDraft((current) => {
      const utilities = {
        ...current.utilities,
        armor: snapshot.armor.map((selection) => ({ ...selection })),
      };
      if (snapshot.armorEditor) utilities.armorEditor = { ...snapshot.armorEditor };
      else delete utilities.armorEditor;
      return { ...current, utilities };
    });
  };

  const componentGroups = Array.from(sectionals.reduce((groups, item) => {
    const location = item.bodyParts || (item.hitLocations?.length ? item.hitLocations.join(' + ') : 'Other Sectional Armor');
    groups.set(location, [...(groups.get(location) ?? []), item]);
    return groups;
  }, new Map<string, typeof sectionals>())).sort(([a], [b]) => a.localeCompare(b));

  const addButton = (item: typeof sectionals[number], side?: ArmorSide) => {
    const conflict = armorCandidateConflict(draft, data, item, side);
    return <Button key={side ?? 'add'} type="button" size="sm" variant="outline" disabled={Boolean(conflict)} title={conflictLabel(conflict) ?? undefined} onClick={() => setDraft((current) => addArmorComponent(current, item.catalogId, data, side))}>{side ? `Add ${side}` : 'Add'}</Button>;
  };

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Personal Armor</h3>
          <p className="mt-1 text-xs text-muted-foreground">Use the simple Armor Set whenever its abstraction is sufficient. Open sectional detail only when component coverage matters to the fiction. Helm, Shield, and one layer of Gear remain separate.</p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={!armorDirty} title="Restore the armor state from when this editor was opened." onClick={resetArmor}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>
      <Accordion type="multiple" defaultValue={['pick-set', 'pick-accessories']} className="space-y-2">
        <AccordionItem value="pick-set" className="rounded-md border px-3">
          <AccordionTrigger>1. Pick Armor Set</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">Light, Medium, Heavy, and Field are abstract capability quick-picks for convenient play and NPC construction. Their listed Hit Locations are guidance, not a requirement that every suit use one exact sectional recipe.</div>
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))]">
              <button type="button" onClick={() => setDraft((current) => pickArmorSet(current, null, data))} className={cn('rounded-md border p-3 text-left transition-colors hover:bg-muted/40', noSuitSelected && 'border-primary bg-muted/30')}>
                <div className="font-medium">No Armor</div>
                <div className="text-xs text-muted-foreground">No suit protection</div>
                <div className="mt-2 text-xs">D 0 • AR 0 • 0#</div>
                <div className="text-xs text-muted-foreground">0 sp • no Suit Hit Locations</div>
                {noSuitSelected && <Badge className="mt-2">Selected</Badge>}
              </button>
              {sets.map((item) => {
                const active = selectedSet?.catalogId === item.catalogId;
                const values = adjustedGearValues('armor', item, draft, data, selectedSet?.catalogId === item.catalogId ? selectedSet.sizedForSiz : undefined);
                const bonus = Number(item.noHitLocationBonus ?? 0);
                return <button key={item.catalogId} type="button" onClick={() => setDraft((current) => pickArmorSet(current, item.catalogId, data))} className={cn('rounded-md border p-3 text-left transition-colors hover:bg-muted/40', active && 'border-primary bg-muted/30')}>
                  <div className="font-medium">Armor, {item.suitClass}</div><div className="text-xs text-muted-foreground">{item.setMaterial}</div>
                  <div className="mt-2 text-xs">D {Number(values.deflectRating ?? 0) + bonus} • AR {Number(values.armorRating ?? 0) + bonus} • {formatNumberWithCommas(values.weight)}#</div>
                  <div className="text-xs text-muted-foreground">{formatNumberWithCommas(Number(values.priceSp ?? values.priceGp * 10))} sp • {item.hitLocations.join(', ')}</div>{active && <Badge className="mt-2">Selected</Badge>}
                </button>;
              })}
            </div>
            {selectedSet && <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setDraft((current) => startCustomArmor(current, data))}>Use sectional detail</Button></div>}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pick-accessories" className="rounded-md border px-3">
          <AccordionTrigger>2. Pick Helmet, Shield, and Gear</AccordionTrigger>
          <AccordionContent><div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]"><SlotSelect title="Helmet" kind="helmet" data={data} draft={draft} setDraft={setDraft} /><SlotSelect title="Shield" kind="shield" data={data} draft={draft} setDraft={setDraft} /><SlotSelect title="Gear" kind="gear" data={data} draft={draft} setDraft={setDraft} /></div></AccordionContent>
        </AccordionItem>

        <AccordionItem value="customize" className="rounded-md border px-3">
          <AccordionTrigger>3. Customize Armor by Component</AccordionTrigger>
          <AccordionContent className="space-y-4">
            {selectedSet && editor.mode !== 'custom' ? <div className="rounded-md border bg-muted/20 p-3 text-sm"><div className="font-medium">{displayInventoryName(selectedSet.name)} is a canonical abstraction.</div><p className="mt-1 text-xs text-muted-foreground">Its D, AR, Weight, Cost, Traits, and broad coverage remain authoritative until detailed sectional armor is needed. Entering sectional detail makes the resulting Suit non-canonical; the quick-pick is retained as a reference rather than treated as a hidden exact recipe.</p><Button className="mt-3" type="button" variant="secondary" onClick={() => setDraft((current) => startCustomArmor(current, data))}>Use sectional detail</Button></div> : <>
              {originSet && <div className="rounded-md border bg-muted/20 p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="font-semibold">Quick-pick reference:</span> {displayInventoryName(originSet.name)} — D {Number(originSet.deflectRating ?? 0) + Number(originSet.noHitLocationBonus ?? 0)}, AR {Number(originSet.armorRating ?? 0) + Number(originSet.noHitLocationBonus ?? 0)}, {originSet.weight}#, {Number(originSet.priceSp ?? originSet.priceGp * 10)} sp.</div><Button type="button" size="sm" variant="outline" onClick={() => setDraft((current) => pickArmorSet(current, originSet.catalogId, data))}>Restore quick-pick</Button></div><div className="mt-1 text-muted-foreground">This is comparison guidance only. There is no single mandatory decomposition of the abstract Armor Set.</div></div>}

              {originSet && selectedSectionals.length === 0 && decompositionSuggestions.length > 0 && <div className="rounded-md border p-3"><div className="text-sm font-medium">Suggested starting decompositions</div><div className="mt-1 text-xs text-muted-foreground">These are plausible detailed interpretations, not hidden definitions of the canonical Armor Set. Every suggestion obeys the same no-overlap rules as manual component selection.</div><div className="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">{decompositionSuggestions.map((suggestion) => { const conflict = armorDecompositionConflict(draft, originSet.catalogId, suggestion.id, data); return <button key={suggestion.id} type="button" disabled={Boolean(conflict)} title={conflictLabel(conflict) ?? undefined} className="rounded-md border p-3 text-left hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setDraft((current) => applyArmorDecomposition(current, originSet.catalogId, suggestion.id, data))}><div className="font-medium">{suggestion.label}</div><div className="mt-1 text-xs text-muted-foreground">{suggestion.description}</div><div className="mt-2 text-xs">{suggestion.components.map((component) => `${component.name.replace(/ × 1$/, '')}${component.side ? ` (${component.side})` : ''}`).join(' + ')}</div>{conflict && <div className="mt-2 text-xs text-destructive">{conflictLabel(conflict)}</div>}</button>; })}</div></div>}

              {occupancy.conflicts.length > 0 && <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-xs"><div className="font-semibold">Existing armor overlap requires correction</div>{occupancy.conflicts.map((conflict) => <div key={`${conflict.aId}-${conflict.bId}`} className="mt-1">{displayInventoryName(conflict.aName)} overlaps {displayInventoryName(conflict.bName)} at {conflict.atoms.join(', ')}.</div>)}</div>}
              {occupancy.unresolvedSides.length > 0 && <div className="rounded-md border p-3 text-xs"><div className="font-semibold">Choose a side for legacy one-side components</div>{occupancy.unresolvedSides.map((entry) => <div key={entry.selectionId} className="mt-2 flex flex-wrap items-center gap-2"><span>{displayInventoryName(entry.name)}</span><Button size="sm" variant="outline" onClick={() => setDraft((current) => setArmorComponentSide(current, entry.selectionId, 'Left', data))}>Left</Button><Button size="sm" variant="outline" onClick={() => setDraft((current) => setArmorComponentSide(current, entry.selectionId, 'Right', data))}>Right</Button></div>)}</div>}


              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]"><div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Derived Armor capability</div><div className="mt-1 font-semibold">{profile.suit?.suitClass ? `Armor, ${profile.suit.suitClass}` : selectedSet ? `Armor, ${selectedArmorDefinition(selectedSet, data)?.suitClass ?? '—'} (quick-pick)` : 'Sectional only'}</div><div className="mt-1 text-xs text-muted-foreground">D {profile.suit?.deflect ?? 0} • AR {profile.suit?.armorRating ?? 0}</div></div><div className="rounded-md border p-3 text-xs text-muted-foreground">The capability is calculated rather than selected once sectional pieces become authoritative. Protection establishes a Light/Medium/Heavy/Field band, while bodily coverage caps that result. Hit Locations remain optional and are consulted only when useful to the fiction.</div></div>

              <label className="flex items-start gap-2 rounded-md border p-3 text-xs"><Checkbox checked={editor.fieldConstruction} onCheckedChange={(checked) => setDraft((current) => setFieldArmorConstruction(current, checked === true))} /><span><span className="font-medium">Field construction</span><span className="ml-1 text-muted-foreground">Use only when the detailed Suit uses integrated, custom-fitted full-body construction. This can qualify a sufficiently protective full-coverage Suit as Field Armor; it does not create a new Trait.</span></span></label>

              <div className="rounded-md border p-3"><div className="mb-3 text-sm font-medium">Helmet, Shield, and Gear detail</div><div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]"><SlotSelect title="Helmet" kind="helmet" data={data} draft={draft} setDraft={setDraft} /><SlotSelect title="Shield" kind="shield" data={data} draft={draft} setDraft={setDraft} /><SlotSelect title="Gear" kind="gear" data={data} draft={draft} setDraft={setDraft} /></div></div>

              {selectedSectionals.length > 0 && <div className="overflow-x-auto rounded-md border"><div className="bg-muted/50 px-3 py-2 text-sm font-semibold">Selected sectional components</div><table className="w-full min-w-[900px] text-sm"><thead className="text-xs"><tr><th className="px-3 py-2 text-left">Component</th><th className="px-3 py-2">Side</th><th className="px-3 py-2">Granular coverage</th><th className="px-3 py-2 text-right">D</th><th className="px-3 py-2 text-right">AR</th><th className="px-3 py-2 text-right">Weight</th><th className="px-3 py-2 text-right">Cost</th><th /></tr></thead><tbody>{selectedSectionals.map((selection) => {
                const definition = selectedArmorDefinition(selection, data); if (!definition) return null;
                const values = adjustedGearValues('armor', definition, draft, data, selection.sizedForSiz);
                const atoms = armorSelectionCoverageAtoms(selection, definition);
                const sideText = armorRequiresSide(definition) ? (selection.armorSide ?? ((selection.quantity ?? 1) >= 2 ? 'Both (legacy)' : 'Unassigned')) : '—';
                return <tr key={selection.id} className="border-t"><td className="px-3 py-2 font-medium">{displayInventoryName(definition.name)}{size && size.direction !== 'standard' ? ` SIZ ${size.presumedSiz}` : ''}</td><td className="px-3 py-2 text-center text-xs">{sideText}</td><td className="max-w-[380px] px-3 py-2 text-xs">{atoms.length ? atoms.join(', ') : 'Choose side'}</td><td className="px-3 py-2 text-right">{values.deflectRating ?? 0}</td><td className="px-3 py-2 text-right">{values.armorRating ?? 0}</td><td className="px-3 py-2 text-right">{formatNumberWithCommas(values.weight * Math.max(1, selection.quantity || 1))}#</td><td className="px-3 py-2 text-right">{formatNumberWithCommas(Number(values.priceSp ?? values.priceGp * 10) * Math.max(1, selection.quantity || 1))} sp</td><td className="px-3 py-2"><Button type="button" size="icon" variant="ghost" onClick={() => setDraft((current) => setArmorComponentQuantity(current, selection.catalogId ?? '', 0, selection.id))}><Trash2 className="h-4 w-4" /></Button></td></tr>;
              })}</tbody></table></div>}

              <Accordion type="multiple" className="space-y-2">{componentGroups.map(([group, items]) => <AccordionItem key={group} value={group} className="rounded-md border px-3"><AccordionTrigger className="text-sm">{group}</AccordionTrigger><AccordionContent><div className="divide-y rounded-md border">{items.map((item) => {
                const values = adjustedGearValues('armor', item, draft, data);
                const genericConflict = !armorRequiresSide(item) ? armorCandidateConflict(draft, data, item) : null;
                return <div key={item.catalogId} className="flex flex-wrap items-center justify-between gap-3 p-2"><div className="min-w-0 flex-[1_1_18rem]"><div className="text-sm font-medium">{displayInventoryName(item.name)}{size && size.direction !== 'standard' ? ` SIZ ${size.presumedSiz}` : ''}</div><div className="text-xs text-muted-foreground">{item.materialClass ?? item.material ?? '—'}{item.construction ? ` / ${item.construction}` : item.material && item.materialClass && item.material !== item.materialClass ? ` / ${item.material}` : ''} • D {values.deflectRating ?? 0} • AR {values.armorRating ?? 0} • {formatNumberWithCommas(values.weight)}# • {formatNumberWithCommas(Number(values.priceSp ?? values.priceGp * 10))} sp • {formatTraits(item.traits)}</div>{genericConflict && <div className="mt-1 text-xs text-destructive">{conflictLabel(genericConflict)}</div>}</div><div className="flex shrink-0 flex-wrap gap-1">{armorRequiresSide(item) ? <>{addButton(item, 'Left')}{addButton(item, 'Right')}</> : addButton(item)}</div></div>;
              })}</div></AccordionContent></AccordionItem>)}</Accordion>
            </>}

            <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))]">{[profile.suit ? ['Suit', profile.suit.displayName, profile.suit.deflect, profile.suit.armorRating] : ['Suit', 'None', 0, 0], profile.helmet ? ['Helm', profile.helmet.displayName, profile.helmet.deflect, profile.helmet.armorRating] : ['Helm', 'None', 0, 0], profile.shield ? ['Shield', profile.shield.displayName, profile.shield.deflect, profile.shield.armorRating] : ['Shield', 'None', 0, 0], profile.gear ? ['Gear', profile.gear.displayName, profile.gear.deflect, profile.gear.armorRating] : ['Gear', 'None', 0, 0]].map(([label, name, d, ar]) => <div key={String(label)} className="rounded-md border p-2 text-xs"><div className="font-semibold">{label}</div><div>{name}</div><div className="text-muted-foreground">D {d} • AR {ar}</div></div>)}</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <ArmorSummary data={data} draft={draft} />
    </section>
  );
}
