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
  clearStartingGear,
  displayInventoryName,
  displaySpellName,
  gearSizeAdjustment,
  magicItemFormOptions,
  magicItemGradeMetrics,
  magicItemTotals,
  personalWealthGp,
  resetCanonicalStartingGear,
  setMagicItemForm,
  setInventoryQuantity,
  startingGearTotals,
  suggestedNameLanguageId,
  toggleMagicItem,
  toggleSpell,
  type InventoryCategory,
} from '@/lib/rules/utilities';
import { cn, formatNumberWithCommas } from '@/lib/utils';

type UtilitiesStepProps = {
  stepValue: string;
  data: StaticData;
  draft: CharacterDraft;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
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

function GearStep({ data, draft, setDraft }: Omit<UtilitiesStepProps, 'stepValue'>) {
  const [query, setQuery] = useState('');
  const budget = personalWealthGp(draft, data);
  const totals = startingGearTotals(draft, data);
  const search = query.trim().toLowerCase();
  const selected = [...draft.utilities.weapons.map((item) => ({ ...item, category: 'weapons' as const })), ...draft.utilities.armor.map((item) => ({ ...item, category: 'armor' as const })), ...draft.utilities.equipment.map((item) => ({ ...item, category: 'equipment' as const }))];
  const unavailableItems = new Set(['Feet, Bare', 'Hands, Bare', 'Hands, Claws', 'Feet, Booted', 'Feet, Talons']);
  const trade = getTradePackage(draft, data);
  const profession = getTradeSpecialization(draft, data);
  const sizeAdjustment = gearSizeAdjustment(draft);
  const lineage = getLineageName(draft, data) ?? 'selected lineage';
  const over = budget != null && totals.purchasedCostGp > budget;
  const remaining = budget == null ? null : budget - totals.purchasedCostGp;
  const matches = (item: { name: string; notes: string[]; traits: string[] }) => !search || `${item.name} ${displayInventoryName(item.name)} ${item.notes.join(' ')} ${item.traits.join(' ')}`.toLowerCase().includes(search);
  const weaponGroup = (item: StaticData['itemWeapons'][number]) => {
    const text = `${item.name} ${item.notes.join(' ')}`.toLowerCase();
    const ranged = /ranged|bow|crossbow|sling|firearm|pistol|musket|bola|throwing|rock/.test(text);
    const technical = /technical|bow|sling(?!shot)|firearm|pistol|musket|bola|throwing|garrote|chain|whip|flail|morning-star|reaping|scythe|sickle/.test(text);
    return ranged ? (technical ? 'Technical Ranged Weapons' : 'Ranged Weapons') : (technical ? 'Technical Melee Weapons' : 'Melee Weapons');
  };
  const noteGroup = (notes: string[], prefix: string, fallback: string) => notes.find((note) => note.toLowerCase().startsWith(prefix.toLowerCase()))?.slice(prefix.length).replace(/\.$/, '').trim() || fallback;
  const grouped = <T extends { notes: string[] }>(items: T[], key: (item: T) => string) => Array.from(items.reduce((map, item) => { const name = key(item); map.set(name, [...(map.get(name) ?? []), item]); return map; }, new Map<string, T[]>())).map(([title, groupItems]) => ({ title, items: groupItems }));
  const catalogGroups: Array<{ title: string; category: InventoryCategory; subgroups: Array<{ title: string; items: Array<StaticData['itemWeapons'][number] | StaticData['itemArmors'][number] | StaticData['itemEquipments'][number]> }> }> = [
    { title: 'Weapons', category: 'weapons', subgroups: ['Melee Weapons', 'Technical Melee Weapons', 'Ranged Weapons', 'Technical Ranged Weapons'].map((title) => ({ title, items: data.itemWeapons.filter((item) => weaponGroup(item) === title && matches(item)) })) },
    { title: 'Armors', category: 'armor', subgroups: grouped(data.itemArmors.filter(matches), (item) => noteGroup(item.notes, 'Classification:', 'Other Armor')).sort((a, b) => a.title.localeCompare(b.title)) },
    { title: 'Equipment', category: 'equipment', subgroups: grouped(data.itemEquipments.filter(matches), (item) => noteGroup(item.notes, 'Category:', 'Other Equipment')).sort((a, b) => a.title.localeCompare(b.title)) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Personal Wealth</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{budget == null ? '—' : `${Math.max(0, remaining ?? 0).toLocaleString()} / ${budget.toLocaleString()} gp`}</div><div className="text-xs text-muted-foreground">remaining / original Personal Wealth</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Gear Worth</CardTitle></CardHeader><CardContent><div className={cn('text-2xl font-semibold', over && 'text-destructive')}>{formatNumberWithCommas(totals.costGp, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gp</div><div className="text-xs text-muted-foreground">canonical worth; optional purchases spend {formatNumberWithCommas(totals.purchasedCostGp, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gp</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Recorded Weight</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatNumberWithCommas(totals.weight, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}#</div><div className="text-xs text-muted-foreground">sum of item weights</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Items</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{totals.itemCount}</div><ReviewButton reviewed={draft.utilities.gearReviewed} label="Gear" onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, gearReviewed: !current.utilities.gearReviewed } }))} /></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
        <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Starting set constraint</div><div className="mt-1 font-medium">Trade: {trade?.trade ?? 'unassigned'}{profession ? ` • Profession: ${profession.name}` : ''}</div>{sizeAdjustment && sizeAdjustment.direction !== 'standard' && <p className="mt-2 text-sm text-muted-foreground">Adjustments to Weapons and Armor applied due to being {lineage}, being {sizeAdjustment.direction}, with presumed SIZ {sizeAdjustment.presumedSiz} for that lineage.</p>}</div>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setDraft((current) => resetCanonicalStartingGear(current, data))}>Reset to default</Button><Button type="button" variant="outline" onClick={() => setDraft((current) => clearStartingGear(current, data))}>Clear all</Button></div>
      </div>

      {over && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Recorded gear exceeds Personal Wealth. The selection is retained, but the character needs an explicit GM grant, Asset, or other source for the difference.</div>}

      {selected.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold">Selected starting gear</h3>
          {(['weapons', 'armor', 'equipment'] as const).map((selectedCategory) => selected.some((item) => item.category === selectedCategory) && <div key={selectedCategory} className="selected-gear-scroll overflow-x-auto rounded-lg border">
            <div className="bg-muted/50 px-3 py-2 text-sm font-semibold capitalize">{selectedCategory === 'armor' ? 'Armor' : selectedCategory}</div>
            <table className="selected-gear-table w-full min-w-[700px] text-sm">
              <caption className="sr-only">Selected {selectedCategory === 'armor' ? 'armor' : selectedCategory}</caption>
              <thead className="bg-muted/50 text-xs"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2 text-right">Unit gp</th><th className="px-3 py-2 text-right">Weight</th><th className="px-3 py-2"></th></tr></thead>
              <tbody>
                {selected.filter((item) => item.category === selectedCategory).map((item, index) => { const catalogueItem = (item.category === 'weapons' ? data.itemWeapons : item.category === 'armor' ? data.itemArmors : data.itemEquipments).find((entry) => entry.catalogId === item.catalogId); const values = catalogueItem ? adjustedGearValues(item.category, catalogueItem, draft, data) : { priceGp: item.unitPriceGp, weight: item.unitWeight, tca: 0 }; return (
                  <tr key={`${item.category}-${item.catalogId ?? item.id ?? item.name}-${index}`} className="border-t">
                    <td data-label="Item" className="px-3 py-2"><div className="font-medium">{displayInventoryName(item.name)}{sizeAdjustment && sizeAdjustment.direction !== 'standard' && item.category !== 'equipment' ? ` SIZ ${sizeAdjustment.presumedSiz}` : ''}</div><div className="text-xs capitalize text-muted-foreground">{item.sourceDetail === 'Canonical Starting Gear' ? 'Canonical starting set' : item.category}{values.tca ? ` • TCA ${values.tca > 0 ? '+' : ''}${values.tca}` : ''}</div></td>
                    <td data-label="Quantity" className="px-3 py-2"><div className="flex items-center justify-center gap-1"><Button size="icon" variant="ghost" aria-label={`Decrease ${displayInventoryName(item.name)} quantity`} onClick={() => setDraft((current) => setInventoryQuantity(current, item.category, item.catalogId ?? '', item.quantity - 1))}><Minus className="h-3.5 w-3.5" /></Button><span className="w-8 text-center" aria-label={`${item.quantity} selected`}>{item.quantity}</span><Button size="icon" variant="ghost" aria-label={`Increase ${displayInventoryName(item.name)} quantity`} onClick={() => setDraft((current) => setInventoryQuantity(current, item.category, item.catalogId ?? '', item.quantity + 1))}><Plus className="h-3.5 w-3.5" /></Button></div></td>
                    <td data-label="Unit gp" className="px-3 py-2 text-right">{formatNumberWithCommas(values.priceGp)}</td>
                    <td data-label="Weight" className="px-3 py-2 text-right">{formatNumberWithCommas(values.weight)}#</td>
                    <td data-label="Controls" className="px-3 py-2 text-right"><Button size="icon" variant="ghost" aria-label={`Remove ${displayInventoryName(item.name)}`} onClick={() => setDraft((current) => setInventoryQuantity(current, item.category, item.catalogId ?? '', 0))}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>)}
          <p className="text-xs text-muted-foreground">Throwable items store only their ordinary Weight. Lob/Pitch/Hurl OR is calculated at throw time and is not stored per item.</p>
        </section>
      )}

      <section className="space-y-3">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Weapons, Armor, and Equipment" aria-label="Search weapons, armor, and equipment" className="pl-9" /></div>
        <Accordion type="multiple" defaultValue={['Weapons', 'Armors', 'Equipment']} className="space-y-3">{catalogGroups.map(({ title, category, subgroups }) => subgroups.some((group) => group.items.length) && <AccordionItem key={title} value={title} className="overflow-hidden rounded-lg border px-4"><AccordionTrigger className="text-base font-semibold">{title}</AccordionTrigger><AccordionContent className="space-y-4">{subgroups.map((subgroup) => subgroup.items.length > 0 && <section key={subgroup.title} className="overflow-x-auto rounded-md border"><h4 className="bg-muted/50 px-3 py-2 text-sm font-semibold">{subgroup.title}</h4><div className="min-w-[760px] divide-y">{subgroup.items.slice(0, 90).map((item) => { const values = adjustedGearValues(category, item, draft, data); const weapon = category === 'weapons' ? values as ReturnType<typeof adjustedGearValues> & { ora?: number; damageOffset?: number; minStr?: number } : null; const armor = category === 'armor' ? values as ReturnType<typeof adjustedGearValues> & { armorRating?: number; deflectRating?: number } : null; const column = 'flex min-w-[50px] max-w-[100px] flex-1 items-center justify-end px-2 text-right text-xs tabular-nums'; return <div key={item.catalogId} className={cn('grid min-h-8 grid-cols-[minmax(180px,1fr)_minmax(250px,500px)_minmax(90px,100px)] items-stretch', unavailableItems.has(item.name) && 'opacity-50')}><div className="flex min-w-[180px] items-center px-3 text-sm font-medium">{item.name}{sizeAdjustment && sizeAdjustment.direction !== 'standard' && category !== 'equipment' ? ` SIZ ${sizeAdjustment.presumedSiz}` : ''}</div><div className="flex items-stretch justify-end"><div className={column}>{formatNumberWithCommas(values.priceGp)} gp</div><div className={column}>{formatNumberWithCommas(values.weight)}#</div>{weapon ? <><div className={column}>OR {weapon.ora}</div><div className={column}>STR {weapon.minStr}</div><div className={column}>Dmg {weapon.damageOffset}</div></> : armor ? <><div className={column}>D {armor.deflectRating}</div><div className={column}>AR {armor.armorRating}</div><div className={column}>TCA {values.tca > 0 ? '+' : ''}{values.tca}</div></> : <><div className={column}>{item.traits[0] ?? '—'}</div><div className={column}>{item.traits[1] ?? '—'}</div><div className={column}>TCA {values.tca > 0 ? '+' : ''}{values.tca}</div></>}</div><div className="flex min-w-[90px] max-w-[100px] items-center justify-end px-2"><Button type="button" size="sm" variant="outline" disabled={unavailableItems.has(item.name)} onClick={() => setDraft((current) => addInventoryItem(current, category, item.catalogId, data))}>{unavailableItems.has(item.name) ? 'Unavailable' : 'Add'}</Button></div></div>; })}</div></section>)}</AccordionContent></AccordionItem>)}</Accordion>
      </section>
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
        <div className="min-w-0 flex-1"><div className="font-medium">Complete-data Magic Items only</div><p className="mt-1 text-sm text-muted-foreground">Search matches item labels only. Numeric rarity uses the canonical worth multiplier (Common ×10, Lesser ×100, and so on); combined uncommonality multiplies those values. gp is the grade-equivalent value using the canonical Common ≈100 gp baseline.</p><Input className="mt-3" readOnly aria-label="Selected Magic Items" value={[...draft.utilities.magicItems].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map((item) => item.name).join(', ')} placeholder="No Magic Items selected" /><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">{data.magicItems.length} usable • {draft.utilities.magicItems.length} selected</Badge><Badge variant="secondary">Combined rarity {totals.rarityProductLabel}</Badge><Badge variant="secondary">Total equivalent {totals.worthGp.toLocaleString()} gp</Badge><Badge variant="secondary">Implied weight {formatNumberWithCommas(totals.weight)}#</Badge></div></div>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, magicItems: [], magicItemForms: {}, magicItemsReviewed: false } }))}>Reset</Button><ReviewButton reviewed={draft.utilities.magicItemsReviewed} label="Magic Items" onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, magicItemsReviewed: !current.utilities.magicItemsReviewed } }))} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Magic Items" aria-label="Search magic items" className="pl-9" /></div>
        <Select value={grade} onValueChange={setGrade}><SelectTrigger aria-label="Filter magic items by grade"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All grades</SelectItem>{grades.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {filtered.map((item) => {
          const active = selected.has(item.catalogId);
          const metrics = magicItemGradeMetrics(item);
          const forms = magicItemFormOptions(item);
          const form = draft.utilities.magicItemForms[item.catalogId] ?? item.form;
          return <Card key={item.catalogId} className={cn(active && 'border-primary')}><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{item.name}</CardTitle><div className="mt-1 flex flex-wrap gap-1.5"><Badge variant="outline">{item.gradeAvailability}</Badge><Badge variant="outline">Frequency 1 per 10^{metrics.rarityExponent}</Badge><Badge variant="outline">Numeric rarity ×{metrics.worthMultiplier.toLocaleString()}</Badge><Badge variant="secondary">≈ {metrics.equivalentGp.toLocaleString()} gp</Badge></div></div><Button size="sm" variant={active ? 'secondary' : 'outline'} onClick={() => setDraft((current) => toggleMagicItem(current, item.catalogId, data))}>{active ? 'Remove' : 'Add'}</Button></div></CardHeader><CardContent><div className="mb-2">{forms.length > 1 ? <Select value={form} onValueChange={(value) => setDraft((current) => setMagicItemForm(current, item.catalogId, value))}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{forms.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select> : <Badge variant="outline">{form || 'Variable form'}</Badge>}</div><p className="line-clamp-5 text-xs leading-relaxed text-muted-foreground">{item.description}</p></CardContent></Card>;
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

export default function UtilitiesStep({ stepValue, data, draft, setDraft }: UtilitiesStepProps) {
  if (stepValue === 'utilities-spells') return <SpellsStep data={data} draft={draft} setDraft={setDraft} />;
  if (stepValue === 'utilities-starting-gear') return <GearStep data={data} draft={draft} setDraft={setDraft} />;
  if (stepValue === 'utilities-magic-items') return <MagicItemsStep data={data} draft={draft} setDraft={setDraft} />;
  if (stepValue === 'utilities-name') return <NameStep data={data} draft={draft} setDraft={setDraft} />;
  return <RelationshipsDeferred />;
}
