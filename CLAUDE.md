# CLAUDE.md — DISCOVER OS (Summit Command Center)

Context for anyone (human or AI) working in this repository. Read this first; the
longer documents are linked at the end.

---

## 1. What this is

**DISCOVER OS** is the internal operating system for **DISCOVER Supply Chain**: a
non-profit with a board of seven, six workstreams, ~20 volunteers and member companies
such as J&J, Pfizer, Walmart, EY, BCG and Merck. Its flagship is a two-day **Annual
Summit**, and around it run webinars, networking evenings and campus sessions.

The product replaces three spreadsheets (`DISCOVER 2024 Summit Planning.xlsx`,
`DISCOVER_Summit_2026_Speaker_Outreach_Tracker.xlsx`, `DISCOVER Project Tracker`) and the
WhatsApp / email / phone conversation about them.

**Thesis:** *a Slack where every message is attached to the thing it is about, sitting on
top of the summit playbook DISCOVER already runs every year.*

- **Objects first, conversation attached** — tasks, speakers, sessions, events each have
  their own thread.
- **The calendar is known** — creating a summit instantiates the ~55-step annual playbook
  as dated tasks, counted backwards from the event date.
- **Not everyone sees everything** — the President controls a live permission matrix.

**Scale:** about 30 people. Not an enterprise product. Users are busy mid-level managers
on their phones — every screen must be light, fast and touch-friendly ("nicer than Gmail").

| | |
|---|---|
| Owner | Advay Anand (`advay77` on GitHub) |
| Repo | `advay77/DISCOVER-INTERNAL-SUMMIT-` |
| Live | https://discover-os-chi.vercel.app (Vercel project `discover-os`, Supabase Postgres) |
| Deploys | Every push to `main` deploys on Vercel (`npm run vercel-build`) |
| Version | PRD 2.0 (26 Nov 2026); last merged work is PR #9 (27 Nov 2026) |

---

## 2. Stack

- **Next.js 15** (App Router, React 19, Server Components + Server Actions), **TypeScript**
- **Tailwind 3** with CSS-variable design tokens (light + dark)
- **Prisma 6.1** — **SQLite locally, Postgres (Supabase) when hosted**; the provider line is
  rewritten by `scripts/use-provider.mjs` (Prisma does not accept `env()` in `provider`)
- **Auth:** own implementation — bcrypt (12 rounds) + signed JWT cookie via `jose`
- **Supabase:** Postgres, Storage (private bucket `discover-files`), optional Realtime Broadcast
- **Calls:** Jitsi Meet links per channel (no built-in WebRTC)
- No AI service, no email service, no third-party analytics/scripts

There is **no automated test suite and no linter step in CI** (`eslint.ignoreDuringBuilds`).
`typescript.ignoreBuildErrors` is **false** — `next build` must type-check cleanly.

---

## 3. Run it

```bash
npm install
npm run setup     # prisma generate + db push + seed (SQLite, prisma/dev.db)
npm run dev       # http://localhost:3100
```

| Script | Does |
|---|---|
| `npm run dev` / `start` | Next on port **3100** |
| `npm run build` | Production build (type-checks) |
| `npm run db:push` | Apply `schema.prisma` to the current DB |
| `npm run db:seed` | `node --experimental-strip-types prisma/seed.ts` (Node 22+ needed) |
| `npm run db:reset` | Force-reset schema and reseed |
| `npm run use:sqlite` / `use:postgres` | Switch the Prisma provider line |
| `npm run vercel-build` | What Vercel runs (see §9) |

**Signing in:** the seed generates a fresh password per person and writes them to
`CREDENTIALS.md` in the repo root — **gitignored, never commit it**. 21 accounts
(9 leadership, 12 volunteers). Good access-model walk-through: `yahne@` (President) →
`odi@` (Officer) → `taylor@` (Lead) → `mandy@` (Volunteer), all `@discover.org`.

