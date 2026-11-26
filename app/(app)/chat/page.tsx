import { redirect } from 'next/navigation';
import { requireCan, can } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Empty } from '@/components/ui';
import { NewChannel } from '@/components/ChannelAdmin';

export default async function ChatIndex() {
  const user = await requireCan('chat:use');
  const first = await db.channelMember.findFirst({
    where: { userId: user.id },
    include: { channel: true },
    orderBy: { channel: { createdAt: 'asc' } },
  });
  if (first) redirect(`/chat/${first.channel.key}`);

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader
        title="Messages"
        subtitle="No conversations yet."
        action={<NewChannel canCreate={can(user, 'chat:channel.create')} variant="button" />}
      />
      <Empty
        title="Nothing here"
        hint="Channels and their messages are clear. A new channel shows up here once someone starts one."
      />
    </div>
  );
}
