// Opens one connection on each URL and asks Postgres who it is.
// Prints the server version and database name only.
import { PrismaClient } from '@prisma/client';

async function ping(label, url) {
  const db = new PrismaClient({ datasources: { db: { url } } });
  const started = Date.now();
  try {
    const rows = await db.$queryRawUnsafe(
      'select current_database() as db, current_user as role, split_part(version(), \' \', 2) as version',
    );
    const r = rows[0];
    console.log(`✓ ${label}: connected in ${Date.now() - started}ms — Postgres ${r.version}, database "${r.db}", role "${r.role}"`);
    return true;
  } catch (e) {
    const msg = String(e?.message ?? e).split('\n').filter(Boolean).join(' | ');
    console.log(`✗ ${label}: ${msg.replace(/postgres(ql)?:\/\/[^\s]+/g, '<url hidden>')}`);
    return false;
  } finally {
    await db.$disconnect();
  }
}

const a = await ping('pooled  (6543, app traffic)  ', process.env.DATABASE_URL);
const b = await ping('direct  (5432, schema changes)', process.env.DIRECT_URL);
process.exit(a && b ? 0 : 1);
