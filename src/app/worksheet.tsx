'use client';

import { Fragment, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  AlertTriangle,
  Check,
  Dices,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Circle,
  RotateCcw,
} from 'lucide-react';

import type { StaticData } from '@/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { createEmptyCharacterDraft, type CharacterDraft } from '@/lib/character-draft';
import PersistentAccordionSection from '@/components/persistent-accordion-section';
import {
  assessBackgroundStep,
  heritageWealthAdjustment,
  isBackgroundStep,
  syncHeritageGrantedSelections,
} from '@/lib/rules/background';
import {
  assessIntrinsicStep,
  getFinalAttributeValue,
  getLineageName,
  getSpeciesChoice,
  getTradePackage,
  getTradeSpecialization,
  isIntrinsicStep,
  syncIntrinsics,
} from '@/lib/rules/intrinsics';
import BackgroundStep from './forge/background-step';
import IntrinsicsStep from './forge/intrinsics-step';
import ProficienciesStep from './forge/proficiencies-step';
import PropertiesStep from './forge/properties-step';
import UtilitiesStep from './forge/utilities-step';
import {
  assessProficiencyStep,
  isProficiencyStep,
  compressedCapabilities,
  skillpointBudget,
} from '@/lib/rules/proficiencies';
import {
  assessPropertyStep,
  isPropertyStep,
  syncProperties,
} from '@/lib/rules/properties';
import {
  assessUtilityStep,
  isUtilityStep,
  personalWealthGp,
  startingGearTotals,
} from '@/lib/rules/utilities';
import { canGenerateStep, generateStep } from '@/lib/rules/generate-step';
import { cn } from '@/lib/utils';

type CreationPhase = StaticData['steps'][number];
type CreationStep = CreationPhase['substeps'][number] & {
  phaseTitle: string;
  phaseValue: string;
};

function catalogueSummary(stepValue: string, data: StaticData) {
  if (stepValue.includes('region-settlement')) {
    return [
      `${data.citystates.length} citystates`,
      `${Object.values(data.settlements).reduce((total, entries) => total + entries.length, 0)} settlements`,
      `${data.empires.length} empires/regions`,
    ];
  }
  if (stepValue.includes('heritage')) {
    return [
      `${data.culturalHeritage.length} cultural entries`,
      `${data.environHeritage.length} environmental entries`,
      `${data.societalHeritage.length} societal entries`,
    ];
  }
  if (stepValue.includes('social-rank')) return [`${data.socialRanks.length} social-rank entries`];
  if (stepValue.includes('tragedy')) return [`${data.tragedySeeds.length} tragedy seeds`];
  if (stepValue.includes('disabilities')) return [`${data.disabilities.length} disability entries`];
  if (stepValue.includes('belief')) {
    return [`${data.beliefs.length} beliefs`, `${data.deities.length} deities`];
  }
  if (stepValue.includes('species')) return [`${data.species.reduce((total, family) => total + family.groups.length, 0)} Sophont species entries`];
  if (stepValue.includes('attributes')) {
    return [
      `${Object.keys(data.attributeArrays).length} attribute arrays`,
      `${data.attributeDefinitions.length} attribute definitions`,
    ];
  }
  if (stepValue.includes('trade-specialization')) return [`${data.tradePackages.length} complete playable Trade packages`];
  if (stepValue.includes('wealth')) return [`${data.wealthTitles.length} wealth titles`];
  if (stepValue.includes('pml')) return [`${data.pmlTitles.length} PML titles`, `${data.pmlAgeMinimums.length} PML age rules`];
  if (stepValue.includes('skills-abilities-talents') || stepValue.includes('additional-skills')) {
    return [`${data.traits.length} trait/skill/talent entries`];
  }
  if (stepValue.includes('languages')) return [`${data.languages.length} languages`];
  if (stepValue.includes('height-weight')) return [`${data.physicalScale.length} physical-scale rows`, `${data.heritageCharacteristicAdjustments.length} Heritage body rules`];
  if (stepValue.includes('calculations')) return [`${data.calculatedAbilities.reduce((total, group) => total + group.abilities.length, 0)} calculated ability definitions`];
  if (stepValue.includes('spells')) return [`${data.spells.length} spells`];
  if (stepValue.includes('starting-gear')) {
    return [
      `${data.itemWeapons.length} weapons`,
      `${data.itemArmors.length} armor entries`,
      `${data.itemEquipments.length} equipment entries`,
    ];
  }
  if (stepValue.includes('magic-items')) return [`${data.magicItems.length} magic items`];
  return [];
}

