'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateQuestion, createQuestion } from '@/app/actions';

export function QuestionRow({ id, status, update }: { id: string; status: string; update: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 text-[13px] font-semibold text-brand hover:underline">
        Post an update
      </button>
    );
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          await updateQuestion(id, fd);
          setOpen(false);
          router.refresh();
        })
      }
      className="mt-4 space-y-3 border-t border-line pt-4"
    >
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={status} className="input mt-1.5">
            {['Open', 'In progress', 'Answered', 'Blocked'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Latest</label>
          <input name="update" defaultValue={update} className="input mt-1.5" placeholder="Where this stands now…" />
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary btn-sm" disabled={pending}>
          {pending ? 'Saving…' : 'Save update'}
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function NewQuestion({
  people,
  workstreams,
}: {
  people: { id: string; name: string }[];
  workstreams: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + Raise a question
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/35 p-4 py-10 backdrop-blur-sm">
          <div className="card my-auto w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Raise a question</h2>
              <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
                ✕
              </button>
            </div>

            <form
              action={(fd) =>
                start(async () => {
                  await createQuestion(fd);
                  setOpen(false);
                  router.refresh();
                })
              }
              className="space-y-3.5"
            >
              <div>
                <label className="label">The question</label>
                <input name="question" className="input mt-1.5" placeholder="What needs deciding?" required />
              </div>
              <div>
                <label className="label">Context</label>
                <textarea name="update" rows={3} className="input mt-1.5" placeholder="What is known so far…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="label">Workstream</label>
                  <select name="workstreamId" className="input mt-1.5">
                    {workstreams.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary" disabled={pending}>
                  {pending ? 'Raising…' : 'Raise it'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
