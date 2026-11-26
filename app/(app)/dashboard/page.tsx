import Link from 'next/link';
import { requireUser, can, scopeOf, scopeFilter } from '@/lib/authz';
import { db } from '@/lib/db';
import { Card, Pill, Ring, StatTile, Avatar, StatusPill, Empty } from '@/components/ui';
import { IconAlert, IconClock, IconCheck, IconAttendees, IconTask } from '@/components/icons';
import { dateRange, daysUntil, dueLabel, pct, relativeTime, shortDate } from '@/lib/format';

export default async function Dashboard() {
  const user = await requireUser();

  const scope = scopeOf(user, 'tasks:view');
  const taskWhere: any = scopeFilter(user, 'tasks:view');

  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86400000);
  const seeSpeakers = can(user, 'speakers:view');
  const seeSponsors = can(user, 'sponsors:view');
  const seeVendors = can(user, 'vendors:view');
  const seeAttendees = can(user, 'attendees:view');
  const seeQuestions = can(user, 'questions:view');

  const [
    event,
    total,
    done,
    overdue,
    dueWeek,
    myTasks,
    upcoming,
    activity,
    recentMessages,
    upcomingEvents,
    speakerTotal,
    speakerConfirmed,
    sponsorTotal,
    sponsorConfirmed,
    vendorTotal,
    vendorSettled,
    attendeeCount,
    openQuestions,
  ] = await Promise.all([
    db.event.findFirst({ where: { isCurrent: true } }),
    db.task.count({ where: taskWhere }),
    db.task.count({ where: { AND: [taskWhere, { status: 'done' }] } }),
    db.task.count({
      where: { AND: [taskWhere, { status: { not: 'done' }, dueDate: { lt: now } }] },
    }),
    db.task.count({
      where: {
        AND: [taskWhere, { status: { not: 'done' }, dueDate: { gte: now, lte: weekEnd } }],
      },
    }),
    db.task.findMany({
      where: { ownerId: user.id, status: { not: 'done' } },
      orderBy: [{ dueDate: 'asc' }],
      take: 6,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        dueDate: true,
        workstream: { select: { color: true } },
      },
    }),
    db.task.findMany({
      where: { ...taskWhere, status: { not: 'done' }, dueDate: { not: null } },
      orderBy: { dueDate: 'asc' },
      take: 5,
      select: { id: true, title: true, dueDate: true, owner: { select: { name: true } } },
    }),
    db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, summary: true, createdAt: true, actor: { select: { name: true } } },
    }),
    db.message.findMany({
      where: { channelId: { not: null }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { name: true, accent: true } },
        channel: { select: { key: true, name: true } },
      },
    }),
    db.event.findMany({
      where: {
        endDate: { gte: now },
        status: { not: 'cancelled' },
        ...(scopeOf(user, 'finance:view') === 'none'
          ? { OR: [{ workstreamId: null }, { workstream: { is: { restricted: false } } }] }
          : {}),
      },
      orderBy: { startDate: 'asc' },
      take: 4,
      select: {
        id: true,
        name: true,
        startDate: true,
        venue: true,
        kind: true,
        workstream: { select: { name: true } },
      },
    }),
    seeSpeakers ? db.speaker.count() : 0,
    seeSpeakers ? db.speaker.count({ where: { confirmed: true } }) : 0,
    seeSponsors ? db.sponsor.count() : 0,
    seeSponsors ? db.sponsor.count({ where: { status: 'Confirmed' } }) : 0,
    seeVendors ? db.vendor.count() : 0,
    seeVendors
      ? db.vendor.count({ where: { paymentStatus: { in: ['Paid', 'Deposit paid'] } } })
      : 0,
    seeAttendees ? db.attendee.count({ where: { status: 'Confirmed' } }) : 0,
    seeQuestions
      ? db.openQuestion.findMany({
          where: { AND: [scopeFilter(user, 'questions:view'), { status: { not: 'Answered' } }] },
          orderBy: { updatedAt: 'desc' },
          take: 4,
          select: {
            id: true,
            question: true,
            status: true,
            update: true,
            owner: { select: { name: true } },
          },
        })
      : [],
  ]);

  const countdown = event ? daysUntil(event.startDate) : 0;
  const progress = pct(done, total);

  return (
    <div className="mx-auto max-w-[1340px] space-y-5">
      {/* Hero — a masthead, not a gradient card */}
      <section className="rounded-card bg-navy-900 px-4 py-5 text-white sm:px-6 sm:py-7 lg:px-9 lg:py-9">
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-label text-brass">
              {event?.theme ?? 'Current cycle'}
            </p>
            <h1 className="display mt-2 text-[26px] leading-[1.05] sm:mt-3 sm:text-[38px] lg:text-[46px]">
              {event?.name ?? 'No active cycle'}
            </h1>
            {event && (
              <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-white/55 sm:mt-4 sm:gap-x-6 sm:text-[13px]">
                <span>{dateRange(event.startDate, event.endDate)}</span>
                <span className="hidden h-3 w-px bg-white/20 sm:block" />
                <span>{event.city}</span>
                <span className="hidden h-3 w-px bg-white/20 sm:block" />
                <span className="hidden sm:inline">
                  Day 1 {event.dayOneTheme} · Day 2 {event.dayTwoTheme}
                </span>
              </p>
            )}
            {event?.venue === 'To be confirmed' && (
              <p className="mt-3 inline-flex items-center gap-2 border-l-2 border-brass bg-white/[0.06] py-1.5 pl-3 pr-4 text-[12px] text-white/80 sm:mt-4 sm:text-[12.5px]">
                <span className="sm:hidden">Dates and venue not confirmed yet.</span>
                <span className="hidden sm:inline">Dates and venue are not confirmed. Set them in Admin → Event.</span>
              </p>
            )}
          </div>

          {/* Countdown as one typographic line */}
          <div className="flex w-full items-stretch gap-6 border-t border-white/12 pt-4 sm:w-auto sm:gap-8 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <div>
              <p className="display text-[32px] leading-none sm:text-[46px]">
                {countdown >= 0 ? countdown : Math.abs(countdown)}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-label text-white/40">
                {countdown >= 0 ? 'Days to go' : 'Days since'}
              </p>
            </div>
            <div className="border-l border-white/12 pl-6 sm:pl-8">
              <p className="display text-[32px] leading-none sm:text-[46px]">{progress}%</p>
              <p className="mt-2 text-[11px] uppercase tracking-label text-white/40">
                {scope === 'own' ? 'Your tasks done' : 'Cycle complete'}
              </p>
              <div className="mt-3 w-28 bg-white/15 sm:w-36">
                <div className="h-[3px] bg-brass" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile value={overdue} label="Overdue" tone="bad" icon={<IconAlert size={17} />} href="/tasks?filter=overdue" />
        <StatTile value={dueWeek} label="Due this week" tone="warn" icon={<IconClock size={17} />} href="/tasks" />
        <StatTile value={done} label="Completed" tone="ok" icon={<IconCheck size={17} />} href="/tasks?filter=done" />
        {can(user, 'attendees:view') ? (
          <StatTile value={attendeeCount} label="Registered" tone="navy" icon={<IconAttendees size={17} />} href="/attendees" />
        ) : (
          <StatTile value={myTasks.length} label="On your plate" tone="navy" icon={<IconTask size={17} />} href="/tasks?filter=mine" />
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        {/* My tasks */}
        <Card
          title={scope === 'own' ? 'Your tasks' : 'On your plate'}
          action={
            <Link href="/tasks?filter=mine" className="inline-flex min-h-[40px] items-center text-[13px] font-semibold text-brand hover:underline lg:min-h-0">
              View all →
            </Link>
          }
          bodyClass="divide-y divide-line"
        >
          {myTasks.length === 0 ? (
            <div className="p-5">
              <Empty title="Nothing assigned to you right now" hint="When someone assigns you a task it appears here first." />
            </div>
          ) : (
            myTasks.map((t) => {
              const due = dueLabel(t.dueDate);
              return (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-paper"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.workstream?.color ?? '#94A3B8' }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{t.title}</span>
                    <span className="text-[12px] text-ink-faint">{t.category}</span>
                  </span>
                  <span className="hidden sm:inline-flex">
                    <StatusPill status={t.status} />
                  </span>
                  <Pill tone={due.tone}>{due.text}</Pill>
                </Link>
              );
            })
          )}
        </Card>

        {/* Upcoming deadlines */}
        <Card title="Upcoming deadlines" bodyClass="divide-y divide-line">
          {upcoming.length === 0 ? (
            <div className="p-5">
              <Empty title="No deadlines in view" />
            </div>
          ) : (
            upcoming.map((t) => {
              const due = dueLabel(t.dueDate);
              return (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-11 shrink-0 text-center">
                    <div className="text-[10px] font-bold uppercase text-ink-faint">
                      {shortDate(t.dueDate).split(' ')[0]}
                    </div>
                    <div className="text-[17px] font-bold leading-none text-ink">
                      {shortDate(t.dueDate).split(' ')[1]}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{t.title}</p>
                    {t.owner && <p className="text-[12px] text-ink-faint">{t.owner.name}</p>}
                  </div>
                  <Pill tone={due.tone}>{due.text}</Pill>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {/* Rings + questions + activity */}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <Card title="Where the cycle stands">
          <div className="flex items-start justify-around gap-2">
            {can(user, 'speakers:view') && (
              <Ring
                value={pct(speakerConfirmed, speakerTotal)}
                label="Speakers"
                sub={`${speakerConfirmed} / ${speakerTotal} confirmed`}
                tone="#17A34A"
              />
            )}
            {can(user, 'sponsors:view') && (
              <Ring
                value={pct(sponsorConfirmed, sponsorTotal)}
                label="Sponsors"
                sub={`${sponsorConfirmed} / ${sponsorTotal} confirmed`}
                tone="#1D6FE0"
              />
            )}
            {can(user, 'vendors:view') && (
              <Ring
                value={pct(vendorSettled, vendorTotal)}
                label="Logistics"
                sub={`${vendorSettled} / ${vendorTotal} settled`}
                tone="#D97708"
              />
            )}
            {!can(user, 'speakers:view') && !can(user, 'sponsors:view') && (
              <Ring value={progress} label="Your tasks" sub={`${done} of ${total} done`} />
            )}
          </div>
        </Card>

        {can(user, 'questions:view') && (
          <Card
            title="Open questions"
            action={
              <Link href="/questions" className="inline-flex min-h-[40px] items-center text-[13px] font-semibold text-brand hover:underline lg:min-h-0">
                All →
              </Link>
            }
            bodyClass="divide-y divide-line"
          >
            {openQuestions.length === 0 ? (
              <div className="p-5">
                <Empty title="Nothing blocked" />
              </div>
            ) : (
              openQuestions.map((q) => (
                <div key={q.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13.5px] font-medium text-ink">{q.question}</p>
                    <StatusPill status={q.status} />
                  </div>
                  {q.update && <p className="mt-1 text-[12px] leading-snug text-ink-muted">{q.update}</p>}
                  {q.owner && <p className="mt-1 text-[11px] text-ink-faint">{q.owner.name}</p>}
                </div>
              ))
            )}
          </Card>
        )}

        <Card
          title="What is coming up"
          action={
            <Link href="/events" className="inline-flex min-h-[40px] items-center text-[13px] font-semibold text-brand hover:underline lg:min-h-0">
              All events →
            </Link>
          }
          bodyClass="divide-y divide-line p-0"
        >
          {upcomingEvents.length === 0 ? (
            <div className="p-5">
              <Empty title="Nothing scheduled" />
            </div>
          ) : (
            upcomingEvents.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-paper"
              >
                <span className="w-11 shrink-0 text-center">
                  <span className="block text-[10px] font-bold uppercase text-ink-faint">
                    {shortDate(e.startDate).split(' ')[0]}
                  </span>
                  <span className="block text-[17px] font-bold leading-none text-ink">
                    {shortDate(e.startDate).split(' ')[1]}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">{e.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-faint">
                    {e.workstream?.name ?? ''}
                    {e.venue ? ` · ${e.venue}` : ''}
                  </span>
                </span>
                <Pill tone={e.kind === 'summit' ? 'brand' : 'neutral'}>
                  {e.kind === 'summit' ? 'Summit' : e.kind}
                </Pill>
              </Link>
            ))
          )}
        </Card>

        <Card
          title="Recent communications"
          action={
            <Link href="/chat" className="inline-flex min-h-[40px] items-center text-[13px] font-semibold text-brand hover:underline lg:min-h-0">
              Open chat →
            </Link>
          }
          bodyClass="divide-y divide-line"
        >
          {recentMessages.map((m) => (
            <Link
              key={m.id}
              href={`/chat/${m.channel?.key}`}
              className="flex items-start gap-3 px-5 py-3 hover:bg-paper"
            >
              <Avatar name={m.author.name} accent={m.author.accent} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold text-ink">{m.author.name}</p>
                  <span className="shrink-0 text-[11px] text-ink-faint">{relativeTime(m.createdAt)}</span>
                </div>
                <p className="truncate text-[12.5px] text-ink-muted">{m.body}</p>
                <p className="text-[11px] text-ink-faint">#{m.channel?.name}</p>
              </div>
            </Link>
          ))}
          {activity.slice(0, 2).map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="text-[11px] text-ink-faint">●</span>
              <p className="min-w-0 flex-1 truncate text-[12.5px] text-ink-muted">
                <strong className="font-semibold text-ink">{a.actor?.name}</strong> {a.summary}
              </p>
              <span className="shrink-0 text-[11px] text-ink-faint">{relativeTime(a.createdAt)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
