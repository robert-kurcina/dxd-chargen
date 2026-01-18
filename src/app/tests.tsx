

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/ui/icons';
import { v4 as uuidv4 } from 'uuid';
import { 
  ND6,
  D66, 
  d66Lookup, 
  d66ColumnLookup,
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
  type Contractor,
  type Band,
  type Squad,
  type Group,
  type Company,
} from '@/lib/character-logic';
import type { StaticData } from '@/data';
import { cn } from '@/lib/utils';
import { parseNumberWithSuffix, formatNumberWithSuffix } from '@/lib/utils';
import { calculateCandidacyProbability } from '@/lib/probability';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    <Card>
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
    candidacy: string;
    namingPractice: string;
    specializations: string[];
    likelihood: number;
    relativeShare: number;
}

const CandidacySimulationTest = ({ professions }: { professions: StaticData['professions'] }) => {
    const [results, setResults] = useState<ProfessionResult[] | null>(null);
    const [calculating, setCalculating] = useState(false);

    const calculateProbabilities = () => {
        setCalculating(true);
        // Use a timeout to prevent blocking the UI thread on a long-running task
        setTimeout(() => {
            const professionProbs = professions.map(prof => {
                const prob = calculateCandidacyProbability(prof.candidacy);
                return { ...prof, prob };
            });

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
              This test calculates the probability of a character qualifying for each trade based on 2D6 attribute rolls.
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
        const prob = calculateCandidacyProbability(expression);
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
              Enter a candidacy expression to see its likelihood of success out of 1000.
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
        { trade: 'Academic', rank: 4, expected: { wr: 5, daily: 30, monthly: 900 } },
        { trade: 'Academic', rank: 8, expected: { wr: 22, daily: 1500, monthly: 45000 } },
        { trade: 'Knight', rank: 1, expected: { wr: -7, daily: 2, monthly: 60 } },
        { trade: 'Knight', rank: 4, expected: { wr: 8, daily: 60, monthly: 1800 } },
        { trade: 'Knight', rank: 8, expected: { wr: 23, daily: 2000, monthly: 60000 } },
        { trade: 'Service', rank: 1, expected: { wr: -13, daily: 0.5, monthly: 15 } },
        { trade: 'Service', rank: 4, expected: { wr: 3, daily: 20, monthly: 600 } },
        { trade: 'Service', rank: 8, expected: { wr: 19, daily: 800, monthly: 24000 } },
    ];

    return (
        <div className="space-y-2">
            <p className="text-sm text-muted-foreground -mb-2">
              Tests the `calculateSalary` function for various combinations of Trade and Trade Rank.
            </p>
            {tests.map((test, i) => {
                const result = calculateSalary(test.trade, test.rank, data);
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

const SalaryExpectationsTest = ({ data }: { data: StaticData }) => {
  // States for single contractor
  const [singleTrade, setSingleTrade] = useState<string | undefined>(undefined);
  const [singleRank, setSingleRank] = useState<number | undefined>(undefined);
  const [contractor, setContractor] = useState<ReturnType<typeof generateContractor>>(null);

  // States for squad
  const [squadTrade, setSquadTrade] = useState<string>('Any');
  const [numMembers, setNumMembers] = useState<number | undefined>(undefined);
  const [avgRank, setAvgRank] = useState<number | undefined>(undefined);
  const [squad, setSquad] = useState<Array<ReturnType<typeof generateContractor>> | null>(null);

  const handleGenerateContractor = () => {
    const result = generateContractor(data, singleTrade, singleRank);
    setContractor(result);
  };
  
  const handleGenerateSquad = () => {
    const result = generateSquad(data, squadTrade, numMembers, avgRank);
    setSquad(result);
  };
  
  const trades = ['Any', ...data.professions.filter(p => p.trade !== 'Rabble').map(p => p.trade)];

  const sortedSquad = squad ? [...squad].sort((a, b) => (b?.tradeRank || 0) - (a?.tradeRank || 0)) : null;
  
  const totalMonthlySalary = sortedSquad?.reduce((sum, member) => sum + (member?.salary?.monthlySalary || 0), 0) ?? 0;
  const totalQuarterlySalary = totalMonthlySalary * 3;
  const totalYearlySalary = totalMonthlySalary * 12;

  return (
    <div className="space-y-8">
      {/* Single Contractor Generator */}
      <div className="space-y-4 p-4 border rounded-md">
        <h3 className="font-semibold">Contractor Generator</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Trade (Optional)</Label>
            <Select onValueChange={(val) => setSingleTrade(val === 'Any' ? undefined : val)}>
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
            <Label>Trade Rank (1-10, Optional)</Label>
            <Input type="number" min="1" max="10" placeholder="Random" onChange={(e) => setSingleRank(e.target.value ? parseInt(e.target.value) : undefined)} />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Trade</Label>
            <Select value={squadTrade} onValueChange={setSquadTrade}>
              <SelectTrigger>
                <SelectValue placeholder="Select Trade" />
              </SelectTrigger>
              <SelectContent>
                {trades.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Number of Members (Optional)</Label>
            <Input type="number" min="1" placeholder="Random (1D6)" onChange={(e) => setNumMembers(e.target.value ? parseInt(e.target.value) : undefined)} />
          </div>
          <div className="space-y-2">
            <Label>Average Rank (Optional)</Label>
            <Input type="number" min="1" max="10" placeholder="Random (1D6)" onChange={(e) => setAvgRank(e.target.value ? parseInt(e.target.value) : undefined)} />
          </div>
        </div>
        <Button onClick={handleGenerateSquad}>Generate Squad</Button>
        {sortedSquad && sortedSquad.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Generated Squad Summary</h4>
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
                      <TableCell>#{index + 1}</TableCell>
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
    </div>
  );
};

const MilitaryUnitGeneratorTest = ({ data }: { data: StaticData }) => {
    const MIN_RANKS: { [key: string]: number } = { Band: 1, Squad: 3, Group: 4, Company: 5 };
    const [unitSize, setUnitSize] = useState('Band');
    const [leaderRank, setLeaderRank] = useState(MIN_RANKS[unitSize]);
    const [trade, setTrade] = useState('Warrior');
    
    const [generatedCompany, setGeneratedCompany] = useState<Company | null>(null);
    const [generatedGroup, setGeneratedGroup] = useState<Group | null>(null);
    const [generatedSquad, setGeneratedSquad] = useState<Squad | null>(null);
    const [generatedBand, setGeneratedBand] = useState<Band | null>(null);

    const trades = ['Any', ...data.professions.filter(p => p.trade !== 'Rabble').map(p => p.trade)];
    
    const handleUnitSizeChange = (newSize: string) => {
        setUnitSize(newSize);
        const minRank = MIN_RANKS[newSize];
        if (leaderRank < minRank) {
            setLeaderRank(minRank);
        }
    }

    const handleGenerate = () => {
        setGeneratedCompany(null);
        setGeneratedGroup(null);
        setGeneratedSquad(null);
        setGeneratedBand(null);

        const rank = Math.max(MIN_RANKS[unitSize], leaderRank);

        if (unitSize === 'Company') {
            setGeneratedCompany(generateCompany(data, rank, trade));
        } else if (unitSize === 'Group') {
            setGeneratedGroup(generateGroup(data, rank, trade));
        } else if (unitSize === 'Squad') {
            setGeneratedSquad(generateSquad(data, rank, trade));
        } else {
            setGeneratedBand(generateBand(data, rank, trade));
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
                        {group.specialists.map(s => <MemberRow key={s.id} member={s} />)}
                    </TableBody>
                </Table>
                <Accordion type="multiple" className="space-y-4">
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
    
    const RenderCompany = ({ company }: { company: Company }) => {
        const specialistSalary = company.specialists.reduce((sum, s) => sum + (s.salary?.monthlySalary ?? 0), 0);
        return (
            <div className="mt-6 space-y-4">
                <h2 className="font-bold text-3xl">Generated Company <span className="text-2xl font-normal text-muted-foreground">({company.memberCount} total members)</span></h2>
                 <Table>
                    <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Trade</TableHead><TableHead>Rank / Title</TableHead><TableHead className="text-right">Monthly Salary</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <MemberRow member={company.leader} />
                        <MemberRow member={company.secondary} />
                    </TableBody>
                </Table>

                {company.specialists.length > 0 && (
                    <Accordion type="single" collapsible className="w-full mt-4">
                        <AccordionItem value="company-specialists" className="bg-gray-50/50 rounded-md border">
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
                                        {company.specialists.map(s => <MemberRow key={s.id} member={s} />)}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}


                <Accordion type="multiple" className="space-y-4 !mt-4">
                    {company.groups.map((group, i) => <RenderGroup key={group.leader.id} group={group} index={i}/>)}
                </Accordion>
                <div className="mt-4 text-right font-bold text-xl">
                    Total Company Monthly Salary: {company.totalMonthlySalary.toLocaleString()} sp
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
                {generatedCompany && <RenderCompany company={generatedCompany} />}
                {generatedGroup && <RenderGroup group={generatedGroup} isTopLevel={unitSize === 'Group'} />}
                {generatedSquad && <RenderSquad squad={generatedSquad} isTopLevel={unitSize === 'Squad'} />}
                {generatedBand && <RenderBand band={generatedBand} isTopLevel={unitSize === 'Band'} />}
            </div>
        </div>
    );
};


export default function Tests({ data }: { data: StaticData }) {
  const [d66Roll, setD66Roll] = useState<number | null>(null);
  const [ageGroup, setAgeGroup] = useState<any | null>(null);

  const handleRoll = () => {
    const roll = D66();
    setD66Roll(roll);
    const foundAgeGroup = d66Lookup(roll, data.ageGroups);
    setAgeGroup(foundAgeGroup);
  };
  
  // Test data for talent parsing
  const talentString1 = '***Foo 5';
  const parsedTalent1 = parseTalent(talentString1);
  const talentString2 = '*Bar 3 > Baz';
  const parsedTalent2 = parseTalent(talentString2);

  // Test data for isDisability
  const isDisabilityTests = [
    { input: '[Coward X]', expected: true },
    { input: 'Brawn 2', expected: false },
    { input: ' [Zucked] ', expected: true },
    { input: 'No Brackets', expected: false },
  ];

  // Test data for getAgeRankValue
  const getAgeRankValueTests = [
      { input: 'A', expected: -1 },
      { input: 'C', expected: -3 },
      { input: '5', expected: 5 },
      { input: '0', expected: 0 },
      { input: undefined, expected: 0 },
      { input: null, expected: 0 },
  ];

  // Test data for getAgeRank and getAgeGroup
  const ageRankGroupTests = [
    { func: 'getAgeRank', input: 'Early Teen', expected: '1' },
    { func: 'getAgeRank', input: 'Venerable', expected: '9' },
    { func: 'getAgeGroup', input: 5, expected: 'Mature' },
    { func: 'getAgeGroup', input: 'A', expected: 'Child' },
  ];
  
  // Test data for parseMaturityString
  const parseMaturityStringTests = [
      { input: 'Youth[0] or Genera[4]', expected: { ageRank: 0, professionRank: 4 } },
      { input: 'Elder', expected: { ageRank: 7, professionRank: 0 } },
      { input: 'Major', expected: { ageRank: 0, professionRank: 6 } },
      { input: 'Youth or Major[6]', expected: { ageRank: 0, professionRank: 6 } },
      { input: '', expected: { ageRank: 0, professionRank: 0 } },
      { input: 'Teenager[2]', expected: { ageRank: 2, professionRank: 0 } },
      { input: 'Elder[3]', expected: { ageRank: 3, professionRank: 0 } }, // "Elder" is Age Group, so it should take precedence
  ];
  
  // Test data for calculateMaturityDifference
  const calculateMaturityDifferenceTests = [
      { char: { ageRank: 7, professionRank: 4 }, talent: { ageRank: 0, professionRank: 4 }, expected: 7 },
      { char: { ageRank: 2, professionRank: 1 }, talent: { ageRank: 3, professionRank: 5 }, expected: -1 }, // Should be max of (2-3=-1) and (1-5=-4) -> -1
      { char: { ageRank: 5, professionRank: 5 }, talent: { ageRank: 5, professionRank: 5 }, expected: 0 },
  ];
  
  // Test data for adjustTalentByMaturity
  const adjustTalentByMaturityTests = [
      { talent: '***Foo 5', diff: 4, expected: 'Foo 5' },
      { talent: '***Foo 5', diff: 1, expected: 'Foo 2' },
      { talent: '***Foo 5', diff: -1, expected: 'Foo' },
      { talent: '***Foo 5', diff: -3, expected: '' },
      { talent: 'Bar 2', diff: 3, expected: 'Bar 2' },
      { talent: 'Baz', diff: -2, expected: '' },
      { talent: '[Zucked]', diff: 2, expected: '[Zucked]' },
      { talent: '**Bar > Baz', diff: 1, expected: '' },
  ];

  // Test data for skillpoint cost calculation
  const attributeCostTests = [
      { change: "+3 CCA", expected: 15 },
      { change: "-2 INT", expected: -14 },
      { change: "+2 SIZ, -1 ZED", expected: 5 },
  ];

  const bonusCostTests = [
    { notableFeature: 'Very Strong', bonus: "+1 Brawn", expected: 2},
    { notableFeature: 'Seen Things', bonus: "+1 Grit, +1 Medic", expected: 5},
    { notableFeature: 'Natural Climber', bonus: "+2 Climb", expected: 2},
  ]

  // Test data for number formatting
  const formatNumberTests = [
    { input: 10, expected: "10" },
    { input: 10000, expected: "10 K" },
    { input: 10000000, expected: "10 M" },
    { input: 12345, expected: "12.345 K" },
    { input: 12345678, expected: "12.345678 M" },
    { input: 999, expected: "999" },
    { input: "1,234,567", expected: "1.234567 M" },
    { input: -5000, expected: "-5 K" },
  ];

  const parseNumberTests = [
    { input: "10", expected: 10 },
    { input: "10 K", expected: 10000 },
    { input: "10 M", expected: 10000000 },
    { input: "12.345 K", expected: 12345 },
    { input: "12.345678 M", expected: 12345678 },
    { input: "999", expected: 999 },
    { input: "-5 k", expected: -5000 },
  ];

  // Test data for getScalar
  const getScalarTests = [
      { index: 0, expected: 10 },
      { index: 9, expected: 80 },
      { index: 10, expected: 100 },
      { index: 20, expected: 1000 },
      { index: 30, expected: 10000 },
      { index: -1, expected: 8 },
      { index: -10, expected: 1 },
      { index: -11, expected: 0.8 },
      { index: -20, expected: 0.1 },
      { index: 59, expected: 8000000 },
  ];

  return (
    <Accordion type="multiple" defaultValue={['military-unit-generator']} className="space-y-8 mt-4 max-w-[960px] mx-auto">
       <TestSuite title="Military Unit Generator" value="military-unit-generator">
        <MilitaryUnitGeneratorTest data={data} />
      </TestSuite>
      
      <TestSuite title="Salary Expectations" value="salary-expectations">
        <SalaryExpectationsTest data={data} />
      </TestSuite>

      <TestSuite title="Candidacy Expression Evaluator" value="candidacy-evaluator">
        <CandidacyEvaluatorTest />
      </TestSuite>

      <TestSuite title="Candidacy Simulation" value="candidacy-simulation">
        <CandidacySimulationTest professions={data.professions} />
      </TestSuite>

      <TestSuite title="Salary Calculation" value="salary-calculation-tests">
        <SalaryCalculationTest data={data} />
      </TestSuite>

      <TestSuite title="Number Suffix Formatting Tests" value="number-suffix-tests">
        <p className="text-sm text-muted-foreground p-4 -mb-4">
            Tests for formatting and parsing numbers with K/M suffixes.
        </p>
        {formatNumberTests.map((test, i) => {
            const result = formatNumberWithSuffix(test.input);
            const pass = result === test.expected;
            return <TestCase key={`format-${i}`} title={`formatNumberWithSuffix(${JSON.stringify(test.input)})`} result={result} expected={test.expected} pass={pass} />;
        })}
        {parseNumberTests.map((test, i) => {
            const result = parseNumberWithSuffix(test.input);
            const pass = result === test.expected;
            return <TestCase key={`parse-${i}`} title={`parseNumberWithSuffix("${test.input}")`} result={result} expected={test.expected} pass={pass} />;
        })}
      </TestSuite>

      <TestSuite title="ND6 Function Tests" value="nd6-tests">
        <ND6Test />
      </TestSuite>

      <TestSuite title="Dice Roller Demo" value="dice-roller-demo">
          <p className="text-sm text-muted-foreground">
            Click the button to roll a D66 and look up the corresponding age group from the data table.
          </p>
          <Button onClick={handleRoll}>Roll D66 for Age Group</Button>
          {d66Roll !== null && (
            <div className="mt-4 p-4 border rounded-md bg-gray-50">
              <p className="font-semibold">
                D66 Roll: <span className="font-mono text-primary">{d66Roll}</span>
              </p>
              {ageGroup ? (
                <div className="mt-2">
                  <p>
                    <strong>Corresponding Age Group:</strong> {ageGroup.ageGroup} (Rank: {ageGroup.rank})
                  </p>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded-md overflow-x-auto">
                    {JSON.stringify(ageGroup, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="mt-2 text-destructive">No corresponding age group found for this roll in the table.</p>
              )}
            </div>
          )}
      </TestSuite>

      <TestSuite title="isDisability Function Tests" value="is-disability-tests">
        {isDisabilityTests.map((test, i) => {
            const result = isDisability(test.input);
            const pass = result === test.expected;
            return <TestCase key={i} title={`Test ${i+1}: isDisability('${test.input}')`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>
      
      <TestSuite title="Talent Parser Demo" value="talent-parser-demo">
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <p className="font-semibold">
              Input String: <span className="font-mono text-primary">{talentString1}</span>
            </p>
            <div className="mt-2">
              <p>
                <strong>Parsed Output:</strong>
              </p>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded-md overflow-x-auto">
                {JSON.stringify(parsedTalent1, null, 2)}
              </pre>
            </div>
          </div>
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <p className="font-semibold">
              Input String: <span className="font-mono text-primary">{talentString2}</span>
            </p>
            <div className="mt-2">
              <p>
                <strong>Parsed Output:</strong>
              </p>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded-md overflow-x-auto">
                {JSON.stringify(parsedTalent2, null, 2)}
              </pre>
            </div>
          </div>
      </TestSuite>

      <TestSuite title="getAgeRankValue Function Tests" value="get-age-rank-value-tests">
        {getAgeRankValueTests.map((test, i) => {
            const result = getAgeRankValue(test.input as string);
            const pass = result === test.expected;
            return <TestCase key={i} title={`Test ${i+1}: getAgeRankValue('${test.input}')`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>

      <TestSuite title="Age Rank/Group Converters" value="age-rank-group-converters">
        {ageRankGroupTests.map((test, i) => {
            const result = test.func === 'getAgeRank' ? getAgeRank(test.input as string, data.ageGroups) : getAgeGroup(test.input, data.ageGroups);
            const pass = result === test.expected;
            return <TestCase key={i} title={`Test ${i+1}: ${test.func}('${test.input}')`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>
      
      <TestSuite title="parseMaturityString Function Tests" value="parse-maturity-string-tests">
        {parseMaturityStringTests.map((test, i) => {
            const result = parseMaturityString(test.input, data);
            const pass = JSON.stringify(result) === JSON.stringify(test.expected);
            return <TestCase key={i} title={`Test ${i+1}: parseMaturityString('${test.input}')`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>
      
      <TestSuite title="calculateMaturityDifference Function Tests" value="calculate-maturity-difference-tests">
        {calculateMaturityDifferenceTests.map((test, i) => {
            const result = calculateMaturityDifference(test.char, test.talent);
            const pass = result === test.expected;
            return <TestCase key={i} title={`Test ${i+1}: Difference between char ${JSON.stringify(test.char)} and talent ${JSON.stringify(test.talent)}`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>
      
      <TestSuite title="adjustTalentByMaturity Function Tests" value="adjust-talent-by-maturity-tests">
        {adjustTalentByMaturityTests.map((test, i) => {
            const result = adjustTalentByMaturity(test.talent, test.diff);
            const pass = result === test.expected;
            return <TestCase key={i} title={`Test ${i+1}: adjustTalentByMaturity('${test.talent}', ${test.diff})`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>

      <TestSuite title="Skillpoint Cost Calculation Tests" value="skillpoint-cost-tests">
          <p className="text-sm text-muted-foreground p-4 -mb-4">
              Tests the calculation of skillpoint costs for various changes.
          </p>
          {attributeCostTests.map((test, i) => {
              const totalCost = calculateAttributeSkillpointCost(test.change, data);
              const pass = totalCost === test.expected;
              return <TestCase key={i} title={`Attribute Cost of ${test.change}`} result={totalCost} expected={test.expected} pass={pass} />;
          })}
          {bonusCostTests.map((test, i) => {
              const totalCost = calculateBonusSkillpointCost(test.bonus, data);
              const pass = totalCost === test.expected;
              return <TestCase key={i} title={`Bonus Cost for '${test.notableFeature}' (${test.bonus})`} result={totalCost} expected={test.expected} pass={pass} />;
          })}
      </TestSuite>
      
      <TestSuite title="Age Generation Tests" value="age-generation-tests">
        <p className="text-sm text-muted-foreground p-4 -mb-4">
          Click the buttons to generate a random age within the expected range for the given species and age group.
        </p>
        <AgeGenerationTest species="Alef" ageGroup="Young Adult" data={data} expectedRange="24-35" />
        <AgeGenerationTest species="Drauf" ageGroup="Child" data={data} expectedRange="6-11" />
        <AgeGenerationTest species="Stonefolk" ageGroup="Venerable" data={data} expectedRange="400-449" />
        <AgeGenerationTest species="Cherigili" ageGroup="Venerable" data={data} expectedRange="80-84" />
      </TestSuite>

      <TestSuite title="D66 Lookup Tests" value="d66-lookup-tests">
        <D66LookupTest title="Age Groups" tableData={data.ageGroups} />
        <D66AndD6LookupTest title="Descriptors" tableData={data.descriptors} />
        <D66LookupTest title="Disabilities" tableData={data.disabilities} />
        <D66AndD6LookupTest title="Physical Blemishes" tableData={data.physicalBlemishes} />
        <D66LookupTest title="Notable Features" tableData={data.notableFeatures} />
      </TestSuite>

      <TestSuite title="getScalar & getIndex Function Tests" value="get-scalar-get-index-tests">
          <p className="text-sm text-muted-foreground p-4 -mb-4">
              Tests the calculation of scalar values from an index and its inverse function, which finds the nearest index for a given scalar on a logarithmic scale.
          </p>
          <h3 className="font-semibold px-2 pt-2">getScalar (Index to Scalar)</h3>
          {getScalarTests.map((test, i) => {
              const result = getScalar(test.index);
              const pass = result === test.expected;
              return <TestCase key={`scalar-${i}`} title={`getScalar(${test.index})`} result={result} expected={test.expected} pass={pass} />;
          })}
          <h3 className="font-semibold px-2 pt-4">getIndex (Scalar to Index)</h3>
          {getScalarTests.map((test, i) => {
              const scalar = test.expected;
              const result = getIndex(scalar);
              const pass = result === test.index;
              return <TestCase key={`index-roundtrip-${i}`} title={`getIndex(${scalar})`} result={result} expected={test.index} pass={pass} />;
          })}
          <TestCase title="getIndex(110)" result={getIndex(110)} expected={11} pass={getIndex(110) === 11} />
          <TestCase title="getIndex(99)" result={getIndex(99)} expected={10} pass={getIndex(99) === 10} />
          <TestCase title="getIndex(89)" result={getIndex(89)} expected={9} pass={getIndex(89) === 9} />
          <TestCase title="getIndex(0.11)" result={getIndex(0.11)} expected={-19} pass={getIndex(0.11) === -19} />
          <TestCase title="getIndex(9500)" result={getIndex(9500)} expected={30} pass={getIndex(9500) === 30} />
      </TestSuite>

      <TestSuite title="Tragedy Seed Tests" value="tragedy-seed-tests">
          <TragedySeedTest data={data} />
      </TestSuite>
    </Accordion>
  );
}

    
