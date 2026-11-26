// Copies settings from .env into Vercel through stdin, so no value is printed
// or lands in shell history.
//   node scripts/push-env.mjs production preview
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);

// Vercel name → value. The Supabase database strings are stored under their own
// names in .env so local development keeps using SQLite.
const pairs = [
  ['DATABASE_URL', env.SUPABASE_DATABASE_URL],
  ['DIRECT_URL', env.SUPABASE_DIRECT_URL],
  ['SUPABASE_URL', env.SUPABASE_URL],
  ['SUPABASE_SECRET_KEY', env.SUPABASE_SECRET_KEY],
  ['STORAGE', 'supabase'],
];

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('Name at least one environment: production, preview');
  process.exit(1);
}

let failed = false;
for (const target of targets) {
  for (const [name, value] of pairs) {
    if (!value) {
      console.error(`✗ ${name}: empty in .env`);
      failed = true;
      continue;
    }
    const r = spawnSync(
      'npx',
      ['vercel', 'env', 'add', name, '--environment', target, '--force', '--yes', '--sensitive'],
      {
        shell: process.platform === 'win32',
        input: value,
        encoding: 'utf8',
      },
    );
    if (r.status === 0) console.log(`✓ ${name} → ${target}`);
    else {
      failed = true;
      const out = `${r.stdout ?? ''}${r.stderr ?? ''}`
        .replace(/postgres(ql)?:\/\/\S+/g, '<url hidden>')
        .replace(/sb_secret_\S+/g, '<key hidden>');
      console.error(`✗ ${name} → ${target}\n${out.split('\n').slice(-4).join('\n')}`);
    }
  }
}

process.exit(failed ? 1 : 0);
