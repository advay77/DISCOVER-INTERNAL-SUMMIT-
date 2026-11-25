# Deploying DISCOVER OS to Vercel

The app runs on SQLite and local disk in development. Vercel has neither a
persistent file system nor SQLite, so it needs **a Postgres database** — here,
Supabase.

**Already done:**

- Project `discover-os` created and connected to `advay77/DISCOVER-INTERNAL-SUMMIT-`,
  so every push to `main` deploys.
- `SESSION_SECRET` and `STORAGE=db` set for Production and Preview.
- Deployed and live at **https://discover-os-chi.vercel.app**.

The sign-in page works already. Everything behind it needs the database.

---

## 1. Get the two Supabase connection strings

In your Supabase project: **Project Settings → Database → Connection string**.

Take **two** of them. Prisma needs a pooled connection for the running app and
a direct one to create tables — a pooler cannot run schema changes.

| Vercel variable | Which Supabase string | Note |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler**, port `6543` | append `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | **Session pooler** or **Direct connection**, port `5432` | used only for schema pushes |

Both contain your database password where it says `[YOUR-PASSWORD]` — replace it.

> If the direct `db.<ref>.supabase.co:5432` host does not resolve, use the
> **Session pooler** string for `DIRECT_URL` instead. It is IPv4 and works from
> Vercel's builders.

## 2. Put them into Vercel

Either paste them in **Settings → Environment Variables** for Production and
Preview, or from this folder:

```powershell
npx vercel env add DATABASE_URL production
```

```powershell
npx vercel env add DIRECT_URL production
```

The CLI prompts for the value, so the string never goes through a chat or a
shell history entry.

## 3. Redeploy

```powershell
npx vercel deploy --prod
```

The build switches Prisma to Postgres, creates every table in Supabase, and
builds the site. Without `DATABASE_URL` it still deploys — it just warns and
skips the table creation.

## 4. Seed it once

The tables exist but are empty, so nobody can sign in yet. Seed from your
machine against Supabase:

```powershell
$env:DATABASE_URL="<pooled url>"; $env:DIRECT_URL="<direct url>"; npm run use:postgres; npx prisma generate; npm run db:seed
```

That rewrites `CREDENTIALS.md` with the passwords for the hosted database.

Then put your local setup back:

```powershell
npm run use:sqlite; npx prisma generate
```

## 5. Immediately after go-live

1. Sign in as the President.
2. **Admin → People** — invite the real members with their real email addresses.
3. Deactivate the seeded accounts.
4. **Admin → Event** — set the real summit dates and venue.

---

## Things to know

- **The site may be behind Vercel Authentication**, which means only your own
  Vercel account can open it. Turn it off in **Settings → Deployment
  Protection** before sending the link to the board.
- **Uploads live in Postgres** when `STORAGE=db`, capped at 15 MB per file.
  If the organisation starts sharing large video, move to an object store —
  only `lib/storage.ts` has to change.
- **Chat and the huddle poll** (3s and 1.8s). On Vercel each poll is a function
  invocation, so at 29 people expect meaningful but modest usage. Websockets
  are the fix when it matters.
- **The voice huddle needs HTTPS**, which Vercel gives you. It will not work
  over plain HTTP on a LAN address.
- **Local development is unchanged** — `npm run dev` still uses SQLite.
