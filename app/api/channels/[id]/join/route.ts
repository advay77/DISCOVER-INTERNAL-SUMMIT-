import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';

/** Join a public channel yourself. Private and workstream channels are not joinable this way. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'chat:use')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const channel = await db.channel.findUnique({ where: { id } });
  if (!channel) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (channel.type !== 'public') {
    return NextResponse.json(
      {
        error:
          channel.type === 'workstream'
            ? 'This channel follows its workstream — ask the President to add you to it.'
            : 'This channel is private. Someone already in it has to add you.',
      },
      { status: 403 },
    );
  }

  await db.channelMember.upsert({
    where: { channelId_userId: { channelId: id, userId: user.id } },
    create: { channelId: id, userId: user.id },
    update: {},
  });

  return NextResponse.json({ ok: true, key: channel.key });
}
