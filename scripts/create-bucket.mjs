// Creates (or corrects) the private Supabase Storage bucket for uploads.
// Runs through the database connection, so it needs no storage API key.
//   node scripts/supabase-env.mjs node scripts/create-bucket.mjs
import { PrismaClient } from '@prisma/client';

const BUCKET = process.env.SUPABASE_BUCKET || 'discover-files';
const LIMIT = 50 * 1024 * 1024; // matches MAX_FILE_BYTES in lib/storage.ts

const db = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });

await db.$executeRawUnsafe(
  `insert into storage.buckets (id, name, public, file_size_limit)
   values ($1, $1, false, $2)
   on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit`,
  BUCKET,
  LIMIT,
);

const [b] = await db.$queryRawUnsafe(
  `select id, public, file_size_limit from storage.buckets where id = $1`,
  BUCKET,
);

console.log(`bucket "${b.id}": ${b.public ? 'PUBLIC — wrong' : 'private'}, limit ${Number(b.file_size_limit) / 1048576} MB per file`);
await db.$disconnect();
process.exit(b.public ? 1 : 0);
