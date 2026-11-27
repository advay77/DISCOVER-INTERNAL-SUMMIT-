'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { parseNotes, type Draft } from '@/lib/notes';
import { createTasksFromNotes } from '@/app/actions';

const EXAMPLE = `Summit planning call
- Odi to confirm the hotel room block by Dec 5 (urgent)
- @Taylor send the Save the Date email next week
- Finalise sponsor prospectus pricing by Friday
- Collect invoices from the AV vendor - low priority`;

/**
 * "Tasks from notes": paste meeting notes, review the tasks found in them,
 * then create them all at once.
 */
export function NotesToTasks({
  workstreams,
  people,
  currentUserId,
  defaultWorkstreamId,
}: {
  workstreams: { id: string; name: string }[];
  people: { id: string; name: string }[];
  currentUserId: string;
  defaultWorkstreamId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [defaultWs, setDefaultWs] = useState(defaultWorkstreamId ?? workstreams.find((w) => /summit/i.test(w.name))?.id ?? workstreams[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const chosen = useMemo(() => drafts?.filter((d) => d.include && d.title.trim()) ?? [], [drafts]);

  const read = () => {
    setError(null);
    const found = parseNotes(notes, { people, streams: workstreams, meId: currentUserId, defaultStreamId: defaultWs });
    if (!found.length) return setError('No action items found. Put each task on its own line.');
    setDrafts(found);
  };
  const edit = (key: string, patch: Partial<Draft>) => setDrafts((ds) => ds!.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const close = () => { setOpen(false); setDrafts(null); setNotes(''); setError(null); setDone(null); };

  const create = () =>
    start(async () => {
      setError(null);
      const res: any = await createTasksFromNotes(chosen.map(({ title, ownerId, workstreamId, dueDate, priority, source }) => ({ title, ownerId, workstreamId, dueDate, priority, source })));
      if (res?.error) return setError(res.error);
      setDone(`${res.created} task${res.created === 1 ? '' : 's'} created${res.skipped?.length ? ` · ${res.skipped.length} skipped` : ''}.`);
      router.refresh();
      setTimeout(close, 1400);
    });

  const cell = 'input py-1.5 text-[13px]';

  return (
    <>
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        Tasks from notes
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/45 p-3 py-8 sm:p-4 sm:py-10" role="dialog" aria-modal="true" aria-label="Tasks from meeting notes">
          <div className={clsx('card my-auto w-full p-5 sm:p-6', drafts ? 'max-w-5xl' : 'max-w-2xl')}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">{drafts ? `Review ${drafts.length} task${drafts.length === 1 ? '' : 's'}` : 'Tasks from meeting notes'}</h2>
              <button type="button" onClick={close} className="text-ink-faint hover:text-ink" aria-label="Close">✕</button>
            </div>

            {!drafts ? (
              <>
                <p className="text-[13px] text-ink-muted">
                  Paste the notes. Each action line becomes a task. Names, dates (“by Dec 5”, “next week”, “Friday”), priority (“urgent”, “low priority”) and workstream words (“sponsor”, “LinkedIn”, “budget”) are picked up for you. You review everything before anything is created.
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={11}
                  autoFocus
                  aria-label="Meeting notes"
                  placeholder={EXAMPLE}
                  className="input mt-4 font-mono text-[13px] leading-relaxed"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-[13px] text-ink-muted">
                    Default workstream
                    <select className="input w-auto py-1.5" value={defaultWs} onChange={(e) => setDefaultWs(e.target.value)}>
                      {workstreams.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    {!notes && <button type="button" className="btn-ghost" onClick={() => setNotes(EXAMPLE)}>Try an example</button>}
                    <button type="button" className="btn-primary" onClick={read} disabled={!notes.trim()}>Find tasks →</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] text-ink-muted">Check each row, fix anything that was read wrong, untick what you don’t need.</p>
                <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                  {drafts.map((d) => (
                    <div key={d.key} className={clsx('subcard p-3 transition', !d.include && 'opacity-50')}>
                      <div className="flex items-start gap-2.5">
                        <input type="checkbox" checked={d.include} onChange={(e) => edit(d.key, { include: e.target.checked })} className="mt-2.5 h-4 w-4 shrink-0" aria-label={`Include ${d.title}`} />
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 lg:grid-cols-[2.4fr_1.2fr_1.3fr_1fr_0.9fr]">
                          <input className={clsx(cell, 'col-span-2 font-medium lg:col-span-1')} value={d.title} onChange={(e) => edit(d.key, { title: e.target.value })} aria-label="Task title" />
                          <select className={cell} value={d.ownerId} onChange={(e) => edit(d.key, { ownerId: e.target.value })} aria-label="Owner">
                            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <select className={cell} value={d.workstreamId} onChange={(e) => edit(d.key, { workstreamId: e.target.value })} aria-label="Workstream">
                            {workstreams.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                          <input type="date" className={cell} value={d.dueDate} onChange={(e) => edit(d.key, { dueDate: e.target.value })} aria-label="Due date" />
                          <select className={cell} value={d.priority} onChange={(e) => edit(d.key, { priority: e.target.value as Draft['priority'] })} aria-label="Priority">
                            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                          </select>
                        </div>
                      </div>
                      <p className="mt-1.5 truncate pl-[26px] text-[11.5px] text-ink-faint">From: {d.source}</p>
                    </div>
                  ))}
                </div>
                {error && <p className="mt-3 text-[13px] font-medium text-brick">{error}</p>}
                {done && <p className="mt-3 text-[13px] font-medium text-forest">{done}</p>}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setDrafts(null)}>← Edit notes</button>
                  <button type="button" className="btn-primary" onClick={create} disabled={pending || !chosen.length || !!done}>
                    {pending ? 'Creating…' : `Create ${chosen.length} task${chosen.length === 1 ? '' : 's'}`}
                  </button>
                </div>
              </>
            )}
            {!drafts && error && <p className="mt-3 text-[13px] font-medium text-brick">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
