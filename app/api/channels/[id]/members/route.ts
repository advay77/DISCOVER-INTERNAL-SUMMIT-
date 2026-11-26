import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';

type Ctx = { params: Promise<{ id: string }> };

async function load(userId: string, channelId: string) {
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return { error: 'not found' as const, status: 404 };
  const member = await db.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });
  if (!member) return { error: 'forbidden' as const, status: 403 };
  return { channel };
}

/** Who is in this channel, and who could be added. */
export async function GET(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await params;

  const found = await load(user.id, id);
  if ('error' in found) return NextResponse.json({ error: found.error }, { status: found.status });

  const members = await db.channelMember.findMany({
    where: { channelId: id },
    include: { user: { include: { role: true } } },
    orderBy: { user: { name: 'asc' } },
  });
  const memberIds = members.map((m) => m.userId);

  const candidates = await db.user.findMany({
    where: { isActive: true, id: { notIn: memberIds } },
    orderBy: [{ role: { level: 'asc' } }, { name: 'asc' }],
    include: { role: true },
  });

  const shape = (u: any) => ({
    id: u.id,
    name: u.name,
    accent: u.accent,
    role: u.role.name,
    company: u.company ?? '',
  });

  return NextResponse.json({
    channel: { id: found.channel.id, name: found.channel.name, type: found.channel.type, purpose: found.channel.purpose },
    members: members.map((m) => shape(m.user)),
    candidates: candidates.map(shape),
  });
}

/** Add people. Anyone already in a channel can bring others into it. */
export async function POST(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'chat:use')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const found = await load(user.id, id);
  if ('error' in found) return NextResponse.json({ error: found.error }, { status: found.status });

  if (found.channel.type === 'dm') {
    return NextResponse.json({ error: 'A direct message is between two people. Start a channel to include more.' }, { status: 400 });
  }

  const { userIds } = await req.json();
  const ids = Array.isArray(userIds) ? userIds.map(String) : [];
  if (!ids.length) return NextResponse.json({ error: 'Pick at least one person.' }, { status: 400 });

  const valid = await db.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true, name: true } });

  for (const v of valid) {
    await db.channelMember.upsert({
      where: { channelId_userId: { channelId: id, userId: v.id } },
      create: { channelId: id, userId: v.id },
      update: {},
    });
    await db.notification.create({
      data: {
        userId: v.id,
        kind: 'announce',
        text: `${user.name} added you to #${found.channel.name}`,
        link: `/chat/${found.channel.key}`,
      },
    });
  }

  return NextResponse.json({ added: valid.length });
}

/** Remove someone, or leave yourself. */
export async function DELETE(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { id } = await params;
  const found = await load(user.id, id);
  if ('error' in found) return NextResponse.json({ error: found.error }, { status: found.status });

  const { userId } = await req.json();
  const target = String(userId ?? user.id);

  // Removing someone else needs the people permission; leaving never does.
  if (target !== user.id && !can(user, 'admin:users')) {
    return NextResponse.json({ error: 'Only the President or an officer can remove someone.' }, { status: 403 });
  }

  if (found.channel.type === 'dm') {
    return NextResponse.json({ error: 'Direct messages cannot be left or changed.' }, { status: 400 });
  }

  // A workstream channel's membership follows the workstream, not this screen.
  if (found.channel.type === 'workstream') {
    return NextResponse.json(
      { error: 'This channel follows its workstream. Change the workstream in Admin → People.' },
      { status: 400 },
    );
  }

  await db.channelMember.deleteMany({ where: { channelId: id, userId: target } });
  return NextResponse.json({ ok: true });
}
