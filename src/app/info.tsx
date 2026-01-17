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

const isNumber = (value: any): boolean => {
  if (typeof value === 'boolean' || value === null || Array.isArray(value)) return false;
  const s = String(value).trim();
  if (s === '') return false;
  // Check if it's a range like "1-4"
  if (s.includes('-') && s.split('-').length === 2 && !isNaN(Number(s.split('-')[0])) && !isNaN(Number(s.split('-')[1]))) {
      return false;
  }
  return !isNaN(Number(s));
};

const formatHeader = (header: string) => {
  if (header.toUpperCase() === header && header.length > 1) return header;
  if (header.toLowerCase() === 'd66') return 'D66';
  if (header.toLowerCase() === 'd6') return 'D6';

  const result = header.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

const sortTable = (data: any[], key: string) => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => {
        const valA = a[key];
        const valB = b[key];

        if (typeof valA === 'number' && typeof valB === 'number') {
            return valA - valB;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
            const numA = parseInt(valA, 10);
            const numB = parseInt(valB, 10);
            if (!isNaN(numA) && !isNaN(numB) && String(numA) === valA && String(numB) === valB) {
                return numA - numB;
            }
            return valA.localeCompare(valB);
        }
        // Fallback for mixed types or other types
        return String(a[key]).localeCompare(String(b[key]));
    });
};

