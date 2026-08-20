'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { AlertTriangle, Check, Minus, Plus, Search, Trash2 } from 'lucide-react';

import type { StaticData } from '@/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PersistentAccordionSection from '@/components/persistent-accordion-section';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CharacterDraft, LanguageSelection } from '@/lib/character-draft';
import { selectedSettlementOption } from '@/lib/settlement-context';
import {
  addAdditionalSkill,
  addProficiencyLanguage,
  additionalSkillCost,
  ageRankValue,
  combinedGrantedTraits,
  compressedCapabilities,
  defaultLanguageSuggestion,
  formatLanguageRecord,
  LANGUAGE_RELEVANCE_MODIFIERS,
  LANGUAGE_MODIFIERS,
  LANGUAGE_REGISTER_MODIFIERS,
  languageProficiencyPoints,
  languageProficiencySpent,
  minimumAgeRankForPml,
  pmlCreationSummary,
  pmlTitle,
  pmlVirtuosityMilestones,
  removeAdditionalSkill,
  removeProficiencyLanguage,
  setCoreLanguage,
  setGrantSpecialization,
  setGrantSpecializationRanks,
  specializationOptionsForTrait,
  specializationRanksForSelection,
  updateAdditionalSkillSpecializations,
  setPml,
  setPmlVirtuosityChoice,
  skillpointBudget,
  startingSkillLimit,
  traitDefinitionForSelection,
  unresolvedBroadGrants,
  updateAdditionalSkill,
  updateLanguage,
} from '@/lib/rules/proficiencies';
import { cn } from '@/lib/utils';

type ProficienciesStepProps = {
  stepValue: string;
  data: StaticData;
  draft: CharacterDraft;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
};

function PmlStep({ data, draft, setDraft }: Omit<ProficienciesStepProps, 'stepValue'>) {
  const pml = draft.proficiencies.pml ?? 1;
  const summary = pmlCreationSummary(pml);
  const ageRank = ageRankValue(draft, data);
  const minRank = minimumAgeRankForPml(pml);
  const minGroup = data.ageGroups.find((entry) => Number(entry.rank) === minRank)?.ageGroup;
  const ageValid = ageRank != null && ageRank >= minRank;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold">Starting PML</h3>
          <p className="mt-1 text-sm text-muted-foreground">Standard player-characters begin at PML 1. Higher values are available for advanced campaigns and remain constrained by Age.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="icon" variant="outline" aria-label="Decrease PML" disabled={pml <= 1} onClick={() => setDraft((current) => setPml(current, pml - 1, data))}>
            <Minus className="h-4 w-4" />
          </Button>
          <div className="min-w-24 rounded-lg border px-5 py-3 text-center">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">PML</div>
            <div className="text-3xl font-semibold">{pml}</div>
          </div>
          <Button type="button" size="icon" variant="outline" aria-label="Increase PML" disabled={pml >= 20} onClick={() => setDraft((current) => setPml(current, pml + 1, data))}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" onClick={() => setDraft((current) => setPml(current, 1, data))}>Reset to standard PML 1</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{pmlTitle(pml, data) ?? 'PML'}</Badge>
          <Badge variant={ageValid ? 'outline' : 'destructive'}>
            Minimum age: {minGroup ?? `Rank ${minRank}`}{ageRank == null ? ' • age unresolved' : ageValid ? ' • met' : ' • not met'}
          </Badge>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Hitpoints</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">+{summary.hitpointBonus}</div><div className="text-xs text-muted-foreground">+3 per PML</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Favor dice</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{summary.favorDice}</div><div className="text-xs text-muted-foreground">session-start contribution</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reserves</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">+{summary.reserveBonus}</div><div className="text-xs text-muted-foreground">Endurance / Resilience / Resistance</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Max Advantage</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{summary.maxAdvantage}</div><div className="text-xs text-muted-foreground">PML-derived ceiling</div></CardContent></Card>
      </div>

      <div className="rounded-lg bg-muted/40 p-4 text-sm">
        <div className="font-medium">Creation effects at this PML</div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Recovery +{summary.recoveryBonus}</Badge>
          <Badge variant="outline">Virtuosity choices {summary.virtuosityChoices}</Badge>
          <Badge variant={summary.secondaryMutations ? 'secondary' : 'outline'}>Secondary mutations {summary.secondaryMutations}</Badge>
          <Badge variant={summary.psychologicalDisabilities ? 'secondary' : 'outline'}>PML psychological disabilities {summary.psychologicalDisabilities}</Badge>
        </div>
        {pml > 5 && <p className="mt-3 text-xs text-muted-foreground">Advanced mutation assignment is intentionally not automated in this tranche. The PML can be recorded, but those required choices remain a follow-up warning.</p>}
      </div>
    </div>
  );
}


