import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, can, scopeFilter, scopeOf } from '@/lib/authz';
import { db } from '@/lib/db';
import { Card, Pill, Avatar, StatusPill, Empty, Bar } from '@/components/ui';
import { Thread } from '@/components/Thread';
import { longDate, clockTime, dueLabel, daysUntil, pct } from '@/lib/format';
import { KIND_LABEL } from '@/lib/eventKinds';

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

  const [tasks, questions, attendees] = await Promise.all([
    can(user, 'tasks:view')
      ? db.task.findMany({
          where: { AND: [scopeFilter(user, 'tasks:view'), { eventId: id }] },
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
          include: { owner: true },
          take: 100,
        })
      : [],
    can(user, 'questions:view')
      ? db.openQuestion.findMany({
          where: { AND: [scopeFilter(user, 'questions:view'), { eventId: id }] },
          include: { owner: true },
        })
      : [],
    can(user, 'attendees:view') ? db.attendee.count({ where: { eventId: id } }) : 0,
  ]);

  const done = tasks.filter((t) => t.status === 'done').length;
  const away = daysUntil(event.startDate);
  const isSummit = event.kind === 'summit';

  return (
    <div className="mx-auto max-w-[1180px]">
      <Link href="/events" className="mb-3 inline-block text-[13px] font-medium text-ink-muted hover:text-brand">
        ← All events
      </Link>

      {/* Header */}
      <section className="rounded-card bg-navy-900 px-6 py-6 text-white lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-label text-brass">
              {KIND_LABEL[event.kind] ?? event.kind}
              {event.workstream ? ` · ${event.workstream.name}` : ''}
            </p>
            <h1 className="display mt-2.5 text-[30px] leading-tight lg:text-[36px]">{event.name}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-white/60">
              <span>{longDate(event.startDate)}</span>
              {!isSummit && <span>{clockTime(event.startDate)}</span>}
              {event.venue && <span>{event.venue}</span>}
              {event.city && <span>{event.city}</span>}
            </p>
            {event.description && (
              <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-white/70">
                {event.description}
              </p>
            )}
          </div>

          <div className="flex items-stretch gap-6 border-l border-white/12 pl-6">
            <div>
              <p className="display text-[34px] leading-none">
                {away >= 0 ? away : Math.abs(away)}
              </p>
              <p className="mt-1.5 text-[10.5px] uppercase tracking-label text-white/40">
                {away >= 0 ? 'days to go' : 'days since'}
              </p>
            </div>
            {tasks.length > 0 && (
              <div className="border-l border-white/12 pl-6">
                <p className="display text-[34px] leading-none">{pct(done, tasks.length)}%</p>
                <p className="mt-1.5 text-[10.5px] uppercase tracking-label text-white/40">tasks done</p>
              </div>
            )}
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
              <Link
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
              <Link href="/tasks" className="text-[13px] font-semibold text-brand hover:underline">
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
                    <Link
                      key={t.id}
                      href={`/tasks/${t.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-paper"
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

          {questions.length > 0 && (
            <Card title="Open questions" bodyClass="divide-y divide-line p-0">
              {questions.map((q) => (
                <div key={q.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13.5px] font-medium text-ink">{q.question}</p>
                    <StatusPill status={q.status} />
                  </div>
                  {q.update && <p className="mt-1 text-[12px] text-ink-muted">{q.update}</p>}
                </div>
              ))}
            </Card>
          )}
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
