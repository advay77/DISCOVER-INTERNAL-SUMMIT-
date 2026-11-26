import Link from 'next/link';
import clsx from 'clsx';
import { requireUser, can, scopeOf, scopeFilter, visibleWorkstreams } from '@/lib/authz';
import { db } from '@/lib/db';
import { currentEvent } from '@/lib/event';
import { Empty, Pill, StatTile, Avatar } from '@/components/ui';
import { IconAlert, IconArrow } from '@/components/icons';
import { dateRange, daysUntil, dueLabel, money, pct, shortDate } from '@/lib/format';
import { KIND_LABEL, durationMinutes, toMinutes } from '@/lib/agenda';

/**
 * Summit summary: the whole Annual Summit on one page, for the board meeting
 * or a sponsor call. Every section respects the reader's permissions, and
 * money only appears for those who can see finance.
 */
export default async function SummitSummary() {
  const user = await requireUser();
  const event = await currentEvent();
  if (!event) return <Empty title="No active cycle" hint="Create one in Admin → Event." />;

  const seeTasks = can(user, 'tasks:view');
  const seeSpeakers = can(user, 'speakers:view');
  const seeAgenda = can(user, 'agenda:view');
  const seeSponsors = can(user, 'sponsors:view');
  const seeVendors = can(user, 'vendors:view');
  const seeAttendees = can(user, 'attendees:view');
  const seeMoney = scopeOf(user, 'finance:view') !== 'none';
  const taskWhere: any = seeTasks ? scopeFilter(user, 'tasks:view') : { id: '__none__' };
  const now = new Date();

  const [tasks, workstreams, speakers, sessions, sponsors, vendors, attendees, overdue] = await Promise.all([
    db.task.findMany({ where: taskWhere, select: { status: true, workstreamId: true, dueDate: true } }),
    db.workstream.findMany({
      where: visibleWorkstreams(user),
      orderBy: { order: 'asc' },
      select: { id: true, name: true, color: true, lead: { select: { name: true, accent: true } } },
    }),
    seeSpeakers ? db.speaker.findMany({ select: { status: true, bio: true, headshot: true, confirmed: true, speakerType: true } }) : [],
    seeAgenda ? db.session.findMany({ where: { eventId: event.id }, select: { day: true, kind: true, title: true, startTime: true, endTime: true } }) : [],
    seeSponsors
      ? db.sponsor.findMany({ where: scopeFilter(user, 'sponsors:view') as any, select: { tier: true, status: true, amount: true, logoReceived: true, contractSigned: true } })
      : [],
    seeVendors
      ? db.vendor.findMany({ where: scopeFilter(user, 'vendors:view') as any, select: { paymentStatus: true, amount: true } })
      : [],
    seeAttendees ? db.attendee.findMany({ where: { eventId: event.id }, select: { status: true, company: true, ticketType: true } }) : [],
    seeTasks
      ? db.task.findMany({
          where: { AND: [taskWhere, { status: { not: 'done' }, dueDate: { lt: now } }] },
          orderBy: { dueDate: 'asc' },
          take: 5,
          select: { id: true, title: true, dueDate: true, owner: { select: { name: true, accent: true } } },
        })
      : [],
  ]);

  const countdown = daysUntil(event.startDate);
  const done = tasks.filter((t) => t.status === 'done').length;
  const taskPct = pct(done, tasks.length);
  const overdueCount = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < now).length;

  const confirmedSpeakers = speakers.filter((s) => s.confirmed).length;
  const readySpeakers = speakers.filter((s) => s.confirmed && s.bio && s.headshot).length;
  const confirmedSponsors = sponsors.filter((s) => s.status === 'Confirmed');
  const committed = confirmedSponsors.reduce((m, s) => m + (s.amount ?? 0), 0);
  const settledVendors = vendors.filter((v) => ['Paid', 'Deposit paid'].includes(v.paymentStatus)).length;
  const registered = attendees.filter((a) => a.status === 'Confirmed').length;
  const orgs = new Set(attendees.filter((a) => a.status === 'Confirmed' && a.company).map((a) => a.company)).size;

  // One readiness figure: the average of the parts this reader can see.
  const parts: number[] = [];
  if (seeTasks) parts.push(taskPct);
  if (seeSpeakers) parts.push(pct(confirmedSpeakers, Math.max(1, speakers.length)));
  if (seeSponsors && sponsors.length) parts.push(pct(confirmedSponsors.length, sponsors.length));
  if (seeVendors && vendors.length) parts.push(pct(settledVendors, vendors.length));
  if (seeAttendees) parts.push(pct(registered, Math.max(1, event.goalRegistrants)));
  const readiness = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;

  const tbc = event.venue === 'To be confirmed' || !event.venue;
  const sessionsByDay = (d: number) =>
    sessions.filter((s) => s.day === d).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  const attention: { text: string; href: string }[] = [];
  if (tbc) attention.push({ text: 'Dates and venue are not confirmed', href: '/admin?tab=event' });
  if (overdueCount) attention.push({ text: `${overdueCount} ${overdueCount === 1 ? 'task is' : 'tasks are'} past the due date`, href: '/tasks?filter=overdue' });
  if (seeSpeakers && confirmedSpeakers > readySpeakers)
    {
    const n = confirmedSpeakers - readySpeakers;
    attention.push({ text: `${n} confirmed ${n === 1 ? 'speaker is' : 'speakers are'} missing a bio or headshot`, href: '/speakers' });
  }
  if (seeSponsors && sponsors.length === 0) attention.push({ text: 'No sponsors in the pipeline yet', href: '/sponsors' });
  if (seeVendors && vendors.length === 0) attention.push({ text: 'No vendors engaged yet', href: '/logistics' });
  if (seeAttendees && registered === 0) attention.push({ text: 'Registration has not opened', href: '/attendees' });

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      {/* Hero */}
      <section className="card grid grid-cols-1 gap-5 overflow-hidden p-5 sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-ink-faint">{event.theme ?? 'Annual Summit'}</p>
          <h1 className="display mt-1 text-[30px] leading-[1.05] text-ink sm:text-[40px]">{event.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-ink-muted">
            <span>{dateRange(event.startDate, event.endDate)}</span>
            <span className="text-ink-faint">·</span>
            <span>{event.venue && !tbc ? `${event.venue}, ` : ''}{event.city}</span>
            {tbc && <Pill tone="warn">Venue not confirmed</Pill>}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { d: 'Day 1', t: event.dayOneTheme },
              { d: 'Day 2', t: event.dayTwoTheme },
            ].map((x) => (
              <div key={x.d} className="subcard px-4 py-3">
                <p className="text-[12px] font-medium text-ink-faint">{x.d}</p>
                <p className="text-[14px] font-semibold text-ink">{x.t ?? 'Theme to be set'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col justify-between rounded-tile bg-accent p-4 text-accent-ink">
            <p className="text-[12.5px] font-medium opacity-80">{countdown >= 0 ? 'Days to go' : 'Days since'}</p>
            <p className="display text-[48px] leading-none">{Math.abs(countdown)}</p>
          </div>
          <div className="flex flex-col justify-between rounded-tile bg-navy p-4 text-white">
            <p className="text-[12.5px] font-medium opacity-70">Readiness</p>
            <div>
              <p className="display text-[48px] leading-none">{readiness}%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-accent" style={{ width: `${readiness}%` }} />
              </div>
            </div>
          </div>
          <p className="col-span-2 text-[11.5px] leading-snug text-ink-faint">
            Readiness averages tasks done, speakers confirmed, sponsors signed, vendors settled and registrations against
            goal — whichever of those you can see.
          </p>
        </div>
      </section>

      {/* Headline figures */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {seeTasks && <StatTile value={`${taskPct}%`} label="Tasks done" tone="navy" hint={`${done} of ${tasks.length}`} href="/tasks" />}
        {seeTasks && <StatTile value={overdueCount} label="Overdue" tone="bad" hint="tasks" href="/tasks?filter=overdue" />}
        {seeSpeakers && <StatTile value={confirmedSpeakers} label="Speakers" tone="ok" hint={`of ${speakers.length}`} href="/speakers" />}
        {seeSponsors && (
          <StatTile
            value={seeMoney ? money(committed) : confirmedSponsors.length}
            label={seeMoney ? 'Sponsorship' : 'Sponsors'}
            tone="brand"
            hint={seeMoney ? `${confirmedSponsors.length} signed` : `of ${sponsors.length}`}
            href="/sponsors"
          />
        )}
        {seeVendors && <StatTile value={settledVendors} label="Vendors settled" tone="navy" hint={`of ${vendors.length}`} href="/logistics" />}
        {seeAttendees && <StatTile value={registered} label="Registered" tone="navy" hint={`goal ${event.goalRegistrants}`} href="/attendees" />}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Workstreams */}
        {seeTasks && (
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Workstreams</h2>
              <Link prefetch={false} href="/tasks" className="text-[13px] font-semibold text-ink hover:underline">
                All tasks ›
              </Link>
            </div>
            <div className="mt-4 space-y-3.5">
              {workstreams.map((w) => {
                const list = tasks.filter((t) => t.workstreamId === w.id);
                const d = list.filter((t) => t.status === 'done').length;
                const late = list.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < now).length;
                const p = pct(d, list.length);
                return (
                  <Link prefetch={false} key={w.id} href={`/tasks?ws=${w.id}`} className="block rounded-xl p-1 transition hover:bg-panel">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: w.color }} />
                        <span className="truncate text-[14px] font-semibold text-ink">{w.name}</span>
                        {w.lead && <span className="hidden truncate text-[12px] text-ink-faint sm:inline">· {w.lead.name}</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-[12.5px]">
                        {late > 0 && <span className="font-medium text-brick">{late} late</span>}
                        <span className="text-ink-muted">
                          {d}/{list.length}
                        </span>
                        <span className="w-10 text-right font-semibold text-ink">{p}%</span>
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper">
                      <div className="h-full rounded-full" style={{ width: `${p}%`, background: w.color }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Needs attention */}
        <section className="card p-5">
          <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Needs attention</h2>
          {attention.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-forest-100 px-4 py-3 text-[13.5px] font-medium text-forest">Nothing flagged. On track.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {attention.map((a) => (
                <li key={a.text}>
                  <Link prefetch={false} href={a.href} className="flex items-center gap-3 rounded-2xl bg-brass-100 px-4 py-3 text-[13.5px] text-brass transition hover:opacity-85">
                    <IconAlert size={15} className="shrink-0" />
                    <span className="flex-1 font-medium">{a.text}</span>
                    <IconArrow size={14} className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {overdue.length > 0 && (
            <>
              <p className="mt-5 text-[12.5px] font-medium text-ink-faint">Most overdue</p>
              <div className="mt-1 divide-y divide-line">
                {overdue.map((t) => (
                  <Link prefetch={false} key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    {t.owner && <Avatar name={t.owner.name} accent={t.owner.accent} size={26} />}
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{t.title}</span>
                    <Pill tone="bad">{dueLabel(t.dueDate).text}</Pill>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Speakers */}
        {seeSpeakers && (
          <section className="card p-5">
            <Header title="Speakers" href="/speakers" />
            <div className="mt-3 space-y-2">
              {['Identified', 'Invited', 'Responded', 'Confirmed', 'Declined'].map((s) => {
                const n = speakers.filter((x) => x.status === s).length;
                return (
                  <Row key={s} label={s} value={n} bar={pct(n, Math.max(1, speakers.length))} tone={s === 'Confirmed' ? 'bg-forest' : s === 'Declined' ? 'bg-brick' : 'bg-navy'} />
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Mini label="Keynotes" value={speakers.filter((s) => s.speakerType === 'Keynote').length} />
              <Mini label="Bio & headshot in" value={`${readySpeakers}/${confirmedSpeakers}`} />
            </div>
          </section>
        )}

        {/* Agenda */}
        {seeAgenda && (
          <section className="card p-5">
            <Header title="Run of show" href="/agenda" />
            <div className="mt-3 space-y-3">
              {[1, 2].map((d) => {
                const list = sessionsByDay(d);
                const onStage = list.filter((s) => !['break', 'meal'].includes(s.kind));
                const mins = onStage.reduce((m, s) => m + durationMinutes(s.startTime, s.endTime), 0);
                const keynotes = list.filter((s) => s.kind === 'keynote');
                return (
                  <div key={d} className="subcard p-3.5">
                    <div className="flex items-baseline justify-between">
                      <p className="text-[14px] font-semibold text-ink">Day {d}</p>
                      <p className="text-[12px] text-ink-muted">
                        {list.length ? `${list[0].startTime} – ${list[list.length - 1].endTime}` : 'Nothing scheduled'}
                      </p>
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-muted">
                      {onStage.length} sessions · {Math.round((mins / 60) * 10) / 10} h on stage
                    </p>
                    {keynotes.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {keynotes.slice(0, 3).map((k) => (
                          <li key={k.title} className="flex gap-2 text-[12.5px]">
                            <span className="shrink-0 tabular-nums text-ink-faint">{k.startTime}</span>
                            <span className="truncate text-ink">{k.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              <p className="text-[11.5px] text-ink-faint">
                {Object.entries(
                  sessions.reduce<Record<string, number>>((m, s) => ((m[s.kind] = (m[s.kind] ?? 0) + 1), m), {}),
                )
                  .map(([k, n]) => `${n} ${KIND_LABEL[k]?.toLowerCase() ?? k}`)
                  .join(' · ')}
              </p>
            </div>
          </section>
        )}

        {/* Sponsors + logistics + registration */}
        <section className="card p-5 lg:col-span-2 xl:col-span-1">
          <Header title="Partners, logistics & registration" />
          <div className="mt-3 space-y-4">
            {seeSponsors && (
              <div>
                <p className="mb-1.5 text-[12.5px] font-medium text-ink-faint">Sponsors by tier</p>
                {sponsors.length === 0 ? (
                  <p className="text-[13px] text-ink-muted">No sponsors in the pipeline yet.</p>
                ) : (
                  ['Presenting', 'Gold', 'Silver', 'Supporting'].map((tier) => {
                    const list = sponsors.filter((s) => s.tier === tier);
                    const c = list.filter((s) => s.status === 'Confirmed').length;
                    return <Row key={tier} label={tier} value={`${c}/${list.length}`} bar={pct(c, Math.max(1, list.length))} tone="bg-brand" />;
                  })
                )}
              </div>
            )}
            {seeVendors && (
              <div className="grid grid-cols-2 gap-2">
                <Mini label="Vendors engaged" value={vendors.length} />
                <Mini label="Paid or deposited" value={settledVendors} />
              </div>
            )}
            {seeAttendees && (
              <div className="space-y-2">
                <Row label="Registrants" value={`${registered}/${event.goalRegistrants}`} bar={pct(registered, event.goalRegistrants)} tone="bg-forest" />
                <Row label="Organisations" value={`${orgs}/${event.goalOrganizations}`} bar={pct(orgs, event.goalOrganizations)} tone="bg-forest" />
              </div>
            )}
            {!seeSponsors && !seeVendors && !seeAttendees && (
              <p className="text-[13px] text-ink-muted">Your role does not include partners, logistics or registration.</p>
            )}
          </div>
        </section>
      </div>

      <p className="text-[12px] text-ink-faint">
        Figures are live. Event details are set in Admin → Event · updated {shortDate(now)}.
      </p>
    </div>
  );
}

function Header({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
      {href && (
        <Link prefetch={false} href={href} className="text-[13px] font-semibold text-ink hover:underline">
          Open ›
        </Link>
      )}
    </div>
  );
}

function Row({ label, value, bar, tone }: { label: string; value: React.ReactNode; bar: number; tone: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-ink-muted">{label}</span>
        <span className="font-semibold tabular-nums text-ink">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper">
        <div className={clsx('h-full rounded-full', tone)} style={{ width: `${Math.min(100, bar)}%` }} />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="subcard px-3.5 py-2.5">
      <p className="text-[12px] text-ink-faint">{label}</p>
      <p className="display text-[22px] leading-tight text-ink">{value}</p>
    </div>
  );
}
