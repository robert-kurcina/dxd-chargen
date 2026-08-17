'use client';

import { useEffect, useState } from 'react';
import type { StaticData } from '@/data';
import Info from '../info';
import Tests from '../tests';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DEFAULT_ADMIN_SETTINGS, readAdminSettings, resetGlobalRandomSequence, writeAdminSettings, type AdminSettings } from '@/lib/admin-settings';

function splitTags(value: string) {
  return Array.from(new Set(value.split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean)));
}

export default function AdminApp({ data }: { data: StaticData }) {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [tagText, setTagText] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const current = readAdminSettings();
    setSettings(current);
    setTagText(current.libraryTags.join('\n'));
  }, []);
  const persist = (next: AdminSettings, status: string) => {
    const saved = writeAdminSettings(next);
    setSettings(saved);
    setTagText(saved.libraryTags.join('\n'));
    setMessage(status);
  };
  return <main className="min-h-screen p-2 md:p-8">
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b bg-gray-100/95 py-3 backdrop-blur">
        <div><h1 className="text-2xl font-bold">DXD Character Forge Administration</h1><p className="text-sm text-muted-foreground">Global values, constraints, library presentation, reference material, and developer diagnostics.</p></div>
        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground" role="status">{message}</span><Button asChild variant="outline"><a href="/">Return to Forge</a></Button></div>
      </div>
      <Accordion type="multiple" defaultValue={['randomization','library']} className="space-y-3">
        <AccordionItem value="randomization" className="rounded-lg border bg-card px-4"><AccordionTrigger className="text-lg font-semibold">Randomization</AccordionTrigger><AccordionContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[240px_minmax(0,1fr)] md:items-end"><label className="space-y-1"><span className="text-sm font-medium">Global seed number</span><Input type="text" inputMode="numeric" value={settings.randomSeed} onChange={(event) => setSettings((current) => ({ ...current, randomSeed: Number.parseInt(event.target.value || '0', 10) || 0 }))} /></label><div className="text-sm text-muted-foreground">Forge Generate/Roll actions use this deterministic seed. Sequence position: {settings.randomSequence.toLocaleString()}.</div></div>
          <div className="flex flex-wrap gap-2"><Button onClick={() => persist(settings, 'Randomization settings saved.')}>Save randomization settings</Button><Button variant="outline" onClick={() => { const next = resetGlobalRandomSequence(); setSettings(next); setMessage('Random sequence reset to the beginning of the seed.'); }}>Reset sequence</Button></div>
        </AccordionContent></AccordionItem>
        <AccordionItem value="library" className="rounded-lg border bg-card px-4"><AccordionTrigger className="text-lg font-semibold">Library</AccordionTrigger><AccordionContent className="space-y-4">
          <label className="block space-y-1"><span className="text-sm font-medium">Exposed Library tags</span><textarea value={tagText} onChange={(event) => setTagText(event.target.value)} rows={8} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder={'Player Character\nNPC\nRetired\nCampaign A'} /></label>
          <p className="text-sm text-muted-foreground">One tag per line or comma-separated. These define the tag vocabulary shown by the Character Library. Existing character tags not in this list remain stored but are hidden from the exposed tag controls.</p>
          <Button onClick={() => persist({ ...settings, libraryTags: splitTags(tagText) }, 'Library tags saved.')}>Save Library settings</Button>
        </AccordionContent></AccordionItem>
        <AccordionItem value="constraints" className="rounded-lg border bg-card px-4"><AccordionTrigger className="text-lg font-semibold">Global Constraints</AccordionTrigger><AccordionContent><p className="text-sm text-muted-foreground">Reserved for global creation limits and campaign-wide constraints. Rules remain canonical until an administrator explicitly overrides a supported value here.</p></AccordionContent></AccordionItem>
        <AccordionItem value="tests" className="rounded-lg border bg-card px-4"><AccordionTrigger className="text-lg font-semibold">Tests</AccordionTrigger><AccordionContent><Tests data={data} /></AccordionContent></AccordionItem>
        <AccordionItem value="info" className="rounded-lg border bg-card px-4"><AccordionTrigger className="text-lg font-semibold">Info</AccordionTrigger><AccordionContent><Info data={data} /></AccordionContent></AccordionItem>
      </Accordion>
    </div>
  </main>;
}