function SpecializationControls({ selection, data, draft, onChange }: { selection: import('@/lib/character-draft').SourcedSelection; data: StaticData; draft: CharacterDraft; onChange: (ranks: Record<string, number>) => void }) {
  const options = specializationOptionsForTrait(selection, draft, data);
  const ranks = specializationRanksForSelection(selection, draft, data);
  const entries = Object.entries(ranks);
  const maxSlots = Math.max(1, selection.level ?? 1);
  const usedSlots = entries.reduce((sum, [, rank]) => sum + rank, 0);
  if (!selection.name.includes(' > ') && options.length === 0) return null;
  const replace = (from: string, to: string) => {
    if (!to || to === from) return;
    const next = { ...ranks };
    const count = next[from] ?? 1;
    delete next[from];
    next[to] = (next[to] ?? 0) + count;
    onChange(next);
  };
  const removeOne = (name: string) => {
    const next = { ...ranks };
    if ((next[name] ?? 0) > 1) next[name] -= 1;
    else delete next[name];
    onChange(next);
  };
  const add = () => {
    const next = { ...ranks };
    const unused = options.find((option) => !next[option]);
    const choice = unused ?? entries[0]?.[0] ?? options[0];
    if (!choice) return;
    next[choice] = (next[choice] ?? 0) + 1;
    onChange(next);
  };
  return <div className="flex flex-wrap items-center gap-2">
    {entries.map(([name, rank]) => <div key={name} className="flex items-center gap-1">
      <Select value={name} onValueChange={(value) => replace(name, value)}><SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger><SelectContent>{options.length ? options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>) : <SelectItem value={name}>{name}</SelectItem>}</SelectContent></Select>
      {rank > 1 && <Badge variant="secondary">×{rank}</Badge>}
      <Button type="button" size="icon" variant="ghost" className="h-11 w-11 sm:h-8 sm:w-8" aria-label={`Remove ${name} specialization`} onClick={() => removeOne(name)}><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>)}
    {usedSlots < maxSlots && options.length > 0 && <Button type="button" size="icon" variant="outline" className="h-11 w-11 sm:h-8 sm:w-8" aria-label={`Add ${selection.name} specialization`} onClick={add}><Plus className="h-3.5 w-3.5" /></Button>}
    {!entries.length && options.length > 0 && <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5" /> Specialization</Button>}
  </div>;
}

