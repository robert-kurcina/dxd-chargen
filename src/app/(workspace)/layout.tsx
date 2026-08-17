import sarnaLenData from '@/data';
import { WorkspaceProvider } from './workspace-provider';
import WorkspaceShell from './workspace-shell';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider data={sarnaLenData}><WorkspaceShell>{children}</WorkspaceShell></WorkspaceProvider>;
}
