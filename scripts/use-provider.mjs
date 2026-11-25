/**
 * Rewrites the Prisma datasource.
 *   node scripts/use-provider.mjs postgresql
 *
 * Prisma will not take env() in `provider`, so the line is swapped instead.
 *
 * Supabase (and other poolers) need a direct connection for schema pushes: the
 * pooled URL goes in DATABASE_URL, the direct one in DIRECT_URL. When
 * DIRECT_URL is set, a matching `directUrl` line is added; when it is not, the
 * line is removed so Prisma does not complain about a missing variable.
 *
 * Handles both LF and CRLF line endings, and verifies the result — an earlier
 * version matched only LF, reported success on a Windows checkout, and changed
 * nothing.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const target = process.argv[2];
if (!['sqlite', 'postgresql'].includes(target)) {
  console.error('Usage: node scripts/use-provider.mjs <sqlite|postgresql>');
  process.exit(1);
}

const path = 'prisma/schema.prisma';
const original = readFileSync(path, 'utf8');
const eol = original.includes('\r\n') ? '\r\n' : '\n';

// Find the datasource block and work only inside it.
const block = /datasource db \{[\s\S]*?\}/;
const match = original.match(block);
if (!match) {
  console.error('✗ no `datasource db { … }` block found in prisma/schema.prisma');
  process.exit(1);
}

let ds = match[0];

ds = ds.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${target}"`);

// Remove any directUrl line, then add it back only when it is wanted.
ds = ds.replace(/\r?\n[ \t]*directUrl\s*=\s*env\("DIRECT_URL"\)/g, '');
const wantsDirect = target === 'postgresql' && !!process.env.DIRECT_URL;
if (wantsDirect) {
  ds = ds.replace(/(url\s*=\s*env\("DATABASE_URL"\))/, `$1${eol}  directUrl = env("DIRECT_URL")`);
}

const updated = original.replace(block, ds);
writeFileSync(path, updated, 'utf8');

// Verify rather than trust the regexes.
const check = readFileSync(path, 'utf8').match(block)[0];
const provider = check.match(/provider\s*=\s*"(\w+)"/)?.[1];
const hasDirect = /directUrl\s*=\s*env\("DIRECT_URL"\)/.test(check);

if (provider !== target || hasDirect !== wantsDirect) {
  console.error(`✗ provider is "${provider}", directUrl ${hasDirect ? 'present' : 'absent'} — expected "${target}", directUrl ${wantsDirect ? 'present' : 'absent'}`);
  process.exit(1);
}

console.log(
  `✓ provider ${provider}${hasDirect ? ', directUrl on' : target === 'postgresql' ? ' (no DIRECT_URL set)' : ''}`,
);
