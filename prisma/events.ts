/**
 * The events DISCOVER runs through the year.
 *
 * The Project Tracker puts it plainly: "Main event - Annual Summit; other
 * events - webinars, earth day in person, etc". The summit is one event among
 * several, not the whole programme.
 *
 * The webinars below are the real Professional Development Speaker Series from
 * the 2024 workbook's "Monthly Webinar" tab, guests and interviewers included.
 */

export type SeedEvent = {
  name: string;
  kind: 'webinar' | 'networking' | 'academic' | 'other';
  /** Workstream key that runs it. */
  workstream: string;
  /** Email of the person accountable. */
  owner: string;
  /** Email of the interviewer or host, where the tracker names one. */
  host?: string;
  date: string;
  durationHours?: number;
  guest?: string;
  guestTitle?: string;
  guestLink?: string;
  description?: string;
  venue?: string;
  status?: 'planning' | 'scheduled' | 'complete' | 'cancelled';
  source: string;
};

export const EVENTS: SeedEvent[] = [
  // ── Professional Development Speaker Series — 2024 Monthly Webinar tab
  {
    name: 'Speaker Series — Demystifying the PIE model',
    kind: 'webinar',
    workstream: 'professional-dev',
    owner: 'gagan@discover.org',
    host: 'minu@discover.org',
    date: '2024-03-27',
    durationHours: 1,
    guest: 'Justin Hardy',
    guestTitle: 'Category Integration Lead, Global Supply Chain, Pfizer',
    guestLink: 'https://www.linkedin.com/in/justin-hardy-682722/',
    description: 'Demystifying the PIE model on professional development.',
    status: 'complete',
    source: '2024 Monthly Webinar tab',
  },
  {
    name: 'Speaker Series — Anu Hans',
    kind: 'webinar',
    workstream: 'professional-dev',
    owner: 'gagan@discover.org',
    date: '2024-06-20',
    durationHours: 1,
    guest: 'Anu Hans',
    guestTitle: 'Vice President Strategic Initiatives, Janssen Supply Chain',
    guestLink: 'https://www.linkedin.com/in/anu-hans-63466813/',
    description: 'Interviewed by Laverne Bastress.',
    status: 'complete',
    source: '2024 Monthly Webinar tab',
  },
  {
    name: 'Speaker Series — Douglas Guilherme',
    kind: 'webinar',
    workstream: 'professional-dev',
    owner: 'gagan@discover.org',
    date: '2024-07-09',
    durationHours: 1,
    guest: 'Douglas Guilherme',
    guestTitle: 'Vice President Supply Chain US & Canada, The Hershey Company',
    description: 'Interviewed by Regina Barcena.',
    status: 'complete',
    source: '2024 Monthly Webinar tab',
  },
  {
    name: 'Speaker Series — Leadership and logistics in transition',
    kind: 'webinar',
    workstream: 'professional-dev',
    owner: 'gagan@discover.org',
    date: '2024-07-29',
    durationHours: 1,
    guest: 'Michel M. Russell Sr.',
    guestTitle: 'Retired two-star General, United States Army',
    description:
      'Leadership, logistics, and best practices for moving from active duty military into the private sector. Interviewed by Michael del Rosario.',
    status: 'complete',
    source: '2024 Monthly Webinar tab',
  },
  {
    name: 'Live Panel at the BCG office',
    kind: 'networking',
    workstream: 'professional-dev',
    owner: 'gagan@discover.org',
    date: '2024-08-23',
    durationHours: 2,
    venue: 'BCG office',
    description: 'In-person panel discussion hosted by BCG.',
    status: 'complete',
    source: '2024 Monthly Webinar tab',
  },
  {
    name: 'Speaker Series — Arthur Bell',
    kind: 'webinar',
    workstream: 'professional-dev',
    owner: 'gagan@discover.org',
    date: '2024-09-18',
    durationHours: 1,
    guest: 'Arthur Bell',
    guestTitle: 'Vice President Value Division, Unilever',
    guestLink: 'https://www.linkedin.com/in/art-bell/',
    description: 'Organic networking, maintaining self identity, struggling in silence.',
    status: 'complete',
    source: '2024 Monthly Webinar tab (date approximate — the tab gives the month only)',
  },

  // ── Named in the Project Tracker but not yet scheduled
  {
    name: 'Earth Day networking evening',
    kind: 'networking',
    workstream: 'professional-dev',
    owner: 'gagan@discover.org',
    date: '2027-04-22',
    durationHours: 3,
    description:
      'In-person networking event for members and member companies. Named in the Project Tracker under Professional Development; venue and date still to be confirmed.',
    status: 'planning',
    source: 'Project Tracker — Professional Development workstream',
  },
  {
    name: 'Campus session — supply chain programmes',
    kind: 'academic',
    workstream: 'academic',
    owner: 'minu@discover.org',
    date: '2027-02-18',
    durationHours: 2,
    description:
      'Session with a partner university supply chain programme. Named in the Project Tracker under Academic Engagement; school and date still to be confirmed.',
    status: 'planning',
    source: 'Project Tracker — Academic Engagement workstream',
  },
];

export const EVENT_KINDS = {
  summit: { label: 'Annual Summit', tone: 'brand' },
  webinar: { label: 'Webinar', tone: 'navy' },
  networking: { label: 'Networking', tone: 'warn' },
  academic: { label: 'Academic', tone: 'ok' },
  other: { label: 'Event', tone: 'neutral' },
} as const;