The seed contains **only what DISCOVER's trackers contain** — 21 people, 6 workstreams,
~76 tasks (playbook + 2024 Action log), 17 speakers, 24 agenda sessions, retro items,
~11 channels. Sponsors, vendors, attendees, messages and files start **empty on purpose**.
**Never invent data to fill a screen.** Summit dates/venue are placeholders until set in
Admin → Event.

`node scripts/audit.mjs` prints row counts per section and their source.

---

## 4. Layout

```
app/
  layout.tsx, page.tsx          root shell; / → dashboard or login
  login/                        sign-in form + server action
  no-access/                    where requireCan() redirects
  actions.ts                    ALL server actions (tasks, events, speakers, sessions,
                                retro, admin, profile, attendees, vendors, notes→tasks)
  (app)/layout.tsx              signed-in shell: sidebar, topbar, mobile tab bar, nav
                                built from capabilities
  (app)/dashboard               workstream cards (WorkstreamCards) — since PR #9
  (app)/tasks                   kanban + list, filters, NotesToTasks, [id] editor + thread
  (app)/events                  all events (summit/webinar/networking/academic), [id]
  (app)/summit                  Annual Summit one-page summary + readiness
  (app)/speakers                speaker pipeline, [id] editor + thread
  (app)/agenda                  two-day run of show timeline (editable with agenda:edit)
  (app)/sponsors, logistics,    summit modules (logistics = venue + VendorList,
        attendees               attendees = AttendeeList + CSV export)
  (app)/chat, chat/[key]        channels + DMs
  (app)/files, team, retro,     organisation pages
        profile, search, admin
  (app)/questions               RETIRED — redirects to /dashboard (data kept)
  api/                          route handlers: messages, reactions, channels(+members/join),
                                dm, files(+sign, complete, [id]), notifications, people,
                                attendees/export, logout
components/                     Sidebar, Topbar, MobileTabBar, Thread (chat engine),
                                Attachment, CallButton, ChannelAdmin, NotificationBell,
                                WorkstreamCards, ThemeToggle, Logo, icons, ui (primitives)
lib/                            see §5
prisma/                         schema.prisma, seed.ts + accounts / credentials / events /
                                playbook data modules
scripts/                        ops helpers (§9)
public/discover-logo.png        brand logo
```

Path alias: `@/` = repo root.

---

## 5. Key modules in `lib/`

| File | Role |
|---|---|
| `authz.ts` | **The only place permission is decided.** `requireUser`, `requireCan`, `can`, `scopeOf`, `scopeFilter`, `allows`, `restrictionFilter`, `visibleWorkstreams`, `redact`/`redactMany`, `SPEAKER_GATES`, `MONEY_GATES` |
| `capabilities.ts` | Capability catalogue + `DEFAULT_MATRIX` + `defaultScope()`. Nothing may check a capability string not declared here |
| `auth.ts` | bcrypt hashing, JWT session create/destroy, `currentUser` (React `cache`d — one user lookup per request), `signIn` |
| `db.ts` | Prisma client; **demo mode** (hosted with no Postgres → copies `prisma/demo.db` to `/tmp`); `icontains()` for case-insensitive search on both engines |
| `validate.ts` | Input bounds (`LIMITS`, `text()` etc.). **Every value reaching the DB goes through it** |
| `ratelimit.ts` | DB-backed rate limiting (`RateCounter`), used on sign-in |
| `storage.ts` / `upload.ts` | File storage: `supabase` (signed upload/download URLs) · `disk` (`./storage`, local) · `db` (legacy bytes in row). `STORAGE` env forces one. 50 MB cap |
| `realtime.ts` / `realtime-client.ts` | Supabase Realtime "something changed" pings (empty payload, HMAC topic) |
| `unread.ts` | Unread counts per channel |
| `dm.ts` | DM channel key = hash of the sorted user-id pair |
| `notes.ts` | Pasted meeting notes → draft tasks (owner/due/priority/workstream parsing, no AI) |
| `agenda.ts`, `eventKinds.ts`, `event.ts`, `format.ts` | Session kinds/time helpers, event kinds, `currentEvent()` (`isCurrent: true`), date/money formatting |

