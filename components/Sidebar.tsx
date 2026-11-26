'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Logo } from './Logo';
import { NAV_ICONS, IconAgenda, IconAlert, type NavIconKey } from './icons';

export type NavEntry = { href: string; label: string; icon: NavIconKey; badge?: number; group: string };

export function Sidebar({
  nav,
  eventName,
  eventTagline,
  daysToGo,
  overdue = 0,
}: {
  nav: NavEntry[];
  eventName: string;
  eventTagline: string;
  daysToGo?: number | null;
  overdue?: number;
}) {
  const path = usePathname();
  const groups = Array.from(new Set(nav.map((n) => n.group)));

  return (
    <aside className="sticky top-3 m-3 mr-0 hidden h-[calc(100vh-24px)] w-[236px] shrink-0 flex-col rounded-[24px] bg-white shadow-card lg:flex">
      <div className="px-5 pb-4 pt-5">
        <Link href="/dashboard" aria-label="DISCOVER home">
          <Logo tone="dark" size="md" />
        </Link>
      </div>

      {/* The current cycle, styled as a workspace switcher. */}
      <div className="mx-3 flex items-center gap-3 rounded-tile bg-panel px-3 py-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink">
          <IconAgenda size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight text-ink">{eventName}</span>
          <span className="block truncate text-[11.5px] leading-tight text-ink-faint">
            {daysToGo != null && daysToGo >= 0 ? `${daysToGo} days to go` : eventTagline}
          </span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {groups.map((group, gi) => (
          <div key={group || 'top'} className={gi > 0 ? 'mt-3' : ''}>
            {group && <p className="mb-1.5 px-3.5 text-[11.5px] font-medium text-ink-faint">{group}</p>}
            <div className="space-y-0.5">
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
                      <Icon size={16} className="shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {!!item.badge && (
                        <span
                          className={clsx(
                            'text-[12px] font-medium tabular-nums',
                            active ? 'text-white/70' : 'text-ink-faint',
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* The one thing that needs you, in the accent colour. */}
      <div className="p-3">
        {overdue > 0 ? (
          <div className="rounded-[18px] bg-lime p-3 text-lime-ink">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-ink text-lime">
                <IconAlert size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight">Needs attention</span>
                <span className="block text-[11.5px] leading-tight opacity-75">Past their due date</span>
              </span>
            </div>
            <Link
              href="/tasks?filter=overdue"
              className="mt-3 flex items-center justify-between rounded-full bg-snow px-3.5 py-2 text-[12.5px] font-semibold text-lime-ink hover:bg-snow/80"
            >
              {overdue} overdue {overdue === 1 ? 'task' : 'tasks'}
              <span aria-hidden>›</span>
            </Link>
          </div>
        ) : (
          <div className="rounded-[18px] bg-panel p-3">
            <p className="text-[13px] font-semibold text-ink">All caught up</p>
            <p className="mt-0.5 text-[11.5px] text-ink-faint">{eventTagline}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
