'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTask } from '@/app/actions';

const CATEGORIES = [
  'Summit Logistics',
  'Summit Comms',
  'Summit Invitation',
  'Summit Registration',
  'Summit Day Support',
  'Gala Dinner',
  'Professional Development',
  'Academic Engagement',
  'Partnerships',
];

export function NewTask({
  workstreams,
  people,
}: {
  workstreams: { id: string; name: string }[];
  people: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + New task
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/35 p-4 py-10 backdrop-blur-sm">
          <div className="card my-auto w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">New task</h2>
              <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
                ✕
              </button>
            </div>

            <form
              action={(fd) =>
                start(async () => {
                  const res = await createTask(fd);
                  if ((res as any)?.error) setError((res as any).error);
                  else {
                    setOpen(false);
                    setError(null);
                    router.refresh();
                  }
                })
              }
              className="space-y-3.5"
            >
              <div>
                <label className="label">Title</label>
                <input name="title" className="input mt-1.5" placeholder="What needs doing?" required />
              </div>

              <div>
                <label className="label">Detail</label>
                <textarea name="description" rows={3} className="input mt-1.5" placeholder="Context, links, who to ask…" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select name="category" className="input mt-1.5">
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
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
                <div>
                  <label className="label">Due date</label>
                  <input type="date" name="dueDate" className="input mt-1.5" />
                </div>
              </div>

              <div>
                <label className="label">Priority</label>
                <select name="priority" className="input mt-1.5" defaultValue="medium">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {error && <p className="text-[13px] font-medium text-brick">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary" disabled={pending}>
                  {pending ? 'Creating…' : 'Create task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