---

## 6. Access model (the hard requirement)

**Rule:** everyone can see everyone's work. **Finance is the single exception** — the
Finance workstream has `restricted: true`, and everything inside it (tasks, vendors,
sponsors, events, channel) is invisible to anyone without `finance:view`. Control
(editing) follows ownership; administration sits with the President.

**Roles** (defaults, editable in Admin): 1 President · 2 Officer · 3 Board Director ·
4 Workstream Lead · 5 Volunteer.

**Capabilities:** `resource:action` with scope `all | workstream | own | none`.
Keys: `tasks:view|edit|assign`, `speakers:view|contact|edit`, `agenda:view|edit`,
`sponsors:view|edit`, `vendors:view|edit`, `finance:view|edit`,
`attendees:view|edit|contact|export`, `files:view|upload|delete`,
`chat:use|dm|channel.create|announce`, `team:view|contact`, `retro:view|write`,
`admin:users|roles|permissions|event`.
Resolution: `RolePermission` row for the role → else `DEFAULT_MATRIX`.

**Enforcement rules — do not break these:**

1. Decide permission only via `lib/authz.ts`. No ad-hoc role checks in pages.
2. Narrow the **query** before it runs (`scopeFilter`, `restrictionFilter`), never filter after.
3. Strip gated fields server-side with `redact` (speaker/attendee contact, every money
   field such as `amount`). A hidden field must be absent from the payload, not CSS-hidden.
4. **Every server action and API route re-checks** permission. A page redirect is not the control.
   Thread/reaction APIs return **403** (not an empty list) when the parent object is not allowed.
5. The President can never lose `admin:permissions` (hard-coded in `scopeOf` and the action).
6. Always ≥1 active President; you cannot deactivate yourself.
7. Permission, role, member, password, workstream, export and file-deletion changes write
   to `AuditLog`.
8. People are **deactivated, never deleted**.
9. Changing someone's email/role/active status or password bumps `sessionEpoch` →
   all their sessions die.

---

## 7. Data model (Prisma, `prisma/schema.prisma`)

`Role`, `RolePermission`, `User` (with `sessionEpoch`, `active`), `Workstream`
(`restricted`, lead), `Membership` (user ↔ workstream), `Event` (kind, dates, venue,
goals, `isCurrent`), `PlaybookStep`, `Task` (status `todo|in_progress|review|done`,
priority `low|medium|high`, owner, workstream, event), `Speaker` (18 fields from the
2026 outreach tracker), `Session` + `SessionSpeaker` (run of show), `Sponsor`, `Vendor`,
`Attendee`, `OpenQuestion` (retired module, data kept), `RetroItem` (`plus|delta|consider`,
optional `workstreamId` — null means Annual Summit), `Channel` (type
`public|private|workstream|dm`), `ChannelMember`, `Message` (channel **or** object thread via
`entityType`+`entityId`; `parentId` replies; soft `deletedAt`; `editedAt`; `updatedAt`
bumped on any change for changes-only polling), `Reaction`, `FileAsset`, `Notification`,
`ActivityLog`, `RateCounter`, `AuditLog`.

**Schema changes must be additive with defaults** — production uses `prisma db push`
(no migrations folder), and the same schema must work on SQLite and Postgres. Don't use
Postgres-only types/features. For case-insensitive search use `icontains()` from `lib/db.ts`.

---

## 8. Communication (replaces WhatsApp)

- Two homes for messages: **channels** and **object threads** (task, speaker, sponsor,
  vendor, session, event). `components/Thread.tsx` is the shared chat engine.
- Channels: public (`#general`, `#volunteers`, `#speakers`, `#random`), workstream
  (joining a workstream joins its channel), private (`#board`, `#finance`), and DMs
  (channel type `dm`, exactly two members, key from `dmKey`).
