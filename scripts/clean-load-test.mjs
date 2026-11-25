// Removes what a live test leaves behind: test messages, and test files from
// both the database and Supabase Storage.
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
const db = new PrismaClient();

const isTestFile = { OR: [{ name: { startsWith: 'size-test-' } }, { name: { startsWith: 'live-' } }] };

const files = await db.fileAsset.findMany({ where: isTestFile });
const remote = files.filter((f) => f.backend === 'supabase').map((f) => f.path);

if (remote.length && process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await sb.storage.from('discover-files').remove(remote);
  console.log(error ? `✗ storage: ${error.message}` : `removed ${remote.length} objects from storage`);
}

// Also catch pending uploads that were never confirmed.
const stale = await db.fileAsset.deleteMany({ where: { status: 'pending' } });
const gone = await db.fileAsset.deleteMany({ where: isTestFile });
const msgs = await db.message.deleteMany({
  where: { OR: [{ body: { startsWith: 'Load test burst' } }, { body: { startsWith: 'Live test:' } }] },
});
await db.rateCounter.deleteMany();
await db.activityLog.deleteMany();

console.log(`removed ${msgs.count} test messages, ${gone.count} test files, ${stale.count} unconfirmed uploads`);
console.log(`left: ${await db.message.count()} messages, ${await db.fileAsset.count()} files`);
await db.$disconnect();
