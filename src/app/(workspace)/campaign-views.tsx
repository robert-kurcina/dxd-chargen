'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import BackgroundStep from '@/app/forge/background-step';
import { createEmptyCharacterDraft } from '@/lib/character-draft';
import { selectedSettlementOption } from '@/lib/settlement-context';
import { originAllowed } from '@/lib/campaign-origins';
import { LOCAL_CAMPAIGNS } from '@/lib/local-campaigns';
import { useWorkspace } from './workspace-provider';

export function CampaignsView() {
  const { selectedCampaign, selectCampaign, createInCampaign } = useWorkspace();
  return <div className="mx-auto max-w-3xl space-y-6 pb-4">
    <header><h1 className="text-xl font-semibold">Choose your campaign</h1><p className="mt-1 text-sm text-muted-foreground">Choose where to begin. Switching campaigns does not move existing characters.</p></header>
    <div className="grid gap-3 sm:grid-cols-2">{LOCAL_CAMPAIGNS.map(campaign => <button key={campaign.id} type="button" aria-pressed={selectedCampaign.id === campaign.id} onClick={() => selectCampaign(campaign.id)} className={`rounded-xl border p-4 text-left ${selectedCampaign.id === campaign.id ? 'border-primary bg-muted ring-1 ring-primary' : 'bg-card'}`}>
      <span className="block font-semibold">{campaign.name}</span><span className="mt-1 block text-xs font-medium text-muted-foreground">{campaign.baseline ? 'Immutable baseline · Cannot activate' : 'Preparing · Based on Default'}</span><span className="mt-3 block text-sm">{campaign.description}</span>
    </button>)}</div>
    <section className="space-y-3"><h2 className="text-lg font-semibold">What would you like to do?</h2><p className="text-sm text-muted-foreground">{selectedCampaign.name}</p>
      <Button className="h-auto min-h-14 w-full justify-start whitespace-normal py-3 text-left" onClick={() => createInCampaign()}>Create a character</Button>
      <Button asChild variant="outline" className="min-h-14 w-full justify-start"><Link href="/maps">Explore regions and settlements</Link></Button>
      <Button asChild variant="outline" className="min-h-14 w-full justify-start"><Link href="/library">Open the Character Library</Link></Button>
      <Link href="/" className="inline-flex min-h-11 items-center text-sm underline">Continue current character</Link>
    </section>
  </div>;
}

export function MapsView() {
  const { data, selectedCampaign, createInCampaign } = useWorkspace();
  const [origin, setOrigin] = useState(createEmptyCharacterDraft);
  return <div className="mx-auto max-w-3xl space-y-4 pb-4">
    <header><h1 className="text-xl font-semibold">Explore origins</h1><p className="text-sm text-muted-foreground">{selectedCampaign.name} · Choose a region and settlement, or open the overland map.</p></header>
    <BackgroundStep allowDisallowedInspection stepValue="background-region-settlement" data={data} draft={origin} setDraft={setOrigin} />
    {origin.background.settlementId && !originAllowed(selectedCampaign.originPolicy, origin.background.settlementId) && <p role="status" className="rounded border p-3 text-sm">This settlement is disallowed as a new starting origin in {selectedCampaign.name}. You can still read its details and maps.</p>}
    <Button className="min-h-11" disabled={!originAllowed(selectedCampaign.originPolicy, origin.background.settlementId) || !origin.background.regionId || !origin.background.settlementId || !selectedSettlementOption(origin, data)} onClick={() => createInCampaign(origin.background)}>Create a character from here</Button>
  </div>;
}
