'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

const compareText = (left: string, right: string) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
const sortTokens = (tokens: string[]) => [...tokens].sort(compareText);

export default function TokenField({
  value,
  onChange,
  disabled = false,
  allowedTokens,
  placeholder = 'Add tag',
  ariaLabel = 'Tags',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  allowedTokens?: string[];
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState('');
  const normalizedAllowed = allowedTokens?.map((tag) => [tag.toLocaleLowerCase(), tag] as const);
  const commit = (raw: string) => {
    const candidates = raw.split(',').map((tag) => tag.trim()).filter(Boolean);
    if (!candidates.length) return;
    const next = [...value];
    for (const candidate of candidates) {
      const canonical = normalizedAllowed
        ? normalizedAllowed.find(([key]) => key === candidate.toLocaleLowerCase())?.[1]
        : candidate;
      if (!canonical) continue;
      if (!next.some((tag) => tag.localeCompare(canonical, undefined, { sensitivity: 'base' }) === 0)) next.push(canonical);
    }
    onChange(sortTokens(next));
    setDraft('');
  };
  const remove = (token: string) => onChange(value.filter((tag) => tag !== token));
  const suggestions = allowedTokens
    ? allowedTokens.filter((tag) => !value.includes(tag) && (!draft.trim() || tag.toLocaleLowerCase().includes(draft.trim().toLocaleLowerCase()))).slice(0, 8)
    : [];

  return <div className={`rounded-md border bg-background p-2 ${disabled ? 'opacity-70' : ''}`} aria-label={ariaLabel}>
    <div className="flex min-h-7 flex-wrap gap-1.5">
      {sortTokens(value).map((token) => <span key={token} className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-1 text-xs">
        <span>{token}</span>
        {!disabled && <button type="button" onClick={() => remove(token)} className="rounded-full p-0.5 hover:bg-background" aria-label={`Remove ${token}`}><X className="h-3 w-3" /></button>}
      </span>)}
      {!value.length && disabled && <span className="px-1 text-xs text-muted-foreground">No tags</span>}
    </div>
    {!disabled && <div className="mt-2">
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); commit(draft); }
          if (event.key === 'Backspace' && !draft && value.length) remove(sortTokens(value).at(-1) ?? '');
        }}
        onBlur={() => { if (!allowedTokens && draft.trim()) commit(draft); }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-8"
      />
      {allowedTokens && draft.trim() && <div className="mt-1 flex flex-wrap gap-1">
        {suggestions.map((tag) => <button key={tag} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => commit(tag)} className="rounded border bg-card px-2 py-0.5 text-[11px] hover:bg-muted">{tag}</button>)}
        {!suggestions.length && <span className="text-[11px] text-muted-foreground">Use an existing Global Library tag.</span>}
      </div>}
    </div>}
  </div>;
}
