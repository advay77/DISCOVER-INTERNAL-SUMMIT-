import Link from 'next/link';
import { requireCan, can, visibleWorkstreams } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Avatar, StatTile } from '@/components/ui';
import { Directory, type Person } from './Directory';
import { WorkstreamCards } from '@/components/WorkstreamCards';

export default async function TeamPage() {
  const user = await requireCan('team:view');
  const showContact = can(user, 'team:contact');

  const [workstreams, people, roles] = await Promise.all([
    db.workstream.findMany({ where: visibleWorkstreams(user), select: { id: true } }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: [{ role: { level: 'asc' } }, { name: 'asc' }],
      include: { role: true, memberships: { include: { workstream: true } } },
    }),
    db.role.findMany({ orderBy: { level: 'asc' }, select: { key: true, name: true } }),
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
                <span className={p.role.key === 'president' ? 'mt-3 rounded-full bg-accent px-2.5 py-[3px] text-[11.5px] font-semibold text-accent-ink' : 'mt-3 rounded-full bg-navy px-2.5 py-[3px] text-[11.5px] font-medium text-white'}>
                  {p.role.name}
                </span>
              </>
            );
            return href ? (
              <Link prefetch={false} key={p.id} href={href} className="subcard flex flex-col items-center p-4 text-center transition hover:ring-1 hover:ring-line-strong">
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

      <WorkstreamCards user={user} />

      <Directory people={directory} roles={roles} meId={user.id} canDm={can(user, 'chat:dm')} />

      {!showContact && (
        <p className="text-[12.5px] text-ink-faint">
          Member email addresses are not part of your access. Reach people through chat instead.
        </p>
      )}
    </div>
  );
}
