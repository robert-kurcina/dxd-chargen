'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, Dices, Search } from 'lucide-react';

import type { StaticData } from '@/data';
import { makeCatalogId } from '@/data/catalog-policy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { CharacterDraft, SourcedSelection } from '@/lib/character-draft';
import { getAgeInYears, resolveTragedySeed } from '@/lib/character-logic';
import {
  ageBonusText,
  ageGroupRank,
  formatGrantedCapabilities,
  heritageWealthAdjustment,
  requiredDisabilityCount,
  syncHeritageGrantedSelections,
} from '@/lib/rules/background';
import { getSpeciesChoice, syncIntrinsics } from '@/lib/rules/intrinsics';
import { cn } from '@/lib/utils';

type BackgroundStepProps = {
  stepValue: string;
  data: StaticData;
  draft: CharacterDraft;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
};

type ChoiceCardProps = {
  selected: boolean;
  title: string;
  subtitle?: string;
  meta?: string;
  onClick: () => void;
};

function ChoiceCard({ selected, title, subtitle, meta, onClick }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative rounded-lg border p-3 text-left transition-colors hover:bg-muted/60',
        selected && 'border-primary bg-primary/5 ring-1 ring-primary',
      )}
    >
      {selected && (
        <span className="absolute right-2 top-2 rounded-full bg-primary p-0.5 text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      )}
      <div className="pr-6 font-medium">{title}</div>
      {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
      {meta && <div className="mt-2 text-xs font-medium">{meta}</div>}
    </button>
  );
}

function RegionSettlementStep({ data, draft, setDraft }: Omit<BackgroundStepProps, 'stepValue'>) {
  const region = data.empires.find((item) => item.catalogId === draft.background.regionId);
  const weightedSettlements = region ? data.settlements[region.name as keyof typeof data.settlements] ?? [] : [];
  const settlementOptions = Array.from(new Set(weightedSettlements)).map((name) => ({
    id: makeCatalogId('settlement', `${region?.name ?? 'unknown'}-${name}`),
    name,
  }));
  const selectedSettlement = settlementOptions.find((item) => item.id === draft.background.settlementId);
  const citystate = selectedSettlement
    ? data.citystates.find((item) => item.name === selectedSettlement.name)
    : undefined;

  const chooseRegion = (regionId: string) => {
    setDraft((current) => syncIntrinsics({
      ...current,
      background: {
        ...current.background,
        regionId,
        settlementId: null,
      },
    }, data));
  };

  const rollSettlement = () => {
    if (!region || weightedSettlements.length === 0) return;
    const name = weightedSettlements[Math.floor(Math.random() * weightedSettlements.length)];
    const id = makeCatalogId('settlement', `${region.name}-${name}`);
    setDraft((current) => syncIntrinsics({
      ...current,
      background: { ...current.background, settlementId: id },
    }, data));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Starting region</Label>
          <Select value={draft.background.regionId ?? undefined} onValueChange={chooseRegion}>
            <SelectTrigger><SelectValue placeholder="Choose a region" /></SelectTrigger>
            <SelectContent>
              {data.empires.map((item) => (
                <SelectItem key={item.catalogId} value={item.catalogId}>
                  {item.name} — {item.region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Starting settlement</Label>
            <Button type="button" size="sm" variant="ghost" onClick={rollSettlement} disabled={!region}>
              <Dices className="h-4 w-4" /> Roll
            </Button>
          </div>
          <Select
            value={draft.background.settlementId ?? undefined}
            onValueChange={(settlementId) =>
              setDraft((current) => syncIntrinsics({
                ...current,
                background: { ...current.background, settlementId },
              }, data))
            }
            disabled={!region}
          >
            <SelectTrigger><SelectValue placeholder={region ? 'Choose a settlement' : 'Choose a region first'} /></SelectTrigger>
            <SelectContent>
              {settlementOptions.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {region && (
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <div className="font-medium">{region.name}</div>
          <div className="mt-1 text-muted-foreground">Region: {region.region}</div>
          {selectedSettlement && <div className="mt-1">Settlement: {selectedSettlement.name}</div>}
          {citystate && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{citystate.economicStatus}</Badge>
              {citystate.environs.map((environ) => <Badge key={environ} variant="secondary">{environ}</Badge>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DemographicsStep({ data, draft, setDraft }: Omit<BackgroundStepProps, 'stepValue'>) {
  const group = getSpeciesChoice(draft, data)?.group ?? null;
  const rank = ageGroupRank(draft, data);
  const bonus = ageBonusText(draft, data);
  const ageModifier = data.attributeModifiers.find((entry) => entry.Group === draft.background.ageGroup);
  const secondary = data.characteristicModifiers.find((entry) => entry.Group === draft.background.ageGroup);
  const setBackground = (changes: Partial<CharacterDraft['background']>) => {
    setDraft((current) => syncIntrinsics(
      syncHeritageGrantedSelections({ ...current, background: { ...current.background, ...changes } }, data),
      data,
    ));
  };
  const generateAge = () => {
    if (!group || !draft.background.ageGroup || !group.hasAgeBrackets) return;
    const years = getAgeInYears(group.name as keyof StaticData['ageBrackets'], draft.background.ageGroup, data.ageBrackets, data.ageGroups);
    if (years != null) setBackground({ ageYears: years });
  };
  const generateDemographics = () => {
    const ageRoll = (1 + Math.floor(Math.random() * 6)) * 10 + (1 + Math.floor(Math.random() * 6));
    const ageGroup = data.ageGroups.find((entry) => {
      const source = String(entry.d66 ?? '');
      if (!/\d/.test(source)) return false;
      const [lo, hi = lo] = source.split('-').map(Number);
      return ageRoll >= lo && ageRoll <= hi;
    })?.ageGroup ?? 'Youth';
    const sexRoll = Math.floor(Math.random() * 100) + 1;
    const sex: CharacterDraft['background']['sex'] = sexRoll === 100 ? 'Intersex' : sexRoll <= 50 ? 'Female' : 'Male';
    const generatedYears = group?.hasAgeBrackets ? getAgeInYears(group.name as keyof StaticData['ageBrackets'], ageGroup, data.ageBrackets, data.ageGroups) : null;
    const genderOptions: NonNullable<CharacterDraft['background']['gender']>[] = ['Male', 'Female', 'Non-binary'];
    const gender = genderOptions[Math.floor(Math.random() * genderOptions.length)];
    setDraft((current) => syncIntrinsics(
      syncHeritageGrantedSelections({
        ...current,
        background: {
          ...current.background,
          sex,
          gender,
          geneticallyFemale: sex === 'Female',
          handedness: Math.random() < 0.15 ? 'Left' : 'Right',
          ageGroup,
          ageYears: generatedYears,
          birthMonth: 1 + Math.floor(Math.random() * 12),
        },
      }, data),
      data,
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button type="button" size="sm" variant="outline" onClick={generateDemographics}><Dices className="h-4 w-4" /> Generate</Button></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Sex</Label><Select value={draft.background.sex ?? undefined} onValueChange={(sex) => setBackground({ sex: sex as CharacterDraft['background']['sex'], geneticallyFemale: sex === 'Male' ? false : draft.background.geneticallyFemale })}><SelectTrigger><SelectValue placeholder="Choose Sex" /></SelectTrigger><SelectContent>{['Male','Female','Intersex'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Gender</Label><Select value={draft.background.gender ?? undefined} onValueChange={(gender) => setBackground({ gender: gender as CharacterDraft['background']['gender'] })}><SelectTrigger><SelectValue placeholder="Choose Gender" /></SelectTrigger><SelectContent>{['Male','Female','Non-binary'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Handedness</Label><Select value={draft.background.handedness ?? undefined} onValueChange={(handedness) => setBackground({ handedness: handedness as CharacterDraft['background']['handedness'] })}><SelectTrigger><SelectValue placeholder="Choose handedness" /></SelectTrigger><SelectContent><SelectItem value="Right">Right</SelectItem><SelectItem value="Left">Left</SelectItem></SelectContent></Select></div>
        <label className={cn('flex items-center gap-3 rounded-lg border p-3', draft.background.sex === 'Male' && 'opacity-50')}><Checkbox disabled={draft.background.sex === 'Male' || !draft.background.sex} checked={draft.background.geneticallyFemale} onCheckedChange={(value) => setBackground({ geneticallyFemale: Boolean(value) })} /><span><span className="block font-medium">Apply Genetically Female adjustments</span><span className="text-xs text-muted-foreground">Available for non-Male Sex; applies the Group's structured female Attribute, characteristic, Trait, and managed-concern adjustments.</span></span></label>
      </div>
      <Separator />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label>Age Group</Label><Select value={draft.background.ageGroup ?? undefined} onValueChange={(ageGroup) => setBackground({ ageGroup, ageYears: null })}><SelectTrigger><SelectValue placeholder="Choose Age Group" /></SelectTrigger><SelectContent>{data.ageGroups.map((entry) => <SelectItem key={`${entry.rank}-${entry.ageGroup}`} value={entry.ageGroup}>{entry.ageGroup} [{entry.rank}]</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><div className="flex items-center justify-between"><Label>Age in years</Label><Button type="button" variant="ghost" size="sm" disabled={!group || !draft.background.ageGroup || !group.hasAgeBrackets} onClick={generateAge}><Dices className="h-4 w-4" /> Generate</Button></div><Input type="number" min={0} value={draft.background.ageYears ?? ''} onChange={(event) => setBackground({ ageYears: event.target.value === '' ? null : Math.max(0, Number.parseInt(event.target.value, 10) || 0) })} placeholder={group ? `Generate for ${group.name}` : 'Set now or after Group'} /></div>
        <div className="space-y-2"><Label>Birth Month</Label><Select value={draft.background.birthMonth?.toString()} onValueChange={(value) => setBackground({ birthMonth: Number(value) })}><SelectTrigger><SelectValue placeholder="Month 1–12" /></SelectTrigger><SelectContent>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <SelectItem key={month} value={String(month)}>Month {month}</SelectItem>)}</SelectContent></Select></div>
      </div>
      {draft.background.ageGroup && <div className="rounded-lg border bg-muted/30 p-4 text-sm"><div className="flex flex-wrap gap-2"><Badge variant="outline">Age Rank {rank ?? '?'}</Badge>{bonus && <Badge variant="secondary">Bonus {bonus}</Badge>}<Badge variant="outline">Required Disads {requiredDisabilityCount(draft, data)}</Badge></div><div className="mt-3 text-xs text-muted-foreground">Age Group modifiers: {ageModifier ? `CCA ${ageModifier.CCA}, RCA ${ageModifier.RCA}, REF ${ageModifier.REF}, INT ${ageModifier.INT}, KNO ${ageModifier.KNO}, PRE ${ageModifier.PRE}, POW ${ageModifier.POW}, STR ${ageModifier.STR}, FOR ${ageModifier.FOR}, MOV ${ageModifier.MOV}, ZED ${ageModifier.ZED}` : 'none'}; secondary Body {secondary?.Bodypoints ?? 0}, Build {secondary?.Build ?? 0}, Stature {secondary?.Stature ?? 0}, Resilience {secondary?.Resilience ?? 0}.</div></div>}
    </div>
  );
}

function AgeStep({ data, draft, setDraft }: Omit<BackgroundStepProps, 'stepValue'>) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Age group</Label>
          <Select
            value={draft.background.ageGroup ?? undefined}
            onValueChange={(ageGroup) =>
              setDraft((current) => syncIntrinsics({
                ...current,
                background: { ...current.background, ageGroup, ageYears: null },
              }, data))
            }
          >
            <SelectTrigger><SelectValue placeholder="Choose an age group" /></SelectTrigger>
            <SelectContent>
              {data.ageGroups.map((item) => (
                <SelectItem key={`${item.rank}-${item.ageGroup}`} value={item.ageGroup}>
                  {item.ageGroup} [{item.rank}]
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="age-years">Exact age in years (optional for now)</Label>
          <Input
            id="age-years"
            type="number"
            min={0}
            value={draft.background.ageYears ?? ''}
            placeholder="Resolve after Species if needed"
            onChange={(event) => {
              const value = event.target.value;
              setDraft((current) => syncIntrinsics({
                ...current,
                background: {
                  ...current.background,
                  ageYears: value === '' ? null : Math.max(0, Number.parseInt(value, 10) || 0),
                },
              }, data));
            }}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Exact age brackets are species-dependent. The Forge accepts the age group now and will validate or generate exact years after Species is established.
      </p>
    </div>
  );
}

function HeritageStep({ data, draft, setDraft }: Omit<BackgroundStepProps, 'stepValue'>) {
  const selectedRegion = data.empires.find((item) => item.catalogId === draft.background.regionId);
  const settlementNames = selectedRegion
    ? Array.from(new Set(data.settlements[selectedRegion.name as keyof typeof data.settlements] ?? []))
    : [];
  const selectedSettlementName = settlementNames.find(
    (name) => makeCatalogId('settlement', `${selectedRegion?.name ?? 'unknown'}-${name}`) === draft.background.settlementId,
  );
  const settlementCitystate = selectedSettlementName
    ? data.citystates.find((item) => item.name === selectedSettlementName)
    : undefined;
  const recommendedEnvirons = new Set(settlementCitystate?.environs ?? []);
  const heritageGranted = draft.proficiencies.granted.filter((item) => item.source === 'heritage');
  const heritageCapabilityText = formatGrantedCapabilities(heritageGranted);
  const heritageRankAdjustment = [draft.background.culturalHeritageId, draft.background.environHeritageId, draft.background.societalHeritageId]
    .filter(Boolean)
    .map((id) => data.heritagePackages.find((pkg) => pkg.id === id)?.social ?? 0)
    .reduce((sum, value) => sum + value, 0);

  const categories = [
    { kind: 'culture', title: 'Culture', selectedId: draft.background.culturalHeritageId },
    { kind: 'environs', title: 'Environs', selectedId: draft.background.environHeritageId },
    { kind: 'society', title: 'Society', selectedId: draft.background.societalHeritageId },
  ] as const;

  const selectPackage = (kind: 'culture' | 'environs' | 'society', id: string) => {
    setDraft((current) => {
      const background = { ...current.background };
      if (kind === 'culture') background.culturalHeritageId = background.culturalHeritageId === id ? null : id;
      if (kind === 'environs') background.environHeritageId = background.environHeritageId === id ? null : id;
      if (kind === 'society') background.societalHeritageId = background.societalHeritageId === id ? null : id;
      return syncIntrinsics(syncHeritageGrantedSelections({ ...current, background }, data), data);
    });
  };

  return (
    <div className="space-y-7">
      <div className="sticky top-20 z-10 rounded-lg border bg-background/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Wealth {heritageWealthAdjustment(draft, data) >= 0 ? '+' : ''}{heritageWealthAdjustment(draft, data)}</Badge><Badge variant="outline">Rank {heritageRankAdjustment >= 0 ? '+' : ''}{heritageRankAdjustment}</Badge><Badge variant="secondary">Age Group {draft.background.ageGroup ?? 'unassigned'}</Badge></div>
        <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Granted Heritage capabilities</div>
        <p className="mt-1 text-sm leading-relaxed">{heritageCapabilityText.length ? heritageCapabilityText.join(', ') : 'Select Culture, Environs, and Society.'}</p>
      </div>
      {categories.map((category) => {
        const packages = data.heritagePackages.filter((pkg) => pkg.kind === category.kind);
        return (
          <section key={category.kind} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{category.title} Heritage</h3>
              {category.kind === 'environs' && recommendedEnvirons.size > 0 && (
                <span className="text-xs text-muted-foreground">Settlement-compatible environs are marked</span>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {packages.map((pkg) => {
                const recommended = category.kind === 'environs' && recommendedEnvirons.has(pkg.name);
                return (
                  <ChoiceCard
                    key={pkg.id}
                    selected={category.selectedId === pkg.id}
                    title={pkg.name}
                    subtitle={`${pkg.grants.length} granted capabilities${recommended ? ' • local environ' : ''}`}
                    meta={`Wealth ${pkg.wealth >= 0 ? '+' : ''}${pkg.wealth}`}
                    onClick={() => selectPackage(category.kind, pkg.id)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

    </div>
  );
}

function SocialRankStep({ data, draft, setDraft }: Omit<BackgroundStepProps, 'stepValue'>) {
  const selectedSocietyPackage = data.heritagePackages.find(
    (pkg) => pkg.id === draft.background.societalHeritageId,
  );

  return (
    <div className="space-y-4">
      {selectedSocietyPackage && (
        <p className="text-sm text-muted-foreground">
          Current Society Heritage: <span className="font-medium text-foreground">{selectedSocietyPackage.name}</span>. The matching social-rank entry is highlighted but not forced.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {data.socialRanks.map((rank) => (
          <ChoiceCard
            key={rank.catalogId}
            selected={draft.background.socialRankId === rank.catalogId}
            title={rank.society}
            subtitle={`${rank.titles.join(' • ')}${selectedSocietyPackage?.name === rank.society ? ' • matches Society Heritage' : ''}`}
            meta={`Social Rank ${rank.socialRank}`}
            onClick={() =>
              setDraft((current) => syncIntrinsics({
                ...current,
                background: {
                  ...current.background,
                  socialRankId: rank.catalogId,
                  socialRank: rank.socialRank,
                },
              }, data))
            }
          />
        ))}
      </div>
    </div>
  );
}

function PersonalityStep({ data, draft, setDraft }: Omit<BackgroundStepProps, 'stepValue'>) {
  const [query, setQuery] = useState('');
  const choices = useMemo(
    () => data.descriptors.flatMap((row) => Object.entries(row)
      .filter(([key]) => key !== 'd66')
      .map(([band, name]) => ({
        id: makeCatalogId('personality', String(name)),
        name: String(name),
        sourceDetail: `Descriptor ${row.d66}/${band}`,
      }))),
    [data.descriptors],
  );
  const filtered = choices.filter((choice) => choice.name.toLowerCase().includes(query.toLowerCase()));
  const selectedIds = new Set(draft.background.personality.map((item) => item.id));

  const toggle = (choice: (typeof choices)[number]) => {
    setDraft((current) => {
      const exists = current.background.personality.some((item) => item.id === choice.id);
      const personality = exists
        ? current.background.personality.filter((item) => item.id !== choice.id)
        : [
            ...current.background.personality,
            {
              id: choice.id,
              name: choice.name,
              source: 'player' as const,
              sourceDetail: choice.sourceDetail,
            },
          ];
      return { ...current, background: { ...current.background, personality } };
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search 108 descriptors" className="pl-9" />
      </div>
      {draft.background.personality.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {draft.background.personality.map((item) => (
            <Button key={item.id} size="sm" variant="secondary" onClick={() => toggle({ id: item.id, name: item.name, sourceDetail: item.sourceDetail ?? '' })}>
              {item.name} ×
            </Button>
          ))}
        </div>
      )}
      <ScrollArea className="h-[320px] rounded-lg border p-2">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((choice) => (
            <ChoiceCard
              key={choice.id}
              selected={selectedIds.has(choice.id)}
              title={choice.name}
              subtitle={choice.sourceDetail}
              onClick={() => toggle(choice)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function TragedyStep({ data, draft, setDraft }: Omit<BackgroundStepProps, 'stepValue'>) {
  const selected = data.tragedySeeds.find((item) => item.catalogId === draft.background.tragedySeedId);

  const resolve = (item: StaticData['tragedySeeds'][number]) => {
    const tragedySeedText = resolveTragedySeed(item.seed, data.randomPersonItemDeity);
    setDraft((current) => ({
      ...current,
      background: {
        ...current.background,
        tragedySeedId: item.catalogId,
        tragedySeedText,
      },
    }));
  };

  const generateRandom = () => {
    const item = data.tragedySeeds[Math.floor(Math.random() * data.tragedySeeds.length)];
    if (item) resolve(item);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={draft.background.tragedySeedId ?? undefined}
          onValueChange={(id) => {
            const item = data.tragedySeeds.find((entry) => entry.catalogId === id);
            if (item) resolve(item);
          }}
        >
          <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a tragedy template" /></SelectTrigger>
          <SelectContent>
            {data.tragedySeeds.map((item) => (
              <SelectItem key={item.catalogId} value={item.catalogId}>{item.d66}: {item.seed}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={generateRandom}><Dices className="h-4 w-4" /> Generate</Button>
      </div>
      {selected && (
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Template</div>
          <div className="mt-1 text-sm">{selected.seed}</div>
          <Separator className="my-3" />
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Resolved tragedy</div>
          <div className="mt-1 font-medium">{draft.background.tragedySeedText}</div>
          <Button type="button" size="sm" variant="ghost" className="mt-3" onClick={() => resolve(selected)}>
            <Dices className="h-4 w-4" /> Reroll details
          </Button>
        </div>
      )}
    </div>
  );
}

function DisabilitiesStep({ data, draft, setDraft }: Omit<BackgroundStepProps, 'stepValue'>) {
  const [query, setQuery] = useState('');
  const filtered = data.disabilities.filter((item) =>
    item.disability.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedIds = new Set(draft.background.disabilities.map((item) => item.id));
  const required = requiredDisabilityCount(draft, data);
  const generateRequired = () => {
    const generated: SourcedSelection[] = [];
    const used = new Set<string>();
    for (let index = 0; index < required; index += 1) {
      let item: StaticData['disabilities'][number] | undefined;
      for (let attempt = 0; attempt < 20 && !item; attempt += 1) {
        const roll = (1 + Math.floor(Math.random() * 6)) * 10 + (1 + Math.floor(Math.random() * 6));
        const candidate = data.disabilities.find((entry) => Number(entry.d66) === roll);
        if (candidate && !used.has(candidate.catalogId)) item = candidate;
      }
      item ??= data.disabilities.find((entry) => !used.has(entry.catalogId));
      if (!item) break;
      used.add(item.catalogId);
      generated.push({ id: item.catalogId, catalogId: item.catalogId, name: item.disability, source: 'player', sourceDetail: `Disability table ${item.d66}`, level: 1 });
    }
    setDraft((current) => ({ ...current, background: { ...current.background, disabilities: generated, disabilitiesReviewed: true } }));
  };

  const toggle = (item: StaticData['disabilities'][number]) => {
    setDraft((current) => {
      const exists = current.background.disabilities.some((entry) => entry.id === item.catalogId);
      const disabilities: SourcedSelection[] = exists
        ? current.background.disabilities.filter((entry) => entry.id !== item.catalogId)
        : [
            ...current.background.disabilities,
            {
              id: item.catalogId,
              name: item.disability,
              source: 'player',
              sourceDetail: `Disability table ${item.d66}`,
              level: 1,
            },
          ];
      return {
        ...current,
        background: { ...current.background, disabilities, disabilitiesReviewed: true },
      };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4"><div><div className="font-medium">Required Disads: {required}</div><div className="text-xs text-muted-foreground">Selected {draft.background.disabilities.length}. Extra negotiated Disabilities may remain selected.</div></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={generateRequired}><Dices className="h-4 w-4" /> {draft.background.disabilities.length ? 'Re-roll' : 'Generate'}</Button><Button type="button" size="sm" variant={draft.background.disabilitiesReviewed ? 'secondary' : 'outline'} onClick={() => setDraft((current) => ({ ...current, background: { ...current.background, disabilitiesReviewed: true } }))}>Review complete</Button></div></div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search disabilities" className="pl-9" />
        </div>
        <Button
          type="button"
          variant={draft.background.disabilitiesReviewed && draft.background.disabilities.length === 0 ? 'default' : 'outline'}
          onClick={() =>
            setDraft((current) => ({
              ...current,
              background: { ...current.background, disabilities: [], disabilitiesReviewed: true },
            }))
          }
        >
          None
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((item) => (
          <label key={item.catalogId} className="flex cursor-pointer gap-3 rounded-lg border p-3 hover:bg-muted/50">
            <Checkbox checked={selectedIds.has(item.catalogId)} onCheckedChange={() => toggle(item)} />
            <span className="min-w-0">
              <span className="block font-medium">{item.disability}</span>
              <span className="text-xs text-muted-foreground">D66 {item.d66} • Cost {item.cost}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function BeliefStep({ data, draft, setDraft }: Omit<BackgroundStepProps, 'stepValue'>) {
  const selectedBelief = data.beliefs.find((item) => item.catalogId === draft.background.beliefId);

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.beliefs.map((belief) => (
          <ChoiceCard
            key={belief.catalogId}
            selected={draft.background.beliefId === belief.catalogId}
            title={belief.keyword}
            subtitle={belief.description}
            onClick={() =>
              setDraft((current) => ({
                ...current,
                background: {
                  ...current.background,
                  beliefId: belief.catalogId,
                  deityId: belief.isDeity ? current.background.deityId : null,
                },
              }))
            }
          />
        ))}
      </div>
      {selectedBelief?.isDeity && (
        <div className="space-y-2 rounded-lg border p-4">
          <Label>Deity</Label>
          <p className="text-xs text-muted-foreground">Any known deity may be chosen; no regional restriction is imposed.</p>
          <Select
            value={draft.background.deityId ?? undefined}
            onValueChange={(deityId) =>
              setDraft((current) => ({
                ...current,
                background: { ...current.background, deityId },
              }))
            }
          >
            <SelectTrigger><SelectValue placeholder="Choose a deity" /></SelectTrigger>
            <SelectContent>
              {data.deities.map((deity) => (
                <SelectItem key={deity.catalogId} value={deity.catalogId}>
                  {deity.deity} — {deity.domains.join(', ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export default function BackgroundStep(props: BackgroundStepProps) {
  const common = { data: props.data, draft: props.draft, setDraft: props.setDraft };

  switch (props.stepValue) {
    case 'background-region-settlement': return <RegionSettlementStep {...common} />;
    case 'background-demographics': return <DemographicsStep {...common} />;
    case 'background-age': return <AgeStep {...common} />;
    case 'background-heritage': return <HeritageStep {...common} />;
    case 'background-social-rank': return <SocialRankStep {...common} />;
    case 'background-personality': return <PersonalityStep {...common} />;
    case 'background-tragedy-seed': return <TragedyStep {...common} />;
    case 'background-disabilities': return <DisabilitiesStep {...common} />;
    case 'background-belief-worship': return <BeliefStep {...common} />;
    default: return null;
  }
}