- Features: latest 50 + "load earlier", replies with jump-to-quote, edit/delete own
  (admins delete any; tombstone), @mentions → notifications, reactions 👍 ✅ 🙌 👀 🎉 ❓,
  attachments (drag-drop, inline media, voice notes), unread badges, new-message pill,
  tap-for-actions on touch, Jitsi call button per channel.
- **Delivery:** client asks only for changes since its cursor; polling pauses when the tab
  is hidden. With Supabase Realtime keys: server sends an **empty** ping on an HMAC topic
  after each write, browser re-fetches via `/api/messages` (permissions apply as normal),
  safety-net poll every 30 s, composer shows **Live**. Without keys: poll every 3 s,
  shows **Auto-refreshing**. **Never send message content over the socket.**

---

## 9. Hosting, env and scripts

**Environment variables**

| Var | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | server | SQLite `file:./dev.db` locally; Supabase **transaction pooler** (6543) `?pgbouncer=true&connection_limit=5` in prod |
| `DIRECT_URL` | server | Supabase session pooler/direct (5432), used only for schema push |
| `SESSION_SECRET` | server | JWT + realtime-topic HMAC. **Prod refuses to start if missing or < 32 chars** |
| `STORAGE` | server | `supabase` \| `disk` \| `db` (optional override) |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`), `SUPABASE_BUCKET` | server | Storage + realtime send |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser | Realtime listen (anon key only, never the secret) |

**Vercel build (`scripts/vercel-build.mjs`):** with a Postgres `DATABASE_URL` → switch to
postgresql, generate, `db push --accept-data-loss`, build. Without it → **demo build**: seeds
`prisma/demo.db`, bundles it, and at runtime it's copied to `/tmp` (resets on recycle).

**Speed:** put the Vercel function region next to the Supabase region, and use
`connection_limit=5`. Links use `prefetch={false}` to avoid prefetch storms; keep pages
querying in parallel (`Promise.all`) and keep query counts low (dashboard was cut 37 → 22).

**Ops scripts (`scripts/`)** — all avoid printing secrets/passwords:
`audit.mjs` (row counts), `check*.mjs` (verify Supabase strings, storage key, file
access is private), `ping-db.mjs`, `db-size.mjs`, `supabase-env.mjs <cmd>` (run a command
with Supabase URLs from `.env`), `push-env.mjs` (copy `.env` → Vercel via stdin),
`create-bucket.mjs`, `seed-if-empty.mjs`, `live-messages.mjs`, `who-posted.mjs`,
`cleanup-test.mjs`, `clean-load-test.mjs`, `use-provider.mjs`, `vercel-build.mjs`.

**Security headers / CSP** live in `next.config.mjs`. Only `'self'`, Google Fonts and the
one Supabase project origin are allowed. If you add an outside origin, update the CSP.
Microphone is allowed (voice notes); camera/geolocation are not.

---

## 10. Design system

- Brand: DISCOVER Supply Chain logo (`public/discover-logo.png`, `components/Logo.tsx`);
  on dark surfaces it sits on a white plate.
- Colours from the logo: DISCOVER **navy `#203889`** (primary actions, active nav) and
  DISCOVER **blue `#1270BA`** (`accent` — the one figure that matters on a screen). Cool grey
  canvas, white rounded panels (~20 px), soft shadows. Status: forest (good), brass
  (attention), brick (late).
- Every Tailwind colour reads a CSS variable from `app/globals.css`; `.dark` on `<html>`
  re-themes everything. `white` = surface, `snow` = literal white. Theme follows device,
  toggle in topbar/login, applied before first paint.
- Type: Inter (text) + Inter Tight (figures/headings), self-hosted.
- Responsive: sidebar on desktop (`lg`), topbar + bottom tab bar + "More" sheet on phones.
  **No horizontal overflow at 360–1440 px**, light and dark. Tables become cards on phones.
  Every hover action needs a tap equivalent. Respect reduced motion, visible focus, labels.
- Components: pill buttons, filter chips with counts, stat tiles, rounded modals, empty
  states that suggest a next step.

---

## 11. Conventions

