'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { createEvent } from '@/app/actions';
import { IconPlus } from '@/components/icons';

const KINDS = [
  { key: 'webinar', label: 'Webinar', hint: 'Online, usually an hour, one guest' },
  { key: 'networking', label: 'Networking', hint: 'In person — Earth Day, a panel at a member office' },
  { key: 'academic', label: 'Academic', hint: 'A session with a school or university programme' },
  { key: 'other', label: 'Other', hint: 'Anything else the workstreams run' },
];

export function NewEvent({
  workstreams,
  people,
}: {
  workstreams: { id: string; name: string }[];
  people: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('webinar');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <IconPlus size={14} /> New event
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/35 p-4 py-10 backdrop-blur-sm">
          <div className="card my-auto w-full max-w-lg p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="display text-[22px] text-ink">New event</h2>
                <p className="mt-1 text-[12.5px] text-ink-muted">
                  The Summit is created once a cycle. This is for everything else.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
                ✕
              </button>
            </div>

            <form
              action={(fd) =>
                start(async () => {
                  const res = await createEvent(fd);
                  if ((res as any)?.error) setError((res as any).error);
                  else {
                    setOpen(false);
                    setError(null);
                    router.refresh();
                    if ((res as any)?.id) router.push(`/events/${(res as any).id}`);
                  }
                })
              }
              className="space-y-4"
            >
              <input type="hidden" name="kind" value={kind} />

              <div>
                <label className="label">Kind</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {KINDS.map((k) => (
                    <button
                      key={k.key}
                      type="button"
                      onClick={() => setKind(k.key)}
                      className={clsx(
                        'rounded-xl border px-3 py-2 text-left transition',
                        kind === k.key
                          ? 'border-navy bg-navy text-white'
                          : 'border-line-strong bg-white hover:border-navy',
                      )}
                    >
                      <span className="block text-[13px] font-semibold">{k.label}</span>
                      <span
                        className={clsx(
                          'mt-0.5 block text-[11px] leading-snug',
                          kind === k.key ? 'text-white/60' : 'text-ink-faint',
                        )}
                      >
                        {k.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Name</label>
                <input
                  name="name"
                  className="input mt-1.5"
                  placeholder="Speaker Series — leading through change"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" name="date" className="input mt-1.5" required />
                </div>
                <div>
                  <label className="label">Start time</label>
                  <input type="time" name="time" defaultValue="17:00" className="input mt-1.5" />
                </div>
                <div>
                  <label className="label">Workstream</label>
                  <select name="workstreamId" className="input mt-1.5">
                    {workstreams.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Owner</label>
                  <select name="ownerId" className="input mt-1.5">
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Where</label>
                <input
                  name="venue"
                  className="input mt-1.5"
                  placeholder={kind === 'webinar' ? 'Online' : 'Venue or host office'}
                />
              </div>

              {(kind === 'webinar' || kind === 'other') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Guest</label>
                    <input name="guest" className="input mt-1.5" placeholder="Name" />
                  </div>
                  <div>
                    <label className="label">Their title</label>
                    <input name="guestTitle" className="input mt-1.5" placeholder="Role, company" />
                  </div>
                </div>
              )}

              <div>
                <label className="label">What it is</label>
                <textarea
                  name="description"
                  rows={2}
                  className="input mt-1.5"
                  placeholder="One or two lines about the topic."
                />
              </div>

              {error && <p className="text-[12.5px] font-medium text-brick">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary" disabled={pending}>
                  {pending ? 'Creating…' : 'Create event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
