'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar } from './ui';
import { Logo } from './Logo';
import { IconSearch, IconBell, IconAdmin, IconTeam, IconChat } from './icons';
import type { NavEntry } from './Sidebar';

export function Topbar({
  user,
  unread,
  roleName,
  canAdmin,
  nav,
}: {
  user: { name: string; email: string; accent: string; title?: string | null; company?: string | null };
  unread: number;
  roleName: string;
  canAdmin: boolean;
  nav: NavEntry[];
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  // On a phone the header names the page, since there is no sidebar to show it.
  const here = nav.find((n) => path === n.href || path.startsWith(n.href + '/'));

  return (
    <header className="sticky top-0 z-30 flex h-[56px] items-center gap-2 border-b border-line bg-white/95 px-3.5 backdrop-blur sm:gap-3 sm:px-5 lg:h-[52px] lg:px-6">
      {/* Phone and tablet: the mark and the page you are on. */}
      <Link href="/dashboard" className="shrink-0 lg:hidden" aria-label="DISCOVER home">
        <Logo tone="dark" size="sm" tagline={false} />
      </Link>
      {here && (
        <span className="ml-1 hidden truncate border-l border-line pl-3 text-[14px] font-semibold text-ink min-[420px]:block lg:hidden">
          {here.label}
        </span>
      )}

      <form action="/search" className="relative hidden max-w-sm flex-1 lg:block">
        <IconSearch
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          name="q"
          placeholder="Search tasks, people, speakers, messages"
          className="input py-1.5 pl-8 text-[13px]"
          aria-label="Search"
        />
      </form>

      <div className="flex-1 lg:hidden" />

      <Link
        href="/search"
        className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-paper lg:hidden"
        aria-label="Search"
      >
        <IconSearch size={19} />
      </Link>

      <Link
        href="/chat"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-paper hover:text-ink lg:h-8 lg:w-8 lg:rounded-[4px]"
        aria-label={unread > 0 ? `${unread} unread messages` : 'Messages'}
      >
        <IconBell size={17} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 h-[7px] w-[7px] rounded-full bg-brick ring-2 ring-white" />
        )}
      </Link>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-[44px] items-center gap-2.5 rounded-[4px] py-1 pl-1 pr-1 hover:bg-paper lg:min-h-0 lg:pr-2"
        >
          <Avatar name={user.name} accent={user.accent} size={28} />
          <span className="hidden text-left sm:block">
            <span className="block text-[12.5px] font-semibold leading-tight text-ink">{user.name}</span>
            <span className="block text-[10.5px] uppercase tracking-label leading-tight text-ink-faint">
              {roleName}
            </span>
          </span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-1.5 w-[248px] overflow-hidden rounded-[5px] border border-line bg-white shadow-pop">
              <div className="flex items-start gap-3 border-b border-line bg-paper px-4 py-3.5">
                <Avatar name={user.name} accent={user.accent} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold leading-tight text-ink">{user.name}</p>
                  <p className="truncate text-[11.5px] leading-tight text-ink-muted">{user.title ?? ''}</p>
                  <p className="truncate text-[11px] leading-tight text-ink-faint">{user.email}</p>
                  <span className="mt-1.5 inline-block rounded-[3px] border border-navy/20 bg-navy/[0.06] px-1.5 py-[2px] text-[10px] font-bold uppercase tracking-label text-navy">
                    {roleName}
                  </span>
                </div>
              </div>

              <nav className="py-1">
                {canAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ink hover:bg-paper"
                  >
                    <IconAdmin size={15} className="text-ink-faint" />
                    Admin &amp; access
                  </Link>
                )}
                <Link
                  href="/team"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ink hover:bg-paper"
                >
                  <IconTeam size={15} className="text-ink-faint" />
                  Member directory
                </Link>
                <Link
                  href="/chat"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ink hover:bg-paper"
                >
                  <IconChat size={15} className="text-ink-faint" />
                  Messages
                  {unread > 0 && (
                    <span className="ml-auto rounded-[3px] bg-brick px-1.5 text-[10px] font-bold text-white">
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
    </header>
  );
}