function GrantedTraitsStep({ data, draft, setDraft }: Omit<ProficienciesStepProps, 'stepValue'>) {
  const combined = combinedGrantedTraits(draft, data);
  const milestones = pmlVirtuosityMilestones(draft.proficiencies.pml);
  const virtuosity = data.traits.filter((trait) => trait.isVirtuosity && !trait.isDisability);
  const grants = [...draft.proficiencies.granted].sort((a,b) => a.name.localeCompare(b.name) || (a.sourceDetail ?? '').localeCompare(b.sourceDetail ?? ''));
  const purchasedBroad = [...draft.proficiencies.purchased, ...draft.background.disabilities]
    .filter((selection) => selection.name.includes(' > ') || specializationOptionsForTrait(selection, draft, data).length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
  const unresolvedIds = new Set(unresolvedBroadGrants(draft, data).map((selection) => selection.id));
  return <div className="space-y-6">
    {milestones.length > 0 && <section className="space-y-3"><div><h3 className="font-semibold">PML Virtuosity choices</h3><p className="mt-1 text-xs text-muted-foreground">Choose one Virtuosity trait at each reached milestone.</p></div><div className="grid gap-3 md:grid-cols-2">{milestones.map((milestone) => { const current = draft.proficiencies.pmlVirtuosityChoices.find((choice) => choice.milestone === milestone); return <div key={milestone} className="space-y-2 rounded-lg border p-3"><Label>PML {milestone}</Label><Select value={current?.traitId ?? ''} onValueChange={(value) => setDraft((state) => setPmlVirtuosityChoice(state, milestone, value, data))}><SelectTrigger><SelectValue placeholder="Choose Virtuosity" /></SelectTrigger><SelectContent>{virtuosity.map((trait) => <SelectItem key={trait.catalogId} value={trait.catalogId}>{trait.trait}</SelectItem>)}</SelectContent></Select></div>; })}</div></section>}
    <PersistentAccordionSection id="granted-skills-abilities-talents" title={<span>Granted Skills, Abilities, and Talents <Badge variant="outline" className="ml-2">{combined.length} compressed • {grants.length} sourced</Badge></span>}>
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Specialization controls live on the capability row. Duplicate sources remain visible here and compress later.</p>
        <div className="space-y-2">{grants.map((selection) => { const unresolved = unresolvedIds.has(selection.id); return <div key={selection.id} className={cn('grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(180px,1fr)_minmax(260px,1.5fr)]', unresolved && 'border-yellow-400 bg-yellow-100')}><div><div className="flex items-center gap-2 font-medium">{unresolved && <AlertTriangle className="h-4 w-4 text-black" />}{selection.name.split(' > ')[0].replace(/\s+X$/, '')} {(selection.level ?? 1) > 1 ? selection.level : ''}</div><div className="text-xs text-muted-foreground">{selection.sourceDetail ?? selection.source}</div>{unresolved && <div className="mt-[2px] text-xs font-medium text-black">Warning — choose a concrete specialization.</div>}</div><SpecializationControls selection={selection} data={data} draft={draft} onChange={(ranks) => setDraft((current) => setGrantSpecializationRanks(current, selection.id, ranks))} /></div>; })}{!grants.length && <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Complete Heritage, Species/Group/Lineage, and Trade to load grants.</div>}</div>
      </div>
    </PersistentAccordionSection>
    {purchasedBroad.length > 0 && <PersistentAccordionSection id="imported-skill-trait-specializations" title="Imported Skill and Trait specializations" defaultOpen={false}>
      <div className="space-y-3"><p className="text-xs text-muted-foreground">Loaded broad capabilities retain their rank, but require a concrete specialization where one was not recorded.</p><div className="space-y-2">{purchasedBroad.map((selection, index) => { const unresolved = unresolvedIds.has(selection.id); return <div key={`${selection.id}-${index}`} className={cn('grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(180px,1fr)_minmax(260px,1.5fr)]', unresolved && 'border-yellow-400 bg-yellow-100')}><div><div className="flex items-center gap-2 font-medium">{unresolved && <AlertTriangle className="h-4 w-4 text-black" />}{selection.name.split(' > ')[0].replace(/\s+X$/, '')} {(selection.level ?? 1) > 1 ? selection.level : ''}</div><div className="text-xs text-muted-foreground">{selection.sourceDetail ?? 'Loaded character'}</div>{unresolved && <div className="mt-[2px] text-xs font-medium text-black">Warning — choose a concrete specialization.</div>}</div><SpecializationControls selection={selection} data={data} draft={draft} onChange={(ranks) => setDraft((current) => setGrantSpecializationRanks(current, selection.id, ranks))} /></div>; })}</div></div>
    </PersistentAccordionSection>}
  </div>;
}

function AdditionalSkillsStep({ data, draft, setDraft }: Omit<ProficienciesStepProps, 'stepValue'>) {
  const [query, setQuery] = useState('');
  const budget = skillpointBudget(draft, data);
  const currentCapabilities = compressedCapabilities(draft, data);
  const catalogue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.traits
      .filter((trait) => !trait.isDisability && Number(trait.im) > 0)
      .filter((trait) => !q || trait.trait.toLowerCase().includes(q) || trait.category.toLowerCase().includes(q))
      .slice(0, 80);
  }, [data.traits, query]);

  return (
    <div className="space-y-6">
      <section className="top-20 z-10 rounded-lg border bg-background/95 p-4 shadow-sm backdrop-blur"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Skills and Traits</div><p className="mt-2 text-sm leading-relaxed">{currentCapabilities.length ? currentCapabilities.map((item) => item.display).join(', ') : 'No capabilities yet.'}</p></section>
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold">Creation Skillpoint budget</h3>
          <p className="mt-1 text-xs text-muted-foreground">Age, starting PML above 1, starting Trade Rank above 1, and selected Disability compensation fund this pool. Attribute/ZED purchases already made in Intrinsics are charged against the same pool.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Age</div><div className="text-xl font-semibold">{budget.age ?? '—'}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">PML + Trade</div><div className="text-xl font-semibold">+{budget.pml + budget.tradeRank}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Disabilities</div><div className="text-xl font-semibold">+{budget.disability}</div></CardContent></Card>
          <Card className={cn(budget.remaining != null && budget.remaining < 0 && 'border-destructive')}><CardContent className="p-3"><div className="text-xs text-muted-foreground">Remaining</div><div className="text-xl font-semibold">{budget.remaining ?? '—'}</div><div className="text-[11px] text-muted-foreground">{budget.spent}/{budget.available ?? '—'} spent</div></CardContent></Card>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Attributes/ZED {budget.attributeSpent}</Badge>
          <Badge variant="outline">Additional Skills {budget.skillSpent}</Badge>
        </div>
      </section>

      {draft.proficiencies.additionalSkills.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold">Added Skills and Traits</h3>
          <div className="space-y-3">
            {draft.proficiencies.additionalSkills.map((selection) => {
              const definition = traitDefinitionForSelection(selection, data);
              const cost = additionalSkillCost(selection, draft, data);
              const source = startingSkillLimit(selection.name, draft);
              const broad = selection.name.includes(' > ') || specializationOptionsForTrait(selection, draft, data).length > 0;
              return (
                <div key={selection.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{definition?.trait ?? selection.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">IM {cost.im} • source limit {source.limit} ({source.strength}) • cost {cost.total}{cost.surcharge ? ` including +${cost.surcharge} surcharge` : ''}</div>
                    </div>
                    <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${selection.name}`} onClick={() => setDraft((current) => removeAdditionalSkill(current, selection.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button type="button" size="icon" variant="outline" aria-label={`Decrease ${selection.name} level`} disabled={(selection.level ?? 1) <= 1} onClick={() => setDraft((current) => updateAdditionalSkill(current, selection.id, { level: (selection.level ?? 1) - 1 }))}><Minus className="h-4 w-4" /></Button>
                    <div className="min-w-20 text-center text-sm font-medium">Level {selection.level ?? 1}</div>
                    <Button type="button" size="icon" variant="outline" aria-label={`Increase ${selection.name} level`} disabled={(selection.level ?? 1) >= 5} onClick={() => setDraft((current) => updateAdditionalSkill(current, selection.id, { level: (selection.level ?? 1) + 1 }))}><Plus className="h-4 w-4" /></Button>
                    {broad && <SpecializationControls selection={selection} data={data} draft={draft} onChange={(ranks) => setDraft((current) => updateAdditionalSkillSpecializations(current, selection.id, ranks))} />}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="font-semibold">Trait and Skill catalogue</h3>
          <p className="mt-1 text-xs text-muted-foreground">Search and add a Skill or purchasable Trait, then set its starting level and any available specialization on the added row.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Skills and Traits…" aria-label="Search skills and traits" />
        </div>
        <div className="max-h-[420px] overflow-y-auto rounded-lg border">
          {catalogue.map((trait) => (
            <div key={trait.catalogId} className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{trait.trait}</div>
                <div className="text-xs text-muted-foreground">{trait.category} • IM {trait.im}</div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setDraft((current) => addAdditionalSkill(current, trait.catalogId, data))}><Plus className="h-4 w-4" /> Add</Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function languageBenefit(level: number) {
  if (level >= 8) return 'Eloquent';
  if (level >= 6) return 'Fluent';
  if (level >= 4) return 'Conversational';
  if (level === 3) return 'Familiar';
  if (level === 2) return 'Passable';
  return 'Rudimentary';
}

function LanguageCard({ language, data, setDraft }: { language: LanguageSelection; data: StaticData; setDraft: Dispatch<SetStateAction<CharacterDraft>> }) {
  const record = data.languages.find((item) => item.id === language.catalogId);
  const level = language.level ?? 1;
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{formatLanguageRecord(language)}</span><Badge variant="outline">{language.kind}</Badge><Badge variant="secondary">{languageBenefit(level)}</Badge></div>
          <div className="mt-1 text-xs text-muted-foreground">{record?.utility ?? 'Language'}{record?.locus ? ` • ${record.locus}` : ''}{record?.beatified ? ' • Beatified' : ''}</div>
        </div>
        {language.kind === 'proficiency' && <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${language.name}`} onClick={() => setDraft((current) => removeProficiencyLanguage(current, language.id))}><Trash2 className="h-4 w-4" /></Button>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="icon" variant="outline" aria-label={`Decrease ${language.name} proficiency`} disabled={language.improvements <= 0} onClick={() => setDraft((current) => updateLanguage(current, language.id, { improvements: language.improvements - 1 }))}><Minus className="h-4 w-4" /></Button>
        <span className="min-w-28 text-center text-sm">+{language.improvements} proficiency</span>
        <Button type="button" size="icon" variant="outline" aria-label={`Increase ${language.name} proficiency`} onClick={() => setDraft((current) => updateLanguage(current, language.id, { improvements: language.improvements + 1 }))}><Plus className="h-4 w-4" /></Button>
        <Button
          type="button"
          size="sm"
          variant={language.accentRemoved ? 'secondary' : 'outline'}
          disabled={!language.accentRemoved && level < 4}
          onClick={() => setDraft((current) => updateLanguage(current, language.id, { accentRemoved: !language.accentRemoved }))}
        >
          {language.accentRemoved ? <><Check className="h-4 w-4" /> Accent removed</> : 'Remove accent (1 point)'}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="w-full text-xs font-medium text-muted-foreground">Language modifier (choose one)</span>
        {[
          ['Relevance', LANGUAGE_RELEVANCE_MODIFIERS],
          ['Register', LANGUAGE_REGISTER_MODIFIERS],
        ].map(([category, modifiers]) => (
          <div key={category} className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{category}</span>
            {(modifiers as readonly typeof LANGUAGE_MODIFIERS[number][]).map((modifier) => {
              const active = language.modifiers?.includes(modifier) ?? false;
              return <Button
                key={modifier}
                type="button"
                size="sm"
                variant={active ? 'secondary' : 'outline'}
                aria-pressed={active}
                onClick={() => setDraft((current) => updateLanguage(current, language.id, {
                  modifiers: active ? [] : [modifier],
                }))}
              >{active ? <Check className="h-4 w-4" /> : null}+{modifier}</Button>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function LanguagesStep({ data, draft, setDraft }: Omit<ProficienciesStepProps, 'stepValue'>) {
  const available = languageProficiencyPoints(draft);
  const spent = languageProficiencySpent(draft);
  const defaultLanguage = draft.proficiencies.languages.find((language) => language.kind === 'default');
  const heritageLanguage = draft.proficiencies.languages.find((language) => language.kind === 'heritage');
  const suggestion = defaultLanguageSuggestion(draft, data);
  const settlement = selectedSettlementOption(draft, data);
  const heritageSuggestions = settlement?.heritageLanguageIds
    .map((id) => data.languages.find((language) => language.id === id)?.name)
    .filter((name): name is string => Boolean(name)) ?? [];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Free Languages</h3>
            <p className="mt-1 text-xs text-muted-foreground">Choose one accented regional default language and one accented Heritage language. Detailed starting settlements now supply their local default and historical-language context; legacy Citystates keep their canonical suggestions.</p>
          </div>
          <Badge variant={spent > available ? 'destructive' : 'secondary'}>Language proficiency {spent}/{available}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-3">
            <Label htmlFor="default-regional-language">Default regional language</Label>
            <Select value={defaultLanguage?.catalogId ?? ''} onValueChange={(value) => setDraft((current) => setCoreLanguage(current, 'default', value, data))}>
              <SelectTrigger id="default-regional-language"><SelectValue placeholder={suggestion ? `Suggested: ${suggestion.name}` : 'Choose regional language'} /></SelectTrigger>
              <SelectContent>{data.languages.map((language) => <SelectItem key={language.id} value={language.id}>{language.name}</SelectItem>)}</SelectContent>
            </Select>
            {suggestion && <div className="text-xs text-muted-foreground">Settlement suggestion: {suggestion.name}</div>}
            {settlement?.languageLayers.length ? <div className="text-xs text-muted-foreground">Toponym/language layers: {settlement.languageLayers.join(' • ')}</div> : null}
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <Label htmlFor="heritage-language">Heritage language</Label>
            <Select value={heritageLanguage?.catalogId ?? ''} onValueChange={(value) => setDraft((current) => setCoreLanguage(current, 'heritage', value, data))}>
              <SelectTrigger id="heritage-language"><SelectValue placeholder={heritageSuggestions.length ? `Local layers: ${heritageSuggestions.join(', ')}` : 'Choose Heritage language'} /></SelectTrigger>
              <SelectContent>{data.languages.map((language) => <SelectItem key={language.id} value={language.id}>{language.name}</SelectItem>)}</SelectContent>
            </Select>
            {heritageSuggestions.length > 0 && <div className="text-xs text-muted-foreground">Locally supported Heritage-language choices: {heritageSuggestions.join(', ')}. This remains a suggestion rather than a restriction.</div>}
          </div>
        </div>
      </section>

      {draft.proficiencies.languages.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold">Known Languages</h3>
          <div className="space-y-3">{draft.proficiencies.languages.map((language) => <LanguageCard key={language.id} language={language} data={data} setDraft={setDraft} />)}</div>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="font-semibold">Acquire another Language</h3>
          <p className="mt-1 text-xs text-muted-foreground">A new accented Language costs 1 Language proficiency point. Its starting level declines with the number already known.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.languages.map((language) => (
            <Button key={language.id} type="button" size="sm" variant="outline" disabled={spent >= available} onClick={() => setDraft((current) => addProficiencyLanguage(current, language.id, data))}>
              <Plus className="h-4 w-4" /> {language.name}{draft.proficiencies.languages.some((known) => known.catalogId === language.id) ? ' variant' : ''}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function ProficienciesStep(props: ProficienciesStepProps) {
  const common = { data: props.data, draft: props.draft, setDraft: props.setDraft };
  switch (props.stepValue) {
    case 'proficiencies-pml': return <PmlStep {...common} />;
    case 'proficiencies-skills-abilities-talents': return <GrantedTraitsStep {...common} />;
    case 'proficiencies-additional-skills': return <AdditionalSkillsStep {...common} />;
    case 'proficiencies-languages': return <LanguagesStep {...common} />;
    default: return null;
  }
}
