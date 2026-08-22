import SuspenseSpinner from '@/components/suspense-spinner';

export default function WorkspaceSpinner() {
  return <SuspenseSpinner panel label="Loading workspace…" className="mx-auto max-w-[1440px]" />;
}
