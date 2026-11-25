// Rewrites the Prisma datasource provider.
//   node scripts/use-provider.mjs postgresql
// Prisma does not accept env() in `provider`, so the line is swapped instead.
import { readFile, writeFile } from 'node:fs/promises';

const target = process.argv[2];
if (!['sqlite', 'postgresql'].includes(target)) {
  console.error('Usage: node scripts/use-provider.mjs <sqlite|postgresql>');
  process.exit(1);
}

const path = 'prisma/schema.prisma';
const before = await readFile(path, 'utf8');
const after = before.replace(/provider = "(sqlite|postgresql)"\n  url/, `provider = "${target}"\n  url`);

if (before === after) console.log(`provider already ${target}`);
else {
  await writeFile(path, after, 'utf8');
  console.log(`provider set to ${target}`);
}
