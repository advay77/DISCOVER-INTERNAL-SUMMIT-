'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import clsx from 'clsx';
import { Avatar, Pill } from '@/components/ui';
import { dueLabel } from '@/lib/format';
import { setTaskStatus } from '@/app/actions';

type T = {
  id: string;
  title: string;
  status: string;
  category: string;
  priority: string;
  dueDate: string | null;
  owner: { name: string; accent: string } | null;
  color: string;
};

const HEAD: Record<string, string> = {
  todo: 'bg-paper',
  in_progress: 'bg-brand-50',
  review: 'bg-brass/5',
  done: 'bg-forest/5',
};

export function TaskBoard({
  columns,
  counts,
  tasks,
  canEdit,
}: {
  columns: { key: string; label: string }[];
  counts: Record<string, number>;
  tasks: T[];
  canEdit: boolean;
}) {
  const [items, setItems] = useState(tasks);
  // Take the server's list whenever it changes (a new task, router.refresh()),
  // otherwise a task created from the modal only appears after a full reload.
  useEffect(() => setItems(tasks), [tasks]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();

  function move(id: string, status: string) {
    const task = items.find((t) => t.id === id);
    if (!task || task.status === status) return;
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    start(async () => {
      const res = await setTaskStatus(id, status);
      if ((res as any)?.error) {
        setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)));
        alert((res as any).error);
      }
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => {
        const list = items.filter((t) => t.status === col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              setOver(col.key);
            }}
            onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
            onDrop={() => {
              setOver(null);
              if (dragging && canEdit) move(dragging, col.key);
              setDragging(null);
            }}
            className={clsx(
              'card flex min-h-[220px] flex-col overflow-hidden transition',
              over === col.key && 'ring-2 ring-brand',
            )}
          >
            <header className={clsx('flex items-center justify-between px-4 py-2.5', HEAD[col.key])}>
              <h3 className="text-[13.5px] font-semibold text-ink">{col.label}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                {list.length}
              </span>
            </header>

            <div className="flex-1 space-y-2 p-3">
              {list.map((t) => {
                const due = dueLabel(t.dueDate);
                return (
                  <article
                    key={t.id}
                    draggable={canEdit}
                    onDragStart={() => setDragging(t.id)}
                    onDragEnd={() => setDragging(null)}
                    className={clsx(
                      'group rounded-xl border border-line bg-white p-3 transition hover:shadow-card',
                      canEdit && 'cursor-grab active:cursor-grabbing',
                      dragging === t.id && 'opacity-40',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
                      <Link
                        href={`/tasks/${t.id}`}
                        className="flex-1 text-[13.5px] font-medium leading-snug text-ink group-hover:text-brand"
                      >
                        {t.title}
                      </Link>
                    </div>
                    <p className="mt-1 pl-4 text-[11.5px] text-ink-faint">{t.category}</p>
                    <div className="mt-2.5 flex items-center justify-between gap-2 pl-4">
                      <Pill tone={due.tone}>{due.text}</Pill>
                      <span className="flex items-center gap-1.5">
                        {/* Drag and drop has no touch support, so every card also
                            carries a status menu — phones, tablets and keyboards. */}
                        {canEdit && (
                          <select
                            aria-label={`Move “${t.title}”`}
                            value={t.status}
                            onChange={(e) => move(t.id, e.target.value)}
                            className="h-7 max-w-[7.5rem] cursor-pointer rounded-full border border-line bg-panel px-2 text-[11.5px] font-medium text-ink-muted outline-none hover:text-ink focus:ring-2 focus:ring-lime/60 [@media(hover:hover)]:lg:opacity-0 [@media(hover:hover)]:lg:focus:opacity-100 [@media(hover:hover)]:lg:group-hover:opacity-100"
                          >
                            {columns.map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {t.owner && <Avatar name={t.owner.name} accent={t.owner.accent} size={22} />}
                      </span>
                    </div>
                  </article>
                );
              })}

              {list.length === 0 && (
                <p className="py-6 text-center text-[12px] text-ink-faint">
                  {canEdit ? 'Drop a task here' : 'Nothing here'}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
