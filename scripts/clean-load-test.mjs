// Removes what a load test leaves behind in whatever database DATABASE_URL points at.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const msgs = await db.message.deleteMany({
  where: { OR: [{ body: { startsWith: 'Load test burst' } }, { body: { startsWith: 'Live test:' } }] },
});
const files = await db.fileAsset.deleteMany({ where: { name: { startsWith: 'size-test-' } } });
await db.rateCounter.deleteMany();
await db.activityLog.deleteMany();

console.log(`removed ${msgs.count} test messages and ${files.count} test files`);
console.log(`left: ${await db.message.count()} messages, ${await db.fileAsset.count()} files`);
await db.$disconnect();
