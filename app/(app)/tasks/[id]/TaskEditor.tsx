'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateTask } from '@/app/actions';

export function TaskEditor({
  task,
  people,
  canAssign,
}: {
  task: any;
  people: { id: string; name: string }[];
  canAssign: boolean;
}) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-semibold text-ink">Update this task</h2>

      <form
        action={(fd) =>
          start(async () => {
            const res = await updateTask(task.id, fd);
            if ((res as any)?.error) setError((res as any).error);
            else {
              setError(null);
              setSaved(true);
              router.refresh();
              setTimeout(() => setSaved(false), 2200);
            }
          })
        }
        className="mt-4 space-y-3.5"
      >
        <div>
          <label className="label">Title</label>
          <input name="title" defaultValue={task.title} className="input mt-1.5" />
        </div>

        <div>
          <label className="label">Detail</label>
          <textarea name="description" rows={3} defaultValue={task.description ?? ''} className="input mt-1.5" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={task.status} className="input mt-1.5">
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select name="priority" defaultValue={task.priority} className="input mt-1.5">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input
              type="date"
              name="dueDate"
              defaultValue={task.dueDate ? String(task.dueDate).slice(0, 10) : ''}
              className="input mt-1.5"
            />
          </div>
          {canAssign && (
            <div>
              <label className="label">Owner</label>
              <select name="ownerId" defaultValue={task.ownerId ?? ''} className="input mt-1.5">
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <p className="text-[13px] font-medium text-brick">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button className="btn-primary" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-[13px] font-medium text-forest">Saved</span>}
        </div>
      </form>
    </section>
  );
}
