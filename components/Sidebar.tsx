'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Logo } from './Logo';
import { NAV_ICONS, type NavIconKey } from './icons';

export type NavEntry = { href: string; label: string; icon: NavIconKey; badge?: number; group: string };

export function Sidebar({
  nav,
  eventName,
  eventTagline,
}: {
  nav: NavEntry[];
  eventName: string;
  eventTagline: string;
}) {
  const path = usePathname();
  const groups = Array.from(new Set(nav.map((n) => n.group)));

  return (
    <aside className="sticky top-0 hidden h-screen w-[214px] shrink-0 flex-col bg-navy-900 lg:flex">
      <div className="border-b border-white/10 px-5 pb-5 pt-6">
        <Link href="/dashboard">
          <Logo tone="light" size="md" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 pl-2 pr-3">
        {groups.map((group, gi) => (
          <div key={group} className={gi > 0 ? 'mt-5' : ''}>
            <p className="mb-1.5 pl-3 text-2xs font-semibold uppercase tracking-label text-white/30">
              {group}
            </p>
            {nav
              .filter((n) => n.group === group)
              .map((item) => {
                const active = path === item.href || path.startsWith(item.href + '/');
                const Icon = NAV_ICONS[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx('nav-item', active && 'nav-item-active')}
                  >
                    <Icon size={15} className="shrink-0 opacity-80" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {!!item.badge && (
                      <span
                        className={clsx(
                          'min-w-[18px] rounded-[3px] px-1 text-center text-[10.5px] font-bold tabular-nums',
                          active ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70',
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="display text-[15px] leading-tight text-white">{eventName}</p>
        <p className="mt-1 text-[11.5px] leading-snug text-white/45">{eventTagline}</p>
      </div>
    </aside>
  );
}

export function MobileNav({ nav }: { nav: NavEntry[] }) {
  const path = usePathname();
  return (
    <nav className="sticky top-0 z-30 flex gap-1 overflow-x-auto border-b border-line bg-white px-3 py-2 lg:hidden">
      {nav.map((item) => {
        const active = path === item.href || path.startsWith(item.href + '/');
        const Icon = NAV_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex shrink-0 items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[12.5px] font-medium',
              active ? 'bg-navy text-white' : 'text-ink-muted hover:bg-paper',
            )}
          >
            <Icon size={14} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
