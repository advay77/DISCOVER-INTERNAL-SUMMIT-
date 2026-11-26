import Link from 'next/link';
import { requireCan, scopeOf, scopeFilter, restrictionFilter, redactMany, SPEAKER_GATES } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, Pill, StatusPill, Avatar, StatTile, Empty } from '@/components/ui';
import { IconSpeaker, IconCheck, IconRetro, IconAlert, IconChat } from '@/components/icons';

const STATUS_ORDER = ['Identified', 'Invited', 'Responded', 'Confirmed', 'Declined'];
const STATUS_ACCENT: Record<string, string> = {
  Identified: '#8F8F89',
  Invited: '#1F5FA8',
  Responded: '#B4761F',
  Confirmed: '#1E7A4B',
  Declined: '#A62B2B',
};

export default async function SpeakersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireCan('speakers:view');
  const { status } = await searchParams;

  const scope = scopeOf(user, 'speakers:view');
  const where: any = scopeFilter(user, 'speakers:view');
  if (status) where.status = status;

  // Summary tiles count the whole pipeline. A status chip narrows the table
  // only, so those two reads run together when they are not the same set.
  const statsAreWholeTable = scope === 'all' && (!!status || !!restrictionFilter(user));
  const [rows, statRows] = await Promise.all([
    db.speaker.findMany({
      where,
      orderBy: [{ confirmed: 'desc' }, { priority: 'asc' }, { name: 'asc' }],
      include: { owner: { select: { id: true, name: true, accent: true } } },
    }),
    statsAreWholeTable
      ? db.speaker.findMany({
          select: { status: true, confirmed: true, prepCallNeeded: true, bio: true, headshot: true },
        })
      : Promise.resolve(null),
  ]);

  // Contact details are removed from the payload here — not hidden in the UI.
  const speakers = redactMany(user, rows as any[], SPEAKER_GATES as any);

  const all = statRows ?? rows;
  const invited = all.filter((s) => s.status !== 'Identified').length;
  const confirmed = all.filter((s) => s.confirmed).length;
  const followUp = all.filter((s) => s.status === 'Responded' || s.prepCallNeeded).length;
  const bioMissing = all.filter((s) => s.confirmed && (!s.bio || !s.headshot)).length;

  const canSeeContact = scopeOf(user, 'speakers:contact') !== 'none';

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Speakers"
        subtitle="The outreach pipeline from the 2026 tracker — with the summary computed, not typed."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile value={all.length} label="Speaker targets" tone="navy" icon={<IconSpeaker size={17} />} />
        <StatTile value={invited} label="Invitations sent" tone="brand" icon={<IconChat size={17} />} />
        <StatTile value={confirmed} label="Confirmed" tone="ok" icon={<IconCheck size={17} />} />
        <StatTile value={followUp} label="Need a follow-up" tone="warn" icon={<IconRetro size={17} />} />
      </div>

      {bioMissing > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-brass-100 px-5 py-3.5">
          <IconAlert size={18} className="mt-0.5 shrink-0 text-brass" />
          <p className="text-[13.5px] text-ink">
            <strong className="font-semibold">{bioMissing} confirmed {bioMissing === 1 ? 'speaker is' : 'speakers are'} missing a bio or headshot.</strong>{' '}
            The programme book deadline is what bites, not the invitation.
          </p>
        </div>
      )}

      <div className="chip-row mb-4 flex flex-wrap gap-2">
        <Link prefetch={false}
          href="/speakers"
          className={
            !status
              ? 'rounded-full bg-navy px-3.5 py-1.5 text-[13px] font-semibold text-white'
              : 'rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink-muted shadow-card hover:text-ink'
          }
        >
          All
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link prefetch={false}
            key={s}
            href={`/speakers?status=${s}`}
            className={
              status === s
                ? 'rounded-full bg-navy px-3.5 py-1.5 text-[13px] font-semibold text-white'
                : 'rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink-muted shadow-card hover:text-ink'
            }
          >
            {s}
          </Link>
        ))}
      </div>

      {speakers.length === 0 ? (
        <Empty title="No speakers in this view" />
      ) : (
        <>
        {/* One card per speaker: two up on tablets, three on desktop. */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {speakers.map((s: any) => (
            <Link prefetch={false}
              key={s.id}
              href={`/speakers/${s.id}`}
              className="card group flex flex-col p-4 transition hover:shadow-[0_6px_20px_rgba(20,20,20,0.08)]"
            >
              <div className="flex items-start gap-3">
                <Avatar name={s.name} accent={STATUS_ACCENT[s.status] ?? '#8F8F89'} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-snug text-ink group-hover:underline">{s.name}</p>
                  <p className="line-clamp-2 text-[12.5px] leading-snug text-ink-muted">
                    {s.title}
                    {s.company ? ` · ${s.company}` : ''}
                  </p>
                </div>
                <StatusPill status={s.status} />
              </div>

              <div className="subcard mt-3 flex-1 px-3.5 py-2.5">
                <p className="text-[11.5px] font-medium text-ink-faint">Session fit</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink">{s.topicFit ?? 'Not placed yet'}</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Pill tone={s.speakerType === 'Keynote' ? 'accent' : 'neutral'} dot={s.speakerType !== 'Keynote'}>
                  {s.speakerType}
                </Pill>
                <Pill tone={s.bio ? 'ok' : 'neutral'}>Bio</Pill>
                <Pill tone={s.headshot ? 'ok' : 'neutral'}>Photo</Pill>
                {s.prepCallNeeded && <Pill tone="warn">Prep call</Pill>}
                {s.priority && <Pill tone="navy" dot={false}>Priority {s.priority}</Pill>}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px]">
                {s.owner ? (
                  <span className="flex min-w-0 items-center gap-1.5 text-ink-muted">
                    <Avatar name={s.owner.name} accent={s.owner.accent} size={20} />
                    <span className="truncate">via {s.owner.name}</span>
                  </span>
                ) : (
                  <span className="text-ink-faint">No owner</span>
                )}
                {canSeeContact && <span className="truncate text-ink-faint">{s.email ?? 'No email'}</span>}
              </div>
            </Link>
          ))}
        </div>
        </>
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
