'use client';

import { useMemo } from 'react';
import type { StaticData } from '@/data';
import { buildForgeDiagnostics, diagnosticCounts, runtimeDataSummary } from '@/lib/admin-diagnostics';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DATASET_REGISTRY = [
  { status: 'Active', name: 'steps', use: 'Seven-phase Forge creation flow and substeps.' },
  { status: 'Active', name: 'species + adjustment tables', use: 'Selectable Species/Group/Lineage hierarchy and biological adjustments.' },
  { status: 'Active', name: 'ageGroups + ageBrackets + Attribute/Characteristic modifiers', use: 'Age selection, age limits, and sourced age adjustments.' },
  { status: 'Active', name: 'heritagePackages', use: 'Culture, Environs, and Society Heritage choices and grants.' },
  { status: 'Active', name: 'settlementProfiles + localeProfiles + citystates', use: 'Settlement context, Environs, languages, population, and Wealth context.' },
  { status: 'Active', name: 'attributeArrays + pointBuyCosts + attributeCreationRules', use: 'Attribute generation and post-array purchase rules.' },
  { status: 'Active', name: 'tradePackages', use: 'Selectable Trades, critical Attributes, adjustments, grants, and specializations.' },
  { status: 'Bridge', name: 'professions', use: 'Compatibility metadata still consulted for Trade candidacy/naming; Merchant remains deferred.' },
  { status: 'Active', name: 'pmlRules + pmlAgeMinimums + pmlTitles', use: 'PML creation limits, progression effects, and titles.' },
  { status: 'Active', name: 'traits + languages + languageDefaults + nameGenerators', use: 'Capabilities, language assignment, and current conlang name generation.' },
  { status: 'Active', name: 'physicalScale', use: 'Height/Weight/SIZ scale used by Properties.' },
  { status: 'Active', name: 'itemWeapons + itemArmors + itemEquipments', use: 'Current normalized inventory catalogues and armor coverage metadata.' },
  { status: 'Active', name: 'spells + magicItems', use: 'Current playable spell and filtered complete magic-item catalogues.' },
  { status: 'Reference', name: 'culturalHeritage + environHeritage + societalHeritage', use: 'Legacy Heritage source tables; the Forge selects structured heritagePackages instead.' },
  { status: 'Reference', name: 'calculatedAbilities', use: 'Legacy prose reference. Current calculations live in rule code and may be more complete.' },
  { status: 'Reference', name: 'favoredTradesByLineage', use: 'Reference-only distribution table; not consumed by current character creation.' },
  { status: 'Reference', name: 'militaryHierarchy + salary tables', use: 'Legacy/developer generation utilities, not the current player-character Forge flow.' },
] as const;

function RegistryBadge({ status }: { status: 'Active' | 'Bridge' | 'Reference' }) {
  return <Badge variant={status === 'Active' ? 'outline' : status === 'Bridge' ? 'secondary' : 'secondary'}>{status}</Badge>;
}

