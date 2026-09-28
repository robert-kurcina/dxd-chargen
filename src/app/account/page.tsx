import AccountPanel from './panel';

export default function AccountPage() {
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-12">
    <div className="mx-auto w-full max-w-lg">
      <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Return to character forge</a>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-2 text-muted-foreground">Manage sign-in details and account security for this local development service.</p>
      <AccountPanel />
    </div>
  </main>;
}
