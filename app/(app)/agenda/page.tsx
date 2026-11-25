import { requireCan, can } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, Pill, Avatar, Empty } from '@/components/ui';
import { dateRange } from '@/lib/format';

const KIND_TONE: Record<string, string> = {
  keynote: 'brand',
  panel: 'navy',
  gala: 'warn',
  break: 'neutral',
  meal: 'neutral',
  session: 'neutral',
};

export default async function AgendaPage() {
  const user = await requireCan('agenda:view');
  const event = await db.event.findFirst({ where: { isCurrent: true } });
  if (!event) return <Empty title="No active cycle" />;

  const sessions = await db.session.findMany({
    where: { eventId: event.id },
    orderBy: [{ day: 'asc' }, { order: 'asc' }],
    include: { owner: true, moderator: true, speakers: { include: { speaker: true } } },
  });

  const days = [
    { n: 1, theme: event.dayOneTheme, list: sessions.filter((s) => s.day === 1) },
    { n: 2, theme: event.dayTwoTheme, list: sessions.filter((s) => s.day === 2) },
  ];

  const editable = can(user, 'agenda:edit');

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        title="Run of show"
        subtitle={`${event.name} · ${dateRange(event.startDate, event.endDate)}`}
        action={
          <div className="flex items-center gap-2">
            {!editable && <Pill tone="neutral">Read only</Pill>}
            <a href="/agenda" className="btn-ghost btn-sm print:hidden" onClick={undefined}>
              Print
            </a>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {days.map((d) => (
          <Card
            key={d.n}
            title={
              <span>
                Day {d.n}
                {d.theme && <span className="ml-2 text-[13px] font-normal text-ink-muted">{d.theme}</span>}
              </span>
            }
            bodyClass="p-0"
          >
            <ol className="divide-y divide-line">
              {d.list.map((s) => (
                <li key={s.id} className="flex gap-4 px-5 py-3.5">
                  <div className="w-[96px] shrink-0 pt-0.5">
                    <p className="text-[12.5px] font-semibold text-ink">{s.startTime}</p>
                    <p className="text-[11.5px] text-ink-faint">{s.endTime}</p>
                  </div>

                  <div
                    className="w-0.5 shrink-0 rounded-full"
                    style={{
                      background:
                        s.kind === 'break' || s.kind === 'meal'
                          ? '#E3E8EF'
                          : s.kind === 'keynote'
                            ? '#1D6FE0'
                            : s.kind === 'gala'
                              ? '#D97708'
                              : '#0B2545',
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        s.kind === 'break' || s.kind === 'meal'
                          ? 'text-[13.5px] text-ink-muted'
                          : 'text-[14px] font-semibold leading-snug text-ink'
                      }
                    >
                      {s.title}
                    </p>

                    {s.speakers.length > 0 && (
                      <p className="mt-1 text-[12.5px] text-ink-muted">
                        {s.speakers.map((x) => x.speaker.name).join(', ')}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {s.kind !== 'break' && s.kind !== 'meal' && (
                        <Pill tone={KIND_TONE[s.kind] ?? 'neutral'}>{s.kind}</Pill>
                      )}
                      {s.owner && (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted">
                          <Avatar name={s.owner.name} accent={s.owner.accent} size={18} />
                          owner {s.owner.name}
                        </span>
                      )}
                      {s.moderator && (
                        <span className="text-[12px] text-ink-faint">moderator {s.moderator.name}</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>

      <p className="mt-5 text-[12.5px] text-ink-faint">
        Day-of volunteers see this page in full. It is the one thing everyone on site needs.
      </p>
    </div>
  );
}
