'use client';

import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Avatar } from '@/components/ui';
import { IconSearch } from '@/components/icons';
import { MessageButton } from '@/components/MessageButton';

export type Person = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  accent: string;
  role: string;
  roleKey: string;
  workstreams: { name: string; color: string }[];
  href: string | null;
};

export function Directory({
  people,
  roles,
  meId,
  canDm = false,
}: {
  people: Person[];
  roles: { key: string; name: string }[];
  meId: string;
  canDm?: boolean;
}) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<string | null>(null);

  const shown = people.filter(
    (p) =>
      (!role || p.roleKey === role) &&
      `${p.name} ${p.title ?? ''} ${p.company ?? ''} ${p.workstreams.map((w) => w.name).join(' ')}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Directory</h2>
          <p className="text-[12.5px] text-ink-muted">Everyone with an account, by role.</p>
        </div>
        <label className="relative w-full sm:w-64">
          <IconSearch size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a person or workstream"
            aria-label="Find a person"
            className="input rounded-full bg-panel py-1.5 pl-9"
          />
        </label>
      </div>

      <div className="chip-row mt-3 flex flex-wrap gap-2">
        {[{ key: null as string | null, name: 'Everyone' }, ...roles].map((r) => {
          const n = r.key ? people.filter((p) => p.roleKey === r.key).length : people.length;
          const active = role === r.key;
          return (
            <button
              key={r.key ?? 'all'}
              type="button"
              onClick={() => setRole(r.key)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                active ? 'bg-navy text-white' : 'bg-panel text-ink-muted hover:text-ink',
              )}
            >
              {r.name}
              <span className={clsx('rounded-full px-1.5 text-[11px] font-semibold', active ? 'bg-white/20' : 'bg-white')}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((p) => {
          const body = (
            <>
              <Avatar name={p.name} accent={p.accent} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{p.name}</p>
                <p className="truncate text-[12.5px] text-ink-muted">
                  {p.title ?? p.role}
                  {p.company ? ` · ${p.company}` : ''}
                </p>
                {p.email && <p className="truncate text-[12px] text-ink-faint">{p.email}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-navy px-2 py-[2px] text-[11px] font-medium text-white">{p.role}</span>
                  {p.workstreams.map((w) => (
                    <span key={w.name} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-[2px] text-[11px] text-ink-muted">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: w.color }} />
                      {w.name}
                    </span>
                  ))}
                </div>
              </div>
            </>
          );
          const dm = canDm && p.id !== meId;
          return (
            // The Message button sits beside the card's link, never inside it.
            <div key={p.id} className="relative">
              {p.href ? (
                <Link prefetch={false} href={p.href} className={`subcard flex h-full items-start gap-3 p-3.5 transition hover:ring-1 hover:ring-line-strong ${dm ? 'pb-12' : ''}`}>
                  {body}
                </Link>
              ) : (
                <div className={`subcard flex h-full items-start gap-3 p-3.5 ${dm ? 'pb-12' : ''}`}>{body}</div>
              )}
              {dm && <MessageButton userId={p.id} name={p.name} className="absolute bottom-2.5 right-2.5 bg-white" />}
            </div>
          );
        })}
        {shown.length === 0 && (
          <p className="col-span-full py-8 text-center text-[13px] text-ink-faint">Nobody matches “{q}”.</p>
        )}
      </div>
    </section>
  );
}
