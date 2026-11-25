/**
 * Seeds DISCOVER OS with the real organisation and the real 2026 summit cycle,
 * taken from:
 *   - DISCOVER Project Tracker (workstreams, board, volunteers)
 *   - DISCOVER 2024 Summit Planning.xlsx (playbook, action log, retro, vendors)
 *   - DISCOVER_Summit_2026_Speaker_Outreach_Tracker.xlsx (pipeline, agenda, questions)
 *
 * Every password here is a development seed credential. Change them in Admin
 * before this is used for anything real.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_MATRIX, CAPABILITY_KEYS } from '../lib/capabilities.ts';
import { PLAYBOOK } from './playbook.ts';
import { ACCOUNTS } from './accounts.ts';
import { newPassword, writeCredentials } from './credentials.ts';

const db = new PrismaClient();

const ROLES = [
  { key: 'president', name: 'President', level: 1, description: 'Master access. Grants everything.' },
  { key: 'officer', name: 'Officer', level: 2, description: 'Board officers: Past President, Treasurer, Program Manager.' },
  { key: 'director', name: 'Board Director', level: 3, description: 'Reads across the organisation, writes in own workstreams.' },
  { key: 'lead', name: 'Workstream Lead', level: 4, description: 'Runs one workstream end to end.' },
  { key: 'volunteer', name: 'Volunteer', level: 5, description: 'Sees only what they are assigned.' },
];

const WORKSTREAMS = [
  { key: 'professional-dev', name: 'Professional Development', color: '#7C3AED', order: 1, description: 'Webinars and the Earth Day networking event.' },
  { key: 'academic', name: 'Academic Engagement', color: '#0891B2', order: 2, description: 'Events with schools and student programmes.' },
  { key: 'summit', name: 'Annual Summit', color: '#1D6FE0', order: 3, description: 'The flagship two-day summit.' },
  { key: 'partnerships', name: 'Partnerships', color: '#D97708', order: 4, description: 'Sponsors and member companies.' },
  { key: 'comms', name: 'Communications', color: '#DB2777', order: 5, description: 'Email, LinkedIn and the marketing calendar.' },
];

const USERS = ACCOUNTS;

// From the 2026 Speaker Outreach Tracker.
const SPEAKERS = [
  { name: 'Charles A. Brown', title: 'Assistant Dean, Rutgers Business School', company: 'Rutgers University', email: 'CBrown@business.rutgers.edu', owner: 'yahne@discover.org', speakerType: 'Featured Speaker', topicFit: 'Fireside Chat — Leading with Impact: Owning Your Leadership Voice', status: 'Confirmed', confirmed: true, headshot: true, bio: true, registered: true, priority: 'A' },
  { name: 'Bram Bongaerts', title: 'Partner & Life Sciences Lead', company: 'EyeOn', email: 'bram.bongaerts@eyeon.nl', owner: 'yahne@discover.org', speakerType: 'Featured Speaker', topicFit: "AI in the Real World: What's Actually Working", status: 'Confirmed', confirmed: true, headshot: true, bio: true, registered: true, priority: 'A' },
  { name: 'Dennis Nsenkyire', title: 'VP Product Portfolio Strategy — Supply Chain Transformation', company: 'Johnson & Johnson', owner: 'yahne@discover.org', speakerType: 'Keynote', topicFit: 'Opening Keynote — Reimagining Supply Chain', status: 'Confirmed', confirmed: true, headshot: true, bio: true, registered: true, priority: 'A' },
  { name: 'Dominick Cetani', title: 'North American Operations Lead', company: 'Pfizer', email: 'Dominick.Cetani@pfizer.com', owner: 'taylor@discover.org', speakerType: 'Panelist', topicFit: 'Resilient Supply Chains: Balancing Risk, Cost, and Flexibility', status: 'Confirmed', confirmed: true, headshot: true, bio: true, registered: true, priority: 'A' },
  { name: 'Joe Agresta', title: 'Program Director, MS Supply Chain Analytics / J&J (retired)', company: 'Rutgers University', email: 'jagresta@business.rutgers.edu', owner: 'yahne@discover.org', speakerType: 'Panelist', topicFit: 'Resilient Supply Chains: Balancing Risk, Cost, and Flexibility', status: 'Confirmed', confirmed: true, headshot: true, bio: true, registered: true, priority: 'A' },
  { name: 'Brittany Walker', title: 'Founder', company: 'Walker SCM', owner: 'yahne@discover.org', speakerType: 'Panelist', topicFit: 'Resilient Supply Chains', status: 'Confirmed', confirmed: true, headshot: true, bio: true, priority: 'A' },
  { name: 'Lauren Aulson', title: 'Supply Chain Leader', company: 'Merck', owner: 'odi@discover.org', speakerType: 'Panelist', topicFit: 'Resilient Supply Chains', status: 'Confirmed', confirmed: true, headshot: true, bio: true, priority: 'A' },
  { name: 'Robert Tennant', title: 'Executive', company: 'Walker SCM', owner: 'minu@discover.org', speakerType: 'Panelist', topicFit: 'Sustainability in Action', status: 'Confirmed', confirmed: true, bio: true, priority: 'A' },
  { name: 'Dr. Kevin Lyons', title: 'Professor of Professional Practice', company: 'Rutgers University', owner: 'minu@discover.org', speakerType: 'Panelist', topicFit: 'Sustainability in Action: Building the Supply Chain of the Future', status: 'Confirmed', confirmed: true, bio: true, headshot: true, priority: 'A' },
  { name: 'Kathy Wengel', title: 'EVP, Chief Technical Operations & Risk Officer', company: 'Johnson & Johnson', owner: 'yahne@discover.org', speakerType: 'Keynote', topicFit: 'Welcome Video — Decade of DISCOVER', status: 'Confirmed', confirmed: true, headshot: true, bio: true, priority: 'A' },
  { name: 'Gary Kellstrom', title: 'Executive', company: 'Geared Power BioTech', owner: 'odi@discover.org', speakerType: 'Presenter', topicFit: 'Operating at Scale: A Supply Chain Case Study', status: 'Invited', priority: 'B' },
  { name: 'Bill Gallagher', title: 'Managing Director', company: 'SEI', owner: 'odi@discover.org', speakerType: 'Panelist', topicFit: 'The Supply Chain Butterfly Effect', status: 'Invited', priority: 'B' },
  { name: 'Mark Retz', title: 'Director', company: 'SEI', owner: 'odi@discover.org', speakerType: 'Panelist', topicFit: 'From Data to Decisions', status: 'Invited', priority: 'B' },
  { name: 'Kevin Washington', title: 'Executive', company: 'Walker SCM', owner: 'minu@discover.org', speakerType: 'Panelist', topicFit: 'From Data to Decisions', status: 'Invited', priority: 'B' },
  { name: 'James Jean', title: 'Supply Chain Analytics Lead', company: 'Pfizer', owner: 'taylor@discover.org', speakerType: 'Presenter', topicFit: 'AI in Practice: A Pfizer GH&B Supply Chain Analytics Journey', status: 'Responded', response: 'Interested, needs date confirmation', prepCallNeeded: true, priority: 'A' },
  { name: 'Anu Hans', title: 'Former Chief Procurement Officer', company: 'Johnson & Johnson', owner: 'yahne@discover.org', speakerType: 'Featured Speaker', topicFit: 'Awards Gala remarks', status: 'Identified', priority: 'B' },
  { name: 'Theodora Hoegah', title: 'Supply Chain Executive', company: 'Member company', owner: 'odi@discover.org', speakerType: 'Panelist', topicFit: 'Day 2 — Leading Through Change', status: 'Identified', priority: 'C' },
];

const SESSIONS_DAY1 = [
  { startTime: '8:00am', endTime: '9:00am', title: 'Networking Breakfast (General Body)', kind: 'meal' },
  { startTime: '9:00am', endTime: '10:00am', title: 'Decade of DISCOVER — Sponsorship, Speed and Stewardship', kind: 'session', owner: 'odi@discover.org' },
  { startTime: '10:00am', endTime: '10:05am', title: 'Kathy Wengel Welcome Video', kind: 'session', owner: 'yahne@discover.org' },
  { startTime: '10:05am', endTime: '10:10am', title: "President's Welcome Address", kind: 'keynote', owner: 'yahne@discover.org' },
  { startTime: '10:10am', endTime: '10:30am', title: 'Opening Keynote — Reimagining Supply Chain: Execution in a Complex World', kind: 'keynote', owner: 'yahne@discover.org' },
  { startTime: '10:30am', endTime: '11:05am', title: "AI in the Real World: What's Actually Working", kind: 'session', owner: 'yahne@discover.org', moderator: 'taylor@discover.org' },
  { startTime: '11:05am', endTime: '11:20am', title: 'Coffee & Networking Break', kind: 'break' },
  { startTime: '11:20am', endTime: '12:00pm', title: 'AI in Practice: A Pfizer GH&B Supply Chain Analytics Journey', kind: 'session', owner: 'minu@discover.org' },
  { startTime: '12:00pm', endTime: '1:00pm', title: 'Lunch', kind: 'meal' },
  { startTime: '1:00pm', endTime: '1:45pm', title: 'Resilient Supply Chains: Balancing Risk, Cost, and Flexibility', kind: 'panel', owner: 'taylor@discover.org', moderator: 'abdul@discover.org' },
  { startTime: '1:45pm', endTime: '2:00pm', title: 'Coffee & Networking Break', kind: 'break' },
  { startTime: '2:00pm', endTime: '3:15pm', title: 'Operating at Scale: A Supply Chain Case Study', kind: 'session', owner: 'minu@discover.org' },
  { startTime: '3:15pm', endTime: '3:30pm', title: 'Closing Remarks', kind: 'session', owner: 'odi@discover.org' },
  { startTime: '5:00pm', endTime: '6:00pm', title: 'Cocktail / Networking Hour', kind: 'session', owner: 'yahne@discover.org' },
  { startTime: '6:00pm', endTime: '8:00pm', title: 'DISCOVER "Sweet Celebrations" Gala', kind: 'gala', owner: 'odi@discover.org' },
];

const SESSIONS_DAY2 = [
  { startTime: '8:00am', endTime: '9:00am', title: 'Networking Breakfast', kind: 'meal' },
  { startTime: '9:00am', endTime: '9:20am', title: 'Welcome', kind: 'session', owner: 'yahne@discover.org' },
  { startTime: '9:20am', endTime: '10:05am', title: 'Keynote — Leadership & the Future of Supply Chain', kind: 'keynote', owner: 'yahne@discover.org' },
  { startTime: '10:05am', endTime: '10:20am', title: 'Selfie pause / break', kind: 'break' },
  { startTime: '10:20am', endTime: '11:05am', title: 'Sustainability in Action: Building the Supply Chain of the Future', kind: 'panel', owner: 'minu@discover.org', moderator: 'minu@discover.org' },
  { startTime: '11:05am', endTime: '11:50am', title: 'The Supply Chain Butterfly Effect', kind: 'panel', owner: 'odi@discover.org', moderator: 'devon@discover.org' },
  { startTime: '11:50am', endTime: '1:00pm', title: 'Lunch Break', kind: 'meal' },
  { startTime: '1:00pm', endTime: '1:30pm', title: 'From Data to Decisions: Closing the Gap Between Visibility and Action', kind: 'panel', owner: 'yahne@discover.org' },
  { startTime: '1:45pm', endTime: '2:00pm', title: 'Fireside Chat — Leading with Impact: Owning Your Leadership Voice', kind: 'session', owner: 'yahne@discover.org' },
];

const QUESTIONS = [
  { question: 'Small-business case studies for Day 1', status: 'In progress', update: 'Odi and Abdul to connect off call', owner: 'odi@discover.org', ws: 'summit' },
  { question: 'DJ, photographer and videographer', status: 'In progress', update: 'Odi to work with Abdul; Odi to present prospects', owner: 'odi@discover.org', ws: 'summit' },
  { question: 'Venue / room setup', status: 'In progress', update: 'Yahne visiting the venue to review room configurations', owner: 'yahne@discover.org', ws: 'summit' },
  { question: 'Food options and dietary restrictions', status: 'Open', update: 'Jovonsia to obtain options; Dan to forward dietary restrictions from registrations', owner: 'jovonsia@discover.org', ws: 'summit' },
  { question: 'Hotel room block extension', status: 'Blocked', update: 'Room block deadline has passed — needs a new conversation with the hotel', owner: 'odi@discover.org', ws: 'summit' },
];

const RETRO_2024 = [
  { kind: 'plus', text: 'Summit Planning Team meeting the day prior — continue.' },
  { kind: 'plus', text: 'Summit Project Leads kicking off each segment was well received.' },
  { kind: 'plus', text: 'Hotel on-site support was a good addition.' },
  { kind: 'plus', text: 'Student mentoring session well attended and well received.' },
  { kind: 'plus', text: 'Award dinner buffet style with the sashimi bowl was a great win.' },
  { kind: 'plus', text: 'AV support and music — good choice.' },
  { kind: 'plus', text: 'Diverse leaders and backgrounds across panels and speakers, well received.' },
  { kind: 'plus', text: 'Day 1 breakfast with select leaders — good idea.' },
  { kind: 'delta', text: 'Increase the planning meeting to a full hour to walk the agenda and expectations.' },
  { kind: 'delta', text: 'Area tour faced transportation challenges.' },
  { kind: 'delta', text: 'Clarify what on-site hotel support covers before and during the Summit.' },
  { kind: 'delta', text: 'Professional coaching session had low attendance versus confirmations. Prepare coaches and mentors properly.' },
  { kind: 'delta', text: 'Award recipients were prepared to speak but did not get the chance.' },
  { kind: 'consider', text: 'Send email reminders to attendees who confirmed for the coaching segment.' },
  { kind: 'consider', text: 'Give award recipients 2–3 minutes to speak.' },
  { kind: 'consider', text: 'Formalise who attends the leaders breakfast and provide ice-breakers.' },
  { kind: 'consider', text: 'Student pitch contest, judged offline, winners showcase at the Summit.' },
  { kind: 'consider', text: 'Two executive panels: Chief Supply Chain Officers and Chief DEI Officers.' },
];

const CHANNELS = [
  { key: 'general', name: 'general', purpose: 'Everything everyone should see.', type: 'public' },
  { key: 'summit', name: 'summit', purpose: 'The 2026 Summit war room.', type: 'workstream', ws: 'summit' },
  { key: 'speakers', name: 'speakers', purpose: 'Outreach, confirmations, bios and headshots.', type: 'public' },
  { key: 'partnerships', name: 'partnerships', purpose: 'Sponsors and member companies.', type: 'workstream', ws: 'partnerships' },
  { key: 'comms', name: 'comms', purpose: 'Email sends, LinkedIn, marketing calendar.', type: 'workstream', ws: 'comms' },
  { key: 'academic', name: 'academic', purpose: 'Schools, students, mentoring.', type: 'workstream', ws: 'academic' },
  { key: 'professional-dev', name: 'professional-dev', purpose: 'Webinars and the Earth Day event.', type: 'workstream', ws: 'professional-dev' },
  { key: 'volunteers', name: 'volunteers', purpose: 'Day-of coordination. Everyone on site is here.', type: 'public' },
  { key: 'board', name: 'board', purpose: 'Officers and directors only.', type: 'private' },
  { key: 'random', name: 'random', purpose: 'The good stuff.', type: 'public' },
];

async function main() {
  console.log('→ clearing');
  await db.$transaction([
    db.auditLog.deleteMany(), db.activityLog.deleteMany(), db.notification.deleteMany(),
    db.fileAsset.deleteMany(), db.message.deleteMany(), db.channelMember.deleteMany(),
    db.channel.deleteMany(), db.retroItem.deleteMany(), db.openQuestion.deleteMany(),
    db.attendee.deleteMany(), db.vendor.deleteMany(), db.sponsor.deleteMany(),
    db.sessionSpeaker.deleteMany(), db.session.deleteMany(), db.speaker.deleteMany(),
    db.task.deleteMany(), db.playbookStep.deleteMany(), db.event.deleteMany(),
    db.membership.deleteMany(), db.user.deleteMany(), db.rolePermission.deleteMany(),
    db.workstream.deleteMany(), db.role.deleteMany(),
  ]);

  console.log('→ roles and the permission matrix');
  const roles: Record<string, string> = {};
  for (const r of ROLES) {
    const role = await db.role.create({ data: { ...r, isSystem: true } });
    roles[r.key] = role.id;
    const matrix = DEFAULT_MATRIX[r.key] ?? {};
    await db.rolePermission.createMany({
      data: CAPABILITY_KEYS.map((cap) => ({
        roleId: role.id,
        capability: cap,
        scope: matrix[cap] ?? 'none',
      })),
    });
  }

  console.log('→ workstreams');
  const ws: Record<string, string> = {};
  for (const w of WORKSTREAMS) {
    const created = await db.workstream.create({ data: w });
    ws[w.key] = created.id;
  }

  console.log('→ people');
  const users: Record<string, string> = {};
  const issued = new Map<string, string>();
  for (const u of USERS) {
    const password = newPassword();
    issued.set(u.email, password);
    const created = await db.user.create({
      data: {
        name: u.name, email: u.email,
        passwordHash: await bcrypt.hash(password, 10),
        title: u.title, company: u.company,
        accent: u.accent ?? '#1D6FE0', roleId: roles[u.role],
        memberships: { create: u.workstreams.map((k) => ({ workstreamId: ws[k] })) },
      },
    });
    users[u.email] = created.id;
    if (u.leads) await db.workstream.update({ where: { id: ws[u.leads] }, data: { leadId: created.id } });
  }

  console.log('→ the 2026 cycle');
  // Dates are unconfirmed in the source trackers — change them in Admin → Event.
  const event = await db.event.create({
    data: {
      name: 'DISCOVER Summit 2026', cycle: 2026,
      theme: 'A Decade of DISCOVER',
      dayOneTheme: 'Building Smarter Operations',
      dayTwoTheme: 'Leading Through Change',
      startDate: new Date('2027-04-14T09:00:00Z'),
      endDate: new Date('2027-04-15T17:00:00Z'),
      venue: 'To be confirmed', city: 'New York, NY',
      status: 'planning', isCurrent: true,
      goalRegistrants: 300, goalOrganizations: 30, goalSurvey: 4.5,
    },
  });

  console.log('→ the annual playbook');
  await db.playbookStep.createMany({ data: PLAYBOOK });

  console.log('→ tasks from the playbook');
  const steps = await db.playbookStep.findMany({ orderBy: { order: 'asc' } });
  const leadByWs: Record<string, string> = {
    summit: users['odi@discover.org'], comms: users['taylor@discover.org'],
    partnerships: users['yahne@discover.org'], academic: users['minu@discover.org'],
    'professional-dev': users['gagan@discover.org'],
  };
  for (const s of steps) {
    const due = new Date(event.startDate);
    due.setMonth(due.getMonth() - s.monthsBefore);
    const wsKey = s.workstreamKey ?? 'summit';
    // Every playbook step starts To do. Progress is recorded by the people
    // doing the work, never invented here.
    await db.task.create({
      data: {
        title: s.title, category: s.category, status: 'todo',
        priority: s.monthsBefore <= 1 ? 'high' : 'medium',
        dueDate: due, order: s.order, eventId: event.id,
        workstreamId: ws[wsKey], ownerId: leadByWs[wsKey] ?? users['odi@discover.org'],
        createdById: users['yahne@discover.org'],
        description: s.notes,
      },
    });
  }

  // Open items carried over from the 2024 Action log, with the statuses the log
  // itself records — 'Complete' where it says Complete, otherwise To do.
  const actionLog = [
    { title: 'Define Summit budget and get board approval', category: 'Summit Logistics', owner: 'odi@discover.org', ws: 'summit', done: true, description: 'Initial assumption $65k. Board approval needed for $79k.' },
    { title: 'Finalise logo design', category: 'Summit Comms', owner: 'surabhi@discover.org', ws: 'comms', done: true, description: 'Official DISCOVER logo to be added to flyers.' },
    { title: 'Activate Summit registration on the DISCOVER website', category: 'Summit Registration', owner: 'surabhi@discover.org', ws: 'comms', done: true },
    { title: 'Create the Summit student attendee form', category: 'Summit Registration', owner: 'nsikan@discover.org', ws: 'academic', done: true, description: 'Still need to decide how sponsored student places are chosen.' },
    { title: 'Email supply chain programmes at partner universities', category: 'Summit Registration', owner: 'minu@discover.org', ws: 'academic', done: true },
    { title: 'Secure venue', category: 'Summit Logistics', owner: 'odi@discover.org', ws: 'summit', done: true },
    { title: 'Secure breakout rooms', category: 'Summit Logistics', owner: 'odi@discover.org', ws: 'summit', done: true },
    { title: 'Secure photographer', category: 'Gala Dinner', owner: 'abdul@discover.org', ws: 'summit', done: true },
    { title: 'Email out the Summit announcement', category: 'Summit Invitation', owner: 'surabhi@discover.org', ws: 'comms', done: false },
    { title: 'Post the Summit announcement on LinkedIn', category: 'Summit Comms', owner: 'surabhi@discover.org', ws: 'comms', done: false },
    { title: 'Order red carpet and DISCOVER backdrop for photos', category: 'Summit Logistics', owner: 'odi@discover.org', ws: 'summit', done: false },
    { title: 'Create the Summit "why attend" brochure', category: 'Summit Comms', owner: 'taylor@discover.org', ws: 'comms', done: false },
    { title: 'Name badge design', category: 'Summit Comms', owner: 'rakhi@discover.org', ws: 'comms', done: false },
    { title: 'Order name lanyards', category: 'Summit Logistics', owner: 'odi@discover.org', ws: 'summit', done: false },
    { title: 'List all vendors and payment method arrangements', category: 'Summit Logistics', owner: 'odi@discover.org', ws: 'summit', done: false },
    { title: 'Meet the AV team and supply slides and music', category: 'Summit Logistics', owner: 'odi@discover.org', ws: 'summit', done: false },
    { title: 'Compose the DISCOVER guide book — maps, things to do', category: 'Summit Comms', owner: 'dan@discover.org', ws: 'comms', done: false },
    { title: 'Confirm meeting cancellation insurance', category: 'Summit Logistics', owner: 'odi@discover.org', ws: 'summit', done: false, description: 'May be covered by the venue contract — review at the board meeting.' },
    { title: 'Name cards for VIPs and tables', category: 'Summit Comms', owner: 'mandy@discover.org', ws: 'summit', done: false },
    { title: 'Reserve bus transportation from the hotel', category: 'Summit Logistics', owner: 'mike@discover.org', ws: 'summit', done: false },
    { title: 'Create the Summit slide template', category: 'Summit Comms', owner: 'surabhi@discover.org', ws: 'comms', done: false },
    { title: 'Generate the list of on-site volunteers', category: 'Summit Day Support', owner: 'mandy@discover.org', ws: 'summit', done: false },
    { title: 'Document what to expect on the day — building entry and contacts', category: 'Summit Comms', owner: 'taylor@discover.org', ws: 'comms', done: false },
  ];
  for (const t of actionLog) {
    await db.task.create({
      data: {
        title: t.title,
        category: t.category,
        status: t.done ? 'done' : 'todo',
        priority: 'medium',
        description: (t as any).description ?? null,
        eventId: event.id,
        workstreamId: ws[t.ws],
        ownerId: users[t.owner],
        createdById: users['yahne@discover.org'],
      },
    });
  }

  console.log('→ speaker pipeline');
  const speakerIds: Record<string, string> = {};
  for (const s of SPEAKERS) {
    const created = await db.speaker.create({
      data: {
        name: s.name, title: s.title, company: s.company, email: (s as any).email,
        priority: s.priority, speakerType: s.speakerType, topicFit: s.topicFit,
        status: s.status, confirmed: !!s.confirmed, headshot: !!s.headshot, bio: !!s.bio,
        registered: !!(s as any).registered, response: (s as any).response,
        prepCallNeeded: !!(s as any).prepCallNeeded,
        eventId: event.id, workstreamId: ws['summit'], ownerId: users[s.owner],
      },
    });
    speakerIds[s.name] = created.id;
  }

  console.log('→ agenda');
  const mkSessions = async (day: number, list: any[]) => {
    let order = 0;
    for (const s of list) {
      await db.session.create({
        data: {
          eventId: event.id, day, startTime: s.startTime, endTime: s.endTime,
          title: s.title, kind: s.kind, order: order++,
          ownerId: s.owner ? users[s.owner] : null,
          moderatorId: s.moderator ? users[s.moderator] : null,
          status: s.kind === 'break' || s.kind === 'meal' ? 'confirmed' : 'planned',
        },
      });
    }
  };
  await mkSessions(1, SESSIONS_DAY1);
  await mkSessions(2, SESSIONS_DAY2);

  // Sponsors, vendors and attendees start EMPTY. DISCOVER's trackers carry no
  // sponsor pipeline, the 2024 Vendor Management tab holds only its headers,
  // and there is no registration export. Those modules fill up in use.

  console.log('→ open questions (2026 Question Tracker)');
  for (const q of QUESTIONS) {
    await db.openQuestion.create({
      data: {
        question: q.question, status: q.status, update: q.update,
        eventId: event.id, workstreamId: ws[q.ws], ownerId: users[q.owner],
      },
    });
  }

  console.log('→ retro from the 2024 summit');
  for (const r of RETRO_2024) {
    await db.retroItem.create({
      data: { eventId: event.id, kind: r.kind, text: r.text, authorId: users['lisa@discover.org'] },
    });
  }

  console.log('→ channels');
  const everyone = Object.values(users);
  const channelIds: Record<string, string> = {};
  for (const c of CHANNELS) {
    const created = await db.channel.create({
      data: {
        key: c.key, name: c.name, purpose: c.purpose, type: c.type,
        workstreamId: (c as any).ws ? ws[(c as any).ws] : null,
      },
    });
    channelIds[c.key] = created.id;

    let memberIds: string[] = everyone;
    if (c.type === 'workstream') {
      const members = await db.membership.findMany({ where: { workstreamId: ws[(c as any).ws] } });
      memberIds = members.map((m) => m.userId);
    } else if (c.type === 'private') {
      const board = await db.user.findMany({
        where: { role: { key: { in: ['president', 'officer', 'director'] } } },
      });
      memberIds = board.map((b) => b.id);
    }
    await db.channelMember.createMany({
      data: memberIds.map((id) => ({ channelId: created.id, userId: id })),
    });
  }

  await writeCredentials(issued);

  console.log('\n✓ seeded.');
  console.log(`  ${USERS.length} people · ${steps.length + actionLog.length} tasks · ${SPEAKERS.length} speakers · ${CHANNELS.length} channels`);
  console.log('  Fresh passwords written to CREDENTIALS.md (gitignored, local only).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
