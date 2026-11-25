/**
 * The account roster.
 *
 * Every person here appears by name in DISCOVER's own trackers — the Project
 * Tracker, the 2024 Summit Planning workbook or the 2026 Speaker Outreach
 * workbook. Nobody is invented.
 *
 * The only thing assigned here that the trackers do not carry is the
 * @discover.org email, which is the sign-in identifier.
 *
 * Passwords are NOT in this file and never go into the repository. The seed
 * generates one per person at run time and writes them to CREDENTIALS.md,
 * which is gitignored. Re-seeding issues new ones.
 */

export type SeedUser = {
  name: string;
  email: string;
  role: 'president' | 'officer' | 'director' | 'lead' | 'volunteer';
  title: string;
  company: string;
  workstreams: string[];
  leads?: string;
  accent: string;
  /** Where this person appears in the source trackers. */
  source: string;
};

export const LEADERSHIP: SeedUser[] = [
  { name: 'Yahne Henry', email: 'yahne@discover.org', role: 'president', title: 'President', company: 'Johnson & Johnson', workstreams: ['partnerships', 'summit'], leads: 'partnerships', accent: '#0A2240', source: 'Project Tracker — Board: President' },
  { name: 'Odi Ikpe', email: 'odi@discover.org', role: 'officer', title: 'Immediate Past President', company: 'Pfizer', workstreams: ['summit', 'partnerships'], leads: 'summit', accent: '#1F5FA8', source: 'Project Tracker — Board; 2026 Agenda session owner' },
  { name: 'Gagan Sethi', email: 'gagan@discover.org', role: 'officer', title: 'Treasurer', company: 'Member company', workstreams: ['professional-dev', 'finance'], leads: 'finance', accent: '#1E7A4B', source: 'Project Tracker — Treasurer; leads Professional Development and Finance' },
  { name: 'Jovonsia Carter', email: 'jovonsia@discover.org', role: 'officer', title: 'Program Manager', company: 'DISCOVER', workstreams: ['summit', 'comms'], accent: '#B4761F', source: '2026 Speaker Tracker instructions; Question Tracker' },
  { name: 'Abdul Rahman', email: 'abdul@discover.org', role: 'director', title: 'Board Director', company: 'Member company', workstreams: ['summit'], accent: '#5A4FA3', source: '2024 Action log — photographer; 2026 Question Tracker' },
  { name: 'Lisa Fishel-Slater', email: 'lisa@discover.org', role: 'director', title: 'Board Director', company: 'The Hershey Company', workstreams: ['summit', 'partnerships'], accent: '#A62B2B', source: '2024 Day of Volunteers; Post Summit Review' },
  { name: 'Rakhi Agarwal', email: 'rakhi@discover.org', role: 'director', title: 'Board Director', company: 'Member company', workstreams: ['comms'], accent: '#2F6E6B', source: '2023 Communication Plan; 2026 Agenda' },
  { name: 'Minu Patel', email: 'minu@discover.org', role: 'lead', title: 'Academic Engagement Lead', company: 'Member company', workstreams: ['academic'], leads: 'academic', accent: '#1F5FA8', source: 'Project Tracker — Academic Engagement lead; Monthly Webinar' },
  { name: 'Taylor Brooks', email: 'taylor@discover.org', role: 'lead', title: 'Communications Lead', company: 'Pfizer', workstreams: ['comms'], leads: 'comms', accent: '#7A3E8F', source: 'Project Tracker — Communication team lead (Pfizer)' },
];

/**
 * Volunteers named in the trackers. The Project Tracker says the organisation
 * runs with under twenty including the Summit; the remainder are invited by the
 * President in Admin → People rather than invented here.
 */
const VOLUNTEER_ROWS: [string, string, string, string, string][] = [
  // name, handle, company, workstream, source
  ['Mandy Spohrer', 'mandy', 'Member company', 'summit', '2024 Post Summit Review; Action log — VIP name cards'],
  ['Maria Hill', 'maria', 'Member company', 'summit', '2024 Post Summit Review — AV and music'],
  ['Renee Williams', 'renee', 'Member company', 'academic', '2024 Post Summit Review — leaders breakfast'],
  ['Samira Anifowoshe', 'samira', 'Member company', 'summit', '2024 Post Summit Review — awards dinner'],
  ['Surabhi Rao', 'surabhi', 'Member company', 'comms', '2024 Action log — logo, eblasts, LinkedIn, slide template'],
  ['Nsikan Udo', 'nsikan', 'Member company', 'academic', '2024 Action log — student attendee form'],
  ['Dan Whitfield', 'dan', 'Member company', 'comms', '2023 Communication Plan — eblasts and newsletter'],
  ['Devon Reed', 'devon', 'Member company', 'summit', '2026 Agenda — session moderator'],
  ['Jena Litrocapes', 'jena', 'The Hershey Company', 'summit', '2024 Post Summit Review — attendee feedback'],
  ['Qing Zhao', 'qing', 'Member company', 'partnerships', '2024 Action log — summit invitation approval'],
  ['Mike Harrison', 'mike', 'Walmart', 'summit', '2024 Action log — bus transportation'],
  ['Jose Alvarez', 'jose', 'Member company', 'summit', '2026 Question Tracker — food options'],
];

const ACCENTS = ['#1F5FA8', '#1E7A4B', '#B4761F', '#5A4FA3', '#2F6E6B', '#A62B2B', '#7A3E8F', '#3E5F7E'];

const TITLE_BY_WS: Record<string, string> = {
  summit: 'Summit Volunteer',
  comms: 'Communications Volunteer',
  academic: 'Student Programme Volunteer',
  partnerships: 'Partnerships Volunteer',
  'professional-dev': 'Programme Volunteer',
};

export const VOLUNTEERS: SeedUser[] = VOLUNTEER_ROWS.map(
  ([name, handle, company, ws, source], i) => ({
    name,
    email: `${handle}@discover.org`,
    role: 'volunteer' as const,
    title: TITLE_BY_WS[ws] ?? 'Volunteer',
    company,
    workstreams: [ws],
    accent: ACCENTS[i % ACCENTS.length],
    source,
  }),
);

export const ACCOUNTS: SeedUser[] = [...LEADERSHIP, ...VOLUNTEERS];
