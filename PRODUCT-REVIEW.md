# DISCOVER OS — Product Review Document

**Working name:** DISCOVER Summit Command Center
**Cycle V1 opens on:** 2026 Summit
**Author:** Advay Anand · prepared 25 Nov 2026
**Status:** V1 built — this document is the spec the build follows

---

## 1. The problem, stated honestly

DISCOVER runs a real organisation — five workstreams, a board of seven, under twenty volunteers, member companies including J&J, EY, BCG, Walmart and Pfizer, and one flagship Annual Summit with a two-day run of show, a speaker pipeline, a gala, vendors, sponsors and students.

All of that is currently coordinated across:

| Where the work lives | Where the conversation about it lives |
|---|---|
| `DISCOVER 2024 Summit Planning.xlsx` — 19 tabs | WhatsApp |
| `DISCOVER_Summit_2026_Speaker_Outreach_Tracker.xlsx` — 9 tabs | Email |
| `DISCOVER Project Tracker` — workstreams, board, volunteers | Calls |

So a fact like *"Yahne is visiting the venue this week to review room configurations"* exists as a cell in a Question Tracker, while the actual discussion, the photos of the room, the contract and the final decision are scattered across three other tools. Nothing connects them. Nothing remembers them next year.

The 2026 tracker's own Instructions tab already says it out loud:

> *"Avoid creating separate trackers. Use this file as the working source for speaker outreach tracking."*

They have diagnosed the problem correctly and patched it with discipline. Discipline does not scale to thirty people.

**The product thesis:**

> A Slack where every message is attached to the thing it is about, sitting on top of the summit playbook DISCOVER already runs every year.

Three consequences follow, and they are the whole product:

1. **Objects first, conversation attached.** Every task, speaker, sponsor, vendor, session and open question is a real record with an owner, a status and a deadline — and its own thread. Chat is a property of the work, not a separate room where work gets described.
2. **The calendar is known.** Creating a summit instantiates the ~55-step annual playbook (taken verbatim from the `Main Schedule` tab) as dated, assigned tasks. The year plans itself; people execute.
3. **Not everyone sees everything.** The President holds master access and grants the rest. A volunteer must never see a Chief Supply Chain Officer's mobile number or the $79k budget line.

**The bar:** nicer than Gmail. If a mid-level manager at J&J opens it on their phone between meetings and it feels heavy, the product has failed — regardless of feature count.

---

## 2. Who uses it

Taken from the DISCOVER Project Tracker, not invented.

### Workstreams (5)

| # | Workstream | Lead | Scope |
|---|---|---|---|
| 1 | Professional Development | Gagan | Webinars, Earth Day networking event |
| 2 | Academic Engagement | Minu Patel | Events with schools, students |
| 3 | Annual Summit | Odi Ikpe | The flagship, two days |
| 4 | Partnerships | Yahne & Odi | Sponsors, member companies |
| 5 | Communications | Taylor (Pfizer) | Email sends, LinkedIn, marketing calendar |

### Board

- **Officers:** President (Yahne), Immediate Past President (Odi), Treasurer (Gagan), Program Manager
- **Board of Directors:** 5 of 7 seated, including the three officers
- **Member companies:** J&J, EY, BCG, Walmart, Pfizer
- **December in-person meeting will reshuffle 2 directors** → roles must be reassignable from a screen, never from code

### Volunteers

- Under 20 including Summit, 5 non-Summit
- Mid-level managers at member companies — busy, phone-first, low tolerance for clunky software

**Total system size: ~30 people.** That number shapes every decision in this document. This is not an enterprise product. It is a very good tool for thirty specific people.

---

## 3. Access model — the hard requirement

The brief puts access first, so it is designed first and enforced at the data layer, not hidden in the UI.

### 3.1 Five role tiers

| Level | Role | Default posture |
|---|---|---|
| 1 | **President** | Master access. Sees everything, grants everything. The only role that can edit the permission matrix. |
| 2 | **Officer** | Board-wide visibility: finance, all workstreams, all PII. Cannot change permissions. |
| 3 | **Board Director** | Read across the organisation, write inside own workstreams. No finance edit. |
| 4 | **Workstream Lead** | Full control of their own workstream. Read-only on others. Sees speaker contact data for speakers they own. |
| 5 | **Volunteer** | Only what they are assigned: their tasks, their shift, the public agenda, their channels. No PII, no money, no exports. |

Roles are rows in a table. The December reshuffle is three clicks in Admin, not a deploy.

### 3.2 Permissions are capability keys with a scope

Every permission is `resource:action` plus a scope of `all`, `workstream`, `own` or `none`.

