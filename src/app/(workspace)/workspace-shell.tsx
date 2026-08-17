'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const tabs = [{ href: '/', label: 'Forge' }, { href: '/sheet', label: 'Sheet' }, { href: '/library', label: 'Library' }];
export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sheet = pathname === '/sheet';
  return <main className={cn(sheet ? 'h-dvh overflow-hidden' : 'min-h-screen', 'p-2 md:p-8')}><div className={cn('w-full', sheet && 'flex h-full min-h-0 flex-col')}>
    <div data-forge-modal-background className="sticky top-0 z-50 shrink-0 bg-white py-2 print:hidden"><div className="mx-auto flex w-full max-w-[1080px] items-center gap-2"><nav className="grid min-w-0 flex-1 grid-cols-3 rounded-lg bg-muted p-1" aria-label="Character Forge tabs">{tabs.map((tab) => { const active = pathname === tab.href; return <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className={cn('rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors', active ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground')}>{tab.label}</Link>; })}</nav><Button asChild variant="outline"><Link href="/admin">Admin</Link></Button></div></div>
    <div className={cn('pt-2', sheet && 'min-h-0 flex-1')}>{children}</div>
  </div></main>;
}
