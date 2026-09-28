'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type InvitePreview = {
  campaign: { id: string; name: string; lifecycle: string };
  role: 'player' | 'gm' | 'campaign-administrator';
  expiresAt: number;
  usesRemaining: number;
};

const roleLabel = (role: InvitePreview['role']) => role === 'gm' ? 'Game Master' : role === 'campaign-administrator' ? 'Campaign Administrator' : 'Player';

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let current = true;
    Promise.all([
      fetch(`/api/auth/invitations/${token}`, { cache: 'no-store', credentials: 'same-origin' }),
      fetch('/api/auth/get-session', { cache: 'no-store', credentials: 'same-origin' }),
    ]).then(async ([inviteResponse, sessionResponse]) => {
      if (!current) return;
      if (!inviteResponse.ok) throw new Error('This invitation has expired, been revoked, or has no uses remaining. Ask the campaign staff for a new link.');
      setPreview(await inviteResponse.json() as InvitePreview);
      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        setSignedIn(Boolean(session?.user));
      }
    }).catch(reason => { if (current) setError(reason instanceof Error ? reason.message : 'The invitation could not be loaded.'); });
    return () => { current = false; };
  }, [token]);

  const returnTo = `/invite/${token}`;
  const accountHref = `/account?returnTo=${encodeURIComponent(returnTo)}`;
  const accept = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/auth/invitations/${token}/accept`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: '{}' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `Could not accept invitation (${response.status}).`);
      setMessage(result.alreadyMember ? 'You already have access to this campaign.' : result.replayed ? 'Your campaign access is active.' : 'You joined the campaign.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The invitation could not be accepted.');
    } finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-12">
    <div className="mx-auto w-full max-w-lg">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Return to character forge</Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Campaign invitation</h1>
      {error && <p role="alert" className="mt-5 rounded-lg border border-destructive p-4 text-sm">{error}</p>}
      {preview && <section className="mt-5 space-y-3 rounded-xl border p-5 shadow-sm">
        <p>You are invited to join <strong>{preview.campaign.name}</strong> as a <strong>{roleLabel(preview.role)}</strong>.</p>
        <p className="text-sm text-muted-foreground">This link expires {new Date(preview.expiresAt).toLocaleString()} and has {preview.usesRemaining} {preview.usesRemaining === 1 ? 'use' : 'uses'} remaining. Opening this page does not use the invitation.</p>
        {message && <p role="status" className="rounded-md bg-muted p-3 text-sm">{message}</p>}
        {signedIn
          ? <button type="button" disabled={busy || Boolean(message)} onClick={() => void accept()} className="min-h-12 w-full rounded-md bg-primary px-4 font-medium text-primary-foreground disabled:opacity-50">{busy ? 'Joining…' : 'Accept invitation'}</button>
          : <div className="space-y-2"><Link className="flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground" href={accountHref}>Sign in to accept</Link><Link className="flex min-h-12 items-center justify-center rounded-md border px-4 font-medium" href={`${accountHref}&mode=signup`}>Create an account</Link></div>}
      </section>}
      {!preview && !error && <p role="status" className="mt-5 text-sm text-muted-foreground">Checking invitation…</p>}
      <p className="mt-5 text-xs text-muted-foreground">Only the campaign name and invited role are shown before you join.</p>
    </div>
  </main>;
}
