import { requireCan, scopeOf, workstreamIds, redactMany, MONEY_GATES } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, StatusPill, Avatar, StatTile, Empty, Pill } from '@/components/ui';
import { money } from '@/lib/format';
import { IconLogistics, IconCheck, IconClock, IconMoney, IconPin } from '@/components/icons';

export default async function LogisticsPage() {
  const user = await requireCan('vendors:view');

  const scope = scopeOf(user, 'vendors:view');
  const where: any =
    scope === 'all'
      ? {}
      : scope === 'workstream'
        ? { OR: [{ workstreamId: { in: workstreamIds(user) } }, { ownerId: user.id }] }
        : { id: '__denied__' };

  const [rows, event] = await Promise.all([
    db.vendor.findMany({ where, orderBy: { name: 'asc' }, include: { owner: true, workstream: true } }),
    db.event.findFirst({ where: { isCurrent: true } }),
  ]);

  const vendors = redactMany(user, rows as any[], MONEY_GATES as any);
  const canSeeMoney = scopeOf(user, 'finance:view') !== 'none';
  const settled = rows.filter((v) => ['Paid', 'Deposit paid'].includes(v.paymentStatus)).length;
  const committed = canSeeMoney ? rows.reduce((s, v) => s + (v.amount ?? 0), 0) : null;

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader title="Logistics" subtitle="Venue, vendors and everything that has to be in the room on the day." />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile value={rows.length} label="Vendors engaged" tone="navy" icon={<IconLogistics size={17} />} />
        <StatTile value={settled} label="Paid or deposited" tone="ok" icon={<IconCheck size={17} />} />
        <StatTile value={rows.length - settled} label="Still open" tone="warn" icon={<IconClock size={17} />} />
        {canSeeMoney ? (
          <StatTile value={money(committed)} label="Committed spend" tone="brand" icon={<IconMoney size={17} />} />
        ) : (
          <StatTile value={event?.city ?? '—'} label="Location" tone="brand" icon={<IconPin size={17} />} />
        )}
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card title="Venue">
          <p className="text-[15px] font-semibold text-ink">{event?.venue ?? 'Not set'}</p>
          <p className="mt-1 text-[13px] text-ink-muted">{event?.city}</p>
          {event?.venue === 'To be confirmed' && (
            <p className="mt-3 rounded-lg bg-brass/10 px-3 py-2 text-[12.5px] font-medium text-brass">
              Not confirmed — set it in Admin → Event
            </p>
          )}
        </Card>
        <Card title="Room block">
          <p className="text-[13.5px] text-ink-muted">
            The 2026 cycle lost its block to a missed deadline. Track the extension on the Open Questions page.
          </p>
          <Pill tone="bad" className="mt-3">
            Deadline missed last cycle
          </Pill>
        </Card>
        <Card title="On the day">
          <p className="text-[13.5px] text-ink-muted">
            Floorplan, signage, badges and lanyards are tracked as tasks under Summit Logistics.
          </p>
        </Card>
      </div>

      {vendors.length === 0 ? (
        <Empty title="No vendors in your view" />
      ) : (
        <Card title="Vendors" bodyClass="p-0 overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-line bg-paper">
              <tr>
                <th className="th">Vendor</th>
                <th className="th">Service</th>
                <th className="th">Method</th>
                {canSeeMoney && <th className="th">Amount</th>}
                <th className="th">Owner</th>
                <th className="th">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {vendors.map((v: any) => (
                <tr key={v.id} className="hover:bg-paper">
                  <td className="td font-medium text-ink">{v.name}</td>
                  <td className="td text-[13px] text-ink-muted">{v.service}</td>
                  <td className="td text-[13px] text-ink-muted">{v.paymentMethod ?? '—'}</td>
                  {canSeeMoney && <td className="td font-semibold">{money(v.amount)}</td>}
                  <td className="td">
                    {v.owner && (
                      <span className="flex items-center gap-2">
                        <Avatar name={v.owner.name} accent={v.owner.accent} size={22} />
                        <span className="text-[13px]">{v.owner.name}</span>
                      </span>
                    )}
                  </td>
                  <td className="td">
                    <StatusPill status={v.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {!canSeeMoney && (
        <p className="mt-4 text-[12.5px] text-ink-faint">
          You can see who is supplying what, but not what it costs. Amounts are removed before this page is
          rendered.
        </p>
      )}
    </div>
  );
}
