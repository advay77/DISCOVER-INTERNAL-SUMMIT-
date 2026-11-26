import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { ping } from '@/lib/realtime';

/** Toggles one emoji on one message for the signed-in person. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'chat:use')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { messageId, emoji } = await req.json();
  if (!messageId || !emoji) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const message = await db.message.findUnique({ where: { id: String(messageId) } });
  if (!message) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Only react where you can already read.
  if (message.channelId) {
    const member = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId: message.channelId, userId: user.id } },
    });
    if (!member) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  } else if (message.entityType) {
    const cap: Record<string, string> = {
      task: 'tasks:view', speaker: 'speakers:view', sponsor: 'sponsors:view',
      vendor: 'vendors:view', session: 'agenda:view', event: 'tasks:view',
    };
    if (!cap[message.entityType] || !can(user, cap[message.entityType])) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }
  if (message.deletedAt) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const key = { messageId: String(messageId), userId: user.id, emoji: String(emoji).slice(0, 8) };
  const existing = await db.reaction.findUnique({ where: { messageId_userId_emoji: key } });

  if (existing) await db.reaction.delete({ where: { id: existing.id } });
  else await db.reaction.create({ data: key });

  // Lets readers pick the change up through their "changed since" poll.
  await db.message.update({ where: { id: message.id }, data: { updatedAt: new Date() } });
  await ping(
    message.channelId
      ? { channelId: message.channelId }
      : { entityType: message.entityType ?? '', entityId: message.entityId ?? '' },
  );

  const reactions = await db.reaction.findMany({
    where: { messageId: key.messageId },
    select: { emoji: true, userId: true },
  });

  return NextResponse.json({ reactions });
}
