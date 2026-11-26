'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar } from './ui';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { IconSearch, IconAdmin, IconTeam, IconChat } from './icons';
import type { NavEntry } from './Sidebar';

export function Topbar({
  user,
  unread,
  notices,
  roleName,
  canAdmin,
  nav,
}: {
  user: { name: string; email: string; accent: string; title?: string | null; company?: string | null };
  unread: number;
  notices: number;
  roleName: string;
  canAdmin: boolean;
  nav: NavEntry[];
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  // On a phone the header names the page, since there is no sidebar to show it.
  const here = nav.find((n) => path === n.href || path.startsWith(n.href + '/'));

  return (
    <header className="sticky top-0 z-30 flex h-[56px] items-center gap-2 border-b border-line bg-white/95 px-3.5 backdrop-blur sm:gap-3 sm:px-5 lg:h-[72px] lg:border-b-0 lg:bg-paper/85 lg:px-6">
      {/* Phone and tablet: the mark and the page you are on. */}
      <Link href="/dashboard" className="shrink-0 lg:hidden" aria-label="DISCOVER home">
        <Logo tone="dark" size="sm" tagline={false} />
      </Link>
      {here && (
        <span className="ml-1 hidden truncate border-l border-line pl-3 text-[14px] font-semibold text-ink min-[420px]:block lg:hidden">
          {here.label}
        </span>
      )}

      <form action="/search" className="relative hidden min-w-0 max-w-sm flex-1 lg:block">
        <IconSearch
          size={15}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          name="q"
          placeholder="Search tasks, people, speakers, messages"
          className="input rounded-full border-transparent bg-white py-2.5 pl-10 text-[13px] shadow-card"
          aria-label="Search"
        />
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
      <Link
        href="/search"
        className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-paper lg:hidden"
        aria-label="Search"
      >
        <IconSearch size={19} />
      </Link>

      <ThemeToggle />
      <NotificationBell initialCount={notices} />

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-[44px] items-center gap-2.5 rounded-full py-1 pl-1 pr-1 hover:bg-white lg:min-h-0 lg:bg-white lg:pr-3.5 lg:shadow-card"
        >
          <Avatar name={user.name} accent={user.accent} size={28} />
          <span className="hidden text-left sm:block">
            <span className="block text-[12.5px] font-semibold leading-tight text-ink">{user.name}</span>
            <span className="block text-[11px] leading-tight text-ink-faint">
              {roleName}
            </span>
          </span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-1.5 w-[248px] overflow-hidden rounded-[18px] border border-line bg-white shadow-pop">
              <div className="flex items-start gap-3 border-b border-line bg-panel px-4 py-3.5">
                <Avatar name={user.name} accent={user.accent} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold leading-tight text-ink">{user.name}</p>
                  <p className="truncate text-[11.5px] leading-tight text-ink-muted">{user.title ?? ''}</p>
                  <p className="truncate text-[11px] leading-tight text-ink-faint">{user.email}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-lime px-2 py-[2px] text-[10.5px] font-semibold text-lime-ink">
                    {roleName}
                  </span>
                </div>
              </div>

              <nav className="py-1">
                {canAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ink hover:bg-panel/60"
                  >
                    <IconAdmin size={15} className="text-ink-faint" />
                    Admin &amp; access
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ink hover:bg-panel/60"
                >
                  <IconTeam size={15} className="text-ink-faint" />
                  Your profile
                </Link>
                <Link
                  href="/team"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ink hover:bg-panel/60"
                >
                  <IconTeam size={15} className="text-ink-faint" />
                  Member directory
                </Link>
                <Link
                  href="/chat"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ink hover:bg-panel/60"
                >
                  <IconChat size={15} className="text-ink-faint" />
                  Messages
                  {unread > 0 && (
                    <span className="ml-auto rounded-md bg-brick px-1.5 text-[10px] font-bold text-snow">
                      {unread}
                    </span>
                  )}
                </Link>
              </nav>

              <form action="/api/logout" method="post" className="border-t border-line">
                <button className="w-full px-4 py-2.5 text-left text-[13px] font-medium text-brick hover:bg-brick-100">
                  Sign out
                </button>
              </form>
            </div>
          </>
        )}
      </div>
      </div>
    </header>
  );
}
