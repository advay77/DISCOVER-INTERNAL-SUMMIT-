// Confirms uploaded files cannot be reached without going through the app:
// the bucket's public URL must refuse, and the app must refuse a signed-out
// request. Reads one real file path from the database.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const file = await db.fileAsset.findFirst({ where: { backend: 'supabase', status: 'ready' } });
if (!file) {
  console.log('no Supabase-backed file to test with');
  process.exit(1);
}

const ref = new URL(process.env.SUPABASE_URL).host;
const publicUrl = `https://${ref}/storage/v1/object/public/discover-files/${file.path}`;
const pub = await fetch(publicUrl);
console.log(`public bucket URL      → HTTP ${pub.status} ${pub.ok ? '✗ OPEN TO ANYONE' : '✓ refused'}`);

const app = await fetch(`https://discover-os-chi.vercel.app/api/files/${file.id}`, { redirect: 'manual' });
console.log(`app, signed out        → HTTP ${app.status} ${app.status === 401 ? '✓ refused' : '✗ unexpected'}`);

await db.$disconnect();
process.exit(!pub.ok && app.status === 401 ? 0 : 1);
