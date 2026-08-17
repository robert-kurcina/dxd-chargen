'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, Minus, Plus, Search, Trash2 } from 'lucide-react';

import type { StaticData } from '@/data';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CharacterDraft } from '@/lib/character-draft';
import { effectiveTraitLevel } from '@/lib/rules/properties';
import { getLineageName, getTradePackage, getTradeSpecialization } from '@/lib/rules/intrinsics';
import {
  addInventoryItem,
  adjustedGearValues,
  ammunitionPackage,
  availableGoldGp,
  displayCustomAppend,
  displayInventoryName,
  displayMagicItemName,
  displayMagicItemSelection,
  displaySpellName,
  gearSizeAdjustment,
  inventoryAllowsCustomAppend,
  isWornEquipment,
  magicItemFormOptions,
  magicItemGradeMetrics,
  magicItemTotals,
  personalWealthGp,
  setMagicItemCustomAppend,
  setMagicItemForm,
  setInventoryCustomAppend,
  setInventoryOrnateLevel,
  setInventoryQuantity,
  startingGearTotals,
  canonicalStartingGearPreview,
  suggestedNameLanguageId,
  toggleMagicItem,
  toggleSpell,
  type InventoryCategory,
} from '@/lib/rules/utilities';
import { cn, formatNumberWithCommas } from '@/lib/utils';
import ArmorEditor, { ArmorCoveragePanel } from './armor-editor';

type UtilitiesStepProps = {
  stepValue: string;
  data: StaticData;
  draft: CharacterDraft;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
  displayArmorCoverage?: boolean;
};

function ReviewButton({ reviewed, onClick, label }: { reviewed: boolean; onClick: () => void; label: string }) {
  return (
    <Button type="button" variant={reviewed ? 'outline' : 'default'} onClick={onClick}>
      {reviewed && <Check className="h-4 w-4" />}
      {reviewed ? `${label} reviewed` : `Finish ${label}`}
    </Button>
  );
}