function CountCard({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-md border p-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div></div>;
}

export default function Info({ data }: { data: StaticData }) {
  const diagnostics = useMemo(() => buildForgeDiagnostics(data), [data]);
  const counts = diagnosticCounts(diagnostics);
  const summary = runtimeDataSummary(data);
  const activeGroups = data.species.flatMap((family) => family.groups.filter((group) => group.selectable).map((group) => ({ family, group })));
  const attrDefs = data.attributeDefinitions.flatMap((group) => group.attributes.map((attribute) => ({ group: group.groupName, ...attribute })));
  const heritageCounts = Object.entries(summary.heritageKinds).sort(([a], [b]) => a.localeCompare(b));
  const armorCounts = Object.entries(summary.armorKinds).sort(([a], [b]) => a.localeCompare(b));

  return <div className="space-y-4">
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-xl">Forge Runtime Information</CardTitle><CardDescription>This page is generated from the current <code>sarnaLenData</code> object used by the Forge. Legacy datasets are no longer presented as though they were authoritative runtime rules.</CardDescription></CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <CountCard label="Selectable Groups" value={summary.selectableGroups} />
          <CountCard label="Lineages" value={summary.selectableLineages} />
          <CountCard label="Trades" value={summary.trades} />
          <CountCard label="Heritage Packages" value={data.heritagePackages.length} />
          <CountCard label="Traits" value={summary.traits} />
          <CountCard label="Languages" value={summary.languages} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs"><Badge variant="outline">{counts.pass} diagnostics passed</Badge>{counts.warn ? <Badge variant="secondary">{counts.warn} warnings</Badge> : null}{counts.fail ? <Badge variant="destructive">{counts.fail} current failures</Badge> : null}</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-lg">Current Forge Creation Flow</CardTitle><CardDescription>The Info organization follows the same seven phases used by the Forge.</CardDescription></CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{data.steps.map((step, index) => <div key={step.value} className="rounded-lg border p-3"><div className="text-xs font-semibold text-muted-foreground">{index + 1}</div><div className="font-semibold">{step.title}</div><p className="mt-1 text-xs text-muted-foreground">{step.description}</p><div className="mt-2 text-xs">{step.substeps.map((substep) => <div key={substep.value} className="border-t py-1.5 first:border-t-0">{substep.title}</div>)}</div></div>)}</div>
      </CardContent>
    </Card>

    <Accordion type="multiple" defaultValue={['background', 'intrinsics', 'proficiencies', 'properties', 'utilities', 'registry']} className="space-y-2">
      <AccordionItem value="background" className="rounded-lg border bg-card px-4"><AccordionTrigger className="hover:no-underline"><span className="font-semibold">1. Background</span></AccordionTrigger><AccordionContent><div className="space-y-4 pb-4">
        <div className="grid gap-2 sm:grid-cols-4"><CountCard label="Settlements" value={summary.settlements} /><CountCard label="Locales" value={data.localeProfiles.length} /><CountCard label="Citystates" value={data.citystates.length} /><CountCard label="Social Ranks" value={data.socialRanks.length} /></div>
        <div><div className="mb-2 text-sm font-medium">Structured Heritage packages</div><div className="flex flex-wrap gap-2">{heritageCounts.map(([kind, count]) => <Badge key={kind} variant="outline">{kind}: {count}</Badge>)}</div></div>
        <p className="text-sm text-muted-foreground">Settlement Profiles provide current Environs and language context. Heritage selection uses <code>heritagePackages</code>; the three older Heritage source tables are retained only as reference material.</p>
      </div></AccordionContent></AccordionItem>

      <AccordionItem value="intrinsics" className="rounded-lg border bg-card px-4"><AccordionTrigger className="hover:no-underline"><span className="font-semibold">2. Intrinsics</span></AccordionTrigger><AccordionContent><div className="space-y-5 pb-4">
        <div><div className="mb-2 text-sm font-medium">Selectable Species groups and Lineages</div><Table><TableHeader><TableRow><TableHead>Family</TableHead><TableHead>Group</TableHead><TableHead>Lineages</TableHead><TableHead>Age Brackets</TableHead></TableRow></TableHeader><TableBody>{activeGroups.map(({ family, group }) => <TableRow key={group.catalogId}><TableCell>{family.displayName}</TableCell><TableCell className="font-medium">{group.name}</TableCell><TableCell>{group.lineages.join(', ')}</TableCell><TableCell>{group.hasAgeBrackets ? 'Yes' : 'No'}</TableCell></TableRow>)}</TableBody></Table></div>
        <div><div className="mb-2 text-sm font-medium">Attribute definitions</div><Table><TableHeader><TableRow><TableHead>Attribute</TableHead><TableHead>Abbr.</TableHead><TableHead>Ordinary IM</TableHead><TableHead>Creation IM</TableHead></TableRow></TableHeader><TableBody>{attrDefs.map((attribute) => <TableRow key={attribute.abbreviation}><TableCell>{attribute.name}</TableCell><TableCell>{attribute.abbreviation}</TableCell><TableCell>{attribute.im}</TableCell><TableCell>{attribute.creationIm}</TableCell></TableRow>)}</TableBody></Table><p className="mt-2 text-xs text-muted-foreground">Default method: 3D high-two, nine values assigned freely. Arrays: {Object.entries(data.attributeArrays).map(([name, values]) => `${name} [${values.join(', ')}]`).join(' • ')}. Point Buy uses values 6–12 with a 75-point cap in the Forge.</p></div>
        <div><div className="mb-2 text-sm font-medium">Selectable Trades</div><Table><TableHeader><TableRow><TableHead>Trade</TableHead><TableHead>Minimum Age</TableHead><TableHead>Critical Attributes</TableHead><TableHead>Base Grants</TableHead><TableHead>Specializations</TableHead></TableRow></TableHeader><TableBody>{data.tradePackages.map((pkg) => <TableRow key={pkg.trade}><TableCell className="font-medium">{pkg.trade}</TableCell><TableCell>{pkg.minimumAgeGroup}+</TableCell><TableCell>{pkg.criticalAttributes.join(', ')}</TableCell><TableCell>{pkg.grants.length}</TableCell><TableCell>{pkg.specializations.length}</TableCell></TableRow>)}</TableBody></Table><p className="mt-2 text-xs text-muted-foreground">Merchant remains deferred: it is present in the compatibility <code>professions</code> table but omitted from <code>tradePackages</code> until its candidacy/Affinity data is complete.</p></div>
      </div></AccordionContent></AccordionItem>

      <AccordionItem value="proficiencies" className="rounded-lg border bg-card px-4"><AccordionTrigger className="hover:no-underline"><span className="font-semibold">3. Proficiencies</span></AccordionTrigger><AccordionContent><div className="space-y-4 pb-4">
        <div className="grid gap-2 sm:grid-cols-4"><CountCard label="Traits" value={summary.traits} /><CountCard label="Languages" value={summary.languages} /><CountCard label="Name Generators" value={data.nameGenerators.length} /><CountCard label="PML Titles" value={data.pmlTitles.length} /></div>
        <div className="rounded-lg border p-3"><div className="font-medium">PML</div><p className="mt-1 text-sm text-muted-foreground">{data.pmlRules.description}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><Badge variant="outline">Default PC PML {data.pmlRules.defaultPcPml}</Badge><Badge variant="outline">{data.pmlAgeMinimums.length} age-minimum bands</Badge><Badge variant="outline">Virtuosity at {data.pmlRules.virtuosityChoiceAtPml.join(', ')}</Badge></div></div>
        <p className="text-sm text-muted-foreground">Language Defaults, Settlement Profiles, and Name Generators now cross-reference language IDs rather than relying on the older prose-only name tables.</p>
      </div></AccordionContent></AccordionItem>

      <AccordionItem value="properties" className="rounded-lg border bg-card px-4"><AccordionTrigger className="hover:no-underline"><span className="font-semibold">4. Properties</span></AccordionTrigger><AccordionContent><div className="space-y-3 pb-4">
        <div className="grid gap-2 sm:grid-cols-3"><CountCard label="Physical Scale Rows" value={data.physicalScale.length} /><CountCard label="Lowest SIZ" value={Math.min(...data.physicalScale.map((row) => row.siz))} /><CountCard label="Highest SIZ" value={Math.max(...data.physicalScale.map((row) => row.siz))} /></div>
        <p className="text-sm text-muted-foreground">Current derived Properties are calculated in the Forge rule modules. The legacy <code>calculatedAbilities</code> prose dataset is retained only as reference because its formulas may lag the executable rules.</p>
      </div></AccordionContent></AccordionItem>

      <AccordionItem value="utilities" className="rounded-lg border bg-card px-4"><AccordionTrigger className="hover:no-underline"><span className="font-semibold">5–7. Utilities, Miscellaneous, Customize</span></AccordionTrigger><AccordionContent><div className="space-y-4 pb-4">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6"><CountCard label="Weapons" value={summary.weapons} /><CountCard label="Armor" value={summary.armor} /><CountCard label="Equipment" value={summary.equipment} /><CountCard label="Spells" value={summary.spells} /><CountCard label="Magic Items" value={summary.magicItems} /><CountCard label="Armor Kinds" value={armorCounts.length} /></div>
        <div><div className="mb-2 text-sm font-medium">Armor catalogue by kind</div><div className="flex flex-wrap gap-2">{armorCounts.map(([kind, count]) => <Badge key={kind} variant="outline">{kind}: {count}</Badge>)}</div></div>
        <p className="text-sm text-muted-foreground">The current Armor catalogue carries sectional coverage atoms, SIZ-scaling metadata, singleton inventory behavior, and the Visual Armor Coverage inputs. Magic Items shown by the Forge are already filtered to complete playable records.</p>
      </div></AccordionContent></AccordionItem>

      <AccordionItem value="registry" className="rounded-lg border bg-card px-4"><AccordionTrigger className="hover:no-underline"><span className="font-semibold">Data Registry: Active, Bridge, Reference</span></AccordionTrigger><AccordionContent><div className="pb-4"><Table><TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Dataset</TableHead><TableHead>Current role</TableHead></TableRow></TableHeader><TableBody>{DATASET_REGISTRY.map((entry) => <TableRow key={entry.name}><TableCell><RegistryBadge status={entry.status} /></TableCell><TableCell className="font-mono text-xs">{entry.name}</TableCell><TableCell className="text-sm">{entry.use}</TableCell></TableRow>)}</TableBody></Table></div></AccordionContent></AccordionItem>
    </Accordion>

    {(counts.fail > 0 || counts.warn > 0) && <Card><CardHeader className="pb-3"><CardTitle className="text-lg">Current diagnostic findings</CardTitle><CardDescription>These are calculated from the current runtime rather than copied from legacy Info prose.</CardDescription></CardHeader><CardContent><div className="space-y-2">{diagnostics.filter((test) => test.status !== 'pass').map((test) => <div key={test.id} className="rounded-md border p-3"><div className="flex items-center gap-2"><Badge variant={test.status === 'fail' ? 'destructive' : 'secondary'}>{test.status.toUpperCase()}</Badge><span className="font-medium">{test.title}</span></div><p className="mt-1 text-sm text-muted-foreground">{test.summary}</p>{test.details?.length ? <div className="mt-2 text-xs font-mono text-muted-foreground">{test.details.slice(0, 6).join(' • ')}{test.details.length > 6 ? ` • +${test.details.length - 6} more` : ''}</div> : null}</div>)}</div></CardContent></Card>}
  </div>;
}
