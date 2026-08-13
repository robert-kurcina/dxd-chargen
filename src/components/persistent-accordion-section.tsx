'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export default function PersistentAccordionSection({ id, title, children, defaultOpen = true, className, triggerClassName }: { id: string; title: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string; triggerClassName?: string }) {
  const key = `dxd-accordion:${id}`;
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    try { const stored = window.localStorage.getItem(key); if (stored != null) setOpen(stored === '1'); } catch {}
  }, [key]);
  const set = (next: boolean) => { setOpen(next); try { window.localStorage.setItem(key, next ? '1' : '0'); } catch {} };
  return <Accordion type="single" collapsible value={open ? 'section' : ''} onValueChange={(value) => set(value === 'section')} className={cn('rounded-lg border px-4', className)}>
    <AccordionItem value="section" className="border-0"><AccordionTrigger className={cn('py-3 hover:no-underline', triggerClassName)}>{title}</AccordionTrigger><AccordionContent>{children}</AccordionContent></AccordionItem>
  </Accordion>;
}
