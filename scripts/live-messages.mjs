// Shows the messages in whatever database DATABASE_URL points at, and with
// --clean removes the ones left by a live test.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const messages = await db.message.findMany({ include: { author: true }, orderBy: { createdAt: 'asc' } });
console.log(`messages in this database: ${messages.length}`);
for (const m of messages) console.log(`   ${m.author.name}: ${m.body}`);

if (process.argv.includes('--clean')) {
  const { count } = await db.message.deleteMany({ where: { body: { startsWith: 'Live test:' } } });
  await db.rateCounter.deleteMany();
  await db.activityLog.deleteMany();
  console.log(`removed ${count} test messages — ${await db.message.count()} left`);
}

await db.$disconnect();
