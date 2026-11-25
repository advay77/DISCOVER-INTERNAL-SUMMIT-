# Deploying DISCOVER OS to Vercel

The app runs on SQLite and local disk in development. Vercel has neither a
persistent file system nor SQLite, so a hosted deploy needs **a Postgres
database**. Everything else is already prepared.

---

## 1. Create a Postgres database

Any Postgres works. The two with the least setup:

- **Neon** — neon.tech, free tier, gives a connection string immediately
- **Vercel Postgres** — Storage tab inside the Vercel project

Copy the connection string. It looks like:

```
postgresql://user:password@host/dbname?sslmode=require
```

## 2. Import the repository into Vercel

vercel.com → **Add New → Project** → import
`advay77/DISCOVER-INTERNAL-SUMMIT-`.

Leave the framework as Next.js. Do not change the build command — the repo's
`vercel-build` script handles it:

```
node scripts/use-provider.mjs postgresql && prisma generate && prisma db push && next build
```

## 3. Set the environment variables

In **Settings → Environment Variables**, for Production *and* Preview:

| Name | Value |
|---|---|
| `DATABASE_URL` | the Postgres connection string from step 1 |
| `SESSION_SECRET` | any long random string — this signs the login cookie |
| `STORAGE` | `db` |

`STORAGE=db` keeps uploaded photos, videos, voice notes and documents in
Postgres, because Vercel's file system is read-only. It is set automatically on
Vercel even if you forget, but being explicit is better.

Generate a session secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Deploy, then seed

The first deploy creates the tables but leaves them empty, so nobody can sign
in yet. Seed it once from your machine, pointed at the hosted database:

```powershell
$env:DATABASE_URL="<your postgres url>"; npm run use:postgres; npx prisma generate; npm run db:seed
```

Then put the provider back for local work:

```powershell
npm run use:sqlite; npx prisma generate
```

Sign in with any account from [CREDENTIALS.md](CREDENTIALS.md).

## 5. Immediately after go-live

1. Sign in as the President.
2. **Admin → People** — invite the real members with their real email addresses.
3. Deactivate the seeded accounts.
4. **Admin → Event** — set the real summit dates and venue.

---

## Things to know

- **Uploads live in Postgres** when `STORAGE=db`, capped at 15 MB per file.
  If the organisation starts sharing large video, move to an object store —
  only `lib/storage.ts` has to change.
- **Chat and the huddle poll** (3s and 1.8s). On Vercel each poll is a function
  invocation, so at 29 people expect meaningful but modest usage. Websockets
  are the fix when it matters.
- **The voice huddle needs HTTPS**, which Vercel gives you. It will not work
  over plain HTTP on a LAN address.
- **Local development is unchanged** — `npm run dev` still uses SQLite.
