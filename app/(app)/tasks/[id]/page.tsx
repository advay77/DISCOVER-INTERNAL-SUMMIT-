import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCan, allows, can } from '@/lib/authz';
import { db } from '@/lib/db';
import { Card, Pill, StatusPill, Avatar } from '@/components/ui';
import { Thread } from '@/components/Thread';
import { longDate, dueLabel } from '@/lib/format';
import { TaskEditor } from './TaskEditor';

export default async function TaskDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCan('tasks:view');
  const { id } = await params;

  const task = await db.task.findUnique({
    where: { id },
    include: { owner: true, workstream: true, createdBy: true, event: true },
  });
  if (!task) notFound();
  if (!allows(user, 'tasks:view', task)) notFound();

  const editable = allows(user, 'tasks:edit', task);
  const people = can(user, 'tasks:assign')
    ? await db.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
    : [];

  const due = dueLabel(task.dueDate);

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/tasks" className="mb-3 inline-block text-[13px] font-medium text-ink-muted hover:text-brand">
        ← Back to tasks
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={task.status} />
              <Pill tone={task.priority === 'high' ? 'bad' : task.priority === 'low' ? 'neutral' : 'warn'}>
                {task.priority} priority
              </Pill>
              <Pill tone={due.tone}>{due.text}</Pill>
              {task.workstream && (
                <Pill tone="neutral">
                  <span className="h-2 w-2 rounded-full" style={{ background: task.workstream.color }} />
                  {task.workstream.name}
                </Pill>
              )}
            </div>

            <h1 className="mt-4 text-[24px] font-bold leading-tight tracking-tight text-ink">{task.title}</h1>
            <p className="mt-1 text-[13px] text-ink-faint">{task.category}</p>

            {task.description && (
              <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-muted">
                {task.description}
              </p>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-3">
              <div>
                <dt className="label">Owner</dt>
                <dd className="mt-1.5 flex items-center gap-2">
                  {task.owner ? (
                    <>
                      <Avatar name={task.owner.name} accent={task.owner.accent} size={24} />
                      <span className="text-[13.5px] font-medium">{task.owner.name}</span>
                    </>
                  ) : (
                    <span className="text-[13.5px] text-ink-faint">Unassigned</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="label">Due</dt>
                <dd className="mt-1.5 text-[13.5px] font-medium">{longDate(task.dueDate)}</dd>
              </div>
              <div>
                <dt className="label">Added by</dt>
                <dd className="mt-1.5 text-[13.5px] font-medium">{task.createdBy?.name ?? 'Playbook'}</dd>
              </div>
            </dl>
          </Card>

          {editable && <TaskEditor task={{ ...task, dueDate: task.dueDate?.toISOString() ?? null }} people={people} canAssign={can(user, 'tasks:assign')} />}
        </div>

        {/* The feature that kills WhatsApp: the conversation lives on the task. */}
        <Card title="Discussion" bodyClass="p-4">
          <p className="mb-3 text-[12.5px] leading-snug text-ink-muted">
            Everything said here stays attached to this task — next year&rsquo;s lead can read why it went the
            way it did.
          </p>
          <Thread
            entityType="task"
            entityId={task.id}
            meId={user.id}
            meName={user.name}
            meAccent={user.accent}
            compact
            placeholder="Add an update…"
            emptyHint="No discussion yet. Say what is blocking or what changed."
          />
        </Card>
      </div>
    </div>
  );
}
