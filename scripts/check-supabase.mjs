// Checks the Supabase strings in .env without ever printing a password.
// Reports only structure: host, port, user, and whether the required pieces
// are present.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);

const describe = (name, raw, expectPort, wantBouncer) => {
  const problems = [];
  if (!raw) return { name, ok: false, problems: ['empty'] };

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { name, ok: false, problems: ['not a valid URL'] };
  }

  if (!/^postgres(ql)?:$/.test(url.protocol)) problems.push(`scheme is ${url.protocol}, expected postgresql:`);
  if (raw.includes('[YOUR-PASSWORD]')) problems.push('still contains [YOUR-PASSWORD]');
  if (!url.password) problems.push('no password in the string');
  if (url.port !== String(expectPort)) problems.push(`port is ${url.port || '(none)'}, expected ${expectPort}`);

  const bouncer = url.searchParams.get('pgbouncer') === 'true';
  const limit = url.searchParams.get('connection_limit');
  if (wantBouncer && !bouncer) problems.push('missing ?pgbouncer=true');
  if (wantBouncer && limit !== '1') problems.push('missing connection_limit=1');
  if (!wantBouncer && bouncer) problems.push('should NOT have pgbouncer=true');

  // A raw @ / # in the password breaks parsing — the host comes out wrong.
  if (!/supabase\.(co|com)$/.test(url.hostname)) {
    problems.push(`host "${url.hostname}" does not look like Supabase — a special character in the password may need URL-encoding`);
  }

  return {
    name,
    ok: problems.length === 0,
    host: url.hostname,
    port: url.port,
    user: url.username,
    passwordLength: decodeURIComponent(url.password || '').length,
    pgbouncer: bouncer,
    connectionLimit: limit,
    problems,
  };
};

const results = [
  describe('SUPABASE_DATABASE_URL', env.SUPABASE_DATABASE_URL, 6543, true),
  describe('SUPABASE_DIRECT_URL', env.SUPABASE_DIRECT_URL, 5432, false),
];

for (const r of results) {
  console.log(`\n${r.ok ? '✓' : '✗'} ${r.name}`);
  for (const [k, v] of Object.entries(r)) {
    if (['name', 'ok', 'problems'].includes(k)) continue;
    console.log(`    ${k}: ${v}`);
  }
  for (const p of r.problems) console.log(`    ! ${p}`);
}

const same = env.SUPABASE_DATABASE_URL && env.SUPABASE_DIRECT_URL &&
  new URL(env.SUPABASE_DATABASE_URL).password === new URL(env.SUPABASE_DIRECT_URL).password;
console.log(`\n  same password in both: ${same ? 'yes' : 'NO — they should match'}`);

process.exit(results.every((r) => r.ok) ? 0 : 1);
