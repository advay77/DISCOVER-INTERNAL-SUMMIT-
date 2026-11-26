# DISCOVER OS — Product Requirements Document

| | |
|---|---|
| **Product** | DISCOVER OS — the internal operating system for DISCOVER Supply Chain |
| **Owner** | Advay Anand |
| **Version** | 2.0 — redesigned, deployed, in use |
| **Date** | 26 November 2026 |
| **Replaces** | Version 1.0 (25 November 2026). See §11 for what changed |
| **Scope** | The whole year: the Annual Summit **and** the webinars, networking evenings and campus sessions around it |
| **Live at** | https://discover-os-chi.vercel.app (Vercel + Supabase) |
| **Related** | [README.md](README.md) (run it) · [DEPLOY.md](DEPLOY.md) (host it) · [PRODUCT-REVIEW.md](PRODUCT-REVIEW.md) (design rationale) · CREDENTIALS.md (accounts, local only) |

---

## 1. Problem

DISCOVER runs a real organisation: six workstreams, a board of seven, about twenty
volunteers, and member companies including J&J, Pfizer, Walmart, EY, BCG and Merck. Its
flagship is a two-day summit with a speaker pipeline, a gala, vendors, sponsors and student
programmes.

Before DISCOVER OS, all of it was coordinated across three spreadsheets and three messaging channels:

| The work lived in | The conversation about it lived in |
|---|---|
| `DISCOVER 2024 Summit Planning.xlsx` — 19 tabs | WhatsApp |
| `DISCOVER_Summit_2026_Speaker_Outreach_Tracker.xlsx` — 9 tabs | Email |
| `DISCOVER Project Tracker` — workstreams, board, volunteers | Phone calls |

So a fact like *"Yahne is visiting the venue to review room configurations"* lived in one
spreadsheet cell. The discussion, the photos, the contract and the decision lived somewhere
else. Nothing connected them, and nothing carried them into next year. The 2026 cycle lost
its hotel room block to a deadline in a cell nobody was watching.

**Why it matters now:** the December board meeting changes two director seats, and handover
is manual and loses information. The volunteers are busy mid-level managers who work from
their phones. They will not learn a clunky tool.

---

## 2. Goals and non-goals

### Goals

| # | Goal | How we know |
|---|---|---|
| G1 | One place for the whole cycle — no parallel trackers | Zero new spreadsheets created for the 2027 cycle |
| G2 | Conversation attached to the work, not floating beside it | >60% of task-related messages posted on the task, not in a channel |
| G3 | Not everyone sees everything, and the President controls it | Every permission, role, member and workstream change made in-app, never in code |
| G4 | Volunteers actually use it, on their phones | >70% of volunteers sign in weekly in the month before the summit |
| G5 | The cycle gets better each year | Retro items roll into next year's playbook |
| G6 | Easier and nicer to use than Gmail and WhatsApp | Qualitative: board and volunteers say so after one cycle |

### Non-goals (this version)

Public website · payment collection · outbound email · calendar sync · native mobile apps
· SSO · attendee-facing features · a home-built voice/video stack (calls use Jitsi, §4.4).

---

## 3. Users

| Persona | Count | Job to be done |
|---|---|---|
| **President** | 1 | Know where the cycle stands; decide who sees what; manage every account |
| **Officers** (Past President, Treasurer, Program Manager) | 3 | Run budget, programme and the summit |
| **Board Directors** | 3 | Oversight plus their own workstream |
| **Workstream Leads** | 2 | Run one workstream end to end |
| **Volunteers** | 12 seeded, ~20 expected | Do their part, know the run of show, talk to their lead |

**About 30 people in total.** This is not an enterprise product. It is a very good tool for a
known group of about thirty.

---

## 4. Communication

This is the part that replaces WhatsApp, so it is specified in full.

### 4.1 The model

Every message lives in one of two places, both inside the product:

1. **A channel**: an ongoing room, like Slack.
2. **An object thread**: a conversation attached to one task, speaker, event or session.

Object threads are why the product replaces Slack rather than sitting next to it. A
discussion about a task stays on that task permanently, so next year's lead can read why it
took three weeks.

### 4.2 Channels

Channels follow the organisation, so nobody has to decide where to post. Eleven are seeded:

| Channel | Type | Members |
|---|---|---|
| `#general`, `#volunteers`, `#speakers`, `#random` | Public | Everyone |
| `#summit`, `#partnerships`, `#comms`, `#academic`, `#professional-dev` | Workstream | Members of that workstream — joining the workstream joins the channel |
| `#board` | Private | Officers and directors |
| `#finance` | Private | Board only |

Direct messages are available to anyone with `chat:dm`. People with `chat:channel.create`
can create channels. Admins manage channel membership.

### 4.3 Chat capabilities

