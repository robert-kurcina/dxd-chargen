'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  D66, 
  d66Lookup, 
  parseTalent,
  isDisability,
  getAgeRankValue,
  getAgeRank,
  getAgeGroup,
  parseMaturityString,
  calculateMaturityDifference,
  adjustTalentByMaturity
} from '@/lib/dice';
import type { StaticData } from '@/data';
import { cn } from '@/lib/utils';

// Component to display a test case
const TestCase = ({ title, result, expected, pass }: { title: string, result: any, expected: any, pass: boolean }) => (
  <div className="p-2 border-l-4" style={{ borderColor: pass ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))' }}>
    <p className="font-semibold text-sm">{title}</p>
    <p className="font-mono text-xs">Result: {JSON.stringify(result)}</p>
    <p className="font-mono text-xs">Expected: {JSON.stringify(expected)}</p>
  </div>
);

// Component for a group of tests
const TestSuite = ({ title, children } : { title: string, children: React.ReactNode }) => (
    <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
        </CardContent>
      </Card>
)

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
  ];
  
  // Test data for calculateMaturityDifference
  const calculateMaturityDifferenceTests = [
      { char: { ageRank: 7, professionRank: 4 }, talent: { ageRank: 0, professionRank: 4 }, expected: 7 },
      { char: { ageRank: 2, professionRank: 1 }, talent: { ageRank: 3, professionRank: 5 }, expected: -1 },
      { char: { ageRank: 5, professionRank: 5 }, talent: { ageRank: 5, professionRank: 5 }, expected: 0 },
  ];
  
  // Test data for adjustTalentByMaturity
  const adjustTalentByMaturityTests = [
      { talent: '***Foo 5', diff: 4, expected: 'Foo 5' },
      { talent: '***Foo 5', diff: 1, expected: 'Foo 3' },
      { talent: '***Foo 5', diff: -1, expected: 'Foo' },
      { talent: '***Foo 5', diff: -3, expected: '' },
      { talent: 'Bar 2', diff: 3, expected: 'Bar 2' },
      { talent: 'Baz', diff: -2, expected: '' },
      { talent: '[Zucked]', diff: 2, expected: '[Zucked]' },
      { talent: '**Bar > Baz', diff: 1, expected: '' },
  ];


  return (
    <div className="space-y-8 mt-4">
      <TestSuite title="Dice Roller Demo">
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

      <TestSuite title="isDisability Function Tests">
        {isDisabilityTests.map((test, i) => {
            const result = isDisability(test.input);
            const pass = result === test.expected;
            return <TestCase key={i} title={`Test ${i+1}: isDisability('${test.input}')`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>
      
      <TestSuite title="Talent Parser Demo">
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

      <TestSuite title="getAgeRankValue Function Tests">
        {getAgeRankValueTests.map((test, i) => {
            const result = getAgeRankValue(test.input);
            const pass = result === test.expected;
            return <TestCase key={i} title={`Test ${i+1}: getAgeRankValue('${test.input}')`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>

      <TestSuite title="Age Rank/Group Converters">
        {ageRankGroupTests.map((test, i) => {
            const result = test.func === 'getAgeRank' ? getAgeRank(test.input as string, data.ageGroups) : getAgeGroup(test.input, data.ageGroups);
            const pass = result === test.expected;
            return <TestCase key={i} title={`Test ${i+1}: ${test.func}('${test.input}')`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>
      
      <TestSuite title="parseMaturityString Function Tests">
        {parseMaturityStringTests.map((test, i) => {
            const result = parseMaturityString(test.input, data);
            const pass = JSON.stringify(result) === JSON.stringify(test.expected);
            return <TestCase key={i} title={`Test ${i+1}: parseMaturityString('${test.input}')`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>
      
      <TestSuite title="calculateMaturityDifference Function Tests">
        {calculateMaturityDifferenceTests.map((test, i) => {
            const result = calculateMaturityDifference(test.char, test.talent);
            const pass = result === test.expected;
            return <TestCase key={i} title={`Test ${i+1}: Difference between char ${JSON.stringify(test.char)} and talent ${JSON.stringify(test.talent)}`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>
      
      <TestSuite title="adjustTalentByMaturity Function Tests">
        {adjustTalentByMaturityTests.map((test, i) => {
            const result = adjustTalentByMaturity(test.talent, test.diff);
            const pass = result === test.expected;
            return <TestCase key={i} title={`Test ${i+1}: adjustTalentByMaturity('${test.talent}', ${test.diff})`} result={result} expected={test.expected} pass={pass} />
        })}
      </TestSuite>
      
      <TestSuite title="D66 Lookup Tests">
        <D66LookupTest title="Descriptors" tableData={data.descriptors} />
        <D66LookupTest title="Disabilities" tableData={data.disabilities} />
        <D66LookupTest title="Physical Blemishes" tableData={data.physicalBlemishes} />
        <D66LookupTest title="Notable Features" tableData={data.notableFeatures} />
      </TestSuite>

    </div>
  );
}
