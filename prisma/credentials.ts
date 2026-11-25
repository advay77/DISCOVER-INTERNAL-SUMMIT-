/**
 * First passwords.
 *
 * Generated at seed time and written to CREDENTIALS.md, which is gitignored —
 * sign-in passwords never belong in a repository. Re-seeding issues new ones.
 */
import { writeFile } from 'node:fs/promises';
import { randomInt } from 'node:crypto';
import { LEADERSHIP, VOLUNTEERS, type SeedUser } from './accounts.ts';

const WORDS_A = ['Hudson', 'Marlow', 'Tandem', 'Bramble', 'Cinder', 'Juniper', 'Pollen', 'Lantern', 'Harbor', 'Willow', 'Ember', 'Cobalt', 'Rally', 'Sorrel', 'Pivot', 'Mango', 'Vector', 'Saffron', 'Kestrel', 'Opal', 'Basalt', 'Verdant', 'Thistle', 'Nimbus', 'Granite', 'Clover', 'Aspen', 'Maple', 'Tungsten', 'Quarry', 'Beacon', 'Cedar'];
const WORDS_B = ['Keel', 'Vane', 'Loft', 'Quay', 'Reef', 'Arc', 'Mast', 'Brim', 'Flint', 'Crate', 'Slate', 'Fern', 'Birch', 'Dock', 'Cairn', 'Stile', 'Dune', 'Loom', 'Mint', 'Ridge', 'Pike', 'Oak', 'Cove', 'Fold', 'Lark', 'Spire', 'Drift', 'Quill', 'Bay', 'Ledge', 'Thorn', 'Gale'];

/**
 * Readable but unguessable: Word-NN-Word.
 *
 * A demo build (DEMO_SEED=1) uses one published password instead, because the
 * point of a demo link is that whoever has it can sign in. A demo deploy holds
 * no real data and resets on its own.
 */
export const DEMO_PASSWORD = 'discover-demo';

export function newPassword() {
  if (process.env.DEMO_SEED === '1') return DEMO_PASSWORD;
  const a = WORDS_A[randomInt(WORDS_A.length)];
  const b = WORDS_B[randomInt(WORDS_B.length)];
  return `${a}-${randomInt(10, 99)}-${b}`;
}

const WS_NAMES: Record<string, string> = {
  summit: 'Annual Summit',
  comms: 'Communications',
  academic: 'Academic Engagement',
  partnerships: 'Partnerships',
  'professional-dev': 'Professional Development',
};

const ROLE_NAMES: Record<string, string> = {
  president: 'President',
  officer: 'Officer',
  director: 'Board Director',
  lead: 'Workstream Lead',
  volunteer: 'Volunteer',
};

export async function writeCredentials(issued: Map<string, string>) {
  // A demo build has no local file to write to that anyone will read.
  if (process.env.DEMO_SEED === '1') return;

  const row = (u: SeedUser) =>
    `| ${u.name} | \`${u.email}\` | \`${issued.get(u.email)}\` | ${
      u.title.includes(ROLE_NAMES[u.role]) ? u.title : `${ROLE_NAMES[u.role]} — ${u.title}`
    } | ${u.company} |`;

  const volRow = (u: SeedUser) =>
    `| ${u.name} | \`${u.email}\` | \`${issued.get(u.email)}\` | ${
      WS_NAMES[u.workstreams[0]] ?? '—'
    } | ${u.company} |`;

  const md = `# DISCOVER OS — accounts

> **This file is local only. It is gitignored and must never be committed or
> shared in a chat.** It is rewritten every time the seed runs, and every
> password below changes when it does.

Every account has its own email and its own password. There is no shared
password and no public sign-up.

The sign-in screen has two doors — **Board & officers** and **Volunteers**. Pick
the one that matches the account, or the sign-in is refused with a message
telling you which door to use.

Everyone listed appears by name in DISCOVER's own trackers. The emails are
assigned, because the trackers carry none.

---

## Door 1 — Board & officers

${LEADERSHIP.length} accounts: the board of seven plus the two workstream leads.

| Name | Email | Password | Role | Company |
|---|---|---|---|---|
${LEADERSHIP.map(row).join('\n')}

### What each level can do

| Level | Sees |
|---|---|
| **President** | Everything, and the only one who can edit the permission matrix |
| **Officer** | Everything except editing permissions. The Treasurer is the only other money editor |
| **Board Director** | Reads across the organisation, writes inside their own workstreams, no money |
| **Workstream Lead** | Full control of their own workstream, read-only elsewhere, speaker contacts only for speakers they own |

---

## Door 2 — Volunteers

${VOLUNTEERS.length} accounts, each named in the trackers. The Project Tracker
puts the organisation under twenty volunteers including the Summit — invite the
rest in **Admin → People** rather than adding them here.

| Name | Email | Password | Workstream | Company |
|---|---|---|---|---|
${VOLUNTEERS.map(volRow).join('\n')}

---

## The four worth testing first

| Sign in as | To see |
|---|---|
| \`yahne@discover.org\` | Master access — every module, the permission matrix, money everywhere |
| \`odi@discover.org\` | Officer — the same, minus the ability to change who sees what |
| \`taylor@discover.org\` | Lead — Communications in full, other workstreams read-only, no money |
| \`mandy@discover.org\` | Volunteer — her own tasks, no speakers, no contact details, no money |

---

## Before real use

In **Admin → People** the President invites the real members — the system
generates a unique first password for each, recorded in the audit log, which
they reset on first sign-in. Then deactivate every account above. Deactivating
keeps a person's history, decisions and messages intact while their sign-in
stops.
`;

  // Local and hosted databases get different passwords, so each can write its
  // own file: CREDENTIALS_FILE=CREDENTIALS.live.md for the hosted one.
  await writeFile(process.env.CREDENTIALS_FILE || 'CREDENTIALS.md', md, 'utf8');
}
