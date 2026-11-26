'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Avatar, Pill } from './ui';
import { IconPlus, IconSearch, IconHash, IconLock } from './icons';

type Person = { id: string; name: string; accent: string; role: string; company: string };

/* ------------------------------------------------------------ create */

export function NewChannel({ canCreate, variant = 'icon' }: { canCreate: boolean; variant?: 'icon' | 'button' }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [people, setPeople] = useState<Person[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open || people.length) return;
    fetch('/api/people')
      .then((r) => r.json())
      .then((d) => setPeople(d.people ?? []))
      .catch(() => {});
  }, [open, people.length]);

  if (!canCreate) return null;

  const key = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const shown = people.filter(
    (p) =>
      !filter ||
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.company.toLowerCase().includes(filter.toLowerCase()),
  );

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, purpose, type, memberIds: picked }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'That did not work.');
        return;
      }
      setOpen(false);
      setName('');
      setPurpose('');
      setPicked([]);
      router.push(`/chat/${data.channel.key}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          variant === 'button'
            ? 'btn-primary'
            : 'rounded-[3px] p-0.5 text-ink-faint transition hover:bg-line hover:text-ink'
        }
        title="Create a channel"
        aria-label="Create a channel"
      >
        {variant === 'button' ? 'New channel' : <IconPlus size={14} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/35 p-4 py-10 backdrop-blur-sm">
          <div className="card my-auto w-full max-w-lg p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="display text-[22px] text-ink">Create a channel</h2>
                <p className="mt-1 text-[12.5px] text-ink-muted">
                  Channels are where a piece of the work gets talked about.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-[5px] border border-line-strong px-3 focus-within:border-navy">
                  <IconHash size={15} className="text-ink-faint" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="day-of-logistics"
                    className="w-full bg-transparent py-2 text-[13.5px] outline-none placeholder:text-ink-faint"
                    autoFocus
                  />
                </div>
                {name && <p className="mt-1 text-[11.5px] text-ink-faint">Will appear as #{key}</p>}
              </div>

              <div>
                <label className="label">What it is for</label>
                <input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Registration desk, signage and the run sheet on the day"
                  className="input mt-1.5"
                />
              </div>

              <div>
                <label className="label">Visibility</label>
                <div className="mt-1.5 grid grid-cols-2 overflow-hidden rounded-[5px] border border-line-strong">
                  {(['public', 'private'] as const).map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={clsx(
                        'flex items-center justify-center gap-2 py-2 text-[12.5px] font-semibold capitalize',
                        i === 1 && 'border-l border-line-strong',
                        type === t ? 'bg-navy text-white' : 'bg-white text-ink-muted hover:bg-paper',
                      )}
                    >
                      {t === 'private' ? <IconLock size={13} /> : <IconHash size={13} />}
                      {t}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11.5px] text-ink-faint">
                  {type === 'public'
                    ? 'Anyone in DISCOVER can find it and join.'
                    : 'Only the people you add can see that it exists.'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Add people</label>
                  <span className="text-[11.5px] text-ink-faint">
                    {picked.length} selected
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-2 rounded-[5px] border border-line-strong px-3">
                  <IconSearch size={14} className="text-ink-faint" />
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search by name or company"
                    className="w-full bg-transparent py-2 text-[13px] outline-none placeholder:text-ink-faint"
                  />
                </div>

                <div className="mt-2 max-h-52 divide-y divide-line overflow-y-auto rounded-[5px] border border-line">
                  {shown.map((p) => {
                    const on = picked.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setPicked((v) => (on ? v.filter((x) => x !== p.id) : [...v, p.id]))
                        }
                        className={clsx(
                          'flex w-full items-center gap-3 px-3 py-2 text-left transition',
                          on ? 'bg-brand-50' : 'hover:bg-paper',
                        )}
                      >
                        <Avatar name={p.name} accent={p.accent} size={24} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                          <span className="block truncate text-[11px] text-ink-faint">
                            {p.role}
                            {p.company ? ` · ${p.company}` : ''}
                          </span>
                        </span>
                        <span
                          className={clsx(
                            'flex h-4 w-4 items-center justify-center rounded-[3px] border text-[10px] font-bold',
                            on ? 'border-brand bg-brand text-white' : 'border-line-strong text-transparent',
                          )}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })}
                  {shown.length === 0 && (
                    <p className="px-3 py-6 text-center text-[12.5px] text-ink-faint">No one matches that.</p>
                  )}
                </div>
              </div>

              {error && <p className="text-[12.5px] font-medium text-brick">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary" disabled={busy || key.length < 2} onClick={create}>
                  {busy ? 'Creating…' : 'Create channel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ----------------------------------------------------------- members */

export function ChannelMembers({
  channelId,
  channelName,
  memberCount,
  canManage,
}: {
  channelId: string;
  channelName: string;
  memberCount: number;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ members: Person[]; candidates: Person[] } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = () =>
    fetch(`/api/channels/${channelId}/members`)
      .then((r) => r.json())
      .then((d) => setData({ members: d.members ?? [], candidates: d.candidates ?? [] }))
      .catch(() => {});

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, channelId]);

  async function add() {
    if (!picked.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/channels/${channelId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userIds: picked }),
      });
      const d = await res.json();
      if (!res.ok) setError(d.error ?? 'That did not work.');
      else {
        setPicked([]);
        await load();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    setError(null);
    const res = await fetch(`/api/channels/${channelId}/members`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setError(d.error ?? 'That did not work.');
    else {
      await load();
      router.refresh();
    }
  }

  const candidates = (data?.candidates ?? []).filter(
    (p) => !filter || p.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-[3px] border border-line px-2 py-1 text-2xs font-semibold uppercase tracking-label text-ink-muted transition hover:border-line-strong hover:text-ink"
      >
        {memberCount} members
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/35 p-4 py-10 backdrop-blur-sm">
          <div className="card my-auto w-full max-w-lg p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="display text-[22px] text-ink">#{channelName}</h2>
                <p className="mt-1 text-[12.5px] text-ink-muted">
                  {data?.members.length ?? memberCount} people are in this channel.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
                ✕
              </button>
            </div>

            {error && (
              <p className="mb-3 rounded-[4px] border border-brick/30 bg-brick-100 px-3 py-2 text-[12.5px] font-medium text-brick">
                {error}
              </p>
            )}

            <div className="max-h-56 divide-y divide-line overflow-y-auto rounded-[5px] border border-line">
              {(data?.members ?? []).map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <Avatar name={p.name} accent={p.accent} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      {p.role}
                      {p.company ? ` · ${p.company}` : ''}
                    </span>
                  </span>
                  {canManage && (
                    <button
                      onClick={() => remove(p.id)}
                      className="text-[12px] font-semibold text-ink-faint hover:text-brick"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {!data && <p className="px-3 py-6 text-center text-[12.5px] text-ink-faint">Loading…</p>}
            </div>

            <div className="mt-5">
              <label className="label">Add people</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-[5px] border border-line-strong px-3">
                <IconSearch size={14} className="text-ink-faint" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search everyone in DISCOVER"
                  className="w-full bg-transparent py-2 text-[13px] outline-none placeholder:text-ink-faint"
                />
              </div>

              <div className="mt-2 max-h-44 divide-y divide-line overflow-y-auto rounded-[5px] border border-line">
                {candidates.map((p) => {
                  const on = picked.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPicked((v) => (on ? v.filter((x) => x !== p.id) : [...v, p.id]))}
                      className={clsx(
                        'flex w-full items-center gap-3 px-3 py-2 text-left',
                        on ? 'bg-brand-50' : 'hover:bg-paper',
                      )}
                    >
                      <Avatar name={p.name} accent={p.accent} size={24} />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{p.name}</span>
                      <Pill tone={on ? 'brand' : 'neutral'} dot={false}>
                        {on ? 'Adding' : p.role}
                      </Pill>
                    </button>
                  );
                })}
                {data && candidates.length === 0 && (
                  <p className="px-3 py-6 text-center text-[12.5px] text-ink-faint">
                    Everyone is already in this channel.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>
                Close
              </button>
              <button className="btn-primary" disabled={busy || !picked.length} onClick={add}>
                {busy ? 'Adding…' : picked.length ? `Add ${picked.length}` : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
