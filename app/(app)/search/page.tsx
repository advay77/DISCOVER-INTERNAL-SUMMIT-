import Link from 'next/link';
import { requireUser, can, scopeOf, workstreamIds } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, Empty, Pill, Avatar } from '@/components/ui';
import { relativeTime } from '@/lib/format';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const term = (q ?? '').trim();

  if (!term) {
    return (
      <div className="mx-auto max-w-[900px]">
        <PageHeader title="Search" subtitle="Tasks, speakers, people and messages — scoped to your access." />
        <Empty title="Type something in the search box above" />
      </div>
    );
  }

  const tscope = scopeOf(user, 'tasks:view');
  const taskWhere: any =
    tscope === 'all'
      ? {}
      : tscope === 'own'
        ? { ownerId: user.id }
        : tscope === 'workstream'
          ? { OR: [{ workstreamId: { in: workstreamIds(user) } }, { ownerId: user.id }] }
          : { id: '__denied__' };

  const [tasks, speakers, people, messages] = await Promise.all([
    can(user, 'tasks:view')
      ? db.task.findMany({ where: { ...taskWhere, title: { contains: term } }, take: 12, include: { owner: true } })
      : [],
    can(user, 'speakers:view')
      ? db.speaker.findMany({
          where: { OR: [{ name: { contains: term } }, { company: { contains: term } }, { topicFit: { contains: term } }] },
          take: 10,
        })
      : [],
    can(user, 'team:view')
      ? db.user.findMany({ where: { name: { contains: term }, isActive: true }, take: 8, include: { role: true } })
      : [],
    can(user, 'chat:use')
      ? db.message.findMany({
          where: {
            body: { contains: term },
            deletedAt: null,
            channel: { members: { some: { userId: user.id } } },
          },
          take: 12,
          orderBy: { createdAt: 'desc' },
          include: { author: true, channel: true },
        })
      : [],
  ]);

  const nothing = !tasks.length && !speakers.length && !people.length && !messages.length;

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <PageHeader title={`Results for “${term}”`} subtitle="Only what your access allows is searched." />

      {nothing && <Empty title="Nothing found" hint="Try a shorter term, or a person's first name." />}

      {tasks.length > 0 && (
        <Card title="Tasks" bodyClass="divide-y divide-line p-0">
          {tasks.map((t) => (
            <Link key={t.id} href={`/tasks/${t.id}`} className="block px-5 py-3 hover:bg-paper">
              <p className="text-[13.5px] font-medium text-ink">{t.title}</p>
              <p className="text-[12px] text-ink-faint">
                {t.category}
                {t.owner ? ` · ${t.owner.name}` : ''}
              </p>
            </Link>
          ))}
        </Card>
      )}

      {speakers.length > 0 && (
        <Card title="Speakers" bodyClass="divide-y divide-line p-0">
          {speakers.map((s) => (
            <Link key={s.id} href={`/speakers/${s.id}`} className="block px-5 py-3 hover:bg-paper">
              <p className="text-[13.5px] font-medium text-ink">{s.name}</p>
              <p className="text-[12px] text-ink-faint">
                {s.title} · {s.company}
              </p>
            </Link>
          ))}
        </Card>
      )}

      {people.length > 0 && (
        <Card title="People" bodyClass="divide-y divide-line p-0">
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={p.name} accent={p.accent} size={28} />
              <div className="flex-1">
                <p className="text-[13.5px] font-medium text-ink">{p.name}</p>
                <p className="text-[12px] text-ink-faint">{p.title}</p>
              </div>
              <Pill tone="brand">{p.role.name}</Pill>
            </div>
          ))}
        </Card>
      )}

      {messages.length > 0 && (
        <Card title="Messages" bodyClass="divide-y divide-line p-0">
          {messages.map((m) => (
            <Link
              key={m.id}
              href={m.channel ? `/chat/${m.channel.key}` : '/chat'}
              className="block px-5 py-3 hover:bg-paper"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-semibold text-ink">{m.author.name}</p>
                <span className="text-[11.5px] text-ink-faint">{relativeTime(m.createdAt)}</span>
              </div>
              <p className="text-[13px] text-ink-muted">{m.body}</p>
              <p className="text-[11.5px] text-ink-faint">#{m.channel?.name}</p>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
