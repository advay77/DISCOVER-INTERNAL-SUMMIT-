/**
 * The Vercel build.
 *
 * Runs in three steps so the first deploy can happen before a database exists:
 *   1. switch the Prisma datasource to Postgres
 *   2. generate the client (never needs a connection)
 *   3. push the schema — only when DATABASE_URL is set, and a failure here
 *      does not fail the build
 *   4. next build (every page is server-rendered, so it needs no database)
 *
 * Without DATABASE_URL the site deploys and serves, and every page that reads
 * data will error until the database is connected and the build re-run.
 */
import { spawnSync } from 'node:child_process';

const run = (cmd, args) => {
  console.log(`\n→ ${cmd} ${args.join(' ')}`);
  return spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
};

const die = (step, result) => {
  if (result.status !== 0) {
    console.error(`\n✗ ${step} failed`);
    process.exit(result.status ?? 1);
  }
};

die('provider switch', run('node', ['scripts/use-provider.mjs', 'postgresql']));
die('prisma generate', run('npx', ['prisma', 'generate']));

if (process.env.DATABASE_URL) {
  const push = run('npx', ['prisma', 'db', 'push', '--accept-data-loss', '--skip-generate']);
  if (push.status !== 0) {
    console.warn(
      '\n! Could not push the schema. The build continues — connect the database and redeploy.',
    );
  }
} else {
  console.warn(
    '\n! DATABASE_URL is not set, so the schema was not pushed.' +
      '\n  The site will deploy but cannot read or write anything yet.' +
      '\n  Add DATABASE_URL in Vercel → Settings → Environment Variables, then redeploy.',
  );
}

die('next build', run('npx', ['next', 'build']));
