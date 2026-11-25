// Who has posted, and when — authors and times only, never the content.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const rows = await db.message.findMany({
  select: { createdAt: true, author: { select: { name: true } }, channel: { select: { name: true } } },
  orderBy: { createdAt: 'asc' },
});
for (const r of rows) console.log(`${r.createdAt.toISOString().slice(0, 16)}  ${r.author.name}  #${r.channel?.name ?? 'thread'}`);
const files = await db.fileAsset.findMany({ select: { createdAt: true, uploader: { select: { name: true } } } });
for (const f of files) console.log(`${f.createdAt.toISOString().slice(0, 16)}  ${f.uploader?.name}  (file)`);
await db.$disconnect();
