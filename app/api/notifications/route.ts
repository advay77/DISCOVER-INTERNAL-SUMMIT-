import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { id as validId } from '@/lib/validate';

/**
 * The bell. Lists this person's notices and marks them read.
 * It never sends the reader to Messages on its own.
 */

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, kind: true, text: true, link: true, readAt: true, createdAt: true },
    }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return NextResponse.json({ notifications, unread });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const now = new Date();

  if (body?.all === true) {
    await db.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: now },
    });
    return NextResponse.json({ ok: true });
  }

  const noteId = validId(body?.id);
  if (!noteId) return NextResponse.json({ error: 'Not found.' }, { status: 400 });

  await db.notification.updateMany({
    where: { id: noteId, userId: user.id, readAt: null },
    data: { readAt: now },
  });
  return NextResponse.json({ ok: true });
}
