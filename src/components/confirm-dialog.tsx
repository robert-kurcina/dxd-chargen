'use client';

import { Button } from '@/components/ui/button';
import SuspenseSpinner from '@/components/suspense-spinner';

export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Update',
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 print:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl">
      <h2 id="confirm-dialog-title" className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
        <Button disabled={busy} onClick={onConfirm}>{busy ? <SuspenseSpinner compact label="Updating…" className="text-current" /> : confirmLabel}</Button>
      </div>
    </div>
  </div>;
}
