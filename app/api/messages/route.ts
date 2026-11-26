import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { rateLimit, clientKey, LIMITS as RATE } from '@/lib/ratelimit';
import { channelNeedsReadReceipt } from '@/lib/unread';
import { text, idList, id as validId, LIMITS as BOUND } from '@/lib/validate';
import { ping, topicFor, type Scope } from '@/lib/realtime';

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
  session: 'agenda:view',
  event: 'tasks:view',
};

const PAGE = 50;

const INCLUDE = {
  author: { select: { id: true, name: true, accent: true, title: true } },
  files: { select: { id: true, name: true, mime: true, size: true, durationMs: true } },
  reactions: { select: { emoji: true, userId: true } },
  parent: {
    select: { id: true, body: true, deletedAt: true, author: { select: { id: true, name: true } } },
  },
} as const;

type Row = Awaited<ReturnType<typeof db.message.findMany<{ include: typeof INCLUDE }>>>[number];

/** Deleted messages go out as tombstones: no body, no files. */
function shape(m: Row) {
  const deleted = !!m.deletedAt;
  return {
    id: m.id,
    body: deleted ? '' : m.body,
    createdAt: m.createdAt,
    editedAt: m.editedAt,
    deleted,
    author: m.author,
    files: deleted ? [] : m.files,
    reactions: deleted ? [] : m.reactions,
    parent: m.parent
      ? {
          id: m.parent.id,
          author: m.parent.author,
          body: m.parent.deletedAt ? '' : m.parent.body.slice(0, 160),
          deleted: !!m.parent.deletedAt,
        }
      : null,
  };
}

function isoParam(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Who may read this conversation. Returns the Prisma filter, or an error response. */
async function access(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>, params: URLSearchParams) {
  const channelId = params.get('channelId');
  const entityType = params.get('entityType');
  const entityId = params.get('entityId');
  if (channelId) {
    if (!can(user, 'chat:use')) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
    const member = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: user.id } },
    });
    if (!member) return { error: NextResponse.json({ error: 'not a member' }, { status: 403 }) };
    return { where: { channelId }, scope: { channelId } as Scope, member };
  }
  if (entityType && entityId) {
    const capability = THREAD_CAPABILITY[entityType];
    if (!capability || !can(user, capability)) {
      return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
    }
    return { where: { entityType, entityId }, scope: { entityType, entityId } as Scope, member: null };
  }
  return { error: NextResponse.json({ error: 'channelId or entity required' }, { status: 400 }) };
}

/**
 * GET ?channelId= | ?entityType=&entityId=
 *   (nothing)      → the latest 50, oldest first, plus `hasMore`
 *   &before=<iso>  → the 50 before that moment (load older)
 *   &after=<iso>   → everything created, edited, deleted or reacted to since
 * Every answer carries `cursor` (pass back as `after`) and the realtime topic.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const ok = await access(user, params);
  if ('error' in ok) return ok.error;

  // Taken before the query, so nothing that lands during it is skipped.
  const cursor = new Date();
  const after = isoParam(params.get('after'));
  const before = isoParam(params.get('before'));

  let rows: Row[];
  let hasMore = false;
  if (after) {
    // A small overlap covers clock skew between writes; the client de-duplicates.
    rows = await db.message.findMany({
      where: { ...ok.where, updatedAt: { gt: new Date(after.getTime() - 2000) } },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: INCLUDE,
    });
  } else {
    const page = await db.message.findMany({
      where: { ...ok.where, deletedAt: null, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE + 1,
      include: INCLUDE,
    });
    hasMore = page.length > PAGE;
    rows = page.slice(0, PAGE).reverse();
  }

  if (ok.member && channelNeedsReadReceipt(rows, ok.member.lastReadAt, user.id)) {
    await db.channelMember.update({
      where: { channelId_userId: { channelId: ok.where.channelId!, userId: user.id } },
      data: { lastReadAt: new Date() },
    });
  }

  return NextResponse.json({
    messages: rows.map(shape),
    hasMore,
    cursor: cursor.toISOString(),
    topic: topicFor(ok.scope),
  });
}

/** Edit your own message. */
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id, body } = await req.json().catch(() => ({}));
  const message = id ? await db.message.findUnique({ where: { id: String(id) } }) : null;
  if (!message || message.deletedAt) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (message.authorId !== user.id) return NextResponse.json({ error: 'You can only edit your own messages.' }, { status: 403 });
  const next = text(body, BOUND.body);
  if (!next) return NextResponse.json({ error: 'A message cannot be empty. Delete it instead.' }, { status: 400 });

  const updated = await db.message.update({
    where: { id: message.id },
    data: { body: next, editedAt: new Date() },
    include: INCLUDE,
  });
  await ping(scopeOf(message));
  return NextResponse.json({ message: shape(updated) });
}

