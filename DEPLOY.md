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
| `DATABASE_URL` | **Transaction pooler**, port `6543` | append `?pgbouncer=true&connection_limit=5` (see *Speed* below) |
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
- **Chat without realtime** polls every 3 seconds for *changes only*, and stops
  while the tab is hidden. With realtime (below) it is instant and polls only
  every 30 seconds as a safety net.
- **Calls** open a private Jitsi Meet room per channel (free, in the browser).
  Jitsi may ask the first person in a room to sign in to start it.

## Speed — two settings that matter more than any code

Every page reads from Postgres several times. How long each read takes is
set by two things outside the code:

1. **Put the app next to the database.** Vercel runs functions in Washington
   DC (`iad1`) unless told otherwise. If the Supabase project is elsewhere
   (Mumbai, Singapore, Frankfurt…), every query crosses an ocean — about
   150–250 ms each. Find the region in Supabase → Project Settings → General,
   then in Vercel → Settings → Functions → **Function Region** pick the
   closest one (Mumbai `bom1`, Singapore `sin1`, Frankfurt `fra1`, Washington
   `iad1`…). Redeploy.
2. **Let a page run its queries side by side.** With `connection_limit=1`
   Prisma runs every query of a page one after another. `connection_limit=5`
   lets them overlap; Supabase's transaction pooler is built for this. Change
   the end of `DATABASE_URL` in Vercel and redeploy.

To check: open a page, then Vercel → Logs; the function duration should be a
few hundred milliseconds, not seconds.

## Realtime chat (optional, recommended)

Messages appear instantly when Supabase Realtime is set up. Nothing about the
messages goes over the socket — only an empty "something changed" ping on a
topic derived from `SESSION_SECRET`; the browser then fetches through the app,
which checks permissions as usual.

In Vercel → Settings → Environment Variables (Production and Preview), add the
values from Supabase → Project Settings → API:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Project URL (may already be set for file storage) |
| `SUPABASE_SECRET_KEY` | the secret / service-role key (server only; may already be set) |
| `NEXT_PUBLIC_SUPABASE_URL` | the same Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **anon / publishable** key — never the secret one |

Redeploy. The line under the chat box changes from "Auto-refreshing" to "Live"
with a green dot.
- **Local development is unchanged** — `npm run dev` still uses SQLite.
