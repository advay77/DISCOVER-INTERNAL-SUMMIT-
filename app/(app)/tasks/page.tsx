import Link from 'next/link';
import { requireCan, scopeOf, scopeFilter, visibleWorkstreams } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, Pill, StatusPill, Avatar, Empty } from '@/components/ui';
import { dueLabel } from '@/lib/format';
import { TaskBoard } from './TaskBoard';
import { NewTask } from './NewTask';

const COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; view?: string; ws?: string }>;
}) {
  const user = await requireCan('tasks:view');
  const { filter, view = 'board', ws } = await searchParams;

  const scope = scopeOf(user, 'tasks:view');
  const where: any = { AND: [scopeFilter(user, 'tasks:view')] };
  if (filter === 'mine') where.ownerId = user.id;
  if (filter === 'overdue') {
    where.status = { not: 'done' };
    where.dueDate = { lt: new Date() };
  }
  if (filter === 'done') where.status = 'done';
  if (ws) where.workstreamId = ws;

  const [tasks, workstreams, people] = await Promise.all([
    db.task.findMany({
      where,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: { owner: true, workstream: true },
      take: 400,
    }),
    db.workstream.findMany({ where: visibleWorkstreams(user), orderBy: { order: 'asc' } }),
    db.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ]);

  const counts = Object.fromEntries(COLUMNS.map((c) => [c.key, tasks.filter((t) => t.status === c.key).length]));
  const canEdit = scopeOf(user, 'tasks:edit') !== 'none';

  const filters = [
    { key: '', label: `All tasks ${tasks.length ? '' : ''}` },
    { key: 'mine', label: 'My tasks' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'done', label: 'Completed' },
  ];

  return (
    <div className="mx-auto max-w-[1340px]">
      <PageHeader
        title="Tasks"
        subtitle={
          scope === 'own'
            ? 'Everything assigned to you for this cycle.'
            : 'The annual playbook, dated and assigned. Every task carries its own thread.'
        }
        action={canEdit ? <NewTask workstreams={workstreams} people={people} /> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const active = (filter ?? '') === f.key;
          return (
            <Link
              key={f.key}
              href={`/tasks${f.key ? `?filter=${f.key}` : ''}${view !== 'board' ? `${f.key ? '&' : '?'}view=${view}` : ''}`}
              className={
                active
                  ? 'rounded-lg bg-navy px-3 py-1.5 text-[13px] font-semibold text-white'
                  : 'rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink-muted hover:border-brand hover:text-ink'
              }
            >
              {f.label}
            </Link>
          );
        })}

        <span className="mx-1 h-5 w-px bg-line" />

        {workstreams.map((w) => (
          <Link
            key={w.id}
            href={`/tasks?ws=${w.id}`}
            className={
              ws === w.id
                ? 'rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white'
                : 'rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink-muted hover:text-ink'
            }
            style={ws === w.id ? { background: w.color } : undefined}
          >
            {w.name}
          </Link>
        ))}

        <span className="ml-auto flex overflow-hidden rounded-lg border border-line">
          {['board', 'list'].map((v) => (
            <Link
              key={v}
              href={`/tasks?view=${v}${filter ? `&filter=${filter}` : ''}${ws ? `&ws=${ws}` : ''}`}
              className={
                view === v
                  ? 'bg-navy px-3 py-1.5 text-[13px] font-semibold capitalize text-white'
                  : 'bg-white px-3 py-1.5 text-[13px] font-medium capitalize text-ink-muted'
              }
            >
              {v}
            </Link>
          ))}
        </span>
      </div>

      {tasks.length === 0 ? (
        <Empty title="No tasks match this filter" hint="Try a different filter, or create one." />
      ) : view === 'list' ? (
        <Card bodyClass="p-0 overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-line bg-paper">
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
                  <tr key={t.id} className="hover:bg-paper">
                    <td className="td">
                      <Link href={`/tasks/${t.id}`} className="font-medium text-ink hover:text-brand">
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
                      <Pill tone={due.tone}>{due.text}</Pill>
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
          counts={counts}
          canEdit={canEdit}
          tasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            category: t.category,
            priority: t.priority,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
            owner: t.owner ? { name: t.owner.name, accent: t.owner.accent } : null,
            color: t.workstream?.color ?? '#94A3B8',
          }))}
        />
      )}
    </div>
  );
}
