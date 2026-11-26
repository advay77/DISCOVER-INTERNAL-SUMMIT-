import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, can, scopeFilter, scopeOf } from '@/lib/authz';
import { db } from '@/lib/db';
import { Card, Pill, Avatar, StatusPill, Empty, Bar } from '@/components/ui';
import { Thread } from '@/components/Thread';
import { longDate, clockTime, dueLabel, daysUntil, pct } from '@/lib/format';
import { KIND_LABEL, KIND_TONE } from '@/lib/eventKinds';

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id },
    include: { owner: true, host: true, workstream: true },
  });
  if (!event) notFound();

  // A restricted workstream's event is closed to anyone outside the board.
  if (event.workstream?.restricted && scopeOf(user, 'finance:view') === 'none') notFound();

  const [tasks, attendees] = await Promise.all([
    can(user, 'tasks:view')
      ? db.task.findMany({
          where: { AND: [scopeFilter(user, 'tasks:view'), { eventId: id }] },
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
          include: { owner: true },
          take: 100,
        })
      : [],
    can(user, 'attendees:view') ? db.attendee.count({ where: { eventId: id } }) : 0,
  ]);

  const done = tasks.filter((t) => t.status === 'done').length;
  const away = daysUntil(event.startDate);
  const isSummit = event.kind === 'summit';

  return (
    <div className="mx-auto max-w-[1180px]">
      <Link prefetch={false} href="/events" className="mb-3 inline-block text-[13px] font-medium text-ink-muted hover:text-brand">
        ← All events
      </Link>

      {/* Header: same language as the Summit summary hero. */}
      <section className="card grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-ink-faint">
            <Pill tone={KIND_TONE[event.kind] ?? 'neutral'}>{KIND_LABEL[event.kind] ?? event.kind}</Pill>
            {event.workstream && event.workstream.name !== (KIND_LABEL[event.kind] ?? event.kind) && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: event.workstream.color }} />
                {event.workstream.name}
              </span>
            )}
          </p>
          <h1 className="display mt-2.5 text-[28px] leading-tight text-ink lg:text-[36px]">{event.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-ink-muted">
            <span>{longDate(event.startDate)}</span>
            {!isSummit && (
              <>
                <span className="text-ink-faint">·</span>
                <span>{clockTime(event.startDate)}</span>
              </>
            )}
            {event.venue && (
              <>
                <span className="text-ink-faint">·</span>
                <span>{event.venue}</span>
              </>
            )}
            {event.city && (
              <>
                <span className="text-ink-faint">·</span>
                <span>{event.city}</span>
              </>
            )}
          </p>
          {event.description && (
            <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-muted">{event.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:w-[320px]">
          <div className="flex flex-col justify-between rounded-tile bg-accent p-4 text-accent-ink">
            <p className="text-[12.5px] font-medium opacity-80">{away >= 0 ? 'Days to go' : 'Days since'}</p>
            <p className="display mt-3 text-[40px] leading-none">{Math.abs(away)}</p>
          </div>
          <div className="flex flex-col justify-between rounded-tile bg-panel p-4">
            <p className="text-[12.5px] font-medium text-ink-muted">Tasks done</p>
            <p className="display mt-3 text-[40px] leading-none text-ink">{tasks.length ? `${pct(done, tasks.length)}%` : '—'}</p>
          </div>
        </div>
      </section>

      {/* Summit gets its deep modules; smaller events do not need them. */}
      {isSummit && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ['Speakers', '/speakers', 'speakers:view'],
            ['Run of show', '/agenda', 'agenda:view'],
            ['Sponsors', '/sponsors', 'sponsors:view'],
            ['Logistics', '/logistics', 'vendors:view'],
            ['Attendees', '/attendees', 'attendees:view'],
          ]
            .filter(([, , cap]) => can(user, cap as string))
            .map(([label, href]) => (
              <Link prefetch={false}
                key={href as string}
                href={href as string}
                className="card px-4 py-3 text-[13.5px] font-semibold text-ink transition hover:border-line-strong"
              >
                {label}
              </Link>
            ))}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {/* Who is running it */}
          <Card title="Who is running it">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <div>
                <dt className="label">Owner</dt>
                <dd className="mt-1.5 flex items-center gap-2">
                  {event.owner ? (
                    <>
                      <Avatar name={event.owner.name} accent={event.owner.accent} size={24} />
                      <span className="text-[13.5px] font-medium">{event.owner.name}</span>
                    </>
                  ) : (
                    <span className="text-[13.5px] text-ink-faint">Unassigned</span>
                  )}
                </dd>
              </div>
              {event.host && (
                <div>
                  <dt className="label">Host</dt>
                  <dd className="mt-1.5 flex items-center gap-2">
                    <Avatar name={event.host.name} accent={event.host.accent} size={24} />
                    <span className="text-[13.5px] font-medium">{event.host.name}</span>
                  </dd>
                </div>
              )}
              <div>
                <dt className="label">Status</dt>
                <dd className="mt-1.5">
                  <Pill tone={event.status === 'complete' ? 'ok' : event.status === 'cancelled' ? 'bad' : 'warn'}>
                    {event.status}
                  </Pill>
                </dd>
              </div>
              {can(user, 'attendees:view') && attendees > 0 && (
                <div>
                  <dt className="label">Registered</dt>
                  <dd className="mt-1.5 text-[13.5px] font-medium">{attendees}</dd>
                </div>
              )}
            </dl>

            {event.guest && (
              <div className="mt-5 border-t border-line pt-5">
                <p className="label">Guest</p>
                <p className="mt-1.5 text-[14px] font-semibold text-ink">{event.guest}</p>
                {event.guestTitle && (
                  <p className="text-[13px] text-ink-muted">{event.guestTitle}</p>
                )}
                {event.guestLink && (
                  <a
                    href={event.guestLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1 inline-block text-[12.5px] font-medium text-brand hover:underline"
                  >
                    LinkedIn profile
                  </a>
                )}
              </div>
            )}
          </Card>

          {/* Its tasks */}
          <Card
            title={`Tasks — ${done} of ${tasks.length} done`}
            bodyClass="divide-y divide-line p-0"
            action={
              <Link prefetch={false} href="/tasks" className="text-[13px] font-semibold text-brand hover:underline">
                All tasks →
              </Link>
            }
          >
            {tasks.length === 0 ? (
              <div className="p-5">
                <Empty
                  title="No tasks on this event yet"
                  hint="Create one on the Tasks page and attach it to this event."
                />
              </div>
            ) : (
              <>
                <div className="px-5 pt-4">
                  <Bar value={pct(done, tasks.length)} />
                </div>
                {tasks.slice(0, 12).map((t) => {
                  const due = dueLabel(t.dueDate);
                  return (
                    <Link prefetch={false}
                      key={t.id}
                      href={`/tasks/${t.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-panel/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink">{t.title}</span>
                        <span className="text-[11.5px] text-ink-faint">{t.category}</span>
                      </span>
                      {t.owner && <Avatar name={t.owner.name} accent={t.owner.accent} size={22} />}
                      <StatusPill status={t.status} />
                      <Pill tone={due.tone}>{due.text}</Pill>
                    </Link>
                  );
                })}
              </>
            )}
          </Card>

        </div>

        {/* The conversation lives on the event */}
        <Card title="Discussion" bodyClass="p-4">
          <p className="mb-3 text-[12.5px] leading-snug text-ink-muted">
            Everything said here stays attached to this event.
          </p>
          <Thread
            entityType="event"
            entityId={event.id}
            meId={user.id}
            meName={user.name}
            meAccent={user.accent}
            compact
            placeholder="Add an update…"
            emptyHint="Nothing yet. Say what needs deciding."
          />
        </Card>
      </div>
    </div>
  );
}
