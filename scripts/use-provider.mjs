/**
 * Rewrites the Prisma datasource.
 *   node scripts/use-provider.mjs postgresql
 *
 * Prisma will not take env() in `provider`, so the line is swapped instead.
 *
 * Supabase (and other poolers) also need a direct connection for schema
 * pushes: the pooled URL goes in DATABASE_URL, the direct one in DIRECT_URL.
 * When DIRECT_URL is set, a matching `directUrl` line is added here; when it
 * is not, the line is removed so Prisma does not complain about a missing
 * variable.
 */
import { readFile, writeFile } from 'node:fs/promises';

const target = process.argv[2];
if (!['sqlite', 'postgresql'].includes(target)) {
  console.error('Usage: node scripts/use-provider.mjs <sqlite|postgresql>');
  process.exit(1);
}

const path = 'prisma/schema.prisma';
let schema = await readFile(path, 'utf8');

schema = schema.replace(/provider = "(sqlite|postgresql)"\n  url/, `provider = "${target}"\n  url`);

// Drop any existing directUrl line, then add it back if it is wanted.
schema = schema.replace(/\n\s*directUrl = env\("DIRECT_URL"\)/g, '');

const wantsDirect = target === 'postgresql' && !!process.env.DIRECT_URL;
if (wantsDirect) {
  schema = schema.replace(
    /(url      = env\("DATABASE_URL"\))/,
    '$1\n  directUrl = env("DIRECT_URL")',
  );
}

await writeFile(path, schema, 'utf8');
console.log(
  `provider set to ${target}${wantsDirect ? ' with directUrl' : target === 'postgresql' ? ' (no DIRECT_URL set)' : ''}`,
);
