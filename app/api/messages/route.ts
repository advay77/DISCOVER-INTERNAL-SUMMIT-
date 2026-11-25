import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { rateLimit, clientKey, LIMITS as RATE } from '@/lib/ratelimit';
import { text, idList, LIMITS as BOUND } from '@/lib/validate';

/**
 * One endpoint serves channel messages, DMs and every object thread.
 * Channel access is checked against membership; thread access against the
 * capability that governs the parent object.
 */

const THREAD_CAPABILITY: Record<string, string> = {
  task: 'tasks:view',
  speaker: 'speakers:view',
  sponsor: 'sponsors:view',
  vendor: 'vendors:view',
  question: 'questions:view',
  session: 'agenda:view',
  event: 'tasks:view',
};

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const url = new URL(req.url);
  const channelId = url.searchParams.get('channelId');
  const entityType = url.searchParams.get('entityType');
  const entityId = url.searchParams.get('entityId');

  if (channelId) {
    if (!can(user, 'chat:use')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const member = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: user.id } },
    });
    if (!member) return NextResponse.json({ error: 'not a member' }, { status: 403 });

    const messages = await db.message.findMany({
      where: { channelId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        author: { select: { id: true, name: true, accent: true, title: true } },
        files: { select: { id: true, name: true, mime: true, size: true, durationMs: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
    });

    await db.channelMember.update({
      where: { channelId_userId: { channelId, userId: user.id } },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ messages });
  }

  if (entityType && entityId) {
    const capability = THREAD_CAPABILITY[entityType];
    if (!capability || !can(user, capability)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const messages = await db.message.findMany({
      where: { entityType, entityId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        author: { select: { id: true, name: true, accent: true, title: true } },
        files: { select: { id: true, name: true, mime: true, size: true, durationMs: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
    });
    return NextResponse.json({ messages });
  }

  return NextResponse.json({ error: 'channelId or entity required' }, { status: 400 });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'chat:use')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const limited = await rateLimit(`msg:${user.id}`, RATE.message.limit, RATE.message.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'You are posting very fast. Give it a moment.' },
      { status: 429, headers: { 'retry-after': String(limited.retryAfterSeconds) } },
    );
  }

  const payload = await req.json().catch(() => ({}));
  const { channelId, entityType, entityId, body, fileIds } = payload;
  const messageText = text(body, BOUND.body);
  const attachments = idList(fileIds, 10);

  if (!messageText && attachments.length === 0) {
    return NextResponse.json({ error: 'Nothing to send.' }, { status: 400 });
  }

  if (channelId) {
    const member = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: user.id } },
    });
    if (!member) return NextResponse.json({ error: 'not a member' }, { status: 403 });
  } else if (entityType) {
    const capability = THREAD_CAPABILITY[entityType];
    if (!capability || !can(user, capability)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: 'nowhere to post' }, { status: 400 });
  }

  // @mentions → notifications
  const names = Array.from(messageText.matchAll(/@([A-Za-z][\w.-]*)/g)).map((m) => m[1].toLowerCase());
  const mentioned = names.length
    ? await db.user.findMany({
        where: { OR: names.map((n) => ({ name: { startsWith: n } })) },
        select: { id: true },
      })
    : [];

  const message = await db.message.create({
    data: {
      body: messageText,
      authorId: user.id,
      channelId: channelId ?? null,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      mentions: mentioned.map((m) => m.id).join(',') || null,
    },
      include: {
        author: { select: { id: true, name: true, accent: true, title: true } },
        files: { select: { id: true, name: true, mime: true, size: true, durationMs: true } },
        reactions: { select: { emoji: true, userId: true } },
      },
  });

  // Attach uploads the author just made, then re-read so the reply carries them.
  if (attachments.length) {
    await db.fileAsset.updateMany({
      where: { id: { in: attachments }, uploaderId: user.id, messageId: null },
      data: { messageId: message.id },
    });
    message.files = await db.fileAsset.findMany({
      where: { messageId: message.id },
      select: { id: true, name: true, mime: true, size: true, durationMs: true },
    });
  }

  if (mentioned.length) {
    await db.notification.createMany({
      data: mentioned
        .filter((m) => m.id !== user.id)
        .map((m) => ({
          userId: m.id,
          kind: 'mention',
          text: `${user.name} mentioned you`,
          link: channelId ? `/chat` : `/${entityType}s/${entityId}`,
        })),
    });
  }

  if (channelId) {
    await db.channelMember.update({
      where: { channelId_userId: { channelId, userId: user.id } },
      data: { lastReadAt: new Date() },
    });
  }

  return NextResponse.json({ message });
}
