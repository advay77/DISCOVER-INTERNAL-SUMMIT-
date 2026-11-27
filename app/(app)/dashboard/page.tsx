import { requireUser, can } from '@/lib/authz';
import { currentEvent } from '@/lib/event';
import { PageHeader } from '@/components/ui';
import { WorkstreamCards } from '@/components/WorkstreamCards';
import { dateRange } from '@/lib/format';

/**
 * The first page after sign-in: every workstream, who leads it, who is in it
 * and how far its tasks have got.
 */
export default async function Dashboard() {
  const user = await requireUser();
  const event = await currentEvent();
  const first = user.name.split(' ')[0];

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <PageHeader
        title="Workstreams"
        subtitle={`Welcome back, ${first}.${event ? ` ${event.name} · ${dateRange(event.startDate, event.endDate)}${event.city ? ` · ${event.city}` : ''}.` : ''}${can(user, 'tasks:view') ? ' Tap a workstream’s progress bar to open its tasks.' : ''}`}
      />
      <WorkstreamCards user={user} />
    </div>
  );
}
