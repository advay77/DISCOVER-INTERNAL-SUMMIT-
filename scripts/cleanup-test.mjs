// Clears anything created while verifying by hand.
import { PrismaClient } from '@prisma/client';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

const db = new PrismaClient();

const msgs = await db.message.findMany({ include: { files: true } });
let files = 0;
for (const m of msgs) {
  for (const f of m.files) {
    await unlink(path.join(process.cwd(), 'storage', f.path)).catch(() => {});
    files++;
  }
}
await db.reaction.deleteMany();
await db.fileAsset.deleteMany();
await db.message.deleteMany();

// channels that are not part of the seeded set
const KEEP = ['general','speakers','volunteers','random','board','finance','summit','partnerships','comms','academic','professional-dev'];
const extra = await db.channel.findMany({ where: { key: { notIn: KEEP } } });
for (const c of extra) {
  await db.channelMember.deleteMany({ where: { channelId: c.id } });
  await db.channel.delete({ where: { id: c.id } });
}

await db.activityLog.deleteMany();
await db.auditLog.deleteMany();

console.log(`cleared ${msgs.length} messages, ${files} files, ${extra.length} test channels`);
await db.$disconnect();
