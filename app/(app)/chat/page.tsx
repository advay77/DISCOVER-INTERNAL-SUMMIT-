import { redirect } from 'next/navigation';
import { requireCan } from '@/lib/authz';
import { db } from '@/lib/db';

export default async function ChatIndex() {
  const user = await requireCan('chat:use');
  const first = await db.channelMember.findFirst({
    where: { userId: user.id },
    include: { channel: true },
    orderBy: { channel: { createdAt: 'asc' } },
  });
  redirect(first ? `/chat/${first.channel.key}` : '/dashboard');
}