| Capability | Requirement |
|---|---|
| **Delivery** | New messages appear without a refresh: instantly with realtime (§4.5), otherwise within 3 seconds |
| **History** | Opens on the latest 50 messages; *Load earlier messages* pages back 50 at a time; no limit on channel size |
| **Text** | Enter sends, Shift+Enter is a new line, consecutive messages from one person are grouped, links are clickable |
| **Day separators** | Today / Yesterday / date between days |
| **Your messages** | Shown as *You*, lightly tinted |
| **Reply** | Quote any message; the reply shows the quote, and clicking it jumps to the original |
| **Edit** | Your own messages only, marked *(edited)*; ↑ in an empty box edits your last one |
| **Delete** | Your own; admins can remove anyone's. Leaves a "This message was deleted" tombstone, and the body is cleared |
| **@mentions** | Highlighted; the person gets a notification |
| **Reactions** | 👍 ✅ 🙌 👀 🎉 ❓, toggled per person and counted |
| **Attachments** | Photos and video inline, any file as a card, drag-and-drop anywhere on the panel, voice notes recorded in the browser |
| **Unread** | Per-conversation unread badge, last-message preview and time in the channel list, a dot on the bell |
| **New-message pill** | If you have scrolled up, new messages show "N new messages ↓" instead of pulling you down |
| **Touch** | On phones and tablets a tap on a message shows its actions; there is no hover |
| **Search** | Global search covers messages in conversations you belong to |

### 4.4 Calls

Each channel has a **Start call** button. It opens a private Jitsi Meet room for that channel
and posts the join link in the channel. The room name is derived from a server secret, so
only people who can see the channel can find it. Nothing needs to be installed, and the
call runs in the browser.

*Why not a built-in huddle:* peer-to-peer calls in the browser fail on many office and
campus networks unless there is a paid relay (TURN) server. Jitsi already handles that.
V1.0 described a built-in huddle, but it was never present in the code.

### 4.5 Realtime and efficiency

| ID | Requirement |
|---|---|
| C1 | After the first load, a client asks only for what changed since its cursor: new, edited, deleted or reacted-to messages |
| C2 | Polling stops while the tab is hidden and refreshes when it returns |
| C3 | With Supabase Realtime configured, the server sends an **empty** "changed" ping after every write, on a topic derived from the session secret. The browser re-fetches through the API. No message content crosses the socket, and permissions apply exactly as for a normal read |
| C4 | Without realtime keys the product still works, polling every 3 s. With them it polls every 30 s as a safety net |
| C5 | The composer shows **Live** (green dot) or **Auto-refreshing**, so the state is visible |

### 4.6 What a person must not see

- Private channels are not listed to non-members. Workstream channels belong to their members.
- Search covers only conversations the person belongs to.
- Object threads, and reactions on them, are gated by the capability of the parent object.
  Without it the API returns **403**, not an empty list.
- Realtime topics cannot be guessed, and a topic only tells the browser to re-fetch through
  a permission-checked API.

---

## 5. Access model

### 5.1 The rule

DISCOVER's own instruction: **everyone can see everyone's work.** Visibility is open by
default.

**Finance is the single exception.** That workstream is marked `restricted`. Its tasks,
vendors, sponsors, events and channel disappear for anyone without `finance:view`. The rule
is enforced in one place, not remembered page by page.

Control is separate from visibility. Everyone can read. Editing follows who owns the work,
and administration sits with the President.

### 5.2 Roles

| Level | Role | Default posture |
|---|---|---|
| 1 | **President** | Master access. The only role that edits the permission matrix, role names and workstreams. Cannot be removed from the permission editor |
| 2 | **Officer** | Board-wide visibility including money and personal data |
| 3 | **Board Director** | Reads across the organisation, writes in own workstreams, no money |
| 4 | **Workstream Lead** | Full control of one workstream, read-only elsewhere |
| 5 | **Volunteer** | The whole programme (tasks, speakers, agenda, sponsors, attendees, files, retro). Edits only their own work. Finance and Admin are closed |

These are **defaults**. The President can change any of them in the matrix, and role names
are editable.

### 5.3 Capabilities

Every permission is `resource:action` with a scope of `all` / `workstream` / `own` / `none`.
There are **32 capabilities in 12 groups**: Tasks, Speakers, Agenda, Sponsors, Logistics,
Finance, Attendees, Files, Communications, Team, Retro and Admin. The President edits them
in a live grid. Changes apply immediately and are audited.

### 5.4 Enforcement

| ID | Requirement |
|---|---|
| A1 | Permission is decided in exactly one module (`lib/authz.ts`) |
| A2 | Scope narrows the database query **before** it runs |
| A3 | Gated fields are stripped server-side. A hidden field is absent from the response, not hidden with CSS |
| A4 | Every API route and server action re-checks; a page redirect is not the control |
| A5 | The President cannot be removed from the permission editor (server-side lock) |
| A6 | There is always at least one active President; you cannot deactivate yourself |
| A7 | Every permission, role, member, password, workstream, export and file-deletion change writes to the audit log |
| A8 | People are deactivated, never deleted, so their history survives |
| A9 | Changing someone's email, role or active status, or setting their password, signs them out everywhere |

