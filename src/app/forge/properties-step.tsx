'use client';

import type { Dispatch, SetStateAction } from 'react';

import type { StaticData } from '@/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CharacterDraft } from '@/lib/character-draft';
import { calculateProperties, physicalBreakdown, setBodyFrameAdjustment, setWeightAdjustment } from '@/lib/rules/properties';
import { formatNumberWithCommas } from '@/lib/utils';

const signed = (value: number) => `${value >= 0 ? '+' : ''}${value}`;
const dm = (value: number) => `${value >= 0 ? '+' : ''}${value}`;

function MeasurementCards({ draft, data }: { draft: CharacterDraft; data: StaticData }) {
  const physical = physicalBreakdown(draft, data);
  if (!physical) return <p className="text-sm text-muted-foreground">Complete Species, Age, Attributes, and Trade to derive physical measurements.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Stature</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{physical.finalStature}</div><div className="text-xs text-muted-foreground">{physical.height}</div></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Build</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{physical.build}</div><div className="text-xs text-muted-foreground">{formatNumberWithCommas(physical.weightPounds)} lb</div></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">SIZ</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{physical.siz}</div><div className="text-xs text-muted-foreground">Weight Index</div></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Profile</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{physical.profile}</div><div className="text-xs text-muted-foreground">(Stature + Build) / 2</div></CardContent></Card>
    </div>
  );
}

