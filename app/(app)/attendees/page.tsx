import { requireCan, can } from '@/lib/authz';
import { db } from '@/lib/db';
import { currentEvent } from '@/lib/event';
import { PageHeader, Card, StatTile, Bar } from '@/components/ui';
import { AttendeeList } from './AttendeeList';
import { IconAttendees, IconCheck, IconClock, IconTask } from '@/components/icons';
import { pct } from '@/lib/format';

export default async function AttendeesPage() {
  const user = await requireCan('attendees:view');
  const showContact = can(user, 'attendees:contact');

  const [event, attendees] = await Promise.all([
    currentEvent(),
    db.attendee.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 }),
  ]);

  const active = attendees.filter((a) => a.status !== 'Cancelled');
  const paying = active.filter((a) => a.paid).length;
  const confirmed = attendees.filter((a) => a.status === 'Confirmed').length;
  const pending = attendees.filter((a) => a.status === 'Pending').length;
  const waitlist = attendees.filter((a) => a.status === 'Waitlist').length;
  const orgs = new Set(active.map((a) => a.company?.trim().toLowerCase()).filter(Boolean)).size;
  const students = active.filter((a) => a.ticketType === 'Student').length;

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Attendees"
        subtitle="Registrations against the goals the board set in the December meeting."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile value={active.length} label="Total registered" tone="navy" icon={<IconAttendees size={17} />} />
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
                  {paying} / {event.goalRegistrants}
                </span>
              </div>
              <div className="mt-2">
                <Bar value={pct(paying, event.goalRegistrants)} />
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
                <Bar value={pct(students, Math.max(1, active.length))} tone="#D97708" />
              </div>
            </div>
          </div>
        </Card>
      )}

      <AttendeeList
        attendees={attendees.map((a) => ({
          id: a.id,
          name: a.name,
          company: a.company,
          email: showContact ? a.email : null,
          ticketType: a.ticketType,
          status: a.status,
          paid: a.paid,
        }))}
        canEdit={can(user, 'attendees:edit')}
        showContact={showContact}
        exportAction={
          can(user, 'attendees:export') ? (
            <a href="/api/attendees/export" className="btn-ghost btn-sm">
              Export CSV
            </a>
          ) : null
        }
      />

      {!showContact && (
        <p className="mt-4 text-[12.5px] text-ink-faint">
          Attendee email addresses are personal data and are not part of your access.
        </p>
      )}
    </div>
  );
}
