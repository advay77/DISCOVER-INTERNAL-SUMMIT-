import Link from 'next/link';
import { requireCan, can, scopeFilter, visibleWorkstreams } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Avatar, StatTile } from '@/components/ui';
import { pct } from '@/lib/format';
import { Directory, type Person } from './Directory';

export default async function TeamPage() {
  const user = await requireCan('team:view');
  const showContact = can(user, 'team:contact');
  const seeTasks = can(user, 'tasks:view');

  const [workstreams, people, roles, taskCounts] = await Promise.all([
    db.workstream.findMany({
      where: visibleWorkstreams(user),
      orderBy: { order: 'asc' },
      include: { lead: true, members: { include: { user: { include: { role: true } } } } },
    }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: [{ role: { level: 'asc' } }, { name: 'asc' }],
      include: { role: true, memberships: { include: { workstream: true } } },
    }),
    db.role.findMany({ orderBy: { level: 'asc' }, select: { key: true, name: true } }),
    seeTasks
      ? db.task.groupBy({ by: ['workstreamId', 'status'], where: scopeFilter(user, 'tasks:view') as any, _count: { _all: true } })
      : [],
  ]);

  const isAdmin = can(user, 'admin:users');
  const profileHref = (id: string) => (isAdmin || id === user.id ? `/profile/${id}` : null);
  const visibleWs = new Set(workstreams.map((w) => w.id));
  const board = people.filter((p) => ['president', 'officer', 'director'].includes(p.role.key));
  const volunteers = people.filter((p) => p.role.key === 'volunteer').length;

  const directory: Person[] = people.map((p) => ({
    id: p.id,
    name: p.name,
    title: p.title,
    company: p.company,
    email: showContact ? p.email : null,
    accent: p.accent,
    role: p.role.name,
    roleKey: p.role.key,
    // Finance stays hidden from people who cannot see it.
    workstreams: p.memberships
      .filter((m) => visibleWs.has(m.workstreamId))
      .map((m) => ({ name: m.workstream.name, color: m.workstream.color })),
    href: profileHref(p.id),
  }));

  const tasksFor = (wsId: string) => {
    const rows = taskCounts.filter((r) => r.workstreamId === wsId);
    const total = rows.reduce((n, r) => n + r._count._all, 0);
    const done = rows.filter((r) => r.status === 'done').reduce((n, r) => n + r._count._all, 0);
    return { total, done };
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <PageHeader title="Team" subtitle="Who is who, and who leads what." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={people.length} label="Members" tone="navy" hint="active" highlight />
        <StatTile value={board.length} label="Board & officers" tone="navy" />
        <StatTile value={volunteers} label="Volunteers" tone="navy" />
        <StatTile value={workstreams.length} label="Workstreams" tone="navy" />
      </div>

      {/* Board */}
      <section className="card p-4 sm:p-5">
        <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Board</h2>
        <p className="text-[12.5px] text-ink-muted">The President, officers and directors.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {board.map((p) => {
            const href = profileHref(p.id);
            const inner = (
              <>
                <Avatar name={p.name} accent={p.accent} size={56} />
                <p className="mt-3 text-[15px] font-semibold text-ink">{p.name}</p>
                <p className="text-[12.5px] text-ink-muted">{p.title}</p>
                {p.company && <p className="text-[12px] text-ink-faint">{p.company}</p>}
                {showContact && <p className="mt-1 truncate text-[12px] text-ink-faint">{p.email}</p>}
                <span className={p.role.key === 'president' ? 'mt-3 rounded-full bg-lime px-2.5 py-[3px] text-[11.5px] font-semibold text-lime-ink' : 'mt-3 rounded-full bg-navy px-2.5 py-[3px] text-[11.5px] font-medium text-white'}>
                  {p.role.name}
                </span>
              </>
            );
            return href ? (
              <Link key={p.id} href={href} className="subcard flex flex-col items-center p-4 text-center transition hover:ring-1 hover:ring-line-strong">
                {inner}
              </Link>
            ) : (
              <div key={p.id} className="subcard flex flex-col items-center p-4 text-center">
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* Workstreams */}
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
                        <Link href={profileHref(w.lead.id)!} className="block truncate text-[14px] font-semibold text-ink hover:underline">
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
                        <Link key={m.id} href={href} title={m.user.role.name} className="inline-flex items-center gap-1.5 rounded-full bg-panel py-0.5 pl-0.5 pr-2.5 hover:bg-line">
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
                  <Link href={`/tasks?ws=${w.id}`} className="mt-4 block rounded-xl p-1 transition hover:bg-panel">
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

      <Directory people={directory} roles={roles} />

      {!showContact && (
        <p className="text-[12.5px] text-ink-faint">
          Member email addresses are not part of your access. Reach people through chat instead.
        </p>
      )}
    </div>
  );
}
