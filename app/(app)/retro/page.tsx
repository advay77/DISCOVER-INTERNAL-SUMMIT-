import { requireCan, can, visibleWorkstreams } from '@/lib/authz';
import { db } from '@/lib/db';
import { currentEvent } from '@/lib/event';
import { PageHeader, Avatar, Empty, StatTile } from '@/components/ui';
import { relativeTime } from '@/lib/format';
import { RetroForm } from './RetroForm';
import { WorkstreamPicker } from './WorkstreamPicker';

const COLUMNS = [
  { kind: 'plus', title: 'Plus', hint: 'Worked well — keep it', tint: 'bg-forest-100', dot: 'bg-forest', tone: 'ok' as const },
  { kind: 'delta', title: 'Delta', hint: 'Can be improved', tint: 'bg-brass-100', dot: 'bg-brass', tone: 'warn' as const },
  { kind: 'consider', title: 'Consider next year', hint: 'New ideas for the next cycle', tint: 'bg-brand-100', dot: 'bg-brand', tone: 'brand' as const },
];

export default async function RetroPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const user = await requireCan('retro:view');
  const { ws: wsKey } = await searchParams;
  const [event, workstreams] = await Promise.all([
    currentEvent(),
    db.workstream.findMany({ where: visibleWorkstreams(user), orderBy: { order: 'asc' }, select: { id: true, key: true, name: true, color: true } }),
  ]);
  if (!event) return <Empty title="No active cycle" />;
  if (workstreams.length === 0) return <Empty title="No workstreams" />;

  // Annual Summit is the default; notes written before the split belong to it.
  const active = workstreams.find((w) => w.key === wsKey) ?? workstreams.find((w) => w.key === 'summit') ?? workstreams[0];
  const isSummit = active.key === 'summit';

  const items = await db.retroItem.findMany({
    where: { eventId: event.id, OR: isSummit ? [{ workstreamId: active.id }, { workstreamId: null }] : [{ workstreamId: active.id }] },
    orderBy: { createdAt: 'desc' },
    include: { author: true },
  });

  const writable = can(user, 'retro:write');
  const authors = new Set(items.map((i) => i.authorId).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <PageHeader
        title="Retro"
        subtitle="The best artefact DISCOVER produces. Everything here rolls forward into next year's playbook."
        action={<WorkstreamPicker workstreams={workstreams.map(({ key, name, color }) => ({ key, name, color }))} active={active.key} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {COLUMNS.map((c) => (
          <StatTile key={c.kind} value={items.filter((i) => i.kind === c.kind).length} label={c.title} tone={c.tone} hint="notes" />
        ))}
        <StatTile value={authors} label="Voices" tone="navy" hint="people wrote" highlight />
      </div>

      {writable && <RetroForm workstreamId={active.id} workstreamName={active.name} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((c) => {
          const list = items.filter((i) => i.kind === c.kind);
          return (
            <section key={c.kind} className={`rounded-[20px] p-2 ${c.tint}`}>
              <header className="px-2.5 pb-2.5 pt-2">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
                  <span className="truncate">{c.title}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11.5px] font-semibold text-ink-muted shadow-card">{list.length}</span>
                </h2>
                <p className="mt-0.5 pl-[18px] text-[11.5px] text-ink-muted">{c.hint}</p>
              </header>
              <div className="space-y-2">
                {list.map((i) => (
                  <article key={i.id} className="rounded-2xl bg-white p-3.5 shadow-card">
                    <p className="text-[13.5px] leading-relaxed text-ink">{i.text}</p>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      {i.author ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Avatar name={i.author.name} accent={i.author.accent} size={20} />
                          <span className="truncate text-[11.5px] text-ink-muted">{i.author.name}</span>
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="shrink-0 text-[11px] text-ink-faint">{relativeTime(i.createdAt)}</span>
                    </div>
                  </article>
                ))}
                {list.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-line-strong bg-white/50 py-8 text-center text-[12.5px] text-ink-faint">
                    Nothing yet
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-[12.5px] text-ink-faint">
        Volunteers can write here deliberately — they see the day-of reality nobody else does.
      </p>
    </div>
  );
}
