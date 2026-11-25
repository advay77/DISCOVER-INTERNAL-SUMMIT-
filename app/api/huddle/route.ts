import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';

/**
 * The voice huddle attached to a channel.
 *
 * Presence lives in CallParticipant; a participant whose heartbeat is older
 * than 12 seconds has dropped off. WebRTC signalling rides through CallSignal
 * rows, consumed once delivered — no socket server needed for V1.
 */

const STALE_MS = 12_000;

async function assertMember(userId: string, channelId: string) {
  return db.channelMember.findUnique({ where: { channelId_userId: { channelId, userId } } });
}

async function sweep(channelId: string) {
  await db.callParticipant.deleteMany({
    where: { channelId, heartbeat: { lt: new Date(Date.now() - STALE_MS) } },
  });
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const channelId = new URL(req.url).searchParams.get('channelId');
  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 });
  if (!(await assertMember(user.id, channelId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await sweep(channelId);

  const participants = await db.callParticipant.findMany({
    where: { channelId },
    include: { user: { select: { id: true, name: true, accent: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  // Deliver and consume any signals addressed to this person.
  const signals = await db.callSignal.findMany({
    where: { channelId, toId: user.id },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  if (signals.length) {
    await db.callSignal.deleteMany({ where: { id: { in: signals.map((s) => s.id) } } });
  }

  return NextResponse.json({
    participants: participants.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      accent: p.user.accent,
      muted: p.muted,
      joinedAt: p.joinedAt,
    })),
    signals: signals.map((s) => ({ from: s.fromId, kind: s.kind, payload: s.payload })),
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'chat:use')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { action, channelId, muted, to, kind, payload } = await req.json();
  if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 });
  if (!(await assertMember(user.id, String(channelId)))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (action === 'join') {
    await db.callParticipant.upsert({
      where: { channelId_userId: { channelId, userId: user.id } },
      create: { channelId, userId: user.id },
      update: { heartbeat: new Date(), muted: false },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'heartbeat') {
    await db.callParticipant.updateMany({
      where: { channelId, userId: user.id },
      data: { heartbeat: new Date(), ...(typeof muted === 'boolean' ? { muted } : {}) },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'leave') {
    await db.callParticipant.deleteMany({ where: { channelId, userId: user.id } });
    await db.callSignal.deleteMany({
      where: { channelId, OR: [{ fromId: user.id }, { toId: user.id }] },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'signal') {
    if (!to || !kind) return NextResponse.json({ error: 'bad signal' }, { status: 400 });
    await db.callSignal.create({
      data: {
        channelId,
        fromId: user.id,
        toId: String(to),
        kind: String(kind),
        payload: String(payload ?? ''),
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
