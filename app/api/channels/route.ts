import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';

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

  const { name, purpose, type, memberIds } = await req.json();
  const clean = String(name ?? '').trim();
  if (clean.length < 2) return NextResponse.json({ error: 'Give the channel a name.' }, { status: 400 });

  const key = slug(clean);
  if (!key) return NextResponse.json({ error: 'That name has no usable letters.' }, { status: 400 });

  const clash = await db.channel.findUnique({ where: { key } });
  if (clash) return NextResponse.json({ error: `#${key} already exists.` }, { status: 409 });

  const kind = type === 'private' ? 'private' : 'public';

  const channel = await db.channel.create({
    data: {
      key,
      name: key,
      purpose: String(purpose ?? '').trim() || null,
      type: kind,
    },
  });

  // The creator is always in it; everyone picked joins too.
  const picked = Array.isArray(memberIds) ? memberIds.map(String) : [];
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
