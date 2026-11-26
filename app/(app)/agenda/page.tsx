import { requireCan, can } from '@/lib/authz';
import { db } from '@/lib/db';
import { currentEvent } from '@/lib/event';
import { PageHeader, Pill, Empty, StatTile } from '@/components/ui';
import { dateRange, longDate } from '@/lib/format';
import { durationMinutes, toMinutes } from '@/lib/agenda';
import { AgendaTimeline, type AgendaSession } from './AgendaTimeline';
import { PrintButton } from './PrintButton';

export default async function AgendaPage() {
  const user = await requireCan('agenda:view');
  const event = await currentEvent();
  if (!event) return <Empty title="No active cycle" hint="Create one in Admin → Event." />;

  const editable = can(user, 'agenda:edit');
  const seeSpeakers = can(user, 'speakers:view');

  const [rows, people, speakers] = await Promise.all([
    db.session.findMany({
      where: { eventId: event.id },
      include: {
        owner: { select: { id: true, name: true, accent: true } },
        moderator: { select: { id: true, name: true } },
        speakers: { include: { speaker: { select: { id: true, name: true } } } },
      },
    }),
    editable
      ? db.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } })
      : [],
    editable && seeSpeakers
      ? db.speaker.findMany({ where: { status: { not: 'Declined' } }, orderBy: { name: 'asc' }, select: { id: true, name: true } })
      : null,
  ]);

  // Order by the clock, not by insertion, so an added session lands in place.
  const sessions: AgendaSession[] = rows
    .sort((a, b) => a.day - b.day || toMinutes(a.startTime) - toMinutes(b.startTime))
    .map((s) => ({
      id: s.id,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      title: s.title,
      description: s.description,
      kind: s.kind,
      room: s.room,
      status: s.status,
      owner: s.owner,
      moderator: s.moderator,
      speakers: seeSpeakers ? s.speakers.map((x) => x.speaker) : [],
    }));

  const dayDate = (n: number) => {
    const d = new Date(event.startDate);
    d.setDate(d.getDate() + n - 1);
    return longDate(d);
  };
  const days = [
    { n: 1, label: dayDate(1), theme: event.dayOneTheme },
    { n: 2, label: dayDate(2), theme: event.dayTwoTheme },
  ];

  const onStage = sessions.filter((s) => !['break', 'meal'].includes(s.kind));
  const speakerCount = new Set(sessions.flatMap((s) => s.speakers.map((x) => x.id))).size;
  const programmeHours = Math.round((onStage.reduce((m, s) => m + durationMinutes(s.startTime, s.endTime), 0) / 60) * 10) / 10;

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Run of show"
        subtitle={`${event.name} · ${dateRange(event.startDate, event.endDate)}${event.venue ? ` · ${event.venue}` : ''}`}
        action={
          <div className="flex items-center gap-2 print:hidden">
            {!editable && <Pill tone="neutral">Read only</Pill>}
            <PrintButton />
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 print:hidden">
        <StatTile value={sessions.length} label="On the schedule" tone="navy" hint="items" />
        <StatTile value={onStage.length} label="Sessions" tone="navy" hint="on stage" />
        <StatTile value={seeSpeakers ? speakerCount : '—'} label="Speakers placed" tone="navy" hint="in sessions" />
        <StatTile value={programmeHours} label="Programme" tone="navy" hint="hours" highlight />
      </div>

      <AgendaTimeline
        days={days}
        sessions={sessions}
        editable={editable}
        people={people}
        speakers={speakers}
      />

      <p className="mt-5 text-[12.5px] text-ink-faint print:hidden">
        Day-of volunteers see this page in full. It is the one thing everyone on site needs.
        {editable && ' Changes save straight away and are logged.'}
      </p>
    </div>
  );
}
