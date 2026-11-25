import Link from 'next/link';
import { requireUser, can } from '@/lib/authz';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { PageHeader, Card, Avatar, Pill } from '@/components/ui';
import { CAPABILITIES, CAPABILITY_GROUPS } from '@/lib/capabilities';
import { relativeTime, longDate } from '@/lib/format';
import { PermissionMatrix } from './PermissionMatrix';
import { IconTeam, IconAdmin, IconChat, IconDashboard } from '@/components/icons';
import { PeopleAdmin } from './PeopleAdmin';
import { EventSettings } from './EventSettings';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  if (!can(user, 'admin:users') && !can(user, 'admin:permissions') && !can(user, 'admin:event')) {
    redirect('/no-access?c=admin:users');
  }
  const { tab = 'permissions' } = await searchParams;

  const [roles, people, workstreams, event, audit, channels] = await Promise.all([
    db.role.findMany({ orderBy: { level: 'asc' }, include: { permissions: true, users: true } }),
    db.user.findMany({ orderBy: [{ role: { level: 'asc' } }, { name: 'asc' }], include: { role: true, memberships: { include: { workstream: true } } } }),
    db.workstream.findMany({ orderBy: { order: 'asc' } }),
    db.event.findFirst({ where: { isCurrent: true } }),
    db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 25, include: { actor: true } }),
    db.channel.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: { workstream: true, _count: { select: { members: true, messages: true } } },
    }),
  ]);

  const tabs = [
    { key: 'permissions', label: 'Roles & permissions', show: can(user, 'admin:permissions') || can(user, 'admin:roles') },
    { key: 'people', label: 'People', show: can(user, 'admin:users') },
    { key: 'event', label: 'Event', show: can(user, 'admin:event') },
    { key: 'channels', label: 'Channels', show: can(user, 'admin:users') },
    { key: 'audit', label: 'Audit log', show: can(user, 'admin:permissions') },
  ].filter((t) => t.show);

  const active = people.filter((p) => p.isActive);
  const byRole = (k: string) => active.filter((p) => p.role.key === k).length;
  const summary = [
    { label: 'Active members', value: active.length, icon: <IconTeam size={16} /> },
    { label: 'Board & officers', value: byRole('president') + byRole('officer') + byRole('director'), icon: <IconAdmin size={16} /> },
    { label: 'Volunteers', value: byRole('volunteer'), icon: <IconTeam size={16} /> },
    { label: 'Workstreams', value: workstreams.length, icon: <IconDashboard size={16} /> },
    { label: 'Channels', value: channels.length, icon: <IconChat size={16} /> },
  ];

  return (
    <div className="mx-auto max-w-[1340px]">
      <PageHeader
        title="Admin & access"
        subtitle="The President holds master access and decides who sees what. Everything here is audited."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summary.map((c) => (
          <div key={c.label} className="card px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="display text-[26px] leading-none text-ink">{c.value}</span>
              <span className="text-ink-faint">{c.icon}</span>
            </div>
            <p className="mt-1.5 text-[11px] uppercase tracking-label text-ink-muted">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin?tab=${t.key}`}
            className={
              tab === t.key
                ? 'rounded-lg bg-navy px-3.5 py-1.5 text-[13px] font-semibold text-white'
                : 'rounded-lg border border-line bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink-muted hover:text-ink'
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'permissions' && (
        <>
          <div className="mb-5 grid gap-4 md:grid-cols-5">
            {roles.map((r) => (
              <div key={r.id} className="card p-4">
                <p className="text-[14px] font-bold text-ink">{r.name}</p>
                <p className="mt-1 text-[12px] leading-snug text-ink-muted">{r.description}</p>
                <p className="mt-3 text-[12px] font-semibold text-brand">{r.users.length} members</p>
              </div>
            ))}
          </div>

          {can(user, 'admin:permissions') ? (
            <PermissionMatrix
              roles={roles.map((r) => ({
                id: r.id,
                key: r.key,
                name: r.name,
                permissions: Object.fromEntries(r.permissions.map((p) => [p.capability, p.scope])),
              }))}
              capabilities={CAPABILITIES}
              groups={CAPABILITY_GROUPS}
            />
          ) : (
            <Card title="Permission matrix">
              <p className="text-[13.5px] text-ink-muted">
                Only the President can change this. You can see the roles above.
              </p>
            </Card>
          )}
        </>
      )}

      {tab === 'people' && can(user, 'admin:users') && (
        <PeopleAdmin
          people={people.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            title: p.title,
            company: p.company,
            accent: p.accent,
            isActive: p.isActive,
            roleId: p.roleId,
            roleName: p.role.name,
            workstreams: p.memberships.map((m) => m.workstream.name),
          }))}
          roles={roles.map((r) => ({ id: r.id, name: r.name }))}
          workstreams={workstreams.map((w) => ({ id: w.id, name: w.name }))}
          meId={user.id}
          canChangeRoles={can(user, 'admin:roles')}
        />
      )}

      {tab === 'event' && can(user, 'admin:event') && event && (
        <EventSettings
          event={{
            name: event.name,
            theme: event.theme,
            dayOneTheme: event.dayOneTheme,
            dayTwoTheme: event.dayTwoTheme,
            venue: event.venue,
            city: event.city,
            startDate: event.startDate.toISOString().slice(0, 10),
            endDate: event.endDate.toISOString().slice(0, 10),
            goalRegistrants: event.goalRegistrants,
            goalOrganizations: event.goalOrganizations,
          }}
        />
      )}

      {tab === 'channels' && can(user, 'admin:users') && (
        <Card
          title="Channels"
          bodyClass="p-0"
          action={
            <span className="text-[12px] text-ink-muted">
              Workstream channels follow their workstream and cannot be edited here
            </span>
          }
        >
          <table className="w-full">
            <thead className="border-b border-line bg-paper">
              <tr>
                <th className="th">Channel</th>
                <th className="th">Type</th>
                <th className="th">Workstream</th>
                <th className="th">Members</th>
                <th className="th">Messages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {channels.map((c) => (
                <tr key={c.id} className="hover:bg-paper">
                  <td className="td">
                    <Link href={`/chat/${c.key}`} className="font-medium text-ink hover:text-brand">
                      #{c.name}
                    </Link>
                    {c.purpose && <div className="text-[11.5px] text-ink-faint">{c.purpose}</div>}
                  </td>
                  <td className="td">
                    <Pill tone={c.type === 'private' ? 'bad' : c.type === 'workstream' ? 'brand' : 'neutral'}>
                      {c.type}
                    </Pill>
                  </td>
                  <td className="td text-[13px] text-ink-muted">
                    {c.workstream ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: c.workstream.color }} />
                        {c.workstream.name}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="td tabular-nums">{c._count.members}</td>
                  <td className="td tabular-nums">{c._count.messages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'audit' && (
        <Card title="Audit log" bodyClass="p-0">
          {audit.length === 0 ? (
            <p className="p-5 text-[13px] text-ink-faint">Nothing recorded yet.</p>
          ) : (
            <table className="w-full">
              <thead className="border-b border-line bg-paper">
                <tr>
                  <th className="th">Who</th>
                  <th className="th">Action</th>
                  <th className="th">Target</th>
                  <th className="th">Change</th>
                  <th className="th">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td className="td">
                      {a.actor && (
                        <span className="flex items-center gap-2">
                          <Avatar name={a.actor.name} accent={a.actor.accent} size={22} />
                          <span className="text-[13px]">{a.actor.name}</span>
                        </span>
                      )}
                    </td>
                    <td className="td">
                      <Pill tone="neutral">{a.action}</Pill>
                    </td>
                    <td className="td text-[13px]">{a.target}</td>
                    <td className="td text-[12.5px] text-ink-muted">
                      {a.before || a.after ? `${a.before ?? '—'} → ${a.after ?? '—'}` : '—'}
                    </td>
                    <td className="td text-[12.5px] text-ink-faint" title={longDate(a.createdAt)}>
                      {relativeTime(a.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