function SpellsStep({ data, draft, setDraft }: Omit<UtilitiesStepProps, 'stepValue'>) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const selected = new Set(draft.utilities.spells.map((entry) => entry.catalogId));
  const vMagic = effectiveTraitLevel(draft, 'v-Magic');
  const trade = getTradePackage(draft, data);
  const profession = getTradeSpecialization(draft, data);
  const filtered = useMemo(() => data.spells.filter((spell) => {
    const search = query.trim().toLowerCase();
    const matchesSearch = !search || `${spell.name} ${spell.description}`.toLowerCase().includes(search);
    const matchesLevel = level === 'all' || spell.level === Number(level);
    return matchesSearch && matchesLevel;
  }), [data.spells, query, level]);
  const levels = Array.from(new Set(data.spells.map((spell) => spell.level))).sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/20 p-4">
        <div>
          <div className="font-medium">Starting Spells</div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Select only Spells the character is actually granted or allowed to begin with. The current catalogue records Spell Level, AP, mana, and effect text; this screen does not invent a starting-spell allotment where the source rule is silent.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{trade?.trade ?? 'No Trade'}{profession ? ` > ${profession.name}` : ''}</Badge><Badge variant={vMagic > 0 ? 'secondary' : 'destructive'}>v-Magic {vMagic || 'not present'}</Badge>
            <Badge variant="outline">{draft.utilities.spells.length} selected</Badge>
          </div>
        </div>
        <ReviewButton
          reviewed={draft.utilities.spellsReviewed}
          label="Spells"
          onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, spellsReviewed: !current.utilities.spellsReviewed } }))}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search 84 Spells" aria-label="Search spells" className="pl-9" />
        </div>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger aria-label="Filter spells by level"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Spell Levels</SelectItem>
            {levels.map((value) => <SelectItem key={value} value={String(value)}>Level {value}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {filtered.map((spell) => {
          const active = selected.has(spell.catalogId);
          return (
            <Card key={spell.catalogId} className={cn(active && 'border-primary', vMagic <= 0 && !active && 'opacity-50')}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{displaySpellName(spell.name)}</CardTitle>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      <Badge variant="outline">Level {spell.level}</Badge>
                      <Badge variant="outline">{spell.costAp} AP</Badge>
                      <Badge variant="outline">{spell.costMana} mana</Badge>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant={active ? 'secondary' : 'outline'} disabled={vMagic <= 0 && !active} onClick={() => setDraft((current) => toggleSpell(current, spell.catalogId, data))}>
                    {active ? 'Remove' : 'Add'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent><p className="line-clamp-5 text-xs leading-relaxed text-muted-foreground">{spell.description}</p></CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function GearStep({ stepValue, data, draft, setDraft, displayArmorCoverage = false }: UtilitiesStepProps) {
  const [query, setQuery] = useState('');
  const wealthBudget = personalWealthGp(draft, data);
  const availableGp = availableGoldGp(draft, data);
  const totals = startingGearTotals(draft, data);
  const search = query.trim().toLowerCase();
  const selected = [
    ...draft.utilities.weapons.map((item) => ({ ...item, category: 'weapons' as const })),
    ...draft.utilities.armor.map((item) => ({ ...item, category: 'armor' as const })),
    ...draft.utilities.equipment.map((item) => ({ ...item, category: 'equipment' as const })),
  ];
  const unavailableItems = new Set(['Feet, Bare', 'Hands, Bare', 'Hands, Claws', 'Feet, Booted', 'Feet, Talons']);
  const trade = getTradePackage(draft, data);
  const profession = getTradeSpecialization(draft, data);
  const sizeAdjustment = gearSizeAdjustment(draft);
  const lineage = getLineageName(draft, data) ?? 'selected lineage';
  const over = wealthBudget != null && totals.purchasedCostGp > wealthBudget;
  const matches = (item: { name: string; notes: string[]; traits: string[] }) => !search || `${item.name} ${displayInventoryName(item.name)} ${item.notes.join(' ')} ${item.traits.join(' ')}`.toLowerCase().includes(search);
  const weaponGroup = (item: StaticData['itemWeapons'][number]) => {
    const text = `${item.name} ${item.notes.join(' ')}`.toLowerCase();
    const ranged = /ranged|bow|crossbow|sling|firearm|pistol|musket|bola|throwing|rock/.test(text);
    const technical = /technical|bow|sling(?!shot)|firearm|pistol|musket|bola|throwing|garrote|chain|whip|flail|morning-star|reaping|scythe|sickle/.test(text);
    return ranged ? (technical ? 'Technical Ranged Weapons' : 'Ranged Weapons') : (technical ? 'Technical Melee Weapons' : 'Melee Weapons');
  };
  const noteGroup = (notes: string[], prefix: string, fallback: string) => notes.find((note) => note.toLowerCase().startsWith(prefix.toLowerCase()))?.slice(prefix.length).replace(/\.$/, '').trim() || fallback;
  const grouped = <T extends { notes: string[] }>(items: T[], key: (item: T) => string) => Array.from(items.reduce((map, item) => { const name = key(item); map.set(name, [...(map.get(name) ?? []), item]); return map; }, new Map<string, T[]>())).map(([title, groupItems]) => ({ title, items: groupItems }));

  const renderSelected = (categories: InventoryCategory[], editable: boolean, heading = 'Current gear') => {
    const rows = selected.filter((item) => categories.includes(item.category));
    if (!rows.length) return <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No {heading.toLowerCase()} recorded.</div>;
    return (
      <section className="space-y-2">
        <h3 className="font-semibold">{heading}</h3>
        {categories.map((selectedCategory) => rows.some((item) => item.category === selectedCategory) && <div key={selectedCategory} className="selected-gear-scroll overflow-x-auto rounded-lg border">
          <div className="bg-muted/50 px-3 py-2 text-sm font-semibold capitalize">{selectedCategory === 'armor' ? 'Armor' : selectedCategory}</div>
          <table className="selected-gear-table w-full min-w-[700px] text-sm">
            <caption className="sr-only">Selected {selectedCategory}</caption>
            <thead className="bg-muted/50 text-xs"><tr><th className="px-3 py-2 text-left">Item</th>{selectedCategory !== 'armor' && <th className="px-3 py-2">Qty</th>}<th className="px-3 py-2 text-right">Unit gp</th><th className="px-3 py-2 text-right">Weight</th>{editable && <th className="px-3 py-2"></th>}</tr></thead>
            <tbody>
              {rows.filter((item) => item.category === selectedCategory).map((item, index) => {
                const catalogueItem = (item.category === 'weapons' ? data.itemWeapons : item.category === 'armor' ? data.itemArmors : data.itemEquipments).find((entry) => entry.catalogId === item.catalogId);
                const values = catalogueItem ? adjustedGearValues(item.category, catalogueItem, draft, data, item.sizedForSiz) : { priceGp: item.unitPriceGp, weight: item.unitWeight, tca: 0 };
                const itemSizeAdjustment = gearSizeAdjustment(draft, item.sizedForSiz);
                const itemScales = item.category !== 'equipment' || Boolean(catalogueItem && isWornEquipment(catalogueItem));
                const jewelry = item.category === 'equipment' && /^Jewelry,/i.test(item.name);
                const ornateLevel = jewelry ? Math.max(1, Math.trunc(item.level ?? 1)) : 1;
                const effectiveTca = jewelry ? ornateLevel * 2 : values.tca;
                return <tr key={`${item.category}-${item.catalogId ?? item.id ?? item.name}-${index}`} className="border-t">
                  <td data-label="Item" className="px-3 py-2"><div className="font-medium">{displayCustomAppend(displayInventoryName(item.name), item.customAppend)}{item.category === 'armor' && item.armorSide ? ` (${item.armorSide})` : ''}{itemScales && itemSizeAdjustment && itemSizeAdjustment.direction !== 'standard' ? ` SIZ ${itemSizeAdjustment.presumedSiz}` : ''}</div>{editable && jewelry && <label className="mt-2 flex max-w-[180px] items-center gap-2 text-xs"><span className="shrink-0 text-muted-foreground">Ornate</span><Input min={1} max={12} className="h-8 w-20" value={ornateLevel} onChange={(event) => setDraft((current) => setInventoryOrnateLevel(current, item.category, item.catalogId ?? '', Number(event.target.value), item.id))} aria-label={`Ornate rating for ${displayInventoryName(item.name)}`} /></label>}{editable && item.category === 'equipment' && inventoryAllowsCustomAppend(item.name) && <Input className="mt-2 h-8 max-w-sm" value={item.customAppend ?? ''} onChange={(event) => setDraft((current) => setInventoryCustomAppend(current, item.category, item.catalogId ?? '', event.target.value, item.id))} placeholder="Optional text append" aria-label={`Custom text for ${displayInventoryName(item.name)}`} />}<div className="text-xs capitalize text-muted-foreground">{item.sourceDetail === 'Canonical Starting Gear' ? 'Canonical starting set' : 'Customized'}{jewelry ? ` • Ornate ${ornateLevel}` : ''}{effectiveTca ? ` • TCA ${effectiveTca > 0 ? '+' : ''}${effectiveTca}` : ''}</div></td>
                  {selectedCategory !== 'armor' && <td data-label="Quantity" className="px-3 py-2">{editable ? <div className="flex items-center justify-center gap-1"><Button size="icon" variant="ghost" aria-label={`Decrease ${displayInventoryName(item.name)} quantity`} onClick={() => setDraft((current) => setInventoryQuantity(current, item.category, item.catalogId ?? '', item.quantity - 1, item.id))}><Minus className="h-3.5 w-3.5" /></Button><span className="w-8 text-center">{item.quantity}</span><Button size="icon" variant="ghost" aria-label={`Increase ${displayInventoryName(item.name)} quantity`} onClick={() => setDraft((current) => setInventoryQuantity(current, item.category, item.catalogId ?? '', item.quantity + 1, item.id))}><Plus className="h-3.5 w-3.5" /></Button></div> : <div className="text-center">{item.quantity}</div>}</td>}
                  <td data-label="Unit gp" className="px-3 py-2 text-right">{formatNumberWithCommas(values.priceGp)}</td>
                  <td data-label="Weight" className="px-3 py-2 text-right">{formatNumberWithCommas(values.weight)}#</td>
                  {editable && <td data-label="Controls" className="px-3 py-2 text-right"><Button size="icon" variant="ghost" aria-label={`Remove ${displayInventoryName(item.name)}`} onClick={() => setDraft((current) => setInventoryQuantity(current, item.category, item.catalogId ?? '', 0, item.id))}><Trash2 className="h-4 w-4" /></Button></td>}
                </tr>;
              })}
            </tbody>
          </table>
        </div>)}
      </section>
    );
  };

  if (stepValue === 'utilities-starting-gear') {
    const baseline = canonicalStartingGearPreview(draft, data);
    return (
      <div className="space-y-5">
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Baseline Starting Gear</div>
          <div className="mt-1 font-medium">Trade: {trade?.trade ?? 'unassigned'}{profession ? ` • Profession: ${profession.name}` : ''}</div>
          <p className="mt-2 text-sm text-muted-foreground">Starting Gear is assigned automatically from the Trade package. This is the rapid-creation baseline; detailed shopping and tailoring are optional under <strong>7. Customize</strong>.</p>
          {sizeAdjustment && sizeAdjustment.direction !== 'standard' && <p className="mt-2 text-sm text-muted-foreground">Weapons, Armor, and fitted Equipment are scaled for {lineage}, using SIZ {sizeAdjustment.presumedSiz}.</p>}
        </div>
        <section className="space-y-2">
          <h3 className="font-semibold">Canonical package</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/50 text-xs"><tr><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Handling</th></tr></thead>
              <tbody>{baseline.entries.map((entry, index) => <tr key={`${entry.category}-${entry.name}-${index}`} className="border-t"><td className="px-3 py-2 capitalize">{entry.category === 'armor' ? 'Armor' : entry.category}</td><td className="px-3 py-2 font-medium">{entry.displayName}</td><td className="px-3 py-2 text-muted-foreground">{entry.noteOnly ? 'Expendable → Notes' : 'Structured item'}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
        {renderSelected(['weapons', 'armor', 'equipment'], false, 'Current assigned gear')}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Current Worth</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatNumberWithCommas(totals.costGp, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gp</div><div className="text-xs text-muted-foreground">informational; canonical package is not deducted from Personal Wealth</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Current Weight</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatNumberWithCommas(totals.weight, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}#</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Items</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{totals.itemCount}</div></CardContent></Card>
        </div>
      </div>
    );
  }

  const category: InventoryCategory | null = stepValue === 'customize-weapons' ? 'weapons' : stepValue === 'customize-equipment' ? 'equipment' : null;
  if (stepValue === 'customize-armor') {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border bg-muted/20 p-4"><div className="font-medium">Optional Armor customization</div><p className="mt-1 text-sm text-muted-foreground">Skip this page to retain the assigned Armor unchanged. Armor Sets remain the quick abstraction; expand sectional detail only when useful to the fiction.</p></div>
        {renderSelected(['armor'], true, 'Current Armor')}
        {displayArmorCoverage && <ArmorCoveragePanel data={data} draft={draft} />}
        <ArmorEditor data={data} draft={draft} setDraft={setDraft} />
      </div>
    );
  }

  if (!category) return null;
  const catalogGroups: Array<{ title: string; category: InventoryCategory; subgroups: Array<{ title: string; items: Array<StaticData['itemWeapons'][number] | StaticData['itemEquipments'][number]> }> }> = category === 'weapons'
    ? [{ title: 'Weapons', category: 'weapons', subgroups: ['Melee Weapons', 'Technical Melee Weapons', 'Ranged Weapons', 'Technical Ranged Weapons'].map((title) => ({ title, items: data.itemWeapons.filter((item) => weaponGroup(item) === title && matches(item)) })) }]
    : [{ title: 'Equipment', category: 'equipment', subgroups: grouped(data.itemEquipments.filter(matches), (item) => noteGroup(item.notes, 'Category:', 'Other Equipment')).sort((a, b) => a.title.localeCompare(b.title)) }];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Available Gold</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{availableGp == null ? '—' : `${formatNumberWithCommas(availableGp, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gp`}</div><div className="text-xs text-muted-foreground">optional purchases</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Gear Worth</CardTitle></CardHeader><CardContent><div className={cn('text-2xl font-semibold', over && 'text-destructive')}>{formatNumberWithCommas(totals.costGp, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gp</div><div className="text-xs text-muted-foreground">including canonical Starting Gear</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Recorded Weight</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatNumberWithCommas(totals.weight, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}#</div></CardContent></Card>
      </div>
      <div className="rounded-lg border bg-muted/20 p-4"><div className="font-medium">Optional {category === 'weapons' ? 'Weapon' : 'Equipment'} customization</div><p className="mt-1 text-sm text-muted-foreground">Skip this page to retain the assigned Starting Gear unchanged.</p></div>
      {over && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Recorded optional gear exceeds the Wealth Rank baseline. The selection is retained, but the character needs an explicit GM grant, Asset, or other source for the difference.</div>}
      {renderSelected([category], true, category === 'weapons' ? 'Current Weapons' : 'Current Equipment')}
      <section className="space-y-3">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${category === 'weapons' ? 'Weapons' : 'Equipment'}`} aria-label={`Search ${category}`} className="pl-9" /></div>
        <Accordion type="multiple" defaultValue={catalogGroups.map((group) => group.title)} className="space-y-3">{catalogGroups.map(({ title, category: groupCategory, subgroups }) => subgroups.some((group) => group.items.length) && <AccordionItem key={title} value={title} className="overflow-hidden rounded-lg border px-4"><AccordionTrigger className="text-base font-semibold">{title}</AccordionTrigger><AccordionContent className="space-y-4">{subgroups.map((subgroup) => subgroup.items.length > 0 && <section key={subgroup.title} className="overflow-x-auto rounded-md border"><h4 className="bg-muted/50 px-3 py-2 text-sm font-semibold">{subgroup.title}</h4><div className="min-w-[760px] divide-y">{subgroup.items.slice(0, 90).map((item) => { const values = adjustedGearValues(groupCategory, item, draft, data); const weapon = groupCategory === 'weapons' ? values as ReturnType<typeof adjustedGearValues> & { ora?: number; damageOffset?: number; minStr?: number } : null; const ammoPurchase = groupCategory === 'equipment' ? ammunitionPackage(item.name) : null; const cannotAffordAmmo = Boolean(ammoPurchase && availableGp != null && Number(item.priceGp) > availableGp + 1e-9); const column = 'flex min-w-[50px] max-w-[100px] flex-1 items-center justify-end px-2 text-right text-xs tabular-nums'; return <div key={item.catalogId} className={cn('grid min-h-8 grid-cols-[minmax(180px,1fr)_minmax(250px,500px)_minmax(90px,100px)] items-stretch', unavailableItems.has(item.name) && 'opacity-50')}><div className="flex min-w-[180px] items-center px-3 text-sm font-medium">{displayInventoryName(item.name)}{sizeAdjustment && sizeAdjustment.direction !== 'standard' && (groupCategory !== 'equipment' || isWornEquipment(item)) ? ` SIZ ${sizeAdjustment.presumedSiz}` : ''}</div><div className="flex items-stretch justify-end"><div className={column}>{formatNumberWithCommas(values.priceGp)} gp</div><div className={column}>{formatNumberWithCommas(values.weight)}#</div>{weapon ? <><div className={column}>OR {weapon.ora}</div><div className={column}>STR {weapon.minStr}</div><div className={column}>Dmg {weapon.damageOffset}</div></> : <><div className={column}>{item.traits[0] ?? '—'}</div><div className={column}>{item.traits[1] ?? '—'}</div><div className={column}>TCA {values.tca > 0 ? '+' : ''}{values.tca}</div></>}</div><div className="flex min-w-[90px] max-w-[100px] items-center justify-end px-2"><Button type="button" size="sm" variant="outline" disabled={unavailableItems.has(item.name) || cannotAffordAmmo} onClick={() => setDraft((current) => addInventoryItem(current, groupCategory, item.catalogId, data))}>{unavailableItems.has(item.name) ? 'Unavailable' : cannotAffordAmmo ? 'No gp' : ammoPurchase ? 'Buy → Notes' : 'Add'}</Button></div></div>; })}</div></section>)}</AccordionContent></AccordionItem>)}</Accordion>
      </section>
      {category === 'weapons' && <p className="text-xs text-muted-foreground">Throwable items store only their ordinary Weight. Lob/Pitch/Hurl OR is calculated at throw time and is not stored per item.</p>}
    </div>
  );
}

function MagicItemsStep({ data, draft, setDraft }: Omit<UtilitiesStepProps, 'stepValue'>) {
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('all');
  const selected = new Set(draft.utilities.magicItems.map((entry) => entry.catalogId));
  const grades = Array.from(new Set(data.magicItems.map((item) => item.gradeAvailability))).sort();
  const filtered = data.magicItems.filter((item) => {
    const search = query.trim().toLowerCase();
    return (!search || item.name.toLowerCase().includes(search)) && (grade === 'all' || item.gradeAvailability === grade);
  });
  const totals = magicItemTotals(draft, data);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/20 p-4">
        <div className="min-w-0 flex-1"><div className="font-medium">Complete-data Magic Items only</div><p className="mt-1 text-sm text-muted-foreground">Search matches item labels only. Numeric rarity uses the canonical worth multiplier (Common ×10, Lesser ×100, and so on); combined uncommonality multiplies those values. gp is the grade-equivalent value using the canonical Common ≈100 gp baseline.</p><Input className="mt-3" readOnly aria-label="Selected Magic Items" value={[...draft.utilities.magicItems].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map((item) => displayMagicItemSelection(item, draft, data)).join(', ')} placeholder="No Magic Items selected" /><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">{data.magicItems.length} usable • {draft.utilities.magicItems.length} selected</Badge><Badge variant="secondary">Combined rarity {totals.rarityProductLabel}</Badge><Badge variant="secondary">Total equivalent {totals.worthGp.toLocaleString()} gp</Badge><Badge variant="secondary">Implied weight {formatNumberWithCommas(totals.weight)}#</Badge></div></div>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, magicItems: [], magicItemForms: {}, magicItemsReviewed: false } }))}>Reset</Button><ReviewButton reviewed={draft.utilities.magicItemsReviewed} label="Magic Items" onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, magicItemsReviewed: !current.utilities.magicItemsReviewed } }))} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Magic Items" aria-label="Search magic items" className="pl-9" /></div>
        <Select value={grade} onValueChange={setGrade}><SelectTrigger aria-label="Filter magic items by grade"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All grades</SelectItem>{grades.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {filtered.map((item) => {
          const active = selected.has(item.catalogId);
          const selection = draft.utilities.magicItems.find((entry) => entry.catalogId === item.catalogId);
          const metrics = magicItemGradeMetrics(item);
          const forms = magicItemFormOptions(item, data);
          const configuredForm = draft.utilities.magicItemForms[item.catalogId] ?? '';
          return <Card key={item.catalogId} className={cn(active && 'border-primary')}><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{displayMagicItemName(item.name, 1)}</CardTitle><div className="mt-1 flex flex-wrap gap-1.5"><Badge variant="outline">{item.gradeAvailability}</Badge><Badge variant="outline">Frequency 1 per 10^{metrics.rarityExponent}</Badge><Badge variant="outline">Numeric rarity ×{metrics.worthMultiplier.toLocaleString()}</Badge><Badge variant="secondary">≈ {metrics.equivalentGp.toLocaleString()} gp</Badge></div></div><Button size="sm" variant={active ? 'secondary' : 'outline'} onClick={() => setDraft((current) => toggleMagicItem(current, item.catalogId, data))}>{active ? 'Remove' : 'Add'}</Button></div></CardHeader><CardContent><div className="mb-2">{forms.length > 1 ? <Select value={configuredForm} onValueChange={(value) => setDraft((current) => setMagicItemForm(current, item.catalogId, value))}><SelectTrigger className="h-8"><SelectValue placeholder={`Choose ${item.form} form`} /></SelectTrigger><SelectContent>{forms.map((value) => <SelectItem key={value} value={value}>{displayInventoryName(value)}</SelectItem>)}</SelectContent></Select> : <Badge variant="outline">{forms.length === 1 ? displayInventoryName(forms[0]) : item.form || 'Uncataloged form'}</Badge>}</div>{active && <Input className="mb-2 h-8" value={selection?.customAppend ?? ''} onChange={(event) => setDraft((current) => setMagicItemCustomAppend(current, item.catalogId, event.target.value))} placeholder="Optional text append" aria-label={`Custom text for ${displayMagicItemName(item.name, 1)}`} />}<p className="line-clamp-5 text-xs leading-relaxed text-muted-foreground">{item.description}</p></CardContent></Card>;
        })}
      </div>
    </div>
  );
}

function NameStep({ data, draft, setDraft }: Omit<UtilitiesStepProps, 'stepValue'>) {
  const suggested = suggestedNameLanguageId(draft, data);
  const languageId = draft.utilities.nameLanguageId ?? suggested ?? '';
  const language = data.languages.find((entry) => entry.id === languageId);
  const generator = data.nameGenerators.find((entry) => entry.languageId === languageId);
  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border p-4">
        <div><h3 className="font-semibold">Conlang name generator</h3><p className="mt-1 text-xs text-muted-foreground">Uses the existing D66 generator tables incorporated from the conlang source. The generated result is editable; the generator does not replace player choice.</p></div>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <Select value={languageId} onValueChange={(value) => setDraft((current) => ({ ...current, utilities: { ...current.utilities, nameLanguageId: value } }))}>
            <SelectTrigger aria-label="Naming language"><SelectValue placeholder="Choose naming language" /></SelectTrigger>
            <SelectContent>{data.languages.filter((entry) => data.nameGenerators.some((generatorEntry) => generatorEntry.languageId === entry.id)).map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={draft.utilities.nameStyle} onValueChange={(value) => setDraft((current) => ({ ...current, utilities: { ...current.utilities, nameStyle: value as CharacterDraft['utilities']['nameStyle'] } }))}>
            <SelectTrigger aria-label="Name ending style"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="any">Any personal ending</SelectItem><SelectItem value="masculine">Masculine ending</SelectItem><SelectItem value="feminine">Feminine ending</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 text-xs"><Badge variant="outline">{language?.name ?? 'No language'}</Badge>{language?.locus && <Badge variant="outline">{language.locus}</Badge>}{languageId === suggested && <Badge variant="secondary">Suggested from known language</Badge>}{generator && <Badge variant="outline">{generator.source}</Badge>}</div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="character-common-name">Table / common name</Label><Input id="character-common-name" value={draft.utilities.name} onChange={(event) => setDraft((current) => ({ ...current, utilities: { ...current.utilities, name: event.target.value } }))} placeholder="Name used during play" /></div>
        <div className="space-y-2"><Label htmlFor="character-proper-name">Proper / formal name</Label><Input id="character-proper-name" value={draft.utilities.properName} onChange={(event) => setDraft((current) => ({ ...current, utilities: { ...current.utilities, properName: event.target.value } }))} placeholder="Formal or birth name" /></div>
      </section>
    </div>
  );
}

function RelationshipsDeferred() {
  return <div className="rounded-lg border border-dashed p-5"><div className="font-medium">Relationships deferred</div><p className="mt-2 text-sm text-muted-foreground">Per the current project scope, the relationship procedure is intentionally not automated in this release. This step does not block completion and no relationship mechanics are invented here.</p></div>;
}

export default function UtilitiesStep({ stepValue, data, draft, setDraft, displayArmorCoverage = false }: UtilitiesStepProps) {
  if (stepValue === 'utilities-spells') return <SpellsStep data={data} draft={draft} setDraft={setDraft} />;
  if (stepValue === 'utilities-starting-gear' || stepValue.startsWith('customize-')) return <GearStep stepValue={stepValue} data={data} draft={draft} setDraft={setDraft} displayArmorCoverage={displayArmorCoverage} />;
  if (stepValue === 'utilities-magic-items') return <MagicItemsStep data={data} draft={draft} setDraft={setDraft} />;
  if (stepValue === 'utilities-name') return <NameStep data={data} draft={draft} setDraft={setDraft} />;
  return <RelationshipsDeferred />;
}
