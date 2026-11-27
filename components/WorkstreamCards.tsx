import Link from 'next/link';
import { can, scopeFilter, visibleWorkstreams } from '@/lib/authz';
import type { SessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Avatar } from '@/components/ui';
import { pct } from '@/lib/format';

/**
 * One card per workstream: lead, members and task progress. Used on the
 * dashboard (the first thing people see) and on the Team page.
 */
export async function WorkstreamCards({ user }: { user: NonNullable<SessionUser> }) {
  const seeTasks = can(user, 'tasks:view');
  const [workstreams, taskCounts] = await Promise.all([
    db.workstream.findMany({
      where: visibleWorkstreams(user),
      orderBy: { order: 'asc' },
      include: { lead: true, members: { include: { user: { include: { role: true } } } } },
    }),
    seeTasks
      ? db.task.groupBy({ by: ['workstreamId', 'status'], where: scopeFilter(user, 'tasks:view') as any, _count: { _all: true } })
      : [],
  ]);

  const isAdmin = can(user, 'admin:users');
  const profileHref = (id: string) => (isAdmin || id === user.id ? `/profile/${id}` : null);
  const tasksFor = (wsId: string) => {
    const rows = taskCounts.filter((r) => r.workstreamId === wsId);
    const total = rows.reduce((n, r) => n + r._count._all, 0);
    const done = rows.filter((r) => r.status === 'done').reduce((n, r) => n + r._count._all, 0);
    return { total, done };
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {workstreams.map((w) => {
        const t = tasksFor(w.id);
        const p = pct(t.done, t.total);
        const others = w.members.filter((m) => m.userId !== w.leadId);
        return (
          <section key={w.id} className="card overflow-hidden">
            <div className="h-1.5" style={{ background: w.color }} />
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-[17px] font-semibold text-ink">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: w.color }} />
                    <span className="truncate">{w.name}</span>
                  </h3>
                  {w.description && <p className="mt-0.5 text-[12.5px] text-ink-muted">{w.description}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-panel px-2.5 py-1 text-[12px] font-medium text-ink-muted">
                  {w.members.length} {w.members.length === 1 ? 'member' : 'members'}
                </span>
              </div>

              {w.lead && (
                <div className="subcard mt-4 flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={w.lead.name} accent={w.lead.accent} size={34} />
                  <div className="min-w-0">
                    {profileHref(w.lead.id) ? (
                      <Link prefetch={false} href={profileHref(w.lead.id)!} className="block truncate text-[14px] font-semibold text-ink hover:underline">
                        {w.lead.name}
                      </Link>
                    ) : (
                      <p className="truncate text-[14px] font-semibold text-ink">{w.lead.name}</p>
                    )}
                    <p className="text-[11.5px] text-ink-faint">Workstream lead</p>
                  </div>
                </div>
              )}

              {others.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {others.map((m) => {
                    const href = profileHref(m.userId);
                    const chip = (
                      <>
                        <Avatar name={m.user.name} accent={m.user.accent} size={20} />
                        <span className="text-[12.5px] text-ink">{m.user.name}</span>
                      </>
                    );
                    return href ? (
                      <Link prefetch={false} key={m.id} href={href} title={m.user.role.name} className="inline-flex items-center gap-1.5 rounded-full bg-panel py-0.5 pl-0.5 pr-2.5 hover:bg-line">
                        {chip}
                      </Link>
                    ) : (
                      <span key={m.id} title={m.user.role.name} className="inline-flex items-center gap-1.5 rounded-full bg-panel py-0.5 pl-0.5 pr-2.5">
                        {chip}
                      </span>
                    );
                  })}
                </div>
              )}
              {w.members.length === 0 && <p className="mt-3 text-[13px] text-ink-faint">No members yet.</p>}

              {seeTasks && (
                <Link prefetch={false} href={`/tasks?ws=${w.id}`} className="mt-4 block rounded-xl p-1 transition hover:bg-panel">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-ink-muted">Tasks done</span>
                    <span className="font-semibold text-ink">
                      {t.done}/{t.total} · {p}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, background: w.color }} />
                  </div>
                </Link>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
