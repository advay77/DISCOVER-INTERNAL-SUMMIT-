// Seeds Supabase only when it has no accounts. Never prints passwords.
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

try {
  const users = await db.user.count();
  console.log(`users=${users}`);
  if (users > 0) {
    console.log('already seeded — leaving existing accounts in place');
    process.exit(0);
  }
} catch (err) {
  console.error(String(err?.message ?? err).split('\n')[0]);
  process.exit(1);
} finally {
  await db.$disconnect();
}

const seeded = spawnSync('node', ['--experimental-strip-types', 'prisma/seed.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});
process.exit(seeded.status ?? 1);
