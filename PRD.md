# DISCOVER OS — Product Requirements Document

| | |
|---|---|
| **Product** | DISCOVER OS — the internal operating system for DISCOVER |
| **Owner** | Advay Anand |
| **Version** | 1.0 — V1 built and running |
| **Date** | 25 November 2026 |
| **Scope** | The whole year: the Annual Summit **and** the webinars, networking evenings and campus sessions around it |
| **Related** | [PRODUCT-REVIEW.md](PRODUCT-REVIEW.md) (design rationale) · [CREDENTIALS.md](CREDENTIALS.md) (accounts) · [README.md](README.md) (how to run it) |

---

## 1. Problem

DISCOVER runs a real organisation — five workstreams, a board of seven, twenty volunteers,
member companies including J&J, Pfizer, Walmart, EY, BCG and Merck, and one flagship
two-day summit with a speaker pipeline, a gala, vendors, sponsors and student programmes.

All of it is coordinated across three spreadsheets and three messaging channels:

| The work lives in | The conversation about it lives in |
|---|---|
| `DISCOVER 2024 Summit Planning.xlsx` — 19 tabs | WhatsApp |
| `DISCOVER_Summit_2026_Speaker_Outreach_Tracker.xlsx` — 9 tabs | Email |
| `DISCOVER Project Tracker` — workstreams, board, volunteers | Phone calls |

So a fact like *"Yahne is visiting the venue to review room configurations"* exists as a
cell in a Question Tracker, while the discussion, the photos of the room, the contract and
the decision are scattered elsewhere. Nothing connects them. Nothing remembers them next
year. The 2026 tracker's own Instructions tab says it plainly: *"Avoid creating separate
trackers."* They diagnosed it correctly and patched it with discipline. Discipline does not
scale to thirty people.

### Why now

- The December in-person board meeting reshuffles two director seats — handover is manual
  and lossy.
- The 2026 cycle already lost its hotel room block to a missed deadline sitting in a
  spreadsheet cell nobody was watching.
- Volunteers are mid-level managers at member companies. They are busy, phone-first, and
  will not learn a clunky tool.

---

## 2. Goals and non-goals

### Goals

| # | Goal | How we know |
|---|---|---|
| G1 | One place for the whole cycle — no parallel trackers | Zero new spreadsheets created for the 2027 cycle |
| G2 | Conversation attached to the work, not floating beside it | >60% of task-related messages posted on the task, not in a channel |
| G3 | Not everyone sees everything, and the President controls it | Permission changes made in-app, never by code change |
| G4 | Volunteers actually use it | >70% of volunteers sign in at least weekly in the month before the summit |
| G5 | The cycle gets better each year | Retro items roll into next year's playbook as pre-seeded tasks |
| G6 | Easier and nicer to use than Gmail | Qualitative: board and volunteers say so after one cycle |

### Non-goals (V1)

Public website · payment collection · outbound email sending · calendar sync · native mobile
apps · SSO · attendee-facing features of any kind. Each is a clean addition later; none is
required to replace the spreadsheets and WhatsApp.

---

## 3. Users

| Persona | Count | Job to be done | Pain today |
|---|---|---|---|
| **President** (Yahne) | 1 | Know where the cycle stands; decide who sees what | Chases status across three tools; access is "whoever has the link" |
| **Officers** (Past President, Treasurer, Program Manager) | 3 | Run budget, programme and the summit | Budget lives in a cell; vendor amounts visible to anyone with the file |
| **Board Directors** | 3 | Oversight plus their own workstream | No single view; find out late |
| **Workstream Leads** (Academic, Comms) | 2 | Run one workstream end to end | Their work is buried inside a shared summit tracker |
| **Volunteers** | 20 | Do their assigned part, know the run of show | Sent whole spreadsheets they shouldn't see; told things in WhatsApp that scroll away |

**Total system size: 29 people.** This shapes every decision below. This is not an
enterprise product; it is a very good tool for twenty-nine specific people.

---

## 4. How communication works — especially for volunteers

This is the part that replaces WhatsApp, so it is specified in full.

### 4.1 The model

**Every message lives in exactly one of two places, and both are inside the product:**

