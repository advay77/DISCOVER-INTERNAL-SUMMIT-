// What is actually in each section, and where it came from.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const rows = [
  ['People', await db.user.count(), 'Project Tracker + 2024/2026 workbooks'],
  ['Workstreams', await db.workstream.count(), 'Project Tracker'],
  ['Tasks', await db.task.count(), '2024 Main Schedule playbook + Action log'],
  ['  …done', await db.task.count({ where: { status: 'done' } }), "Action log's own 'Complete' marks"],
  ['Speakers', await db.speaker.count(), '2026 Speaker Outreach Tracker'],
  ['Agenda sessions', await db.session.count(), '2026 Agenda tab'],
  ['Open questions', await db.openQuestion.count(), '2026 Question Tracker'],
  ['Retro items', await db.retroItem.count(), '2024 Post Summit Review'],
  ['Channels', await db.channel.count(), 'one per workstream + general/volunteers/random/board'],
  ['Sponsors', await db.sponsor.count(), 'EMPTY — no sponsor tracker exists'],
  ['Vendors', await db.vendor.count(), 'EMPTY — 2024 Vendor tab holds only headers'],
  ['Attendees', await db.attendee.count(), 'EMPTY — no registration export'],
  ['Messages', await db.message.count(), 'EMPTY unless someone posted'],
  ['Files', await db.fileAsset.count(), 'EMPTY unless someone uploaded'],
  ['Reactions', await db.reaction.count(), ''],
  ['Activity log', await db.activityLog.count(), ''],
  ['Audit log', await db.auditLog.count(), ''],
];

const pad = (s, n) => String(s).padEnd(n);
console.log(`\n${pad('SECTION', 18)}${pad('ROWS', 7)}SOURCE`);
console.log('-'.repeat(78));
for (const [name, count, source] of rows) {
  console.log(`${pad(name, 18)}${pad(count, 7)}${source}`);
}

const invented = rows.filter(([n, c, s]) => s.startsWith('EMPTY') && c > 0);
console.log(
  invented.length
    ? `\n✗ ${invented.length} section(s) hold data that should be empty`
    : '\n✓ every section that should be empty is empty',
);

await db.$disconnect();
