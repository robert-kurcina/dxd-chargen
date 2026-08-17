'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Dice5, RefreshCw, XCircle } from 'lucide-react';
import type { StaticData } from '@/data';
import { ND6 } from '@/lib/dice';
import { buildForgeDiagnostics, diagnosticCounts, type ForgeDiagnostic } from '@/lib/admin-diagnostics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import LegacyDeveloperTools from '@/app/legacy-developer-tools';

function StatusIcon({ status }: { status: ForgeDiagnostic['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-green-700" />;
  if (status === 'warn') return <AlertTriangle className="h-4 w-4 text-amber-700" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

function StatusBadge({ status }: { status: ForgeDiagnostic['status'] }) {
  return <Badge variant={status === 'fail' ? 'destructive' : status === 'warn' ? 'secondary' : 'outline'}>{status.toUpperCase()}</Badge>;
}

function DiagnosticCard({ test }: { test: ForgeDiagnostic }) {
  return <div className="rounded-lg border p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><StatusIcon status={test.status} /><div className="font-medium">{test.title}</div></div>
        <p className="mt-1 text-sm text-muted-foreground">{test.summary}</p>
      </div>
      <StatusBadge status={test.status} />
    </div>
    {test.details?.length ? <details className="mt-3 text-xs">
      <summary className="cursor-pointer font-medium">Details ({test.details.length})</summary>
      <ul className="mt-2 space-y-1 border-l pl-3 font-mono text-muted-foreground">
        {test.details.map((detail, index) => <li key={`${test.id}-${index}`}>{detail}</li>)}
      </ul>
    </details> : null}
  </div>;
}

export default function Tests({ data }: { data: StaticData }) {
  const [run, setRun] = useState(1);
  const tests = useMemo(() => buildForgeDiagnostics(data), [data, run]);
  const counts = diagnosticCounts(tests);
  const groups = useMemo(() => [...new Set(tests.map((test) => test.group))], [tests]);
  const [dice, setDice] = useState<{ d6: number; twoD6: number; highTwo: number; rolls: number[] } | null>(null);

  const rollDice = () => {
    const rolls = [ND6(), ND6(), ND6()];
    const highTwo = [...rolls].sort((a, b) => b - a).slice(0, 2).reduce((sum, value) => sum + value, 0);
    setDice({ d6: ND6(), twoD6: ND6(2), highTwo, rolls });
  };

  return <div className="space-y-4">
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle className="text-xl">Forge Tests</CardTitle><CardDescription className="mt-1">Deterministic diagnostics against the same runtime data loaded by the current Forge. Legacy random demonstrations are separated below as developer tools.</CardDescription></div>
          <Button variant="outline" size="sm" onClick={() => setRun((value) => value + 1)}><RefreshCw className="mr-2 h-4 w-4" />Run tests</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border p-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">Passed</div><div className="mt-1 text-2xl font-semibold">{counts.pass}</div></div>
          <div className="rounded-md border p-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">Warnings</div><div className="mt-1 text-2xl font-semibold">{counts.warn}</div></div>
          <div className="rounded-md border p-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">Failures</div><div className="mt-1 text-2xl font-semibold">{counts.fail}</div></div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Failures indicate a current runtime/data inconsistency. Warnings identify compatibility or reference-only drift that does not necessarily block character creation.</p>
      </CardContent>
    </Card>

    <Accordion type="multiple" defaultValue={groups} className="space-y-2">
      {groups.map((group) => {
        const groupTests = tests.filter((test) => test.group === group);
        const failures = groupTests.filter((test) => test.status === 'fail').length;
        const warnings = groupTests.filter((test) => test.status === 'warn').length;
        return <AccordionItem key={group} value={group} className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-3 pr-3 text-left"><span className="font-semibold">{group}</span><span className="text-xs text-muted-foreground">{groupTests.length} checks{failures ? ` • ${failures} failed` : ''}{warnings ? ` • ${warnings} warning` : ''}</span></div>
          </AccordionTrigger>
          <AccordionContent><div className="grid gap-2 pb-4 lg:grid-cols-2">{groupTests.map((test) => <DiagnosticCard key={test.id} test={test} />)}</div></AccordionContent>
        </AccordionItem>;
      })}
    </Accordion>

    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg">Developer Tools</CardTitle><CardDescription>Interactive smoke tools are not regression tests and do not affect the pass/fail totals above.</CardDescription></CardHeader>
      <CardContent>
        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-medium">Dice smoke test</div><p className="text-sm text-muted-foreground">Includes the Forge’s current 3D high-two Attribute roll method.</p></div><Button variant="outline" onClick={rollDice}><Dice5 className="mr-2 h-4 w-4" />Roll</Button></div>
          {dice ? <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">D6</div><div className="text-xl font-semibold">{dice.d6}</div></div>
            <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">2D6</div><div className="text-xl font-semibold">{dice.twoD6}</div></div>
            <div className="rounded-md bg-muted/40 p-3"><div className="text-xs text-muted-foreground">3D high-two</div><div className="text-xl font-semibold">{dice.highTwo}</div><div className="text-xs text-muted-foreground">Rolls: {dice.rolls.join(', ')}</div></div>
          </div> : null}
        </div>
        <div className="mt-4 border-t pt-4">
          <div className="mb-3 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
            Preserved developer generators from the pre-v141 Forge. Their interactive behavior is retained, while current structured Heritage/Trade/Settlement data is used where the old tool can consume it safely. Military hierarchy and salary generation remain setting/developer utilities rather than player-character creation rules.
          </div>
          <LegacyDeveloperTools data={data} />
        </div>
      </CardContent>
    </Card>
  </div>;
}