1. **A channel** — an ongoing room, like Slack.
2. **An object thread** — a conversation attached to one task, speaker, sponsor, vendor,
   question or session.

The second is the reason to leave Slack. In Slack, "Confirm keynote speaker" is discussed in
`#summit`, then scrolls away. Here the conversation is *on the task*, permanently, so next
year's lead reads why it took three weeks.

### 4.2 Channels, and who is in them

Channels are not created ad hoc. They follow the organisation, so nobody has to decide
where to post.

| Channel | Type | Who is in it |
|---|---|---|
| `#general` | Public | Everyone — all 29 |
| `#volunteers` | Public | Everyone; the day-of coordination room |
| `#speakers` | Public | Everyone who can see the speaker pipeline |
| `#random` | Public | Everyone |
| `#summit` | Workstream | Members of the Annual Summit workstream |
| `#partnerships` | Workstream | Members of Partnerships |
| `#comms` | Workstream | Members of Communications |
| `#academic` | Workstream | Members of Academic Engagement |
| `#professional-dev` | Workstream | Members of Professional Development |
| `#board` | Private | Officers and directors only |

**Joining a workstream joins its channel automatically.** Leaving removes it. A volunteer
assigned to the Summit workstream lands in `#general`, `#volunteers`, `#random` and
`#summit` — four rooms, not thirteen — which is deliberately a short list.

**Direct messages** are available to everyone with `chat:dm`, so a volunteer can message
their lead without going through a channel.

### 4.3 What a volunteer can do in chat

Everything a person expects from a modern messenger:

| Capability | Detail |
|---|---|
| **Text** | Enter sends, Shift+Enter for a new line, message grouping by author and time |
| **@mentions** | `@Mandy` highlights and produces a notification for that person |
| **Photos** | Uploaded and rendered inline; click to open full size |
| **Videos** | Inline player with controls |
| **Any file** | PDF, spreadsheet, deck — shown as a card with name and size, downloaded through a permission-checked route |
| **Drag and drop** | Drop files anywhere on the message panel |
| **Voice notes** | Record in the browser, attached as an inline audio player with its length |
| **Reactions** | 👍 ✅ 🙌 👀 🎉 ❓ — tap to add or remove, counted per emoji |
| **Voice huddle** | A live voice room on any channel. Join, mute, see who is in it, leave |
| **Unread** | Per-channel unread counts, bold channel names, a dot in the top bar |
| **Search** | Finds messages across every channel the person is a member of |

### 4.4 The voice huddle

A huddle belongs to a channel, exactly like Slack's. Anyone in that channel sees the huddle
bar, who is currently talking, and a Join button. Audio is peer-to-peer WebRTC; presence and
signalling are polled through the app's own API, so there is no third-party calling service
and no account to create. Muting is per person and visible to everyone in the room.

**Scope note:** V1 is voice only, built for a handful of people at a time — the day-of
coordination case ("we are at the registration desk and the signage is wrong"), not a
30-person all-hands. Video calling and screen sharing are explicitly out of V1.

### 4.5 What a volunteer must not see

Communication is scoped like everything else:

- They are not in `#board`, and private channels are not listed to non-members.
- They are not in workstream channels they do not belong to.
- Search only searches channels they are a member of.
- Object threads are gated by the capability that governs the parent object — a volunteer
  with no `speakers:view` gets **403** from the speaker thread API, not an empty list.

---

## 5. Access model

The brief led with access, so it is specified first and enforced at the data layer.

### 5.0 The rule

DISCOVER's own instruction: **everyone can see everyone's work.** Twenty-odd
people already share three spreadsheets, so hiding the programme from each
other helps nobody. Visibility is open by default.

**Finance is the single exception.** The sixth workstream — budget, vendor
amounts, sponsorship income — is led by the Treasurer and open to the board
only. It is marked `restricted` on the workstream itself, so its tasks, open
questions, vendors, sponsors and channel disappear for anyone without
`finance:view`, enforced in one place rather than remembered per page.

Control is separate from visibility: everyone reads, editing follows who owns
the work, and Admin stays with the President and officers.

### 5.1 Roles

