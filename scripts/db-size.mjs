// How much space the database uses, and how much of that is uploaded files.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const [size] = await db.$queryRawUnsafe(
  `select pg_size_pretty(pg_database_size(current_database())) as total,
          pg_database_size(current_database()) as bytes`,
);
const files = await db.fileAsset.findMany({ select: { size: true } });
const fileBytes = files.reduce((n, f) => n + f.size, 0);

console.log(`database size: ${size.total}`);
console.log(`uploaded files stored in it: ${files.length} (${(fileBytes / 1048576).toFixed(1)} MB)`);
console.log(`Supabase free plan limit: 500 MB — currently ${((Number(size.bytes) / (500 * 1048576)) * 100).toFixed(1)}% used`);
await db.$disconnect();
