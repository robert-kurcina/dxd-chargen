export default function AdminTabSpinner() {
  return <div className="flex min-h-[240px] items-center justify-center rounded-lg border bg-card" role="status" aria-live="polite"><div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />Loading tab…</div></div>;
}