export default function Worksheet({
  data,
  draft,
  setDraft,
}: {
  data: StaticData;
  draft: CharacterDraft;
  setDraft: Dispatch<SetStateAction<CharacterDraft>>;
}) {
  const allSteps = useMemo<CreationStep[]>(
    () =>
      data.steps.flatMap((phase) =>
        phase.substeps.map((step) => ({
          ...step,
          phaseTitle: phase.title,
          phaseValue: phase.value,
        }))
      ),
    [data.steps]
  );

  const [activeStepValue, setActiveStepValue] = useState(allSteps[0]?.value ?? '');
  const [panelExpanded, setPanelExpanded] = useState(false);

  const updateDraft: Dispatch<SetStateAction<CharacterDraft>> = setDraft;

  const activeIndex = Math.max(
    0,
    allSteps.findIndex((step) => step.value === activeStepValue)
  );
  const activeStep = allSteps[activeIndex] ?? allSteps[0];
  const stepAssessment = (stepValue: string) => {
    if (isBackgroundStep(stepValue)) return assessBackgroundStep(stepValue, draft, data);
    if (isIntrinsicStep(stepValue)) return assessIntrinsicStep(stepValue, draft, data);
    if (isProficiencyStep(stepValue)) return assessProficiencyStep(stepValue, draft, data);
    if (isPropertyStep(stepValue)) return assessPropertyStep(stepValue, draft, data);
    if (isUtilityStep(stepValue)) return assessUtilityStep(stepValue, draft, data);
    return {
      status: draft.completedSteps.includes(stepValue) ? ('complete' as const) : ('incomplete' as const),
      messages: [] as string[],
    };
  };
  const completeCount = allSteps.filter((step) => stepAssessment(step.value).status === 'complete').length;
  const progress = allSteps.length === 0 ? 0 : (completeCount / allSteps.length) * 100;
  const activeCatalogue = activeStep ? catalogueSummary(activeStep.value, data) : [];
  const activeAssessment = activeStep
    ? stepAssessment(activeStep.value)
    : { status: 'incomplete' as const, messages: [] as string[] };
  // The Character panel is a live projection. Recompute package grants, Intrinsics,
  // and Properties from the structured inputs rather than waiting for the Player
  // to revisit later steps after an upstream edit.
  const panelDraft = useMemo(
    () => syncProperties(syncIntrinsics(syncHeritageGrantedSelections(draft, data), data), data),
    [draft, data],
  );
  const compressed = compressedCapabilities(panelDraft, data);
  const compressedSkills = compressed.filter((item) => item.isSkill);
  const compressedTraits = compressed.filter((item) => !item.isSkill);
  const unresolvedSteps = allSteps.map((step) => ({ step, assessment: stepAssessment(step.value) })).filter(({ assessment }) => assessment.status !== 'complete');
  const speciesChoice = getSpeciesChoice(panelDraft, data);
  const selectedBelief = data.beliefs.find((item) => item.catalogId === panelDraft.background.beliefId);
  const beliefDisplay = selectedBelief?.isDeity ? (data.deities.find((item) => item.catalogId === panelDraft.background.deityId)?.deity ?? 'Theist — Deity required') : (selectedBelief?.keyword ?? '—');
  const calc = (key: string) => panelDraft.properties.calculated[key] ?? '—';

  const setStepCompletion = (stepValue: string, complete: boolean) => {
    setDraft((current) => {
      const completedSteps = complete
        ? Array.from(new Set([...current.completedSteps, stepValue]))
        : current.completedSteps.filter((value) => value !== stepValue);
      return { ...current, completedSteps };
    });
  };

  const resetDraft = () => {
    const empty = createEmptyCharacterDraft();
    setDraft(empty);
    setActiveStepValue(allSteps[0]?.value ?? '');
  };

  const goToIndex = (index: number) => {
    const step = allSteps[index];
    if (step) setActiveStepValue(step.value);
  };

  if (!activeStep) {
    return <div className="p-6">No character-creation steps are configured.</div>;
  }

  return (
    <div className={cn('mx-auto w-full space-y-4 pb-8', panelExpanded ? 'max-w-none' : 'max-w-[1440px]')}>
      <div className="sticky top-14 z-40 flex flex-col gap-3 rounded-lg border bg-card/95 p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Sarna Len Character Forge</h1>
            <Badge variant="outline">v107 QA Corrections</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Canonical DXD creation order with all in-scope phases functional. The active structured draft is autosaved into the local Character Library and projected into the finished CRS.
          </p>
        </div>
        <div className="flex min-w-[260px] items-center gap-3">
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Creation progress</span>
              <span>{completeCount}/{allSteps.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <Button variant="outline" size="sm" onClick={resetDraft}>
            <RotateCcw />
            Reset
          </Button>
        </div>
      </div>

      <div className={cn('grid gap-4', panelExpanded ? 'grid-cols-1' : 'lg:grid-cols-[280px_minmax(0,1fr)_300px]')}>
        <Card className={cn('h-fit lg:sticky lg:top-44', panelExpanded && 'hidden')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Creation</CardTitle>
            <CardDescription>
              Future steps remain visible. Only genuine rule dependencies should lock a choice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.steps.map((phase, phaseIndex) => {
              const phaseComplete = phase.substeps.every((step) =>
                stepAssessment(step.value).status === 'complete'
              );
              const phaseActive = phase.value === activeStep.phaseValue;

              return (
                <PersistentAccordionSection
                  key={phase.value}
                  id={`phase-${phase.value}`}
                  title={<span className="flex items-center gap-2 text-xs font-semibold tracking-wide">{phaseComplete ? <Check className="h-3.5 w-3.5" /> : phaseActive ? <Circle className="h-3.5 w-3.5 fill-current" /> : <Circle className="h-3.5 w-3.5" />}{phaseIndex + 1}. {phase.title.replace('ASSIGN ', '')}</span>}
                  defaultOpen={phaseActive || phaseIndex === 0}
                  className="border-0 px-0"
                  triggerClassName="py-2"
                >
                  <div className="space-y-1">
                    {phase.substeps.map((step) => {
                      const active = step.value === activeStep.value;
                      const assessment = stepAssessment(step.value);
                      const complete = assessment.status === 'complete';
                      const warning = assessment.status === 'warning';
                      return (
                        <button type="button" key={step.value} onClick={() => setActiveStepValue(step.value)} className={cn('flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors', active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                          {complete ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : warning || step.value === 'background-disabilities' ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                          <span>{step.title.replace('Assign ', '')}</span>
                        </button>
                      );
                    })}
                  </div>
                </PersistentAccordionSection>
              );
            })}
          </CardContent>
        </Card>

        <Card className={cn('min-h-[560px]', panelExpanded && 'hidden')}>
          <CardHeader>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{activeStep.phaseTitle}</Badge>
              <span className="text-xs text-muted-foreground">
                Step {activeIndex + 1} of {allSteps.length}
              </span>
            </div>
            <CardTitle>{activeStep.title}</CardTitle>
            <CardDescription className="text-base">
              {activeStep.description}
            </CardDescription>
            <div className="pt-2"><Button type="button" size="sm" variant="outline" disabled={!canGenerateStep(activeStep.value, draft, data)} onClick={() => setDraft((current) => generateStep(activeStep.value, current, data))}><Dices className="h-4 w-4" /> Generate</Button></div>
          </CardHeader>
          <CardContent className="space-y-6">
            <PersistentAccordionSection id={`active-${activeStep.value}`} title="Assignment fields" defaultOpen>
            {isBackgroundStep(activeStep.value) || isIntrinsicStep(activeStep.value) || isProficiencyStep(activeStep.value) || isPropertyStep(activeStep.value) || isUtilityStep(activeStep.value) ? (
              <>
                {isBackgroundStep(activeStep.value) ? (
                  <BackgroundStep
                    stepValue={activeStep.value}
                    data={data}
                    draft={draft}
                    setDraft={updateDraft}
                  />
                ) : isIntrinsicStep(activeStep.value) ? (
                  <IntrinsicsStep
                    stepValue={activeStep.value}
                    data={data}
                    draft={draft}
                    setDraft={updateDraft}
                  />
                ) : isProficiencyStep(activeStep.value) ? (
                  <ProficienciesStep
                    stepValue={activeStep.value}
                    data={data}
                    draft={draft}
                    setDraft={updateDraft}
                  />
                ) : isPropertyStep(activeStep.value) ? (
                  <PropertiesStep
                    stepValue={activeStep.value}
                    data={data}
                    draft={draft}
                    setDraft={updateDraft}
                  />
                ) : (
                  <UtilitiesStep
                    stepValue={activeStep.value}
                    data={data}
                    draft={draft}
                    setDraft={updateDraft}
                  />
                )}

                {activeAssessment.messages.length > 0 && (
                  <div className={cn(
                    'rounded-lg border p-4 text-sm',
                    activeAssessment.status === 'warning' && 'border-amber-300 bg-amber-50 text-amber-950',
                  )}>
                    <div className="font-medium">
                      {activeAssessment.status === 'complete'
                        ? 'Current scope'
                        : activeAssessment.status === 'warning'
                          ? 'Usable with follow-up'
                          : 'Still required'}
                    </div>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                      {activeAssessment.messages.map((message) => <li key={message}>{message}</li>)}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-lg border border-dashed p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="space-y-2">
                      <p className="font-medium">Rule-specific form pending</p>
                      <p className="text-sm text-muted-foreground">
                        This step is not yet implemented. It continues to use the structured CharacterDraft rather than the final sheet as source state.
                      </p>
                    </div>
                  </div>
                </div>

                {activeCatalogue.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Available source data</h3>
                    <div className="flex flex-wrap gap-2">
                      {activeCatalogue.map((item) => (
                        <Badge key={item} variant="outline">{item}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold">Temporary completion control</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This manual marker remains only for phases whose real forms have not yet been implemented.
                  </p>
                  <div className="mt-3">
                    {draft.completedSteps.includes(activeStep.value) ? (
                      <Button
                        variant="outline"
                        onClick={() => setStepCompletion(activeStep.value, false)}
                      >
                        Mark incomplete
                      </Button>
                    ) : (
                      <Button onClick={() => setStepCompletion(activeStep.value, true)}>
                        <Check />
                        Mark step complete (temporary)
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            </PersistentAccordionSection>
            <div className="flex items-center justify-between border-t pt-5">
              <Button
                variant="outline"
                disabled={activeIndex === 0}
                onClick={() => goToIndex(activeIndex - 1)}
              >
                <ChevronLeft /> Back
              </Button>
              <Button
                disabled={activeIndex >= allSteps.length - 1}
                onClick={() => goToIndex(activeIndex + 1)}
              >
                Continue <ChevronRight />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={cn('h-fit w-full', !panelExpanded && 'lg:sticky lg:top-44')}>
          <CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="text-base">Character</CardTitle><CardDescription>Live compressed draft summary</CardDescription></div><Button type="button" size="icon" variant="ghost" onClick={() => setPanelExpanded((value) => !value)} aria-label={panelExpanded ? 'Minimize character panel' : 'Maximize character panel'}>{panelExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button></div></CardHeader>
          <CardContent className={cn('text-sm', panelExpanded ? 'grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3')}>
            <PersistentAccordionSection id="character-identity" title="Identity"><div className="font-medium">{panelDraft.utilities.name || 'Unnamed character'}</div><dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2"><dt className="text-muted-foreground">Region</dt><dd>{data.empires.find((item) => item.catalogId === panelDraft.background.regionId)?.name ?? '—'}</dd><dt className="text-muted-foreground">Heritage</dt><dd className="text-left">{[panelDraft.background.culturalHeritageId,panelDraft.background.environHeritageId,panelDraft.background.societalHeritageId].map((id) => data.heritagePackages.find((pkg) => pkg.id === id)?.name).filter(Boolean).join(' / ') || '—'}</dd><dt className="text-muted-foreground">Species</dt><dd>{speciesChoice?.family.displayName ?? '—'}</dd><dt className="text-muted-foreground">Group</dt><dd>{speciesChoice?.group.name ?? '—'}</dd><dt className="text-muted-foreground">Lineage</dt><dd>{getLineageName(panelDraft,data) ?? '—'}</dd><dt className="text-muted-foreground">Age Group</dt><dd>{panelDraft.background.ageGroup ?? '—'}{panelDraft.background.ageYears != null ? ` • ${panelDraft.background.ageYears}` : ''}</dd><dt className="text-muted-foreground">Belief</dt><dd>{beliefDisplay}</dd><dt className="text-muted-foreground">Trade</dt><dd>{getTradePackage(panelDraft,data)?.trade ?? '—'}{getTradeSpecialization(panelDraft,data) ? ` > ${getTradeSpecialization(panelDraft,data)?.name}` : ''}</dd></dl></PersistentAccordionSection>
            <PersistentAccordionSection id="character-attributes" title="Attributes"><div className="space-y-3"><div><div className="mb-1 text-xs font-semibold text-muted-foreground">Combat</div><div className="grid grid-cols-3 gap-2">{['CCA','RCA','REF'].map((name) => <div key={name} className="rounded border p-2 text-center"><div className="text-xs text-muted-foreground">{name}</div><div className="font-semibold">{getFinalAttributeValue(name,panelDraft) ?? '—'}</div></div>)}</div></div><div><div className="mb-1 text-xs font-semibold text-muted-foreground">Psychological</div><div className="grid grid-cols-4 gap-2">{['INT','KNO','PRE','POW'].map((name) => <div key={name} className="rounded border p-2 text-center"><div className="text-xs text-muted-foreground">{name}</div><div className="font-semibold">{getFinalAttributeValue(name,panelDraft) ?? '—'}</div></div>)}</div></div><div><div className="mb-1 text-xs font-semibold text-muted-foreground">Physical</div><div className="grid grid-cols-3 gap-2">{[['STR',getFinalAttributeValue('STR',panelDraft)],['FOR',getFinalAttributeValue('FOR',panelDraft)],['MOV',calc('MOV')]].map(([name,value]) => <div key={String(name)} className="rounded border p-2 text-center"><div className="text-xs text-muted-foreground">{name}</div><div className="font-semibold">{value ?? '—'}</div></div>)}</div></div><div><div className="mb-1 text-xs font-semibold text-muted-foreground">Magic</div><div className="w-24 rounded border p-2 text-center"><div className="text-xs text-muted-foreground">ZED</div><div className="font-semibold">{panelDraft.intrinsics.zed ?? '—'}</div></div></div></div></PersistentAccordionSection>
            <PersistentAccordionSection id="character-calculated" title="Calculated Scores"><dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">{[['Stature',panelDraft.properties.stature],['Build',panelDraft.properties.build],['Profile',panelDraft.properties.profile],['Hitpoints',calc('Hitpoints')],['Bodypoints',calc('Bodypoints')],['Resilience',calc('Resilience')],['Resistance',calc('Resistance')],['Endurance',calc('Endurance')],['Recovery Rate',calc('Recovery')]].map(([name,value]) => <Fragment key={String(name)}><dt className="text-muted-foreground">{name}</dt><dd>{value ?? '—'}</dd></Fragment>)}</dl></PersistentAccordionSection>
            <PersistentAccordionSection id="character-misc" title="Miscellaneous"><dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">{[['Wealth Rank',panelDraft.intrinsics.wealthRank],['Social Rank',panelDraft.background.socialRank],['Trade Rank',panelDraft.intrinsics.tradeRank],['Favor Dice',calc('FavorDice')],['Cellburn Limit',calc('Cellburn')],['Manapool',calc('Manapool')]].map(([name,value]) => <Fragment key={String(name)}><dt className="text-muted-foreground">{name}</dt><dd>{value ?? '—'}</dd></Fragment>)}</dl></PersistentAccordionSection>
            <PersistentAccordionSection id="character-skills" title={`Skills (${compressedSkills.length})`} defaultOpen={false}><div className="space-y-1 text-xs">{compressedSkills.length ? compressedSkills.map((item) => <div key={item.name}>{item.display}</div>) : '—'}</div></PersistentAccordionSection>
            <PersistentAccordionSection id="character-traits" title={`Traits (${compressedTraits.length})`} defaultOpen={false}><div className="space-y-1 text-xs">{compressedTraits.length ? compressedTraits.map((item) => <div key={item.name}>{item.display}</div>) : '—'}</div></PersistentAccordionSection>
            <PersistentAccordionSection id="character-status" title={`Status ${unresolvedSteps.length ? `(!) ${unresolvedSteps.length}` : '✓'}`} defaultOpen={false}><div className="space-y-2">{unresolvedSteps.length ? unresolvedSteps.map(({step,assessment}) => <button type="button" key={step.value} onClick={() => setActiveStepValue(step.value)} className="block w-full rounded border p-2 text-left text-xs"><span className="font-semibold">(!) {step.title}</span><span className="ml-2 text-muted-foreground">{assessment.status}</span></button>) : <div className="text-xs text-muted-foreground">All configured steps are complete.</div>}</div></PersistentAccordionSection>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Skillpoints: {skillpointBudget(panelDraft,data).remaining ?? '—'} remaining. Gear: {startingGearTotals(panelDraft).costGp.toFixed(1)} / {personalWealthGp(panelDraft,data)?.toLocaleString() ?? '—'} gp.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
