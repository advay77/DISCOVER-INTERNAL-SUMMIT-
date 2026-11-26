'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Avatar } from '@/components/ui';
import { saveSession, deleteSession } from '@/app/actions';
import { KIND_LABEL, SESSION_KINDS, durationMinutes, toInputTime } from '@/lib/agenda';

export type AgendaSession = {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  title: string;
  description: string | null;
  kind: string;
  room: string | null;
  status: string;
  owner: { id: string; name: string; accent: string } | null;
  moderator: { id: string; name: string } | null;
  speakers: { id: string; name: string }[];
};

type Option = { id: string; name: string };

/** Accent per kind: the dot on the rail and the stripe on the card. */
const KIND_STYLE: Record<string, { dot: string; chip: string; quiet?: boolean }> = {
  keynote: { dot: 'bg-lime ring-lime-ink/20', chip: 'bg-lime text-lime-ink' },
  panel: { dot: 'bg-brand', chip: 'bg-brand-100 text-brand' },
  session: { dot: 'bg-navy', chip: 'bg-panel text-ink' },
  gala: { dot: 'bg-brass', chip: 'bg-brass-100 text-brass' },
  break: { dot: 'bg-line-strong', chip: 'bg-panel text-ink-muted', quiet: true },
  meal: { dot: 'bg-line-strong', chip: 'bg-panel text-ink-muted', quiet: true },
};

