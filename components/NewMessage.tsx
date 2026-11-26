'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Avatar } from './ui';
import { IconSearch, IconPlus } from './icons';

type Person = { id: string; name: string; accent: string; role: string; company: string };

/** Opens (or creates) a one-to-one conversation. Returns its key, or throws with a message. */
export async function openDm(userId: string): Promise<string> {
  const res = await fetch('/api/dm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.key) throw new Error(data.error ?? 'Could not open the conversation.');
  return data.key as string;
}

/**
 * "New message": pick a person, land in your conversation with them. If the
 * two of you already have one, that one opens.
 */
export function NewMessage({ meId, variant = 'icon' }: { meId: string; variant?: 'icon' | 'row' }) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open || people) return;
    fetch('/api/people')
      .then((r) => r.json())
      .then((d) => setPeople((d.people ?? []).filter((p: Person) => p.id !== meId)))
      .catch(() => setPeople([]));
  }, [open, people, meId]);

  async function pick(p: Person) {
    setBusy(p.id);
    setError(null);
    try {
      const key = await openDm(p.id);
      setOpen(false);
      router.push(`/chat/${key}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the conversation.');
    } finally {
      setBusy(null);
    }
  }

  const shown = (people ?? []).filter((p) => `${p.name} ${p.role} ${p.company}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="New message"
          title="New message"
          className="flex h-6 w-6 items-center justify-center rounded-full text-ink-faint transition hover:bg-panel hover:text-ink"
        >
          <IconPlus size={13} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13.5px] font-semibold text-accent"
        >
          <IconPlus size={13} /> New message
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-navy/45 p-4 py-10"
          role="dialog"
          aria-modal="true"
          aria-label="New message"
        >
          <div className="card my-auto w-full max-w-md p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-ink">New message</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink" aria-label="Close">
                ✕
              </button>
            </div>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">Only the two of you can see a direct message.</p>

            <label className="relative mt-3 block">
              <IconSearch size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find a person"
                aria-label="Find a person to message"
                className="input rounded-full bg-panel py-2 pl-9"
              />
            </label>

            {error && <p className="mt-2 text-[12.5px] font-medium text-brick">{error}</p>}

            <div className="mt-3 max-h-[50vh] space-y-0.5 overflow-y-auto">
              {people === null && <p className="py-6 text-center text-[13px] text-ink-faint">Loading…</p>}
              {people !== null && shown.length === 0 && (
                <p className="py-6 text-center text-[13px] text-ink-faint">Nobody matches “{q}”.</p>
              )}
              {shown.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={!!busy}
                  onClick={() => pick(p)}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-panel',
                    busy === p.id && 'opacity-60',
                  )}
                >
                  <Avatar name={p.name} accent={p.accent} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{p.name}</span>
                    <span className="block truncate text-[12px] text-ink-faint">
                      {p.role}
                      {p.company ? ` · ${p.company}` : ''}
                    </span>
                  </span>
                  <span className="text-[12px] font-semibold text-accent">{busy === p.id ? 'Opening…' : 'Message'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