| Level | Role | Posture |
|---|---|---|
| 1 | **President** | Master access. The only role that can edit the permission matrix, and it cannot be taken from her |
| 2 | **Officer** | Board-wide visibility including money and PII. Cannot change permissions |
| 3 | **Board Director** | Reads across the organisation, writes in own workstreams, no money |
| 4 | **Workstream Lead** | Full control of one workstream, read-only elsewhere, speaker contacts only for speakers they own |
| 5 | **Volunteer** | The whole programme — tasks, speakers, agenda, sponsors, attendees, files, retro. They edit their own work, and Finance is closed to them |

### 5.2 Capabilities

Every permission is `resource:action` with a scope of `all` / `workstream` / `own` / `none`,
across 34 capabilities in nine groups (Tasks, Speakers, Agenda, Sponsors, Logistics,
Finance, Attendees, Communications, Admin). The President edits them in a live grid.

Two deliberate choices:

- **Volunteers can write retro notes.** They see the day-of reality nobody else does.
- **Volunteers see the full agenda, read-only.** A volunteer who doesn't know the run of
  show is useless on the day. The agenda is not sensitive; the contact list is.

### 5.3 Enforcement requirements

| ID | Requirement |
|---|---|
| A1 | Permission is decided in exactly one module (`lib/authz.ts`) |
| A2 | Scope narrows the database query **before** it runs, never after |
| A3 | Gated fields are stripped from the response server-side — a hidden field is absent, not CSS-hidden |
| A4 | Every API route re-checks; a page redirect is not the control |
| A5 | The President cannot be removed from the permission editor; the lock is in the server action |
| A6 | There must always be at least one active President |
| A7 | Every permission change, role change, invite and export writes to an immutable audit log |
| A8 | People are deactivated, never deleted — their history, decisions and messages survive |

**Verified in V1:** as a volunteer, `/speakers` redirects to a no-access page explaining
which role would be needed; `/api/attendees/export` returns 403; the speaker thread API
returns 403; the Logistics page renders vendors with no Amount column present in the payload.

---

## 6. Functional requirements

### 6.1 Login

| ID | Requirement |
|---|---|
| L1 | Two doors on the sign-in screen: **Board & officers** and **Volunteers** |
| L2 | The door is part of the sign-in — the wrong door is refused with a message naming the right one |
| L3 | Email and password per person. No shared password, no public sign-up, no self-serve reset |
| L4 | Session is a signed, HTTP-only, SameSite cookie with a 30-day sliding expiry; passwords are bcrypt-hashed |
| L5 | The President invites members; the system generates a unique first password recorded in the audit log |

### 6.2 The annual playbook

| ID | Requirement |
|---|---|
| P1 | Creating a summit instantiates ~55 recurring steps taken verbatim from the `Main Schedule` tab |
| P2 | Each step carries a month offset, category and default workstream, and is dated backwards from the event |
| P3 | Changing the event dates re-dates the plan |
| P4 | The playbook template is editable in Admin, so next year starts better than this one |

### 6.2b Events — the summit is one of several

The Project Tracker is explicit: *"Main event - Annual Summit; other events -
webinars, earth day in person, etc."* The product treats an event as a first
class thing, of which the summit is one kind.

| Kind | What it is | Who runs it |
|---|---|---|
| **Annual Summit** | The two-day flagship. Carries the full machinery: speaker pipeline, run of show, sponsors, logistics, registration | Annual Summit workstream |
| **Webinar** | The Professional Development Speaker Series — about an hour, online, one guest and an interviewer | Professional Development |
| **Networking** | In person: the Earth Day evening, a panel hosted at a member's office | Professional Development |
| **Academic** | Sessions with schools and university supply chain programmes | Academic Engagement |
| **Other** | Anything else a workstream runs | Any |

Requirements:

| ID | Requirement |
|---|---|
| E1 | Every event has a kind, a date, an owner and a workstream |
| E2 | Tasks, open questions, files and a discussion thread attach to **any** event, not only the summit |
| E3 | Smaller events carry their guest inline — name, title, profile link, host — rather than through the speaker pipeline, which only the summit needs |
| E4 | The summit's deep modules appear only on the summit; a webinar page is not cluttered with sponsors and floorplans |
| E5 | The events list shows upcoming and past across every kind, filterable by kind |
| E6 | An event inside a restricted workstream follows the same rule as everything else in it |