```
tasks:view        all | workstream | own
tasks:edit        all | workstream | own
tasks:assign      all | workstream | none
speakers:view     all | workstream | none
speakers:contact  all | workstream | none      ← the PII gate
speakers:edit     all | workstream | none
sponsors:view / sponsors:edit
vendors:view / vendors:edit
finance:view / finance:edit                     ← budget, vendor amounts, sponsor value
agenda:view / agenda:edit
attendees:view / attendees:contact / attendees:export
questions:view / questions:edit
files:view / files:upload / files:delete
chat:channel.create / chat:dm / chat:announce
retro:view / retro:write
team:view / team:contact
admin:users / admin:roles / admin:permissions / admin:event
```

### 3.3 The default matrix

| Capability | President | Officer | Director | Lead | Volunteer |
|---|---|---|---|---|---|
| tasks:view | all | all | all | all | own |
| tasks:edit | all | all | workstream | workstream | own |
| tasks:assign | all | all | workstream | workstream | — |
| speakers:view | all | all | all | all | — |
| **speakers:contact** | all | all | all | **workstream** | **—** |
| sponsors:view | all | all | all | workstream | — |
| **finance:view** | all | all | — | **own workstream** | **—** |
| finance:edit | all | Treasurer only | — | — | — |
| agenda:view | all | all | all | all | **all (read-only)** |
| attendees:contact | all | all | — | — | — |
| attendees:export | all | all | — | — | — |
| chat:announce | all | all | — | workstream | — |
| retro:write | all | all | all | all | all |
| admin:permissions | **all** | — | — | — | — |

Two deliberate choices worth defending:

- **Volunteers can write retros.** They see the day-of reality nobody else does. The 2024 `Post Summit Review` tab is the single best artefact in those spreadsheets; widening who feeds it is free value.
- **Volunteers see the full agenda, read-only.** A volunteer who doesn't know the run of show is useless on the day. The agenda is not sensitive; the contact list is.

### 3.4 Enforcement

Permission is checked in one place — `lib/authz.ts` — and every data read goes through a scoping helper that narrows the query by workstream or ownership **before** it hits the database. Fields behind `speakers:contact` and `finance:view` are stripped server-side, so a hidden column is genuinely absent from the payload, not merely `display:none`. Every grant, revoke and role change writes an immutable row to the audit log.

---

## 4. Login

**Decision: email + password for V1, magic-link ready.**

These are corporate users on managed laptops; passwords they can store in their own browser are the lowest-friction thing that works offline and in a conference hall with bad wifi. The session is a signed, HTTP-only, SameSite cookie (JOSE / HS256, 30-day sliding expiry). Passwords are bcrypt-hashed.

- **The President invites.** Admin → Team → Invite: name, email, company, role, workstreams. The invitee sets their own password on first open.
- **No public sign-up.** Ever. Thirty known people.
- **Deactivate, never delete.** A departing director's history, decisions and messages stay intact; their login stops. The board reshuffles annually — this matters.
- **Dev quick-switch.** In development only, a role switcher on the login screen lets you see the app as President, Lead or Volunteer instantly. That is how you test the access model without juggling five browsers. It does not exist in production builds.

---

## 5. Features

### 5.1 Dashboard — your summit at a glance

- Hero: the 2026 Summit, countdown, overall progress bar, theme
- Four counters: overdue, due this week, completed, registered attendees
- **My tasks** — not everyone's. The first screen answers "what do I owe, and by when"
- Upcoming deadlines with overdue flags
- Live confirmation rings: speakers, sponsors, logistics (computed, never typed)
- Recent activity and recent messages
- Every tile is scoped: a volunteer's dashboard shows their four tasks, not the organisation's 86

### 5.2 Tasks — the playbook, made real

The heart of the system.

- **Seeded from the `Main Schedule` playbook**: ~55 recurring steps from "Conference Theme/Title Selected" through "Appoint next year's Summit TF", each with a month offset, a category and a default workstream. Create a summit → the year appears, dated backwards from the event.
- Board and list views. Columns: To Do / In Progress / Review / Done.
- Categories carried over from the `Action log`: Summit Logistics, Summit Comms, Summit Invitation, Summit Registration, Gala Dinner, Summit Day Support, plus the non-summit workstreams.
- Fields: owner, due date, priority, workstream, status, notes.
- **Every task has a thread.** This is the feature that kills WhatsApp. The conversation about "Confirm keynote speaker" lives on the task forever, so next year's lead can read why it took three weeks.
- Filters: mine, my workstream, overdue, by category, by owner.
- Dependencies are deliberately out of scope for V1 — a thirty-person team needs owners and dates, not a Gantt chart.