function HeightWeightStep({ draft, data, setDraft }: { draft: CharacterDraft; data: StaticData; setDraft: Dispatch<SetStateAction<CharacterDraft>> }) {
  const physical = physicalBreakdown(draft, data);
  return (
    <div className="space-y-6">
      <MeasurementCards draft={draft} data={data} />
      {physical && (
        <>
          <section className="space-y-4 rounded-lg border p-4">
            <div><h3 className="font-semibold">Body Frame</h3><p className="mt-1 text-sm text-muted-foreground">Adjust final Stature by up to ±2. Because Build begins from adjusted Stature, that choice also moves Build; the separate Build frame is then applied by up to ±2.</p></div>
            {([
              { kind: 'stature' as const, label: 'Stature', value: draft.properties.statureAdjustment ?? 0, choices: [['Shorter',-2],['Short',-1],['Average',0],['Tall',1],['Taller',2]] as const },
              { kind: 'build' as const, label: 'Build', value: draft.properties.buildAdjustment ?? 0, choices: [['Gracile',-2],['Slim',-1],['Average',0],['Stout',1],['Robust',2]] as const },
            ]).map((group) => <div key={group.kind} className="space-y-2"><div className="text-sm font-medium">{group.label}</div><div className="flex flex-wrap gap-2">{group.choices.map(([label,value]) => <Button key={label} type="button" size="sm" variant={group.value === value ? 'default' : 'outline'} onClick={() => setDraft((current) => setBodyFrameAdjustment(current, group.kind, value))}>{label} ({signed(value)})</Button>)}</div></div>)}
          </section>

          <section className="space-y-3 rounded-lg border p-4">
            <div>
              <h3 className="font-semibold">Underweight / Overweight</h3>
              <p className="mt-1 text-sm text-muted-foreground">Optional ±1 Build per degree. Negative values are Underweight; positive values are Overweight. The allowed creation range is −9 to +9.</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="weight-adjustment">Build adjustment</Label>
                <Input id="weight-adjustment" type="number" min={-9} max={9} className="w-28" value={draft.properties.weightAdjustment} onChange={(event) => setDraft((current) => setWeightAdjustment(current, Number(event.target.value)))} />
              </div>
              <Button type="button" variant="outline" onClick={() => setDraft((current) => setWeightAdjustment(current, 0))}>Average build</Button>
              {physical.weightAdjustment !== 0 && <Badge variant="secondary">{physical.weightAdjustment < 0 ? `Underweight ${Math.abs(physical.weightAdjustment)}` : `Overweight ${physical.weightAdjustment}`}</Badge>}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="font-semibold">Physical derivation</h3>
              <p className="mt-1 text-sm text-muted-foreground">Stature begins from Species. Build begins from final Stature. Sex-specific adjustments are intentionally outside the current generator scope.</p>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs"><tr><th className="px-3 py-2">Source</th><th className="px-3 py-2 text-right">Stature</th><th className="px-3 py-2 text-right">Build</th><th className="px-3 py-2 text-right">Body</th></tr></thead>
                <tbody>
                  {physical.lines.map((line, index) => <tr key={`${line.label}-${index}`} className="border-t"><td className="px-3 py-2">{line.label}</td><td className="px-3 py-2 text-right tabular-nums">{signed(line.stature)}</td><td className="px-3 py-2 text-right tabular-nums">{signed(line.build)}</td><td className="px-3 py-2 text-right tabular-nums">{line.bodypoints == null ? '—' : signed(line.bodypoints)}</td></tr>)}
                  <tr className="border-t"><td className="px-3 py-2">STR DM → Stature</td><td className="px-3 py-2 text-right">included</td><td className="px-3 py-2 text-right">—</td><td className="px-3 py-2 text-right">—</td></tr>
                  <tr className="border-t"><td className="px-3 py-2">FOR DM − REF DM + Brawn → Build</td><td className="px-3 py-2 text-right">—</td><td className="px-3 py-2 text-right">included</td><td className="px-3 py-2 text-right">—</td></tr>
                  {physical.statureAdjustment !== 0 && <tr className="border-t"><td className="px-3 py-2">Body Frame — Stature</td><td className="px-3 py-2 text-right">{signed(physical.statureAdjustment)}</td><td className="px-3 py-2 text-right">flows from Stature</td><td className="px-3 py-2 text-right">—</td></tr>}
                  {physical.buildAdjustment !== 0 && <tr className="border-t"><td className="px-3 py-2">Body Frame — Build</td><td className="px-3 py-2 text-right">—</td><td className="px-3 py-2 text-right">{signed(physical.buildAdjustment)}</td><td className="px-3 py-2 text-right">—</td></tr>}
                  {physical.weightAdjustment !== 0 && <tr className="border-t"><td className="px-3 py-2">Weight adjustment</td><td className="px-3 py-2 text-right">—</td><td className="px-3 py-2 text-right">{signed(physical.weightAdjustment)}</td><td className="px-3 py-2 text-right">{physical.weightAdjustment > 0 ? 'pre-Overweight SIZ' : 'current SIZ'}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{formatNumberWithCommas(value)}</div>{note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}</CardContent></Card>;
}

function CalculationsStep({ draft, data }: { draft: CharacterDraft; data: StaticData }) {
  const c = calculateProperties(draft, data);
  if (!c) return <p className="text-sm text-muted-foreground">Complete the prerequisites before calculating abilities.</p>;
  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <h3 className="font-semibold">General & managed concerns</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Hitpoints" value={c.hitpoints} note={`10 + REF DM ${dm(c.dms.REF)} + POW DM ${dm(c.dms.POW)} + PRE DM ${dm(c.dms.PRE)} + MOV DM ${dm(c.dms.MOV)} + 3×${draft.proficiencies.pml ?? 1}`} />
          <Metric label="Bodypoints" value={c.bodypoints} note={`SIZ ${c.bodySiz} + body adjustments ${signed(c.bodyAdjustment)}`} />
          <Metric label="Recovery" value={c.recovery} note={`3 + POW DM ${dm(c.dms.POW)} + FOR DM ${dm(c.dms.FOR)} + SIZ ${c.siz}/5 + PML ${(draft.proficiencies.pml ?? 1)}/3`} />
          <Metric label="Physicality" value={c.physicality} note="higher of STR or SIZ" />
          <Metric label="Endurance" value={c.endurance} note={`base FOR formula; Trait net ${signed(c.traitAdjustments.athletics + c.traitAdjustments.sprint - c.traitAdjustments.affliction - c.traitAdjustments.prissy)}`} />
          <Metric label="Resilience" value={c.resilience} note={`PML + Age + v-Focused ${signed(c.traitAdjustments.focused)}`} />
          <Metric label="Resistance" value={c.resistance} note={`PML + SIZ formula − Zucked ${c.traitAdjustments.zucked}`} />
          <Metric label="Max Advantage" value={`+${c.maxAdvantage}`} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Magic resources</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Favor dice" value={c.favorDice} note="PML + Deity Trait" />
          <Metric label="Manapool" value={c.manapool} note="ZED + SIZ DM − Zucked" />
          <Metric label="Cellburn Limit" value={c.cellburn} note="max(1, PRE DM + KNO DM + POW DM)" />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Movement & jumping</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs"><tr><th className="px-3 py-2">Method</th><th className="px-3 py-2 text-right">Index</th><th className="px-3 py-2 text-right">Scalar</th></tr></thead><tbody>
            {[['Walk', c.walk, c.scalars.walk], ['Jog', c.jog, c.scalars.jog], ['Run / MOV', c.run, c.scalars.run], ['Upward', c.upward, c.scalars.upward], ['Broad', c.broad, c.scalars.broad], ['Downward', c.downward, c.scalars.downward]].map(([name,index,scalar]) => <tr key={String(name)} className="border-t"><td className="px-3 py-2">{name}</td><td className="px-3 py-2 text-right tabular-nums">{index}</td><td className="px-3 py-2 text-right">{scalar}</td></tr>)}
          </tbody></table>
        </div>
        <div className="flex flex-wrap gap-2 text-xs"><Badge variant="outline">adjMOV {signed(c.adjMov)}</Badge><Badge variant="outline">Species/lineage MOV {signed(c.directMovAdjustment)}</Badge><Badge variant="outline">Run {c.runMph} mph</Badge><Badge variant="outline">Agility {Number(c.agilityFeet.toFixed(2))} ft</Badge><Badge variant="outline">Running jump Up {c.runningUpward} / Broad {c.runningBroad}</Badge></div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Throwing methods</h3>
        <p className="text-sm text-muted-foreground">Pitch is the default. These are character Method Indexes only; per-item OR is calculated at throw time from Method − item Weight, not stored on inventory items.</p>
        <div className="grid gap-3 sm:grid-cols-3"><Metric label="Lob" value={c.lob} note={`Weight ${c.scalars.lob} • Accuracy +3`} /><Metric label="Pitch" value={c.pitch} note={`Weight ${c.scalars.pitch} • Accuracy +0`} /><Metric label="Hurl" value={c.hurl} note={`Weight ${c.scalars.hurl} • Accuracy −3`} /></div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Carrying</h3>
        <div className="grid gap-3 sm:grid-cols-3"><Metric label="Basic Lift" value={c.lift} note={`${c.scalars.lift} lb • max ${c.maxLift} (${c.scalars.maxLift})`} /><Metric label="Basic Shoulder" value={c.shoulder} note={`${c.scalars.shoulder} lb • max ${c.maxShoulder} (${c.scalars.maxShoulder})`} /><Metric label="Basic Carry" value={c.carry} note={`${c.scalars.carry} lb • max ${c.maxCarry} (${c.scalars.maxCarry})`} /></div>
        <Badge variant="outline">Allometric adjustment {signed(c.allometric)} (Species SIZ {c.speciesSiz})</Badge>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">CRS combat compatibility values</h3>
        <p className="text-sm text-muted-foreground">These compact values preserve the established character-record-sheet projection while the current Book III Properties rules remain the authority for the calculations above.</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Hasty Actions" value={`+${c.hastyActions}`} /><Metric label="Melee Attack" value={dm(c.meleeAttackDm)} /><Metric label="Melee Defend" value={dm(c.meleeDefendDm)} /><Metric label="Range Attack" value={dm(c.rangeAttackDm)} /><Metric label="Range Defend" value={dm(c.rangeDefendDm)} /></div>
      </section>

      <section className="rounded-lg bg-muted/40 p-4 text-sm">
        <div className="font-medium">Limits</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2"><span>Gasp Limit: {c.gaspTurnsScalar} Turns</span><span>Sleep Limit: {c.sleepHoursScalar} Hours</span></div>
        {c.attentiveRegenerationBonus > 0 && <p className="mt-2 text-xs text-muted-foreground">v-Regenerate provides +{c.attentiveRegenerationBonus} Hitpoints while Attentive; this conditional bonus is not folded into base Hitpoints.</p>}
        {c.robustRecoveryBonus > 0 && <p className="mt-1 text-xs text-muted-foreground">Robust provides +{c.robustRecoveryBonus} Recovery for non-Severe injuries/wounds; the conditional bonus is not folded into base Recovery.</p>}
      </section>
    </div>
  );
}

export default function PropertiesStep({ stepValue, data, draft, setDraft }: { stepValue: string; data: StaticData; draft: CharacterDraft; setDraft: Dispatch<SetStateAction<CharacterDraft>> }) {
  if (stepValue === 'properties-height-weight') return <HeightWeightStep draft={draft} data={data} setDraft={setDraft} />;
  if (stepValue === 'properties-calculations') return <CalculationsStep draft={draft} data={data} />;
  return null;
}
