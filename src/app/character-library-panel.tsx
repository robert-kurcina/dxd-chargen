'use client';

import { useMemo, useRef } from 'react';
import { Copy, Download, FileUp, Pencil, Plus, Trash2, UserRoundCheck } from 'lucide-react';

import type { StaticData } from '@/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { CharacterLibraryState } from '@/lib/character-library';
import { exportCharacter } from '@/lib/character-library';
import { validateCharacterDraft } from '@/lib/rules/finalization';

function safeFilename(value: string) {
  return (value || 'unnamed-character').trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'unnamed-character';
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function CharacterLibraryPanel({
  data,
  library,
  onSelect,
  onNew,
  onDuplicate,
  onDelete,
  onImport,
  onEdit,
  onOpenSheet,
}: {
  data: StaticData;
  library: CharacterLibraryState;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (value: unknown) => void;
  onEdit: () => void;
  onOpenSheet: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const validations = useMemo(() => new Map(
    library.entries.map((entry) => [entry.id, validateCharacterDraft(entry.draft, data)]),
  ), [library.entries, data]);
  const active = library.entries.find((entry) => entry.id === library.activeId) ?? library.entries[0];
  const validation = active ? validations.get(active.id) : null;

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      onImport(JSON.parse(await file.text()));
    } catch {
      window.alert('The selected file is not valid DXD character JSON.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-4 pb-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Character Library</CardTitle>
                <Badge variant="outline">{library.entries.length} local</Badge>
              </div>
              <CardDescription className="mt-1">
                Characters are stored locally in this browser as structured drafts. Sheet data is projected from the active draft rather than stored separately.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => inputRef.current?.click()}><FileUp />Import JSON</Button>
              <input ref={inputRef} type="file" className="hidden" accept="application/json,.json" onChange={(event) => void handleImport(event.target.files?.[0])} />
              <Button onClick={onNew}><Plus />New Character</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {active && validation && (
        <Card className={validation.ready ? 'border-emerald-300' : 'border-amber-300'}>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{active.draft.utilities.name || 'Unnamed character'}</CardTitle>
                  <Badge variant={validation.ready ? 'default' : 'secondary'}>
                    {validation.ready ? 'Ready' : `${validation.incompleteSteps} incomplete`}
                  </Badge>
                  {validation.warningSteps > 0 && <Badge variant="outline">{validation.warningSteps} warning steps</Badge>}
                </div>
                <CardDescription className="mt-1">
                  {validation.completeSteps}/{validation.totalSteps} canonical steps complete. Updated {new Date(active.updatedAt).toLocaleString()}.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={onEdit}><Pencil />Edit</Button>
                <Button variant="outline" onClick={onOpenSheet}><UserRoundCheck />Open Sheet</Button>
                <Button variant="outline" onClick={() => downloadJson(`${safeFilename(active.draft.utilities.name)}.dxd.json`, exportCharacter(active))}><Download />Export</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {validation.issues.length === 0 ? (
              <p className="text-sm">No blocking errors or warnings remain in the current implementation scope.</p>
            ) : (
              <div className="space-y-3">
                {validation.issues.map((issue, index) => (
                  <div key={`${issue.step}-${index}`} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={issue.severity === 'error' ? 'destructive' : 'outline'}>{issue.severity}</Badge>
                      <span className="font-medium">{issue.stepTitle}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{issue.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {library.entries.map((entry) => {
          const current = entry.id === library.activeId;
          const result = validations.get(entry.id)!;
          return (
            <Card key={entry.id} className={current ? 'border-primary' : undefined}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{entry.draft.utilities.name || 'Unnamed character'}</CardTitle>
                    <CardDescription className="mt-1">PML {entry.draft.proficiencies.pml ?? '—'} • {entry.draft.background.ageGroup ?? 'Age unresolved'}</CardDescription>
                  </div>
                  <Badge variant={result.ready ? 'default' : result.incompleteSteps ? 'secondary' : 'outline'}>
                    {result.ready ? 'Ready' : `${result.completeSteps}/${result.totalSteps}`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">Updated {new Date(entry.updatedAt).toLocaleString()}</div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {!current && <Button size="sm" onClick={() => onSelect(entry.id)}>Open</Button>}
                  {current && <Button size="sm" variant="secondary" disabled>Active</Button>}
                  <Button size="sm" variant="outline" onClick={() => onDuplicate(entry.id)}><Copy />Duplicate</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadJson(`${safeFilename(entry.draft.utilities.name)}.dxd.json`, exportCharacter(entry))}><Download />Export</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm(`Delete ${entry.draft.utilities.name || 'this character'}? This removes only the local library copy.`)) onDelete(entry.id);
                    }}
                  ><Trash2 />Delete</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
