# Is DISCOVER OS production ready?

**Short answer: no — not yet. It is demo ready.**

Everything builds, every feature works, and the access rules hold. What is
missing is not features; it is the handful of things that separate "works when
I test it" from "safe to run an organisation on".

Last verified: 25 November 2026, against the local build and the live deploy.

---

## What is verified working

Each of these was exercised by hand, not assumed.

### Pages — all load for the President, none error

`/dashboard` · `/tasks` · `/questions` · `/speakers` · `/agenda` · `/sponsors` ·
`/logistics` · `/attendees` · `/files` · `/team` · `/retro` · `/admin` · `/chat`

### Features

| Area | Verified |
|---|---|
| Sign in / out | Both doors, wrong-door refusal, session persists |
| Tasks | Board renders, filters, open a task, edit and save, create a task, thread posts |
| Speakers | Pipeline renders, computed summary, detail page, thread |
| Agenda | Two-day run of show with owners and moderators |
| Questions | Inline status update saves |
| Retro | Adding a note saves and appears |
| Chat — text | Send, persist, read back |
| Chat — attachments | Upload, attach to a message, render inline, download |
| Chat — reactions | Toggle on and off, counted |
| Chat — channels | Create with name, purpose, visibility and members; list members; add members; browse and join |
| Files | Upload, permission-checked download |
| Attendees | CSV export (and 403 for anyone without the capability) |
| Search | Finds tasks, speakers, people and messages, scoped to access |
| Admin | Permission matrix writes and audits; people and roles |

### Access rules

| Check | Result |
|---|---|
| Volunteer sees speakers, sponsors, logistics, attendees, files, team, retro | open, as intended |
| Volunteer reaches `/admin` | blocked |
| Volunteer requests `/api/attendees/export` | **403** |
| Finance workstream for a volunteer | hidden from team, chat, tasks |
| Finance workstream for the Treasurer | visible |

### Responsive

No horizontal overflow at **375 · 768 · 1024 · 1440**.

---

## What is NOT production ready

### Blocking

1. **No real database.** The live link runs a SQLite file copied into `/tmp`
   that resets when the instance recycles. Nothing typed into it survives.
   Connect Supabase and this goes away — see [DEPLOY.md](DEPLOY.md).
2. **The demo password is published on the sign-in page.** That is correct for a
   demo and unacceptable for real use. It disappears automatically once
   `DATABASE_URL` points at Postgres.
3. **No backups.** Once there is a real database, it needs a backup schedule.
   Supabase provides this; it has to be turned on.

### Should fix before real use

4. **No rate limiting on sign-in.** Passwords can be guessed as fast as the
   network allows. Needs a lockout or a delay after repeated failures.
5. **No password reset.** The President resets a password by hand, and there is
   no email to send it with. Workable for twenty-one people, awkward beyond.
6. **No email at all.** No invitation emails, no notification digests. Everything
   happens inside the product or not at all.
7. **Sessions cannot be revoked.** A signed cookie lasts thirty days;
   deactivating a person stops new sign-ins but does not kill a live session.
8. **No automated tests.** Everything above was verified by hand. A change could
   break something already working and nothing would catch it.

### Known limits, acceptable for now

9. **Chat polls every 2 seconds** rather than using websockets. Your own
   messages appear instantly because sending is optimistic; other people's take
   up to two seconds. At twenty-one people this is fine. On Vercel each poll is
   a function invocation, so it is the main thing that will show up on a bill.
   The real fix is **Supabase Realtime**, which you get free with the database
   you are already adding — it is confined to `components/Thread.tsx`.
10. **Uploads live in the database**, capped at 15 MB each. Fine for programme
    books and floorplans; move to object storage if the team starts sharing
    video.
11. **Voice notes need microphone permission** and only work over HTTPS.
12. **Summit dates and venue are placeholders.** The trackers never stated them.

---

## What is in the database, and where it came from

Run `node scripts/audit.mjs` to reproduce this.

| Section | Rows | Source |
|---|---|---|
| People | 21 | Project Tracker, 2024 and 2026 workbooks — every one named in a tracker |
| Workstreams | 6 | Project Tracker, including Finance |
| Tasks | 76 | 2024 `Main Schedule` playbook + `Action log` |
| Speakers | 17 | 2026 Speaker Outreach Tracker |
| Agenda | 24 | 2026 Agenda tab |
| Open questions | 5 | 2026 Question Tracker |
| Retro | 18 | 2024 Post Summit Review |
| Channels | 11 | one per workstream, plus general / volunteers / random / board / finance |
| **Sponsors** | **0** | no sponsor tracker exists |
| **Vendors** | **0** | the 2024 Vendor tab holds only its headers |
| **Attendees** | **0** | no registration export exists |
| **Messages** | **0** | empty until someone posts |
| **Files** | **0** | empty until someone uploads |

Nothing is invented. The only things assigned rather than sourced are the
`@discover.org` email addresses and the first passwords, because the trackers
carry neither.

---

## The shortest path to production

1. Connect Supabase (`DATABASE_URL` + `DIRECT_URL`) and redeploy — removes
   blockers 1 and 2.
2. Turn on Supabase backups — blocker 3.
3. Add sign-in rate limiting — item 4.
4. Switch chat to Supabase Realtime — item 9, and cuts the Vercel invocation
   cost at the same time.
5. Have the President invite the real members and deactivate the seeded
   accounts.

Items 1–3 are a day. Items 4–5 are a day. After that it is fit to run the 2027
cycle on.
