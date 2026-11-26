import Link from 'next/link';
import { requireUser, can, scopeOf, scopeFilter } from '@/lib/authz';
import { db } from '@/lib/db';
import clsx from 'clsx';
import { Pill, StatTile, Avatar, StatusPill, Empty } from '@/components/ui';
import { IconTask, IconAgenda, IconChat, IconArrow } from '@/components/icons';
import { dateRange, daysUntil, dueLabel, pct, relativeTime, shortDate } from '@/lib/format';

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string }>;
}) {
  const user = await requireUser();
  const { pipeline: pipelineParam } = await searchParams;

  const scope = scopeOf(user, 'tasks:view');
  const taskWhere: any = scopeFilter(user, 'tasks:view');

  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86400000);
  const seeSpeakers = can(user, 'speakers:view');
  const seeSponsors = can(user, 'sponsors:view');
  const seeVendors = can(user, 'vendors:view');
  const seeAttendees = can(user, 'attendees:view');

  const [
    event,
    total,
    done,
    overdue,
    dueWeek,
    mineOpen,
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
    toChase,
    speakerRows,
    taskByStatus,
    toChaseCount,
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
    db.task.count({ where: { ownerId: user.id, status: { not: 'done' } } }),
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
    seeSpeakers
      ? db.speaker.findMany({
          where: { status: { in: ['Invited', 'Responded'] } },
          orderBy: [{ status: 'desc' }, { updatedAt: 'asc' }],
          take: 4,
          select: {
            id: true,
            name: true,
            company: true,
            status: true,
            speakerType: true,
            owner: { select: { name: true, accent: true } },
          },
        })
      : [],
    seeSpeakers
      ? db.speaker.findMany({ select: { status: true, confirmed: true, bio: true, headshot: true } })
      : [],
    db.task.groupBy({ by: ['status'], where: taskWhere, _count: { _all: true } }),
    seeSpeakers ? db.speaker.count({ where: { status: { in: ['Invited', 'Responded'] } } }) : 0,
  ]);

  const countdown = event ? daysUntil(event.startDate) : 0;
  const progress = pct(done, total);
  const first = user.name.split(' ')[0];

  // Greeting in the summit's own time zone.
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/New_York' }).format(now),
  );
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // ---------------------------------------------------------------- pipeline
  type Stage = { label: string; value: number; unit: string; pct: number };
  const showSpeakers = seeSpeakers && pipelineParam !== 'tasks';
  let stages: Stage[];
  if (showSpeakers) {
    const live = speakerRows.filter((s) => s.status !== 'Declined');
    const invited = live.filter((s) => ['Invited', 'Responded', 'Confirmed'].includes(s.status)).length;
    const responded = live.filter((s) => ['Responded', 'Confirmed'].includes(s.status)).length;
    const confirmed = speakerRows.filter((s) => s.confirmed).length;
    const ready = speakerRows.filter((s) => s.confirmed && s.bio && s.headshot).length;
    const base = Math.max(1, speakerRows.length);
    stages = [
      { label: 'Identified', value: speakerRows.length, unit: 'speakers', pct: 100 },
      { label: 'Invited', value: invited, unit: 'speakers', pct: pct(invited, base) },
      { label: 'Responded', value: responded, unit: 'speakers', pct: pct(responded, base) },
      { label: 'Confirmed', value: confirmed, unit: 'speakers', pct: pct(confirmed, base) },
      { label: 'Bio & headshot', value: ready, unit: 'ready', pct: pct(ready, base) },
    ];
  } else {
    const by = (k: string) => taskByStatus.find((t) => t.status === k)?._count._all ?? 0;
    const base = Math.max(1, total);
    stages = [
      { label: 'To do', value: by('todo'), unit: 'tasks', pct: pct(by('todo'), base) },
      { label: 'In progress', value: by('in_progress'), unit: 'tasks', pct: pct(by('in_progress'), base) },
      { label: 'Review', value: by('review'), unit: 'tasks', pct: pct(by('review'), base) },
      { label: 'Done', value: by('done'), unit: 'tasks', pct: pct(by('done'), base) },
    ];
  }
  const maxStage = Math.max(1, ...stages.map((s) => s.value));

  // ---------------------------------------------------------------- counters
  const tiles: React.ReactNode[] = [
    <StatTile key="o" value={overdue} label="Overdue" tone="bad" hint={overdue ? 'tasks' : 'clear'} href="/tasks?filter=overdue" />,
    <StatTile key="w" value={dueWeek} label="Due this week" tone="warn" hint="7 days" href="/tasks?filter=week" />,
    <StatTile key="d" value={done} label="Completed" tone="ok" hint={`of ${total}`} href="/tasks?filter=done" />,
    <StatTile key="m" value={mineOpen} label="On your plate" tone="navy" hint="open" href="/tasks?filter=mine" />,
  ];
  if (seeSpeakers)
    tiles.push(
      <StatTile key="s" value={speakerConfirmed} label="Speakers" tone="ok" hint={`of ${speakerTotal}`} href="/speakers" />,
    );
  if (seeSponsors)
    tiles.push(
      <StatTile key="sp" value={sponsorConfirmed} label="Sponsors" tone="brand" hint={`of ${sponsorTotal}`} href="/sponsors" />,
    );
  if (seeAttendees)
    tiles.push(<StatTile key="a" value={attendeeCount} label="Registered" tone="navy" hint="attendees" href="/attendees" />);
  if (seeVendors && !seeAttendees)
    tiles.push(
      <StatTile key="v" value={vendorSettled} label="Vendors settled" tone="navy" hint={`of ${vendorTotal}`} href="/logistics" />,
    );
  tiles.push(
    <StatTile
      key="c"
      value={countdown >= 0 ? countdown : Math.abs(countdown)}
      label={countdown >= 0 ? 'Days to go' : 'Days since summit'}
      hint={`${progress}%`}
      highlight
    />,
  );

  const linkCls = 'inline-flex min-h-[40px] items-center gap-1 text-[13px] font-semibold text-ink hover:underline lg:min-h-0';

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div className="min-w-0">
          <h1 className="display text-[28px] leading-tight text-ink sm:text-[36px]">
            {greeting}, {first}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-ink-muted">
            <span className="font-medium text-ink">{event?.name ?? 'No active cycle'}</span>
            {event && (
              <>
                <span className="text-ink-faint">·</span>
                <span>{dateRange(event.startDate, event.endDate)}</span>
                <span className="text-ink-faint">·</span>
                <span>{event.city}</span>
              </>
            )}
            {event?.venue === 'To be confirmed' && (
              <Link href="/admin" className="ml-1">
                <Pill tone="warn">Dates &amp; venue not confirmed</Pill>
              </Link>
            )}
          </p>
        </div>
        <Link href="/tasks" className="btn-primary py-2.5 pl-3 pr-5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
            <IconArrow size={13} />
          </span>
          Open task board
        </Link>
      </div>

      {/* Counters */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]"
        style={{ ['--n' as string]: tiles.length }}
      >
        {tiles}
      </div>

      {/* Pipeline */}
      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">
              {showSpeakers ? 'Speaker pipeline' : 'Task pipeline'}
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              {showSpeakers
                ? 'From first name on the list to bio and headshot in hand'
                : scope === 'own'
                  ? 'Your tasks, by status'
                  : 'Every task this cycle, by status'}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-panel p-1">
            {seeSpeakers && (
              <Link
                href="/dashboard"
                className={clsx(
                  'rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition',
                  showSpeakers ? 'bg-navy text-white' : 'text-ink-muted hover:text-ink',
                )}
              >
                Speakers
              </Link>
            )}
            <Link
              href="/dashboard?pipeline=tasks"
              className={clsx(
                'rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition',
                !showSpeakers ? 'bg-navy text-white' : 'text-ink-muted hover:text-ink',
              )}
            >
              Tasks
            </Link>
            <Link
              href={showSpeakers ? '/speakers' : '/tasks'}
              className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-ink-muted hover:text-ink"
              aria-label="Open the full list"
            >
              ···
            </Link>
          </div>
        </div>

        <div
          className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]"
          style={{ ['--n' as string]: stages.length }}
        >
          {stages.map((st, i) => {
            const last = i === stages.length - 1;
            const h = Math.max(8, Math.round((st.value / maxStage) * 100));
            return (
              <div key={st.label} className="subcard flex flex-col p-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium',
                      i === 0 ? 'bg-lime text-lime-ink' : last ? 'bg-navy text-white' : 'bg-white text-ink',
                    )}
                  >
                    {!(i === 0 || last) && <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />}
                    {st.label}
                  </span>
                  <span className="text-[12px] font-medium text-ink-muted">{st.pct}%</span>
                </div>
                <div className="mt-3 flex h-[96px] items-end">
                  <div
                    className={clsx('w-full rounded-xl', last ? 'bg-lime' : 'border border-line-strong')}
                    style={{
                      height: last ? 18 : `${h}%`,
                      ...(last
                        ? {}
                        : {
                            backgroundImage:
                              'repeating-linear-gradient(135deg, rgb(var(--line-strong)) 0 1px, transparent 1px 7px)',
                          }),
                    }}
                  />
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="display text-[38px] leading-none text-ink">{st.value}</span>
                  <span className="text-[12.5px] text-ink-muted">{st.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Next deadlines */}
        <section className="card flex flex-col p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Next deadlines</h2>
            <Link href="/tasks" className={linkCls}>
              All tasks <span aria-hidden>›</span>
            </Link>
          </div>
          <div className="mt-3 flex-1 divide-y divide-line">
            {upcoming.length === 0 ? (
              <Empty title="No deadlines in view" />
            ) : (
              upcoming.map((t) => {
                const due = dueLabel(t.dueDate);
                const [mon, day] = shortDate(t.dueDate).split(' ');
                return (
                  <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-3 py-3 transition hover:opacity-80">
                    <span className="w-12 shrink-0">
                      <span className="block text-[17px] font-semibold leading-none text-ink">{day}</span>
                      <span className="mt-0.5 block text-[11px] font-medium uppercase text-ink-faint">{mon}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">{t.title}</span>
                      {t.owner && <span className="block truncate text-[12px] text-ink-faint">{t.owner.name}</span>}
                    </span>
                    <Pill tone={due.tone}>{due.text}</Pill>
                  </Link>
                );
              })
            )}
          </div>
          <div className="subcard mt-3 px-3.5 py-3">
            <p className="text-[12px] font-medium text-ink-muted">Quick views</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ['Mine', '/tasks?filter=mine'],
                ['Overdue', '/tasks?filter=overdue'],
                ['This week', '/tasks?filter=week'],
                ['Done', '/tasks?filter=done'],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-dashed border-line-strong bg-white/60 px-3 py-1 text-[12px] font-medium text-ink-muted hover:border-ink/40 hover:text-ink"
                >
                  + {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Speakers still to land */}
        {seeSpeakers ? (
          <section className="card flex flex-col p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Speakers to chase</h2>
                <p className="mt-0.5 text-[13px] text-ink-muted">Invited or replied, not yet confirmed</p>
              </div>
              {toChaseCount > 0 && <Pill tone="lime" dot={false}>{toChaseCount} waiting</Pill>}
            </div>
            <div className="mt-3 space-y-2.5">
              {toChase.length === 0 ? (
                <Empty title="Nobody waiting on a reply" />
              ) : (
                toChase.map((sp) => (
                  <div key={sp.id} className="subcard p-3">
                    <div className="flex items-start gap-3">
                      <Avatar name={sp.name} accent={sp.owner?.accent ?? '#8F8F89'} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-ink">{sp.name}</p>
                        <p className="truncate text-[12.5px] text-ink-muted">
                          {sp.company ?? sp.speakerType}
                        </p>
                      </div>
                      <Link href={`/speakers/${sp.id}`} className="btn-ghost btn-sm shrink-0 border-transparent">
                        Open
                      </Link>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 pl-[48px]">
                      <StatusPill status={sp.status} />
                      <span className="truncate text-[11.5px] text-ink-faint">
                        {sp.owner ? `via ${sp.owner.name}` : sp.speakerType}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link href="/speakers" className="mt-3 text-[13px] font-semibold text-ink hover:underline">
              Full pipeline ›
            </Link>
          </section>
        ) : (
          <MyTasksCard tasks={myTasks} />
        )}

        {/* Right column: three compact lists */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2 xl:col-span-1">
          {seeSpeakers && <MyTasksCard tasks={myTasks.slice(0, 3)} compact />}

          <MiniCard
            icon={<IconAgenda size={14} />}
            title="Coming up"
            count={upcomingEvents.length}
            href="/events"
          >
            {upcomingEvents.length === 0 ? (
              <p className="text-[12.5px] text-ink-faint">Nothing scheduled.</p>
            ) : (
              upcomingEvents.slice(0, 3).map((e) => (
                <Link key={e.id} href={`/events/${e.id}`} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="truncate text-[13px] font-medium text-ink">{e.name}</span>
                  <span className="shrink-0 text-[12px] text-ink-faint">{shortDate(e.startDate)}</span>
                </Link>
              ))
            )}
          </MiniCard>

          <MiniCard
            icon={<IconChat size={14} />}
            title="Recent messages"
            count={recentMessages.length}
            href="/chat"
          >
            {recentMessages.length === 0 && activity.length === 0 ? (
              <p className="text-[12.5px] text-ink-faint">Quiet for now — new channel messages show up here.</p>
            ) : recentMessages.length > 0 ? (
              recentMessages.slice(0, 3).map((m) => (
                <Link key={m.id} href={`/chat/${m.channel?.key}`} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate text-[13px] text-ink">
                    <span className="font-medium">{m.author.name}</span>
                    <span className="text-ink-muted"> · {m.body}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-faint">{relativeTime(m.createdAt)}</span>
                </Link>
              ))
            ) : (
              activity.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate text-[13px] text-ink-muted">
                    <span className="font-medium text-ink">{a.actor?.name}</span> {a.summary}
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-faint">{relativeTime(a.createdAt)}</span>
                </div>
              ))
            )}
          </MiniCard>
        </div>
      </div>
    </div>
  );
}

function MiniCard({
  icon,
  title,
  count,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <Link href={href} className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-panel text-ink">{icon}</span>
        <span className="flex-1 text-[14.5px] font-semibold text-ink">{title}</span>
        <span className="text-[13px] font-medium text-ink-muted">{count}</span>
        <span className="text-ink-faint" aria-hidden>›</span>
      </Link>
      <div className="subcard mt-3 divide-y divide-line px-3.5 py-1.5">{children}</div>
    </section>
  );
}

function MyTasksCard({
  tasks,
  compact = false,
}: {
  tasks: { id: string; title: string; category: string | null; status: string; dueDate: Date | null; workstream: { color: string } | null }[];
  compact?: boolean;
}) {
  const body =
    tasks.length === 0 ? (
      <p className="py-1.5 text-[12.5px] text-ink-faint">Nothing assigned to you right now.</p>
    ) : (
      tasks.map((t) => {
        const due = dueLabel(t.dueDate);
        return (
          <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center justify-between gap-3 py-1.5">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.workstream?.color ?? '#8F8F89' }} />
              <span className="truncate text-[13px] font-medium text-ink">{t.title}</span>
            </span>
            <span
              className={clsx(
                'shrink-0 text-[12px]',
                due.tone === 'bad' ? 'text-brick' : due.tone === 'warn' ? 'text-brass' : 'text-ink-faint',
              )}
            >
              {due.text}
            </span>
          </Link>
        );
      })
    );
  if (compact)
    return (
      <MiniCard icon={<IconTask size={14} />} title="On your plate" count={tasks.length} href="/tasks?filter=mine">
        {body}
      </MiniCard>
    );
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Your tasks</h2>
        <Link href="/tasks?filter=mine" className="text-[13px] font-semibold text-ink hover:underline">
          View all ›
        </Link>
      </div>
      <div className="subcard mt-3 divide-y divide-line px-3.5 py-1.5">{body}</div>
    </section>
  );
}
