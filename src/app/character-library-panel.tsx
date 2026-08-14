'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, SlidersHorizontal } from 'lucide-react';
import type { StaticData } from '@/data';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CharacterDraft } from '@/lib/character-draft';

type FileCharacter = {
  idName: string;
  name: string;
  properName: string;
  speciesId: string | null;
  lineageId: string | null;
  tradeId: string | null;
  professionId: string | null;
  thumbnailUrl: string | null;
  updatedAt: string;
  childOfStrife?: boolean;
  strifePairingId?: string | null;
  strifeFatherLineageId?: string | null;
  strifeMotherLineageId?: string | null;
};

type SortColumn = 'filename' | 'name' | 'identity' | 'profession' | 'updated';
type SortDirection = 'asc' | 'desc';
type Filters = { filename: string; name: string; identity: string; profession: string };

const SORT_STORAGE_KEY = 'dxd-chargen-library-sort';
const DEFAULT_SORT = { column: 'updated' as SortColumn, direction: 'desc' as SortDirection };
const EMPTY_FILTERS: Filters = { filename: '', name: '', identity: '', profession: '' };
const compareText = (left: string, right: string) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
const updatedTimestamp = (value: string) => {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', timeZoneName: 'longOffset', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? '';
  return { date: `${part('year')}-${part('month')}-${part('day')},`, time: `${part('hour')}:${part('minute')}:${part('second')} ${part('timeZoneName')}` };
};

