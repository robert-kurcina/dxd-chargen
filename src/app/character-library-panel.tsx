'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Search, SlidersHorizontal } from 'lucide-react';
import type { StaticData } from '@/data';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import ConfirmDialog from '@/components/confirm-dialog';
import TokenField from '@/components/token-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CharacterDraft } from '@/lib/character-draft';
import { ADMIN_SETTINGS_EVENT, readAdminSettings, sortLibraryTags } from '@/lib/admin-settings';
import { buildCharacterSheetPayload } from '@/app/expanded-character-sheet';
import { projectCharacterSheet } from '@/lib/character-sheet-projection';
import { createImagePdf, downloadBlob } from '@/lib/browser-pdf';

export type FileCharacter = {
  idName: string;
  name: string;
  properName: string;
  speciesId: string | null;
  lineageId: string | null;
  tradeId: string | null;
  professionId: string | null;
  libraryTags?: string[];
  thumbnailUrl: string | null;
  updatedAt: string;
  childOfStrife?: boolean;
  strifePairingId?: string | null;
  strifeFatherLineageId?: string | null;
  strifeMotherLineageId?: string | null;
};

type SortColumn = 'filename' | 'name' | 'ancestry' | 'profession' | 'updated' | 'tags';
type SortDirection = 'asc' | 'desc';
type Filters = { filename: string; name: string; ancestry: string; profession: string; tags: string };
type ColumnId = 'portrait' | 'name' | 'tags' | 'ancestry' | 'profession' | 'updated' | 'filename';

const SORT_STORAGE_KEY = 'dxd-chargen-library-sort-v3';
const COLUMN_STORAGE_KEY = 'dxd-chargen-library-columns-v1';
const DEFAULT_SORT = { column: 'name' as SortColumn, direction: 'asc' as SortDirection };
const EMPTY_FILTERS: Filters = { filename: '', name: '', ancestry: '', profession: '', tags: 'all' };
const DEFAULT_COLUMNS: ColumnId[] = ['portrait', 'name', 'tags'];
const COLUMN_OPTIONS: Array<{ id: ColumnId; label: string }> = [
  { id: 'portrait', label: 'Portrait' },
  { id: 'name', label: 'Character Name' },
  { id: 'tags', label: 'Tags' },
  { id: 'ancestry', label: 'Ancestry' },
  { id: 'profession', label: 'Profession' },
  { id: 'updated', label: 'Timestamp' },
  { id: 'filename', label: 'Filename' },
];
const compareText = (left: string, right: string) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
const updatedTimestamp = (value: string) => {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', timeZoneName: 'longOffset', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? '';
  return { date: `${part('year')}-${part('month')}-${part('day')},`, time: `${part('hour')}:${part('minute')}:${part('second')} ${part('timeZoneName')}` };
};
const sortedTags = (entry: FileCharacter) => sortLibraryTags(entry.libraryTags ?? []);

