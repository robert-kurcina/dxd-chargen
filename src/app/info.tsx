'use client';

import { useMemo, useState } from 'react';
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
import { cn } from '@/lib/utils';

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
            <TableRow className="border-b-2 border-black">
              {tableHeaders.map((header) => (
                <TableHead key={header} className="font-bold text-lg h-8">{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {tableHeaders.map((header, headerIndex) => (
                  <TableCell key={header} className={cn('py-2 pl-4', { 'font-bold': headerIndex === 0 })}>
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
                        {selectedKey === 'all' && <h4 className="text-lg mb-2 font-sans">{key}</h4>}
                        <p className="text-sm">{(tableData as any[]).join(', ')}</p>
                    </div>
                 )
            }
            
            const headers = Object.keys(
              (tableData as any[]).reduce((acc, curr) => ({ ...acc, ...curr }), {})
            );
            return (
              <div key={key}>
                {selectedKey === 'all' && <h4 className="text-lg mb-2 font-sans">{key}</h4>}
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-2 border-black">
                        {headers.map((header) => <TableHead key={header} className="font-bold text-lg h-8">{header}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row: any, index: number) => (
                        <TableRow key={index}>
                            {headers.map((header, headerIndex) => (
                            <TableCell key={header} className={cn('py-2 pl-4', { 'font-bold': headerIndex === 0 })}>
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
            <h4 className="text-md mb-2">{group.groupName}</h4>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-black">
                  <TableHead className="font-bold text-lg h-8">Name</TableHead>
                  <TableHead className="font-bold text-lg h-8">Abbreviation</TableHead>
                  <TableHead className="font-bold text-lg h-8">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.attributes.map((attr: any) => (
                  <TableRow key={attr.abbreviation}>
                    <TableCell className="py-2 pl-4 font-bold">{attr.name}</TableCell>
                    <TableCell className="py-2 pl-4">{attr.abbreviation}</TableCell>
                    <TableCell className="py-2 pl-4">{attr.description}</TableCell>
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
            <h4 className="text-md mb-2">{group.groupName}</h4>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-black">
                  <TableHead className="font-bold text-lg h-8">Name</TableHead>
                  <TableHead className="font-bold text-lg h-8">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.abilities.map((ability: any) => (
                  <TableRow key={ability.name}>
                    <TableCell className="py-2 pl-4 font-bold">{ability.name}</TableCell>
                    <TableCell className="py-2 pl-4">{ability.description}</TableCell>
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

const AdjustmentsCard = ({ data }: { data: any }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const { adjustmentKeys, ancestries } = useMemo(() => {
    const keys = Object.keys(data).filter(k => k.startsWith('adjustments-'));
    const ancestrySet = new Set<string>();
    keys.forEach(key => {
      const parts = key.split('-');
      if (parts.length === 3) {
        ancestrySet.add(parts[2]);
      }
    });
    return {
      adjustmentKeys: keys,
      ancestries: Array.from(ancestrySet),
    };
  }, [data]);

  const filteredKeys = useMemo(() => {
    if (selectedFilter === 'all') {
      return adjustmentKeys;
    }
    if (selectedFilter === 'attributes') {
      return adjustmentKeys.filter(k => k.includes('-attributes-'));
    }
    if (selectedFilter === 'characteristics') {
      return adjustmentKeys.filter(k => k.includes('-characteristics-'));
    }
    // It's an ancestry filter
    return adjustmentKeys.filter(k => k.endsWith(`-${selectedFilter}`));
  }, [selectedFilter, adjustmentKeys]);

  const getTitle = (key: string) => {
    const parts = key.split('-');
    if (parts.length === 3) {
      const type = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      const ancestry = parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
      return `${ancestry} - ${type}`;
    }
    return key;
  };

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Adjustments</CardTitle>
        <Select value={selectedFilter} onValueChange={setSelectedFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="attributes">Attributes</SelectItem>
            <SelectItem value="characteristics">Characteristics</SelectItem>
            {ancestries.map(ancestry => (
              <SelectItem key={ancestry} value={ancestry}>
                {ancestry.charAt(0).toUpperCase() + ancestry.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredKeys.map(key => {
          const tableData = data[key];
          if (!tableData || tableData.length === 0) return null;
          const headers = Object.keys(tableData.reduce((acc:any, curr:any) => ({ ...acc, ...curr }), {}));

          return (
            <div key={key}>
              <h4 className="text-lg mb-2 font-sans">{getTitle(key)}</h4>
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-black">
                    {headers.map((header) => <TableHead key={header} className="font-bold text-lg h-8">{header}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row: any, index: number) => (
                    <TableRow key={index}>
                      {headers.map((header, headerIndex) => (
                        <TableCell key={header} className={cn('py-2 pl-4', { 'font-bold': headerIndex === 0 })}>{row[header]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

const HeritageCard = ({ cultural, environ, societal }: { cultural: any[]; environ: any[]; societal: any[] }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const HeritageTable = ({ title, data }: { title: string; data: any[] }) => (
    <div>
      {selectedFilter === 'all' && <h4 className="text-lg mb-2 font-sans">{title}</h4>}
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-black">
            <TableHead className="font-bold text-lg h-8">Entry</TableHead>
            <TableHead className="font-bold text-lg h-8">Talents</TableHead>
            <TableHead className="font-bold text-lg h-8">Skill Points</TableHead>
            <TableHead className="font-bold text-lg h-8">Wealth</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row: any, index: number) => (
            <TableRow key={index}>
              <TableCell className="py-2 pl-4 font-bold">{row.entry}</TableCell>
              <TableCell className="py-2 pl-4">{row.talents}</TableCell>
              <TableCell className="py-2 pl-4">{row.skillPoints}</TableCell>
              <TableCell className="py-2 pl-4">{row.wealth}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Heritage</CardTitle>
        <Select value={selectedFilter} onValueChange={setSelectedFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="cultural">Cultural</SelectItem>
            <SelectItem value="environ">Environ</SelectItem>
            <SelectItem value="societal">Societal</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {(selectedFilter === 'all' || selectedFilter === 'cultural') && (
          <HeritageTable title="Cultural Heritage" data={cultural} />
        )}
        {(selectedFilter === 'all' || selectedFilter === 'environ') && (
          <HeritageTable title="Environ Heritage" data={environ} />
        )}
        {(selectedFilter === 'all' || selectedFilter === 'societal') && (
          <HeritageTable title="Societal Heritage" data={societal} />
        )}
      </CardContent>
    </Card>
  );
};

const TraitsCard = ({ data }: { data: any[] }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    data.forEach(item => categorySet.add(item.category));
    return Array.from(categorySet).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (selectedCategory === 'all') {
      return data;
    }
    return data.filter(item => item.category === selectedCategory);
  }, [data, selectedCategory]);

  const headers = [
    'trait', 'interimTime', 'category', 'isDisability', 'im', 'isPsychology',
    'isVirtuosity', 'isSkill', 'isGenetic', 'isAsset', 'isIntrinsic'
  ];
  
  const headerTitles: Record<string, string> = {
    trait: 'Trait',
    interimTime: 'Interim Time',
    category: 'Category',
    isDisability: 'Disability?',
    im: 'IM',
    isPsychology: 'Psychology?',
    isVirtuosity: 'Virtuosity?',
    isSkill: 'Skill?',
    isGenetic: 'Genetic?',
    isAsset: 'Asset?',
    isIntrinsic: 'Intrinsic?'
  };


  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Traits</CardTitle>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Category..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-black">
              {headers.map(header => <TableHead key={header} className="font-bold text-lg h-8">{headerTitles[header]}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, index) => (
              <TableRow key={index}>
                {headers.map((header, headerIndex) => (
                   <TableCell key={header} className={cn('py-2 pl-4', { 'font-bold': headerIndex === 0 })}>
                     {typeof row[header] === 'boolean' ? String(row[header]) : row[header]}
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


const EmpiresCard = ({ data }: { data: any[] }) => (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Empires</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-black">
              <TableHead className="font-bold text-lg h-8">d6</TableHead>
              <TableHead className="font-bold text-lg h-8">name</TableHead>
              <TableHead className="font-bold text-lg h-8">region</TableHead>
              <TableHead className="font-bold text-lg h-8">neighbors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any, index: number) => (
              <TableRow key={index}>
                <TableCell className="py-2 pl-4 font-bold">{row.id}</TableCell>
                <TableCell className="py-2 pl-4">{row.name}</TableCell>
                <TableCell className="py-2 pl-4">{row.region}</TableCell>
                <TableCell className="py-2 pl-4">{Array.isArray(row.neighbors) ? row.neighbors.join(', ') : row.neighbors}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
);

const NamingPracticeTitlesCard = ({ data }: { data: any[] }) => (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Naming Practice Titles</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-black">
              <TableHead className="font-bold text-lg h-8">Rank</TableHead>
              <TableHead className="font-bold text-lg h-8">Guild</TableHead>
              <TableHead className="font-bold text-lg h-8">Order</TableHead>
              <TableHead className="font-bold text-lg h-8">Temple</TableHead>
              <TableHead className="font-bold text-lg h-8">Tradition</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any, index: number) => (
              <TableRow key={index}>
                <TableCell className="py-2 pl-4 font-bold">{row['#']}</TableCell>
                <TableCell className="py-2 pl-4">{row.Guild}</TableCell>
                <TableCell className="py-2 pl-4">{row.Order}</TableCell>
                <TableCell className="py-2 pl-4">{row.Temple}</TableCell>
                <TableCell className="py-2 pl-4">{row.Tradition}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
      <AdjustmentsCard data={data} />
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
      <EmpiresCard data={empires} />
      <ListCard title="Environs" data={environs} />
      <HeritageCard cultural={culturalHeritage} environ={environHeritage} societal={societalHeritage} />
      <NamingPracticeTitlesCard data={namingPracticeTitles} />
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
      <TraitsCard data={traits} />
      <SimpleTableCard title="Wealth Titles" data={wealthTitles} />
    </div>
  );
}
