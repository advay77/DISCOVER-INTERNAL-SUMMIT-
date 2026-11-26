'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconHash } from './icons';

type Row = { id: string; key: string; name: string; purpose: string | null };

/** Public channels the person is not in yet — Slack's "browse channels". */
export function BrowseChannels() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    fetch('/api/channels')
      .then((r) => r.json())
      .then((d) => setRows(d.channels ?? []))
      .catch(() => setRows([]));
  }, [open]);

  async function join(row: Row) {
    setBusy(row.id);
    try {
      const res = await fetch(`/api/channels/${row.id}/join`, { method: 'POST' });
      if (!res.ok) return;
      setOpen(false);
      router.push(`/chat/${row.key}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg px-2 py-1.5 text-left text-[12.5px] font-medium text-ink-muted transition hover:bg-paper hover:text-ink"
      >
        Browse channels
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/45 p-4 py-10">
          <div className="card my-auto w-full max-w-md p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="display text-[22px] text-ink">Browse channels</h2>
                <p className="mt-1 text-[12.5px] text-ink-muted">
                  Public channels you are not in yet.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
                ✕
              </button>
            </div>

            <div className="max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {rows === null && (
                <p className="px-3 py-6 text-center text-[12.5px] text-ink-faint">Loading…</p>
              )}
              {rows?.length === 0 && (
                <p className="px-3 py-6 text-center text-[12.5px] text-ink-faint">
                  You are already in every public channel.
                </p>
              )}
              {rows?.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <IconHash size={14} className="shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{r.name}</span>
                    {r.purpose && (
                      <span className="block truncate text-[11.5px] text-ink-faint">{r.purpose}</span>
                    )}
                  </span>
                  <button
                    onClick={() => join(r)}
                    disabled={busy === r.id}
                    className="btn-ghost btn-sm shrink-0"
                  >
                    {busy === r.id ? '…' : 'Join'}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button className="btn-ghost" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
