import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { rateLimit, LIMITS as RATE } from '@/lib/ratelimit';
import { id as validId } from '@/lib/validate';
import { dmKey } from '@/lib/dm';

/**
 * Open a direct conversation with one person: returns the existing one if the
 * two of them already have it, otherwise creates it. Only the two of them are
 * ever members — nobody can be added, and admins cannot read it.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'chat:use') || !can(user, 'chat:dm')) {
    return NextResponse.json({ error: 'Your role cannot send direct messages.' }, { status: 403 });
  }

  const limited = await rateLimit(`dm:${user.id}`, RATE.message.limit, RATE.message.windowMs);
  if (!limited.ok) return NextResponse.json({ error: 'Slow down a moment.' }, { status: 429 });

  const { userId } = await req.json().catch(() => ({}));
  const otherId = validId(userId);
  if (!otherId) return NextResponse.json({ error: 'Pick someone to message.' }, { status: 400 });
  if (otherId === user.id) return NextResponse.json({ error: 'That is you.' }, { status: 400 });

  const other = await db.user.findUnique({ where: { id: otherId }, select: { id: true, isActive: true } });
  if (!other || !other.isActive) return NextResponse.json({ error: 'That person is not an active member.' }, { status: 404 });

  const key = dmKey(user.id, other.id);
  const channel = await db.channel.upsert({
    where: { key },
    create: { key, name: 'Direct message', type: 'dm' },
    update: {},
  });
  if (channel.type !== 'dm') return NextResponse.json({ error: 'Conversation unavailable.' }, { status: 409 });

  // Both are always members (re-adds anyone who somehow left).
  for (const uid of [user.id, other.id]) {
    await db.channelMember.upsert({
      where: { channelId_userId: { channelId: channel.id, userId: uid } },
      create: { channelId: channel.id, userId: uid },
      update: {},
    });
  }

  return NextResponse.json({ key });
}
