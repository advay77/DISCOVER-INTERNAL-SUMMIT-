import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const audit = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
const vol = await db.role.findUnique({
  where: { key: 'volunteer' },
  include: { permissions: { where: { capability: 'speakers:view' } } },
});
const tasks = await db.task.count();
const msgs = await db.message.count();
console.log(
  JSON.stringify(
    { auditCount: audit.length, audit, volunteerSpeakersView: vol?.permissions, tasks, msgs },
    null,
    1,
  ),
);
await db.$disconnect();
