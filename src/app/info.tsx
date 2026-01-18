
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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { cn, parseNumberWithSuffix, formatNumberWithSuffix } from '@/lib/utils';
import type { StaticData } from '@/data';
import { calculateBonusSkillpointCost, calculateAttributeSkillpointCost, calculateTraitSkillpointCost, formatPositiveNumber, parseLineageString } from '@/lib/character-logic';

const isNumber = (value: any): boolean => {
    if (value === null || value === undefined || typeof value === 'boolean' || Array.isArray(value)) return false;
    const s = String(value).trim();
    if (s === '') return false;
    
    // Check for ranges like '11-16'. If a dash exists and it's not the first character, it's not a simple number.
    if (s.includes('-') && s.lastIndexOf('-') > 0) {
        return false;
    }

    return !isNaN(parseNumberWithSuffix(s));
};


const formatHeader = (header: string) => {
  if (header.toUpperCase() === header && header.length > 1) return header;
  if (header.toLowerCase() === 'd66') return 'D66';
  if (header.toLowerCase() === 'd6') return 'D6';

  const result = header.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// Generic component for a simple table in a card
const SimpleTableCard = ({ title, data, headers }: { title: string; data: any[]; headers?: string[] }) => {
  if (!data || data.length === 0) return null;
  const tableData = data;
  const tableHeaders = headers ?? Object.keys(
    tableData.reduce((acc, curr) => ({ ...acc, ...curr }), {})
  );

  const numericHeaders = useMemo(() => {
    const numeric = new Set<string>();
    if (!tableData.length) return numeric;

    for (const header of tableHeaders) {
      if (tableData.every(row => {
        const value = row[header];
        return value === null || value === undefined || value === '' || isNumber(value);
      })) {
        numeric.add(header);
      }
    }
    return numeric;
  }, [tableData, tableHeaders]);


  return (
    <Card className="bg-white overflow-hidden">
        <AccordionItem value={title.toLowerCase().replace(/ /g, '-')} className="border-b-0">
            <AccordionTrigger className="p-6 hover:no-underline">
                <CardTitle>{title}</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
                <CardContent className="pt-6">
                    <Table>
                    <TableHeader>
                        <TableRow className="border-b-2 border-black">
                        {tableHeaders.map((header) => (
                            <TableHead key={header} className={cn("font-bold text-lg h-8 px-2", { 'text-right': numericHeaders.has(header) })}>{formatHeader(header)}</TableHead>
                        ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.map((row, index) => (
                        <TableRow key={index}>
                            {tableHeaders.map((header, headerIndex) => (
                            <TableCell key={header} className={cn('py-2 px-2', { 'font-bold': headerIndex === 0, 'text-right': numericHeaders.has(header) })}>
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
            </AccordionContent>
        </AccordionItem>
    </Card>
  );
};

// Generic component for a list in a card
const ListCard = ({ title, data }: { title: string; data: string[] }) => {
  if (!data || data.length === 0) return null;
  const listData = data;

  return (
    <Card className="bg-white overflow-hidden">
        <AccordionItem value={title.toLowerCase().replace(/ /g, '-')} className="border-b-0">
            <AccordionTrigger className="p-6 hover:no-underline">
                <CardTitle>{title}</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
                <CardContent className="pt-6">
                    <ul className="list-disc pl-5 space-y-1">
                    {listData.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                    </ul>
                </CardContent>
            </AccordionContent>
        </AccordionItem>
    </Card>
  );
};


// Component for data that is an object of arrays, with a filter
const FilterableTableCard = ({ title, data }: { title: string; data: Record<string, any[]> }) => {
  const [selectedKey, setSelectedKey] = useState('all');
  const keys = Object.keys(data);
  const itemsToShow = selectedKey === 'all' ? keys : [selectedKey];

  return (
    <Card className="bg-white overflow-hidden">
        <AccordionItem value={title.toLowerCase().replace(/ /g, '-')} className="border-b-0">
            <AccordionTrigger className="p-6 hover:no-underline w-full">
                <CardTitle>{title}</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
                <div className="px-6 pb-6 border-b">
                    <Select value={selectedKey} onValueChange={setSelectedKey}>
                        <SelectTrigger className="w-[180px] ml-auto">
                            <SelectValue placeholder="Filter by..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {keys.map((key) => (
                            <SelectItem key={key} value={key}>{key}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <CardContent className="pt-6 space-y-12">
                    {itemsToShow.map((key, keyIndex) => {
                        const tableData = data[key];
                        if (!tableData || tableData.length === 0) return null;
                        
                        const isArrayOfPrimitives = typeof tableData[0] !== 'object';
                        
                        if (isArrayOfPrimitives) {
                            const arrayData = tableData;
                            return (
                                <div key={key} className={keyIndex > 0 ? 'mt-12' : ''}>
                                    {selectedKey === 'all' && <h4 className="text-lg font-sans">{key}</h4>}
                                    <p className="text-sm">{(arrayData as any[]).join(', ')}</p>
                                </div>
                            )
                        }
                        
                        const headers = Object.keys(
                        (tableData as any[]).reduce((acc, curr) => ({ ...acc, ...curr }), {})
                        );
                        const filteredTableData = tableData;
                        
                        const numericHeaders = new Set<string>();
                        for (const h of headers) {
                            if (filteredTableData.every(r => {
                            const value = r[h];
                            return value === null || value === undefined || value === '' || isNumber(value);
                            })) {
                                numericHeaders.add(h);
                            }
                        }

                        return (
                        <div key={key} className={keyIndex > 0 ? 'mt-12' : ''}>
                            {selectedKey === 'all' && <h4 className="text-lg font-sans">{key}</h4>}
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-black">
                                    {headers.map((header) => <TableHead key={header} className={cn("font-bold text-lg h-8 px-2", { 'text-right': numericHeaders.has(header) })}>{formatHeader(header)}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTableData.map((row: any, index: number) => (
                                    <TableRow key={index}>
                                        {headers.map((header, headerIndex) => (
                                        <TableCell key={header} className={cn('py-2 px-2', { 'font-bold': headerIndex === 0, 'text-right': numericHeaders.has(header) })}>
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
            </AccordionContent>
      </AccordionItem>
    </Card>
  )
}

const AdjustmentsByAgeGroupCard = ({ attributeModifiers, characteristicModifiers }: { attributeModifiers: any[]; characteristicModifiers: any[] }) => {
    const amData = attributeModifiers;
    const amHeaders = ['Group', 'Rank', 'CCA', 'RCA', 'REF', 'INT', 'KNO', 'PRE', 'POW', 'STR', 'FOR', 'MOV', 'ZED', 'Cost'];
    const amNumericHeaders = useMemo(() => {
        const numeric = new Set<string>();
        if (!amData.length) return numeric;
        for (const header of amHeaders) {
            if (amData.every(row => {
                const value = row[header];
                return value === null || value === undefined || value === '' || isNumber(value);
            })) {
                numeric.add(header);
            }
        }
        return numeric;
    }, [amData, amHeaders]);

    const cmData = characteristicModifiers;
    const cmHeaders = ['Group', 'Rank', 'Stature', 'Build', 'Bodypoints', 'Disads', 'Resilience', 'Cost'];
    const cmNumericHeaders = useMemo(() => {
        const numeric = new Set<string>();
        if (!cmData.length) return numeric;
        for (const header of cmHeaders) {
            if (cmData.every(row => {
                const value = row[header];
                return value === null || value === undefined || value === '' || isNumber(value);
            })) {
                numeric.add(header);
            }
        }
        return numeric;
    }, [cmData, cmHeaders]);

    return (
        <Card className="bg-white overflow-hidden">
            <AccordionItem value="adjustments-by-age-group" className="border-b-0">
                <AccordionTrigger className="p-6 hover:no-underline">
                    <CardTitle>Adjustments by Age Group</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="pt-6 space-y-12">
                        <div>
                            <h4 className="text-lg mb-2 font-sans">Attributes</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-black">
                                        {amHeaders.map((header) => (
                                            <TableHead key={header} className={cn("font-bold text-lg h-8 px-2", { 'text-right': amNumericHeaders.has(header) })}>{formatHeader(header)}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {amData.map((row, index) => (
                                        <TableRow key={index}>
                                            {amHeaders.map((header, headerIndex) => (
                                                <TableCell key={header} className={cn('py-2 px-2', { 'font-bold': headerIndex === 0, 'text-right': amNumericHeaders.has(header) })}>
                                                    {row[header] ?? 'N/A'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-12">
                            <h4 className="text-lg mb-2 font-sans">Characteristics</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-black">
                                        {cmHeaders.map((header) => (
                                            <TableHead key={header} className={cn("font-bold text-lg h-8 px-2", { 'text-right': cmNumericHeaders.has(header) })}>{formatHeader(header)}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cmData.map((row, index) => (
                                        <TableRow key={index}>
                                            {cmHeaders.map((header, headerIndex) => (
                                                <TableCell key={header} className={cn('py-2 px-2', { 'font-bold': headerIndex === 0, 'text-right': cmNumericHeaders.has(header) })}>
                                                    {row[header] ?? 'N/A'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
};

// Special card for attribute definitions
const AttributeDefinitionsCard = ({ data }: { data: any[] }) => {
    const cardData = data;
    
    return (
        <Card className="bg-white overflow-hidden">
            <AccordionItem value="attribute-definitions" className="border-b-0">
                <AccordionTrigger className="p-6 hover:no-underline">
                    <CardTitle>Attribute Definitions</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="pt-6 space-y-12">
                        {cardData.map((group: any, groupIndex: number) => (
                        <div key={group.groupName} className={groupIndex > 0 ? 'mt-12' : ''}>
                            <h4 className="text-lg font-sans">{group.groupName}</h4>
                            <Table>
                            <TableHeader>
                                <TableRow className="border-b-2 border-black">
                                <TableHead className="font-bold text-lg h-8 px-2">Name</TableHead>
                                <TableHead className="font-bold text-lg h-8 px-2">Abbreviation</TableHead>
                                <TableHead className="font-bold text-lg h-8 px-2">Description</TableHead>
                                <TableHead className="font-bold text-lg h-8 px-2 text-right">IM</TableHead>
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
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
};

// Special card for calculated abilities
const CalculatedAbilitiesCard = ({ data }: { data: any[] }) => {
    const cardData = data;

    return (
        <Card className="bg-white overflow-hidden">
            <AccordionItem value="calculated-abilities" className="border-b-0">
                <AccordionTrigger className="p-6 hover:no-underline">
                    <CardTitle>Calculated Abilities</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="pt-6 space-y-12">
                        {cardData.map((group: any, groupIndex: number) => (
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
                </AccordionContent>
            </AccordionItem>
        </Card>
    )
};


// Special card for Species
const SpeciesCard = ({ data }: { data: any[] }) => {
    const cardData = data;

    return (
        <Card className="bg-white overflow-hidden">
            <AccordionItem value="species" className="border-b-0">
                <AccordionTrigger className="p-6 hover:no-underline">
                    <CardTitle>Species</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="pt-6 space-y-12">
                        {cardData.map((specie: any, specieIndex: number) => (
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
                </AccordionContent>
            </AccordionItem>
        </Card>
    )
};

const AdjustmentsByLineageCard = ({ data }: { data: any }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const attributeColumns = new Set(['CCA', 'RCA', 'REF', 'INT', 'KNO', 'PRE', 'POW', 'STR', 'FOR', 'MOV', 'ZED']);
  const characteristicColumnsToFormat = new Set(['stature', 'build', 'bodypoints']);

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
  
  const ageGroupLineageNames = useMemo(() => new Set(data.ageGroups.map((g: any) => g.ageGroup)), [data.ageGroups]);
  const sexLineageNames = useMemo(() => new Set(['female', 'male']), []);

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
    <Card className="bg-white overflow-hidden">
      <AccordionItem value="adjustments-by-lineage" className="border-b-0">
        <AccordionTrigger className="p-6 hover:no-underline w-full">
            <CardTitle>Adjustments by Lineage</CardTitle>
        </AccordionTrigger>
        <AccordionContent>
            <div className="px-6 pb-6 border-b">
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                    <SelectTrigger className="w-[180px] ml-auto">
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
            </div>
            <CardContent className="pt-6 space-y-12">
                {filteredKeys.map((key, keyIndex) => {
                const tableData = data[key];
                if (!tableData || tableData.length === 0) return null;
                const headers = Object.keys(tableData.reduce((acc:any, curr:any) => ({ ...acc, ...curr }), {}));
                const filteredTableData = tableData;
                
                const numericHeaders = new Set<string>();
                for (const h of headers) {
                    if (filteredTableData.every(r => {
                        const value = r[h];
                        return value === null || value === undefined || value === '' || isNumber(value)
                    })) {
                        numericHeaders.add(h);
                    }
                }

                return (
                    <div key={key} className={keyIndex > 0 ? 'mt-12' : ''}>
                    <h4 className="text-lg font-sans">{getTitle(key)}</h4>
                    <Table>
                        <TableHeader>
                        <TableRow className="border-b-2 border-black">
                            {headers.map((header) => <TableHead key={header} className={cn("font-bold text-lg h-8 px-2", { 'text-right': numericHeaders.has(header) })}>{formatHeader(header)}</TableHead>)}
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredTableData.map((row: any, index: number) => (
                            <TableRow key={index} className={cn({
                                'bg-gray-100': row.lineage === 'BASE-LINE',
                                'bg-gray-200 hover:bg-gray-300': (() => {
                                    const parsed = parseLineageString(row.lineage);
                                    return ageGroupLineageNames.has(parsed.name);
                                })(),
                                'bg-gray-400 hover:bg-gray-300': (() => {
                                    const parsed = parseLineageString(row.lineage);
                                    return sexLineageNames.has(parsed.name.toLowerCase());
                                })(),
                            })}>
                            {headers.map((header, headerIndex) => (
                                <TableCell key={header} className={cn('py-2 px-2', { 'font-bold': headerIndex === 0, 'text-right': numericHeaders.has(header) })}>
                                {(attributeColumns.has(header) || characteristicColumnsToFormat.has(header)) && typeof row[header] === 'number'
                                    ? formatPositiveNumber(row[header])
                                    : row[header]}
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
        </AccordionContent>
      </AccordionItem>
    </Card>
  );
};

const HeritageCard = ({ cultural, environ, societal }: { cultural: any[]; environ: any[]; societal: any[] }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const HeritageTable = ({ title, data, wealthClamp }: { title: string; data: any[], wealthClamp: number }) => {
    const tableData = data;
    const numericHeaders = useMemo(() => {
        const numeric = new Set<string>();
        const headers = ['wealth', 'cost'];
        if (!tableData.length) return numeric;
        for (const header of headers) {
            if (tableData.every(row => {
                const value = row[header];
                return value === null || value === undefined || value === '' || isNumber(value);
            })) {
                numeric.add(header);
            }
        }
        return numeric;
    }, [tableData]);


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
                        <TableHead className={cn("font-bold text-lg h-8 px-2", {'text-right': numericHeaders.has('wealth')})}>Wealth</TableHead>
                        <TableHead className={cn("font-bold text-lg h-8 px-2", {'text-right': numericHeaders.has('cost')})}>Cost</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {tableData.map((row: any, index: number) => (
                    <TableRow key={index}>
                    <TableCell className="py-2 px-2 font-bold">{row.entry}</TableCell>
                    <TableCell className="py-2 px-2">{row.talents}</TableCell>
                    <TableCell className={cn("py-2 px-2", {'text-right': numericHeaders.has('wealth')})}>{row.wealth}</TableCell>
                    <TableCell className={cn("py-2 px-2", {'text-right': numericHeaders.has('cost')})}>{row.cost}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
    );
  };

  return (
    <Card className="bg-white overflow-hidden">
        <AccordionItem value="heritage" className="border-b-0">
            <AccordionTrigger className="p-6 hover:no-underline w-full">
                <CardTitle>Heritage</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
                <div className="px-6 pb-6 border-b">
                    <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                    <SelectTrigger className="w-[180px] ml-auto">
                        <SelectValue placeholder="Filter by..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="cultural">Cultural</SelectItem>
                        <SelectItem value="environ">Environ</SelectItem>
                        <SelectItem value="societal">Societal</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                <CardContent className="pt-6 space-y-12">
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
            </AccordionContent>
        </AccordionItem>
    </Card>
  );
};

const TraitsCard = ({ data }: { data: any[] }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => {
    return ['Disability', 'Psychology', 'Virtuosity', 'Skill', 'Genetic', 'Asset', 'Intrinsic'];
  }, []);

  const filteredData = useMemo(() => {
    let tableData = data;

    if (selectedCategory === 'all') {
      return tableData;
    }
    const filterKey = `is${selectedCategory}`;
    return tableData.filter(item => item[filterKey] === true);
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
  
  const numericHeaders = useMemo(() => {
    const numeric = new Set<string>();
    if (!filteredData.length) return numeric;
    
    for (const header of headers) {
        if (filteredData.every(row => {
            const value = row[header];
            return value === null || value === undefined || value === '' || isNumber(value);
        })) {
            numeric.add(header);
        }
    }
    return numeric;
  }, [filteredData, headers]);


  return (
    <Card className="bg-white overflow-hidden">
        <AccordionItem value="traits" className="border-b-0">
            <AccordionTrigger className="p-6 hover:no-underline w-full">
                <CardTitle>Traits</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
                <div className="px-6 pb-6 border-b">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px] ml-auto">
                        <SelectValue placeholder="Filter by Category..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                <CardContent className="pt-6">
                    <Table>
                    <TableHeader>
                        <TableRow className="border-b-2 border-black">
                        {headers.map(header => <TableHead key={header} className={cn("font-bold text-lg h-8 px-2", { 'text-right': numericHeaders.has(header) })}>{headerTitles[header]}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.map((row, index) => (
                        <TableRow key={index}>
                            {headers.map((header, headerIndex) => (
                            <TableCell key={header} className={cn('py-2 px-2', { 'font-bold': headerIndex === 0, 'text-right': numericHeaders.has(header) })}>
                                {typeof row[header] === 'boolean' ? String(row[header]) : row[header]}
                            </TableCell>
                            ))}
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </AccordionContent>
        </AccordionItem>
    </Card>
  );
};


const EmpiresCard = ({ data }: { data: any[] }) => {
    const tableData = data;
    return (
        <Card className="bg-white overflow-hidden">
            <AccordionItem value="empires" className="border-b-0">
                <AccordionTrigger className="p-6 hover:no-underline">
                    <CardTitle>Empires</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="pt-6">
                        <Table>
                        <TableHeader>
                            <TableRow className="border-b-2 border-black">
                            <TableHead className="font-bold text-lg h-8 px-2 text-right">D6</TableHead>
                            <TableHead className="font-bold text-lg h-8 px-2">Name</TableHead>
                            <TableHead className="font-bold text-lg h-8 px-2">Region</TableHead>
                            <TableHead className="font-bold text-lg h-8 px-2">Neighbors</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tableData.map((row: any, index: number) => (
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
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
};

const ProfessionsAndTitlesCard = ({ professions, titles }: { professions: any[], titles: any[] }) => {
    const professionsData = professions;
    const titlesData = titles;
    const isRankNumeric = titlesData.every(r => isNumber(r['Rank']));

    const professionHeaders = ['trade', 'candidacy', 'namingPractice', 'per1000'];
    const professionHeaderTitles: Record<string, string> = {
        trade: 'Trade',
        candidacy: 'Candidacy',
        namingPractice: 'Naming Practice',
        per1000: 'Likelihood (per 1000)',
    };

    const numericHeadersProfessions = useMemo(() => {
        const numeric = new Set<string>();
        if (!professionsData.length) return numeric;
        const headers = ['per1000'];
        for (const header of headers) {
            if (professionsData.every(row => {
                const value = row[header];
                return value === null || value === undefined || value === '' || isNumber(value);
            })) {
                numeric.add(header);
            }
        }
        return numeric;
    }, [professionsData]);

    return (
        <Card className="bg-white overflow-hidden">
            <AccordionItem value="professions-and-titles" className="border-b-0">
                <AccordionTrigger className="p-6 hover:no-underline">
                    <CardTitle>Professions &amp; Titles</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="pt-6 space-y-12">
                        <div>
                            <h4 className="text-lg mb-2 font-sans">Professions</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-black">
                                        {professionHeaders.map(header => (
                                            <TableHead key={header} className={cn("font-bold text-lg h-8 px-2", { 'text-right': numericHeadersProfessions.has(header) })}>{professionHeaderTitles[header]}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {professionsData.map((row: any) => (
                                        <TableRow key={row.trade}>
                                            {professionHeaders.map((header, headerIndex) => (
                                                 <TableCell key={header} className={cn('py-2 px-2', { 'font-bold': headerIndex === 0, 'text-right': numericHeadersProfessions.has(header) })}>
                                                     {Array.isArray(row[header]) ? row[header].join(', ') : row[header]}
                                                 </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-12">
                            <h4 className="text-lg mb-2 font-sans">Naming Practice Titles</h4>
                             <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-black">
                                    <TableHead className={cn("font-bold text-lg h-8 px-2", { "text-right": isRankNumeric })}>Rank</TableHead>
                                    <TableHead className="font-bold text-lg h-8 px-2">Guild</TableHead>
                                    <TableHead className="font-bold text-lg h-8 px-2">Order</TableHead>
                                    <TableHead className="font-bold text-lg h-8 px-2">Temple</TableHead>
                                    <TableHead className="font-bold text-lg h-8 px-2">Tradition</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {titlesData.map((row: any, index: number) => (
                                    <TableRow key={index}>
                                        <TableCell className={cn("py-2 px-2 font-bold", {"text-right": isRankNumeric })}>{row['Rank']}</TableCell>
                                        <TableCell className="py-2 px-2">{row.Guild}</TableCell>
                                        <TableCell className="py-2 px-2">{row.Order}</TableCell>
                                        <TableCell className="py-2 px-2">{row.Temple}</TableCell>
                                        <TableCell className="py-2 px-2">{row.Tradition}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
};


const TragedySeedsCard = ({ tragedySeeds, randomPersonItemDeity }: { tragedySeeds: any[], randomPersonItemDeity: any[] }) => {
    const tableDataTragedy = tragedySeeds;
    const tableDataRandom = randomPersonItemDeity;

    return (
        <Card className="bg-white overflow-hidden">
            <AccordionItem value="tragedy-seeds" className="border-b-0">
                <AccordionTrigger className="p-6 hover:no-underline">
                    <CardTitle>Tragedy Seeds</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="pt-6 space-y-12">
                        <div>
                            <h4 className="text-lg mb-2 font-sans">Template</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-black">
                                        <TableHead className="font-bold text-lg h-8 px-2 text-right">D66</TableHead>
                                        <TableHead className="font-bold text-lg h-8 px-2">Seed</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableDataTragedy.map((row: any, index: number) => (
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
                                    <TableHead className="font-bold text-lg h-8 px-2 text-right">D66</TableHead>
                                    <TableHead className="font-bold text-lg h-8 px-2">Person</TableHead>
                                    <TableHead className="font-bold text-lg h-8 px-2">Item</TableHead>
                                    <TableHead className="font-bold text-lg h-8 px-2">Citystate</TableHead>
                                    <TableHead className="font-bold text-lg h-8 px-2">Deity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableDataRandom.map((row: any, index: number) => (
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
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
}

const UniversalTableCard = ({ data }: { data: any[] }) => {
  const columns: any[][] = [[], [], [], []];
  
  // Split data into four columns. 20 items per column.
  const itemsPerColumn = Math.ceil(data.length / 4);
  data.forEach((item, index) => {
    const columnIndex = Math.floor(index / itemsPerColumn);
    if (columns[columnIndex]) {
      columns[columnIndex].push(item);
    }
  });

  return (
    <Card className="bg-white overflow-hidden">
        <AccordionItem value="universal-table" className="border-b-0">
            <AccordionTrigger className="p-6 hover:no-underline">
                <CardTitle>Universal Table</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8">
                    {columns.map((column, colIndex) => (
                        <Table key={colIndex}>
                        <TableHeader>
                            <TableRow className="border-b-2 border-black">
                            <TableHead className="font-bold text-lg h-8 px-2 text-right">Index</TableHead>
                            <TableHead className="font-bold text-lg h-8 px-2 text-right">Scalar</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {column.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                <TableCell className="py-2 px-2 text-right font-bold">{row.Index}</TableCell>
                                <TableCell className="py-2 px-2 text-right">{row.Scalar}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    ))}
                    </div>
                </CardContent>
            </AccordionContent>
        </AccordionItem>
    </Card>
  );
};

const BeliefsAndDeitiesCard = ({ beliefs, deities }: { beliefs: any[], deities: any[] }) => {
    return (
        <Card className="bg-white overflow-hidden">
            <AccordionItem value="beliefs-and-deities" className="border-b-0">
                <AccordionTrigger className="p-6 hover:no-underline">
                    <CardTitle>Beliefs &amp; Deities</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="pt-6 space-y-12">
                        <div>
                            <h4 className="text-lg mb-2 font-sans">Beliefs</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-black">
                                        <TableHead className="font-bold text-lg h-8 px-2">Keyword</TableHead>
                                        <TableHead className="font-bold text-lg h-8 px-2">Description</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {beliefs.map((row: any) => (
                                        <TableRow key={row.keyword}>
                                            <TableCell className="py-2 px-2 font-bold">{row.keyword}</TableCell>
                                            <TableCell className="py-2 px-2">{row.description}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-12">
                            <h4 className="text-lg mb-2 font-sans">Deities</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-black">
                                        <TableHead className="font-bold text-lg h-8 px-2">Deity</TableHead>
                                        <TableHead className="font-bold text-lg h-8 px-2">Domains</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deities.map((row: any) => (
                                        <TableRow key={row.deity}>
                                            <TableCell className="py-2 px-2 font-bold">{row.deity}</TableCell>
                                            <TableCell className="py-2 px-2">{Array.isArray(row.domains) ? row.domains.join(', ') : row.domains}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
};

const SalaryCard = ({ rankData, adjustmentData }: { rankData: any[], adjustmentData: any[] }) => {
    const rankTableData = rankData;
    const rankHeaders = ['Rank', 'Monthly', 'Daily', 'Wealth Rank'];
    
    const adjustmentTableData = adjustmentData;
    const adjustmentHeaders = ['Trade', 'Rank 1', 'Rank 2', 'Rank 3-4', 'Rank 5-7', 'Rank 8+'];

    return (
        <Card className="bg-white overflow-hidden">
            <AccordionItem value="salary" className="border-b-0">
                <AccordionTrigger className="p-6 hover:no-underline">
                    <CardTitle>Salary</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent className="pt-6 space-y-12">
                        <div>
                            <h4 className="text-lg mb-2 font-sans">Salary by Trade Rank</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Monthly and Daily salaries are presented in units of silver pieces (sp).
                            </p>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-black">
                                        {rankHeaders.map(header => (
                                            <TableHead key={header} className="font-bold text-lg h-8 px-2 text-right">{header}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rankTableData.map((row: any, index: number) => (
                                        <TableRow key={index}>
                                            <TableCell className="py-2 px-2 text-right font-bold">{row['Rank']}</TableCell>
                                            <TableCell className="py-2 px-2 text-right">{row.Monthly}</TableCell>
                                            <TableCell className="py-2 px-2 text-right">{row.Daily}</TableCell>
                                            <TableCell className="py-2 px-2 text-right">{row['Wealth Rank']}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-12">
                            <h4 className="text-lg mb-2 font-sans">Salary Adjustments by Trade</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Index offsets to adjust Wealth Rank based on Trade.
                            </p>
                             <Table>
                                <TableHeader>
                                    <TableRow className="border-b-2 border-black">
                                    {adjustmentHeaders.map((header, headerIndex) => (
                                        <TableHead key={header} className={cn("font-bold text-lg h-8 px-2", { 'text-right': headerIndex > 0})}>{header}</TableHead>
                                    ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {adjustmentTableData.map((row: any, index: number) => (
                                    <TableRow key={index}>
                                        <TableCell className="py-2 px-2 font-bold">{row.Trade}</TableCell>
                                        <TableCell className="py-2 px-2 text-right">{row['Rank 1']}</TableCell>
                                        <TableCell className="py-2 px-2 text-right">{row['Rank 2']}</TableCell>
                                        <TableCell className="py-2 px-2 text-right">{row['Rank 3-4']}</TableCell>
                                        <TableCell className="py-2 px-2 text-right">{row['Rank 5-7']}</TableCell>
                                        <TableCell className="py-2 px-2 text-right">{row['Rank 8+']}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
};


// Main Info component
export default function Info({ data }: { data: StaticData }) {
  const {
    ageBrackets,
    attributeModifiers,
    characteristicModifiers,
    ageGroups,
    attributeArrays,
    attributeDefinitions,
    beliefs,
    calculatedAbilities,
    characteristicCosts,
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
    salaryByTradeRank,
    salaryAdjustmentsByTrade,
    settlements,
    socialGroups,
    socialRanks,
    species,
    tragedySeeds,
    traits,
    universalTable,
    wealthTitles,
    steps,
  } = data;

  return (
    <Accordion type="multiple" className="space-y-8 max-w-[960px] mx-auto">
      <AdjustmentsByLineageCard data={data} />
      <AdjustmentsByAgeGroupCard attributeModifiers={attributeModifiers} characteristicModifiers={characteristicModifiers} />
      <FilterableTableCard title="Age Brackets" data={ageBrackets} />
      <SimpleTableCard title="Characteristic Costs" data={characteristicCosts} />
      <SimpleTableCard title="Age Groups" data={ageGroups} />
      <FilterableTableCard title="Attribute Arrays" data={attributeArrays} />
      <AttributeDefinitionsCard data={attributeDefinitions} />
      <BeliefsAndDeitiesCard beliefs={beliefs} deities={deities} />
      <CalculatedAbilitiesCard data={calculatedAbilities} />
      <SimpleTableCard title="City States" data={citystates} />
      <SimpleTableCard title="Descriptors" data={descriptors} headers={['d66', '1,2', '3,4', '5,6']}/>
      <SimpleTableCard title="Disabilities" data={disabilities} />
      <ListCard title="Economic Statuses" data={economicStatuses} />
      <EmpiresCard data={empires} />
      <HeritageCard cultural={culturalHeritage} environ={environHeritage} societal={societalHeritage} />
      <ProfessionsAndTitlesCard professions={professions} titles={namingPracticeTitles} />
      <SimpleTableCard title="Notable Features" data={notableFeatures} />
      <SimpleTableCard title="Physical Blemishes" data={physicalBlemishes} headers={['d66', '1,2,3', '4,5,6']}/>
      <SimpleTableCard title="PML Titles" data={pmlTitles} />
      <SimpleTableCard title="Point Buy Costs" data={pointBuyCosts} />
      <SalaryCard rankData={salaryByTradeRank} adjustmentData={salaryAdjustmentsByTrade} />
      <FilterableTableCard title="Settlements" data={settlements} />
      <SimpleTableCard title="Social Groups" data={socialGroups} />
      <SimpleTableCard title="Social Ranks" data={socialRanks} />
      <SpeciesCard data={species} />
      <TragedySeedsCard tragedySeeds={tragedySeeds} randomPersonItemDeity={data.randomPersonItemDeity} />
      <TraitsCard data={traits} />
      <UniversalTableCard data={universalTable} />
      <SimpleTableCard title="Wealth Titles" data={wealthTitles} />
    </Accordion>
  );
}
