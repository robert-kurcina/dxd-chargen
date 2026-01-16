'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { D66, d66Lookup, parseTalent } from '@/lib/dice';
import type { StaticData } from '@/data';

export default function Tests({ data }: { data: StaticData }) {
  const [d66Roll, setD66Roll] = useState<number | null>(null);
  const [ageGroup, setAgeGroup] = useState<any | null>(null);

  const handleRoll = () => {
    const roll = D66();
    setD66Roll(roll);
    const foundAgeGroup = d66Lookup(roll, data.ageGroups);
    setAgeGroup(foundAgeGroup);
  };

  const talentString1 = '***Foo 5';
  const parsedTalent1 = parseTalent(talentString1);

  const talentString2 = '*Bar 3 > Baz';
  const parsedTalent2 = parseTalent(talentString2);

  return (
    <div className="space-y-8 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Dice Roller Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Talent Parser Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Demonstrating how the `parseTalent` function handles a complex talent string.
          </p>
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
        </CardContent>
      </Card>
    </div>
  );
}
