# DISCOVER OS — Summit Command Center

Internal operating system for DISCOVER: the board, the five workstreams and the volunteers.
One place for the whole cycle — tasks, speakers, sponsors, logistics, and the conversation
about all of it.

**[PRD.md](PRD.md)** — the product requirements document, including how communication
works for volunteers.
**[PRODUCT-REVIEW.md](PRODUCT-REVIEW.md)** — the design rationale behind it.
**CREDENTIALS.md** — every account, email and password. Written by the seed on
your own machine and gitignored; sign-in passwords are never committed.

---

## Run it

```bash
npm install
npm run setup     # prisma generate + db push + seed
npm run dev       # http://localhost:3100
```

`npm run setup` seeds **only what DISCOVER's own trackers contain**: 21 people, the
~55-step annual playbook as dated tasks, 23 open items from the 2024 Action log, the
17-strong speaker pipeline, the two-day run of show, the 2026 open questions, the 2024
retro and 10 channels.

Sponsors, vendors, attendees and messages start **empty** — the trackers carry no
sponsor pipeline, the Vendor Management tab holds only its headers, and there is no
registration export. Nothing is invented to fill a screen.

To start over: `npm run db:reset`.

### Signing in

The login screen has **two doors** — *Board &amp; officers* and *Volunteers*. Pick the door,
pick your name from the list, enter the password.

`npm run db:seed` issues a fresh password per person and writes them all to
**CREDENTIALS.md** in the project root — local only, gitignored. 21 accounts:
9 leadership (the board of seven plus two workstream leads) and 12 volunteers,
every one of them named in DISCOVER's own trackers.

The fastest way to test the access model is to sign in as these four in turn:
`yahne@` (President) → `odi@` (Officer) → `taylor@` (Lead) → `mandy@` (Volunteer).

---

## What is in V1

| Module | What it does |
|---|---|
| **Dashboard** | Greeting, KPI strip, speaker/task pipeline, deadlines, speakers to chase, your tasks, upcoming events, recent chat — all scoped to your access |
| **Summit summary** | The whole Annual Summit on one page: countdown, readiness, workstream progress, speakers, run of show, partners, registration, what needs attention |
| **Tasks** | Kanban + list, seeded from the annual playbook, drag to change status, every task has its own thread |
| **Speakers** | The 18-field outreach pipeline with the summary computed, bio/headshot readiness, contact behind a gate |
| **Run of show** | Two-day timeline; add, edit and remove sessions (time, kind, room, owner, moderator, speakers) with `agenda:edit`; volunteers see it read-only |
| **Sponsors** | Pipeline by tier, logo and contract tracking, values behind `finance:view` |
| **Logistics** | Venue, room block, vendors, payment status; amounts behind `finance:view` |
| **Attendees** | Registrations against the board's goals; emails and export behind their own gates |
| **Communications** | Channels per workstream, DMs, object threads, @mentions, unread counts, photo/video/file attachments with drag-and-drop, voice notes, emoji reactions, replies, edit and delete, load-older, live updates, and a video call link per channel |
| **Files** | Folders, upload, permission-checked downloads, attachable to records |
| **Team** | Member directory by workstream |
| **Retro** | Plus / Delta / Consider — everyone can write, including volunteers |
| **Admin** | Live permission matrix; add members and edit every detail (name, email, title, company, phone, colour, role, workstreams, active, password); rename roles and workstreams; event settings; audit log |

---

## How access works

One file decides everything: [`lib/authz.ts`](lib/authz.ts), over the capability catalogue in
[`lib/capabilities.ts`](lib/capabilities.ts).

- Everyone sees everyone's work. **Finance is the one exception** — that
  workstream is marked `restricted`, so its tasks, questions, vendors, sponsors
  and channel are invisible to anyone outside the board.
- Every permission is `resource:action` with a scope of `all` / `workstream` / `own` / `none`.
- `scopeFilter()` narrows the database query **before** it runs.
- `redact()` strips gated fields from the payload server-side — a hidden field is genuinely
  absent from the response, not hidden with CSS.
- The President can never be locked out of the permission editor; that lock lives in the
  server action, not the UI.
- Every permission and role change writes to the audit log.

Verified in the browser: as a volunteer, `/speakers` redirects to the no-access page,
`/api/attendees/export` returns 403, the speaker thread API returns 403, and the Logistics
page renders vendors with no Amount column at all.

---

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Prisma + SQLite · JOSE session cookie ·
bcrypt. No external service, no API key, no bill — clone, install, run.

### Known V1 tradeoffs

1. **Chat is live when Supabase Realtime is configured** (see DEPLOY.md → Realtime chat):
   the server sends an empty "changed" ping after every write and browsers re-fetch only what
   changed. Without the keys it polls for changes every 3 seconds, and only while the tab is
   visible. Calls open a private Jitsi Meet room per channel rather than a built-in huddle.
2. **SQLite** is single-writer. Correct for local testing; switch `provider` to `postgresql`
   and change `DATABASE_URL` before deploying.
3. **Files are stored on local disk** under `storage/`. Move to S3-compatible storage at
   deploy time; the read path is already permission-checked.
4. **Summit dates and venue are placeholders.** The source trackers never stated them.
   Set them in Admin → Event and the countdown, playbook dates and agenda all follow.

---

## Still needed

- The official DISCOVER logo files (SVG or high-res PNG). `components/Logo.tsx` is a faithful
  reconstruction from the reference boards — swap the asset there and it changes everywhere.
- Confirmed summit dates and venue.
- A deployment target, once V1 passes testing.