export default function CharacterLibraryPanel({
  data,
  refreshKey,
  onOpen,
}: {
  data: StaticData;
  refreshKey: number;
  onOpen: (idName: string, draft: CharacterDraft) => void;
}) {
  const [characters, setCharacters] = useState<FileCharacter[]>([]);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SORT_STORAGE_KEY) ?? 'null');
      if (['filename', 'name', 'identity', 'profession', 'updated'].includes(saved?.column) && ['asc', 'desc'].includes(saved?.direction)) {
        setSort({ column: saved.column as SortColumn, direction: saved.direction as SortDirection });
      }
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
  }, [sort]);

  useEffect(() => {
    setError('');
    void fetch('/api/character-files', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Library request failed.');
        return response.json();
      })
      .then((value) => setCharacters(value.characters ?? []))
      .catch(() => setError('Unable to read the character data directory.'));
  }, [refreshKey]);

  const identity = (entry: FileCharacter) => {
    if (entry.childOfStrife) {
      const pairingNames: Record<string, string> = { hobit: 'Hobit', havef: 'Havef', habbit: 'Habbit', brodie: 'Brodie', gnauver: 'Gnauver', 'num-num': 'Num-num', alarf: 'Alarf', balef: 'Balef', draufling: 'Draufling', gnobbit: 'Gnobbit', gnobling: 'Gnobling' };
      const lineage = [entry.strifeFatherLineageId, entry.strifeMotherLineageId].map((value) => value?.replace(/^lineage-/, '').replace(/(^|-)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)).filter(Boolean).join('-');
      return ['Humaniki', entry.strifePairingId ? pairingNames[entry.strifePairingId] : null, lineage].filter(Boolean).join(' / ');
    }
    const group = data.species.flatMap((family) => family.groups).find((item) => item.catalogId === entry.speciesId);
    const family = data.species.find((item) => item.groups.some((candidate) => candidate.catalogId === entry.speciesId));
    const lineage = group?.lineages.find((name) => `lineage-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` === entry.lineageId);
    return [family?.displayName, group?.name, lineage].filter(Boolean).join(' / ') || '—';
  };

  const profession = (entry: FileCharacter) => {
    const trade = data.tradePackages.find((item) => `trade-${item.trade.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` === entry.tradeId);
    const specialization = trade?.specializations.find((item) => `specialization-${`${trade.trade}-${item.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` === entry.professionId);
    return [trade?.trade, specialization?.name].filter(Boolean).join(' / ') || '—';
  };

  const rows = useMemo(() => characters.map((entry) => ({ entry, identity: identity(entry), profession: profession(entry) })), [characters, data]);
  const visibleRows = useMemo(() => {
    const normalized = Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, value.trim().toLocaleLowerCase()])) as Filters;
    return rows
      .filter(({ entry, identity: identityValue, profession: professionValue }) =>
        entry.idName.toLocaleLowerCase().includes(normalized.filename)
        && entry.name.toLocaleLowerCase().includes(normalized.name)
        && identityValue.toLocaleLowerCase().includes(normalized.identity)
        && professionValue.toLocaleLowerCase().includes(normalized.profession))
      .sort((left, right) => {
        const values: Record<SortColumn, [string, string]> = {
          filename: [left.entry.idName, right.entry.idName],
          name: [left.entry.name, right.entry.name],
          identity: [left.identity, right.identity],
          profession: [left.profession, right.profession],
          updated: [left.entry.updatedAt, right.entry.updatedAt],
        };
        const result = sort.column === 'updated'
          ? new Date(values.updated[0]).getTime() - new Date(values.updated[1]).getTime()
          : compareText(...values[sort.column]);
        return sort.direction === 'asc' ? result : -result;
      });
  }, [filters, rows, sort]);

  const open = async (idName: string) => {
    const response = await fetch(`/api/character-files/${encodeURIComponent(idName)}`, { cache: 'no-store' });
    if (!response.ok) return setError('Unable to load that character.');
    const value = await response.json();
    onOpen(idName, value.draft);
  };

  const toggleSort = (column: SortColumn) => setSort((current) => current.column === column
    ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { column, direction: column === 'updated' ? 'desc' : 'asc' });
  const setFilter = (column: keyof Filters, value: string) => setFilters((current) => ({ ...current, [column]: value }));
  const SortHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => {
    const active = sort.column === column;
    return <button type="button" onClick={() => toggleSort(column)} className="inline-flex items-center gap-1 whitespace-nowrap font-semibold hover:underline" aria-label={`Sort by ${String(children)}`} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>{children}{!active ? <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" /> : sort.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}</button>;
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 pb-8">
      <Card><CardHeader><CardTitle role="heading" aria-level={1}>Character Library</CardTitle><CardDescription>Filesystem characters from data/characters. Filter or sort the table, then select a row to load it into Forge.</CardDescription></CardHeader></Card>
      {error && <div className="rounded border border-[#990000] p-3 text-sm text-[#990000]">{error}</div>}
      <div className="sticky top-14 z-30 space-y-2 border-y bg-background/95 py-2 backdrop-blur lg:hidden">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={filters.name} onChange={(event) => setFilter('name', event.target.value)} placeholder="Search character names" aria-label="Filter by character name" className="pl-9" />
          </div>
          <Button type="button" size="icon" variant={mobileFiltersOpen ? 'default' : 'outline'} onClick={() => setMobileFiltersOpen((value) => !value)} aria-label="Show Library filters" aria-expanded={mobileFiltersOpen}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort.column} onValueChange={(value) => setSort((current) => ({ ...current, column: value as SortColumn }))}>
            <SelectTrigger className="min-w-0 flex-1" aria-label="Sort Library by"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="name">Character name</SelectItem>
              <SelectItem value="identity">Species / Group / Lineage</SelectItem>
              <SelectItem value="profession">Trade / Profession</SelectItem>
              <SelectItem value="filename">Filename</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="icon" variant="outline" onClick={() => setSort((current) => ({ ...current, direction: current.direction === 'asc' ? 'desc' : 'asc' }))} aria-label={`Sort ${sort.direction === 'asc' ? 'descending' : 'ascending'}`}>
            {sort.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
          <span className="whitespace-nowrap text-xs text-muted-foreground">{visibleRows.length} shown</span>
        </div>
        {mobileFiltersOpen && <div className="grid gap-2 rounded-lg border bg-card p-3">
          <Input value={filters.identity} onChange={(event) => setFilter('identity', event.target.value)} placeholder="Species, group, or lineage" aria-label="Filter by species, group, or lineage" />
          <Input value={filters.profession} onChange={(event) => setFilter('profession', event.target.value)} placeholder="Trade or profession" aria-label="Filter by trade or profession" />
          <Input value={filters.filename} onChange={(event) => setFilter('filename', event.target.value)} placeholder="Filename" aria-label="Filter by filename" />
          {Object.values(filters).some(Boolean) && <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear all filters</Button>}
        </div>}
      </div>

      <div className="space-y-3 lg:hidden">
        {visibleRows.map(({ entry, identity: identityValue, profession: professionValue }) => <article key={entry.idName} className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex gap-3">
            <img src={entry.thumbnailUrl ? `${entry.thumbnailUrl}?v=${encodeURIComponent(entry.updatedAt)}` : '/character-creator/img/portrait-placeholder.png'} alt="" className="h-20 w-24 shrink-0 rounded border object-cover" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{entry.name || 'Unnamed character'}</h3>
              {entry.properName && entry.properName !== entry.name && <p className="text-xs text-muted-foreground">{entry.properName}</p>}
              <p className="mt-2 text-sm">{identityValue}</p>
              <p className="text-sm">{professionValue}</p>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t pt-3 text-xs">
            <dt className="text-muted-foreground">Updated</dt><dd><span>{updatedTimestamp(entry.updatedAt).date}</span> <span className="whitespace-nowrap">{updatedTimestamp(entry.updatedAt).time}</span></dd>
            <dt className="text-muted-foreground">Filename</dt><dd className="truncate font-mono" title={entry.idName}>{entry.idName}</dd>
          </dl>
          <Button className="mt-3 w-full" size="sm" onClick={() => void open(entry.idName)}>Load character</Button>
        </article>)}
        {!visibleRows.length && <div className="rounded-lg border p-10 text-center text-muted-foreground">{characters.length ? 'No characters match the current filters.' : 'No saved characters.'}</div>}
      </div>

      <div className="hidden rounded-lg border lg:block">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Saved characters. Sort and filter by name, identity, profession, update time, or filename.</caption>
          <colgroup><col className="w-[96px]" /><col className="w-[18%]" /><col /><col className="w-[19%]" /><col className="w-[155px]" /><col className="w-[135px]" /><col className="w-[82px]" /></colgroup>
          <thead className="sticky top-14 z-20 bg-background shadow-sm">
            <tr>
              <th className="p-3 text-left">Portrait</th>
              <th className="p-3 text-left"><SortHeader column="name">Character Name</SortHeader></th>
              <th className="p-3 text-left"><SortHeader column="identity">Species / Group / Lineage</SortHeader></th>
              <th className="p-3 text-left"><SortHeader column="profession">Trade / Profession</SortHeader></th>
              <th className="p-3 text-left"><SortHeader column="updated">Updated</SortHeader></th>
              <th className="p-3 text-left"><SortHeader column="filename">Filename</SortHeader></th>
              <th className="p-3" />
            </tr>
            <tr className="border-t">
              <th className="p-2" />
              <th className="p-2"><Input value={filters.name} onChange={(event) => setFilter('name', event.target.value)} placeholder="Filter name" aria-label="Filter by character name" className="h-8 bg-background font-normal" /></th>
              <th className="p-2"><Input value={filters.identity} onChange={(event) => setFilter('identity', event.target.value)} placeholder="Filter species, group, lineage" aria-label="Filter by species, group, or lineage" className="h-8 bg-background font-normal" /></th>
              <th className="p-2"><Input value={filters.profession} onChange={(event) => setFilter('profession', event.target.value)} placeholder="Filter trade or profession" aria-label="Filter by trade or profession" className="h-8 bg-background font-normal" /></th>
              <th className="p-2" />
              <th className="p-2"><Input value={filters.filename} onChange={(event) => setFilter('filename', event.target.value)} placeholder="Filename" aria-label="Filter by filename" className="h-8 bg-background font-normal" /></th>
              <th className="p-2 text-right">{Object.values(filters).some(Boolean) && <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear</Button>}</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ entry, identity: identityValue, profession: professionValue }) => <tr key={entry.idName} className="border-t hover:bg-muted/30">
              <td className="p-2"><img src={entry.thumbnailUrl ? `${entry.thumbnailUrl}?v=${encodeURIComponent(entry.updatedAt)}` : '/character-creator/img/portrait-placeholder.png'} alt="" className="h-16 w-20 rounded border object-cover" /></td>
              <td className="p-3 font-medium"><span className="block">{entry.name || '—'}</span>{entry.properName && entry.properName !== entry.name && <span className="block text-xs font-normal text-muted-foreground">{entry.properName}</span>}</td>
              <td className="p-3">{identityValue}</td>
              <td className="p-3">{professionValue}</td>
              <td className="p-3 text-xs text-muted-foreground"><span className="block">{updatedTimestamp(entry.updatedAt).date}</span><span className="block whitespace-nowrap">{updatedTimestamp(entry.updatedAt).time}</span></td>
              <td className="break-all p-3 font-mono text-[11px]">{entry.idName}</td>
              <td className="p-3 text-right"><Button size="sm" onClick={() => void open(entry.idName)}>Load</Button></td>
            </tr>)}
            {!visibleRows.length && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">{characters.length ? 'No characters match the current filters.' : 'No saved characters.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
