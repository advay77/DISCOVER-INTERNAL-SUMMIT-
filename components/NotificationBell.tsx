'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconBell } from './icons';
import { relativeTime } from '@/lib/format';

type Note = {
  id: string;
  kind: string;
  text: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [count, setCount] = useState(initialCount);
  const router = useRouter();

  const load = useCallback(async () => {
    const res = await fetch('/api/notifications', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setNotes(data.notifications ?? []);
    setCount(typeof data.unread === 'number' ? data.unread : 0);
  }, []);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  async function mark(id?: string) {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    await load();
  }

  async function openNote(note: Note) {
    setOpen(false);
    if (!note.readAt) await mark(note.id);
    if (note.link) router.push(note.link);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-paper hover:text-ink lg:h-8 lg:w-8 lg:rounded-[4px]"
        aria-label={count > 0 ? `${count} notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <IconBell size={17} />
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 h-[7px] w-[7px] rounded-full bg-brick ring-2 ring-white" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-[320px] overflow-hidden rounded-[5px] border border-line bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <p className="text-[13px] font-semibold text-ink">Notifications</p>
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => mark()}
                  className="text-[12px] font-semibold text-brand hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {notes.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-ink-faint">No notifications yet.</p>
              ) : (
                notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => openNote(note)}
                    className="flex w-full items-start gap-2.5 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-paper"
                  >
                    <span
                      className={
                        note.readAt
                          ? 'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-transparent'
                          : 'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brick'
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className={note.readAt ? 'block text-[13px] text-ink-muted' : 'block text-[13px] font-semibold text-ink'}>
                        {note.text}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-ink-faint">{relativeTime(note.createdAt)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
