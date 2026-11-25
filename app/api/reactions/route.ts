import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';

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
  }

  const key = { messageId: String(messageId), userId: user.id, emoji: String(emoji).slice(0, 8) };
  const existing = await db.reaction.findUnique({ where: { messageId_userId_emoji: key } });

  if (existing) await db.reaction.delete({ where: { id: existing.id } });
  else await db.reaction.create({ data: key });

  const reactions = await db.reaction.findMany({
    where: { messageId: key.messageId },
    select: { emoji: true, userId: true },
  });

  return NextResponse.json({ reactions });
}