---

## 6. Functional requirements

### 6.1 Sign-in and accounts

| ID | Requirement |
|---|---|
| L1 | One sign-in form: email and password per person. No shared password, no public sign-up |
| L2 | Wrong email or password gives one message for both, so the form cannot reveal which accounts exist. Rate-limited per address and per IP |
| L3 | Session is a signed, HTTP-only, SameSite cookie; passwords are bcrypt-hashed |
| L4 | Admins add members with a first password (with a *Generate* helper) and can set a new one later |

### 6.2 Events and the annual playbook

| ID | Requirement |
|---|---|
| E1 | Every event has a kind (Summit, Webinar, Networking, Academic, Other), a date, an owner and a workstream |
| E2 | Tasks, files and a discussion thread attach to **any** event |
| E3 | Smaller events carry their guest inline; only the summit has the full speaker pipeline |
| E4 | The summit's deep modules appear only on the summit |
| E5 | Events list upcoming and past, filterable by kind |
| P1 | Creating a summit instantiates the ~55-step playbook from the trackers, dated backwards from the event |
| P2 | Changing the event dates in Admin moves the countdown, playbook and agenda dates with them |

### 6.3 Modules

| Module | Requirements |
|---|---|
| **Dashboard** | Greeting; KPI strip (overdue, due this week, completed, on your plate, speakers, sponsors, registered, days to go); speaker pipeline with a task-pipeline tab; next deadlines; **speakers to chase** (invited or replied, not yet confirmed); your tasks, upcoming events, recent messages. Every tile is scoped to the viewer |
| **Tasks** | Summary (open, overdue, due this week, % complete). Filters: Everyone / My tasks / workstream, plus quick filters with live counts (overdue, due this week, no owner, no due date, high priority, completed) that combine with page search. Kanban columns scroll on their own; cards are sorted overdue first and carry a "days past due" note. Drag and drop on desktop and a status menu on every card for touch. "+ Add task" in each column. List view. Each task has its own thread |
| **Summit summary** | The whole summit on one page: countdown, readiness score, progress per workstream, speaker pipeline, run of show per day, sponsors by tier, vendors, registrations against goal, and a **Needs attention** list. Respects permissions; money only with `finance:view` |
| **Speakers** | Card grid with status, session fit, bio/photo readiness, priority, owner, and contact (behind `speakers:contact`). Status filters. Pipeline summary computed, not typed |
| **Run of show** | Two-day vertical timeline coloured by kind (keynote, panel, session, gala, break, meal), with duration, room, status, owner, moderator and speakers. With `agenda:edit`: add, edit and delete sessions; sessions order by the clock; end-before-start is refused; changes logged. Read-only otherwise. Printable |
| **Sponsors** | Tier, status, logo received, contract signed; value behind `finance:view` |
| **Logistics** | Venue, room block, vendors and payment status; amounts behind `finance:view` |
| **Attendees** | Registrations against the board's goals (>300 registrants, >30 organisations); emails behind `attendees:contact`; CSV export behind `attendees:export`, audited |
| **Messages** | §4 in full |
| **Files** | Summary (files, size, this week, folders in use). Folder cards, including *All files* and the chat-attachment folder. Search by name. Typed file rows (PDF, IMG, VID, DOC…) with uploader, size and age. Drag-and-drop upload. Delete: your own, or any with `files:delete`, audited; files attached to a message are deleted with the message. Every download is permission-checked |
| **Team** | Summary; Board cards; workstream cards with lead, members and task progress; a searchable **Directory** filterable by role. Email only with `team:contact`; Finance hidden from those who cannot see it |
| **Retro** | Counts for Plus / Delta / Consider plus number of voices; a composer with a kind selector (Ctrl/⌘+Enter adds); tinted columns with author and time. Everyone, including volunteers, can write |
| **Admin** | *Roles & permissions*: live matrix. *People*: add members; edit name, email, title, company, phone, avatar colour, role, workstreams, active; set a password; search. *Workstreams & roles*: rename, recolour, describe and re-lead workstreams; rename and describe roles. *Event*: dates, venue, themes, goals. *Channels* and *Audit log* |
| **Search** | Tasks, speakers, people and messages. Case-insensitive on SQLite and Postgres |

### 6.4 Retired

