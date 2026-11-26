import 'server-only';
import { db } from './db';

/**
 * Unread messages per channel, in one query.
 * Each membership has its own last-read time, so the filter is one branch per
 * channel. Own messages and deleted messages stay out, matching the old loop.
 */
export async function unreadByChannel(
  userId: string,
  memberships: { channelId: string; lastReadAt: Date }[],
) {
  const counts = new Map<string, number>();
  if (!memberships.length) return counts;

  const grouped = await db.message.groupBy({
    by: ['channelId'],
    where: {
      deletedAt: null,
      authorId: { not: userId },
      OR: memberships.map((m) => ({
        channelId: m.channelId,
        createdAt: { gt: m.lastReadAt },
      })),
    },
    _count: { _all: true },
  });

  for (const row of grouped) {
    if (row.channelId) counts.set(row.channelId, row._count._all);
  }
  return counts;
}

export async function countUnread(userId: string) {
  const memberships = await db.channelMember.findMany({
    where: { userId },
    select: { channelId: true, lastReadAt: true },
  });
  const counts = await unreadByChannel(userId, memberships);
  let total = 0;
  for (const n of counts.values()) total += n;
  return total;
}

/**
 * Whether this poll should move lastReadAt forward.
 * A short history only writes when someone else's message is still unread, so
 * an idle chat does not write every two seconds. A full page keeps the
 * previous behaviour and always marks the channel read.
 */
export function channelNeedsReadReceipt(
  messages: { authorId: string; createdAt: Date }[],
  lastReadAt: Date,
  userId: string,
  pageSize = 200,
) {
  if (messages.length >= pageSize) return true;
  return messages.some((m) => m.authorId !== userId && m.createdAt > lastReadAt);
}
