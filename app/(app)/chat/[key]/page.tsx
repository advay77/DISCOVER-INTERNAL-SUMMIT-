import Link from 'next/link';
import { notFound } from 'next/navigation';
import clsx from 'clsx';
import { requireCan, can } from '@/lib/authz';
import { db } from '@/lib/db';
import { unreadByChannel } from '@/lib/unread';
import { Thread } from '@/components/Thread';
import { Avatar } from '@/components/ui';
import { NewChannel, ChannelMembers } from '@/components/ChannelAdmin';
import { BrowseChannels } from '@/components/BrowseChannels';
import { ChannelSwitcher } from '@/components/ChannelSwitcher';
import { IconHash, IconLock } from '@/components/icons';

export default async function ChannelPage({ params }: { params: Promise<{ key: string }> }) {
  const user = await requireCan('chat:use');
  const { key } = await params;

  const memberships = await db.channelMember.findMany({
    where: { userId: user.id },
    include: { channel: { include: { workstream: true } } },
  });

  const channel = memberships.find((m) => m.channel.key === key)?.channel;
  if (!channel) notFound();

  const [unreadMap, members, memberCount] = await Promise.all([
    unreadByChannel(
      user.id,
      memberships.map((m) => ({ channelId: m.channelId, lastReadAt: m.lastReadAt })),
    ),
    db.channelMember.findMany({
      where: { channelId: channel.id },
      select: { id: true, user: { select: { name: true, accent: true } } },
      orderBy: { user: { name: 'asc' } },
      take: 6,
    }),
    db.channelMember.count({ where: { channelId: channel.id } }),
  ]);
  const unread: Record<string, number> = {};
  for (const [id, n] of unreadMap) unread[id] = n;

  const groups: { title: string; list: typeof memberships; addable?: boolean }[] = [
    { title: 'Channels', list: memberships.filter((m) => m.channel.type === 'public'), addable: true },
    { title: 'Workstreams', list: memberships.filter((m) => m.channel.type === 'workstream') },
    { title: 'Private', list: memberships.filter((m) => m.channel.type === 'private') },
    { title: 'Direct messages', list: memberships.filter((m) => m.channel.type === 'dm') },
  ];

  const canCreate = can(user, 'chat:channel.create');
  const canManage = can(user, 'admin:users');

  return (
    <div className="chat-shell mx-auto flex max-w-[1400px] flex-col">
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-3 lg:grid-cols-[236px_1fr] lg:grid-rows-1 lg:gap-4">
        {/* Rail */}
        <aside className="card hidden min-h-0 flex-col overflow-hidden lg:flex">
          <div className="border-b border-line px-4 py-3">
            <p className="text-[14px] font-semibold text-ink">Messages</p>
            <p className="text-[11.5px] text-ink-faint">{memberships.length} conversations</p>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3">
            {groups.map((g) =>
              g.list.length === 0 && !g.addable ? null : (
                <div key={g.title} className="mb-4">
                  <div className="mb-1 flex items-center justify-between pl-2 pr-1">
                    <p className="text-2xs font-semibold uppercase tracking-label text-ink-faint">
                      {g.title}
                    </p>
                    {g.addable && <NewChannel canCreate={canCreate} />}
                  </div>

                  {g.list.map((m) => {
                    const active = m.channel.key === key;
                    const n = unread[m.channel.id] ?? 0;
                    const Icon = m.channel.type === 'private' ? IconLock : IconHash;
                    return (
                      <Link
                        key={m.channel.id}
                        href={`/chat/${m.channel.key}`}
                        className={clsx(
                          'flex items-center gap-2 rounded-lg px-2 py-[5px] text-[13px] transition',
                          active
                            ? 'bg-navy font-semibold text-white'
                            : n > 0
                              ? 'font-semibold text-ink hover:bg-paper'
                              : 'text-ink-muted hover:bg-paper hover:text-ink',
                        )}
                      >
                        <Icon size={13} className={active ? 'opacity-70' : 'opacity-50'} />
                        <span className="flex-1 truncate">{m.channel.name}</span>
                        {m.channel.workstream && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: m.channel.workstream.color }}
                          />
                        )}
                        {n > 0 && !active && (
                          <span className="rounded-md bg-brick px-1 text-[10px] font-bold text-white">
                            {n}
                          </span>
                        )}
                      </Link>
                    );
                  })}

                  {g.list.length === 0 && g.addable && (
                    <p className="px-2 py-1 text-[11.5px] text-ink-faint">None yet.</p>
                  )}
                </div>
              ),
            )}
          </div>

          <div className="border-t border-line p-2">
            <BrowseChannels />
          </div>
        </aside>

        <ChannelSwitcher
          currentKey={key}
          currentName={channel.name}
          currentType={channel.type}
          channels={memberships.map((m) => ({
            id: m.channel.id,
            key: m.channel.key,
            name: m.channel.name,
            type: m.channel.type,
            unread: unread[m.channel.id] ?? 0,
          }))}
        />

        {/* Conversation */}
        <section className="card flex min-h-0 flex-col overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-2.5 sm:px-5 sm:py-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
                {channel.type === 'private' ? (
                  <IconLock size={15} className="text-ink-faint" />
                ) : (
                  <IconHash size={15} className="text-ink-faint" />
                )}
                {channel.name}
                {channel.workstream && (
                  <span
                    className="ml-1 h-2 w-2 rounded-full"
                    style={{ background: channel.workstream.color }}
                    title={channel.workstream.name}
                  />
                )}
              </h1>
              {channel.purpose && (
                <p className="truncate text-[12.5px] text-ink-muted">{channel.purpose}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden -space-x-1.5 sm:flex">
                {members.map((m) => (
                  <Avatar key={m.id} name={m.user.name} accent={m.user.accent} size={24} ring />
                ))}
              </div>
              <ChannelMembers
                channelId={channel.id}
                channelName={channel.name}
                memberCount={memberCount}
                canManage={canManage && channel.type !== 'workstream'}
              />
            </div>
          </header>

          <Thread
            channelId={channel.id}
            meId={user.id}
            meName={user.name}
            meAccent={user.accent}
            placeholder={`Message #${channel.name}`}
            emptyHint={
              channel.purpose
                ? `${channel.purpose} Nothing posted here yet.`
                : 'Nothing posted here yet.'
            }
          />
        </section>
      </div>
    </div>
  );
}
