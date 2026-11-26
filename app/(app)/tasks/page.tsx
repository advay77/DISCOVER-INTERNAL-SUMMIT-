import Link from 'next/link';
import clsx from 'clsx';
import { requireCan, scopeOf, scopeFilter, visibleWorkstreams } from '@/lib/authz';
import { db, icontains } from '@/lib/db';
import { Card, Pill, StatusPill, Avatar, Empty } from '@/components/ui';
import { IconTask, IconAlert, IconClock, IconCheck, IconSearch } from '@/components/icons';
import { dueLabel } from '@/lib/format';
import { TaskBoard } from './TaskBoard';
import { NewTask } from './NewTask';

const COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

type Params = { filter?: string; view?: string; ws?: string; q?: string };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireCan('tasks:view');
  const params = await searchParams;
  const { filter, view = 'board', ws } = params;
  const q = (params.q ?? '').trim().slice(0, 80);

  const scope = scopeOf(user, 'tasks:view');
  const base: any = scopeFilter(user, 'tasks:view');
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86400000);

  // One definition per quick filter, shared by the query and its count.
  const QUICK: Record<string, any> = {
    mine: { ownerId: user.id, status: { not: 'done' } },
    overdue: { status: { not: 'done' }, dueDate: { lt: now } },
    week: { status: { not: 'done' }, dueDate: { gte: now, lte: weekEnd } },
    unassigned: { status: { not: 'done' }, ownerId: null },
    nodate: { status: { not: 'done' }, dueDate: null },
    high: { status: { not: 'done' }, priority: 'high' },
    done: { status: 'done' },
  };

  const and: any[] = [base];
  if (filter && QUICK[filter]) and.push(QUICK[filter]);
  if (ws) and.push({ workstreamId: ws });
  if (q) and.push({ OR: [{ title: icontains(q) }, { category: icontains(q) }] });
  const where = { AND: and };

  const count = (extra: any) => db.task.count({ where: { AND: [base, extra] } });

  const [tasks, workstreams, people, total, done, nOverdue, nWeek, nUnassigned, nNoDate, nHigh, nMine] =
    await Promise.all([
      db.task.findMany({
        where,
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        take: 400,
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          priority: true,
          dueDate: true,
          owner: { select: { name: true, accent: true } },
          workstream: { select: { name: true, color: true } },
        },
      }),
      db.workstream.findMany({
        where: visibleWorkstreams(user),
        orderBy: { order: 'asc' },
        select: { id: true, name: true, color: true },
      }),
      db.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      count({}),
      count(QUICK.done),
      count(QUICK.overdue),
      count(QUICK.week),
      count(QUICK.unassigned),
      count(QUICK.nodate),
      count(QUICK.high),
      count(QUICK.mine),
    ]);

  const canEdit = scopeOf(user, 'tasks:edit') !== 'none';
  const open = total - done;
  const donePct = total ? Math.round((done / total) * 100) : 0;

  /** Build a /tasks URL from the current params with some changed. */
  const href = (change: Partial<Params>) => {
    const next: Record<string, string | undefined> = { filter, ws, view: view === 'board' ? undefined : view, q: q || undefined, ...change };
    const qs = Object.entries(next)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join('&');
    return `/tasks${qs ? `?${qs}` : ''}`;
  };

  const quick = [
    { key: 'overdue', label: 'Overdue', n: nOverdue, alert: true },
    { key: 'week', label: 'Due this week', n: nWeek },
    { key: 'unassigned', label: 'No owner', n: nUnassigned },
    { key: 'nodate', label: 'No due date', n: nNoDate },
    { key: 'high', label: 'High priority', n: nHigh },
    { key: 'done', label: 'Completed', n: done },
  ];

  const chip = (active: boolean) =>
    clsx(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
      active ? 'bg-navy text-white' : 'bg-white text-ink-muted shadow-card hover:text-ink',
    );
  const count_ = (active: boolean, n: number, alert = false) => (
    <span
      className={clsx(
        'min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-semibold',
        active ? 'bg-white/20 text-white' : alert && n ? 'bg-brick-100 text-brick' : 'bg-panel text-ink-muted',
      )}
    >
      {n}
    </span>
  );

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="display text-[30px] leading-tight text-ink sm:text-[34px]">Tasks</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">
            {scope === 'own'
              ? 'Everything assigned to you for this cycle.'
              : 'The annual playbook, dated and assigned. Every task carries its own thread.'}
          </p>
        </div>
        {canEdit && <NewTask workstreams={workstreams} people={people} currentUserId={user.id} />}
      </div>

      {/* Summary */}
      <section className="card grid grid-cols-2 gap-y-4 p-4 lg:grid-cols-4 lg:divide-x lg:divide-line lg:p-5">
        <Stat icon={<IconTask size={17} />} label="Open tasks" value={open} hint={`of ${total}`} />
        <Stat
          icon={<IconAlert size={17} />}
          label="Overdue"
          value={nOverdue}
          badge={nOverdue ? <Pill tone="bad" dot={false}>breach</Pill> : <Pill tone="ok" dot={false}>clear</Pill>}
          href={href({ filter: 'overdue' })}
        />
        <Stat icon={<IconClock size={17} />} label="Due this week" value={nWeek} hint="next 7 days" href={href({ filter: 'week' })} />
        <Stat
          icon={<IconCheck size={17} />}
          label="Completed"
          value={`${donePct}%`}
          badge={<Pill tone="lime" dot={false}>{done} done</Pill>}
          href={href({ filter: 'done' })}
        />
      </section>

      {/* Toolbar */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="chip-row flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-1">
            <Link href={href({ filter: undefined, ws: undefined })} className={chip(!filter && !ws)}>
              Everyone
            </Link>
            <Link href={href({ filter: filter === 'mine' ? undefined : 'mine' })} className={chip(filter === 'mine')}>
              My tasks {count_(filter === 'mine', nMine)}
            </Link>
            <span className="mx-0.5 hidden h-5 w-px bg-line-strong sm:block" />
            {workstreams.map((w) => (
              <Link key={w.id} href={href({ ws: ws === w.id ? undefined : w.id })} className={chip(ws === w.id)}>
                <span className="h-2 w-2 rounded-full" style={{ background: w.color }} />
                {w.name}
              </Link>
            ))}
          </div>

          <form action="/tasks" className="relative w-full sm:w-auto">
            {filter && <input type="hidden" name="filter" value={filter} />}
            {ws && <input type="hidden" name="ws" value={ws} />}
            {view !== 'board' && <input type="hidden" name="view" value={view} />}
            <IconSearch size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Find a task"
              aria-label="Find a task"
              className="input w-full rounded-full border-transparent bg-white py-1.5 pl-9 shadow-card sm:w-56"
            />
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="chip-row flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-1">
            {quick.map((f) => {
              const active = filter === f.key;
              return (
                <Link key={f.key} href={href({ filter: active ? undefined : f.key })} className={chip(active)}>
                  {f.label} {count_(active, f.n, f.alert)}
                </Link>
              );
            })}
          </div>
          <span className="mr-auto text-[12.5px] text-ink-faint lg:mr-0">
            Showing {tasks.length} of {total}
            {q && (
              <>
                {' '}for “{q}” ·{' '}
                <Link href={href({ q: undefined })} className="font-medium text-ink underline">
                  clear
                </Link>
              </>
            )}
          </span>
          <span className="flex rounded-full bg-white p-1 shadow-card">
            {['board', 'list'].map((v) => (
              <Link
                key={v}
                href={href({ view: v === 'board' ? undefined : v })}
                className={clsx(
                  'rounded-full px-3 py-1 text-[12.5px] font-semibold capitalize transition',
                  view === v ? 'bg-navy text-white' : 'text-ink-muted hover:text-ink',
                )}
              >
                {v}
              </Link>
            ))}
          </span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Empty
          title={q ? `No tasks match “${q}”` : 'No tasks match this filter'}
          hint="Try a different filter, or create one."
        />
      ) : view === 'list' ? (
        <Card bodyClass="p-0 overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Task</th>
                <th className="th">Owner</th>
                <th className="th">Workstream</th>
                <th className="th">Due</th>
                <th className="th">Priority</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tasks.map((t) => {
                const due = dueLabel(t.dueDate);
                return (
                  <tr key={t.id} className="hover:bg-panel">
                    <td className="td">
                      <Link href={`/tasks/${t.id}`} className="font-semibold text-ink hover:underline">
                        {t.title}
                      </Link>
                      <div className="text-[12px] text-ink-faint">{t.category}</div>
                    </td>
                    <td className="td">
                      {t.owner ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={t.owner.name} accent={t.owner.accent} size={24} />
                          <span className="text-[13px]">{t.owner.name}</span>
                        </span>
                      ) : (
                        <span className="text-ink-faint">Unassigned</span>
                      )}
                    </td>
                    <td className="td">
                      {t.workstream && (
                        <span className="inline-flex items-center gap-1.5 text-[13px]">
                          <span className="h-2 w-2 rounded-full" style={{ background: t.workstream.color }} />
                          {t.workstream.name}
                        </span>
                      )}
                    </td>
                    <td className="td">
                      <Pill tone={t.status === 'done' ? 'neutral' : due.tone}>{due.text}</Pill>
                    </td>
                    <td className="td">
                      <Pill tone={t.priority === 'high' ? 'bad' : t.priority === 'low' ? 'neutral' : 'warn'}>
                        {t.priority}
                      </Pill>
                    </td>
                    <td className="td">
                      <StatusPill status={t.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <TaskBoard
          columns={COLUMNS}
          canEdit={canEdit}
          totalInScope={total}
          doneInScope={done}
          workstreams={workstreams}
          people={people}
          currentUserId={user.id}
          tasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            category: t.category,
            priority: t.priority,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
            owner: t.owner ? { name: t.owner.name, accent: t.owner.accent } : null,
            workstream: t.workstream?.name ?? null,
            color: t.workstream?.color ?? '#94A3B8',
          }))}
        />
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  badge,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  badge?: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 lg:px-5 lg:first:pl-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] text-ink-muted">{label}</p>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="display text-[24px] leading-tight text-ink">{value}</span>
          {hint && <span className="text-[12px] text-ink-faint">{hint}</span>}
          {badge}
        </p>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-xl transition hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}
