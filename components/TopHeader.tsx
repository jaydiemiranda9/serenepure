'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DropMark } from './DropMark';
import { createClient } from '@/lib/supabase-client';

const navItems = [
  { href: '/', label: 'Today' },
  { href: '/sales', label: 'New Sale' },
  { href: '/customers', label: 'Regulars' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
];

export default function TopHeader() {
  const pathname = usePathname();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <header className="border-b-2 border-ink bg-paper/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <DropMark size={36} />
          <div className="leading-none">
            <div className="font-display italic font-extrabold text-2xl tracking-tight">
              SerenePure
            </div>
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted mt-0.5">
              Mabalacat City · Water Station
            </div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 font-mono text-[11px] tracking-widest uppercase transition-colors ${
                  active ? 'bg-ink text-paper' : 'hover:bg-water-mist'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={signOut}
            className="ml-2 px-3 py-1.5 font-mono text-[11px] tracking-widest uppercase border border-ink hover:bg-ink hover:text-paper transition-colors"
          >
            Sign Out
          </button>
        </nav>
      </div>
    </header>
  );
}
