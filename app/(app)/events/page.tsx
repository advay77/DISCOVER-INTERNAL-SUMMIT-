import Link from 'next/link';
import clsx from 'clsx';
import { requireUser, can, visibleWorkstreams, restrictionFilter } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, Pill, Avatar, Empty, StatTile } from '@/components/ui';
import { IconAgenda, IconSpeaker, IconTeam, IconCheck } from '@/components/icons';
import { longDate, daysUntil, relativeTime } from '@/lib/format';
import { NewEvent } from './NewEvent';
import { KIND_LABEL, KIND_TONE, EVENT_KINDS } from '@/lib/eventKinds';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const user = await requireUser();
  const { kind } = await searchParams;

  const restriction = restrictionFilter(user);
  const where: any = restriction ? { AND: [restriction] } : {};
  if (kind) where.kind = kind;

  const [events, workstreams, people] = await Promise.all([
    db.event.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        owner: true,
        host: true,
        workstream: true,
        _count: { select: { tasks: true, attendees: true } },
      },
    }),
    db.workstream.findMany({ where: visibleWorkstreams(user), orderBy: { order: 'asc' } }),
    db.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  const now = Date.now();
  const upcoming = events
    .filter((e) => new Date(e.endDate).getTime() >= now && e.status !== 'cancelled')
    .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
  const past = events.filter((e) => new Date(e.endDate).getTime() < now || e.status === 'cancelled');

  const canCreate = can(user, 'tasks:edit');
  const kinds = EVENT_KINDS;

  const Row = ({ e }: { e: (typeof events)[number] }) => {
    const away = daysUntil(e.startDate);
    return (
      <Link
        href={`/events/${e.id}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition hover:bg-panel/60"
      >
        <div className="w-[76px] shrink-0">
          <p className="text-[11px] uppercase tracking-label text-ink-faint">
            {longDate(e.startDate).split(' ')[0]}
          </p>
          <p className="display text-[22px] leading-none text-ink">
            {new Date(e.startDate).getDate()}
          </p>
          <p className="text-[11px] text-ink-faint">{new Date(e.startDate).getFullYear()}</p>
        </div>

        {/* min width so the badges wrap under the title on a phone instead of squeezing it */}
        <div className="min-w-[11rem] flex-1">
          <p className="text-[14.5px] font-semibold leading-snug text-ink">{e.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-muted">
            {e.guest && <span>{e.guest}</span>}
            {e.venue && <span>{e.venue}</span>}
            {e.workstream && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.workstream.color }} />
                {e.workstream.name}
              </span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[92px] sm:pl-0">
          {e._count.tasks > 0 && (
            <span className="text-[11.5px] text-ink-faint">{e._count.tasks} tasks</span>
          )}
          {e.owner && <Avatar name={e.owner.name} accent={e.owner.accent} size={22} />}
          <Pill tone={KIND_TONE[e.kind] ?? 'neutral'}>{KIND_LABEL[e.kind] ?? e.kind}</Pill>
          {away >= 0 && away < 400 && (
            <Pill tone={away <= 14 ? 'warn' : 'neutral'}>
              {away === 0 ? 'Today' : `${away}d`}
            </Pill>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Events"
        subtitle="Everything DISCOVER runs — the Annual Summit, and the webinars, networking evenings and campus sessions around it."
        action={canCreate ? <NewEvent workstreams={workstreams} people={people} /> : undefined}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile value={upcoming.length} label="Upcoming" tone="brand" icon={<IconAgenda size={17} />} />
        <StatTile
          value={events.filter((e) => e.kind === 'webinar').length}
          label="Webinars"
          tone="navy"
          icon={<IconSpeaker size={17} />}
        />
        <StatTile
          value={events.filter((e) => e.kind === 'networking' || e.kind === 'academic').length}
          label="In person"
          tone="warn"
          icon={<IconTeam size={17} />}
        />
        <StatTile
          value={events.filter((e) => e.status === 'complete').length}
          label="Completed"
          tone="ok"
          icon={<IconCheck size={17} />}
        />
      </div>

      <div className="chip-row mb-4 flex flex-wrap gap-2">
        <Link
          href="/events"
          className={clsx(
            'rounded-full px-3.5 py-1.5 text-[13px] font-medium',
            !kind ? 'bg-navy font-semibold text-white' : 'bg-white text-ink-muted shadow-card hover:text-ink',
          )}
        >
          All
        </Link>
        {kinds.map((k) => (
          <Link
            key={k}
            href={`/events?kind=${k}`}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-[13px] font-medium',
              kind === k ? 'bg-navy font-semibold text-white' : 'bg-white text-ink-muted shadow-card hover:text-ink',
            )}
          >
            {KIND_LABEL[k]}
          </Link>
        ))}
      </div>

      <div className="space-y-5">
        <Card title={`Upcoming — ${upcoming.length}`} bodyClass="divide-y divide-line p-0">
          {upcoming.length === 0 ? (
            <div className="p-5">
              <Empty title="Nothing scheduled" hint="Add the next webinar or networking evening." />
            </div>
          ) : (
            upcoming.map((e) => <Row key={e.id} e={e} />)
          )}
        </Card>

        {past.length > 0 && (
          <Card title={`Past — ${past.length}`} bodyClass="divide-y divide-line p-0">
            {past.map((e) => (
              <Row key={e.id} e={e} />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
