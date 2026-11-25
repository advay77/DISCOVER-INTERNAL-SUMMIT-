import { requireCan, can } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, StatusPill, Pill, StatTile, Bar } from '@/components/ui';
import { IconAttendees, IconCheck, IconClock, IconTask } from '@/components/icons';
import { pct } from '@/lib/format';

export default async function AttendeesPage() {
  const user = await requireCan('attendees:view');
  const showContact = can(user, 'attendees:contact');

  const [event, attendees] = await Promise.all([
    db.event.findFirst({ where: { isCurrent: true } }),
    db.attendee.findMany({ orderBy: { createdAt: 'desc' }, take: 300 }),
  ]);

  const confirmed = attendees.filter((a) => a.status === 'Confirmed').length;
  const pending = attendees.filter((a) => a.status === 'Pending').length;
  const waitlist = attendees.filter((a) => a.status === 'Waitlist').length;
  const orgs = new Set(attendees.map((a) => a.company)).size;
  const students = attendees.filter((a) => a.ticketType === 'Student').length;

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        title="Attendees"
        subtitle="Registrations against the goals the board set in the December meeting."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile value={attendees.length} label="Total registered" tone="navy" icon={<IconAttendees size={17} />} />
        <StatTile value={confirmed} label="Confirmed" tone="ok" icon={<IconCheck size={17} />} />
        <StatTile value={pending} label="Pending" tone="warn" icon={<IconClock size={17} />} />
        <StatTile value={waitlist} label="Waitlist" tone="brand" icon={<IconTask size={17} />} />
      </div>

      {event && (
        <Card title="Against the cycle goals" className="mb-5">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-ink">Paying registrants</span>
                <span className="text-[13px] text-ink-muted">
                  {confirmed} / {event.goalRegistrants}
                </span>
              </div>
              <div className="mt-2">
                <Bar value={pct(confirmed, event.goalRegistrants)} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-ink">Organisations represented</span>
                <span className="text-[13px] text-ink-muted">
                  {orgs} / {event.goalOrganizations}
                </span>
              </div>
              <div className="mt-2">
                <Bar value={pct(orgs, event.goalOrganizations)} tone="#17A34A" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-ink">Student places</span>
                <span className="text-[13px] text-ink-muted">{students}</span>
              </div>
              <div className="mt-2">
                <Bar value={pct(students, Math.max(1, attendees.length))} tone="#D97708" />
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card
        title="Registrations"
        action={
          can(user, 'attendees:export') ? (
            <a href="/api/attendees/export" className="btn-ghost btn-sm">
              Export CSV
            </a>
          ) : (
            <Pill tone="neutral">Export not available to you</Pill>
          )
        }
        bodyClass="p-0 overflow-x-auto"
      >
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-line bg-paper">
            <tr>
              <th className="th">Name</th>
              <th className="th">Company</th>
              {showContact && <th className="th">Email</th>}
              <th className="th">Ticket</th>
              <th className="th">Paid</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {attendees.slice(0, 80).map((a) => (
              <tr key={a.id} className="hover:bg-paper">
                <td className="td font-medium text-ink">{a.name}</td>
                <td className="td text-[13px] text-ink-muted">{a.company}</td>
                {showContact && <td className="td text-[12.5px] text-ink-muted">{a.email}</td>}
                <td className="td">
                  <Pill tone={a.ticketType === 'VIP' ? 'brand' : a.ticketType === 'Student' ? 'warn' : 'neutral'}>
                    {a.ticketType}
                  </Pill>
                </td>
                <td className="td text-[13px]">{a.paid ? 'Yes' : '—'}</td>
                <td className="td">
                  <StatusPill status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {!showContact && (
        <p className="mt-4 text-[12.5px] text-ink-faint">
          Attendee email addresses are personal data and are not part of your access.
        </p>
      )}
    </div>
  );
}
