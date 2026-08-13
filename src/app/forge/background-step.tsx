'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, Search } from 'lucide-react';

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
import { resolveTragedySeed } from '@/lib/character-logic';
import { allowedEnvironNames, localeForRegion, selectedSettlementOption, settlementOptionsForRegion } from '@/lib/settlement-context';
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
  disabled?: boolean;
};

function ChoiceCard({ selected, title, subtitle, meta, onClick, disabled = false }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative rounded-lg border p-3 text-left transition-colors hover:bg-muted/60',
        selected && 'border-primary bg-primary/5 ring-1 ring-primary',
        disabled && 'cursor-not-allowed opacity-45 hover:bg-transparent',
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
  const settlementOptions = region ? settlementOptionsForRegion(region.name, data) : [];
  const selectedSettlement = selectedSettlementOption(draft, data);
  const locale = region ? localeForRegion(region.name, data) : null;
  const citystate = selectedSettlement
    ? data.citystates.find((item) => item.name === selectedSettlement.name)
    : undefined;
  const defaultLanguage = selectedSettlement?.defaultLanguageId
    ? data.languages.find((language) => language.id === selectedSettlement.defaultLanguageId)
    : null;

  const resetLocationDependentHeritage = (current: CharacterDraft, regionId: string, settlementId: string | null) => {
    const candidate: CharacterDraft = {
      ...current,
      background: {
        ...current.background,
        regionId,
        settlementId,
      },
    };
    const allowed = new Set(allowedEnvironNames(candidate, data));
    const currentEnviron = data.heritagePackages.find((pkg) => pkg.id === candidate.background.environHeritageId)?.name ?? null;
    const clearEnvirons = settlementId === null || Boolean(currentEnviron && allowed.size && !allowed.has(currentEnviron));
    const background = clearEnvirons
      ? { ...candidate.background, environHeritageId: null }
      : candidate.background;
    const withoutStaleDefaultLanguage = {
      ...candidate,
      background,
      proficiencies: {
        ...candidate.proficiencies,
        languages: candidate.proficiencies.languages.filter((language) => language.kind !== 'default'),
      },
    };
    return syncIntrinsics(syncHeritageGrantedSelections(withoutStaleDefaultLanguage, data), data);
  };

  const chooseRegion = (regionId: string) => {
    setDraft((current) => resetLocationDependentHeritage(current, regionId, null));
  };

  const chooseSettlement = (settlementId: string) => {
    if (!region) return;
    setDraft((current) => resetLocationDependentHeritage(current, region.catalogId, settlementId));
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
                  {item.region} — {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Starting settlement</Label>
          <Select
            value={draft.background.settlementId ?? undefined}
            onValueChange={chooseSettlement}
            disabled={!region}
          >
            <SelectTrigger><SelectValue placeholder={region ? 'Choose a settlement' : 'Choose a region first'} /></SelectTrigger>
            <SelectContent>
              {settlementOptions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.displayName}{item.workingGloss ? ` — ${item.workingGloss}` : ''}{item.population != null ? ` (${item.population.toLocaleString()})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {region && (
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <div className="font-medium">{region.region} — {region.name}</div>
          {locale && (
            <div className="mt-1 space-y-1 text-muted-foreground">
              <div>{locale.name}: {locale.population.toLocaleString()} population</div>
              <div><span className="font-medium text-foreground">Prominence:</span> {locale.currentDeitySpheres.join(', ')}</div>
              <div>Early native deity: {locale.historicalDeity.name} ({locale.historicalDeity.status})</div>
            </div>
          )}
          {selectedSettlement && (
            <>
              <div className="mt-3 font-medium">{selectedSettlement.displayName}{selectedSettlement.workingGloss ? ` — “${selectedSettlement.workingGloss}”` : ''}</div>
              <div className="mt-1 text-muted-foreground">
                {[selectedSettlement.settlementType, selectedSettlement.population != null ? `${selectedSettlement.population.toLocaleString()} population` : null, selectedSettlement.currentDeity ? `${selectedSettlement.currentDeity} sphere` : null].filter(Boolean).join(' • ')}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {citystate && <Badge variant="outline">{citystate.economicStatus}</Badge>}
                {selectedSettlement.environs.map((environ) => <Badge key={environ} variant="secondary">{environ}</Badge>)}
                {defaultLanguage && <Badge variant="outline">Default {defaultLanguage.name}</Badge>}
              </div>
              {selectedSettlement.languageLayers.length > 0 && (
                <div className="mt-3 text-xs text-muted-foreground">Language/toponym layers: {selectedSettlement.languageLayers.join(' • ')}</div>
              )}
              {selectedSettlement.nameStatus !== 'CANONICAL' && (
                <div className="mt-2 text-xs text-muted-foreground">Name status: {selectedSettlement.nameStatus.replaceAll('_', ' ').toLowerCase()}. English glosses remain available for table play.</div>
              )}
            </>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Starting location is a prerequisite for Heritage. Its local terrain constrains Environs Heritage and also informs Culture/Society recommendations, language suggestions, contextual Region/Settlement specializations, and later Wealth calculations.
      </p>
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
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Sex</Label><Select value={draft.background.sex ?? undefined} onValueChange={(sex) => setBackground({ sex: sex as CharacterDraft['background']['sex'], geneticallyFemale: sex === 'Male' ? false : draft.background.geneticallyFemale })}><SelectTrigger><SelectValue placeholder="Choose Sex" /></SelectTrigger><SelectContent>{['Male','Female','Intersex'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Gender</Label><Select value={draft.background.gender ?? undefined} onValueChange={(gender) => setBackground({ gender: gender as CharacterDraft['background']['gender'] })}><SelectTrigger><SelectValue placeholder="Choose Gender" /></SelectTrigger><SelectContent>{['Male','Female','Non-binary'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Handedness</Label><Select value={draft.background.handedness ?? undefined} onValueChange={(handedness) => setBackground({ handedness: handedness as CharacterDraft['background']['handedness'] })}><SelectTrigger><SelectValue placeholder="Choose handedness" /></SelectTrigger><SelectContent><SelectItem value="Right">Right</SelectItem><SelectItem value="Left">Left</SelectItem></SelectContent></Select></div>
        <label className={cn('flex items-start gap-3 rounded-lg border p-3', draft.background.sex === 'Male' && 'opacity-50')}><Checkbox disabled={draft.background.sex === 'Male' || !draft.background.sex} checked={draft.background.geneticallyFemale} onCheckedChange={(value) => setBackground({ geneticallyFemale: Boolean(value) })} /><span><span className="block font-medium">Apply Genetically Female adjustments</span><span className="text-xs text-muted-foreground">Available for non-Male Sex; applies the Group's structured female Attribute, characteristic, Trait, and managed-concern adjustments.</span></span></label>
      </div>
      <Separator />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2"><Label>Age Group</Label><Select value={draft.background.ageGroup ?? undefined} onValueChange={(ageGroup) => setBackground({ ageGroup, ageYears: null })}><SelectTrigger><SelectValue placeholder="Choose Age Group" /></SelectTrigger><SelectContent>{data.ageGroups.map((entry) => <SelectItem key={`${entry.rank}-${entry.ageGroup}`} value={entry.ageGroup}>{entry.ageGroup} [{entry.rank}]</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Age in years</Label><Input type="number" min={0} value={draft.background.ageYears ?? ''} onChange={(event) => setBackground({ ageYears: event.target.value === '' ? null : Math.max(0, Number.parseInt(event.target.value, 10) || 0) })} placeholder={group ? `Generated for ${group.name} or enter manually` : 'Set now or after Group'} /></div>
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
  const settlement = selectedSettlementOption(draft, data);
  const allowedEnvirons = new Set(allowedEnvironNames(draft, data));
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
    const pkg = data.heritagePackages.find((entry) => entry.id === id);
    if (kind === 'environs' && pkg && allowedEnvirons.size && !allowedEnvirons.has(pkg.name)) return;
    setDraft((current) => {
      const background = { ...current.background };
      if (kind === 'culture') background.culturalHeritageId = background.culturalHeritageId === id ? null : id;
      if (kind === 'environs') background.environHeritageId = background.environHeritageId === id ? null : id;
      if (kind === 'society') background.societalHeritageId = background.societalHeritageId === id ? null : id;
      return syncIntrinsics(syncHeritageGrantedSelections({ ...current, background }, data), data);
    });
  };

  if (!selectedRegion || !settlement) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm">
        <div className="font-medium">Starting Region & Settlement is required before Heritage.</div>
        <p className="mt-2 text-muted-foreground">Choose the character's origin first. The settlement establishes which Environs Heritage packages are valid and supplies the regional context used by several Heritage grants.</p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {categories.map((category) => {
        const packages = data.heritagePackages.filter((pkg) => pkg.kind === category.kind);
        const recommendedNames = new Set(
          category.kind === 'culture'
            ? settlement.cultureRecommendations
            : category.kind === 'society'
              ? settlement.societyRecommendations
              : settlement.environs,
        );
        return (
          <section key={category.kind} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{category.title} Heritage</h3>
              <span className="text-xs text-muted-foreground">
                {category.kind === 'environs' ? 'Only local Environs are selectable' : 'Local recommendations are marked'}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {packages.map((pkg) => {
                const recommended = recommendedNames.has(pkg.name);
                const incompatible = category.kind === 'environs' && allowedEnvirons.size > 0 && !allowedEnvirons.has(pkg.name);
                return (
                  <ChoiceCard
                    key={pkg.id}
                    selected={category.selectedId === pkg.id}
                    disabled={incompatible}
                    title={pkg.name}
                    subtitle={`${pkg.grants.length} granted capabilities${recommended ? category.kind === 'environs' ? ' • local environ' : ' • locally plausible' : incompatible ? ' • not present at starting settlement' : ''}`}
                    meta={`Wealth ${pkg.wealth >= 0 ? '+' : ''}${pkg.wealth}`}
                    onClick={() => selectPackage(category.kind, pkg.id)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
      <section className="rounded-lg border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{selectedRegion.region}</Badge>
          <Badge variant="outline">{settlement.displayName}</Badge>
          {settlement.population != null && <Badge variant="outline">Pop. {settlement.population.toLocaleString()}</Badge>}
          <Badge variant="outline">Wealth {heritageWealthAdjustment(draft, data) >= 0 ? '+' : ''}{heritageWealthAdjustment(draft, data)}</Badge>
          <Badge variant="outline">Rank {heritageRankAdjustment >= 0 ? '+' : ''}{heritageRankAdjustment}</Badge>
          <Badge variant="secondary">Age Group {draft.background.ageGroup ?? 'unassigned'}</Badge>
        </div>
        <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Granted Heritage capabilities</div>
        <p className="mt-1 text-sm leading-relaxed">{heritageCapabilityText.length ? heritageCapabilityText.join(', ') : 'Select Culture, Environs, and Society.'}</p>
        <div className="mt-3 text-xs text-muted-foreground">
          Environs is location-bound here: {settlement.environs.join(', ')}. Culture and Society remain player choices; local recommendations are highlighted rather than forced.
        </div>
      </section>
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
        <div className="mx-[5px] mt-[5px] grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

  return (
    <div className="space-y-5">
      <div>
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
      </div>
      {selected && (
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Template</div>
          <div className="mt-1 text-sm">{selected.seed}</div>
          <Separator className="my-3" />
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Resolved tragedy</div>
          <div className="mt-1 font-medium">{draft.background.tragedySeedText}</div>
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4"><div><div className="font-medium">Required Disads: {required}</div><div className="text-xs text-muted-foreground">Selected {draft.background.disabilities.length}. Extra negotiated Disabilities may remain selected.</div></div><Button type="button" size="sm" variant={draft.background.disabilitiesReviewed ? 'secondary' : 'outline'} onClick={() => setDraft((current) => ({ ...current, background: { ...current.background, disabilitiesReviewed: true } }))}>Review complete</Button></div>
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
  const selectedRegion = data.empires.find((item) => item.catalogId === draft.background.regionId);
  const settlement = selectedSettlementOption(draft, data);
  const locale = selectedRegion ? localeForRegion(selectedRegion.name, data) : null;

  return (
    <div className="space-y-5">
      {settlement && (
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <div className="font-medium">Local worship context — {settlement.displayName}</div>
          <div className="mt-1 text-muted-foreground">
            {settlement.currentDeity ? `Current divine sphere: ${settlement.currentDeity}. ` : ''}
            {locale ? `The wider ${locale.name} is covered by ${locale.currentDeitySpheres.join(' and ')}.` : ''}
          </div>
          {locale?.historicalDeity && (
            <div className="mt-1 text-xs text-muted-foreground">
              Historical layer: {locale.historicalDeity.name} ({locale.historicalDeity.status}) — {locale.historicalDeity.role}.
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">This is origin context only. Belief & Worship remains unrestricted by region.</div>
        </div>
      )}
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
              {data.deities.map((deity) => {
                const local = deity.deity === settlement?.currentDeity;
                const historical = deity.deity === locale?.historicalDeity?.name;
                return (
                  <SelectItem key={deity.catalogId} value={deity.catalogId}>
                    {deity.deity} — {deity.domains.join(', ')}{local ? ' • local sphere' : historical ? ` • historical ${locale?.historicalDeity.status.toLowerCase()}` : ''}
                  </SelectItem>
                );
              })}
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
