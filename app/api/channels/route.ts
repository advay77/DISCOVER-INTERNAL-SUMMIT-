import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { rateLimit, LIMITS as RATE } from '@/lib/ratelimit';
import { text, idList, oneOf, STATUSES, LIMITS as BOUND } from '@/lib/validate';

function slug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Channels the signed-in person could still join (public ones they are not in). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const mine = await db.channelMember.findMany({ where: { userId: user.id }, select: { channelId: true } });
  const joinable = await db.channel.findMany({
    where: { type: 'public', id: { notIn: mine.map((m) => m.channelId) } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    channels: joinable.map((c) => ({ id: c.id, key: c.key, name: c.name, purpose: c.purpose })),
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'chat:channel.create')) {
    return NextResponse.json({ error: 'Your role cannot create channels.' }, { status: 403 });
  }

  const limited = await rateLimit(`chan:${user.id}`, RATE.channel.limit, RATE.channel.windowMs);
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many channels at once.' }, { status: 429 });
  }

  const payload = await req.json().catch(() => ({}));
  const { name, purpose, type, memberIds } = payload;
  const clean = text(name, BOUND.channelName);
  if (clean.length < 2) return NextResponse.json({ error: 'Give the channel a name.' }, { status: 400 });

  const key = slug(clean);
  if (!key) return NextResponse.json({ error: 'That name has no usable letters.' }, { status: 400 });

  const clash = await db.channel.findUnique({ where: { key } });
  if (clash) return NextResponse.json({ error: `#${key} already exists.` }, { status: 409 });

  const kind = oneOf(type, STATUSES.channel, 'public');

  const channel = await db.channel.create({
    data: {
      key,
      name: key,
      purpose: text(purpose, BOUND.purpose) || null,
      type: kind,
    },
  });

  // The creator is always in it; everyone picked joins too.
  const picked = idList(memberIds, 60);
  const ids = Array.from(new Set([user.id, ...picked]));
  const valid = await db.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } });

  await db.channelMember.createMany({
    data: valid.map((v) => ({ channelId: channel.id, userId: v.id })),
  });

  await db.activityLog.create({
    data: {
      actorId: user.id,
      verb: 'created',
      entityType: 'channel',
      entityId: channel.id,
      summary: `#${channel.name} with ${valid.length} ${valid.length === 1 ? 'member' : 'members'}`,
    },
  });

  return NextResponse.json({ channel: { id: channel.id, key: channel.key, name: channel.name } });
}
