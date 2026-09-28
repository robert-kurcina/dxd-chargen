'use client';

import { useEffect, useState } from 'react';

type Mode = 'login' | 'signup' | 'forgot' | 'reset' | 'mfa';
type User = { email: string; name: string; username?: string; twoFactorEnabled?: boolean };
type ApiResult = { user?: User | null; twoFactorRedirect?: boolean; message?: string; code?: string; token?: string | null; totpURI?: string; backupCodes?: string[] };

async function post(path: string, body: Record<string, string>) {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as ApiResult;
  if (!response.ok) throw new Error(result.message ?? result.code ?? `Request failed (${response.status}).`);
  return result;
}

const inputClass = 'mt-1 block min-h-12 w-full rounded-md border bg-background px-3 text-base';
const buttonClass = 'min-h-12 w-full rounded-md bg-primary px-4 font-medium text-primary-foreground disabled:opacity-50';

export default function AccountPanel() {
  const [mode, setMode] = useState<Mode>('login');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [returnTo, setReturnTo] = useState('');
  const [enrollPassword, setEnrollPassword] = useState('');
  const [enrollmentUri, setEnrollmentUri] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const requestedReturnTo = query.get('returnTo') ?? '';
    let safeReturnTo = '';
    try {
      const target = new URL(requestedReturnTo, window.location.origin);
      if (target.origin === window.location.origin && (/^\/invite\/[A-Za-z0-9_-]{43}$/.test(target.pathname) || target.pathname === '/campaigns' || target.pathname === '/admin/campaigns')) safeReturnTo = target.pathname + target.search;
    } catch { /* Invalid return targets are ignored. */ }
    setReturnTo(safeReturnTo);
    if (query.get('mode') === 'signup' && safeReturnTo) setMode('signup');
    const token = query.get('token');
    if (token) { setResetToken(token); setMode('reset'); setNotice('Choose a new password for your account.'); }
    if (query.get('error') === 'INVALID_TOKEN') setError('That reset link is invalid or expired. Request another link.');
    fetch('/api/auth/get-session', { credentials: 'same-origin' }).then(async response => {
      setAvailable(response.status !== 503);
      if (response.ok) {
        const session = await response.json();
        if (session?.user) setUser(session.user as User);
      }
    }).catch(() => setAvailable(false));
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The request could not be completed.'); }
    finally { setBusy(false); }
  };

  const signIn = async (identifier: string, secret: string) => {
    const result = await post(identifier.includes('@') ? 'sign-in/email' : 'sign-in/username', identifier.includes('@')
      ? { email: identifier, password: secret }
      : { username: identifier, password: secret });
    if (result.twoFactorRedirect) { setMode('mfa'); setNotice('Enter the current code from your authenticator app.'); return; }
    const session = await fetch('/api/auth/get-session', { credentials: 'same-origin' }).then(response => response.json());
    if (!session?.user) throw new Error('Sign-in did not create an active session. Check your email and try again.');
    if (returnTo) { window.location.assign(returnTo); return; }
    setUser(session.user as User); setPassword(''); setNotice('You are signed in.');
  };

  if (available === false) return <section className="mt-6 rounded-xl border p-5" role="status">
    <h2 className="font-semibold">Local accounts aren’t running</h2>
    <p className="mt-2 text-sm text-muted-foreground">Start the account development service with a migrated local database and configured secret to use this page.</p>
  </section>;

  if (user) return <section className="mt-6 space-y-5 rounded-xl border p-5">
    <div><h2 className="text-lg font-semibold">Signed in</h2><p className="mt-2">{user.name || user.username || user.email}</p><p className="text-sm text-muted-foreground">{user.email}</p></div>
    <section className="space-y-3 border-t pt-4" aria-labelledby="mfa-heading">
      <h3 id="mfa-heading" className="font-semibold">Authenticator security</h3>
      {user.twoFactorEnabled
        ? <>
          <p className="text-sm text-muted-foreground">An authenticator is enabled. Verify a fresh code before campaign staff actions. A fresh verification lasts five minutes, and each TOTP code can be used only once for step-up.</p>
          <label className="block text-sm font-medium">Authenticator code<input className={inputClass} inputMode="numeric" autoComplete="one-time-code" value={mfaCode} onChange={event => setMfaCode(event.target.value)} /></label>
          <button type="button" className={buttonClass} disabled={busy || mfaCode.length !== 6} onClick={() => void run(async () => { await post('two-factor/verify-totp', { code: mfaCode }); setMfaCode(''); setNotice(returnTo ? 'Verification accepted.' : 'Authenticator verified. Campaign staff actions are available for five minutes.'); if (returnTo) window.location.assign(returnTo); })}>Verify fresh code</button>
        </>
        : enrollmentUri
          ? <>
            <p className="text-sm">Add this authenticator URI to your authenticator app, then verify a current code. Store the recovery codes somewhere safe.</p>
            <code className="block max-h-32 overflow-auto break-all rounded bg-muted p-3 text-xs">{enrollmentUri}</code>
            {backupCodes.length > 0 && <div className="rounded border p-3"><h4 className="font-medium">Recovery codes — shown once</h4><ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm">{backupCodes.map(code => <li key={code}>{code}</li>)}</ul></div>}
            <label className="block text-sm font-medium">Authenticator code<input className={inputClass} inputMode="numeric" autoComplete="one-time-code" value={mfaCode} onChange={event => setMfaCode(event.target.value)} /></label>
            <button type="button" className={buttonClass} disabled={busy || mfaCode.length !== 6} onClick={() => void run(async () => { await post('two-factor/verify-totp', { code: mfaCode }); setUser({ ...user, twoFactorEnabled: true }); setEnrollmentUri(''); setMfaCode(''); setNotice('Authenticator enabled. Save your recovery codes securely.'); })}>Confirm authenticator</button>
          </>
          : <>
            <p className="text-sm text-muted-foreground">Campaign management requires an authenticator with a recent verification.</p>
            <label className="block text-sm font-medium">Confirm your password to begin setup<input className={inputClass} type="password" autoComplete="current-password" value={enrollPassword} onChange={event => setEnrollPassword(event.target.value)} /></label>
            <button type="button" className={buttonClass} disabled={busy || !enrollPassword} onClick={() => void run(async () => { const result = await post('two-factor/enable', { password: enrollPassword, issuer: 'DXD Character Forge' }); if (!result.totpURI || !result.backupCodes) throw new Error('Authenticator setup did not return enrollment details.'); setEnrollmentUri(result.totpURI); setBackupCodes(result.backupCodes); setEnrollPassword(''); setNotice('Complete authenticator setup to enable staff actions.'); })}>Set up authenticator</button>
          </>}
    </section>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <button className="min-h-11 rounded-md border px-4" disabled={busy} onClick={() => void run(async () => {
      await post('sign-out', {}); setUser(null); setNotice('You have signed out.');
    })}>Sign out</button>
  </section>;

  const field = (label: string, value: string, setValue: (value: string) => void, type = 'text', autoComplete?: string) => <label className="block text-sm font-medium">{label}<input className={inputClass} type={type} value={value} onChange={event => setValue(event.target.value)} autoComplete={autoComplete} required /></label>;
  const changeMode = (next: Mode) => { setMode(next); setError(''); setNotice(''); setPassword(''); setCode(''); };

  return <section className="mt-6 rounded-xl border p-5 shadow-sm sm:p-6">
    {mode !== 'reset' && mode !== 'mfa' && <div role="tablist" aria-label="Account action" className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
      {(['login', 'signup'] as const).map((tab) => <button key={tab} role="tab" aria-selected={mode === tab} className={`min-h-11 rounded-md px-3 text-sm font-medium ${mode === tab ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => changeMode(tab)}>{tab === 'login' ? 'Sign in' : 'Create account'}</button>)}
    </div>}
    <form className="mt-5 space-y-4" onSubmit={event => {
      event.preventDefault();
      void run(async () => {
        if (mode === 'signup') {
          await post('sign-up/email', { email, username, name, password, ...(returnTo ? { callbackURL: `${window.location.origin}${returnTo}` } : {}) });
          setPassword(''); setMode('login'); setNotice('Account created. Check the local account inbox for the verification link before signing in.');
        } else if (mode === 'forgot') {
          await post('request-password-reset', { email, redirectTo: `${window.location.origin}/account` });
          setNotice('If that account exists, a reset link is waiting in the local account inbox.');
        } else if (mode === 'reset') {
          await post('reset-password', { token: resetToken, newPassword: password });
          setPassword(''); setResetToken(''); setMode('login'); window.history.replaceState({}, '', '/account'); setNotice('Password changed. Sign in with your new password.');
        } else if (mode === 'mfa') {
          await post(useRecovery ? 'two-factor/verify-backup-code' : 'two-factor/verify-totp', { code });
          const session = await fetch('/api/auth/get-session', { credentials: 'same-origin' }).then(response => response.json());
          if (!session?.user) throw new Error('The verification code did not create an active session.');
          if (returnTo) { window.location.assign(returnTo); return; }
          setUser(session.user as User); setCode(''); setNotice('You are signed in.');
        } else {
          await signIn(email, password);
        }
      });
    }}>
      {mode === 'signup' && <>{field('Display name', name, setName, 'text', 'name')}{field('Username', username, setUsername, 'text', 'username')}</>}
      {(mode === 'signup' || mode === 'forgot') && field('Email', email, setEmail, 'email', 'email')}
      {mode === 'login' && <label className="block text-sm font-medium">Email or username<input className={inputClass} value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required /></label>}
      {(mode === 'signup' || mode === 'login' || mode === 'reset') && field(mode === 'reset' ? 'New password' : 'Password', password, setPassword, 'password', mode === 'login' ? 'current-password' : 'new-password')}
      {mode === 'mfa' && <>{field(useRecovery ? 'Recovery code' : 'Authenticator code', code, setCode, 'text', 'one-time-code')}<button type="button" className="text-sm underline" onClick={() => { setUseRecovery(!useRecovery); setCode(''); }}>{useRecovery ? 'Use authenticator code' : 'Use a recovery code'}</button></>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      <button className={buttonClass} disabled={busy || available === null}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Request reset link' : mode === 'reset' ? 'Set new password' : mode === 'mfa' ? 'Verify and sign in' : 'Sign in'}</button>
    </form>
    {mode === 'login' && <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
      <button type="button" className="underline" onClick={() => changeMode('forgot')}>Forgot password?</button>
      <button type="button" className="underline" onClick={() => void run(async () => {
        await post('send-verification-email', { email, callbackURL: `${window.location.origin}/account` });
        setNotice('If that account needs verification, a link is waiting in the local account inbox.');
      })}>Resend verification link</button>
    </div>}
    {mode === 'mfa' && <button className="mt-4 text-sm underline" onClick={() => changeMode('login')}>Return to sign in</button>}
    {available === null && <p className="mt-4 text-sm text-muted-foreground">Checking local account service…</p>}
    <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">This development account is stored on this machine. Verification and password reset messages remain in the encrypted local inbox.</p>
  </section>;
}
