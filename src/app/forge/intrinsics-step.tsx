'use client';

import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { Check, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';

import type { StaticData } from '@/data';
import { makeCatalogId } from '@/data/catalog-policy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { CharacterDraft, SourcedSelection } from '@/lib/character-draft';
import { getAttributeDm } from '@/lib/character-logic';
import {
  ROLLED_ATTRIBUTES,
  affinityCandidates,
  candidateAttributeValues,
  directZedAdjustment,
  getFinalAttributeValue,
  getLineageName,
  getPurchasedAttributeIncrease,
  getSpeciesChoice,
  getTradePackage,
  getTradeSpecialization,
  maximumTradeRank,
  nonPlayerAdjustmentsForAttribute,
  STRIFE_PAIRINGS,
  getStrifePairing,
  strifeParents,
  pointBuySpent,
  purchasedAttributeSkillpointCost,
  setAttributeBaseValues,
  setPurchasedAttributeIncrease,
  syncIntrinsics,
  totalPurchasedAttributeIncreases,
  tradeCandidacy,
  wealthBreakdown,
  wealthTitle,
  zedPurchaseSkillpointCost,
  type RolledAttribute,
} from '@/lib/rules/intrinsics';
import { personalWealthGp } from '@/lib/rules/utilities';
import { cn, formatNumberWithCommas } from '@/lib/utils';

type IntrinsicsStepProps = {
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
  warning?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ChoiceCard({ selected, title, subtitle, meta, warning, disabled, onClick }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative rounded-lg border p-3 text-left transition-colors hover:bg-muted/60',
        selected && 'border-primary bg-primary/5 ring-1 ring-primary',
        warning && !selected && 'border-amber-300',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
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

function formatSigned(value: number) {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function SpeciesStep({ data, draft, setDraft }: Omit<IntrinsicsStepProps, 'stepValue'>) {
  const choice = getSpeciesChoice(draft, data);
  const selectedFamily = data.species.find((family) => family.catalogId === draft.intrinsics.speciesFamilyId) ?? choice?.family ?? null;
  const selectedGroup = choice?.group ?? null;
  const selectedLineage = getLineageName(draft, data);
  const biological = draft.proficiencies.granted.filter((item) => item.source === 'species' || item.source === 'lineage' || item.sourceDetail === 'Genetically Female');
  const heritageKeys = new Set(draft.proficiencies.granted.filter((item) => item.source === 'heritage').map((item) => item.name.replace(/\s+X$/, '').split(' > ')[0].toLowerCase()));
  const formatCapability = (item: SourcedSelection) => `${item.name.replace(/\s+X$/, '')}${(item.level ?? 1) > 1 ? ` ${item.level}` : ''}${item.specialization ? ` > ${item.specialization}` : ''}`;
  const speciesAdjustmentBadges = [...ROLLED_ATTRIBUTES, 'MOV', 'ZED'].flatMap((attribute) =>
    nonPlayerAdjustmentsForAttribute(attribute, draft, data)
      .filter((adjustment) => ['species', 'lineage'].includes(adjustment.source) || adjustment.sourceDetail === 'Genetically Female')
      .map((adjustment) => `${attribute} ${formatSigned(adjustment.amount)} (${adjustment.sourceDetail})`),
  );
  const strifePairing = getStrifePairing(draft);
  const parents = strifeParents(draft);
  const groupByName = (name: string) => data.species.flatMap((family) => family.groups).find((group) => group.name === name);
  const chooseStrifePairing = (pairingId: string) => {
    const pairing = STRIFE_PAIRINGS.find((item) => item.id === pairingId);
    if (!pairing) return;
    const rolls = Object.fromEntries([...ROLLED_ATTRIBUTES, 'MOV', 'ZED'].map((attribute) => [attribute, 1 + Math.floor(Math.random() * 6)]));
    const primary = groupByName(pairing.groups[0]);
    setDraft((current) => syncIntrinsics({ ...current, intrinsics: { ...current.intrinsics, childOfStrife: true, strifePairingId: pairing.id, strifeFatherLineageId: null, strifeMotherLineageId: null, strifeAttributeRolls: rolls, strifeBonusParent: Math.random() < 0.5 ? 'father' : 'mother', speciesFamilyId: makeCatalogId('species-family', 'Humaniki'), speciesId: primary?.catalogId ?? null, lineageId: null }, background: { ...current.background, ageYears: null } }, data));
  };
  const setParentLineage = (role: 'father' | 'mother', lineage: string) => setDraft((current) => syncIntrinsics({ ...current, intrinsics: { ...current.intrinsics, [role === 'father' ? 'strifeFatherLineageId' : 'strifeMotherLineageId']: makeCatalogId('lineage', lineage) } }, data));

  const chooseFamily = (familyId: string) => {
    const family = data.species.find((entry) => entry.catalogId === familyId);
    if (!family?.selectable) return;
    setDraft((current) => syncIntrinsics({ ...current, intrinsics: { ...current.intrinsics, speciesFamilyId: familyId, speciesId: null, lineageId: null }, background: { ...current.background, ageYears: null } }, data));
  };
  const chooseGroup = (groupId: string) => {
    if (!selectedFamily?.selectable) return;
    const group = selectedFamily.groups.find((entry) => entry.catalogId === groupId);
    if (!group?.selectable) return;
    setDraft((current) => syncIntrinsics({ ...current, intrinsics: { ...current.intrinsics, speciesFamilyId: selectedFamily.catalogId, speciesId: groupId, lineageId: null, strifeFatherLineageId: current.intrinsics.strifeMixedLineage ? null : current.intrinsics.strifeFatherLineageId, strifeMotherLineageId: current.intrinsics.strifeMixedLineage ? null : current.intrinsics.strifeMotherLineageId }, background: { ...current.background, ageYears: null } }, data));
  };
  return <div className="space-y-6">
    <section className="space-y-3">
      <div><h3 className="font-semibold">Species</h3><p className="text-xs text-muted-foreground">Canonical hierarchy: Species → Ancestral Group → Lineage. Cherigili, Kriket, and Stonefolk are visible but unavailable for character creation in this build.</p></div>
      <div className="grid gap-2 sm:grid-cols-3">{data.species.map((family) => <button key={family.catalogId} type="button" disabled={!family.selectable} onClick={() => chooseFamily(family.catalogId)} className={cn('rounded-lg border p-3 text-left', selectedFamily?.catalogId === family.catalogId && 'border-primary bg-primary/5 ring-1 ring-primary', !family.selectable && 'cursor-not-allowed opacity-50')}><div className="font-medium">{family.displayName}</div><div className="mt-1 text-xs text-muted-foreground">{family.groups.length} Group{family.groups.length === 1 ? '' : 's'}{!family.selectable ? ' • unavailable' : ''}</div></button>)}</div>
      <label className="flex items-start gap-3 rounded-lg border p-3"><Checkbox checked={draft.intrinsics.childOfStrife} onCheckedChange={(checked) => setDraft((current) => syncIntrinsics({ ...current, intrinsics: { ...current.intrinsics, childOfStrife: Boolean(checked), speciesFamilyId: checked ? makeCatalogId('species-family', 'Humaniki') : current.intrinsics.speciesFamilyId, strifeMixedLineage: checked ? current.intrinsics.strifeMixedLineage : false, strifePairingId: checked ? current.intrinsics.strifePairingId : null, strifeFatherLineageId: checked ? current.intrinsics.strifeFatherLineageId : null, strifeMotherLineageId: checked ? current.intrinsics.strifeMotherLineageId : null } }, data))} /><span><span className="block font-medium">Child of Strife</span><span className="text-xs text-muted-foreground">Use a viable mixed Humaniki parent pairing from the inter-species guidelines.</span></span></label>
      {draft.intrinsics.childOfStrife && <label className="flex items-start gap-3 rounded-lg border p-3"><Checkbox checked={draft.intrinsics.strifeMotherFirst} onCheckedChange={(checked) => setDraft((current) => ({ ...current, intrinsics: { ...current.intrinsics, strifeMotherFirst: Boolean(checked), strifeFatherLineageId: current.intrinsics.strifeMotherLineageId, strifeMotherLineageId: current.intrinsics.strifeFatherLineageId } }))} /><span><span className="block font-medium">Mother–Father</span><span className="text-xs text-muted-foreground">Reverse which ancestral group supplies the mother and father.</span></span></label>}
      {draft.intrinsics.childOfStrife && <label className="flex items-start gap-3 rounded-lg border p-3"><Checkbox checked={draft.intrinsics.strifeMixedLineage} onCheckedChange={(checked) => setDraft((current) => syncIntrinsics({ ...current, intrinsics: { ...current.intrinsics, strifeMixedLineage: Boolean(checked), strifePairingId: checked ? null : current.intrinsics.strifePairingId, strifeFatherLineageId: null, strifeMotherLineageId: null, speciesId: checked ? current.intrinsics.speciesId : null, lineageId: null }, background: { ...current.background, ageYears: null } }, data))} /><span><span className="block font-medium">Mixed Lineage</span><span className="text-xs text-muted-foreground">Both parents share one Ancestral Group but come from different Lineages.</span></span></label>}
    </section>
    {draft.intrinsics.childOfStrife ? <>
      <section className="space-y-3"><h3 className="font-semibold">Ancestral Group</h3><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{draft.intrinsics.strifeMixedLineage ? selectedFamily?.groups.map((group) => <ChoiceCard key={group.catalogId} selected={draft.intrinsics.speciesId === group.catalogId} title={group.name} subtitle={`${group.lineages.length} Lines${!group.selectable ? ' • unavailable' : ''}`} disabled={!group.selectable} onClick={() => chooseGroup(group.catalogId)} />) : STRIFE_PAIRINGS.map((pairing) => <ChoiceCard key={pairing.id} selected={strifePairing?.id === pairing.id} title={pairing.exonym} subtitle={`${pairing.meaning} • ${draft.intrinsics.strifeMotherFirst ? `${pairing.groups[0]} mother, ${pairing.groups[1]} father` : `${pairing.groups[0]} father, ${pairing.groups[1]} mother`}`} onClick={() => chooseStrifePairing(pairing.id)} />)}</div></section>
      {parents && <section className="space-y-4"><h3 className="font-semibold">Lineage / Line</h3>{([['Father', parents.fatherGroup, draft.intrinsics.strifeFatherLineageId, draft.intrinsics.strifeMotherLineageId], ['Mother', parents.motherGroup, draft.intrinsics.strifeMotherLineageId, draft.intrinsics.strifeFatherLineageId]] as const).map(([role, groupName, selectedId, otherId]) => <div key={role} className="space-y-2"><h4 className="text-sm font-semibold">{role} — {groupName}</h4><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{groupByName(groupName)?.lineages.map((lineage) => { const id = makeCatalogId('lineage', lineage); const sameLineage = draft.intrinsics.strifeMixedLineage && otherId === id; return <ChoiceCard key={`${role}-${lineage}`} selected={selectedId === id} disabled={sameLineage} title={lineage} subtitle={sameLineage ? 'Already selected for the other parent' : undefined} onClick={() => setParentLineage(role.toLowerCase() as 'father' | 'mother', lineage)} />; })}</div></div>)}</section>}
    </> : <>
      {selectedFamily && <section className="space-y-3"><h3 className="font-semibold">Ancestral Group</h3><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{selectedFamily.groups.map((group) => <ChoiceCard key={group.catalogId} selected={draft.intrinsics.speciesId === group.catalogId} title={group.name} subtitle={`${group.lineages.length} Lines${!group.selectable ? ' • unavailable' : ''}`} disabled={!group.selectable} onClick={() => chooseGroup(group.catalogId)} />)}</div></section>}
      {selectedGroup && <section className="space-y-3"><h3 className="font-semibold">Lineage / Line</h3><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{selectedGroup.lineages.map((lineage) => { const id = makeCatalogId('lineage', lineage); return <ChoiceCard key={id} selected={draft.intrinsics.lineageId === id} title={lineage} onClick={() => setDraft((current) => syncIntrinsics({ ...current, intrinsics: { ...current.intrinsics, lineageId: id } }, data))} />; })}</div></section>}
    </>}
    {selectedGroup && <div className="rounded-lg border bg-muted/20 p-4"><div><div className="font-medium">Granted Species / Group / Lineage capabilities</div><div className="text-xs text-muted-foreground">Underlining marks overlap with Granted Heritage capabilities.</div></div><div className="mt-3 text-sm leading-relaxed">{biological.length ? [...biological].sort((a,b) => a.name.localeCompare(b.name)).map((item, index) => { const overlap = heritageKeys.has(item.name.replace(/\s+X$/, '').split(' > ')[0].toLowerCase()); return <span key={`${item.id}-${index}`} className={cn(overlap && 'underline decoration-2 underline-offset-2')}>{index ? ', ' : ''}{formatCapability(item)}</span>; }) : 'Choose Group and Lineage.'}</div>{speciesAdjustmentBadges.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{speciesAdjustmentBadges.map((label) => <Badge key={label} variant="secondary">{label}</Badge>)}</div>}</div>}
  </div>;
}

function rollHighTwo() {
  const dice = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
  return dice[0] + dice[1];
}

function baseValues(draft: CharacterDraft) {
  return Object.fromEntries(ROLLED_ATTRIBUTES.map((attribute) => [
    attribute,
    draft.intrinsics.attributes.find((entry) => entry.name === attribute)?.base ?? 7,
  ])) as Record<RolledAttribute, number>;
}

function AttributeRows({ data, draft, setDraft }: Omit<IntrinsicsStepProps, 'stepValue'>) {
  const importedFinal = draft.background.demographicSelections.some((entry) => entry.sourceDetail === 'Imported region');
  const purchasedTotal = totalPurchasedAttributeIncreases(draft);
  const purchasedSkillpoints = purchasedAttributeSkillpointCost(draft, data);
  const method = draft.intrinsics.attributeMethod;
  const values = baseValues(draft);

  const swap = (index: number, direction: -1 | 1) => {
    const other = index + direction;
    if (other < 0 || other >= ROLLED_ATTRIBUTES.length) return;
    const next = { ...values };
    const left = ROLLED_ATTRIBUTES[index];
    const right = ROLLED_ATTRIBUTES[other];
    [next[left], next[right]] = [next[right], next[left]];
    setDraft((current) => syncIntrinsics(setAttributeBaseValues(
      current,
      current.intrinsics.attributeMethod,
      next,
      current.intrinsics.attributeArrayId,
    ), data));
  };

  const changePointBuy = (attribute: RolledAttribute, delta: number) => {
    const next = { ...values, [attribute]: Math.max(6, Math.min(12, values[attribute] + delta)) };
    setDraft((current) => syncIntrinsics(setAttributeBaseValues(current, 'point-buy', next, null), data));
  };

  const changePurchased = (attribute: RolledAttribute, delta: number) => {
    setDraft((current) => {
      const currentIncrease = getPurchasedAttributeIncrease(attribute, current);
      return syncIntrinsics(setPurchasedAttributeIncrease(current, attribute, currentIncrease + delta), data);
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[690px] text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="px-3 py-2 text-left">Attribute</th>
              <th className="px-3 py-2 text-center">Recorded Roll</th>
              <th className="px-3 py-2 text-center">Assign</th>
              <th className="px-3 py-2 text-center">Sourced adj.</th>
              <th className="px-3 py-2 text-center">Purchased</th>
              <th className="px-3 py-2 text-center">Final</th>
              <th className="px-3 py-2 text-center">DM</th>
            </tr>
          </thead>
          <tbody>
            {ROLLED_ATTRIBUTES.map((attribute, index) => {
              const record = draft.intrinsics.attributes.find((entry) => entry.name === attribute);
              const purchased = getPurchasedAttributeIncrease(attribute, draft);
              const sourced = importedFinal ? 0 : record?.adjustments.filter((adjustment) => adjustment.source !== 'player').reduce((sum, adjustment) => sum + adjustment.amount, 0) ?? 0;
              const finalValue = importedFinal ? (record?.base ?? values[attribute]) : getFinalAttributeValue(attribute, draft) ?? values[attribute];
              const canPurchaseMore = purchased < 2 && purchasedTotal < 4;
              return (
                <tr key={attribute} className="border-t">
                  <td className="px-3 py-2 font-medium">{attribute}</td>
                  <td className="px-3 py-2 text-center font-mono">{values[attribute]}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center gap-1">
                      {method === 'point-buy' ? (
                        <>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={values[attribute] <= 6} onClick={() => changePointBuy(attribute, -1)}><Minus className="h-3.5 w-3.5" /></Button>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={values[attribute] >= 12} onClick={() => changePointBuy(attribute, 1)}><Plus className="h-3.5 w-3.5" /></Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={index === 0} onClick={() => swap(index, -1)}><ChevronUp className="h-3.5 w-3.5" /></Button>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={index === ROLLED_ATTRIBUTES.length - 1} onClick={() => swap(index, 1)}><ChevronDown className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">{sourced === 0 ? '—' : formatSigned(sourced)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={purchased <= 0} onClick={() => changePurchased(attribute, -1)}><Minus className="h-3.5 w-3.5" /></Button>
                      <span className="w-5 text-center">+{purchased}</span>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={!canPurchaseMore} onClick={() => changePurchased(attribute, 1)}><Plus className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-semibold">{finalValue}</td>
                  <td className="px-3 py-2 text-center">{formatSigned(getAttributeDm(finalValue))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">Purchased raw increases {purchasedTotal}/4</Badge>
        <Badge variant="outline">Attribute Skillpoints {purchasedSkillpoints}</Badge>
        <Badge variant="outline">Prior Months required {purchasedSkillpoints}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Purchased increases use the character-creation IM schedule. They do not alter the recorded Attribute Roll used for Affinity or Trade candidacy.
      </p>
    </div>
  );
}

function AttributesStep({ data, draft, setDraft }: Omit<IntrinsicsStepProps, 'stepValue'>) {
  const method = draft.intrinsics.attributeMethod;
  const importedFinal = draft.background.demographicSelections.some((entry) => entry.sourceDetail === 'Imported region') && draft.intrinsics.attributes.length === ROLLED_ATTRIBUTES.length;
  const spent = pointBuySpent(draft, data);

  const applyArray = (id: 'A' | 'B' | 'C') => {
    const values = Object.fromEntries(ROLLED_ATTRIBUTES.map((attribute, index) => [attribute, data.attributeArrays[id][index]])) as Record<RolledAttribute, number>;
    setDraft((current) => syncIntrinsics(setAttributeBaseValues(current, 'array', values, id), data));
  };

  const rollAll = () => {
    const values = Object.fromEntries(ROLLED_ATTRIBUTES.map((attribute) => [attribute, rollHighTwo()])) as Record<RolledAttribute, number>;
    setDraft((current) => syncIntrinsics(setAttributeBaseValues(current, 'roll', values, null), data));
  };

  const pointBuy = () => {
    const values = Object.fromEntries(ROLLED_ATTRIBUTES.map((attribute) => [attribute, 7])) as Record<RolledAttribute, number>;
    setDraft((current) => syncIntrinsics(setAttributeBaseValues(current, 'point-buy', values, null), data));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-3">
        <ChoiceCard selected={method === 'roll'} title="Default: 3D high-two" subtitle="Roll nine values, then assign them in any order." onClick={rollAll} />
        <ChoiceCard selected={method === 'array'} title="Pre-rolled Array" subtitle="Choose A, B, or C, then rearrange the nine values." onClick={() => applyArray(draft.intrinsics.attributeArrayId ?? 'A')} />
        <ChoiceCard selected={method === 'point-buy'} title="Point Buy" subtitle="Spend up to 75 points; player-character rolls stay from 6 through 12." onClick={pointBuy} />
      </div>

      {method === 'array' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Array:</span>
          {(['A', 'B', 'C'] as const).map((id) => (
            <Button key={id} type="button" size="sm" variant={draft.intrinsics.attributeArrayId === id ? 'default' : 'outline'} onClick={() => applyArray(id)}>
              {id}: {data.attributeArrays[id].join(', ')}
            </Button>
          ))}
        </div>
      )}
      {method === 'point-buy' && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-3 text-sm">
          <span className="font-medium">Point Buy:</span>
          <Badge variant={spent != null && spent > 75 ? 'destructive' : 'outline'}>{spent ?? 0}/75 spent</Badge>
          <span className="text-xs text-muted-foreground">The canonical pre-rolled arrays each evaluate to approximately the same budget.</span>
        </div>
      )}

      {method || importedFinal ? <AttributeRows data={data} draft={draft} setDraft={setDraft} /> : (
        <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Choose an Attribute generation method to begin.</div>
      )}
    </div>
  );
}

function adjustmentText(adjustments: Record<string, number>) {
  const keys = [...ROLLED_ATTRIBUTES, 'MOV', 'ZED'];
  const parts = keys
    .map((key) => [key, Number(adjustments[key] ?? 0)] as const)
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => `${key} ${formatSigned(value)}`);
  return parts.length ? parts.join(' • ') : 'No Attribute adjustment';
}

function TradeStep({ data, draft, setDraft }: Omit<IntrinsicsStepProps, 'stepValue'>) {
  const selected = getTradePackage(draft, data);
  const specialization = getTradeSpecialization(draft, data);
  const candidacy = tradeCandidacy(draft, data);
  const maxRank = maximumTradeRank(draft, data);
  const candidateValues = candidateAttributeValues(draft, data);
  const professionGranted = draft.proficiencies.granted.filter((item) => item.source === 'trade');
  const otherCapabilityKeys = new Set(draft.proficiencies.granted.filter((item) => item.source !== 'trade').map((item) => item.name.replace(/\s+X$/, '').split(' > ')[0].toLowerCase()));
  const formatProfessionCapability = (item: SourcedSelection) => `${item.name.replace(/\s+X$/, '')}${(item.level ?? 1) > 1 ? ` ${item.level}` : ''}${item.specialization ? ` > ${item.specialization}` : ''}`;

  const chooseTrade = (trade: string) => {
    const tradeId = makeCatalogId('trade', trade);
    setDraft((current) => syncIntrinsics({
      ...current,
      intrinsics: {
        ...current.intrinsics,
        tradeId,
        specializationId: null,
        tradeRank: 1,
        affinityAttribute: null,
        zed: null,
      },
    }, data));
  };

  return (
    <div className="space-y-6">
      {selected && <div className="sticky top-20 z-10 rounded-lg border bg-background/95 p-4 shadow-sm backdrop-blur"><div className="font-medium">Granted Profession capabilities — {selected.trade}{specialization ? ` > ${specialization.name}` : ''}</div><div className="mt-1 text-xs text-muted-foreground">Underlining marks overlap with another source and will compress during proficiency consolidation.</div><div className="mt-3 text-sm leading-relaxed">{professionGranted.length ? [...professionGranted].sort((a,b) => a.name.localeCompare(b.name)).map((item,index) => <span key={item.id} className={cn(otherCapabilityKeys.has(item.name.replace(/\s+X$/, '').split(' > ')[0].toLowerCase()) && 'underline decoration-2 underline-offset-2')}>{index ? ', ' : ''}{formatProfessionCapability(item)}</span>) : 'No profession grants loaded.'}</div></div>}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {data.tradePackages.map((pkg) => {
          const temp = {
            ...draft,
            intrinsics: { ...draft.intrinsics, tradeId: makeCatalogId('trade', pkg.trade), specializationId: null },
          } as CharacterDraft;
          const status = tradeCandidacy(temp, data);
          return (
            <ChoiceCard
              key={pkg.trade}
              selected={draft.intrinsics.tradeId === makeCatalogId('trade', pkg.trade)}
              title={pkg.trade}
              subtitle={`${pkg.minimumAgeGroup}+ • Critical: ${pkg.criticalAttributes.join(', ')}`}
              meta={`${status.eligible && status.ageEligible ? 'Eligible' : 'Needs review'} • ${pkg.grants.length} base grants`}
              warning={!status.eligible || !status.ageEligible}
              onClick={() => chooseTrade(pkg.trade)}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Merchant is intentionally omitted from selectable Trades until its current candidacy/Affinity data is complete.</p>

      {selected && (
        <div className="space-y-5 rounded-lg border p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Candidacy</div>
              <div className="mt-1 font-medium">{candidacy.eligible ? 'Attribute test passed' : 'Attribute test not met'}</div>
              <div className="mt-1 text-xs text-muted-foreground">{candidacy.formula ?? 'No formula encoded'}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {selected.criticalAttributes.map((attribute) => <Badge key={attribute} variant="secondary">{attribute} {candidateValues[attribute] ?? '—'}</Badge>)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Age</div>
              <div className="mt-1 font-medium">{candidacy.ageEligible ? 'Age requirement passed' : `Requires ${selected.minimumAgeGroup}+`}</div>
              <div className="mt-2 text-xs text-muted-foreground">Trade candidacy uses recorded rolls with Species/Lineage adjustments only; Trade, Age, and purchased increases do not help the candidacy test.</div>
            </div>
          </div>

          <Separator />
          <div>
            <div className="text-sm font-medium">Trade adjustment</div>
            <div className="mt-1 text-xs text-muted-foreground">{adjustmentText(selected.adjustments)}</div>
          </div>

          {selected.specializations.length > 0 && (
            <div className="space-y-2">
              <Label>Profession / Specialization</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {selected.specializations.map((entry) => {
                  const id = makeCatalogId('specialization', `${selected.trade}-${entry.name}`);
                  return (
                    <ChoiceCard
                      key={id}
                      selected={draft.intrinsics.specializationId === id}
                      title={entry.name}
                      subtitle={adjustmentText(entry.adjustments)}
                      meta={`${entry.grants.length} grants`}
                      onClick={() => setDraft((current) => syncIntrinsics({
                        ...current,
                        intrinsics: { ...current.intrinsics, specializationId: id },
                      }, data))}
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Starting Trade Rank</Label>
              <Select
                value={String(draft.intrinsics.tradeRank ?? 1)}
                onValueChange={(value) => setDraft((current) => syncIntrinsics({
                  ...current,
                  intrinsics: { ...current.intrinsics, tradeRank: Number(value) },
                }, data))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxRank }, (_, index) => index + 1).map((rank) => (
                    <SelectItem key={rank} value={String(rank)}>Rank {rank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Current age permits up to Rank {maxRank}.</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <div className="font-medium">Rank benefit</div>
              <div className="mt-1 text-muted-foreground">+{Math.max(0, (draft.intrinsics.tradeRank ?? 1) - 1) * 10} starting Skillpoints from Trade Rank above 1.</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{selected.grants.length + (specialization?.grants.length ?? 0)} Trade grants loaded</Badge>
            {specialization && <Badge variant="secondary">{selected.trade} — {specialization.name}</Badge>}
          </div>
        </div>
      )}
    </div>
  );
}

function ZedStep({ data, draft, setDraft }: Omit<IntrinsicsStepProps, 'stepValue'>) {
  const pkg = getTradePackage(draft, data);
  const candidates = affinityCandidates(draft, data);
  const direct = directZedAdjustment(draft, data);
  const totalPurchased = totalPurchasedAttributeIncreases(draft);
  const purchaseCost = zedPurchaseSkillpointCost(draft, data);

  if (!pkg || draft.intrinsics.attributes.length !== ROLLED_ATTRIBUTES.length) {
    return <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Assign the nine Attribute Rolls and a Trade first.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold">Natural Affinity</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {pkg.trade} uses {pkg.criticalAttributes.join(', ')}. Affinity is the highest recorded Attribute Roll among those Critical Attributes; tied highest rolls are a player choice.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {pkg.criticalAttributes.map((attribute) => {
          const base = draft.intrinsics.attributes.find((entry) => entry.name === attribute)?.base ?? 0;
          const eligible = candidates.includes(attribute as RolledAttribute);
          return (
            <ChoiceCard
              key={attribute}
              selected={draft.intrinsics.affinityAttribute === attribute}
              title={`${attribute} — Roll ${base}`}
              subtitle={eligible ? 'Highest recorded Critical Attribute' : 'Not an Affinity candidate'}
              warning={!eligible}
              onClick={() => {
                if (!eligible) return;
                setDraft((current) => syncIntrinsics({
                  ...current,
                  intrinsics: { ...current.intrinsics, affinityAttribute: attribute },
                }, data));
              }}
            />
          );
        })}
      </div>

      {draft.intrinsics.affinityAttribute && (
        <div className="rounded-lg border p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Affinity</div>
              <div className="mt-1 text-xl font-semibold">{draft.intrinsics.affinityAttribute}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Direct ZED adjustment</div>
              <div className="mt-1 text-xl font-semibold">{formatSigned(direct)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">ZED</div>
              <div className="mt-1 text-2xl font-semibold">{draft.intrinsics.zed ?? '—'}</div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Purchased ZED increase</div>
              <div className="text-xs text-muted-foreground">Counts against the same standard novice +4 purchased raw-Attribute limit.</div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" disabled={draft.intrinsics.zedPurchasedIncrease <= 0} onClick={() => setDraft((current) => syncIntrinsics({
                ...current,
                intrinsics: { ...current.intrinsics, zedPurchasedIncrease: Math.max(0, current.intrinsics.zedPurchasedIncrease - 1) },
              }, data))}><Minus className="h-4 w-4" /></Button>
              <span className="min-w-8 text-center font-semibold">+{draft.intrinsics.zedPurchasedIncrease}</span>
              <Button type="button" size="icon" variant="outline" disabled={draft.intrinsics.zedPurchasedIncrease >= 2 || totalPurchased >= 4} onClick={() => setDraft((current) => syncIntrinsics({
                ...current,
                intrinsics: { ...current.intrinsics, zedPurchasedIncrease: Math.min(2, current.intrinsics.zedPurchasedIncrease + 1) },
              }, data))}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">ZED Skillpoints {purchaseCost}</Badge>
            <Badge variant="outline">Total purchased increases {totalPurchased}/4</Badge>
          </div>
        </div>
      )}
    </div>
  );
}

function WealthStep({ data, draft }: Omit<IntrinsicsStepProps, 'stepValue' | 'setDraft'>) {
  const breakdown = wealthBreakdown(draft, data);
  const title = wealthTitle(draft.intrinsics.wealthRank, data);
  const ready = draft.intrinsics.wealthRank != null;
  const wealthRank = draft.intrinsics.wealthRank ?? 0;
  const scalarText = ready ? (data.universalTable.find((entry) => entry.Index === Math.trunc(wealthRank))?.Scalar ?? '0') : '—';
  const personalGp = ready ? personalWealthGp(draft, data) : null;
  const assetValuablesGp = personalGp == null ? null : Math.max(0, personalGp * 10);
  const assetLandsGp = personalGp == null ? null : Math.max(0, personalGp * 100);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Wealth Rank</div>
        <div className="mt-1 text-3xl font-semibold">{ready ? draft.intrinsics.wealthRank : '—'}</div>
        <div className="mt-1 text-sm text-muted-foreground">{title ?? 'Complete Heritage, settlement, and Attributes to calculate Wealth.'}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3"><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Personal Wealth</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{formatNumberWithCommas(scalarText)} gp</div><div className="text-xs text-muted-foreground">Starting spendable gp</div></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Assets — Valuables</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{assetValuablesGp == null ? '—' : `${formatNumberWithCommas(assetValuablesGp)} gp`}</div><div className="text-xs text-muted-foreground">Banks, family valuables, movable property</div></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Assets — Lands</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{assetLandsGp == null ? '—' : `${formatNumberWithCommas(assetLandsGp)} gp`}</div><div className="text-xs text-muted-foreground">Land/family property equivalent</div></CardContent></Card></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Heritage</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-semibold">{formatSigned(breakdown.heritage)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">KNO DM</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-semibold">{formatSigned(breakdown.knoDm)}</div><div className="text-xs text-muted-foreground">KNO {breakdown.kno ?? '—'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Starting economy</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-semibold">{formatSigned(breakdown.economy)}</div><div className="text-xs text-muted-foreground">{breakdown.settlement ?? 'No settlement'} • {breakdown.economicStatus ?? '—'}</div></CardContent>
        </Card>
      </div>
      {breakdown.economyNotes.length > 0 && (
        <div className="rounded-lg bg-muted/40 p-4 text-sm">
          <div className="font-medium">Regional adjustments</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {breakdown.economyNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Wealth is calculated, not manually entered: Heritage Wealth + KNO DM + applicable starting-economy adjustment.</p>
    </div>
  );
}

export default function IntrinsicsStep(props: IntrinsicsStepProps) {
  const common = { data: props.data, draft: props.draft, setDraft: props.setDraft };
  switch (props.stepValue) {
    case 'intrinsics-species': return <SpeciesStep {...common} />;
    case 'intrinsics-attributes': return <AttributesStep {...common} />;
    case 'intrinsics-trade-specialization': return <TradeStep {...common} />;
    case 'intrinsics-zed': return <ZedStep {...common} />;
    case 'intrinsics-wealth': return <WealthStep data={props.data} draft={props.draft} />;
    default: return null;
  }
}
