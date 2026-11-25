// Copies the Supabase strings from .env into Vercel as DATABASE_URL and
// DIRECT_URL, through stdin, so neither value is printed or lands in history.
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

const pairs = [
  ['DATABASE_URL', env.SUPABASE_DATABASE_URL],
  ['DIRECT_URL', env.SUPABASE_DIRECT_URL],
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

    // Replace rather than duplicate if it already exists.
    spawnSync('npx', ['vercel', 'env', 'rm', name, target, '--yes'], {
      shell: process.platform === 'win32',
      stdio: 'ignore',
    });

    const r = spawnSync('npx', ['vercel', 'env', 'add', name, target], {
      shell: process.platform === 'win32',
      input: value,
      encoding: 'utf8',
    });

    if (r.status === 0) console.log(`✓ ${name} → ${target}`);
    else {
      failed = true;
      const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(/postgres(ql)?:\/\/\S+/g, '<url hidden>');
      console.error(`✗ ${name} → ${target}\n${out.split('\n').slice(-4).join('\n')}`);
    }
  }
}

process.exit(failed ? 1 : 0);
