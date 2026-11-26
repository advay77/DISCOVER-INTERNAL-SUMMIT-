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
import { CallButton } from '@/components/CallButton';
import { callRoomFor } from '@/lib/realtime';
import { relativeTime } from '@/lib/format';

export default async function ChannelPage({ params }: { params: Promise<{ key: string }> }) {
  const user = await requireCan('chat:use');
  const { key } = await params;

  const memberships = await db.channelMember.findMany({
    where: { userId: user.id },
    include: { channel: { include: { workstream: true } } },
  });

  const channel = memberships.find((m) => m.channel.key === key)?.channel;
  if (!channel) notFound();

  const [unreadMap, members, memberCount, lastMessages] = await Promise.all([
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
    // The latest message per conversation, for the previews in the rail.
    Promise.all(
      memberships.map((m) =>
        db.message.findFirst({
          where: { channelId: m.channelId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { body: true, createdAt: true, author: { select: { id: true, name: true } }, _count: { select: { files: true } } },
        }),
      ),
    ),
  ]);
  const preview: Record<string, { text: string; at: Date } | undefined> = {};
  memberships.forEach((m, i) => {
    const last = lastMessages[i];
    if (!last) return;
    const who = last.author.id === user.id ? 'You' : last.author.name.split(' ')[0];
    const body = last.body.replace(/\s+/g, ' ').trim() || (last._count.files ? 'sent a file' : '');
    preview[m.channelId] = { text: `${who}: ${body}`, at: last.createdAt };
  });
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
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-3 lg:grid-cols-[288px_minmax(0,1fr)] lg:grid-rows-1 lg:gap-4">
        {/* Rail */}
        <aside className="card hidden min-h-0 flex-col overflow-hidden lg:flex">
          <div className="px-4 pb-2 pt-4">
            <p className="text-[17px] font-semibold text-ink">Messages</p>
            <p className="text-[12px] text-ink-faint">{memberships.length} conversations</p>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3">
            {groups.map((g) =>
              g.list.length === 0 && !g.addable ? null : (
                <div key={g.title} className="mb-4">
                  <div className="mb-1 flex items-center justify-between pl-2 pr-1">
                    <p className="text-[11.5px] font-medium text-ink-faint">{g.title}</p>
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
                          'flex items-start gap-2.5 rounded-2xl px-2.5 py-2 transition',
                          active ? 'bg-navy text-white' : 'hover:bg-panel',
                        )}
                      >
                        <span
                          className={clsx(
                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            active ? 'bg-white/15' : 'bg-panel',
                          )}
                          style={!active && m.channel.workstream ? { boxShadow: `inset 0 0 0 2px ${m.channel.workstream.color}` } : undefined}
                        >
                          <Icon size={13} className={active ? 'opacity-80' : 'text-ink-muted'} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={clsx('truncate text-[13.5px]', active || n > 0 ? 'font-semibold' : 'font-medium', !active && 'text-ink')}>
                              {m.channel.name}
                            </span>
                            {preview[m.channelId] && (
                              <span className={clsx('shrink-0 text-[10.5px]', active ? 'text-white/60' : 'text-ink-faint')}>
                                {relativeTime(preview[m.channelId]!.at)}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span className={clsx('truncate text-[12px]', active ? 'text-white/70' : n > 0 ? 'text-ink' : 'text-ink-faint')}>
                              {preview[m.channelId]?.text ?? 'No messages yet'}
                            </span>
                            {n > 0 && !active && (
                              <span className="min-w-[18px] shrink-0 rounded-full bg-lime px-1.5 text-center text-[10.5px] font-bold text-lime-ink">
                                {n}
                              </span>
                            )}
                          </span>
                        </span>
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
          <header className="flex items-center justify-end gap-x-3 gap-y-2 border-b border-line px-4 py-2 sm:px-5 lg:justify-between lg:py-3">
            {/* On phones the channel switcher above already names the channel. */}
            <div className="hidden min-w-0 lg:block">
              <h1 className="flex items-center gap-2 text-[17px] font-semibold text-ink">
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

            <div className="flex items-center gap-2 sm:gap-3">
              <CallButton channelId={channel.id} url={callRoomFor({ channelId: channel.id })} />
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
            canModerate={canManage}
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
