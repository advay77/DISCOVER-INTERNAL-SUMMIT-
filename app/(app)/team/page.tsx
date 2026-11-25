import { requireCan, can, visibleWorkstreams } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, Avatar, Pill } from '@/components/ui';

export default async function TeamPage() {
  const user = await requireCan('team:view');
  const showContact = can(user, 'team:contact');

  const [workstreams, people] = await Promise.all([
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
  ]);

  const board = people.filter((p) => ['president', 'officer', 'director'].includes(p.role.key));

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader title="Team" subtitle="Who is who, and who leads what." />

      <Card title="Board" className="mb-5" bodyClass="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {board.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-lg border border-line p-4">
              <Avatar name={p.name} accent={p.accent} size={40} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{p.name}</p>
                <p className="text-[12.5px] text-ink-muted">{p.title}</p>
                <p className="text-[12px] text-ink-faint">{p.company}</p>
                {showContact && <p className="mt-1 text-[12px] text-ink-faint">{p.email}</p>}
                <Pill tone="brand" className="mt-2">
                  {p.role.name}
                </Pill>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {workstreams.map((w) => (
          <Card
            key={w.id}
            title={
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: w.color }} />
                {w.name}
              </span>
            }
            bodyClass="p-5"
          >
            {w.description && <p className="mb-4 text-[13px] text-ink-muted">{w.description}</p>}

            {w.lead && (
              <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-paper px-3 py-2">
                <Avatar name={w.lead.name} accent={w.lead.accent} size={28} />
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">{w.lead.name}</p>
                  <p className="text-[11.5px] text-ink-faint">Lead</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {w.members
                .filter((m) => m.userId !== w.leadId)
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <Avatar name={m.user.name} accent={m.user.accent} size={24} />
                    <span className="text-[13px] text-ink">{m.user.name}</span>
                    <span className="text-[11.5px] text-ink-faint">{m.user.role.name}</span>
                  </div>
                ))}
              {w.members.length === 0 && <p className="text-[13px] text-ink-faint">No members yet.</p>}
            </div>
          </Card>
        ))}
      </div>

      {!showContact && (
        <p className="mt-5 text-[12.5px] text-ink-faint">
          Member email addresses are not part of your access. Reach people through chat instead.
        </p>
      )}
    </div>
  );
}
