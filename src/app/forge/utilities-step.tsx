'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, Minus, Plus, Search, Trash2, WandSparkles } from 'lucide-react';

import type { StaticData } from '@/data';
import { Badge } from '@/components/ui/badge';
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
import {
  addInventoryItem,
  generateCharacterName,
  personalWealthGp,
  setInventoryQuantity,
  startingGearTotals,
  suggestedNameLanguageId,
  toggleMagicItem,
  toggleSpell,
  type InventoryCategory,
} from '@/lib/rules/utilities';
import { cn } from '@/lib/utils';

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
            <Badge variant={vMagic > 0 ? 'secondary' : 'outline'}>v-Magic {vMagic || 'not present'}</Badge>
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
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search 84 Spells" className="pl-9" />
        </div>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Card key={spell.catalogId} className={cn(active && 'border-primary')}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{spell.name}</CardTitle>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      <Badge variant="outline">Level {spell.level}</Badge>
                      <Badge variant="outline">{spell.costAp} AP</Badge>
                      <Badge variant="outline">{spell.costMana} mana</Badge>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant={active ? 'secondary' : 'outline'} onClick={() => setDraft((current) => toggleSpell(current, spell.catalogId, data))}>
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
  const [category, setCategory] = useState<InventoryCategory>('weapons');
  const budget = personalWealthGp(draft, data);
  const totals = startingGearTotals(draft);
  const catalogue = category === 'weapons' ? data.itemWeapons : category === 'armor' ? data.itemArmors : data.itemEquipments;
  const filtered = catalogue.filter((item) => {
    const search = query.trim().toLowerCase();
    return !search || `${item.name} ${item.notes.join(' ')} ${item.traits.join(' ')}`.toLowerCase().includes(search);
  });
  const selected = [...draft.utilities.weapons.map((item) => ({ ...item, category: 'weapons' as const })), ...draft.utilities.armor.map((item) => ({ ...item, category: 'armor' as const })), ...draft.utilities.equipment.map((item) => ({ ...item, category: 'equipment' as const }))];
  const over = budget != null && totals.costGp > budget;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Personal Wealth</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{budget == null ? '—' : `${budget.toLocaleString()} gp`}</div><div className="text-xs text-muted-foreground">Wealth Rank as Index gp</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Gear Cost</CardTitle></CardHeader><CardContent><div className={cn('text-2xl font-semibold', over && 'text-destructive')}>{totals.costGp.toFixed(2)} gp</div><div className="text-xs text-muted-foreground">recorded purchases</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Recorded Weight</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{totals.weight.toFixed(1)}</div><div className="text-xs text-muted-foreground">sum of item Weight fields</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Items</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{totals.itemCount}</div><ReviewButton reviewed={draft.utilities.gearReviewed} label="Gear" onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, gearReviewed: !current.utilities.gearReviewed } }))} /></CardContent></Card>
      </div>

      {over && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Recorded gear exceeds Personal Wealth. The selection is retained, but the character needs an explicit GM grant, Asset, or other source for the difference.</div>}

      {selected.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold">Selected starting gear</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-muted/50 text-xs"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2 text-right">Unit gp</th><th className="px-3 py-2 text-right">Weight</th><th className="px-3 py-2"></th></tr></thead>
              <tbody>
                {selected.map((item) => (
                  <tr key={`${item.category}-${item.catalogId}`} className="border-t">
                    <td className="px-3 py-2"><div className="font-medium">{item.name}</div><div className="text-xs capitalize text-muted-foreground">{item.category}</div></td>
                    <td className="px-3 py-2"><div className="flex items-center justify-center gap-1"><Button size="icon" variant="ghost" onClick={() => setDraft((current) => setInventoryQuantity(current, item.category, item.catalogId ?? '', item.quantity - 1))}><Minus className="h-3.5 w-3.5" /></Button><span className="w-8 text-center">{item.quantity}</span><Button size="icon" variant="ghost" onClick={() => setDraft((current) => setInventoryQuantity(current, item.category, item.catalogId ?? '', item.quantity + 1))}><Plus className="h-3.5 w-3.5" /></Button></div></td>
                    <td className="px-3 py-2 text-right">{item.unitPriceGp}</td>
                    <td className="px-3 py-2 text-right">{item.unitWeight}</td>
                    <td className="px-3 py-2 text-right"><Button size="icon" variant="ghost" onClick={() => setDraft((current) => setInventoryQuantity(current, item.category, item.catalogId ?? '', 0))}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Throwable items store only their ordinary Weight. Lob/Pitch/Hurl OR is calculated at throw time and is not stored per item.</p>
        </section>
      )}

      <section className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[190px_1fr]">
          <Select value={category} onValueChange={(value) => setCategory(value as InventoryCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="weapons">Weapons</SelectItem><SelectItem value="armor">Armor</SelectItem><SelectItem value="equipment">Equipment</SelectItem></SelectContent>
          </Select>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${catalogue.length} ${category}`} className="pl-9" /></div>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 90).map((item) => (
            <div key={item.catalogId} className="flex min-h-28 flex-col justify-between rounded-lg border p-3">
              <div><div className="font-medium">{item.name}</div><div className="mt-1 flex flex-wrap gap-1 text-xs"><Badge variant="outline">{item.priceGp} gp</Badge><Badge variant="outline">Wt {item.weight}</Badge>{item.traits.slice(0, 2).map((trait) => <Badge key={trait} variant="secondary">{trait}</Badge>)}</div></div>
              <Button type="button" size="sm" variant="outline" className="mt-3 self-start" onClick={() => setDraft((current) => addInventoryItem(current, category, item.catalogId, data))}>Add</Button>
            </div>
          ))}
        </div>
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
    return (!search || `${item.name} ${item.form} ${item.description}`.toLowerCase().includes(search)) && (grade === 'all' || item.gradeAvailability === grade);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/20 p-4">
        <div><div className="font-medium">Complete-data Magic Items only</div><p className="mt-1 text-sm text-muted-foreground">The runtime catalogue excludes placeholder records. Starting entitlement and exceptional availability remain explicit campaign/GM decisions rather than being inferred from incomplete pricing data.</p><Badge className="mt-2" variant="outline">{data.magicItems.length} usable records • {draft.utilities.magicItems.length} selected</Badge></div>
        <ReviewButton reviewed={draft.utilities.magicItemsReviewed} label="Magic Items" onClick={() => setDraft((current) => ({ ...current, utilities: { ...current.utilities, magicItemsReviewed: !current.utilities.magicItemsReviewed } }))} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Magic Items" className="pl-9" /></div>
        <Select value={grade} onValueChange={setGrade}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All grades</SelectItem>{grades.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {filtered.map((item) => {
          const active = selected.has(item.catalogId);
          return <Card key={item.catalogId} className={cn(active && 'border-primary')}><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{item.name}</CardTitle><div className="mt-1 flex gap-1.5"><Badge variant="outline">{item.gradeAvailability}</Badge><Badge variant="outline">{item.form}</Badge></div></div><Button size="sm" variant={active ? 'secondary' : 'outline'} onClick={() => setDraft((current) => toggleMagicItem(current, item.catalogId, data))}>{active ? 'Remove' : 'Add'}</Button></div></CardHeader><CardContent><p className="line-clamp-5 text-xs leading-relaxed text-muted-foreground">{item.description}</p></CardContent></Card>;
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
  const generate = () => {
    if (!languageId) return;
    const name = generateCharacterName(languageId, draft.utilities.nameStyle, data);
    if (!name) return;
    setDraft((current) => ({
      ...current,
      utilities: {
        ...current.utilities,
        nameLanguageId: languageId,
        properName: name,
        name: current.utilities.name.trim() || name,
      },
    }));
  };
  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2"><Label>Table / common name</Label><Input value={draft.utilities.name} onChange={(event) => setDraft((current) => ({ ...current, utilities: { ...current.utilities, name: event.target.value } }))} placeholder="Name used during play" /></div>
        <div className="space-y-2"><Label>Proper / formal name</Label><Input value={draft.utilities.properName} onChange={(event) => setDraft((current) => ({ ...current, utilities: { ...current.utilities, properName: event.target.value } }))} placeholder="Formal or birth name" /></div>
      </section>
      <section className="space-y-3 rounded-lg border p-4">
        <div><h3 className="font-semibold">Conlang name generator</h3><p className="mt-1 text-xs text-muted-foreground">Uses the existing D66 generator tables incorporated from the conlang source. The generated result is editable; the generator does not replace player choice.</p></div>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <Select value={languageId} onValueChange={(value) => setDraft((current) => ({ ...current, utilities: { ...current.utilities, nameLanguageId: value } }))}>
            <SelectTrigger><SelectValue placeholder="Choose naming language" /></SelectTrigger>
            <SelectContent>{data.languages.filter((entry) => data.nameGenerators.some((generatorEntry) => generatorEntry.languageId === entry.id)).map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={draft.utilities.nameStyle} onValueChange={(value) => setDraft((current) => ({ ...current, utilities: { ...current.utilities, nameStyle: value as CharacterDraft['utilities']['nameStyle'] } }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="any">Any personal ending</SelectItem><SelectItem value="masculine">Masculine ending</SelectItem><SelectItem value="feminine">Feminine ending</SelectItem></SelectContent>
          </Select>
          <Button type="button" onClick={generate} disabled={!generator}><WandSparkles className="h-4 w-4" />Generate</Button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs"><Badge variant="outline">{language?.name ?? 'No language'}</Badge>{language?.locus && <Badge variant="outline">{language.locus}</Badge>}{languageId === suggested && <Badge variant="secondary">Suggested from known language</Badge>}{generator && <Badge variant="outline">{generator.source}</Badge>}</div>
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