export function AgendaTimeline({
  days,
  sessions,
  editable,
  people,
  speakers,
}: {
  days: { n: number; label: string; theme: string | null }[];
  sessions: AgendaSession[];
  editable: boolean;
  people: Option[];
  speakers: Option[] | null;
}) {
  const [editing, setEditing] = useState<AgendaSession | { day: number } | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {days.map((d) => {
          const list = sessions.filter((s) => s.day === d.n);
          return (
            <section key={d.n} className="card p-4 sm:p-5">
              <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium text-ink-faint">{d.label}</p>
                  <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Day {d.n}</h2>
                  {d.theme && <p className="mt-0.5 text-[13px] text-ink-muted">{d.theme}</p>}
                </div>
                {editable && (
                  <button type="button" className="btn-primary btn-sm print:hidden" onClick={() => setEditing({ day: d.n })}>
                    + Add session
                  </button>
                )}
              </header>

              {list.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line-strong py-10 text-center text-[13px] text-ink-faint">
                  Nothing scheduled for Day {d.n} yet.
                </p>
              ) : (
                <ol className="relative">
                  {list.map((s, i) => {
                    const style = KIND_STYLE[s.kind] ?? KIND_STYLE.session;
                    const mins = durationMinutes(s.startTime, s.endTime);
                    const last = i === list.length - 1;
                    return (
                      <li key={s.id} className="relative flex gap-3 sm:gap-4">
                        {/* Time */}
                        <div className="w-[62px] shrink-0 pt-2.5 text-right sm:w-[72px]">
                          <p className="text-[13px] font-semibold tabular-nums text-ink">{s.startTime}</p>
                          <p className="text-[11.5px] tabular-nums text-ink-faint">{s.endTime}</p>
                        </div>

                        {/* Rail */}
                        <div className="relative flex w-3 shrink-0 justify-center">
                          {!last && <span className="absolute bottom-0 top-5 w-px bg-line-strong" />}
                          {i > 0 && <span className="absolute top-0 h-4 w-px bg-line-strong" />}
                          <span className={clsx('relative z-[1] mt-4 h-3 w-3 rounded-full ring-4 ring-white', style.dot)} />
                        </div>

                        {/* Card */}
                        <div className={clsx('mb-3 min-w-0 flex-1', last && 'mb-0')}>
                          {style.quiet ? (
                            <div className="group flex items-center justify-between gap-2 rounded-2xl bg-panel px-3.5 py-2.5">
                              <p className="min-w-0 truncate text-[13px] text-ink-muted">
                                {s.title}
                                {mins > 0 && <span className="text-ink-faint"> · {mins} min</span>}
                              </p>
                              {editable && <EditButton onClick={() => setEditing(s)} />}
                            </div>
                          ) : (
                            <div className="group rounded-2xl border border-line bg-white p-3.5 transition hover:border-line-strong">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[14px] font-semibold leading-snug text-ink">{s.title}</p>
                                {editable && <EditButton onClick={() => setEditing(s)} />}
                              </div>
                              {s.description && (
                                <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink-muted">{s.description}</p>
                              )}
                              {s.speakers.length > 0 && (
                                <p className="mt-1.5 text-[12.5px] text-ink-muted">
                                  <span className="text-ink-faint">With </span>
                                  {s.speakers.map((x) => x.name).join(', ')}
                                </p>
                              )}
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <span className={clsx('rounded-full px-2.5 py-[3px] text-[11.5px] font-medium', style.chip)}>
                                  {KIND_LABEL[s.kind] ?? s.kind}
                                </span>
                                {mins > 0 && (
                                  <span className="rounded-full bg-panel px-2.5 py-[3px] text-[11.5px] text-ink-muted">{mins} min</span>
                                )}
                                {s.room && (
                                  <span className="rounded-full bg-panel px-2.5 py-[3px] text-[11.5px] text-ink-muted">{s.room}</span>
                                )}
                                {s.status === 'confirmed' && (
                                  <span className="rounded-full bg-forest-100 px-2.5 py-[3px] text-[11.5px] font-medium text-forest">
                                    Confirmed
                                  </span>
                                )}
                                {s.owner && (
                                  <span className="ml-auto inline-flex min-w-0 items-center gap-1.5 text-[12px] text-ink-muted">
                                    <Avatar name={s.owner.name} accent={s.owner.accent} size={20} />
                                    {s.owner.name}
                                  </span>
                                )}
                              </div>
                              {s.moderator && (
                                <p className="mt-1.5 text-[11.5px] text-ink-faint">Moderator · {s.moderator.name}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
      </div>

      {editing && (
        <SessionForm
          session={'id' in editing ? editing : null}
          day={'id' in editing ? editing.day : editing.day}
          people={people}
          speakers={speakers}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold text-ink-muted transition hover:bg-panel hover:text-ink print:hidden [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:focus:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
    >
      Edit
    </button>
  );
}

function SessionForm({
  session,
  day,
  people,
  speakers,
  onClose,
}: {
  session: AgendaSession | null;
  day: number;
  people: Option[];
  speakers: Option[] | null;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function remove() {
    if (!session) return;
    if (!confirm(`Remove “${session.title}” from the run of show?`)) return;
    start(async () => {
      const res = await deleteSession(session.id);
      if ((res as any)?.error) setError((res as any).error);
      else {
        onClose();
        router.refresh();
      }
    });
  }

  const chosen = new Set(session?.speakers.map((s) => s.id) ?? []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/35 p-4 py-10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={session ? 'Edit session' : 'Add session'}
    >
      <form
        action={(fd) =>
          start(async () => {
            const res = await saveSession(fd);
            if ((res as any)?.error) setError((res as any).error);
            else {
              onClose();
              router.refresh();
            }
          })
        }
        className="card my-auto w-full max-w-xl space-y-3.5 p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-ink">{session ? 'Edit session' : 'Add a session'}</h2>
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        {session && <input type="hidden" name="id" value={session.id} />}

        <div>
          <label className="label">Title</label>
          <input name="title" required defaultValue={session?.title} className="input mt-1.5" placeholder="Opening keynote" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Day</label>
            <select name="day" defaultValue={String(session?.day ?? day)} className="input mt-1.5">
              <option value="1">Day 1</option>
              <option value="2">Day 2</option>
            </select>
          </div>
          <div>
            <label className="label">Starts</label>
            <input type="time" name="startTime" required defaultValue={toInputTime(session?.startTime) || '09:00'} className="input mt-1.5" />
          </div>
          <div>
            <label className="label">Ends</label>
            <input type="time" name="endTime" required defaultValue={toInputTime(session?.endTime) || '09:30'} className="input mt-1.5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Kind</label>
            <select name="kind" defaultValue={session?.kind ?? 'session'} className="input mt-1.5">
              {SESSION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={session?.status ?? 'planned'} className="input mt-1.5">
              <option value="planned">Planned</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
          <div>
            <label className="label">Owner</label>
            <select name="ownerId" defaultValue={session?.owner?.id ?? ''} className="input mt-1.5">
              <option value="">No owner</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Moderator</label>
            <select name="moderatorId" defaultValue={session?.moderator?.id ?? ''} className="input mt-1.5">
              <option value="">None</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Room</label>
          <input name="room" defaultValue={session?.room ?? ''} className="input mt-1.5" placeholder="Main hall" />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea name="description" rows={2} defaultValue={session?.description ?? ''} className="input mt-1.5" />
        </div>

        {speakers && (
          <fieldset>
            <legend className="label">Speakers</legend>
            <div className="mt-1.5 grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">
              {speakers.map((sp) => (
                <label key={sp.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-[13px] text-ink hover:bg-panel">
                  <input type="checkbox" name="speakerIds" value={sp.id} defaultChecked={chosen.has(sp.id)} className="accent-[rgb(var(--navy))]" />
                  <span className="truncate">{sp.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {error && <p className="text-[13px] font-medium text-brick">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          {session && (
            <button type="button" onClick={remove} disabled={pending} className="btn btn-sm text-brick hover:bg-brick-100">
              Delete
            </button>
          )}
          <span className="flex-1" />
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={pending}>
            {pending ? 'Saving…' : session ? 'Save changes' : 'Add session'}
          </button>
        </div>
      </form>
    </div>
  );
}
