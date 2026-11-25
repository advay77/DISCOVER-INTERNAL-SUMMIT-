/**
 * The Vercel build.
 *
 * With DATABASE_URL set, this is an ordinary Postgres build: switch the
 * provider, generate, push the schema, build.
 *
 * Without it, the build makes a **demo deploy** instead — a seeded SQLite file
 * is shipped inside the bundle and copied to /tmp at runtime, so the whole
 * product works end to end, writes included, with data that resets when the
 * instance recycles. Add DATABASE_URL and redeploy to make it permanent.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const run = (cmd, args, env = {}) => {
  console.log(`\n→ ${cmd} ${args.join(' ')}`);
  return spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
};

const die = (step, result) => {
  if (result.status !== 0) {
    console.error(`\n✗ ${step} failed`);
    process.exit(result.status ?? 1);
  }
};

const hasPostgres = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:');

if (hasPostgres) {
  console.log('\n■ Building against Postgres.');
  die('provider switch', run('node', ['scripts/use-provider.mjs', 'postgresql']));
  die('prisma generate', run('npx', ['prisma', 'generate']));

  const push = run('npx', ['prisma', 'db', 'push', '--accept-data-loss', '--skip-generate']);
  if (push.status !== 0) {
    console.warn('\n! Could not push the schema. The build continues — check DATABASE_URL and redeploy.');
  }
} else {
  console.log(
    '\n■ No Postgres connection, so this is a DEMO build.' +
      '\n  A seeded database ships with the bundle and resets when the instance recycles.' +
      '\n  Set DATABASE_URL (and DIRECT_URL) in Vercel, then redeploy, to make it permanent.',
  );

  const demo = { DATABASE_URL: 'file:./demo.db', DEMO_SEED: '1' };

  die('provider switch', run('node', ['scripts/use-provider.mjs', 'sqlite'], demo));
  die('prisma generate', run('npx', ['prisma', 'generate'], demo));
  die('create demo database', run('npx', ['prisma', 'db', 'push', '--skip-generate'], demo));
  die('seed demo database', run('node', ['--experimental-strip-types', 'prisma/seed.ts'], demo));

  if (!existsSync('prisma/demo.db')) {
    console.error('\n✗ the demo database was not written');
    process.exit(1);
  }
  console.log('\n✓ demo database ready at prisma/demo.db');
}

die(
  'next build',
  run('npx', ['next', 'build'], hasPostgres ? {} : { DATABASE_URL: 'file:./demo.db' }),
);
