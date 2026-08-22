import { cn } from '@/lib/utils';

type SuspenseSpinnerProps = {
  label?: string;
  className?: string;
  compact?: boolean;
  panel?: boolean;
};

export default function SuspenseSpinner({
  label = 'Loading…',
  className,
  compact = false,
  panel = false,
}: SuspenseSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center',
        panel && 'min-h-[240px] rounded-lg border bg-card',
        compact ? 'gap-2 text-xs text-muted-foreground' : 'gap-3 text-sm text-muted-foreground',
        className,
      )}
    >
      <span
        className={cn(
          'inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent',
          compact ? 'h-4 w-4' : 'h-5 w-5',
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
