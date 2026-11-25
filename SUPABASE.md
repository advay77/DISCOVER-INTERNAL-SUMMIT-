# Connecting Supabase — step by step

About fifteen minutes. Nothing here can break the live demo: until both
variables are set, the app keeps running on the demo database.

Everything else is already done — the project is linked, `SESSION_SECRET` and
`STORAGE` are set, and the build switches itself to Postgres the moment it sees
a Postgres URL.

---

## Step 1 — Create the Supabase project

1. **supabase.com** → sign in → **New project**
2. Name it `discover-os`
3. **Database Password** — click Generate, then **copy it somewhere safe now**.
   Supabase shows it once. You need it in step 2.
4. Region: pick the one nearest the board. `East US` is a sensible default.
5. Create, and wait about two minutes while it provisions.

## Step 2 — Collect the two connection strings

Project → **Settings** (gear, bottom left) → **Database** → **Connection
string**.

You need **two**, because Prisma cannot create tables through a pooler.

### a) `DATABASE_URL` — the pooled one, for the running app

Choose **Transaction pooler**. It looks like:

```
postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Two edits:

1. replace `[YOUR-PASSWORD]` with the password from step 1
2. append `?pgbouncer=true&connection_limit=1`

Final shape:

```
postgresql://postgres.abcdefgh:YourPassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

> `connection_limit=1` matters. Every serverless function opens its own
> connection, and without it a busy moment exhausts the pool.

### b) `DIRECT_URL` — the direct one, for creating tables

Choose **Session pooler** — port `5432`:

```
postgresql://postgres.abcdefgh:YourPassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Replace the password. **No** `?pgbouncer=true` on this one.

> Supabase also offers a "Direct connection" on `db.<ref>.supabase.co:5432`.
> That host is IPv6-only on new projects and Vercel's builders cannot reach it,
> so use the **Session pooler** instead.

### What is different about them

| | Port | Used for |
|---|---|---|
| `DATABASE_URL` | 6543 | every query the app makes |
| `DIRECT_URL` | 5432 | `prisma db push` at build time, nothing else |

## Step 3 — Put them into Vercel

From the project folder, so the password never passes through a chat:

```powershell
npx vercel env add DATABASE_URL production
```

```powershell
npx vercel env add DIRECT_URL production
```

Each prompts for the value — paste, press Enter.

Or in the dashboard: **Settings → Environment Variables**, scope **Production**.

## Step 4 — Redeploy

```powershell
npx vercel deploy --prod
```

Watch for this in the log:

```
■ Building against Postgres.
→ npx prisma db push
```

If it says `DEMO build` instead, `DATABASE_URL` did not reach the build — check
the spelling and that the scope is Production.

## Step 5 — Seed it once

The tables exist but are empty, so nobody can sign in yet. Run this from the
project folder, with your two strings:

```powershell
$env:DATABASE_URL="<pooled url>"; $env:DIRECT_URL="<direct url>"; npm run use:postgres; npx prisma generate; npm run db:seed
```

It prints `21 people · 76 tasks · 17 speakers` and rewrites `CREDENTIALS.md`
with the passwords for the **live** database.

Then put your local setup back, or local development will try to use Supabase:

```powershell
npm run use:sqlite; npx prisma generate
```

## Step 6 — Check your backups

Supabase → **Database** → **Backups**. Look at what it actually offers on your
plan — do not assume. Restorable daily backups are a **paid-plan** feature;
on the free plan you should expect none you can restore from the dashboard.

This is the only copy of the data once people start using it. For real use,
either move to a paid plan or take your own regular export
(`pg_dump` against the direct connection string).

An earlier version of this guide said the free plan includes 7-day daily
backups. That was not checked and should not be relied on.

## Step 7 — Check it

1. Open **https://discover-os-chi.vercel.app/login**
2. The orange **Demo** banner should be **gone** — that alone proves Postgres is
   live
3. Sign in with the President from the new `CREDENTIALS.md`
4. Post a message, then reload. It should still be there — with the demo
   database it would eventually vanish
5. Open Supabase → **Table editor**. You should see `User`, `Task`, `Message`
   and the rest with rows in them

## Step 8 — Hand it over

1. Sign in as the President
2. **Admin → People** → invite the real members with their real email addresses
3. **Admin → People** → deactivate every seeded account
4. **Admin → Event** → set the real summit dates and venue
5. Send the link

---

## If something goes wrong

**Build fails with `Can't reach database server`**
`DIRECT_URL` is wrong or unreachable. Use the **Session pooler** string on port
5432, not `db.<ref>.supabase.co`.

**App loads but every page errors**
`DATABASE_URL` is set but the tables do not exist — step 5 was skipped or
failed.

**`password authentication failed`**
`[YOUR-PASSWORD]` was not replaced, or it contains a character that needs
URL-encoding. `@` becomes `%40`, `#` becomes `%23`, `/` becomes `%2F`.

**`too many connections`**
`?pgbouncer=true&connection_limit=1` is missing from `DATABASE_URL`.

**The Demo banner is still showing**
The deploy did not pick up the variable. Confirm with `npx vercel env ls`, then
redeploy — adding a variable does not rebuild on its own.
