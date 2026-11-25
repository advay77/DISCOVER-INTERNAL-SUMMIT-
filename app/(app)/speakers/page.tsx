import Link from 'next/link';
import { requireCan, scopeOf, workstreamIds, redactMany, SPEAKER_GATES } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, Pill, StatusPill, Avatar, StatTile, Empty } from '@/components/ui';
import { IconSpeaker, IconCheck, IconRetro, IconAlert, IconChat } from '@/components/icons';

const STATUS_ORDER = ['Identified', 'Invited', 'Responded', 'Confirmed', 'Declined'];

export default async function SpeakersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireCan('speakers:view');
  const { status } = await searchParams;

  const scope = scopeOf(user, 'speakers:view');
  const where: any =
    scope === 'all'
      ? {}
      : scope === 'workstream'
        ? { OR: [{ workstreamId: { in: workstreamIds(user) } }, { ownerId: user.id }] }
        : { id: '__denied__' };
  if (status) where.status = status;

  const rows = await db.speaker.findMany({
    where,
    orderBy: [{ confirmed: 'desc' }, { priority: 'asc' }, { name: 'asc' }],
    include: { owner: true },
  });

  // Contact details are removed from the payload here — not hidden in the UI.
  const speakers = redactMany(user, rows as any[], SPEAKER_GATES as any);

  const all = await db.speaker.findMany({ where: scope === 'all' ? {} : where, select: { status: true, confirmed: true, prepCallNeeded: true, bio: true, headshot: true } });
  const invited = all.filter((s) => s.status !== 'Identified').length;
  const confirmed = all.filter((s) => s.confirmed).length;
  const followUp = all.filter((s) => s.status === 'Responded' || s.prepCallNeeded).length;
  const bioMissing = all.filter((s) => s.confirmed && (!s.bio || !s.headshot)).length;

  const canSeeContact = scopeOf(user, 'speakers:contact') !== 'none';

  return (
    <div className="mx-auto max-w-[1340px]">
      <PageHeader
        title="Speakers"
        subtitle="The outreach pipeline from the 2026 tracker — with the summary computed, not typed."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile value={all.length} label="Speaker targets" tone="navy" icon={<IconSpeaker size={17} />} />
        <StatTile value={invited} label="Invitations sent" tone="brand" icon={<IconChat size={17} />} />
        <StatTile value={confirmed} label="Confirmed" tone="ok" icon={<IconCheck size={17} />} />
        <StatTile value={followUp} label="Need a follow-up" tone="warn" icon={<IconRetro size={17} />} />
      </div>

      {bioMissing > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-card border border-brass/30 bg-brass/5 px-5 py-3.5">
          <IconAlert size={18} className="mt-0.5 shrink-0 text-brass" />
          <p className="text-[13.5px] text-ink">
            <strong className="font-semibold">{bioMissing} confirmed {bioMissing === 1 ? 'speaker is' : 'speakers are'} missing a bio or headshot.</strong>{' '}
            The programme book deadline is what bites, not the invitation.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/speakers"
          className={
            !status
              ? 'rounded-lg bg-navy px-3 py-1.5 text-[13px] font-semibold text-white'
              : 'rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink-muted hover:text-ink'
          }
        >
          All
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={`/speakers?status=${s}`}
            className={
              status === s
                ? 'rounded-lg bg-navy px-3 py-1.5 text-[13px] font-semibold text-white'
                : 'rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink-muted hover:text-ink'
            }
          >
            {s}
          </Link>
        ))}
      </div>

      {speakers.length === 0 ? (
        <Empty title="No speakers in this view" />
      ) : (
        <Card bodyClass="p-0 overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-line bg-paper">
              <tr>
                <th className="th">Speaker</th>
                <th className="th">Type</th>
                <th className="th">Session fit</th>
                <th className="th">Owner</th>
                {canSeeContact && <th className="th">Contact</th>}
                <th className="th">Ready</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {speakers.map((s: any) => (
                <tr key={s.id} className="hover:bg-paper">
                  <td className="td">
                    <Link href={`/speakers/${s.id}`} className="font-medium text-ink hover:text-brand">
                      {s.name}
                    </Link>
                    <div className="text-[12px] leading-snug text-ink-faint">
                      {s.title}
                      {s.company ? ` · ${s.company}` : ''}
                    </div>
                  </td>
                  <td className="td">
                    <Pill tone={s.speakerType === 'Keynote' ? 'brand' : 'neutral'}>{s.speakerType}</Pill>
                  </td>
                  <td className="td max-w-[260px]">
                    <span className="line-clamp-2 text-[13px] text-ink-muted">{s.topicFit ?? '—'}</span>
                  </td>
                  <td className="td">
                    {s.owner && (
                      <span className="flex items-center gap-2">
                        <Avatar name={s.owner.name} accent={s.owner.accent} size={22} />
                        <span className="text-[13px]">{s.owner.name}</span>
                      </span>
                    )}
                  </td>
                  {canSeeContact && (
                    <td className="td text-[12.5px] text-ink-muted">{s.email ?? '—'}</td>
                  )}
                  <td className="td">
                    <span className="flex gap-1.5">
                      <Pill tone={s.bio ? 'ok' : 'neutral'}>Bio</Pill>
                      <Pill tone={s.headshot ? 'ok' : 'neutral'}>Photo</Pill>
                      {s.prepCallNeeded && <Pill tone="warn">Prep call</Pill>}
                    </span>
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

      {!canSeeContact && (
        <p className="mt-4 text-[12.5px] text-ink-faint">
          Speaker emails and phone numbers are not part of your access. They are removed from the data before
          it reaches this page, not hidden on screen.
        </p>
      )}
    </div>
  );
}
