'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ContextualSectionNavigationProps {
  title: string;
  label: string;
  items: string[];
  icon: LucideIcon;
  onSelect: (title: string) => void;
  children: ReactNode;
}

function SectionLinks({ items, onSelect }: { items: string[]; onSelect: (title: string) => void }) {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? items.filter((item) => item.toLocaleLowerCase().includes(normalized)) : items;
  }, [items, query]);

  return <div className="flex min-h-0 flex-1 flex-col gap-3">
    <div className="relative shrink-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a section" aria-label="Find a section" className="pl-9" />
    </div>
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain" aria-label="Sections">
      {visibleItems.map((item) => <button key={item} type="button" onClick={() => onSelect(item)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item}</button>)}
      {!visibleItems.length && <p className="px-3 py-4 text-sm text-muted-foreground">No matching sections.</p>}
    </nav>
  </div>;
}

export function ContextualSectionNavigation({ title, label, items, icon: Icon, onSelect, children }: ContextualSectionNavigationProps) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const close = () => setOpen(false);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab' || !dialog.current) return;
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    window.requestAnimationFrame(() => dialog.current?.querySelector<HTMLInputElement>('input')?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      opener.current?.focus();
    };
  }, [open]);

  const choose = (item: string) => {
    setOpen(false);
    onSelect(item);
  };

  return <div className="mx-auto grid w-full max-w-[1220px] items-start gap-6 xl:grid-cols-[220px_minmax(0,960px)]">
    <aside className="sticky top-16 hidden max-h-[calc(100dvh-5rem)] min-h-0 rounded-lg border bg-card p-3 xl:flex xl:flex-col" aria-label={`${label} section navigation`}>
      <div className="mb-3 flex items-center gap-2 border-b pb-3 font-semibold"><Icon className="h-4 w-4" />{title}</div>
      <SectionLinks items={items} onSelect={onSelect} />
    </aside>

    <main className="min-w-0"><h1 className="sr-only">{title}</h1>{children}</main>

    <Button ref={opener} type="button" size="icon" className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 rounded-full shadow-lg xl:hidden" onClick={() => setOpen(true)} aria-label={`Open ${label} navigation`} aria-expanded={open}>
      <Icon className="h-5 w-5" />
    </Button>

    {open && <div ref={dialog} className="fixed inset-0 z-[70] flex flex-col bg-background xl:hidden" role="dialog" aria-modal="true" aria-label={`${label} navigation`}>
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2 font-semibold"><Icon className="h-5 w-5" />{title}</div>
        <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label={`Close ${label} navigation`}><X className="h-5 w-5" /></Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col p-4"><SectionLinks items={items} onSelect={choose} /></div>
    </div>}
  </div>;
}
