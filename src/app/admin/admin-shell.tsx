'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/admin/characters', label: 'Characters', match: (path: string) => path.startsWith('/admin/characters') },
  { href: '/admin/global', label: 'Global', match: (path: string) => path.startsWith('/admin/global') },
  { href: '/admin/tests', label: 'Tests', match: (path: string) => path.startsWith('/admin/tests') },
  { href: '/admin/info', label: 'Info', match: (path: string) => path.startsWith('/admin/info') },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <main className="min-h-screen p-2 md:p-4">
    <div className="mx-auto max-w-[1440px]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
        <div className="min-w-0"><h1 className="text-xl font-bold">DXD Character Forge Administration</h1><p className="hidden text-xs text-muted-foreground lg:block">Global controls, character administration, diagnostics, and reference information.</p></div>
        <Button asChild size="sm" variant="outline"><Link href="/">Return to Forge</Link></Button>
      </header>
      <nav className="sticky top-0 z-50 grid min-h-[44px] grid-cols-4 border-b bg-gray-100/95 p-1 backdrop-blur" aria-label="Administration tabs">{tabs.map((tab) => { const active = tab.match(pathname); return <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className={cn('rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors', active ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground')}>{tab.label}</Link>; })}</nav>
      <div className="pt-2">{children}</div>
    </div>
  </main>;
}
