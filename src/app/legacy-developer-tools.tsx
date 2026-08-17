

'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/ui/icons';
import {
  ND6,
  D66,
  d66Lookup,
  d6ColumnLookup,
} from '@/lib/dice';
import {
  parseTalent,
  isDisability,
  getAgeRankValue,
  getAgeRank,
  getAgeGroup,
  parseMaturityString,
  calculateMaturityDifference,
  adjustTalentByMaturity,
  getAgeInYears,
  parseIM,
  resolveTragedySeed,
  parseTragedyTemplate,
  lookupTragedyKeyword,
  calculateAttributeSkillpointCost,
  calculateBonusSkillpointCost,
  getScalar,
  getIndex,
  formatPositiveNumber,
  evaluateCandidacy,
  parseLineageString,
  calculateSalary,
  generateContractor,
  generateBand,
  generateSquad,
  generateGroup,
  generateCompany,
  generateDetachment,
  generateFormation,
  type Contractor,
  type Band,
  type Squad,
  type Group,
  type Company,
  type Detachment,
  type Formation,
  type SpecialistUnit,
  generateDivision,
  type Division,
  calculateAttributeDM,
} from '@/lib/character-logic';
import type { StaticData } from '@/data';
import { weightedSettlementPick } from '@/lib/settlement-context';
import { cn } from '@/lib/utils';
import { parseNumberWithSuffix, formatNumberWithSuffix } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListChecks } from 'lucide-react';
import { ContextualSectionNavigation } from '@/components/contextual-section-navigation';

const TEST_SECTION_TITLES = [
  'Military Unit Generator', 'Salary / Contractor Planner', 'Candidacy Expression Evaluator', 'Candidacy Simulation',
  'Salary Calculation', 'Heritage Generator', 'Profession & Title Generator', 'Settlement Generator',
  'Number Suffix Formatting', 'ND6 Function', 'Attribute Array Generation', 'Simple Data Tables',
  'Dice Roller', 'isDisability', 'Talent Parser', 'Age Rank Value', 'Age Rank / Group Converters',
  'Maturity Parser', 'Maturity Difference', 'Adjust Talent by Maturity', 'Skillpoint Cost Calculations',
  'Age Generator', 'D66 Lookup Tools', 'Scalar / Index Calculator', 'Tragedy Seed Generator',
];

// Component to display a test case
const TestCase = ({ title, result, expected, pass }: { title: string, result: any, expected: any, pass: boolean }) => (
  <div className="p-2 border-l-4" style={{ borderColor: pass ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))' }}>
    <p className="font-semibold text-sm">{title}</p>
    <p className="font-mono text-xs">Result: {JSON.stringify(result)}</p>
    <p className="font-mono text-xs">Expected: {JSON.stringify(expected)}</p>
  </div>
);

// Component for a group of tests
const TestSuite = ({ title, children, value, defaultValue }: { title: string; children: React.ReactNode; value: string, defaultValue?: string }) => (
    <Card className="scroll-mt-20">
      <AccordionItem value={value} className="border-b-0">
        <AccordionTrigger className="w-full p-6 hover:no-underline">
          <CardTitle className="flex-1 text-left">{title}</CardTitle>
        </AccordionTrigger>
        <AccordionContent>
          <div className="px-6 pb-6 pt-0 space-y-4">
            {children}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Card>
  );


const ROLLED_ATTRIBUTE_NAMES = ['CCA', 'RCA', 'REF', 'INT', 'KNO', 'PRE', 'POW', 'STR', 'FOR'] as const;