/** Delete your own message; admins can remove anyone's. Leaves a tombstone. */
export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  const message = id ? await db.message.findUnique({ where: { id } }) : null;
  if (!message || message.deletedAt) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (message.authorId !== user.id && !can(user, 'admin:users')) {
    return NextResponse.json({ error: 'You can only delete your own messages.' }, { status: 403 });
  }
  await db.message.update({ where: { id: message.id }, data: { deletedAt: new Date(), body: '' } });
  await ping(scopeOf(message));
  return NextResponse.json({ ok: true });
}

function scopeOf(m: { channelId: string | null; entityType: string | null; entityId: string | null }): Scope {
  return m.channelId ? { channelId: m.channelId } : { entityType: m.entityType ?? '', entityId: m.entityId ?? '' };
}

function entityLink(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return null;
  if (entityType === 'task') return `/tasks/${entityId}`;
  if (entityType === 'speaker') return `/speakers/${entityId}`;
  if (entityType === 'event') return `/events/${entityId}`;
  if (entityType === 'sponsor') return '/sponsors';
  if (entityType === 'vendor') return '/logistics';
  if (entityType === 'session') return '/agenda';
  return null;
}

async function notificationLink(channelId: string | null, entityType: string | null, entityId: string | null) {
  if (channelId) {
    const channel = await db.channel.findUnique({ where: { id: channelId }, select: { key: true } });
    if (channel) return `/chat/${channel.key}`;
  }
  return entityLink(entityType, entityId);
}

async function entityOwnerId(entityType: string, entityId: string) {
  const query = { where: { id: entityId }, select: { ownerId: true } } as const;
  const row =
    entityType === 'task' ? await db.task.findUnique(query)
    : entityType === 'speaker' ? await db.speaker.findUnique(query)
    : entityType === 'sponsor' ? await db.sponsor.findUnique(query)
    : entityType === 'vendor' ? await db.vendor.findUnique(query)
    : entityType === 'session' ? await db.session.findUnique(query)
    : entityType === 'event' ? await db.event.findUnique(query)
    : null;
  return row?.ownerId ?? null;
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
  const { channelId, entityType, entityId, body, fileIds, parentId } = payload;
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

  // A reply must point at a live message in the same conversation.
  let replyTo: string | null = null;
  const wantedParent = validId(parentId);
  if (wantedParent) {
    const parent = await db.message.findUnique({ where: { id: wantedParent } });
    const same = parent && !parent.deletedAt && (channelId
      ? parent.channelId === channelId
      : parent.entityType === entityType && parent.entityId === entityId);
    if (same) replyTo = parent!.id;
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
      parentId: replyTo,
    },
    include: INCLUDE,
  });

  // Attach uploads the author just made, then re-read so the reply carries them.
  if (attachments.length) {
    await db.fileAsset.updateMany({
      where: { id: { in: attachments }, uploaderId: user.id, messageId: null, status: 'ready' },
      data: { messageId: message.id },
    });
    message.files = await db.fileAsset.findMany({
      where: { messageId: message.id },
      select: { id: true, name: true, mime: true, size: true, durationMs: true },
    });
  }

  const mentionLink = await notificationLink(channelId, entityType, entityId);
  const mentionedIds = new Set(mentioned.filter((m) => m.id !== user.id).map((m) => m.id));
  if (mentionedIds.size) {
    await db.notification.createMany({
      data: Array.from(mentionedIds).map((id) => ({
        userId: id,
        kind: 'mention',
        text: `${user.name} mentioned you`,
        link: mentionLink,
      })),
    });
  }

  if (channelId) {
    const channel = await db.channel.findUnique({
      where: { id: channelId },
      select: { key: true, name: true },
    });
    const members = await db.channelMember.findMany({
      where: { channelId, userId: { not: user.id } },
      select: { userId: true },
    });
    const preview = messageText.replace(/\s+/g, ' ').trim().slice(0, 140);
    const note = preview
      ? `${user.name} in #${channel?.name ?? 'channel'}: ${preview}`
      : `${user.name} sent a file in #${channel?.name ?? 'channel'}`;
    const recipients = members.filter((m) => !mentionedIds.has(m.userId));
    if (recipients.length && channel) {
      await db.notification.createMany({
        data: recipients.map((m) => ({
          userId: m.userId,
          kind: 'message',
          text: note,
          link: `/chat/${channel.key}`,
        })),
      });
    }
  } else if (entityType && entityId) {
    const ownerId = await entityOwnerId(entityType, entityId);
    if (ownerId && ownerId !== user.id && !mentionedIds.has(ownerId)) {
      await db.notification.create({
        data: {
          userId: ownerId,
          kind: 'update',
          text: `${user.name} left an update`,
          link: mentionLink,
        },
      });
    }
  }

  if (channelId) {
    await db.channelMember.update({
      where: { channelId_userId: { channelId, userId: user.id } },
      data: { lastReadAt: new Date() },
    });
  }

  await ping(channelId ? { channelId } : { entityType, entityId });
  return NextResponse.json({ message: shape(message) });
}
