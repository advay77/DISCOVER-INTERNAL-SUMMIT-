// Runs a command with the Supabase strings from .env as DATABASE_URL and
// DIRECT_URL, without the values ever appearing on screen or in shell history.
//   node scripts/supabase-env.mjs <command> [args...]
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

if (!env.SUPABASE_DATABASE_URL || !env.SUPABASE_DIRECT_URL) {
  console.error('SUPABASE_DATABASE_URL and SUPABASE_DIRECT_URL must both be set in .env');
  process.exit(1);
}

const [cmd, ...args] = process.argv.slice(2);
const result = spawnSync(cmd, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    DATABASE_URL: env.SUPABASE_DATABASE_URL,
    DIRECT_URL: env.SUPABASE_DIRECT_URL,
  },
});
process.exit(result.status ?? 1);