### 5.3 Speakers — the outreach pipeline

A faithful port of the 2026 tracker's 18 columns, because they got it right: Priority, Workstream, Name, Title, Company, Contact Email, **Source/Connection** (who owns the relationship), Speaker Type, Topic/Session Fit, Status, Headshot, Bio, Registered, Response, Confirmed, Prep Call Needed, Notes, Last Updated.

Added on top:

- **Pipeline Summary is computed.** The 2026 file maintains "17 targets / 11 sent / 10 confirmed / 1 follow-up" by hand. It is now a query.
- **A/B/C prioritisation** from the 2024 list, with its real meaning preserved: A = invite in December, B = invite in January, C = pause.
- Bio and headshot shown as a readiness checklist, because the program book deadline is what actually bites.
- Contact email and phone sit behind `speakers:contact`.
- Each speaker has a thread, and links to the agenda sessions they appear in.

### 5.4 Agenda — the run of show

Day 1 and Day 2, time-blocked, exactly as the `2026 Agenda` tab models it: time, session title, speakers, moderator, **session owner**, status, notes. Day themes carried through ("Building Smarter Operations" / "Leading Through Change"). Read-only for volunteers, editable by the Summit lead and officers. Printable for the day.

### 5.5 Communications — Slack, done properly

The brief says engage Slack's personality. The parts that make Slack *Slack*, and which are in V1:

- **Channels per workstream**, auto-created and auto-joined by membership: `#general`, `#summit`, `#speakers`, `#partnerships`, `#comms`, `#academic`, `#professional-dev`, `#volunteers`, `#random`
- **Direct messages** between any two members
- **Threads** — on channel messages *and* on every object in the system
- **@mentions** of people and `@channel`, producing real notifications
- Unread counts and a bold-channel rail, read state per user
- File and image attachments inline
- Message editing and deletion with a tombstone
- Private channels created by officers (the board needs a room)
- Search across messages

Deliberately **not** in V1: emoji reactions, custom emoji, huddles, apps, workflows. They are the fun 20% that costs 60% of the build and nobody at DISCOVER is asking for them yet.

The thing Slack *cannot* do, and this can: **a message on a task, a speaker or a vendor stays attached to that record forever.** That is the entire reason to leave Slack.

### 5.6 Sponsors & Partnerships

Company, tier, value, status (prospect / invited / negotiating / confirmed / declined), owner, contact, logo received, contract signed, notes, thread. Value and contract behind `finance:view`. Confirmation ring on the dashboard. Direct answer to "42 Sponsors Confirmed, 3 pending approvals".

### 5.7 Logistics & Vendors

From `Vendor Management`: vendor, service provided, method of payment, amount, payment status, who responsible — plus venue, room block (with its deadline, which caught them out in 2026), catering, AV, transportation, photographer, signage. Amounts behind `finance:view`; a volunteer sees the vendor and the service, never the price.

### 5.8 Attendees

Registered / confirmed / pending / waitlist, by ticket type (General, VIP, Student). Company and registration status visible to leads; email and phone behind `attendees:contact`; export behind `attendees:export`. The `11Dec mtg` goals are tracked against here: >300 paying registrants, >30 organisations represented.

### 5.9 Open Questions — the blocker list

Straight from the 2026 `Question Tracker`, which is the most under-rated tab in those files: question, status, owner, latest update, due date. It is where "Reach out to Hotel for block extension — August 25 deadline" lives. Surfaced on the dashboard, because an unanswered question is a risk, not a task.

### 5.10 Files

Folders by category (Sponsors, Speakers, Logistics, Marketing, Legal), upload, version-safe naming, preview, and — importantly — files attachable to any record or message. The program book, floorplan, sponsor deck and contracts stop living in inboxes.

### 5.11 Team

Member directory: name, company, title, role, workstreams, status. Contact details behind `team:contact`. Shows who leads what — the question volunteers ask most.

### 5.12 Retro & Archive

The `Post Summit Review` structure, native: **Plus / Delta / Consider for next year**, plus "interested in joining next year's planning team". At cycle close, the retro rolls forward into the next summit's playbook as pre-seeded tasks. This is how the tool gets better every year instead of decaying — and it is the source for the website's Archives and "What members say" pages.

### 5.13 Admin

- **Users:** invite, edit, assign role and workstreams, deactivate
- **Roles & Permissions:** the matrix from §3.3 as an editable grid. The President changes who sees what, live, with an audit trail. This is the screen the brief leads with.
- **Event settings:** name, theme, dates, venue, goals
- **Playbook:** edit the annual task template so next year starts better than this one
- **Audit log:** every permission change, every role change, who and when

