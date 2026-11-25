import { requireCan, can } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, Avatar, Empty } from '@/components/ui';
import { RetroForm } from './RetroForm';

const COLUMNS = [
  { kind: 'plus', title: 'Plus', hint: 'Worked well — keep it', tone: '#17A34A' },
  { kind: 'delta', title: 'Delta', hint: 'Can be improved', tone: '#D97708' },
  { kind: 'consider', title: 'Consider next year', hint: 'New ideas for the next cycle', tone: '#1D6FE0' },
];

export default async function RetroPage() {
  const user = await requireCan('retro:view');
  const event = await db.event.findFirst({ where: { isCurrent: true } });
  if (!event) return <Empty title="No active cycle" />;

  const items = await db.retroItem.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: 'desc' },
    include: { author: true },
  });

  const writable = can(user, 'retro:write');

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Retro"
        subtitle="The best artefact DISCOVER produces. Everything here rolls forward into next year's playbook."
      />

      {writable && <RetroForm />}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {COLUMNS.map((c) => {
          const list = items.filter((i) => i.kind === c.kind);
          return (
            <Card
              key={c.kind}
              title={
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.tone }} />
                  {c.title}
                  <span className="text-[12px] font-normal text-ink-faint">{list.length}</span>
                </span>
              }
              bodyClass="space-y-2.5 p-4"
            >
              <p className="text-[12px] text-ink-faint">{c.hint}</p>
              {list.map((i) => (
                <div key={i.id} className="rounded-lg border border-line p-3">
                  <p className="text-[13.5px] leading-relaxed text-ink">{i.text}</p>
                  {i.author && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Avatar name={i.author.name} accent={i.author.accent} size={18} />
                      <span className="text-[11.5px] text-ink-faint">{i.author.name}</span>
                    </div>
                  )}
                </div>
              ))}
              {list.length === 0 && <p className="py-4 text-center text-[12.5px] text-ink-faint">Nothing yet</p>}
            </Card>
          );
        })}
      </div>

      <p className="mt-5 text-[12.5px] text-ink-faint">
        Volunteers can write here deliberately — they see the day-of reality nobody else does.
      </p>
    </div>
  );
}
