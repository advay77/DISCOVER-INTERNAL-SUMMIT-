import Link from 'next/link';
import { requireCan, can, scopeOf, scopeFilter, allows, visibleWorkstreams } from '@/lib/authz';
import { db } from '@/lib/db';
import { currentEvent } from '@/lib/event';
import { PageHeader, Card, StatTile, Pill } from '@/components/ui';
import { money, dateRange, daysUntil, dueLabel, shortDate, pct } from '@/lib/format';
import { IconLogistics, IconCheck, IconClock, IconMoney, IconPin } from '@/components/icons';
import { VendorList, type VendorRow } from './VendorList';

/** Task categories that belong on this page. */
const LOGISTICS_CATEGORIES = ['Summit Logistics', 'Summit Day Support'];

const STATUS_COLORS: Record<string, string> = {
  Paid: '#17A34A',
  'Deposit paid': '#1270BA',
  Quoted: '#D97708',
  'Not started': '#B8C0CC',
};

export default async function LogisticsPage() {
  const user = await requireCan('vendors:view');
  const canSeeMoney = scopeOf(user, 'finance:view') !== 'none';
  const canEditMoney = scopeOf(user, 'finance:edit') !== 'none';
  const canAdd = scopeOf(user, 'vendors:edit') !== 'none';
  const seeTasks = can(user, 'tasks:view');

  const [rows, event, tasks, people, workstreams] = await Promise.all([
    db.vendor.findMany({
      where: scopeFilter(user, 'vendors:view') as any,
      orderBy: [{ dueDate: 'asc' }, { name: 'asc' }],
      include: { owner: { select: { id: true, name: true, accent: true } }, workstream: true },
    }),
    currentEvent(),
    seeTasks
      ? db.task.findMany({
          where: { AND: [scopeFilter(user, 'tasks:view') as any, { category: { in: LOGISTICS_CATEGORIES } }] },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, title: true, status: true, dueDate: true, owner: { select: { name: true } } },
        })
      : [],
    canAdd ? db.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }) : [],
    canAdd ? db.workstream.findMany({ where: visibleWorkstreams(user), orderBy: { order: 'asc' }, select: { id: true, name: true } }) : [],
  ]);

  const vendors: VendorRow[] = rows.map((v) => ({
    id: v.id,
    name: v.name,
    service: v.service,
    paymentMethod: v.paymentMethod,
    amount: canSeeMoney ? v.amount : null, // money never leaves the server without finance:view
    paymentStatus: v.paymentStatus,
    dueDate: v.dueDate ? v.dueDate.toISOString() : null,
    notes: v.notes,
    owner: v.owner,
    workstreamId: v.workstreamId,
    editable: allows(user, 'vendors:edit', v),
  }));

  const paid = rows.filter((v) => v.paymentStatus === 'Paid').length;
  const unpaid = rows.filter((v) => v.paymentStatus !== 'Paid');
  const overdue = unpaid.filter((v) => v.dueDate && daysUntil(v.dueDate) < 0).length;
  const nextDue = unpaid.filter((v) => v.dueDate && daysUntil(v.dueDate) >= 0)[0];
  const committed = rows.reduce((s, v) => s + (v.amount ?? 0), 0);
  const outstanding = unpaid.reduce((s, v) => s + (v.amount ?? 0), 0);

  const openTasks = tasks.filter((t) => t.status !== 'done');
  const doneTasks = tasks.length - openTasks.length;
  const toGo = event ? daysUntil(event.startDate) : null;

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      <PageHeader
        title="Logistics"
        subtitle="The venue, the vendors the Summit pays, and the checklist for getting everything into the room on the day."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile value={rows.length} label="Vendors" tone="navy" icon={<IconLogistics size={17} />} hint="on the list" />
        <StatTile value={paid} label="Paid in full" tone="ok" icon={<IconCheck size={17} />} hint={`of ${rows.length}`} />
        <StatTile
          value={unpaid.length}
          label="Still to pay"
          tone={overdue ? 'bad' : 'warn'}
          icon={<IconClock size={17} />}
          hint={overdue ? `${overdue} overdue` : nextDue ? `next due ${shortDate(nextDue.dueDate)}` : undefined}
        />
        {canSeeMoney ? (
          <StatTile value={money(committed)} label="Committed spend" tone="brand" icon={<IconMoney size={17} />} hint={outstanding ? `${money(outstanding)} outstanding` : undefined} />
        ) : (
          <StatTile value={toGo != null && toGo >= 0 ? toGo : '—'} label="Days to the Summit" tone="brand" icon={<IconPin size={17} />} />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Venue */}
        <Card
          title="Venue"
          action={
            can(user, 'admin:event') ? (
              <Link prefetch={false} href="/admin?tab=event" className="text-[12.5px] font-medium text-brand hover:underline">
                Edit
              </Link>
            ) : null
          }
        >
          {event?.venue && event.venue !== 'To be confirmed' ? (
            <>
              <p className="text-[17px] font-semibold text-ink">{event.venue}</p>
              <p className="mt-0.5 text-[13px] text-ink-muted">{event.city}</p>
              <Pill tone="ok" className="mt-3">
                Confirmed
              </Pill>
            </>
          ) : (
            <>
              <p className="text-[17px] font-semibold text-ink">Not booked yet</p>
              <p className="mt-0.5 text-[13px] text-ink-muted">{event?.city ?? 'City not set'}</p>
              <Pill tone="warn" className="mt-3">
                Venue to be confirmed
              </Pill>
            </>
          )}
          {event && (
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-[12.5px]">
              <div>
                <dt className="text-ink-faint">Dates</dt>
                <dd className="mt-0.5 font-medium text-ink">{dateRange(event.startDate, event.endDate)}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Countdown</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {toGo == null ? '—' : toGo > 0 ? `${toGo} days to go` : toGo === 0 ? 'Today' : 'Done'}
                </dd>
              </div>
            </dl>
          )}
        </Card>

        {/* Payments */}
        <Card title="Payments">
          {rows.length === 0 ? (
            <p className="text-[13px] text-ink-muted">Add vendors below and their payment progress shows up here.</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-[28px] font-semibold tracking-[-0.02em] text-ink">{pct(paid, rows.length)}%</span>
                <span className="text-[12.5px] text-ink-muted">
                  {paid} of {rows.length} paid
                </span>
              </div>
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-panel" aria-hidden>
                {Object.keys(STATUS_COLORS).map((s) => {
                  const n = rows.filter((v) => v.paymentStatus === s).length;
                  return n ? <div key={s} style={{ width: `${(n / rows.length) * 100}%`, background: STATUS_COLORS[s] }} /> : null;
                })}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
                {Object.entries(STATUS_COLORS).map(([s, c]) => (
                  <li key={s} className="flex items-center gap-2 text-ink-muted">
                    <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                    {s}
                    <span className="ml-auto font-semibold text-ink">{rows.filter((v) => v.paymentStatus === s).length}</span>
                  </li>
                ))}
              </ul>
              {overdue > 0 && (
                <p className="mt-3 rounded-lg bg-brick/10 px-3 py-2 text-[12.5px] font-medium text-brick">
                  {overdue} {overdue === 1 ? 'payment is' : 'payments are'} past due
                </p>
              )}
            </>
          )}
        </Card>

        {/* Checklist */}
        <Card
          title="Logistics checklist"
          action={
            seeTasks ? (
              <Link prefetch={false} href="/tasks?q=Summit%20Logistics" className="text-[12.5px] font-medium text-brand hover:underline">
                All tasks
              </Link>
            ) : null
          }
        >
          {!seeTasks ? (
            <p className="text-[13px] text-ink-muted">Tasks are not part of your access.</p>
          ) : tasks.length === 0 ? (
            <p className="text-[13px] text-ink-muted">
              No logistics tasks yet. Create tasks with the category “Summit Logistics” (room block, signage, badges,
              floorplan) and they appear here.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-ink-muted">
                  {doneTasks} of {tasks.length} done
                </span>
                <span className="font-semibold text-ink">{pct(doneTasks, tasks.length)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel">
                <div className="h-full rounded-full bg-forest" style={{ width: `${pct(doneTasks, tasks.length)}%` }} />
              </div>
              <ul className="mt-3 space-y-1">
                {openTasks.slice(0, 5).map((t) => {
                  const due = dueLabel(t.dueDate);
                  return (
                    <li key={t.id}>
                      <Link prefetch={false} href={`/tasks/${t.id}`} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-panel">
                        <span className="h-4 w-4 shrink-0 rounded-[5px] border-[1.5px] border-line-strong" />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{t.title}</span>
                        {t.dueDate && (
                          <span className={`shrink-0 text-[11.5px] ${due.tone === 'bad' ? 'font-medium text-brick' : due.tone === 'warn' ? 'text-brass' : 'text-ink-faint'}`}>
                            {due.text}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
                {openTasks.length === 0 && <li className="text-[13px] font-medium text-forest">Everything is done.</li>}
                {openTasks.length > 5 && <li className="px-1.5 text-[12px] text-ink-faint">+{openTasks.length - 5} more open</li>}
              </ul>
            </>
          )}
        </Card>
      </div>

      <VendorList
        vendors={vendors}
        canAdd={canAdd}
        canSeeMoney={canSeeMoney}
        canEditMoney={canEditMoney}
        people={people}
        workstreams={workstreams}
        meId={user.id}
      />

      {!canSeeMoney && (
        <p className="text-[12.5px] text-ink-faint">
          You can see who is supplying what, but not what it costs. Amounts are removed before this page is sent to
          you.
        </p>
      )}
    </div>
  );
}
