'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { NAV_ICONS, IconMore } from './icons';
import type { NavEntry } from './Sidebar';

/**
 * The phone and tablet navigation: a bottom tab bar with the four places people
 * go most, and a "More" sheet for everything else. Hidden on desktop, where the
 * sidebar does this job.
 */
const PRIMARY = ['/dashboard', '/tasks', '/chat', '/events'];

const SHORT: Record<string, string> = {
  '/dashboard': 'Home',
  '/tasks': 'Tasks',
  '/chat': 'Messages',
  '/events': 'Events',
};

export function MobileTabBar({ nav }: { nav: NavEntry[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Close the sheet whenever the page changes.
  useEffect(() => setOpen(false), [path]);

  const primary = PRIMARY.map((href) => nav.find((n) => n.href === href)).filter(Boolean) as NavEntry[];
  const rest = nav.filter((n) => !PRIMARY.includes(n.href));
  const isActive = (href: string) => path === href || path.startsWith(href + '/');
  const moreActive = rest.some((n) => isActive(n.href));
  const groups = Array.from(new Set(rest.map((n) => n.group || 'General')));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button
            className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-[14px] bg-white pb-[calc(env(safe-area-inset-bottom)+76px)] shadow-pop">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-5 py-3.5">
              <p className="text-[15px] font-semibold text-ink">More</p>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-panel/60"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {groups.map((g) => (
              <div key={g} className="px-3 pt-3">
                <p className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-label text-ink-faint">{g}</p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {rest
                    .filter((n) => (n.group || 'General') === g)
                    .map((n) => {
                      const Icon = NAV_ICONS[n.icon];
                      const active = isActive(n.href);
                      return (
                        <Link
                          key={n.href}
                          href={n.href}
                          className={clsx(
                            'flex min-h-[52px] items-center gap-3 rounded-[8px] border px-3 text-[14px] font-medium',
                            active ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink active:bg-paper',
                          )}
                        >
                          <Icon size={18} className={active ? 'text-white' : 'text-ink-muted'} />
                          <span className="truncate">{n.label}</span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}

            <form action="/api/logout" method="post" className="px-5 pt-5">
              <button className="min-h-[48px] w-full rounded-[8px] border border-brick/30 text-[14px] font-medium text-brick active:bg-brick-100">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {primary.map((n) => {
            const Icon = NAV_ICONS[n.icon];
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  'relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium',
                  active ? 'text-navy' : 'text-ink-faint',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {active && <span className="absolute inset-x-5 top-0 h-[2px] rounded-full bg-brass" />}
                <span className="relative">
                  <Icon size={21} />
                  {!!n.badge && n.href === '/chat' && (
                    <span className="absolute -right-2 -top-1.5 min-w-[16px] rounded-full bg-brick px-1 text-center text-[9.5px] font-bold leading-4 text-snow">
                      {n.badge > 9 ? '9+' : n.badge}
                    </span>
                  )}
                </span>
                {SHORT[n.href] ?? n.label}
              </Link>
            );
          })}
          <button
            onClick={() => setOpen((v) => !v)}
            className={clsx(
              'relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium',
              open || moreActive ? 'text-navy' : 'text-ink-faint',
            )}
            aria-expanded={open}
          >
            {moreActive && !open && <span className="absolute inset-x-5 top-0 h-[2px] rounded-full bg-brass" />}
            <IconMore size={21} />
            More
          </button>
        </div>
      </nav>
    </>
  );
}
