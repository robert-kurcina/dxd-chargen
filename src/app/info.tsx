'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Generic component for a simple table in a card
const SimpleTableCard = ({ title, data, headers }: { title: string; data: any[]; headers?: string[] }) => {
  if (!data || data.length === 0) return null;
  const tableHeaders = headers ?? Object.keys(
    data.reduce((acc, curr) => ({ ...acc, ...curr }), {})
  );

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {tableHeaders.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {tableHeaders.map((header) => (
                  <TableCell key={header}>
                    {typeof row[header] === 'boolean'
                      ? String(row[header])
                      : Array.isArray(row[header]) ? row[header].join(', ') : row[header] ?? 'N/A'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// Generic component for a list in a card
const ListCard = ({ title, data }: { title: string; data: string[] }) => {
  if (!data || data.length === 0) return null;

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-1">
          {data.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};


// Component for data that is an object of arrays, with a filter
const FilterableTableCard = ({ title, data }: { title: string; data: Record<string, any[]> }) => {
  const [selectedKey, setSelectedKey] = useState('all');
  const keys = Object.keys(data);
  const itemsToShow = selectedKey === 'all' ? keys : [selectedKey];

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Select value={selectedKey} onValueChange={setSelectedKey}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {keys.map((key) => (
              <SelectItem key={key} value={key}>{key}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {itemsToShow.map(key => {
            const tableData = data[key];
            if (!tableData || tableData.length === 0) return null;
            
            const isArrayOfPrimitives = typeof tableData[0] !== 'object';
            
            if (isArrayOfPrimitives) {
                 return (
                    <div key={key}>
                        {selectedKey === 'all' && <h4 className="font-bold text-md mb-2">{key}</h4>}
                        <p className="text-sm">{(tableData as any[]).join(', ')}</p>
                    </div>
                 )
            }
            
            const headers = Object.keys(
              (tableData as any[]).reduce((acc, curr) => ({ ...acc, ...curr }), {})
            );
            return (
              <div key={key}>
                {selectedKey === 'all' && <h4 className="font-bold text-md mb-2">{key}</h4>}
                <Table>
                    <TableHeader>
                        <TableRow>
                        {headers.map((header) => <TableHead key={header}>{header}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row: any, index: number) => (
                        <TableRow key={index}>
                            {headers.map((header) => (
                            <TableCell key={header}>
                                {Array.isArray(row[header]) ? row[header].join(', ') : row[header]}
                            </TableCell>
                            ))}
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </div>
            )
        })}
      </CardContent>
    </Card>
  )
}

// Special card for attribute definitions
const AttributeDefinitionsCard = ({ data }: { data: any[] }) => (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Attribute Definitions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((group: any) => (
          <div key={group.groupName}>
            <h4 className="font-bold text-md mb-2">{group.groupName}</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Abbreviation</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.attributes.map((attr: any) => (
                  <TableRow key={attr.abbreviation}>
                    <TableCell>{attr.name}</TableCell>
                    <TableCell>{attr.abbreviation}</TableCell>
                    <TableCell>{attr.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
);

// Special card for calculated abilities
const CalculatedAbilitiesCard = ({ data }: { data: any[] }) => (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Calculated Abilities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((group: any) => (
          <div key={group.groupName}>
            <h4 className="font-bold text-md mb-2">{group.groupName}</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.abilities.map((ability: any) => (
                  <TableRow key={ability.name}>
                    <TableCell>{ability.name}</TableCell>
                    <TableCell>{ability.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
);


// Special card for Species
const SpeciesCard = ({ data }: { data: any[] }) => (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Species</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((specie: any) => (
          <div key={specie.name}>
            <h3 className="font-bold text-lg mb-2">{specie.name}</h3>
            {specie.groups.map((group: any) => (
              <div key={group.name} className="ml-4 mb-2">
                <h4 className="font-semibold">{group.name}</h4>
                <p className="ml-4 text-sm">{group.lineages.join(', ')}</p>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
);


// Main Info component
export default function Info({ data }: { data: any }) {
  const {
    ageBrackets,
    attributeModifiers,
    characteristicModifiers,
    ageGroups,
    attributeArrays,
    attributeDefinitions,
    beliefs,
    calculatedAbilities,
    citystates,
    deities,
    descriptors,
    disabilities,
    economicStatuses,
    empires,
    environs,
    favoredTradesByLineage,
    culturalHeritage,
    environHeritage,
    societalHeritage,
    namingPracticeTitles,
    notableFeatures,
    physicalBlemishes,
    pmlTitles,
    pointBuyCosts,
    professions,
    randomPersonItemDeity,
    settlements,
    socialGroups,
    socialRanks,
    species,
    tragedySeeds,
    traits,
    wealthTitles,
    steps,
  } = data;

  return (
    <div className="space-y-8 mt-4">
      <FilterableTableCard title="Age Brackets" data={ageBrackets} />
      <SimpleTableCard title="Attribute Modifiers" data={attributeModifiers} />
      <SimpleTableCard title="Characteristic Modifiers" data={characteristicModifiers} />
      <SimpleTableCard title="Age Groups" data={ageGroups} />
      <FilterableTableCard title="Attribute Arrays" data={attributeArrays} />
      <AttributeDefinitionsCard data={attributeDefinitions} />
      <SimpleTableCard title="Beliefs" data={beliefs} />
      <CalculatedAbilitiesCard data={calculatedAbilities} />
      <SimpleTableCard title="City States" data={citystates} />
      <SimpleTableCard title="Deities" data={deities} />
      <SimpleTableCard title="Descriptors" data={descriptors} headers={['d66', '1,2', '3,4', '5,6']}/>
      <SimpleTableCard title="Disabilities" data={disabilities} />
      <ListCard title="Economic Statuses" data={economicStatuses} />
      <SimpleTableCard title="Empires" data={empires} />
      <ListCard title="Environs" data={environs} />
      <SimpleTableCard title="Cultural Heritage" data={culturalHeritage} />
      <SimpleTableCard title="Environ Heritage" data={environHeritage} />
      <SimpleTableCard title="Societal Heritage" data={societalHeritage} />
      <SimpleTableCard title="Naming Practice Titles" data={namingPracticeTitles} />
      <SimpleTableCard title="Notable Features" data={notableFeatures} />
      <SimpleTableCard title="Physical Blemishes" data={physicalBlemishes} headers={['d66', '1,2,3', '4,5,6']}/>
      <SimpleTableCard title="PML Titles" data={pmlTitles} />
      <SimpleTableCard title="Point Buy Costs" data={pointBuyCosts} />
      <SimpleTableCard title="Random Person Item Deity" data={randomPersonItemDeity} />
      <SimpleTableCard title="Professions" data={professions} />
      <FilterableTableCard title="Settlements" data={settlements} />
      <SimpleTableCard title="Social Groups" data={socialGroups} />
      <SimpleTableCard title="Social Ranks" data={socialRanks} />
      <SpeciesCard data={species} />
      <SimpleTableCard title="Tragedy Seeds" data={tragedySeeds} />
      <SimpleTableCard title="Traits" data={traits} />
      <SimpleTableCard title="Wealth Titles" data={wealthTitles} />
    </div>
  );
}