// Generic component for a simple table in a card
const SimpleTableCard = ({ title, data, headers }: { title: string; data: any[]; headers?: string[] }) => {
  if (!data || data.length === 0) return null;
  const tableHeaders = headers ?? Object.keys(
    data.reduce((acc, curr) => ({ ...acc, ...curr }), {})
  );

  const sortedData = sortTable(data, tableHeaders[0]);


  return (
    <Card className="bg-white">
      <CardHeader className="sticky top-14 z-20 bg-white/95 backdrop-blur-sm">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-black">
              {tableHeaders.map((header) => (
                <TableHead key={header} className="font-bold text-lg h-8 px-2">{formatHeader(header)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row, index) => (
              <TableRow key={index}>
                {tableHeaders.map((header, headerIndex) => (
                  <TableCell key={header} className={cn('py-2 px-2', { 'font-bold': headerIndex === 0, 'text-right': isNumber(row[header]) })}>
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
  const sortedData = [...data].sort((a,b) => a.localeCompare(b));

  return (
    <Card className="bg-white">
      <CardHeader className="sticky top-14 z-20 bg-white/95 backdrop-blur-sm">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-1">
          {sortedData.map((item) => (
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
  const keys = Object.keys(data).sort((a,b) => a.localeCompare(b));
  const itemsToShow = selectedKey === 'all' ? keys : [selectedKey];

  return (
    <Card className="bg-white">
      <CardHeader className="sticky top-14 z-20 flex flex-row items-center justify-between bg-white/95 backdrop-blur-sm">
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
      <CardContent className="space-y-12">
        {itemsToShow.map((key, keyIndex) => {
            const tableData = data[key];
            if (!tableData || tableData.length === 0) return null;
            
            const isArrayOfPrimitives = typeof tableData[0] !== 'object';
            
            if (isArrayOfPrimitives) {
                const sortedArray = [...tableData].sort((a,b) => String(a).localeCompare(String(b)));
                 return (
                    <div key={key} className={keyIndex > 0 ? 'mt-12' : ''}>
                        {selectedKey === 'all' && <h4 className="text-lg font-sans">{key}</h4>}
                        <p className="text-sm">{(sortedArray as any[]).join(', ')}</p>
                    </div>
                 )
            }
            
            const headers = Object.keys(
              (tableData as any[]).reduce((acc, curr) => ({ ...acc, ...curr }), {})
            );
            const sortedTableData = sortTable(tableData, headers[0]);
            return (
              <div key={key} className={keyIndex > 0 ? 'mt-12' : ''}>
                {selectedKey === 'all' && <h4 className="text-lg font-sans">{key}</h4>}
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-2 border-black">
                        {headers.map((header) => <TableHead key={header} className="font-bold text-lg h-8 px-2">{formatHeader(header)}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTableData.map((row: any, index: number) => (
                        <TableRow key={index}>
                            {headers.map((header, headerIndex) => (
                            <TableCell key={header} className={cn('py-2 px-2', { 'font-bold': headerIndex === 0, 'text-right': isNumber(row[header]) })}>
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
const AttributeDefinitionsCard = ({ data }: { data: any[] }) => {
    const sortedData = useMemo(() => {
        return data.map(group => ({
            ...group,
            attributes: sortTable(group.attributes, 'name')
        })).sort((a, b) => a.groupName.localeCompare(b.groupName));
    }, [data]);
    
    return (
        <Card className="bg-white">
        <CardHeader className="sticky top-14 z-20 bg-white/95 backdrop-blur-sm">
            <CardTitle>Attribute Definitions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-12">
            {sortedData.map((group: any, groupIndex: number) => (
            <div key={group.groupName} className={groupIndex > 0 ? 'mt-12' : ''}>
                <h4 className="text-lg font-sans">{group.groupName}</h4>
                <Table>
                <TableHeader>
                    <TableRow className="border-b-2 border-black">
                    <TableHead className="font-bold text-lg h-8 px-2">Name</TableHead>
                    <TableHead className="font-bold text-lg h-8 px-2">Abbreviation</TableHead>
                    <TableHead className="font-bold text-lg h-8 px-2">Description</TableHead>
                    <TableHead className="font-bold text-lg h-8 px-2">IM</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {group.attributes.map((attr: any) => (
                    <TableRow key={attr.abbreviation}>
                        <TableCell className="py-2 px-2 font-bold">{attr.name}</TableCell>
                        <TableCell className="py-2 px-2">{attr.abbreviation}</TableCell>
                        <TableCell className="py-2 px-2">{attr.description}</TableCell>
                        <TableCell className="py-2 px-2 text-right">{attr.im}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
            ))}
        </CardContent>
        </Card>
    );
};

// Special card for calculated abilities
const CalculatedAbilitiesCard = ({ data }: { data: any[] }) => {
    const sortedData = useMemo(() => {
        return data.map(group => ({
            ...group,
            abilities: sortTable(group.abilities, 'name')
        })).sort((a, b) => a.groupName.localeCompare(b.groupName));
    }, [data]);

    return (
        <Card className="bg-white">
        <CardHeader className="sticky top-14 z-20 bg-white/95 backdrop-blur-sm">
            <CardTitle>Calculated Abilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-12">
            {sortedData.map((group: any, groupIndex: number) => (
            <div key={group.groupName} className={groupIndex > 0 ? 'mt-12' : ''}>
                <h4 className="text-lg font-sans">{group.groupName}</h4>
                <Table>
                <TableHeader>
                    <TableRow className="border-b-2 border-black">
                    <TableHead className="font-bold text-lg h-8 px-2">Name</TableHead>
                    <TableHead className="font-bold text-lg h-8 px-2">Description</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {group.abilities.map((ability: any) => (
                    <TableRow key={ability.name}>
                        <TableCell className="py-2 px-2 font-bold">{ability.name}</TableCell>
                        <TableCell className="py-2 px-2">{ability.description}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
            ))}
        </CardContent>
        </Card>
    )
};


// Special card for Species
const SpeciesCard = ({ data }: { data: any[] }) => {
    const sortedData = useMemo(() => {
        return data.map(specie => ({
            ...specie,
            groups: specie.groups.map((group:any) => ({
                ...group,
                lineages: [...group.lineages].sort((a,b) => a.localeCompare(b))
            })).sort((a:any, b:any) => a.name.localeCompare(b.name))
        })).sort((a,b) => a.name.localeCompare(b.name));
    }, [data]);

    return (
        <Card className="bg-white">
        <CardHeader className="sticky top-14 z-20 bg-white/95 backdrop-blur-sm">
            <CardTitle>Species</CardTitle>
        </CardHeader>
        <CardContent className="space-y-12">
            {sortedData.map((specie: any, specieIndex: number) => (
            <div key={specie.name}  className={specieIndex > 0 ? 'mt-12' : ''}>
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
    )
};

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
      adjustmentKeys: keys.sort((a,b) => a.localeCompare(b)),
      ancestries: Array.from(ancestrySet).sort((a,b) => a.localeCompare(b)),
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
      <CardHeader className="sticky top-14 z-20 flex flex-row items-center justify-between bg-white/95 backdrop-blur-sm">
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
      <CardContent className="space-y-12">
        {filteredKeys.map((key, keyIndex) => {
          const tableData = data[key];
          if (!tableData || tableData.length === 0) return null;
          const headers = Object.keys(tableData.reduce((acc:any, curr:any) => ({ ...acc, ...curr }), {}));
          const isAttributeTable = key.includes('-attributes-');
          const sortedTableData = sortTable(tableData, headers[0]);


          return (
            <div key={key} className={keyIndex > 0 ? 'mt-12' : ''}>
              <h4 className="text-lg font-sans">{getTitle(key)}</h4>
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-black">
                    {headers.map((header) => <TableHead key={header} className="font-bold text-lg h-8 px-2">{formatHeader(header)}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTableData.map((row: any, index: number) => (
                    <TableRow key={index}>
                      {headers.map((header, headerIndex) => (
                        <TableCell key={header} className={cn('py-2 px-2', { 'font-bold': headerIndex === 0, 'text-right': isNumber(row[header]) })}>
                           {row[header]}
                        </TableCell>
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

  const HeritageTable = ({ title, data, wealthClamp }: { title: string; data: any[], wealthClamp: number }) => {
    const sortedData = sortTable(data, 'entry');

    return (
        <div>
            {selectedFilter === 'all' && (
                <>
                    <h4 className="text-lg font-sans">{title}</h4>
                    <p className="text-xs text-muted-foreground -mt-2 mb-2">Wealth Clamp: {wealthClamp}</p>
                </>
            )}
            <Table>
                <TableHeader>
                    <TableRow className="border-b-2 border-black">
                        <TableHead className="font-bold text-lg h-8 px-2">Entry</TableHead>
                        <TableHead className="font-bold text-lg h-8 px-2">Talents</TableHead>
                        <TableHead className="font-bold text-lg h-8 px-2">Wealth</TableHead>
                        <TableHead className="font-bold text-lg h-8 px-2">Cost</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {sortedData.map((row: any, index: number) => (
                    <TableRow key={index}>
                    <TableCell className="py-2 px-2 font-bold">{row.entry}</TableCell>
                    <TableCell className="py-2 px-2">{row.talents}</TableCell>
                    <TableCell className="py-2 px-2 text-right">{row.wealth}</TableCell>
                    <TableCell className="py-2 px-2 text-right">{row.cost}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
    );
  };

  return (
    <Card className="bg-white">
      <CardHeader className="sticky top-14 z-20 flex flex-row items-center justify-between bg-white/95 backdrop-blur-sm">
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
      <CardContent className="space-y-12">
        {(selectedFilter === 'all' || selectedFilter === 'cultural') && (
          <HeritageTable title="Cultural Heritage" data={cultural} wealthClamp={0} />
        )}
        {(selectedFilter === 'all' || selectedFilter === 'environ') && (
          <div className={selectedFilter === 'environ' ? '' : 'mt-12'}>
            <HeritageTable title="Environ Heritage" data={environ} wealthClamp={0} />
          </div>
        )}
        {(selectedFilter === 'all' || selectedFilter === 'societal') && (
          <div className={selectedFilter === 'societal' ? '' : 'mt-12'}>
            <HeritageTable title="Societal Heritage" data={societal} wealthClamp={10} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TraitsCard = ({ data }: { data: any[] }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => {
    return ['Disability', 'Psychology', 'Virtuosity', 'Skill', 'Genetic', 'Asset', 'Intrinsic'];
  }, []);

  const filteredData = useMemo(() => {
    let sorted = sortTable(data, 'trait');

    if (selectedCategory === 'all') {
      return sorted;
    }
    const filterKey = `is${selectedCategory}`;
    return sorted.filter(item => item[filterKey] === true);
  }, [data, selectedCategory]);

  const headers = [
    'trait', 'interimTime', 'category', 'im', 'Key'
  ];
  
  const headerTitles: Record<string, string> = {
    trait: 'Trait',
    interimTime: 'Interim Time',
    category: 'Category',
    im: 'IM',
    Key: 'Key'
  };


  return (
    <Card className="bg-white">
      <CardHeader className="sticky top-14 z-20 flex flex-row items-center justify-between bg-white/95 backdrop-blur-sm">
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
              {headers.map(header => <TableHead key={header} className="font-bold text-lg h-8 px-2">{headerTitles[header]}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, index) => (
              <TableRow key={index}>
                {headers.map((header, headerIndex) => (
                   <TableCell key={header} className={cn('py-2 px-2', { 'font-bold': headerIndex === 0, 'text-right': isNumber(row[header]) })}>
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


const EmpiresCard = ({ data }: { data: any[] }) => {
    const sortedData = sortTable(data, 'id');
    return (
        <Card className="bg-white">
        <CardHeader className="sticky top-14 z-20 bg-white/95 backdrop-blur-sm">
            <CardTitle>Empires</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow className="border-b-2 border-black">
                <TableHead className="font-bold text-lg h-8 px-2">D6</TableHead>
                <TableHead className="font-bold text-lg h-8 px-2">Name</TableHead>
                <TableHead className="font-bold text-lg h-8 px-2">Region</TableHead>
                <TableHead className="font-bold text-lg h-8 px-2">Neighbors</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedData.map((row: any, index: number) => (
                <TableRow key={index}>
                    <TableCell className="py-2 px-2 font-bold text-right">{row.id}</TableCell>
                    <TableCell className="py-2 px-2">{row.name}</TableCell>
                    <TableCell className="py-2 px-2">{row.region}</TableCell>
                    <TableCell className="py-2 px-2">{Array.isArray(row.neighbors) ? row.neighbors.join(', ') : row.neighbors}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </CardContent>
        </Card>
    );
};

const NamingPracticeTitlesCard = ({ data }: { data: any[] }) => {
    const sortedData = sortTable(data, 'Rank');
    return (
    <Card className="bg-white">
      <CardHeader className="sticky top-14 z-20 bg-white/95 backdrop-blur-sm">
        <CardTitle>Naming Practice Titles</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-black">
              <TableHead className="font-bold text-lg h-8 px-2">Rank</TableHead>
              <TableHead className="font-bold text-lg h-8 px-2">Guild</TableHead>
              <TableHead className="font-bold text-lg h-8 px-2">Order</TableHead>
              <TableHead className="font-bold text-lg h-8 px-2">Temple</TableHead>
              <TableHead className="font-bold text-lg h-8 px-2">Tradition</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row: any, index: number) => (
              <TableRow key={index}>
                <TableCell className={cn("py-2 px-2 font-bold", {"text-right": isNumber(row['Rank'])})}>{row['Rank']}</TableCell>
                <TableCell className="py-2 px-2">{row.Guild}</TableCell>
                <TableCell className="py-2 px-2">{row.Order}</TableCell>
                <TableCell className="py-2 px-2">{row.Temple}</TableCell>
                <TableCell className="py-2 px-2">{row.Tradition}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    );
};

const TragedySeedsCard = ({ tragedySeeds, randomPersonItemDeity }: { tragedySeeds: any[], randomPersonItemDeity: any[] }) => {
    const sortedTragedySeeds = sortTable(tragedySeeds, 'd66');
    const sortedRandom = sortTable(randomPersonItemDeity, 'd66');

    return (
    <Card className="bg-white">
        <CardHeader className="sticky top-14 z-20 bg-white/95 backdrop-blur-sm">
            <CardTitle>Tragedy Seeds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-12">
             <div>
                <h4 className="text-lg mb-2 font-sans">Template</h4>
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-2 border-black">
                            <TableHead className="font-bold text-lg h-8 px-2">D66</TableHead>
                            <TableHead className="font-bold text-lg h-8 px-2">Seed</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTragedySeeds.map((row: any, index: number) => (
                            <TableRow key={index}>
                                <TableCell className="py-2 px-2 font-bold text-right">{row.d66}</TableCell>
                                <TableCell className="py-2 px-2">{row.seed}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
             <div className="mt-12">
                <h4 className="text-lg mb-2 font-sans">Random Person, Item, Deity, Citystate</h4>
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-2 border-black">
                        <TableHead className="font-bold text-lg h-8 px-2">D66</TableHead>
                        <TableHead className="font-bold text-lg h-8 px-2">Person</TableHead>
                        <TableHead className="font-bold text-lg h-8 px-2">Item</TableHead>
                        <TableHead className="font-bold text-lg h-8 px-2">Citystate</TableHead>
                        <TableHead className="font-bold text-lg h-8 px-2">Deity</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedRandom.map((row: any, index: number) => (
                        <TableRow key={index}>
                            <TableCell className="py-2 px-2 font-bold text-right">{row.d66}</TableCell>
                            <TableCell className="py-2 px-2">{row.Person}</TableCell>
                            <TableCell className="py-2 px-2">{row.Item}</TableCell>
                            <TableCell className="py-2 px-2">{row.Citystate}</TableCell>
                            <TableCell className="py-2 px-2">{row.Deity}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
        </CardContent>
    </Card>
);
}


// Main Info component
export default function Info({ data }: { data: any }) {
  const {
    ageBrackets,
    attributeModifiers,
    characteristicModifiers,
    characteristicCosts,
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
    settlements,
    socialGroups,
    socialRanks,
    species,
    tragedySeeds,
    traits,
    wealthTitles,
    steps,
  } = data;

  const sortedAttributeModifiers = sortTable(attributeModifiers, 'Group');
  const sortedCharacteristicModifiers = sortTable(characteristicModifiers, 'Group');
  const sortedBeliefs = sortTable(beliefs, 'keyword');
  const sortedCityStates = sortTable(citystates, 'name');
  const sortedDeities = sortTable(deities, 'deity');
  const sortedDescriptors = sortTable(descriptors, 'd66');
  const sortedDisabilities = sortTable(disabilities, 'd66');
  const sortedNotableFeatures = sortTable(notableFeatures, 'd66');
  const sortedPhysicalBlemishes = sortTable(physicalBlemishes, 'd66');
  const sortedPmlTitles = sortTable(pmlTitles, 'level');
  const sortedPointBuyCosts = sortTable(pointBuyCosts, 'value');
  const sortedProfessions = sortTable(professions, 'trade');
  const sortedSocialGroups = sortTable(socialGroups, 'rank');
  const sortedSocialRanks = sortTable(socialRanks, 'society');
  const sortedWealthTitles = sortTable(wealthTitles, 'rank');


  return (
    <div className="space-y-8 mt-4 max-w-[960px] mx-auto">
      <AdjustmentsCard data={data} />
      <FilterableTableCard title="Age Brackets" data={ageBrackets} />
      <SimpleTableCard title="Attribute Modifiers" data={sortedAttributeModifiers} headers={['Group', 'Rank', 'CCA', 'RCA', 'REF', 'INT', 'KNO', 'PRE', 'POW', 'STR', 'FOR', 'MOV', 'ZED', 'Cost']} />
      <SimpleTableCard title="Characteristic Modifiers" data={sortedCharacteristicModifiers} headers={['Group', 'Rank', 'Stature', 'Build', 'Bodypoints', 'Disads', 'Resilience', 'Cost']} />
      <SimpleTableCard title="Characteristic Costs" data={characteristicCosts} />
      <SimpleTableCard title="Age Groups" data={ageGroups} />
      <FilterableTableCard title="Attribute Arrays" data={attributeArrays} />
      <AttributeDefinitionsCard data={attributeDefinitions} />
      <SimpleTableCard title="Beliefs" data={sortedBeliefs} />
      <CalculatedAbilitiesCard data={calculatedAbilities} />
      <SimpleTableCard title="City States" data={sortedCityStates} />
      <SimpleTableCard title="Deities" data={sortedDeities} />
      <SimpleTableCard title="Descriptors" data={sortedDescriptors} headers={['d66', '1,2', '3,4', '5,6']}/>
      <SimpleTableCard title="Disabilities" data={sortedDisabilities} />
      <ListCard title="Economic Statuses" data={economicStatuses} />
      <EmpiresCard data={empires} />
      <ListCard title="Environs" data={environs} />
      <HeritageCard cultural={culturalHeritage} environ={environHeritage} societal={societalHeritage} />
      <NamingPracticeTitlesCard data={namingPracticeTitles} />
      <SimpleTableCard title="Notable Features" data={sortedNotableFeatures} />
      <SimpleTableCard title="Physical Blemishes" data={sortedPhysicalBlemishes} headers={['d66', '1,2,3', '4,5,6']}/>
      <SimpleTableCard title="PML Titles" data={sortedPmlTitles} />
      <SimpleTableCard title="Point Buy Costs" data={sortedPointBuyCosts} />
      <SimpleTableCard title="Professions" data={sortedProfessions} />
      <FilterableTableCard title="Settlements" data={settlements} />
      <SimpleTableCard title="Social Groups" data={sortedSocialGroups} />
      <SimpleTableCard title="Social Ranks" data={sortedSocialRanks} />
      <SpeciesCard data={species} />
      <TragedySeedsCard tragedySeeds={tragedySeeds} randomPersonItemDeity={data.randomPersonItemDeity} />
      <TraitsCard data={traits} />
      <SimpleTableCard title="Wealth Titles" data={sortedWealthTitles} />
    </div>
  );
}
