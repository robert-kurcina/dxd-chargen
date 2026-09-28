'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ServerCampaign = { id: string; name: string; lifecycle: 'preparing' | 'active' | 'archived'; isDefault: boolean; canConfigure: boolean };
type CampaignInvitation = { id: string; role: 'player' | 'gm' | 'campaign-administrator'; expiresAt: number; maxUses: number; uses: number; createdAt: number; revokedAt: number | null };
type AccountCampaignState = 'checking' | 'signed-out' | 'offline' | 'ready';

export default function AccountCampaignsPanel() {
  const [state, setState] = useState<AccountCampaignState>('checking');
  const [campaigns, setCampaigns] = useState<ServerCampaign[]>([]);
  const [invitations, setInvitations] = useState<Record<string, CampaignInvitation[]>>({});
  const [selected, setSelected] = useState('');
  const [role, setRole] = useState<'player' | 'gm'>('player');
  const [expiresInMinutes, setExpiresInMinutes] = useState('60');
  const [maxUses, setMaxUses] = useState('3');
  const [createdLink, setCreatedLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadInvitations = async (items: ServerCampaign[]) => {
    const configurable = items.filter(campaign => campaign.canConfigure && campaign.lifecycle !== 'archived');
    const results = await Promise.all(configurable.map(async campaign => {
      const response = await fetch(`/api/auth/campaigns/${campaign.id}/invitations`, { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Could not load invitations for ${campaign.name} (${response.status}).`);
      const result = await response.json() as { invitations: CampaignInvitation[] };
      return [campaign.id, result.invitations] as const;
    }));
    setInvitations(Object.fromEntries(results));
  };

  const refresh = async () => {
    setError('');
    try {
      const sessionResponse = await fetch('/api/auth/get-session', { cache: 'no-store', credentials: 'same-origin' });
      if (sessionResponse.status === 503) { setState('offline'); return; }
      if (!sessionResponse.ok) { setState('signed-out'); return; }
      const session = await sessionResponse.json();
      if (!session?.user) { setState('signed-out'); return; }
      const response = await fetch('/api/auth/campaigns', { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 503) { setState('offline'); return; }
      const result = await response.json().catch(() => ({})) as { campaigns?: ServerCampaign[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? `Could not load campaigns (${response.status}).`);
      const items = result.campaigns ?? [];
      setCampaigns(items);
      setSelected(current => items.some(item => item.id === current) ? current : items.find(item => !item.isDefault)?.id ?? items[0]?.id ?? '');
      await loadInvitations(items);
      setState('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load account campaigns.');
      setState('ready');
    }
  };

  useEffect(() => { void refresh(); }, []);

  const campaign = campaigns.find(item => item.id === selected);
  const authHref = `/account?returnTo=${encodeURIComponent('/campaigns')}`;
  const createInvite = async () => {
    if (!campaign) return;
    setBusy(true); setError(''); setMessage(''); setCreatedLink('');
    try {
      const response = await fetch(`/api/auth/campaigns/${campaign.id}/invitations`, {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, expiresInMinutes: Number(expiresInMinutes), maxUses: Number(maxUses) }),
      });
      const result = await response.json().catch(() => ({})) as { inviteUrl?: string; error?: string; code?: string };
      if (!response.ok) {
        if (response.status === 403 && (result.code === 'MFA_REQUIRED' || result.code === 'MFA_REAUTHENTICATION_REQUIRED')) throw new Error(`${result.error ?? 'Verify your authenticator before managing invitations.'} Use Account security to continue.`);
        throw new Error(result.error ?? `Could not create invitation (${response.status}).`);
      }
      if (!result.inviteUrl) throw new Error('Invitation created without a link. Refresh the page before continuing.');
      setCreatedLink(result.inviteUrl);
      setMessage('Invitation created. Copy this link now; the secret link is shown only once.');
      await loadInvitations(campaigns);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create invitation.'); }
    finally { setBusy(false); }
  };

  const revokeInvite = async (invitation: CampaignInvitation) => {
    if (!campaign) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/auth/campaigns/${campaign.id}/invitations/${invitation.id}`, { method: 'DELETE', credentials: 'same-origin' });
      const result = await response.json().catch(() => ({})) as { error?: string; code?: string };
      if (!response.ok) {
        if (response.status === 403 && (result.code === 'MFA_REQUIRED' || result.code === 'MFA_REAUTHENTICATION_REQUIRED')) throw new Error(`${result.error ?? 'Verify your authenticator before managing invitations.'} Use Account security to continue.`);
        throw new Error(result.error ?? `Could not revoke invitation (${response.status}).`);
      }
      setMessage('Invitation revoked.');
      await loadInvitations(campaigns);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not revoke invitation.'); }
    finally { setBusy(false); }
  };

  const inputClass = 'min-h-11 rounded-md border bg-background px-3 text-base';
  return <section className="space-y-4 rounded-xl border p-4 sm:p-5" aria-labelledby="account-campaign-heading">
    <header><h2 id="account-campaign-heading" className="text-lg font-semibold">Account campaigns</h2><p className="mt-1 text-sm text-muted-foreground">Campaign memberships and invitations are stored with your local account. They do not move browser-only characters into campaign storage.</p></header>
    {state === 'checking' && <p role="status" className="text-sm text-muted-foreground">Checking your local account…</p>}
    {state === 'offline' && <p role="status" className="rounded-md bg-muted p-3 text-sm">The local account service is not running. Local campaigns and drafts remain available above.</p>}
    {state === 'signed-out' && <div className="space-y-2"><p className="text-sm text-muted-foreground">Sign in to see campaign memberships or manage invitations.</p><Link className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground" href={authHref}>Sign in to your account</Link></div>}
    {state === 'ready' && <>
      {campaigns.length === 0 ? <p className="text-sm text-muted-foreground">No account campaigns are available to this account yet.</p> : <>
        <label className="block text-sm font-medium">Campaign<select className={`${inputClass} mt-1 block w-full`} value={selected} onChange={event => { setSelected(event.target.value); setCreatedLink(''); setMessage(''); setError(''); }}>
          {campaigns.map(item => <option key={item.id} value={item.id}>{item.name}{item.isDefault ? ' · baseline' : ''}{item.lifecycle === 'archived' ? ' · archived' : ''}</option>)}
        </select></label>
        {campaign && <p className="text-sm text-muted-foreground">{campaign.lifecycle === 'preparing' ? 'Preparing' : campaign.lifecycle === 'active' ? 'Active' : 'Archived'}{campaign.canConfigure ? ' · You can manage campaign invitations.' : ' · You are a member of this campaign.'}</p>}
        {campaign?.canConfigure && campaign.lifecycle !== 'archived' && <>
          <div className="space-y-3 rounded-lg bg-muted/50 p-3 sm:p-4">
            <h3 className="font-medium">Create an invitation</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-medium">Invite as<select className={`${inputClass} mt-1 block w-full`} value={role} onChange={event => setRole(event.target.value as 'player' | 'gm')}><option value="player">Player</option><option value="gm">Game Master</option></select></label>
              <label className="text-sm font-medium">Expires in minutes<input className={`${inputClass} mt-1 block w-full`} type="number" min="1" max="43200" value={expiresInMinutes} onChange={event => setExpiresInMinutes(event.target.value)} /></label>
              <label className="text-sm font-medium">Uses<input className={`${inputClass} mt-1 block w-full`} type="number" min="1" max="100" value={maxUses} onChange={event => setMaxUses(event.target.value)} /></label>
            </div>
            <p className="text-xs text-muted-foreground">Defaults: expires after one hour or three uses. Anyone with the link can use it until it expires or is revoked.</p>
            <button type="button" className="min-h-11 rounded-md bg-primary px-4 font-medium text-primary-foreground disabled:opacity-50" disabled={busy || !Number.isInteger(Number(expiresInMinutes)) || Number(expiresInMinutes) < 1 || Number(expiresInMinutes) > 43200 || !Number.isInteger(Number(maxUses)) || Number(maxUses) < 1 || Number(maxUses) > 100} onClick={() => void createInvite()}>{busy ? 'Working…' : 'Create invitation link'}</button>
          </div>
          {createdLink && <label className="block text-sm font-medium">New invitation link — copy it now<input className={`${inputClass} mt-1 block w-full font-mono text-sm`} readOnly value={createdLink} onFocus={event => event.currentTarget.select()} /></label>}
          <div className="space-y-2"><h3 className="font-medium">Invitations</h3>{(invitations[campaign.id] ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No invitations have been created for this campaign.</p> : <ul className="space-y-2">{(invitations[campaign.id] ?? []).map(invitation => {
            const expired = invitation.expiresAt <= Date.now();
            const exhausted = invitation.uses >= invitation.maxUses;
            const status = invitation.revokedAt ? 'Revoked' : expired ? 'Expired' : exhausted ? 'Used up' : 'Available';
            return <li key={invitation.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-sm"><p className="font-medium">{invitation.role === 'gm' ? 'Game Master' : invitation.role === 'campaign-administrator' ? 'Campaign Administrator' : 'Player'} · {status}</p><p className="text-muted-foreground">{invitation.uses}/{invitation.maxUses} uses · expires {new Date(invitation.expiresAt).toLocaleString()}</p></div>{!invitation.revokedAt && !expired && !exhausted && <button type="button" disabled={busy} onClick={() => void revokeInvite(invitation)} className="min-h-10 self-start rounded-md border px-3 text-sm disabled:opacity-50 sm:self-auto">Revoke</button>}</li>;
          })}</ul>}</div>
        </>}
      </>}
      <Link href="/account" className="inline-flex min-h-10 items-center text-sm underline">Account security</Link>
      <button type="button" onClick={() => void refresh()} className="ml-4 min-h-10 text-sm underline">Refresh</button>
    </>}
    {message && <p role="status" className="rounded-md bg-muted p-3 text-sm">{message}</p>}
    {error && <div className="space-y-2" role="alert"><p className="text-sm text-destructive">{error}</p>{state === 'ready' && campaign?.canConfigure && <Link className="inline-flex min-h-10 items-center text-sm underline" href={authHref}>Open account security</Link>}</div>}
  </section>;
}
