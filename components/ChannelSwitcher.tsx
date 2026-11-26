'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { IconHash, IconLock } from './icons';

type Row = { id: string; key: string; name: string; type: string; unread: number };

/**
 * The channel list on phones and tablets, where the rail is hidden.
 * Same information, collapsed into one control.
 */
export function ChannelSwitcher({
  channels,
  currentKey,
  currentName,
  currentType,
}: {
  channels: Row[];
  currentKey: string;
  currentName: string;
  currentType: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const totalUnread = channels.reduce((n, c) => n + (c.key === currentKey ? 0 : c.unread), 0);

  const groups = [
    { title: 'Channels', list: channels.filter((c) => c.type === 'public') },
    { title: 'Workstreams', list: channels.filter((c) => c.type === 'workstream') },
    { title: 'Private', list: channels.filter((c) => c.type === 'private') },
    { title: 'Direct messages', list: channels.filter((c) => c.type === 'dm') },
  ];

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-line-strong bg-white px-3 py-2 text-left"
      >
        {currentType === 'private' ? (
          <IconLock size={14} className="shrink-0 text-ink-faint" />
        ) : (
          <IconHash size={14} className="shrink-0 text-ink-faint" />
        )}
        <span className="flex-1 truncate text-[13.5px] font-semibold text-ink">{currentName}</span>
        {totalUnread > 0 && (
          <span className="rounded-md bg-brick px-1.5 text-[10px] font-bold text-white">
            {totalUnread}
          </span>
        )}
        <span className="text-[10px] text-ink-faint">▾</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-navy/35 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <div className="max-h-[80vh] w-full overflow-y-auto rounded-t-[10px] border border-line bg-white sm:max-w-sm sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-4 py-3">
              <p className="text-[14px] font-semibold text-ink">Conversations</p>
              <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
                ✕
              </button>
            </div>

            <div className="p-2">
              {groups.map((g) =>
                g.list.length === 0 ? null : (
                  <div key={g.title} className="mb-3">
                    <p className="px-2 pb-1 text-2xs font-semibold uppercase tracking-label text-ink-faint">
                      {g.title}
                    </p>
                    {g.list.map((c) => {
                      const active = c.key === currentKey;
                      const Icon = c.type === 'private' ? IconLock : IconHash;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setOpen(false);
                            router.push(`/chat/${c.key}`);
                          }}
                          className={clsx(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13.5px]',
                            active
                              ? 'bg-navy font-semibold text-white'
                              : c.unread > 0
                                ? 'font-semibold text-ink'
                                : 'text-ink-muted',
                          )}
                        >
                          <Icon size={13} className="opacity-60" />
                          <span className="flex-1 truncate">{c.name}</span>
                          {c.unread > 0 && !active && (
                            <span className="rounded-md bg-brick px-1.5 text-[10px] font-bold text-white">
                              {c.unread}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
