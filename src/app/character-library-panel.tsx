'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { StaticData } from '@/data';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
      <Card><CardHeader><CardTitle>Character Library</CardTitle><CardDescription>Filesystem characters from data/characters. Filter or sort the table, then select a row to load it into Forge.</CardDescription></CardHeader></Card>
      {error && <div className="rounded border border-[#990000] p-3 text-sm text-[#990000]">{error}</div>}
      <div className="max-h-[calc(100vh-13rem)] overflow-auto rounded-lg border">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="sticky top-0 z-20 bg-background shadow-sm">
            <tr>
              <th className="p-3 text-left">Portrait</th>
              <th className="p-3 text-left"><SortHeader column="name">Character Name</SortHeader></th>
              <th className="p-3 text-left"><SortHeader column="identity">Species / Group / Lineage</SortHeader></th>
              <th className="p-3 text-left"><SortHeader column="profession">Trade / Profession</SortHeader></th>
              <th className="p-3 text-left"><SortHeader column="updated">Updated</SortHeader></th>
              <th className="w-[150px] max-w-[150px] p-3 text-left"><SortHeader column="filename">Filename</SortHeader></th>
              <th className="p-3" />
            </tr>
            <tr className="border-t">
              <th className="p-2" />
              <th className="p-2"><Input value={filters.name} onChange={(event) => setFilter('name', event.target.value)} placeholder="Filter name" aria-label="Filter by character name" className="h-8 bg-background font-normal" /></th>
              <th className="p-2"><Input value={filters.identity} onChange={(event) => setFilter('identity', event.target.value)} placeholder="Filter species, group, lineage" aria-label="Filter by species, group, or lineage" className="h-8 bg-background font-normal" /></th>
              <th className="p-2"><Input value={filters.profession} onChange={(event) => setFilter('profession', event.target.value)} placeholder="Filter trade or profession" aria-label="Filter by trade or profession" className="h-8 bg-background font-normal" /></th>
              <th className="p-2" />
              <th className="w-[150px] max-w-[150px] p-2"><Input value={filters.filename} onChange={(event) => setFilter('filename', event.target.value)} placeholder="Filename" aria-label="Filter by filename" className="h-8 bg-background font-normal" /></th>
              <th className="p-2 text-right">{Object.values(filters).some(Boolean) && <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear</Button>}</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ entry, identity: identityValue, profession: professionValue }) => <tr key={entry.idName} className="border-t hover:bg-muted/30">
              <td className="p-2"><img src={entry.thumbnailUrl ? `${entry.thumbnailUrl}?v=${encodeURIComponent(entry.updatedAt)}` : '/portrait-placeholder.png'} alt="" className="h-16 w-20 rounded border object-cover" /></td>
              <td className="p-3 font-medium"><span className="block">{entry.name || '—'}</span>{entry.properName && entry.properName !== entry.name && <span className="block text-xs font-normal text-muted-foreground">{entry.properName}</span>}</td>
              <td className="p-3">{identityValue}</td>
              <td className="p-3">{professionValue}</td>
              <td className="p-3 text-xs text-muted-foreground"><span className="block">{updatedTimestamp(entry.updatedAt).date}</span><span className="block whitespace-nowrap">{updatedTimestamp(entry.updatedAt).time}</span></td>
              <td className="w-[150px] max-w-[150px] break-all p-3 font-mono text-[11px]">{entry.idName}</td>
              <td className="p-3 text-right"><Button size="sm" onClick={() => void open(entry.idName)}>Load</Button></td>
            </tr>)}
            {!visibleRows.length && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">{characters.length ? 'No characters match the current filters.' : 'No saved characters.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
