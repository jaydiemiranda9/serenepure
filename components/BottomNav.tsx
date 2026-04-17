'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/sales', label: 'Sale', icon: 'plus' },
  { href: '/customers', label: 'Regulars', icon: 'users' },
  { href: '/expenses', label: 'Expenses', icon: 'wallet' },
  { href: '/reports', label: 'Reports', icon: 'chart' },
];

function Icon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? '#f7f9fc' : '#0a1628';
  const common = { width: 22, height: 22, fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return <svg {...common} viewBox="0 0 24 24"><path d="M3 12 12 3l9 9" /><path d="M5 10v10h14V10" /></svg>;
    case 'plus':
      return <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>;
    case 'users':
      return <svg {...common} viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 11a3 3 0 0 0 0-6" /><path d="M21 20c0-2-1.5-4-4-4.5" /></svg>;
    case 'wallet':
      return <svg {...common} viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M3 10h18" /><circle cx="17" cy="14" r="1" fill={stroke} /></svg>;
    case 'chart':
      return <svg {...common} viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
    default:
      return null;
  }
}

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-paper border-t-2 border-ink md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
                  active ? 'bg-ink text-paper' : 'text-ink'
                }`}
              >
                <Icon name={item.icon} active={active} />
                <span className="font-mono text-[10px] tracking-widest uppercase">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
