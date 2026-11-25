import Link from 'next/link';
import { requireUser, can, scopeOf, workstreamIds } from '@/lib/authz';
import { db } from '@/lib/db';
import { Card, Pill, Ring, StatTile, Avatar, StatusPill, Empty } from '@/components/ui';
import { IconAlert, IconClock, IconCheck, IconAttendees, IconTask } from '@/components/icons';
import { dateRange, daysUntil, dueLabel, pct, relativeTime, shortDate } from '@/lib/format';

export default async function Dashboard() {
  const user = await requireUser();
  const event = await db.event.findFirst({ where: { isCurrent: true } });

  const scope = scopeOf(user, 'tasks:view');
  const mine = workstreamIds(user);
  const taskWhere: any =
    scope === 'all'
      ? {}
      : scope === 'own'
        ? { ownerId: user.id }
        : scope === 'workstream'
          ? { OR: [{ workstreamId: { in: mine } }, { ownerId: user.id }] }
          : { id: '__denied__' };

  const now = new Date();

  const [tasks, myTasks, upcoming, activity, recentMessages] = await Promise.all([
    db.task.findMany({ where: taskWhere, select: { status: true, dueDate: true } }),
    db.task.findMany({
      where: { ownerId: user.id, status: { not: 'done' } },
      orderBy: [{ dueDate: 'asc' }],
      take: 6,
      include: { workstream: true },
    }),
    db.task.findMany({
      where: { ...taskWhere, status: { not: 'done' }, dueDate: { not: null } },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: { owner: true },
    }),
    db.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { actor: true } }),
    db.message.findMany({
      where: { channelId: { not: null }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: { author: true, channel: true },
    }),
  ]);

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < now).length;
  const weekEnd = new Date(now.getTime() + 7 * 86400000);
  const dueWeek = tasks.filter(
    (t) => t.status !== 'done' && t.dueDate && t.dueDate >= now && t.dueDate <= weekEnd,
  ).length;

  const [speakerTotal, speakerConfirmed] = can(user, 'speakers:view')
    ? await Promise.all([db.speaker.count(), db.speaker.count({ where: { confirmed: true } })])
    : [0, 0];

  const [sponsorTotal, sponsorConfirmed] = can(user, 'sponsors:view')
    ? await Promise.all([db.sponsor.count(), db.sponsor.count({ where: { status: 'Confirmed' } })])
    : [0, 0];

  const [vendorTotal, vendorSettled] = can(user, 'vendors:view')
    ? await Promise.all([
        db.vendor.count(),
        db.vendor.count({ where: { paymentStatus: { in: ['Paid', 'Deposit paid'] } } }),
      ])
    : [0, 0];

  const attendeeCount = can(user, 'attendees:view')
    ? await db.attendee.count({ where: { status: 'Confirmed' } })
    : 0;

  const openQuestions = can(user, 'questions:view')
    ? await db.openQuestion.findMany({
        where: { status: { not: 'Answered' } },
        orderBy: { updatedAt: 'desc' },
        take: 4,
        include: { owner: true },
      })
    : [];

  const countdown = event ? daysUntil(event.startDate) : 0;
  const progress = pct(done, total);

  return (
    <div className="mx-auto max-w-[1340px] space-y-5">
      {/* Hero — a masthead, not a gradient card */}
      <section className="rounded-card bg-navy-900 px-5 py-6 text-white sm:px-6 sm:py-7 lg:px-9 lg:py-9">
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-label text-brass">
              {event?.theme ?? 'Current cycle'}
            </p>
            <h1 className="display mt-3 text-[30px] leading-[1.05] sm:text-[38px] lg:text-[46px]">
              {event?.name ?? 'No active cycle'}
            </h1>
            {event && (
              <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-white/55">
                <span>{dateRange(event.startDate, event.endDate)}</span>
                <span className="hidden h-3 w-px bg-white/20 sm:block" />
                <span>{event.city}</span>
                <span className="hidden h-3 w-px bg-white/20 sm:block" />
                <span>
                  Day 1 {event.dayOneTheme} · Day 2 {event.dayTwoTheme}
                </span>
              </p>
            )}
            {event?.venue === 'To be confirmed' && (
              <p className="mt-4 inline-flex items-center gap-2 border-l-2 border-brass bg-white/[0.06] py-1.5 pl-3 pr-4 text-[12.5px] text-white/80">
                Dates and venue are not confirmed. Set them in Admin → Event.
              </p>
            )}
          </div>

          {/* Countdown as one typographic line */}
          <div className="flex w-full items-stretch gap-6 border-t border-white/12 pt-5 sm:w-auto sm:gap-8 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <div>
              <p className="display text-[38px] leading-none sm:text-[46px]">
                {countdown >= 0 ? countdown : Math.abs(countdown)}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-label text-white/40">
                {countdown >= 0 ? 'Days to go' : 'Days since'}
              </p>
            </div>
            <div className="border-l border-white/12 pl-6 sm:pl-8">
              <p className="display text-[38px] leading-none sm:text-[46px]">{progress}%</p>
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
            <Link href="/tasks?filter=mine" className="text-[13px] font-semibold text-brand hover:underline">
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
                  <StatusPill status={t.status} />
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
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1.1fr]">
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
              <Link href="/questions" className="text-[13px] font-semibold text-brand hover:underline">
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
          title="Recent communications"
          action={
            <Link href="/chat" className="text-[13px] font-semibold text-brand hover:underline">
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