- **Server Components by default**; client components (`'use client'`) only for
  interactivity (TaskBoard, Thread, editors, forms). Server-only modules import `'server-only'`.
- Mutations are **server actions in `app/actions.ts`** (or API routes for chat/files).
  Pattern: `requireUser()`/`requireCan()` → validate with `lib/validate.ts` → `allows()` on
  the record → write → `AuditLog` where required → `revalidatePath`.
- Copy is plain British English ("organisation", "colour"), short and human.
- Comments explain **why**, in full sentences, at the top of a module.
- Never commit `.env*`, `CREDENTIALS*.md`, `prisma/*.db`, `storage/`.

### Commits / PRs (from `.cursor/rules/commits.mdc`)

- Only commit when asked.
- Subject: what changed and why, in plain language, one or two sentences. Optional body
  explaining the reason.
- **Never mention Cursor** (no `Made with Cursor`, no Cursor co-author trailer).
- Work lands via feature branches + PR into `main` (e.g. `dashboard/…`, `chat/…`, `ui/…`).
  Merging to `main` deploys to production.

---

## 12. Release history

| PR | Release | What |
|---|---|---|
| — | 1.0 | Modules, access model, seeded 2026 cycle |
| #1 | 1.1 Redesign | Design system, dashboard, light/dark, touch status menu, mobile fixes |
| #2 | 1.2 Tasks | Tasks page redesign, quick filters with counts, search, scrolling columns |
| #3 | 1.3 Summit & Admin | Logo, Summit summary, editable run of show, full admin control, Questions retired |
| #4 | 1.4 Chat | 200-message cutoff fix, changes-only polling, realtime, reply/edit/delete, Jitsi |
| #5 | 1.5 Organisation | Files, Team, Retro redesign; file delete; PRD 2.0 |
| #6 | 1.6 Speed & brand | Fewer DB round-trips, no prefetch, self-hosted fonts; navy/blue replace lime |
| #7 | Direct messages | One-to-one private DMs |
| #8 | Attendees & Logistics | Add/edit/remove attendees; vendor management |
| #9 | Dashboard = workstreams | Dashboard shows workstream cards; retro per workstream; tasks from pasted notes; three task filters |

---

## 13. Open items / known gaps

- Confirmed summit **dates and venue** (placeholders today).
- Supabase **Realtime keys** in Vercel production (otherwise chat polls every 3 s).
- Real member accounts; deactivate seeded ones. Turn off Vercel Deployment Protection
  before sharing.
- Supabase **backups** must be enabled.
- No password reset / no email at all (invites, digests) — President sets passwords.
- No automated tests — verification so far has been scripted browser checks + manual.
- Decisions pending: do volunteers get `@channel`? message/file retention policy?
- Later: email digests, calendar export, retro → next-year playbook, pinned messages,
  typing/online indicators, public summit page.

**Doc drift to be aware of:** `STATUS.md` and `SECURITY.md` are snapshots from 25 Nov 2026
(they still mention two sign-in doors, 2 s polling, Questions page, DB-stored uploads —
all since changed). `PRD.md` §6.3 still describes the older KPI dashboard; since PR #9 the
dashboard is the workstream-cards view. `SUPABASE.md` says `connection_limit=1`;
`DEPLOY.md` (newer) recommends `5`. When docs and code disagree, **the code wins** —
and update the doc.

---

## 14. Further reading

- [PRD.md](PRD.md) — full product requirements (v2.0), incl. chat spec and access model
- [PRODUCT-REVIEW.md](PRODUCT-REVIEW.md) — design rationale, personas, workstreams
- [README.md](README.md) — run it, module overview
- [DEPLOY.md](DEPLOY.md) — Vercel + Supabase deploy, speed, realtime
- [SUPABASE.md](SUPABASE.md) — step-by-step Supabase setup
- [SECURITY.md](SECURITY.md) — security audit (25 Nov 2026)
- [STATUS.md](STATUS.md) — production-readiness snapshot (25 Nov 2026)
