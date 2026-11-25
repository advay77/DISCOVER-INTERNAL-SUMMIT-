// Clears artifacts created while verifying by hand, back to seed state.
import { PrismaClient } from '@prisma/client';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

const db = new PrismaClient();

const msgs = await db.message.findMany({
  where: { OR: [{ body: { contains: 'Floorplan draft for Day 1' } }, { body: { contains: 'Testing the thread' } }] },
  include: { files: true },
});
for (const m of msgs) {
  for (const f of m.files) {
    await unlink(path.join(process.cwd(), 'storage', f.path)).catch(() => {});
    await db.fileAsset.delete({ where: { id: f.id } });
  }
  await db.reaction.deleteMany({ where: { messageId: m.id } });
  await db.message.delete({ where: { id: m.id } });
}

const orphans = await db.fileAsset.findMany({ where: { folder: 'Chat', messageId: null } });
for (const f of orphans) {
  await unlink(path.join(process.cwd(), 'storage', f.path)).catch(() => {});
  await db.fileAsset.delete({ where: { id: f.id } });
}

await db.callParticipant.deleteMany();
await db.callSignal.deleteMany();

console.log(`cleared ${msgs.length} test messages, ${orphans.length} orphan uploads`);
await db.$disconnect();