export default function CharacterLibraryPanel({
  data,
  refreshKey = 0,
  onOpen,
  adminMode = false,
}: {
  data: StaticData;
  refreshKey?: number;
  onOpen?: (idName: string, draft: CharacterDraft) => void;
  adminMode?: boolean;
}) {
  const [characters, setCharacters] = useState<FileCharacter[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileColumn, setMobileColumn] = useState<ColumnId>(DEFAULT_COLUMNS[0]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_COLUMNS);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagEditing, setTagEditing] = useState(false);
  const [pendingTags, setPendingTags] = useState<Record<string, string[]>>({});
  const [saveTagsConfirmOpen, setSaveTagsConfirmOpen] = useState(false);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const exportFrame = useRef<HTMLIFrameElement>(null);
  const exportFrameReady = useRef(false);

  const reloadCharacters = async () => {
    setError('');
    try {
      const response = await fetch('/api/character-files', { cache: 'no-store' });
      if (!response.ok) throw new Error('Library request failed.');
      const value = await response.json();
      setCharacters(value.characters ?? []);
    } catch {
      setError('Unable to read the character data directory.');
    }
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SORT_STORAGE_KEY) ?? 'null');
      if (['filename', 'name', 'ancestry', 'profession', 'updated', 'tags'].includes(saved?.column) && ['asc', 'desc'].includes(saved?.direction)) setSort({ column: saved.column as SortColumn, direction: saved.direction as SortDirection });
      const savedColumns = JSON.parse(window.localStorage.getItem(`${COLUMN_STORAGE_KEY}-${adminMode ? 'admin' : 'library'}`) ?? 'null');
      if (Array.isArray(savedColumns)) {
        const valid = savedColumns.filter((column): column is ColumnId => COLUMN_OPTIONS.some((option) => option.id === column));
        if (valid.length) setVisibleColumns(valid);
      }
    } catch {}
  }, [adminMode]);
  useEffect(() => { window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort)); }, [sort]);
  useEffect(() => { window.localStorage.setItem(`${COLUMN_STORAGE_KEY}-${adminMode ? 'admin' : 'library'}`, JSON.stringify(visibleColumns)); }, [visibleColumns, adminMode]);
  useEffect(() => {
    if (visibleColumns.includes(mobileColumn)) return;
    const firstVisible = COLUMN_OPTIONS.find((option) => visibleColumns.includes(option.id));
    if (firstVisible) setMobileColumn(firstVisible.id);
  }, [mobileColumn, visibleColumns]);
  useEffect(() => {
    const syncTags = () => setAvailableTags(sortLibraryTags(readAdminSettings().libraryTags));
    syncTags();
    window.addEventListener(ADMIN_SETTINGS_EVENT, syncTags as EventListener);
    return () => window.removeEventListener(ADMIN_SETTINGS_EVENT, syncTags as EventListener);
  }, []);
  useEffect(() => { void reloadCharacters(); }, [refreshKey]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source === exportFrame.current?.contentWindow && event.data?.type === 'dxd-character-sheet-ready') exportFrameReady.current = true;
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  const ancestry = (entry: FileCharacter) => {
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
    const humanize = (value: string) => value.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    const trade = data.tradePackages.find((item) => `trade-${item.trade.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` === entry.tradeId);
    const specialization = trade?.specializations.find((item) => `specialization-${`${trade.trade}-${item.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` === entry.professionId);
    const fallbackTrade = entry.tradeId ? humanize(entry.tradeId.replace(/^trade-/, '')) : '';
    const tradeName = trade?.trade ?? fallbackTrade;
    const specializationSlug = entry.professionId?.replace(/^specialization-/, '') ?? '';
    const tradeSlug = entry.tradeId?.replace(/^trade-/, '') ?? '';
    const fallbackSpecialization = specializationSlug ? humanize(specializationSlug.startsWith(`${tradeSlug}-`) ? specializationSlug.slice(tradeSlug.length + 1) : specializationSlug) : '';
    return [tradeName, specialization?.name ?? fallbackSpecialization].filter(Boolean).join(' / ') || '—';
  };
  const exposedTags = (entry: FileCharacter) => sortedTags(entry).filter((tag) => availableTags.includes(tag));
  const displayTags = (entry: FileCharacter) => adminMode ? sortedTags(entry) : exposedTags(entry);
  const rows = useMemo(() => characters.map((entry) => ({ entry, ancestry: ancestry(entry), profession: profession(entry) })), [characters, data]);
  const visibleRows = useMemo(() => {
    const normalized = { ...filters, filename: filters.filename.trim().toLocaleLowerCase(), name: filters.name.trim().toLocaleLowerCase(), ancestry: filters.ancestry.trim().toLocaleLowerCase(), profession: filters.profession.trim().toLocaleLowerCase() };
    return rows
      .filter(({ entry, ancestry: ancestryValue, profession: professionValue }) => {
        const tags = displayTags(entry);
        return (filters.tags === 'all' || tags.includes(filters.tags))
          && entry.idName.toLocaleLowerCase().includes(normalized.filename)
          && entry.name.toLocaleLowerCase().includes(normalized.name)
          && ancestryValue.toLocaleLowerCase().includes(normalized.ancestry)
          && professionValue.toLocaleLowerCase().includes(normalized.profession);
      })
      .sort((left, right) => {
        const values: Record<SortColumn, [string, string]> = {
          filename: [left.entry.idName, right.entry.idName],
          name: [left.entry.name, right.entry.name],
          ancestry: [left.ancestry, right.ancestry],
          profession: [left.profession, right.profession],
          updated: [left.entry.updatedAt, right.entry.updatedAt],
          tags: [displayTags(left.entry).join(', '), displayTags(right.entry).join(', ')],
        };
        const result = sort.column === 'updated' ? new Date(values.updated[0]).getTime() - new Date(values.updated[1]).getTime() : compareText(...values[sort.column]);
        return sort.direction === 'asc' ? result : -result;
      });
  }, [filters, rows, sort, availableTags, adminMode]);

  const open = async (idName: string) => {
    if (!onOpen) return;
    const response = await fetch(`/api/character-files/${encodeURIComponent(idName)}`, { cache: 'no-store' });
    if (!response.ok) return setError('Unable to load that character.');
    const value = await response.json();
    onOpen(idName, value.draft);
  };
  const toggleSort = (column: SortColumn) => setSort((current) => current.column === column ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { column, direction: column === 'updated' ? 'desc' : 'asc' });
  const setFilter = (column: keyof Filters, value: string) => setFilters((current) => ({ ...current, [column]: value }));
  const isVisible = (column: ColumnId) => visibleColumns.includes(column);
  const toggleColumn = (column: ColumnId) => setVisibleColumns((current) => current.includes(column) ? current.filter((item) => item !== column) : COLUMN_OPTIONS.map((option) => option.id).filter((item) => item === column || current.includes(item)));
  const SortHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => {
    const active = sort.column === column;
    return <button type="button" onClick={() => toggleSort(column)} className="inline-flex items-center gap-1 whitespace-nowrap font-semibold hover:underline" aria-label={`Sort by ${String(children)}`} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>{children}{!active ? <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" /> : sort.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}</button>;
  };

  const beginTagEditing = () => {
    setPendingTags(Object.fromEntries(characters.map((entry) => [entry.idName, sortedTags(entry)])));
    setTagEditing(true);
    setMessage('Tag editing enabled.');
  };
  const cancelTagEditing = () => { setTagEditing(false); setPendingTags({}); setMessage('Tag edits canceled.'); };
  const changedTagEntries = characters.filter((entry) => JSON.stringify(sortedTags(entry)) !== JSON.stringify(sortLibraryTags(pendingTags[entry.idName] ?? sortedTags(entry))));
  const saveTagUpdates = async () => {
    setSavingTags(true);
    try {
      const updates = changedTagEntries.map((entry) => ({ idName: entry.idName, libraryTags: sortLibraryTags(pendingTags[entry.idName] ?? []) }));
      const response = await fetch('/api/character-files/tags', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
      if (!response.ok) throw new Error('Tag update failed.');
      await reloadCharacters();
      setTagEditing(false); setPendingTags({}); setSaveTagsConfirmOpen(false); setMessage(`${updates.length} character${updates.length === 1 ? '' : 's'} updated.`);
    } catch { setError('Unable to update character tags.'); }
    finally { setSavingTags(false); }
  };

  const waitForFrameReady = () => new Promise<void>((resolve, reject) => {
    if (exportFrameReady.current && exportFrame.current?.contentWindow) return resolve();
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Character sheet renderer did not become ready.')); }, 15000);
    const onMessage = (event: MessageEvent) => { if (event.source === exportFrame.current?.contentWindow && event.data?.type === 'dxd-character-sheet-ready') { exportFrameReady.current = true; cleanup(); resolve(); } };
    const cleanup = () => { window.clearTimeout(timeout); window.removeEventListener('message', onMessage); };
    window.addEventListener('message', onMessage);
  });
  const renderDraftPages = async (draft: CharacterDraft) => {
    await waitForFrameReady();
    const frameWindow = exportFrame.current?.contentWindow;
    if (!frameWindow) throw new Error('Character sheet renderer is unavailable.');
    const requestId = crypto.randomUUID();
    const payload = buildCharacterSheetPayload(draft, projectCharacterSheet(draft, data), data);
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Character sheet did not load.')); }, 15000);
      const onMessage = (event: MessageEvent) => { if (event.source === frameWindow && event.data?.type === 'dxd-character-sheet-loaded' && event.data.requestId === requestId) { cleanup(); resolve(); } };
      const cleanup = () => { window.clearTimeout(timeout); window.removeEventListener('message', onMessage); };
      window.addEventListener('message', onMessage);
      frameWindow.postMessage({ type: 'dxd-character-sheet', requestId, payload }, window.location.origin);
    });
    return new Promise<string[]>((resolve, reject) => {
      const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Character sheet PDF render timed out.')); }, 45000);
      const onMessage = (event: MessageEvent) => {
        if (event.source !== frameWindow || event.data?.requestId !== requestId) return;
        if (event.data?.type === 'dxd-character-sheet-export-result') { cleanup(); resolve(Array.isArray(event.data.pages) ? event.data.pages : []); }
        if (event.data?.type === 'dxd-character-sheet-export-error') { cleanup(); reject(new Error(event.data.error || 'Character sheet PDF render failed.')); }
      };
      const cleanup = () => { window.clearTimeout(timeout); window.removeEventListener('message', onMessage); };
      window.addEventListener('message', onMessage);
      frameWindow.postMessage({ type: 'dxd-character-sheet-export-request', requestId }, window.location.origin);
    });
  };
  const exportSelectedCharacters = async () => {
    setExportConfirmOpen(false); setExporting(true); setMessage('Building character PDF…'); setError('');
    try {
      const selected = characters.filter((entry) => selectedIds.has(entry.idName)).sort((left, right) => compareText(left.name || left.idName, right.name || right.idName) || compareText(left.idName, right.idName));
      const pageImages: string[] = [];
      for (const entry of selected) {
        const response = await fetch(`/api/character-files/${encodeURIComponent(entry.idName)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Unable to load ${entry.idName}.`);
        const value = await response.json();
        pageImages.push(...await renderDraftPages(value.draft));
      }
      downloadBlob(createImagePdf(pageImages), 'character-library-admin.pdf');
      setMessage(`Exported ${selected.length} character${selected.length === 1 ? '' : 's'} in alphanumeric order.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'PDF export failed.'); }
    finally { setExporting(false); }
  };

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(({ entry }) => selectedIds.has(entry.idName));
  const toggleSelected = (idName: string, checked: boolean) => setSelectedIds((current) => { const next = new Set(current); if (checked) next.add(idName); else next.delete(idName); return next; });
  const toggleVisibleSelection = (checked: boolean) => setSelectedIds((current) => { const next = new Set(current); visibleRows.forEach(({ entry }) => checked ? next.add(entry.idName) : next.delete(entry.idName)); return next; });
  const mobileSortColumn: SortColumn | null = mobileColumn === 'portrait' ? null : mobileColumn;
  const chooseMobileColumn = (column: ColumnId) => {
    setMobileColumn(column);
    if (column !== 'portrait') setSort((current) => ({ column, direction: current.column === column ? current.direction : column === 'updated' ? 'desc' : 'asc' }));
  };
  const desktopGridTemplate = [
    adminMode ? '44px' : null,
    isVisible('portrait') ? '92px' : null,
    isVisible('name') ? 'minmax(140px,1.15fr)' : null,
    isVisible('tags') ? 'minmax(170px,1.25fr)' : null,
    isVisible('ancestry') ? 'minmax(130px,1fr)' : null,
    isVisible('profession') ? 'minmax(130px,1fr)' : null,
    isVisible('updated') ? 'minmax(138px,.85fr)' : null,
    isVisible('filename') ? 'minmax(120px,.8fr)' : null,
    onOpen ? '82px' : null,
  ].filter((value): value is string => Boolean(value)).join(' ');
  const anyFilters = Object.values(filters).some((value) => value && value !== 'all');

  const MobilePrimaryFilter = () => {
    if (mobileColumn === 'name') return <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={filters.name} onChange={(event) => setFilter('name', event.target.value)} placeholder="Search character names" aria-label="Filter by character name" className="pl-9" /></div>;
    if (mobileColumn === 'tags') return <Select value={filters.tags} onValueChange={(value) => setFilter('tags', value)}><SelectTrigger className="min-w-0 flex-1" aria-label="Filter by tags"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All tags</SelectItem>{availableTags.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}</SelectContent></Select>;
    if (mobileColumn === 'ancestry') return <Input className="min-w-0 flex-1" value={filters.ancestry} onChange={(event) => setFilter('ancestry', event.target.value)} placeholder="Filter ancestry" aria-label="Filter by ancestry" />;
    if (mobileColumn === 'profession') return <Input className="min-w-0 flex-1" value={filters.profession} onChange={(event) => setFilter('profession', event.target.value)} placeholder="Filter profession" aria-label="Filter by profession" />;
    if (mobileColumn === 'filename') return <Input className="min-w-0 flex-1" value={filters.filename} onChange={(event) => setFilter('filename', event.target.value)} placeholder="Filter filename" aria-label="Filter by filename" />;
    return null;
  };

  return <div className={`mx-auto w-full max-w-[1440px] pb-8 ${adminMode ? 'space-y-2' : 'space-y-4'}`}>
    <Card>
      <CardHeader className="gap-2 p-3 sm:p-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="min-w-0">
          <CardTitle role="heading" aria-level={1} className="text-xl">{adminMode ? 'Characters Library - Admin' : 'Character Library'}</CardTitle>
          {!adminMode && <CardDescription>Filesystem characters from data/characters. Filter or sort the visible columns, then load a character into Forge.</CardDescription>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {adminMode && <Button size="sm" disabled={!selectedIds.size || exporting} onClick={() => setExportConfirmOpen(true)}>{exporting ? 'Exporting…' : 'Export PDF'}</Button>}
          {adminMode && !tagEditing && <Button size="sm" variant="outline" disabled={!selectedIds.size || exporting} onClick={beginTagEditing}>Edit Tags</Button>}
          {adminMode && tagEditing && <><Button size="sm" disabled={!changedTagEntries.length || savingTags} onClick={() => setSaveTagsConfirmOpen(true)}>Save</Button><Button size="sm" variant="outline" disabled={savingTags} onClick={cancelTagEditing}>Cancel</Button></>}
          <div className="relative"><Button size="sm" type="button" variant="outline" onClick={() => setColumnsOpen((value) => !value)} aria-expanded={columnsOpen}><Columns3 className="h-4 w-4" />Columns</Button>{columnsOpen && <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border bg-background p-3 shadow-lg"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visible columns</div><div className="space-y-2">{COLUMN_OPTIONS.map((option) => <label key={option.id} className="flex items-center gap-2 text-sm"><Checkbox checked={visibleColumns.includes(option.id)} onCheckedChange={(checked) => { if (checked || visibleColumns.length > 1) toggleColumn(option.id); }} /><span>{option.label}</span></label>)}</div><Button type="button" size="sm" variant="ghost" className="mt-2 w-full" onClick={() => setVisibleColumns(DEFAULT_COLUMNS)}>Defaults</Button></div>}</div>
        </div>
      </CardHeader>
    </Card>

    {(message || error) && <div className={`rounded-md border px-3 py-2 text-sm ${error ? 'border-red-300 bg-red-50 text-red-800' : 'bg-card text-muted-foreground'}`} role="status">{error || message}</div>}

    <div className={`sticky ${adminMode ? 'top-[44px]' : 'top-14'} z-40 space-y-2 border-b bg-background/95 py-2 backdrop-blur lg:hidden`}>
      <div className="flex items-center gap-2">
        <Select value={mobileColumn} onValueChange={(value) => chooseMobileColumn(value as ColumnId)}><SelectTrigger className="min-w-0 flex-1" aria-label="Active Library column"><SelectValue /></SelectTrigger><SelectContent>{COLUMN_OPTIONS.filter((option) => visibleColumns.includes(option.id)).map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select>
        {mobileSortColumn && <Button type="button" size="icon" variant="outline" onClick={() => setSort((current) => current.column === mobileSortColumn ? { ...current, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { column: mobileSortColumn, direction: mobileSortColumn === 'updated' ? 'desc' : 'asc' })} aria-label={`Sort ${sort.direction === 'asc' ? 'descending' : 'ascending'}`}>{sort.column === mobileSortColumn && sort.direction === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}</Button>}
        <Button type="button" size="icon" variant={mobileFiltersOpen ? 'default' : 'outline'} onClick={() => setMobileFiltersOpen((value) => !value)} aria-label="Show Library filters" aria-expanded={mobileFiltersOpen}><SlidersHorizontal className="h-4 w-4" /></Button>
        <span className="whitespace-nowrap text-xs text-muted-foreground">{visibleRows.length} shown</span>
      </div>
      {MobilePrimaryFilter() && <div className="flex gap-2">{MobilePrimaryFilter()}</div>}
      {mobileFiltersOpen && <div className="grid gap-2 rounded-lg border bg-card p-3">{isVisible('name') && mobileColumn !== 'name' && <Input value={filters.name} onChange={(event) => setFilter('name', event.target.value)} placeholder="Character Name" aria-label="Filter by character name" />}{isVisible('tags') && mobileColumn !== 'tags' && <Select value={filters.tags} onValueChange={(value) => setFilter('tags', value)}><SelectTrigger aria-label="Filter by tags"><SelectValue placeholder="All tags" /></SelectTrigger><SelectContent><SelectItem value="all">All tags</SelectItem>{availableTags.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}</SelectContent></Select>}{isVisible('ancestry') && mobileColumn !== 'ancestry' && <Input value={filters.ancestry} onChange={(event) => setFilter('ancestry', event.target.value)} placeholder="Ancestry" aria-label="Filter by ancestry" />}{isVisible('profession') && mobileColumn !== 'profession' && <Input value={filters.profession} onChange={(event) => setFilter('profession', event.target.value)} placeholder="Profession" aria-label="Filter by profession" />}{isVisible('filename') && mobileColumn !== 'filename' && <Input value={filters.filename} onChange={(event) => setFilter('filename', event.target.value)} placeholder="Filename" aria-label="Filter by filename" />}{anyFilters && <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear all filters</Button>}</div>}
    </div>

    <div className="space-y-3 lg:hidden">{visibleRows.map(({ entry, ancestry: ancestryValue, profession: professionValue }) => <article key={entry.idName} className="rounded-lg border bg-card p-3 shadow-sm">{adminMode && <label className="mb-3 flex items-center gap-2 border-b pb-2 text-sm"><Checkbox checked={selectedIds.has(entry.idName)} onCheckedChange={(checked) => toggleSelected(entry.idName, checked === true)} /><span>Select character</span></label>}<div className="flex gap-3">{isVisible('portrait') && <img src={entry.thumbnailUrl ? `${entry.thumbnailUrl}?v=${encodeURIComponent(entry.updatedAt)}` : '/character-creator/img/portrait-placeholder.png'} alt="" className="h-20 w-24 shrink-0 rounded border object-cover" />}<div className="min-w-0 flex-1">{isVisible('name') && <><h3 className="font-semibold">{entry.name || 'Unnamed character'}</h3>{entry.properName && entry.properName !== entry.name && <p className="text-xs text-muted-foreground">{entry.properName}</p>}</>}{isVisible('ancestry') && <p className="mt-2 text-sm">{ancestryValue}</p>}{isVisible('profession') && <p className="text-sm">{professionValue}</p>}{isVisible('tags') && <div className="mt-2">{adminMode && tagEditing ? <TokenField value={pendingTags[entry.idName] ?? sortedTags(entry)} onChange={(tags) => setPendingTags((current) => ({ ...current, [entry.idName]: tags }))} allowedTokens={availableTags} ariaLabel={`Tags for ${entry.name || entry.idName}`} /> : <div className="flex flex-wrap gap-1">{displayTags(entry).map((tag) => <span key={tag} className="rounded-full border bg-muted px-2 py-0.5 text-[11px]">{tag}</span>)}{!displayTags(entry).length && <span className="text-xs text-muted-foreground">No tags</span>}</div>}</div>}</div></div><dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t pt-3 text-xs">{isVisible('updated') && <><dt className="text-muted-foreground">Timestamp</dt><dd><span>{updatedTimestamp(entry.updatedAt).date}</span> <span className="whitespace-nowrap">{updatedTimestamp(entry.updatedAt).time}</span></dd></>}{isVisible('filename') && <><dt className="text-muted-foreground">Filename</dt><dd className="truncate font-mono" title={entry.idName}>{entry.idName}</dd></>}</dl>{onOpen && <Button className="mt-3 w-full" size="sm" onClick={() => void open(entry.idName)}>Load character</Button>}</article>)}{!visibleRows.length && <div className="rounded-lg border p-10 text-center text-muted-foreground">{characters.length ? 'No characters match the current filters.' : 'No saved characters.'}</div>}</div>

    <div role="table" aria-label="Saved characters" className="hidden rounded-lg border lg:block">
      <div role="rowgroup" className={`sticky ${adminMode ? 'top-[44px]' : 'top-14'} z-40 bg-background/95 shadow-sm backdrop-blur`}>
        <div role="row" className="grid items-center" style={{ gridTemplateColumns: desktopGridTemplate }}>
          {adminMode && <div role="columnheader" className="p-3"><Checkbox checked={allVisibleSelected} onCheckedChange={(checked) => toggleVisibleSelection(checked === true)} aria-label="Select all visible characters" /></div>}
          {isVisible('portrait') && <div role="columnheader" className="p-3 font-semibold">Portrait</div>}
          {isVisible('name') && <div role="columnheader" className="p-3"><SortHeader column="name">Character Name</SortHeader></div>}
          {isVisible('tags') && <div role="columnheader" className="p-3"><SortHeader column="tags">Tags</SortHeader></div>}
          {isVisible('ancestry') && <div role="columnheader" className="p-3"><SortHeader column="ancestry">Ancestry</SortHeader></div>}
          {isVisible('profession') && <div role="columnheader" className="p-3"><SortHeader column="profession">Profession</SortHeader></div>}
          {isVisible('updated') && <div role="columnheader" className="p-3"><SortHeader column="updated">Timestamp</SortHeader></div>}
          {isVisible('filename') && <div role="columnheader" className="p-3"><SortHeader column="filename">Filename</SortHeader></div>}
          {onOpen && <div role="columnheader" />}
        </div>
        <div role="row" className="grid items-center border-t" style={{ gridTemplateColumns: desktopGridTemplate }}>
          {adminMode && <div role="columnheader" className="p-2" />}
          {isVisible('portrait') && <div role="columnheader" className="p-2" />}
          {isVisible('name') && <div role="columnheader" className="p-2"><Input value={filters.name} onChange={(event) => setFilter('name', event.target.value)} placeholder="Filter name" aria-label="Filter by character name" className="h-8 bg-background font-normal" /></div>}
          {isVisible('tags') && <div role="columnheader" className="p-2"><Select value={filters.tags} onValueChange={(value) => setFilter('tags', value)}><SelectTrigger className="h-8 bg-background font-normal" aria-label="Filter by tags"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All tags</SelectItem>{availableTags.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}</SelectContent></Select></div>}
          {isVisible('ancestry') && <div role="columnheader" className="p-2"><Input value={filters.ancestry} onChange={(event) => setFilter('ancestry', event.target.value)} placeholder="Filter ancestry" aria-label="Filter by ancestry" className="h-8 bg-background font-normal" /></div>}
          {isVisible('profession') && <div role="columnheader" className="p-2"><Input value={filters.profession} onChange={(event) => setFilter('profession', event.target.value)} placeholder="Filter profession" aria-label="Filter by profession" className="h-8 bg-background font-normal" /></div>}
          {isVisible('updated') && <div role="columnheader" className="p-2" />}
          {isVisible('filename') && <div role="columnheader" className="p-2"><Input value={filters.filename} onChange={(event) => setFilter('filename', event.target.value)} placeholder="Filename" aria-label="Filter by filename" className="h-8 bg-background font-normal" /></div>}
          {onOpen && <div role="columnheader" className="p-2 text-right">{anyFilters && <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear</Button>}</div>}
        </div>
      </div>
      <div role="rowgroup">
        {visibleRows.map(({ entry, ancestry: ancestryValue, profession: professionValue }) => <div role="row" key={entry.idName} className="grid items-start border-t hover:bg-muted/30" style={{ gridTemplateColumns: desktopGridTemplate }}>
          {adminMode && <div role="cell" className="p-3"><Checkbox checked={selectedIds.has(entry.idName)} onCheckedChange={(checked) => toggleSelected(entry.idName, checked === true)} aria-label={`Select ${entry.name || entry.idName}`} /></div>}
          {isVisible('portrait') && <div role="cell" className="p-2"><img src={entry.thumbnailUrl ? `${entry.thumbnailUrl}?v=${encodeURIComponent(entry.updatedAt)}` : '/character-creator/img/portrait-placeholder.png'} alt="" className="h-16 w-20 rounded border object-cover" /></div>}
          {isVisible('name') && <div role="cell" className="min-w-0 p-3 font-medium"><span className="block truncate">{entry.name || '—'}</span>{entry.properName && entry.properName !== entry.name && <span className="block truncate text-xs font-normal text-muted-foreground">{entry.properName}</span>}</div>}
          {isVisible('tags') && <div role="cell" className="min-w-0 p-3">{adminMode && tagEditing ? <TokenField value={pendingTags[entry.idName] ?? sortedTags(entry)} onChange={(tags) => setPendingTags((current) => ({ ...current, [entry.idName]: tags }))} allowedTokens={availableTags} ariaLabel={`Tags for ${entry.name || entry.idName}`} /> : <div className="flex flex-wrap gap-1">{displayTags(entry).map((tag) => <span key={tag} className="rounded-full border bg-muted px-2 py-0.5 text-[10px]">{tag}</span>)}{!displayTags(entry).length && <span className="text-xs text-muted-foreground">—</span>}</div>}</div>}
          {isVisible('ancestry') && <div role="cell" className="min-w-0 p-3 text-sm">{ancestryValue}</div>}
          {isVisible('profession') && <div role="cell" className="min-w-0 p-3 text-sm">{professionValue}</div>}
          {isVisible('updated') && <div role="cell" className="p-3 text-xs text-muted-foreground"><span className="block">{updatedTimestamp(entry.updatedAt).date}</span><span className="block whitespace-nowrap">{updatedTimestamp(entry.updatedAt).time}</span></div>}
          {isVisible('filename') && <div role="cell" className="min-w-0 break-all p-3 font-mono text-[11px]">{entry.idName}</div>}
          {onOpen && <div role="cell" className="p-3 text-right"><Button size="sm" onClick={() => void open(entry.idName)}>Load</Button></div>}
        </div>)}
        {!visibleRows.length && <div className="p-10 text-center text-muted-foreground">{characters.length ? 'No characters match the current filters.' : 'No saved characters.'}</div>}
      </div>
    </div>

    {adminMode && <iframe ref={exportFrame} title="Character PDF renderer" src="/character-creator/index.html?embed=1&batch=1" onLoad={() => { exportFrameReady.current = true; }} className="pointer-events-none fixed -left-[10000px] top-0 h-[1576px] w-[1201px] opacity-0" aria-hidden="true" tabIndex={-1} />}
    <ConfirmDialog open={saveTagsConfirmOpen} title="Update character tags?" busy={savingTags} onCancel={() => setSaveTagsConfirmOpen(false)} onConfirm={() => void saveTagUpdates()}><p>Update Library tags for {changedTagEntries.length} character{changedTagEntries.length === 1 ? '' : 's'}? Other character data will not be changed.</p></ConfirmDialog>
    <ConfirmDialog open={exportConfirmOpen} title="Export selected characters?" busy={exporting} onCancel={() => setExportConfirmOpen(false)} onConfirm={() => void exportSelectedCharacters()}><p>Build one multi-page PDF containing the front and back sheets for {selectedIds.size} selected character{selectedIds.size === 1 ? '' : 's'}, ordered alphanumerically by character name.</p></ConfirmDialog>
  </div>;
}