function rollHighTwo3d6() {
  const values = [ND6(), ND6(), ND6()].sort((a, b) => b - a);
  return values[0] + values[1];
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function rollHighTwoFromRandom(random: () => number) {
  const values = [1 + Math.floor(random() * 6), 1 + Math.floor(random() * 6), 1 + Math.floor(random() * 6)].sort((a, b) => b - a);
  return values[0] + values[1];
}

function calculateCurrentCandidacyProbability(expression: string | null | undefined, samples = 50000) {
  if (!expression) return -1;
  if (expression.trim().toLowerCase() === 'any') return 1;
  const referenced = ROLLED_ATTRIBUTE_NAMES.filter((attribute) => new RegExp(`\\b${attribute}\\b`, 'i').test(expression));
  if (!referenced.length) return -1;
  const random = seededRandom(0x445844); // "DXD" — deterministic developer-tool sample.
  let successful = 0;
  const values: Record<string, number> = {};
  for (let sample = 0; sample < samples; sample += 1) {
    for (const attribute of referenced) values[attribute] = rollHighTwoFromRandom(random);
    if (evaluateCandidacy(expression, values)) successful += 1;
  }
  return successful / samples;
}

const UtilityResultGrid = ({ rows }: { rows: { label: string; result: React.ReactNode; expected?: React.ReactNode; pass?: boolean }[] }) => <div className="grid gap-2 lg:grid-cols-2">
  {rows.map((row) => <div key={row.label} className={`rounded-md border p-3 text-sm ${row.pass === false ? 'border-destructive/60 bg-destructive/5' : ''}`}>
    <div className="font-medium">{row.label}</div>
    <div className="mt-1 font-mono text-xs">Result: {row.result}</div>
    {row.expected !== undefined && <div className="font-mono text-xs text-muted-foreground">Expected: {row.expected}</div>}
  </div>)}
</div>;

const NumberSuffixFormattingTest = () => {
  const values = [0, 1, 10, 1000, 1500, 1000000, -2500];
  return <UtilityResultGrid rows={values.map((value) => { const formatted = formatNumberWithSuffix(value); const parsed = parseNumberWithSuffix(formatted); return { label: String(value), result: `${formatted} -> ${parsed}`, expected: value, pass: parsed === value }; })} />;
};

const DiceRollerDemo = () => {
  const [rolls, setRolls] = useState<Record<string, number | null>>({ D6: null, '2D6': null, '3D6': null, D66: null, '3D high-two': null });
  const roll = (key: string) => setRolls((current) => ({ ...current, [key]: key === 'D6' ? ND6() : key === '2D6' ? ND6(2) : key === '3D6' ? ND6(3) : key === 'D66' ? D66() : rollHighTwo3d6() }));
  return <div className="flex flex-wrap gap-2">{Object.entries(rolls).map(([key, value]) => <Button key={key} variant="outline" onClick={() => roll(key)}>{key}: {value ?? 'Roll'}</Button>)}</div>;
};

const DisabilityFunctionTest = () => <UtilityResultGrid rows={[
  { label: '[Coward 2]', result: String(isDisability('[Coward 2]')), expected: 'true', pass: isDisability('[Coward 2]') },
  { label: 'Coward 2', result: String(isDisability('Coward 2')), expected: 'false', pass: !isDisability('Coward 2') },
  { label: ' [Hatred > Elves] ', result: String(isDisability(' [Hatred > Elves] ')), expected: 'true', pass: isDisability(' [Hatred > Elves] ') },
]} />;

const TalentParserTest = () => {
  const examples = ['***[Hatred 2 > Elves]', 'Athletics 3', 'Cook > Baking', '*Focused 2'];
  return <div className="space-y-2">{examples.map((example) => <div key={example} className="rounded-md border p-3"><div className="font-mono text-sm">{example}</div><pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">{JSON.stringify(parseTalent(example), null, 2)}</pre></div>)}</div>;
};

const AgeRankValueTest = () => <UtilityResultGrid rows={['A', 'B', 'C', '0', '1', '5', '10'].map((rank) => ({ label: `Rank ${rank}`, result: getAgeRankValue(rank) }))} />;

const AgeRankGroupTest = ({ data }: { data: StaticData }) => <div className="grid gap-3 lg:grid-cols-2"><div><div className="mb-2 font-medium">Age Group → Rank</div><UtilityResultGrid rows={data.ageGroups.map((entry) => ({ label: entry.ageGroup, result: getAgeRank(entry.ageGroup, data.ageGroups) ?? '—', expected: entry.rank, pass: getAgeRank(entry.ageGroup, data.ageGroups) === entry.rank }))} /></div><div><div className="mb-2 font-medium">Rank → Age Group</div><UtilityResultGrid rows={data.ageGroups.map((entry) => ({ label: entry.rank, result: getAgeGroup(entry.rank, data.ageGroups) ?? '—', expected: entry.ageGroup, pass: getAgeGroup(entry.rank, data.ageGroups) === entry.ageGroup }))} /></div></div>;

const MaturityParserTest = ({ data }: { data: StaticData }) => {
  const examples = ['Youth[0]', 'Young Adult[2]', 'Youth[0] or Genera[4]', ''];
  return <UtilityResultGrid rows={examples.map((value) => ({ label: value || '(empty)', result: JSON.stringify(parseMaturityString(value, data)) }))} />;
};

const MaturityDifferenceTest = () => <UtilityResultGrid rows={[
  { label: 'Age 4/Profession 2 vs Age 2/Profession 1', result: calculateMaturityDifference({ ageRank: 4, professionRank: 2 }, { ageRank: 2, professionRank: 1 }), expected: 2, pass: calculateMaturityDifference({ ageRank: 4, professionRank: 2 }, { ageRank: 2, professionRank: 1 }) === 2 },
  { label: 'Age 2/Profession 5 vs Age 4/Profession 2', result: calculateMaturityDifference({ ageRank: 2, professionRank: 5 }, { ageRank: 4, professionRank: 2 }), expected: 3, pass: calculateMaturityDifference({ ageRank: 2, professionRank: 5 }, { ageRank: 4, professionRank: 2 }) === 3 },
]} />;

const AdjustTalentMaturityTest = () => <UtilityResultGrid rows={[
  { label: '***Foo 5, difference 0', result: adjustTalentByMaturity('***Foo 5', 0) },
  { label: '***Foo 5, difference 2', result: adjustTalentByMaturity('***Foo 5', 2) },
  { label: '*[Hatred 2 > Elves], difference 1', result: adjustTalentByMaturity('*[Hatred 2 > Elves]', 1) || '(disqualified)' },
]} />;

const SkillpointCostTest = ({ data }: { data: StaticData }) => {
  const examples = [
    { label: 'Attribute +1 CCA', value: calculateAttributeSkillpointCost('+1 CCA', data) },
    { label: 'Attribute +2 STR', value: calculateAttributeSkillpointCost('+2 STR', data) },
    { label: 'Bonus +1 Brawn', value: calculateBonusSkillpointCost('+1 Brawn', data) },
    { label: 'Bonus +2 Climb', value: calculateBonusSkillpointCost('+2 Climb', data) },
  ];
  return <UtilityResultGrid rows={examples.map((entry) => ({ label: entry.label, result: entry.value }))} />;
};

const SimpleDataTablesTest = ({ data }: { data: StaticData }) => <div className="space-y-6">
  <SimpleDisplayCardTest title="Age Groups" data={data.ageGroups} />
  <SimpleDisplayCardTest title="PML Titles" data={data.pmlTitles} />
  <SimpleDisplayCardTest title="Wealth Titles" data={data.wealthTitles} />
  <SimpleDisplayCardTest title="Point Buy Costs" data={data.pointBuyCosts} />
</div>;

const D66LookupTest = ({ title, tableData }: { title: string; tableData: any[]; }) => {
  const [d66Roll, setD66Roll] = useState<number | null>(null);
  const [lookupResult, setLookupResult] = useState<any | null>(null);

  const handleRoll = () => {
    const roll = D66();
    setD66Roll(roll);
    const result = d66Lookup(roll, tableData);
    setLookupResult(result);
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <Button onClick={handleRoll}>Roll D66 for {title}</Button>
      {d66Roll !== null && (
        <div className="mt-2 p-2 border rounded-md bg-gray-50">
          <p>
            D66 Roll: <span className="font-mono text-primary">{d66Roll}</span>
          </p>
          {lookupResult ? (
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded-md overflow-x-auto">
              {JSON.stringify(lookupResult, null, 2)}
            </pre>
          ) : (
            <p className="mt-2 text-destructive">No match found for this roll.</p>
          )}
        </div>
      )}
    </div>
  );
};

const D66AndD6LookupTest = ({ title, tableData }: { title: string; tableData: any[]; }) => {
  const [d66Roll, setD66Roll] = useState<number | null>(null);
  const [d6Roll, setD6Roll] = useState<number | null>(null);
  const [d66Result, setD66Result] = useState<any | null>(null);
  const [finalResult, setFinalResult] = useState<any | null>(null);

  const handleRoll = () => {
    const d66 = D66();
    const d6 = ND6();
    setD66Roll(d66);
    setD6Roll(d6);

    const row = d66Lookup(d66, tableData);
    setD66Result(row);

    if (row) {
      const result = d6ColumnLookup(d6, row);
      setFinalResult(result);
    } else {
      setFinalResult(null);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <Button onClick={handleRoll}>Roll for {title}</Button>
      {d66Roll !== null && d6Roll !== null && (
        <div className="mt-2 p-2 border rounded-md bg-gray-50">
          <p>
            D66 Roll: <span className="font-mono text-primary">{d66Roll}</span>
          </p>
          <p>
            D6 Roll: <span className="font-mono text-primary">{d6Roll}</span>
          </p>
          {d66Result ? (
            <>
              <p>Row found:</p>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded-md overflow-x-auto">
                {JSON.stringify(d66Result, null, 2)}
              </pre>
              <p className="mt-2">
                Final Result: <span className="font-bold text-primary">{finalResult ?? 'N/A'}</span>
              </p>
            </>
          ) : (
            <p className="mt-2 text-destructive">No match found for this D66 roll.</p>
          )}
        </div>
      )}
    </div>
  );
};

const AgeGenerationTest = ({ species, ageGroup, data, expectedRange }: { species: keyof StaticData['ageBrackets'], ageGroup: string, data: StaticData, expectedRange: string }) => {
  const [generatedAge, setGeneratedAge] = useState<number | null>(null);

  const handleGenerate = () => {
    const age = getAgeInYears(species, ageGroup, data.ageBrackets, data.ageGroups);
    setGeneratedAge(age);
  };

  return (
    <div className="space-y-2 p-2 border-l-4">
       <h3 className="font-semibold text-sm">Generate Age for {species} - {ageGroup}</h3>
       <p className="font-mono text-xs">Expected Range: {expectedRange}</p>
       <Button onClick={handleGenerate}>Generate</Button>
       {generatedAge !== null && (
         <p className="mt-2 font-mono text-xs">
           Generated Age: <span className="text-primary font-bold">{generatedAge}</span>
         </p>
       )}
    </div>
  );
};

const TragedySeedTest = ({ data }: { data: StaticData }) => {
  const [d66Roll, setD66Roll] = useState<number | null>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [resolvedSeed, setResolvedSeed] = useState<string | null>(null);
  const [resolutionSteps, setResolutionSteps] = useState<string[]>([]);

  const handleGenerate = () => {
    const roll = D66();
    const foundTemplate = d66Lookup(roll, data.tragedySeeds);
    
    if (foundTemplate && foundTemplate.seed) {
      let currentString = foundTemplate.seed;
      const steps: string[] = [];
      const keywords = parseTragedyTemplate(foundTemplate.seed);

      for (const keyword of keywords) {
          const keywordD66Roll = D66();
          const lookupResult = lookupTragedyKeyword(keyword, keywordD66Roll, data.randomPersonItemDeity);
          
          steps.push(`(${keyword}) -> D66[${keywordD66Roll}] -> '${lookupResult.raw}' -> resolved to '${lookupResult.resolved}' ${lookupResult.details}`);
          
          const regex = new RegExp(`\\(${keyword}\\)`, 'i');
          currentString = currentString.replace(regex, lookupResult.resolved);
      }

      setD66Roll(roll);
      setTemplate(foundTemplate.seed);
      setResolutionSteps(steps);
      setResolvedSeed(currentString);
    } else {
      setD66Roll(roll);
      setTemplate("No template found for this roll.");
      setResolvedSeed(null);
      setResolutionSteps([]);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Tragedy Seed Generator</h3>
      <Button onClick={handleGenerate}>Generate Tragedy Seed</Button>
      {d66Roll !== null && template !== null && (
        <div className="mt-2 p-2 border rounded-md bg-gray-50">
          <p>
            D66 Roll: <span className="font-mono text-primary">{d66Roll}</span>
          </p>
          <p className="mt-2">
            Template: <span className="font-mono">{template}</span>
          </p>
          {resolutionSteps.length > 0 && (
             <div className="mt-2 text-xs">
              <p className="font-semibold">Resolution Steps:</p>
              <ul className="list-disc list-inside font-mono">
                {resolutionSteps.map((step, index) => <li key={index}>{step}</li>)}
              </ul>
             </div>
          )}
          {resolvedSeed && (
             <p className="mt-2">
              Resolved: <span className="font-bold text-primary">{resolvedSeed}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const ND6Test = () => {
  const [results, setResults] = useState<{ [key: number]: number | null }>({ 1: null, 2: null, 3: null });

  const handleRoll = (dice: number) => {
    const result = ND6(dice);
    setResults(prev => ({ ...prev, [dice]: result }));
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">ND6 Function Test</h3>
      <p className="text-sm text-muted-foreground">
        Click the buttons to roll a specified number of 6-sided dice and see the summed result.
      </p>
      {[1, 2, 3].map(diceCount => (
        <div key={diceCount} className="p-2 border rounded-md bg-gray-50">
            <div className="flex items-center gap-4">
                <Button onClick={() => handleRoll(diceCount)}>Roll {diceCount}D6</Button>
                {results[diceCount] !== null && (
                    <p>
                        Result: <span className="font-mono font-bold text-primary">{results[diceCount]}</span>
                    </p>
                )}
          </div>
        </div>
      ))}
    </div>
  );
};

type ProfessionResult = {
    trade: string;
    candidacy: string | null;
    namingPractice: string;
    specializations: string[];
    likelihood: number;
    relativeShare: number;
}

const CandidacySimulationTest = ({ data }: { data: StaticData }) => {
    const [results, setResults] = useState<ProfessionResult[] | null>(null);
    const [calculating, setCalculating] = useState(false);

    const calculateProbabilities = () => {
        setCalculating(true);
        // Use a timeout to prevent blocking the UI thread on a long-running task
        setTimeout(() => {
            const professionProbs = data.tradePackages.map(pkg => {
                const prof = data.professions.find(entry => entry.trade === pkg.trade);
                const prob = calculateCurrentCandidacyProbability(prof?.candidacy ?? null);
                return { trade: pkg.trade, candidacy: prof?.candidacy ?? null, namingPractice: prof?.namingPractice ?? 'Generic', specializations: pkg.specializations.map(spec => spec.name), prob };
            }).filter(entry => entry.prob >= 0);

            const totalProb = professionProbs.reduce((sum, res) => sum + res.prob, 0);

            const finalResults: ProfessionResult[] = professionProbs.map(res => ({
                trade: res.trade,
                candidacy: res.candidacy,
                namingPractice: res.namingPractice,
                specializations: res.specializations,
                likelihood: Math.round(res.prob * 1000),
                relativeShare: totalProb > 0 ? Math.round((res.prob / totalProb) * 1000) : 0,
            }));
            
            setResults(finalResults);
            setCalculating(false);
        }, 0);
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground -mb-2">
              This deterministic 50,000-character simulation estimates base qualification probabilities for current selectable Trades using the Forge's 3D-high-two Attribute distribution. It models unadjusted base rolls before Lineage, Age, or purchased increases.
              <br />• <b>Likelihood</b>: The chance out of 1000 that a random character will qualify for that specific trade.
              <br />• <b>Relative Share</b>: Of all the characters that qualify for *any* trade, this shows the distribution of trades they are likely to have.
            </p>
            <Button onClick={calculateProbabilities} disabled={calculating}>
                {calculating ? <><Icons.Loader className="animate-spin" /> Calculating...</> : 'Calculate Probabilities'}
            </Button>
            {results && (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Trade</TableHead>
                            <TableHead className="text-right">Likelihood (per 1000)</TableHead>
                            <TableHead className="text-right">Relative Share (per 1000)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {results.map(res => (
                              <TableRow key={res.trade}>
                                  <TableCell className="font-semibold">{res.trade}</TableCell>
                                  <TableCell className="text-right">{res.likelihood}</TableCell>
                                  <TableCell className="text-right">{res.relativeShare}</TableCell>
                              </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
};

const CandidacyEvaluatorTest = () => {
    const defaultExpression = "INT + KNO + PRE + POW >= 28, and KNO, PRE 10+";
    const [expression, setExpression] = useState(defaultExpression);
    const [result, setResult] = useState<number | null>(null);

    const handleEvaluate = () => {
        const prob = calculateCurrentCandidacyProbability(expression);
        setResult(prob);
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        if (value === "") {
            setExpression(defaultExpression);
        } else {
            setExpression(value);
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground -mb-2">
              Enter a candidacy expression to estimate its likelihood of success out of 1000 using the Forge's current 3D-high-two Attribute method.
            </p>
            <Textarea 
                value={expression}
                onChange={handleInputChange}
                className="font-mono"
                rows={3}
            />
            <Button onClick={handleEvaluate}>
                Evaluate
            </Button>
            {result !== null && (
                 <div className="mt-2 p-2 border rounded-md bg-gray-50 font-mono text-sm">
                    {result === -1 
                        ? <p className="text-destructive">Invalid Expression</p>
                        : <p>Likelihood (per 1000): <span className="font-bold text-primary">{Math.round(result * 1000)}</span></p>
                    }
                 </div>
            )}
        </div>
    );
};

const SalaryCalculationTest = ({ data }: { data: StaticData }) => {
    const tests = [
        { trade: 'Academic', rank: 1, expected: { wr: -10, daily: 1, monthly: 30 } },
        { trade: 'Academic', rank: 4, expected: { wr: 4, daily: 25, monthly: 750 } },
        { trade: 'Academic', rank: 8, expected: { wr: 22, daily: 1500, monthly: 45000 } },
        { trade: 'Knight', rank: 1, expected: { wr: -7, daily: 2, monthly: 60 } },
        { trade: 'Knight', rank: 4, expected: { wr: 6, daily: 40, monthly: 1200 } },
        { trade: 'Knight', rank: 8, expected: { wr: 23, daily: 2000, monthly: 60000 } },
        { trade: 'Service', rank: 1, expected: { wr: -13, daily: 0.5, monthly: 15 } },
        { trade: 'Service', rank: 4, expected: { wr: 1, daily: 12, monthly: 360 } },
        { trade: 'Service', rank: 8, expected: { wr: 19, daily: 800, monthly: 24000 } },
        { trade: 'Rabble', rank: 3, expected: { wr: -3, daily: 5, monthly: 150 } },
        { trade: 'Rabble', rank: 4, expected: null },
    ];

    return (
        <div className="space-y-2">
            <p className="text-sm text-muted-foreground -mb-2">
              Tests the `calculateSalary` function for various combinations of Trade and Trade Rank.
            </p>
            {tests.map((test, i) => {
                const result = calculateSalary(test.trade, test.rank, data);
                
                if (test.expected === null) {
                    const pass = result === null;
                    return <TestCase key={i} title={`Test ${test.trade} Rank ${test.rank} (should fail)`} result={result} expected={test.expected} pass={pass} />;
                }

                if (!result) {
                    return <TestCase key={i} title={`Test ${test.trade} Rank ${test.rank}`} result="null" expected={test.expected} pass={false} />;
                }
                
                const pass = result.finalWealthRank === test.expected.wr && 
                             Math.abs(result.dailySalary - test.expected.daily) < 0.01 && 
                             Math.abs(result.monthlySalary - test.expected.monthly) < 0.01;

                const resultDisplay = `WR: ${result.finalWealthRank}, Daily: ${result.dailySalary.toFixed(1)}, Monthly: ${result.monthlySalary}`;
                const expectedDisplay = `WR: ${test.expected.wr}, Daily: ${test.expected.daily.toFixed(1)}, Monthly: ${test.expected.monthly}`;

                return <TestCase key={i} title={`Test ${test.trade} Rank ${test.rank}`} result={resultDisplay} expected={expectedDisplay} pass={pass} />;
            })}
        </div>
    );
};

const CustomizeGroupPay = ({ data }: { data: StaticData }) => {
  const [rows, setRows] = useState([{ id: crypto.randomUUID(), trade: 'Warrior', rank: 1, count: 1 }]);

  const handleAddRow = () => {
    setRows([...rows, { id: crypto.randomUUID(), trade: 'Warrior', rank: 1, count: 1 }]);
  };

  const handleRemoveRow = (id: string) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleUpdateRow = (id: string, field: 'trade' | 'rank' | 'count', value: string | number) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const newRow = { ...row, [field]: value };
        // If trade changes to Rabble, cap the rank
        if (field === 'trade' && value === 'Rabble' && newRow.rank > 3) {
          newRow.rank = 3;
        }
        return newRow;
      }
      return row;
    }));
  };

  const trades = data.tradePackages.map((entry) => entry.trade);
  const ranks = Array.from({ length: 10 }, (_, i) => i + 1);
  const counts = Array.from({ length: 20 }, (_, i) => i + 1);

  const calculatedRows = rows.map(row => {
    const salary = calculateSalary(row.trade, row.rank, data);
    const count = row.count || 1;
    const dailySalary = salary ? salary.dailySalary * count : null;
    const monthlySalary = salary ? salary.monthlySalary * count : null;
    const quarterlySalary = salary ? salary.monthlySalary * 3 * count : null;
    return {
      ...row,
      dailySalary,
      monthlySalary,
      quarterlySalary
    };
  });

  const totals = calculatedRows.reduce((acc, row) => {
    if (row.dailySalary) acc.daily += row.dailySalary;
    if (row.monthlySalary) acc.monthly += row.monthlySalary;
    if (row.quarterlySalary) acc.quarterly += row.quarterlySalary;
    return acc;
  }, { daily: 0, monthly: 0, quarterly: 0 });

  return (
    <div className="space-y-4 p-4 border rounded-md">
      <h3 className="font-semibold">Customize Group Pay</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Trade</TableHead>
            <TableHead>Rank</TableHead>
            <TableHead>Count</TableHead>
            <TableHead className="text-right">Per Day (sp)</TableHead>
            <TableHead className="text-right">Per Month (sp)</TableHead>
            <TableHead className="text-right">Per Quarter (sp)</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calculatedRows.map((row, index) => {
            const isRabble = row.trade === 'Rabble';
            return (
              <TableRow key={row.id}>
                <TableCell className="w-[200px]">
                  <Select
                    value={row.trade}
                    onValueChange={(value) => handleUpdateRow(row.id, 'trade', value)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {trades.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="w-[120px]">
                   <Select
                    value={String(row.rank)}
                    onValueChange={(value) => handleUpdateRow(row.id, 'rank', parseInt(value))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ranks.map(r => (
                        <SelectItem key={r} value={String(r)} disabled={isRabble && r > 3}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="w-[120px]">
                   <Select
                    value={String(row.count)}
                    onValueChange={(value) => handleUpdateRow(row.id, 'count', parseInt(value))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {counts.map(c => (
                        <SelectItem key={c} value={String(c)}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.dailySalary !== null ? `${row.dailySalary.toLocaleString()} (${getIndex(row.dailySalary / row.count)})` : 'N/A'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.monthlySalary !== null ? `${row.monthlySalary.toLocaleString()} (${getIndex(row.monthlySalary / (30 * row.count))})` : 'N/A'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.quarterlySalary !== null ? `${row.quarterlySalary.toLocaleString()} (${getIndex(row.quarterlySalary / (90 * row.count))})` : 'N/A'}
                </TableCell>
                <TableCell>
                  {index === 0 ? (
                    <Button variant="ghost" size="icon" aria-label="Add salary adjustment row" onClick={handleAddRow}>
                      [+]
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" aria-label="Remove salary adjustment row" onClick={() => handleRemoveRow(row.id)}>
                      (x)
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="font-bold text-right">Total</TableCell>
            <TableCell className="text-right font-mono font-bold">
              {totals.daily.toLocaleString()} ({getIndex(totals.daily)})
            </TableCell>
            <TableCell className="text-right font-mono font-bold">
              {totals.monthly.toLocaleString()} ({getIndex(totals.monthly / 30)})
            </TableCell>
             <TableCell className="text-right font-mono font-bold">
              {totals.quarterly.toLocaleString()} ({getIndex(totals.quarterly / 90)})
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};


const SalaryExpectationsTest = ({ data }: { data: StaticData }) => {
  // States for single contractor
  const [singleTrade, setSingleTrade] = useState<string | undefined>(undefined);
  const [singleRank, setSingleRank] = useState<string>('');
  const [singleRankMax, setSingleRankMax] = useState(10);
  const [contractor, setContractor] = useState<ReturnType<typeof generateContractor>>(null);

  // States for squad
  const [squadTrade, setSquadTrade] = useState<string>('Any');
  const [avgRank, setAvgRank] = useState<string>('');
  const [avgRankMax, setAvgRankMax] = useState(10);
  const [squad, setSquad] = useState<Squad | null>(null);

  const trades = ['Any', ...data.tradePackages.map((entry) => entry.trade)];

  const handleSingleTradeChange = (val: string) => {
    const newTrade = val === 'Any' ? undefined : val;
    setSingleTrade(newTrade);
    const isRabble = newTrade?.toLowerCase() === 'rabble';
    const newMax = isRabble ? 3 : 10;
    setSingleRankMax(newMax);
    if (parseInt(singleRank) > newMax) {
        setSingleRank(String(newMax));
    }
  };

  const handleSquadTradeChange = (val: string) => {
    setSquadTrade(val);
    const isRabble = val?.toLowerCase() === 'rabble';
    const newMax = isRabble ? 3 : 10;
    setAvgRankMax(newMax);
    if (parseInt(avgRank) > newMax) {
        setAvgRank(String(newMax));
    }
  };

  const handleGenerateContractor = () => {
    const result = generateContractor(data, singleTrade, singleRank ? parseInt(singleRank) : undefined);
    setContractor(result);
  };
  
  const handleGenerateSquad = () => {
    const leaderRank = avgRank ? parseInt(avgRank) : ND6(2);
    const result = generateSquad(data, data.militaryHierarchy, leaderRank, squadTrade);
    setSquad(result);
  };

  const allSquadMembers: Contractor[] = squad ? [
    squad.leader,
    squad.secondary,
    ...squad.bands.flatMap(b => [b.leader, ...b.followers])
  ] : [];

  const sortedSquad = allSquadMembers.length > 0 ? [...allSquadMembers].sort((a, b) => (b?.tradeRank || 0) - (a?.tradeRank || 0)) : null;
  
  const totalMonthlySalary = squad?.totalMonthlySalary ?? 0;
  const totalQuarterlySalary = totalMonthlySalary * 3;
  const totalYearlySalary = totalMonthlySalary * 12;

  return (
    <div className="space-y-8">
      {/* Single Contractor Generator */}
      <div className="space-y-4 p-4 border rounded-md">
        <h3 className="font-semibold">Contractor Generator</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Trade (Optional)</Label>
            <Select onValueChange={handleSingleTradeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Random" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any">Random</SelectItem>
                {trades.slice(1).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Trade Rank (Optional)</Label>
            <Input type="number" min="1" max={singleRankMax} placeholder="Random" value={singleRank} onChange={(e) => setSingleRank(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleGenerateContractor}>Generate Contractor</Button>
        {contractor && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <h4 className="font-semibold">Generated Contractor</h4>
            <p>Trade: <span className="font-mono">{contractor.trade}</span></p>
            <p>Rank: <span className="font-mono">
                {(() => {
                    const titleRow = data.namingPracticeTitles.find(t => t.Rank === String(contractor.tradeRank));
                    const rankTitle = titleRow && contractor.namingPractice in titleRow ? (titleRow as any)[contractor.namingPractice] : '';
                    return `${contractor.tradeRank} ${rankTitle && `(${rankTitle})`}`;
                })()}
            </span></p>
            <p>Monthly Salary: <span className="font-mono">{contractor.salary?.monthlySalary.toLocaleString() ?? 'N/A'} sp</span></p>
          </div>
        )}
      </div>

      {/* Squad Generator */}
      <div className="space-y-4 p-4 border rounded-md">
        <h3 className="font-semibold">Squad Generator</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Trade</Label>
            <Select value={squadTrade} onValueChange={handleSquadTradeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Trade" />
              </SelectTrigger>
              <SelectContent>
                {trades.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Leader's Rank (Optional)</Label>
            <Input type="number" min="1" max={avgRankMax} placeholder="Random (2D6)" value={avgRank} onChange={(e) => setAvgRank(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleGenerateSquad}>Generate Squad</Button>
        {sortedSquad && sortedSquad.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Generated Squad Summary ({squad?.memberCount} members)</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Rank / Title</TableHead>
                  <TableHead className="text-right">Monthly Salary (sp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSquad.map((member, index) => {
                  if (!member) return null;
                  const titleRow = data.namingPracticeTitles.find(t => t.Rank === String(member.tradeRank));
                  const rankTitle = titleRow && member.namingPractice in titleRow ? (titleRow as any)[member.namingPractice] : '';

                  return (
                    <TableRow key={member.id}>
                      <TableCell>#{index + 1} ({member.role})</TableCell>
                      <TableCell>{member.trade}</TableCell>
                      <TableCell>
                        {member.tradeRank} {rankTitle && `(${rankTitle})`}
                      </TableCell>
                      <TableCell className="text-right">{member.salary?.monthlySalary.toLocaleString() ?? 'N/A'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-4 border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-right">Total Cost (sp)</TableHead>
                            <TableHead className="text-right">Required WR</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-semibold">Monthly</TableCell>
                            <TableCell className="text-right font-mono">{totalMonthlySalary.toLocaleString()}</TableCell>
                             <TableCell className="text-right font-mono">{getIndex(totalMonthlySalary / 30)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Quarterly</TableCell>
                            <TableCell className="text-right font-mono">{totalQuarterlySalary.toLocaleString()}</TableCell>
                             <TableCell className="text-right font-mono">{getIndex(totalQuarterlySalary / 90)}</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell className="font-semibold">Yearly</TableCell>
                            <TableCell className="text-right font-mono">{totalYearlySalary.toLocaleString()}</TableCell>
                             <TableCell className="text-right font-mono">{getIndex(totalYearlySalary / 360)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
          </div>
        )}
      </div>
      <CustomizeGroupPay data={data} />
    </div>
  );
};

const MilitaryUnitGeneratorTest = ({ data }: { data: StaticData }) => {
    const MIN_RANKS: { [key: string]: number } = { Band: 1, Squad: 2, Group: 3, Company: 4, Detachment: 6, Formation: 7, Division: 8 };
    const [unitSize, setUnitSize] = useState('Band');
    const [leaderRank, setLeaderRank] = useState(MIN_RANKS[unitSize]);
    const [trade, setTrade] = useState('Warrior');
    
    const [generatedDivision, setGeneratedDivision] = useState<Division | null>(null);
    const [generatedFormation, setGeneratedFormation] = useState<Formation | null>(null);
    const [generatedDetachment, setGeneratedDetachment] = useState<Detachment | null>(null);
    const [generatedCompany, setGeneratedCompany] = useState<Company | null>(null);
    const [generatedGroup, setGeneratedGroup] = useState<Group | null>(null);
    const [generatedSquad, setGeneratedSquad] = useState<Squad | null>(null);
    const [generatedBand, setGeneratedBand] = useState<Band | null>(null);

    const trades = ['Any', ...data.tradePackages.map((entry) => entry.trade)];
    
    const handleUnitSizeChange = (newSize: string) => {
        setUnitSize(newSize);
        const minRank = MIN_RANKS[newSize];
        if (leaderRank < minRank) {
            setLeaderRank(minRank);
        }
    }

    const handleGenerate = () => {
        setGeneratedDivision(null);
        setGeneratedFormation(null);
        setGeneratedDetachment(null);
        setGeneratedCompany(null);
        setGeneratedGroup(null);
        setGeneratedSquad(null);
        setGeneratedBand(null);

        const rank = Math.max(MIN_RANKS[unitSize], leaderRank);

        if (unitSize === 'Division') {
            setGeneratedDivision(generateDivision(data, data.militaryHierarchy, rank, trade));
        } else if (unitSize === 'Formation') {
            setGeneratedFormation(generateFormation(data, data.militaryHierarchy, rank, trade));
        } else if (unitSize === 'Detachment') {
            setGeneratedDetachment(generateDetachment(data, data.militaryHierarchy, rank, trade));
        } else if (unitSize === 'Company') {
            setGeneratedCompany(generateCompany(data, data.militaryHierarchy, rank, trade));
        } else if (unitSize === 'Group') {
            setGeneratedGroup(generateGroup(data, data.militaryHierarchy, rank, trade));
        } else if (unitSize === 'Squad') {
            setGeneratedSquad(generateSquad(data, data.militaryHierarchy, rank, trade));
        } else {
            setGeneratedBand(generateBand(data, data.militaryHierarchy, rank, trade));
        }
    };

    const getTitle = (member: Contractor) => {
        const titleRow = data.namingPracticeTitles.find(t => t.Rank === String(member.tradeRank));
        const rankTitle = titleRow && member.namingPractice in titleRow ? (titleRow as any)[member.namingPractice] : '';
        return rankTitle ? `(${rankTitle})` : '';
    };

    const MemberRow = ({ member, role }: { member: Contractor, role?: string }) => (
        <TableRow key={member.id}>
            <TableCell>{role ?? member.role}</TableCell>
            <TableCell>{member.trade}</TableCell>
            <TableCell>{member.tradeRank} {getTitle(member)}</TableCell>
            <TableCell className="text-right font-mono">{member.salary?.monthlySalary.toLocaleString()} sp</TableCell>
        </TableRow>
    );
    
    const RenderSpecialistUnit = ({ unit, index, titlePrefix }: { unit: SpecialistUnit, index: number, titlePrefix: string }) => {
        const summary = (
            <div className="flex flex-1 items-center justify-between">
                <h5 className="font-semibold text-lg">{titlePrefix} #{index + 1} <span className="text-sm font-normal text-muted-foreground">({unit.memberCount} members)</span></h5>
                <span className="text-sm text-muted-foreground font-mono ml-4">{unit.totalMonthlySalary.toLocaleString()} sp / month</span>
            </div>
        );

        const content = (
            <Table>
                <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                <TableBody>
                    <MemberRow member={unit.leader} />
                    {unit.members.map(m => <MemberRow key={m.id} member={m} />)}
                </TableBody>
            </Table>
        );

        return (
            <AccordionItem value={`specialist-unit-${unit.leader.id}`} className="bg-gray-100/75 rounded-md border">
                <AccordionTrigger className="p-4 text-left hover:no-underline">{summary}</AccordionTrigger>
                <AccordionContent className="p-4 pt-0">{content}</AccordionContent>
            </AccordionItem>
        );
    };

    const RenderBand = ({ band, isTopLevel = false, index }: { band: Band, isTopLevel?: boolean, index?: number }) => {
        const summary = (
            <div className="flex flex-1 items-center justify-between">
                <h5 className="font-semibold text-lg">Band{index !== undefined ? ` #${index + 1}` : ''} <span className="text-sm font-normal text-muted-foreground">({band.memberCount} members)</span></h5>
                <span className="text-sm text-muted-foreground font-mono ml-4">{band.totalMonthlySalary.toLocaleString()} sp / month</span>
            </div>
        );

        const content = (
            <Table>
                <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                <TableBody>
                    <MemberRow member={band.leader} />
                    {band.followers.map(f => <MemberRow key={f.id} member={f} />)}
                </TableBody>
            </Table>
        );

        if (isTopLevel) {
            return (
                <div className="mt-6 space-y-4">
                    <h5 className="font-semibold text-lg">Generated Band <span className="text-sm font-normal text-muted-foreground">({band.memberCount} total members)</span></h5>
                    {content}
                    <div className="mt-4 text-right font-bold text-xl">
                        Total Band Monthly Salary: {band.totalMonthlySalary.toLocaleString()} sp
                    </div>
                </div>
            )
        }

        return (
            <AccordionItem value={`band-${band.leader.id}`} className="bg-gray-50/50 rounded-md border">
                <AccordionTrigger className="p-4 text-left hover:no-underline">{summary}</AccordionTrigger>
                <AccordionContent className="p-4 pt-0">{content}</AccordionContent>
            </AccordionItem>
        );
    };

    const RenderSquad = ({ squad, isTopLevel = false, index }: { squad: Squad, isTopLevel?: boolean, index?: number }) => {
        const summary = (
            <div className="flex flex-1 items-center justify-between">
                <h4 className="font-bold text-xl">Squad{index !== undefined ? ` #${index + 1}` : ''} <span className="text-base font-normal text-muted-foreground">({squad.memberCount} members)</span></h4>
                <span className="text-base font-normal text-muted-foreground font-mono ml-4">{squad.totalMonthlySalary.toLocaleString()} sp / month</span>
            </div>
        );

        const content = (
            <div className="space-y-4">
                <Table>
                    <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <MemberRow member={squad.leader} />
                        <MemberRow member={squad.secondary} />
                    </TableBody>
                </Table>
                <Accordion type="multiple" className="space-y-2">
                    {squad.bands.map((band, i) => <RenderBand key={band.leader.id} band={band} index={i} />)}
                </Accordion>
            </div>
        );

        if (isTopLevel) {
            return (
                <div className="mt-6 space-y-4">
                    <h4 className="font-bold text-xl">Generated Squad <span className="text-base font-normal text-muted-foreground">({squad.memberCount} total members)</span></h4>
                    {content}
                    <div className="mt-4 text-right font-bold text-xl">
                        Total Squad Monthly Salary: {squad.totalMonthlySalary.toLocaleString()} sp
                    </div>
                </div>
            )
        }

        return (
            <AccordionItem value={`squad-${squad.leader.id}`} className="bg-white rounded-md border">
                <AccordionTrigger className="p-4 text-left hover:no-underline">{summary}</AccordionTrigger>
                <AccordionContent className="p-4 pt-0">{content}</AccordionContent>
            </AccordionItem>
        );
    };

    const RenderGroup = ({ group, isTopLevel = false, index }: { group: Group, isTopLevel?: boolean, index?: number }) => {
        const specialistSalary = group.specialists.reduce((sum, s) => sum + (s.salary?.monthlySalary ?? 0), 0);
        const summary = (
            <div className="flex flex-1 items-center justify-between">
                <h3 className="font-bold text-2xl">Group{index !== undefined ? ` #${index + 1}` : ''} <span className="text-xl font-normal text-muted-foreground">({group.memberCount} members)</span></h3>
                <span className="text-xl font-normal text-muted-foreground font-mono ml-4">{group.totalMonthlySalary.toLocaleString()} sp / month</span>
            </div>
        );

        const content = (
            <div className="space-y-4">
                <Table>
                    <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <MemberRow member={group.leader} />
                    </TableBody>
                </Table>
                
                {group.specialists.length > 0 && (
                     <Accordion type="single" collapsible className="w-full">
                         <AccordionItem value={`group-specialists-${group.leader.id}`} className="bg-gray-100/75 rounded-md border">
                            <AccordionTrigger className="p-4 text-left hover:no-underline">
                                <div className="flex flex-1 items-center justify-between">
                                    <h5 className="font-semibold text-lg">Group Specialists ({group.specialists.length} members)</h5>
                                    <span className="text-sm text-muted-foreground font-mono ml-4">{specialistSalary.toLocaleString()} sp / month</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {group.specialists.map(s => <MemberRow key={s.id} member={s} />)}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                         </AccordionItem>
                     </Accordion>
                )}
                
                <Accordion type="multiple" className="space-y-4 !mt-4">
                    {group.squads.map((squad, i) => <RenderSquad key={squad.leader.id} squad={squad} index={i}/>)}
                </Accordion>
            </div>
        );

        if (isTopLevel) {
            return (
                <div className="mt-6 space-y-4">
                     <h3 className="font-bold text-2xl">Generated Group <span className="text-xl font-normal text-muted-foreground">({group.memberCount} total members)</span></h3>
                    {content}
                    <div className="mt-4 text-right font-bold text-xl">
                        Total Group Monthly Salary: {group.totalMonthlySalary.toLocaleString()} sp
                    </div>
                </div>
            )
        }

        return (
            <AccordionItem value={`group-${group.leader.id}`} className="bg-gray-50/75 rounded-md border">
                <AccordionTrigger className="p-4 text-left hover:no-underline">{summary}</AccordionTrigger>
                <AccordionContent className="p-4 pt-0">{content}</AccordionContent>
            </AccordionItem>
        );
    };
    
    const RenderCompany = ({ company, isTopLevel = false, index }: { company: Company, isTopLevel?: boolean, index?: number }) => {
        const specialistSalary = company.specialists.reduce((sum, s) => sum + (s.salary?.monthlySalary ?? 0), 0);
        const summary = (
            <div className="flex flex-1 items-center justify-between">
                <h2 className="font-bold text-3xl">Company{index !== undefined ? ` #${index + 1}` : ''} <span className="text-2xl font-normal text-muted-foreground">({company.memberCount} members)</span></h2>
                <span className="text-2xl font-normal text-muted-foreground font-mono ml-4">{company.totalMonthlySalary.toLocaleString()} sp / month</span>
            </div>
        );
        
        const content = (
          <div className="space-y-4">
            <Table>
                <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                <TableBody>
                    <MemberRow member={company.leader} />
                    <MemberRow member={company.secondary} />
                </TableBody>
            </Table>

            {company.specialists.length > 0 && (
                <Accordion type="single" collapsible className="w-full mt-4">
                    <AccordionItem value={`company-specialists-${company.leader.id}`} className="bg-gray-100/75 rounded-md border">
                        <AccordionTrigger className="p-4 text-left hover:no-underline">
                            <div className="flex flex-1 items-center justify-between">
                                <h5 className="font-semibold text-lg">Company Specialists ({company.specialists.length} members)</h5>
                                <span className="text-sm text-muted-foreground font-mono ml-4">{specialistSalary.toLocaleString()} sp / month</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <Table>
                                <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {company.specialists.map(s => <MemberRow key={s.id} member={s} role="Specialist"/>)}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

            <Accordion type="multiple" className="space-y-4 !mt-4">
                {company.groups.map((group, i) => <RenderGroup key={group.leader.id} group={group} index={i}/>)}
            </Accordion>
          </div>
        );

        if (isTopLevel) {
            return (
                <div className="mt-6 space-y-4">
                    {summary}
                    {content}
                    <div className="mt-4 text-right font-bold text-xl">
                        Total Company Monthly Salary: {company.totalMonthlySalary.toLocaleString()} sp
                    </div>
                </div>
            );
        }

        return (
            <AccordionItem value={`company-${company.leader.id}`} className="bg-white rounded-md border">
                <AccordionTrigger className="p-4 text-left hover:no-underline">{summary}</AccordionTrigger>
                <AccordionContent className="p-4 pt-0">{content}</AccordionContent>
            </AccordionItem>
        )
    };
    
    const RenderDetachment = ({ detachment, isTopLevel = false, index }: { detachment: Detachment, isTopLevel?: boolean, index?: number }) => {
        const summary = (
            <div className="flex flex-1 items-center justify-between">
                <h2 className="font-bold text-4xl">Detachment{index !== undefined ? ` #${index + 1}` : ''} <span className="text-3xl font-normal text-muted-foreground">({detachment.memberCount} members)</span></h2>
                <span className="text-3xl font-normal text-muted-foreground font-mono ml-4">{detachment.totalMonthlySalary.toLocaleString()} sp / month</span>
            </div>
        );

        const content = (
          <div className="space-y-4">
            <Table>
                <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                <TableBody>
                    <MemberRow member={detachment.leader} />
                    <MemberRow member={detachment.second} />
                    <MemberRow member={detachment.liason} />
                    <MemberRow member={detachment.staffCoordinator} />
                </TableBody>
            </Table>
            
            <Accordion type="multiple" className="space-y-2 !mt-4">
                {detachment.specialistUnits.map((unit, i) => <RenderSpecialistUnit key={unit.leader.id} unit={unit} index={i} titlePrefix="Staff Specialist Unit" />)}
            </Accordion>
            
            <Accordion type="multiple" className="space-y-4 !mt-4">
                {detachment.companies.map((company, i) => <RenderCompany key={company.leader.id} company={company} index={i}/>)}
            </Accordion>
          </div>
        );

        if (isTopLevel) {
            return (
                <div className="mt-6 space-y-4">
                    {summary}
                    {content}
                    <div className="mt-4 text-right font-bold text-2xl">
                        Total Detachment Monthly Salary: {detachment.totalMonthlySalary.toLocaleString()} sp
                    </div>
                </div>
            );
        }

        return (
            <AccordionItem value={`detachment-${detachment.leader.id}`} className="bg-gray-50/25 rounded-md border">
                <AccordionTrigger className="p-4 text-left hover:no-underline">{summary}</AccordionTrigger>
                <AccordionContent className="p-4 pt-0">{content}</AccordionContent>
            </AccordionItem>
        )
    };
    
    const RenderFormation = ({ formation, isTopLevel = false, index }: { formation: Formation, isTopLevel?: boolean, index?: number }) => {
        const summary = (
            <div className="flex flex-1 items-center justify-between">
                <h2 className="font-bold text-4xl">Formation{index !== undefined ? ` #${index + 1}` : ''} <span className="text-3xl font-normal text-muted-foreground">({formation.memberCount} members)</span></h2>
                <span className="text-3xl font-normal text-muted-foreground font-mono ml-4">{formation.totalMonthlySalary.toLocaleString()} sp / month</span>
            </div>
        );

        const content = (
          <div className="space-y-4">
            <Table>
                <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                <TableBody>
                    <MemberRow member={formation.leader} />
                    <MemberRow member={formation.second} />
                    <MemberRow member={formation.third} />
                    <MemberRow member={formation.liason} />
                    <MemberRow member={formation.staffCoordinator} />
                </TableBody>
            </Table>
            
            <Accordion type="multiple" className="space-y-2 !mt-4">
                {formation.specialistUnits.map((unit, i) => <RenderSpecialistUnit key={unit.leader.id} unit={unit} index={i} titlePrefix="Formation Specialist Unit" />)}
            </Accordion>

            <Accordion type="multiple" className="space-y-4 !mt-4">
                {formation.detachments.map((detachment, i) => <RenderDetachment key={detachment.leader.id} detachment={detachment} index={i}/>)}
            </Accordion>
          </div>
        );
        
        if (isTopLevel) {
            return (
                <div className="mt-6 space-y-4">
                    <h2 className="font-bold text-5xl">Generated Formation <span className="text-4xl font-normal text-muted-foreground">({formation.memberCount} total members)</span></h2>
                    {content}
                    <div className="mt-4 text-right font-bold text-3xl">
                        Total Formation Monthly Salary: {formation.totalMonthlySalary.toLocaleString()} sp
                    </div>
                </div>
            );
        }
        
        return (
            <AccordionItem value={`formation-${formation.leader.id}`} className="bg-gray-50/25 rounded-md border">
                <AccordionTrigger className="p-4 text-left hover:no-underline">{summary}</AccordionTrigger>
                <AccordionContent className="p-4 pt-0">{content}</AccordionContent>
            </AccordionItem>
        )
    };
    
    const RenderDivision = ({ division }: { division: Division }) => {
        const liaisonStaffSalary = division.liaisonStaff.reduce((sum, s) => sum + (s.salary?.monthlySalary ?? 0), 0);
        return (
            <div className="mt-6 space-y-4">
                <h2 className="font-bold text-5xl">Generated Division <span className="text-4xl font-normal text-muted-foreground">({division.memberCount} total members)</span></h2>
                <Table>
                    <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <MemberRow member={division.leader} />
                        <MemberRow member={division.second} />
                        <MemberRow member={division.third} />
                    </TableBody>
                </Table>
                
                <Accordion type="single" collapsible className="w-full !mt-4">
                     <AccordionItem value={`division-liaison-staff-${division.leader.id}`} className="bg-gray-100/75 rounded-md border">
                        <AccordionTrigger className="p-4 text-left hover:no-underline">
                            <div className="flex flex-1 items-center justify-between">
                                <h5 className="font-semibold text-lg">Division Liaison Staff ({division.liaisonStaff.length + 1} members)</h5>
                                <span className="text-sm text-muted-foreground font-mono ml-4">{(liaisonStaffSalary + (division.liaisonLeader.salary?.monthlySalary ?? 0)).toLocaleString()} sp / month</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <Table>
                                <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <MemberRow member={division.liaisonLeader} />
                                    {division.liaisonStaff.map(s => <MemberRow key={s.id} member={s} />)}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                     </AccordionItem>
                </Accordion>
    
                <Accordion type="multiple" className="space-y-4 !mt-4">
                    {division.formations.map((formation, i) => <RenderFormation key={formation.leader.id} formation={formation} index={i}/>)}
                </Accordion>
                <div className="mt-4 text-right font-bold text-3xl">
                    Total Division Monthly Salary: {division.totalMonthlySalary.toLocaleString()} sp
                </div>
            </div>
        );
    };


    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <Label>Unit Size</Label>
                    <Select value={unitSize} onValueChange={handleUnitSizeChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Band">Band</SelectItem>
                            <SelectItem value="Squad">Squad</SelectItem>
                            <SelectItem value="Group">Group</SelectItem>
                            <SelectItem value="Company">Company</SelectItem>
                            <SelectItem value="Detachment">Detachment</SelectItem>
                            <SelectItem value="Formation">Formation</SelectItem>
                            <SelectItem value="Division">Division</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Leader Rank (1-10)</Label>
                    <Input type="number" min={MIN_RANKS[unitSize]} max="10" value={leaderRank} onChange={(e) => setLeaderRank(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} />
                </div>
                <div className="space-y-2">
                    <Label>Primary Trade</Label>
                    <Select value={trade} onValueChange={setTrade}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{trades.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <Button onClick={handleGenerate}>Generate Unit</Button>

            <div className="mt-6">
                {generatedDivision && <RenderDivision division={generatedDivision} />}
                {generatedFormation && <RenderFormation formation={generatedFormation} isTopLevel={unitSize === 'Formation'}/>}
                {generatedDetachment && <RenderDetachment detachment={generatedDetachment} isTopLevel={unitSize === 'Detachment'} />}
                {generatedCompany && <RenderCompany company={generatedCompany} isTopLevel={unitSize === 'Company'} />}
                {generatedGroup && <RenderGroup group={generatedGroup} isTopLevel={unitSize === 'Group'} />}
                {generatedSquad && <RenderSquad squad={generatedSquad} isTopLevel={unitSize === 'Squad'} />}
                {generatedBand && <RenderBand band={generatedBand} isTopLevel={unitSize === 'Band'} />}
            </div>
        </div>
    );
};

const ScalarIndexTester = () => {
    const [indexInput, setIndexInput] = useState<string>('0');
    const [scalarResult, setScalarResult] = useState<number | null>(null);

    const [scalarInput, setScalarInput] = useState<string>('10');
    const [indexResult, setIndexResult] = useState<number | null>(null);

    const handleGetScalar = () => {
        const index = parseInt(indexInput, 10);
        if (!isNaN(index)) {
            const result = getScalar(index);
            setScalarResult(Math.round(result));
        } else {
            setScalarResult(null);
        }
    };

    const handleGetIndex = () => {
        const scalar = parseInt(scalarInput, 10);
        if (!isNaN(scalar)) {
            const result = getIndex(scalar);
            setIndexResult(Math.round(result));
        } else {
            setIndexResult(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 p-4 border rounded-md">
                <h3 className="font-semibold">getScalar (Index to Scalar)</h3>
                <p className="text-sm text-muted-foreground">Enter an Index to see the corresponding rounded Scalar value.</p>
                <div className="flex items-center gap-4">
                    <Input
                        type="number"
                        step="1"
                        value={indexInput}
                        onChange={(e) => setIndexInput(e.target.value)}
                        placeholder="Enter Index"
                        className="w-32"
                    />
                    <Button onClick={handleGetScalar}>Get Scalar</Button>
                </div>
                {scalarResult !== null && (
                    <div className="mt-2 p-2 border rounded-md bg-gray-50 font-mono text-sm">
                        <p>Scalar: <span className="font-bold text-primary">{scalarResult}</span></p>
                    </div>
                )}
            </div>
            <div className="space-y-4 p-4 border rounded-md">
                 <h3 className="font-semibold">getIndex (Scalar to Index)</h3>
                 <p className="text-sm text-muted-foreground">Enter a Scalar value to see the closest corresponding Index.</p>
                <div className="flex items-center gap-4">
                    <Input
                        type="number"
                        step="1"
                        value={scalarInput}
                        onChange={(e) => setScalarInput(e.target.value)}
                        placeholder="Enter Scalar"
                        className="w-32"
                    />
                    <Button onClick={handleGetIndex}>Get Index</Button>
                </div>
                {indexResult !== null && (
                    <div className="mt-2 p-2 border rounded-md bg-gray-50 font-mono text-sm">
                        <p>Index: <span className="font-bold text-primary">{indexResult}</span></p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AttributeArrayTest = () => {
    const [rolls, setRolls] = useState<number[]>([]);

    const handleRoll = () => {
        const newRolls = Array.from({ length: 9 }, () => rollHighTwo3d6());
        setRolls(newRolls.sort((a, b) => b - a));
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Generate the Forge's current nine Attribute scores using 3D high-two for each. Results are sorted descending for inspection.
            </p>
            <Button onClick={handleRoll}>Generate Attribute Scores</Button>
            {rolls.length > 0 && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50">
                    <p className="font-semibold">
                        Generated Scores: <span className="font-mono text-primary">{rolls.join(', ')}</span>
                    </p>
                </div>
            )}
        </div>
    );
};

const HeritageGenerationTest = ({ data }: { data: StaticData }) => {
    const [results, setResults] = useState<{ culture: any; environs: any; society: any } | null>(null);
    const handleGenerate = () => {
        const pick = (kind: 'culture' | 'environs' | 'society') => {
            const choices = data.heritagePackages.filter((entry) => entry.kind === kind);
            return choices[Math.floor(Math.random() * choices.length)];
        };
        setResults({ culture: pick('culture'), environs: pick('environs'), society: pick('society') });
    };
    const HeritageResult = ({ label, value }: { label: string; value: any }) => <Card>
      <CardHeader><CardTitle>{label}: {value.name}</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p><strong>Wealth:</strong> {value.wealth} <strong>Social:</strong> {value.social}</p>
        <p><strong>Grants:</strong> {value.grants.map((grant: any) => `${grant.trait}${grant.specialization ? ` (${grant.specialization})` : ''} ${grant.level}`).join(', ')}</p>
      </CardContent>
    </Card>;
    return <div className="space-y-4"><p className="text-sm text-muted-foreground">Randomly selects one current structured Heritage package from Culture, Environs, and Society.</p><Button onClick={handleGenerate}>Generate Heritage</Button>{results && <div className="space-y-3"><HeritageResult label="Culture" value={results.culture} /><HeritageResult label="Environs" value={results.environs} /><HeritageResult label="Society" value={results.society} /></div>}</div>;
};

const ProfessionAndTitleTest = ({ data }: { data: StaticData }) => {
    const [result, setResult] = useState<{ profession: string; rank: number; title: string; namingPractice: string } | null>(null);
    const handleGenerate = () => {
        const trade = data.tradePackages[Math.floor(Math.random() * data.tradePackages.length)];
        const bridge = data.professions.find((entry) => entry.trade === trade.trade);
        const rank = Math.floor(Math.random() * 10) + 1;
        const namingPractice = bridge?.namingPractice ?? 'Generic';
        const titleRow = data.namingPracticeTitles.find((entry) => entry.Rank === String(rank));
        const title = titleRow ? (titleRow as any)[namingPractice] || '-' : '-';
        setResult({ profession: trade.trade, rank, title, namingPractice });
    };
    return <div className="space-y-4"><p className="text-sm text-muted-foreground">Generates from the current selectable Trade packages, then uses the compatibility naming-practice table for the title.</p><Button onClick={handleGenerate}>Generate Profession & Title</Button>{result && <div className="rounded-md border bg-gray-50 p-4"><p><strong>Profession:</strong> {result.profession}</p><p><strong>Trade Rank:</strong> {result.rank}</p><p><strong>Naming Practice:</strong> {result.namingPractice}</p><p><strong>Title:</strong> {result.title}</p></div>}</div>;
};

const SettlementGenerationTest = ({ data }: { data: StaticData }) => {
    const [result, setResult] = useState<{ empire: string; settlement: string } | null>(null);

    const handleGenerate = () => {
        const empires = data.empires;
        const empire = empires[Math.floor(Math.random() * empires.length)];
        const settlement = weightedSettlementPick(empire.name, data);

        setResult({
            empire: `${empire.region} / ${empire.name}`,
            settlement: settlement ? `${settlement.displayName}${settlement.workingGloss ? ` (${settlement.workingGloss})` : ''}` : 'None'
        });
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Randomly selects a political region, then uses the region's configured origin weights. Detailed locales such as Corom are population-weighted; legacy regions retain their original catalogue weights.
            </p>
            <Button onClick={handleGenerate}>Generate Settlement</Button>
            {result && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50">
                    <p><strong>Empire:</strong> {result.empire}</p>
                    <p><strong>Settlement:</strong> {result.settlement}</p>
                </div>
            )}
        </div>
    );
};

const SimpleDisplayCardTest = ({ title, data }: { title: string, data: any[] }) => {
    if (!data || data.length === 0) {
        return <div>No data for {title}</div>;
    }
    return (
    <div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <Table>
            <TableHeader>
                <TableRow>
                    {Object.keys(data[0]).map(key => <TableHead key={key}>{key}</TableHead>)}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((row, i) => (
                    <TableRow key={i}>
                        {Object.values(row).map((val: any, j: number) => <TableCell key={j}>{Array.isArray(val) ? val.join(', ') : val}</TableCell>)}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
    )
};

export default function LegacyDeveloperTools({ data }: { data: StaticData }) {
  const sectionValues = useMemo(() => Object.fromEntries(TEST_SECTION_TITLES.map((title) => [title, title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')])), []);
  const [openSections, setOpenSections] = useState<string[]>([sectionValues['Military Unit Generator']]);
  const selectSection = (title: string) => {
    const value = sectionValues[title];
    if (!value) return;
    setOpenSections((current) => current.includes(value) ? current : [...current, value]);
    window.requestAnimationFrame(() => document.getElementById(`developer-tool-${value}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const Suite = ({ title, children }: { title: string; children: React.ReactNode }) => {
    const value = sectionValues[title];
    return <div id={`developer-tool-${value}`} className="scroll-mt-20"><TestSuite title={title} value={value}>{children}</TestSuite></div>;
  };

  return <ContextualSectionNavigation title="Developer Tools" label="developer tool" items={TEST_SECTION_TITLES} icon={ListChecks} onSelect={selectSection}>
    <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-3">
      <Suite title="Military Unit Generator"><MilitaryUnitGeneratorTest data={data} /></Suite>
      <Suite title="Salary / Contractor Planner"><SalaryExpectationsTest data={data} /></Suite>
      <Suite title="Candidacy Expression Evaluator"><CandidacyEvaluatorTest /></Suite>
      <Suite title="Candidacy Simulation"><CandidacySimulationTest data={data} /></Suite>
      <Suite title="Salary Calculation"><SalaryCalculationTest data={data} /></Suite>
      <Suite title="Heritage Generator"><HeritageGenerationTest data={data} /></Suite>
      <Suite title="Profession & Title Generator"><ProfessionAndTitleTest data={data} /></Suite>
      <Suite title="Settlement Generator"><SettlementGenerationTest data={data} /></Suite>
      <Suite title="Number Suffix Formatting"><NumberSuffixFormattingTest /></Suite>
      <Suite title="ND6 Function"><ND6Test /></Suite>
      <Suite title="Attribute Array Generation"><AttributeArrayTest /></Suite>
      <Suite title="Simple Data Tables"><SimpleDataTablesTest data={data} /></Suite>
      <Suite title="Dice Roller"><DiceRollerDemo /></Suite>
      <Suite title="isDisability"><DisabilityFunctionTest /></Suite>
      <Suite title="Talent Parser"><TalentParserTest /></Suite>
      <Suite title="Age Rank Value"><AgeRankValueTest /></Suite>
      <Suite title="Age Rank / Group Converters"><AgeRankGroupTest data={data} /></Suite>
      <Suite title="Maturity Parser"><MaturityParserTest data={data} /></Suite>
      <Suite title="Maturity Difference"><MaturityDifferenceTest /></Suite>
      <Suite title="Adjust Talent by Maturity"><AdjustTalentMaturityTest /></Suite>
      <Suite title="Skillpoint Cost Calculations"><SkillpointCostTest data={data} /></Suite>
      <Suite title="Age Generator"><div className="space-y-3"><AgeGenerationTest species="Alef" ageGroup="Young Adult" data={data} expectedRange="24-35" /><AgeGenerationTest species="Drauf" ageGroup="Child" data={data} expectedRange="6-11" /></div></Suite>
      <Suite title="D66 Lookup Tools"><D66LookupTest title="Age Groups" tableData={data.ageGroups} /><D66AndD6LookupTest title="Descriptors" tableData={data.descriptors} /><D66LookupTest title="Disabilities" tableData={data.disabilities} /><D66AndD6LookupTest title="Physical Blemishes" tableData={data.physicalBlemishes} /><D66LookupTest title="Notable Features" tableData={data.notableFeatures} /></Suite>
      <Suite title="Scalar / Index Calculator"><ScalarIndexTester /></Suite>
      <Suite title="Tragedy Seed Generator"><TragedySeedTest data={data} /></Suite>
    </Accordion>
  </ContextualSectionNavigation>;
}
