import { requireCan, scopeOf, workstreamIds, redactMany, MONEY_GATES } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, Pill, StatusPill, Avatar, StatTile, Empty } from '@/components/ui';
import { money } from '@/lib/format';
import { IconSponsor, IconCheck, IconFiles, IconMoney } from '@/components/icons';

const TIER_TONE: Record<string, string> = {
  Presenting: 'brand',
  Gold: 'warn',
  Silver: 'neutral',
  Supporting: 'neutral',
};

export default async function SponsorsPage() {
  const user = await requireCan('sponsors:view');

  const scope = scopeOf(user, 'sponsors:view');
  const where: any =
    scope === 'all'
      ? {}
      : scope === 'workstream'
        ? { OR: [{ workstreamId: { in: workstreamIds(user) } }, { ownerId: user.id }] }
        : { id: '__denied__' };

  const rows = await db.sponsor.findMany({ where, orderBy: [{ tier: 'asc' }, { company: 'asc' }], include: { owner: true } });
  const sponsors = redactMany(user, rows as any[], MONEY_GATES as any);

  const canSeeMoney = scopeOf(user, 'finance:view') !== 'none';
  const confirmed = rows.filter((s) => s.status === 'Confirmed');
  const committed = canSeeMoney ? confirmed.reduce((sum, s) => sum + (s.amount ?? 0), 0) : null;
  const pipeline = canSeeMoney ? rows.reduce((sum, s) => sum + (s.amount ?? 0), 0) : null;

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader title="Sponsors" subtitle="Partnerships pipeline for the current cycle." />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile value={rows.length} label="In the pipeline" tone="navy" icon={<IconSponsor size={17} />} />
        <StatTile value={confirmed.length} label="Confirmed" tone="ok" icon={<IconCheck size={17} />} />
        <StatTile value={rows.filter((s) => s.contractSigned).length} label="Contracts signed" tone="brand" icon={<IconFiles size={17} />} />
        {canSeeMoney ? (
          <StatTile value={money(committed)} label="Committed" tone="warn" icon={<IconMoney size={17} />} />
        ) : (
          <StatTile value={rows.filter((s) => s.logoReceived).length} label="Logos received" tone="warn" icon={<IconCheck size={17} />} />
        )}
      </div>

      {sponsors.length === 0 ? (
        <Empty title="No sponsors in your view" />
      ) : (
        <Card bodyClass="p-0 overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-line bg-paper">
              <tr>
                <th className="th">Company</th>
                <th className="th">Tier</th>
                {canSeeMoney && <th className="th">Value</th>}
                <th className="th">Owner</th>
                <th className="th">Logo</th>
                <th className="th">Contract</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sponsors.map((s: any) => (
                <tr key={s.id} className="hover:bg-paper">
                  <td className="td font-medium text-ink">{s.company}</td>
                  <td className="td">
                    <Pill tone={TIER_TONE[s.tier] ?? 'neutral'}>{s.tier}</Pill>
                  </td>
                  {canSeeMoney && <td className="td font-semibold">{money(s.amount)}</td>}
                  <td className="td">
                    {s.owner && (
                      <span className="flex items-center gap-2">
                        <Avatar name={s.owner.name} accent={s.owner.accent} size={22} />
                        <span className="text-[13px]">{s.owner.name}</span>
                      </span>
                    )}
                  </td>
                  <td className="td">
                    <Pill tone={s.logoReceived ? 'ok' : 'neutral'}>{s.logoReceived ? 'Received' : 'Waiting'}</Pill>
                  </td>
                  <td className="td">
                    <Pill tone={s.contractSigned ? 'ok' : 'neutral'}>{s.contractSigned ? 'Signed' : 'Not yet'}</Pill>
                  </td>
                  <td className="td">
                    <StatusPill status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {!canSeeMoney && (
        <p className="mt-4 text-[12.5px] text-ink-faint">
          Sponsorship values are not part of your access, so they are not sent to this page.
        </p>
      )}
      {canSeeMoney && pipeline !== null && (
        <p className="mt-4 text-[12.5px] text-ink-faint">
          Full pipeline value including unconfirmed: <strong className="text-ink">{money(pipeline)}</strong>
        </p>
      )}
    </div>
  );
}