---

## 6. Technical design

### 6.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript** | One codebase for UI and API; server components keep scoped data off the client entirely |
| Styling | **Tailwind CSS** + a DISCOVER design-token layer | Consistency enforced by tokens, not by discipline |
| Database | **SQLite via Prisma** for V1 | Zero-setup local testing. Moving to Postgres is a connection-string change and a `provider` line — the schema is written to be portable |
| Auth | Signed JOSE cookie + bcrypt | No third-party dependency, no vendor lock, works offline |
| Realtime | **Polling (3s) on chat and counters** for V1 | Honest tradeoff: thirty users, zero infrastructure. Swap to websockets/SSE when it matters, behind one hook |
| Files | Local disk under `storage/`, served through an authorised route | Never a public URL — file access is permission-checked like everything else |

The deliberate decision throughout: **no service that needs an account, a key, or a bill** to run V1. You should be able to clone, install, run, and test.

### 6.2 Data model

```
Organization
Event              (2026 Summit: theme, dates, venue, goals)
User               → Role, Workstream[] (via Membership)
Role               → RolePermission[]  (capability + scope)
Workstream         → lead, members, channel
Task               → event, workstream, owner, category, due, status, thread
PlaybookStep       (the ~55-step template; monthOffset, category, workstream)
Speaker            → event, owner, 18 tracker fields, sessions[]
Session            → event, day, time, owner, moderator, speakers[]
Sponsor / Vendor / Attendee / OpenQuestion / RetroItem
Channel            → type (public | private | workstream | dm), members
Message            → channel OR (entityType, entityId), author, parent, attachments
FileAsset          → folder, uploader, optional entity link
Notification / ActivityLog / AuditLog
```

The `entityType + entityId` pair on `Message` is what makes threads universal: the same chat component renders a channel, a DM, a task thread and a speaker thread.

### 6.3 Authorisation flow

```
request → session cookie → user + role + memberships
        → can(user, "speakers:contact")  → scope: all | workstream | none
        → scopeFilter() narrows the Prisma query BEFORE it runs
        → serializer strips gated fields from the payload
        → component renders what survived
```

A volunteer requesting a speaker record does not receive an email field with the UI hiding it. The field is not in the response.

### 6.4 Design system

Pulled from the reference mockups, which set the direction well:

- **Navy** `#0B2545` — rail, headers, hero
- **DISCOVER blue** `#1D6FE0` — primary actions, links, the brand arc
- **Sky** `#E8F1FD` — selected states
- Semantic: green `#17A34A` confirmed/done, amber `#D97708` pending/review, red `#DC2626` overdue
- Canvas `#F4F6FA`, cards white with a 1px `#E3E8EF` border and a very soft shadow
- Type: Inter — 13/14px body, tight numeric tabular figures for all the counters
- Radius 10px, 8px spacing grid, generous white space
- Logo: the DISCOVER wordmark with its arc and **Educate. Connect. Lead.**

The reference images are a direction, not a pixel spec. The things taken from them literally: the left rail order, the countdown hero, the kanban, the confirmation rings, the Slack-style chat layout.

---

## 7. What V1 is and is not

**V1 ships:** login and sessions · the full role and permission matrix with a live editor · dashboard · tasks with the seeded playbook and threads · speakers with the 18-field pipeline and computed summary · agenda · sponsors · vendors/logistics · attendees · open questions · files · chat with channels, DMs, threads, mentions and unread state · team directory · retro · admin with audit log · seeded with the **real 2026 summit data** so it is testable on first run.

**V1 does not ship:** emoji reactions, huddles, a public website, payment collection, email sending, calendar sync, mobile apps, SSO. Each is a deliberate cut, and each is a clean addition later.

**The honest risks:**

1. *Polling instead of websockets* — fine at thirty users, visibly wrong at three hundred. Swap is isolated to one hook.
2. *SQLite* — single-writer. Correct for local testing, replace with Postgres before real deployment.
3. *Local file storage* — replace with S3-compatible storage at deploy time.
4. *The permission matrix is powerful enough to lock yourself out* — the President role's `admin:permissions` is pinned and cannot be revoked, even by the President.

---

## 8. What I still need

1. **The DISCOVER logo files** (SVG or high-res PNG) — V1 renders a faithful CSS/SVG reconstruction from the mockups until the real asset lands.
2. **Access to `D:\DISCOVER_Website_Prototype`**, if that folder holds the official brand assets — the request was blocked.
3. **Confirmed 2026 summit dates and venue** — the agenda tab has the run of show but the file's dates and venue were not readable.
4. A decision on **where this gets deployed**, when V1 passes your testing.
