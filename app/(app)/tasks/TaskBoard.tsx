'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import clsx from 'clsx';
import { Avatar } from '@/components/ui';
import { IconClock, IconAlert } from '@/components/icons';
import { daysUntil, dueLabel } from '@/lib/format';
import { setTaskStatus } from '@/app/actions';
import { NewTask } from './NewTask';

type T = {
  id: string;
  title: string;
  status: string;
  category: string;
  priority: string;
  dueDate: string | null;
  owner: { name: string; accent: string } | null;
  workstream: string | null;
  color: string;
};

type Option = { id: string; name: string };

/** Overdue first, then by date, undated last — the order a lead works through. */
function byUrgency(a: T, b: T) {
  if (!a.dueDate && !b.dueDate) return a.title.localeCompare(b.title);
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return +new Date(a.dueDate) - +new Date(b.dueDate);
}

export function TaskBoard({
  columns,
  tasks,
  canEdit,
  totalInScope,
  doneInScope,
  workstreams,
  people,
  currentUserId,
}: {
  columns: { key: string; label: string }[];
  tasks: T[];
  canEdit: boolean;
  totalInScope: number;
  doneInScope: number;
  workstreams: Option[];
  people: Option[];
  currentUserId: string;
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

  const byColumn = useMemo(() => {
    const m: Record<string, T[]> = {};
    for (const c of columns) m[c.key] = items.filter((t) => t.status === c.key).sort(byUrgency);
    return m;
  }, [items, columns]);

  const donePct = totalInScope ? Math.round((doneInScope / totalInScope) * 100) : 0;

  return (
    // Phones: columns side by side with swipe. Tablets: two up. Desktop: four up.
    <div className="-mx-3.5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3.5 pb-2 sm:-mx-5 sm:px-5 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4">
      {columns.map((col) => {
        const list = byColumn[col.key] ?? [];
        const isDone = col.key === 'done';
        const overdue = list.filter((t) => !isDone && t.dueDate && daysUntil(t.dueDate) < 0).length;
        const high = list.filter((t) => t.priority === 'high').length;
        const hint = isDone
          ? `${donePct}% of cycle`
          : overdue
            ? `${overdue} overdue`
            : high
              ? `${high} high priority`
              : '';

        return (
          <section
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
              'flex w-[86%] shrink-0 snap-start flex-col rounded-[20px] p-2 transition sm:w-[60%] md:w-auto',
              isDone ? 'bg-forest-100' : 'bg-white/55 ring-1 ring-line',
              over === col.key && 'ring-2 ring-accent',
            )}
          >
            <header className="flex items-center justify-between gap-2 px-2 pb-2 pt-1.5">
              <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                {col.label}
                <span className="rounded-full bg-white px-2 py-0.5 text-[11.5px] font-semibold text-ink-muted shadow-card">
                  {list.length}
                </span>
              </h3>
              {hint && (
                <span className={clsx('text-[11.5px] font-medium', overdue && !isDone ? 'text-brick' : 'text-ink-faint')}>
                  {hint}
                </span>
              )}
            </header>

            {/* Each column scrolls on its own, so a 70-task backlog stays on one screen. */}
            <div className="max-h-[68vh] flex-1 space-y-2 overflow-y-auto px-0.5 pb-1 lg:max-h-[calc(100vh-330px)] lg:min-h-[240px]">
              {isDone && (
                <div className="rounded-2xl bg-white p-3.5 shadow-card">
                  <p className="text-[13px] font-semibold text-ink">This cycle so far</p>
                  <div className="mt-2.5 space-y-1.5 text-[12.5px]">
                    <p className="flex justify-between text-ink-muted">
                      Completed <span className="font-semibold text-ink">{doneInScope}</span>
                    </p>
                    <p className="flex justify-between text-ink-muted">
                      Still open <span className="font-semibold text-ink">{totalInScope - doneInScope}</span>
                    </p>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper">
                    <div className="h-full rounded-full bg-forest" style={{ width: `${donePct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-ink-faint">{donePct}% of the cycle&apos;s tasks done</p>
                </div>
              )}

              {list.map((t) => (
                <TaskCard
                  key={t.id}
                  t={t}
                  done={isDone}
                  canEdit={canEdit}
                  dragging={dragging === t.id}
                  columns={columns}
                  onMove={move}
                  onDragStart={() => setDragging(t.id)}
                  onDragEnd={() => setDragging(null)}
                />
              ))}

              {list.length === 0 && !isDone && (
                <p className="rounded-2xl border border-dashed border-line-strong py-8 text-center text-[12.5px] text-ink-faint">
                  {canEdit ? 'Drop a task here' : 'Nothing here'}
                </p>
              )}
            </div>

            {canEdit && !isDone && (
              <div className="pt-1.5">
                <NewTask
                  variant="column"
                  status={col.key}
                  workstreams={workstreams}
                  people={people}
                  currentUserId={currentUserId}
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TaskCard({
  t,
  done,
  canEdit,
  dragging,
  columns,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  t: T;
  done: boolean;
  canEdit: boolean;
  dragging: boolean;
  columns: { key: string; label: string }[];
  onMove: (id: string, status: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const due = dueLabel(t.dueDate);
  const late = !done && t.dueDate ? -daysUntil(t.dueDate) : 0;

  return (
    <article
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={clsx(
        'group rounded-2xl bg-white p-3 shadow-card transition hover:shadow-[0_4px_14px_rgba(20,20,20,0.08)]',
        canEdit && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-2.5">
        {t.owner ? (
          <Avatar name={t.owner.name} accent={t.owner.accent} size={28} />
        ) : (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-[11px] text-ink-faint"
            title="No owner"
          >
            ?
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Link prefetch={false}
            href={`/tasks/${t.id}`}
            className={clsx(
              'block text-[13.5px] font-semibold leading-snug hover:underline',
              done ? 'text-ink-muted' : 'text-ink',
            )}
          >
            {t.title}
          </Link>
          <p className="mt-0.5 truncate text-[12px] text-ink-faint">
            {t.owner?.name ?? 'No owner'} · {t.category}
          </p>
        </div>
      </div>

      {late > 0 && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-brass-100 px-2.5 py-2 text-[12px] leading-snug text-brass">
          <IconAlert size={13} className="mt-px shrink-0" />
          <span>
            {late} {late === 1 ? 'day' : 'days'} past due{t.priority === 'high' ? ' · high priority' : ''}
          </span>
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          {t.workstream && (
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-panel px-2 py-[3px] text-[11.5px] text-ink-muted">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: t.color }} />
              <span className="truncate">{t.workstream}</span>
            </span>
          )}
          {!late && !done && (
            <span
              className={clsx(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-[3px] text-[11.5px] font-medium',
                due.tone === 'warn' ? 'bg-brass-100 text-brass' : 'bg-panel text-ink-muted',
              )}
            >
              <IconClock size={11} />
              {t.dueDate ? due.text.replace(' left', '') : 'No date'}
            </span>
          )}
          {t.priority === 'high' && !late && !done && (
            <span className="shrink-0 rounded-full bg-brick-100 px-2 py-[3px] text-[11.5px] font-medium text-brick">High</span>
          )}
        </span>

        {/* Drag and drop has no touch support, so every card also carries a
            status menu — phones, tablets and keyboards. */}
        {canEdit && (
          <select
            aria-label={`Move “${t.title}”`}
            value={t.status}
            onChange={(e) => onMove(t.id, e.target.value)}
            className="h-7 max-w-[7.5rem] shrink-0 cursor-pointer rounded-full border border-line bg-panel px-2 text-[11.5px] font-medium text-ink-muted outline-none hover:text-ink focus:ring-2 focus:ring-accent/60 [@media(hover:hover)]:lg:opacity-0 [@media(hover:hover)]:lg:focus:opacity-100 [@media(hover:hover)]:lg:group-hover:opacity-100"
          >
            {columns.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </article>
  );
}