Seeded from the trackers: the 2026 Summit, plus **six real webinars and panels**
from the 2024 "Monthly Webinar" tab, plus the Earth Day evening and a campus
session named in the Project Tracker.

### 6.3 Modules

| Module | Core requirements |
|---|---|
| **Dashboard** | Countdown, cycle progress, your tasks (not everyone's), upcoming deadlines, confirmation rings, open questions, recent messages — every tile scoped to the viewer |
| **Tasks** | Board and list, drag to change status, owner, due date, priority, category, workstream, and a thread on every task |
| **Speakers** | The 2026 tracker's 18 fields; pipeline summary computed not typed; A/B/C priority with its real meaning; bio and headshot as a programme-book readiness check; contact behind `speakers:contact` |
| **Agenda** | Two-day run of show with time blocks, session owner, moderator, speakers, day themes; read-only for volunteers; printable |
| **Sponsors** | Tier, value, status, logo received, contract signed; value behind `finance:view` |
| **Logistics** | Venue, room block, vendors, service, payment method and status; amounts behind `finance:view` |
| **Attendees** | Registration counts against the board's goals (>300 registrants, >30 organisations); emails behind `attendees:contact`; CSV export behind `attendees:export` and audited |
| **Open questions** | The blocker list — question, status, owner, latest update; surfaced on the dashboard |
| **Communications** | Section 4 in full |
| **Files** | Folders, upload, permission-checked downloads, attachable to records and messages |
| **Team** | Directory by workstream; contact details behind `team:contact` |
| **Retro** | Plus / Delta / Consider next year; everyone including volunteers can write; rolls forward into the next playbook |
| **Admin** | Live permission matrix, people and roles, event settings, audit log |

---

## 7. Non-functional requirements

| ID | Requirement | V1 status |
|---|---|---|
| N1 | Works on a phone at conference-hall connection quality | Responsive; chat polls at 3s |
| N2 | No third-party service, account or bill required to run | Met — SQLite, local files, no external APIs |
| N3 | Portable to Postgres without schema change | Met — `provider` + connection string |
| N4 | Reduced motion respected; visible keyboard focus | Met |
| N5 | Files never served from a public URL | Met — every read permission-checked |
| N6 | Audit log immutable from the UI | Met |

### Known V1 tradeoffs

1. **Chat and huddle poll** (3s and 1.8s). Correct at 29 users, visibly wrong at 300. The
   swap to websockets is confined to `Thread.tsx` and `Huddle.tsx`.
2. **SQLite** is single-writer — right for local testing, replace before deployment.
3. **Local disk file storage** — replace with S3-compatible storage at deploy time.
4. **Huddle is mesh WebRTC** — fine to roughly six people, then it needs an SFU.
5. **Summit dates and venue are placeholders** — the source trackers never stated them.

---

## 8. Success metrics

| Metric | Target by end of the 2027 cycle |
|---|---|
| New spreadsheets created for the cycle | 0 |
| Weekly active volunteers in the final month | >70% of 20 |
| Task-related messages posted on the task rather than in a channel | >60% |
| Open questions with an update in the last 7 days | >80% |
| Speaker bios and headshots collected before the programme-book deadline | 100% |
| Post-summit survey | >4.5 / 5 (the board's own goal) |

---

## 9. Open questions

| # | Question | Owner | Blocking |
|---|---|---|---|
| 1 | Confirmed summit dates and venue | President | The countdown and every playbook date |
| 2 | Official DISCOVER logo files (SVG) | Comms | Final brand pass; `components/Logo.tsx` is a reconstruction |
| 3 | Where this is deployed, and who holds the hosting account | President | Go-live |
| 4 | Do volunteers get `@channel`, or stays officers-only? | President | A permission default, changeable in-app |
| 5 | Retention — how long do messages and files live? | Board | Nothing yet; V1 keeps everything |

---

## 10. Release plan

| Milestone | Contents | Status |
|---|---|---|
| **V1** | Everything in §6, seeded with the real 2026 cycle | **Built** |
| **V1.1** | Postgres, S3 storage, deployment, real accounts | Next |
| **V2** | Websockets, video and screen share in huddles, email digests, calendar sync | Later |
| **V3** | Public summit page and the DISCOVER website archive fed by the retro | Later |