| What | Why | What happens to it |
|---|---|---|
| **Open Questions** module | Duplicated tasks and chat. The blocker list is now tasks plus the *Needs attention* list on the summary | Nav link, page, dashboard card and the two matrix rows removed. `/questions` redirects to the dashboard so old links still work. The data is kept in the database |
| **Built-in voice huddle** | Never present in code, and unreliable without a relay server | Replaced by per-channel Jitsi calls (§4.4) |
| **Two sign-in doors** | Added friction without adding security | One form (§6.1) |

---

## 7. Design system

| Element | Decision |
|---|---|
| **Brand** | The DISCOVER Supply Chain logo in the sidebar, phone header and login. On dark surfaces it sits on a white plate |
| **Canvas** | Warm grey background, white rounded panels (20 px), soft shadows, no hairline-heavy tables |
| **Colour** | Near-black for primary actions and the active nav item. One lime accent for the single figure that matters on a screen (days to go, readiness, unread). Status colours: forest (good), brass (attention), brick (late), brand blue (in progress) |
| **Type** | Inter for text, Inter Tight for figures and headings |
| **Theme** | Light and dark, from one set of CSS variables. Toggle in the top bar and on the login page; follows the device by default; applied before first paint |
| **Components** | Pill buttons and filter chips with counts; stat tiles; rounded modals; empty states with a next step |
| **Responsive** | Sidebar on desktop; top bar plus bottom tab bar with a *More* sheet on phones. Kanban columns swipe on phones. Tables become cards or rows that never scroll sideways |

---

## 8. Non-functional requirements

| ID | Requirement | Status |
|---|---|---|
| N1 | Usable on a phone at conference-hall connection quality | Met — every page checked at 360–1440 px in light and dark with no horizontal overflow |
| N2 | Light on the host | Met — changes-only polling, paused when hidden; realtime optional |
| N3 | Same code on SQLite (local) and Postgres (hosted) | Met — provider switched at build; schema changes are additive with defaults |
| N4 | Reduced motion respected; visible keyboard focus; labelled controls | Met |
| N5 | Files never served from a public URL | Met — every read permission-checked; files in Supabase Storage are served through short-lived signed links |
| N6 | Audit log immutable from the UI | Met |
| N7 | Every release is tested end to end before merge | Met — scripted browser suite against a production build (51 checks at last run), plus a responsive audit |

---

## 9. Success metrics

| Metric | Target by end of the 2027 cycle |
|---|---|
| New spreadsheets created for the cycle | 0 |
| Weekly active volunteers in the final month | >70% |
| Task-related messages posted on the task rather than in a channel | >60% |
| Overdue tasks on summit day | 0 |
| Speaker bios and headshots in before the programme-book deadline | 100% |
| Summit readiness score four weeks out | ≥ 80% |
| Post-summit survey | >4.5 / 5 (the board's own goal) |

---

## 10. Open questions

| # | Question | Owner | Blocking |
|---|---|---|---|
| 1 | Confirmed summit dates and venue | President | The countdown, the playbook dates and the *Needs attention* list |
| 2 | Add the Supabase realtime keys to Vercel (DEPLOY.md → Realtime chat) | Whoever holds the Vercel account | Instant chat; until then chat refreshes every 3 s |
| 3 | Real member accounts; deactivate the seeded ones | President | Go-live for the board |
| 4 | Turn off Vercel Deployment Protection before sharing the link | Vercel owner | Anyone but the owner opening the site |
| 5 | Do volunteers get `@channel`, or does it stay with officers? | President | A matrix default, changeable in-app |
| 6 | Retention — how long do messages and files live? | Board | Nothing yet; everything is kept |

---

## 11. Release history and plan

| Release | Contents | Status |
|---|---|---|
| **1.0** | Modules, access model, seeded 2026 cycle | Shipped |
| **1.1 — Redesign** (PR #1) | New design system, dashboard, light/dark theme, touch status menu on tasks, mobile fixes | Shipped |
| **1.2 — Tasks** (PR #2) | Tasks page redesign, quick filters with counts, search, scrolling columns, case-insensitive search on Postgres | Shipped |
| **1.3 — Summit & Admin** (PR #3) | Logo, Summit summary, editable run-of-show timeline, full admin control of people, roles and workstreams, Open Questions retired, speaker cards | Shipped |
| **1.4 — Chat** (PR #4) | Fixed messages stopping after 200 in a channel; changes-only polling; Supabase realtime; reply, edit, delete; load older; chat redesign; Jitsi calls | Shipped |
| **1.5 — Organisation** | Files (search, folders, typed rows, delete, drag-and-drop upload), Team (directory, workstream progress), Retro (composer, tinted columns), this PRD | This release |
| **Next** | Turn on realtime in production; real accounts; confirmed dates and venue | — |
| **Later** | Email digests of overdue tasks and mentions; calendar export of the run of show; retro → next-year playbook in one click; pinned messages; typing and online indicators | — |
| **Later still** | Public summit page and a website archive fed by the retro | — |
