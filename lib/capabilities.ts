/**
 * The capability catalogue.
 *
 * Every permission in DISCOVER OS is `resource:action` with a scope of
 * all | workstream | own | none. Nothing in the app may check a string
 * that is not declared here — that is what keeps the Admin matrix honest.
 */

export type Scope = 'all' | 'workstream' | 'own' | 'none';

export const SCOPES: Scope[] = ['all', 'workstream', 'own', 'none'];

export type CapabilityDef = {
  key: string;
  group: string;
  label: string;
  help: string;
  /** Scopes that make sense for this capability, in order of decreasing power. */
  scopes: Scope[];
  /** Marks a capability that exposes personal data or money. */
  sensitive?: boolean;
};

export const CAPABILITIES: CapabilityDef[] = [
  // Tasks
  { key: 'tasks:view', group: 'Tasks', label: 'See tasks', help: 'Which tasks appear in the board, list and dashboard.', scopes: ['all', 'workstream', 'own', 'none'] },
  { key: 'tasks:edit', group: 'Tasks', label: 'Edit tasks', help: 'Change title, status, dates and notes.', scopes: ['all', 'workstream', 'own', 'none'] },
  { key: 'tasks:assign', group: 'Tasks', label: 'Assign tasks', help: 'Give a task to another member.', scopes: ['all', 'workstream', 'none'] },

  // Speakers
  { key: 'speakers:view', group: 'Speakers', label: 'See the speaker pipeline', help: 'Names, companies, status, session fit.', scopes: ['all', 'workstream', 'none'] },
  { key: 'speakers:contact', group: 'Speakers', label: 'See speaker contact details', help: 'Email and phone. Stripped from the response when denied.', scopes: ['all', 'workstream', 'none'], sensitive: true },
  { key: 'speakers:edit', group: 'Speakers', label: 'Edit speakers', help: 'Move speakers through the outreach pipeline.', scopes: ['all', 'workstream', 'none'] },

  // Agenda
  { key: 'agenda:view', group: 'Agenda', label: 'See the run of show', help: 'The two-day agenda.', scopes: ['all', 'none'] },
  { key: 'agenda:edit', group: 'Agenda', label: 'Edit the run of show', help: 'Add, move and retime sessions.', scopes: ['all', 'workstream', 'none'] },

  // Partnerships
  { key: 'sponsors:view', group: 'Sponsors', label: 'See sponsors', help: 'Sponsor pipeline and status.', scopes: ['all', 'workstream', 'none'] },
  { key: 'sponsors:edit', group: 'Sponsors', label: 'Edit sponsors', help: 'Update tier, status and contacts.', scopes: ['all', 'workstream', 'none'] },

  // Logistics
  { key: 'vendors:view', group: 'Logistics', label: 'See vendors', help: 'Vendor and service list.', scopes: ['all', 'workstream', 'none'] },
  { key: 'vendors:edit', group: 'Logistics', label: 'Edit vendors', help: 'Manage vendors and payment status.', scopes: ['all', 'workstream', 'none'] },

  // Money
  { key: 'finance:view', group: 'Finance', label: 'See amounts', help: 'Budget, vendor amounts and sponsor value. Hidden everywhere when denied.', scopes: ['all', 'workstream', 'none'], sensitive: true },
  { key: 'finance:edit', group: 'Finance', label: 'Edit amounts', help: 'Treasurer-level. Change money fields.', scopes: ['all', 'none'], sensitive: true },

  // Attendees
  { key: 'attendees:view', group: 'Attendees', label: 'See registrations', help: 'Counts, companies and ticket types.', scopes: ['all', 'none'] },
  { key: 'attendees:contact', group: 'Attendees', label: 'See attendee emails', help: 'Personal data of registrants.', scopes: ['all', 'none'], sensitive: true },
  { key: 'attendees:export', group: 'Attendees', label: 'Export the attendee list', help: 'Download as CSV.', scopes: ['all', 'none'], sensitive: true },

  // Questions
  { key: 'questions:view', group: 'Open questions', label: 'See open questions', help: 'The blocker list.', scopes: ['all', 'workstream', 'none'] },
  { key: 'questions:edit', group: 'Open questions', label: 'Edit open questions', help: 'Raise, update and close blockers.', scopes: ['all', 'workstream', 'none'] },

  // Files
  { key: 'files:view', group: 'Files', label: 'See files', help: 'The document library.', scopes: ['all', 'workstream', 'none'] },
  { key: 'files:upload', group: 'Files', label: 'Upload files', help: 'Add documents and images.', scopes: ['all', 'none'] },
  { key: 'files:delete', group: 'Files', label: 'Delete files', help: 'Remove documents from the library.', scopes: ['all', 'none'] },

  // Chat
  { key: 'chat:use', group: 'Communications', label: 'Use chat', help: 'Read and post in joined channels.', scopes: ['all', 'none'] },
  { key: 'chat:dm', group: 'Communications', label: 'Send direct messages', help: 'Start a one-to-one conversation.', scopes: ['all', 'none'] },
  { key: 'chat:channel.create', group: 'Communications', label: 'Create channels', help: 'Including private channels.', scopes: ['all', 'none'] },
  { key: 'chat:announce', group: 'Communications', label: 'Use @channel', help: 'Notify everyone in a channel.', scopes: ['all', 'workstream', 'none'] },

  // People
  { key: 'team:view', group: 'Team', label: 'See the member directory', help: 'Who is who, and who leads what.', scopes: ['all', 'none'] },
  { key: 'team:contact', group: 'Team', label: 'See member contact details', help: 'Email and phone of other members.', scopes: ['all', 'none'], sensitive: true },

  // Retro
  { key: 'retro:view', group: 'Retro', label: 'See the retro', help: 'Plus / Delta / Consider next year.', scopes: ['all', 'none'] },
  { key: 'retro:write', group: 'Retro', label: 'Add retro notes', help: 'Everyone who was there should be able to.', scopes: ['all', 'none'] },

  // Admin
  { key: 'admin:users', group: 'Admin', label: 'Manage people', help: 'Invite, edit and deactivate members.', scopes: ['all', 'none'], sensitive: true },
  { key: 'admin:roles', group: 'Admin', label: 'Assign roles', help: 'Move a member between roles.', scopes: ['all', 'none'], sensitive: true },
  { key: 'admin:permissions', group: 'Admin', label: 'Edit the permission matrix', help: 'The master switch. President only, and cannot be revoked from the President.', scopes: ['all', 'none'], sensitive: true },
  { key: 'admin:event', group: 'Admin', label: 'Edit event settings', help: 'Dates, theme, venue, goals and the annual playbook.', scopes: ['all', 'none'] },
];

export const CAPABILITY_KEYS = CAPABILITIES.map((c) => c.key);

export const CAPABILITY_GROUPS = Array.from(new Set(CAPABILITIES.map((c) => c.group)));

export function capabilityDef(key: string) {
  return CAPABILITIES.find((c) => c.key === key);
}

/** The default matrix shipped with V1 — section 3.3 of PRODUCT-REVIEW.md. */
export const DEFAULT_MATRIX: Record<string, Record<string, Scope>> = {
  president: Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, 'all' as Scope])),

  officer: {
    ...Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, 'all' as Scope])),
    'admin:permissions': 'none',
    'finance:edit': 'none',
  },

  director: {
    'tasks:view': 'all', 'tasks:edit': 'workstream', 'tasks:assign': 'workstream',
    'speakers:view': 'all', 'speakers:contact': 'all', 'speakers:edit': 'workstream',
    'agenda:view': 'all', 'agenda:edit': 'workstream',
    'sponsors:view': 'all', 'sponsors:edit': 'workstream',
    'vendors:view': 'all', 'vendors:edit': 'workstream',
    'finance:view': 'none', 'finance:edit': 'none',
    'attendees:view': 'all', 'attendees:contact': 'none', 'attendees:export': 'none',
    'questions:view': 'all', 'questions:edit': 'workstream',
    'files:view': 'all', 'files:upload': 'all', 'files:delete': 'none',
    'chat:use': 'all', 'chat:dm': 'all', 'chat:channel.create': 'all', 'chat:announce': 'workstream',
    'team:view': 'all', 'team:contact': 'all',
    'retro:view': 'all', 'retro:write': 'all',
    'admin:users': 'none', 'admin:roles': 'none', 'admin:permissions': 'none', 'admin:event': 'none',
  },

  lead: {
    'tasks:view': 'all', 'tasks:edit': 'workstream', 'tasks:assign': 'workstream',
    'speakers:view': 'all', 'speakers:contact': 'workstream', 'speakers:edit': 'workstream',
    'agenda:view': 'all', 'agenda:edit': 'workstream',
    'sponsors:view': 'workstream', 'sponsors:edit': 'workstream',
    'vendors:view': 'workstream', 'vendors:edit': 'workstream',
    'finance:view': 'workstream', 'finance:edit': 'none',
    'attendees:view': 'all', 'attendees:contact': 'none', 'attendees:export': 'none',
    'questions:view': 'all', 'questions:edit': 'workstream',
    'files:view': 'all', 'files:upload': 'all', 'files:delete': 'none',
    'chat:use': 'all', 'chat:dm': 'all', 'chat:channel.create': 'all', 'chat:announce': 'workstream',
    'team:view': 'all', 'team:contact': 'all',
    'retro:view': 'all', 'retro:write': 'all',
    'admin:users': 'none', 'admin:roles': 'none', 'admin:permissions': 'none', 'admin:event': 'none',
  },

  volunteer: {
    'tasks:view': 'own', 'tasks:edit': 'own', 'tasks:assign': 'none',
    'speakers:view': 'none', 'speakers:contact': 'none', 'speakers:edit': 'none',
    'agenda:view': 'all', 'agenda:edit': 'none',
    'sponsors:view': 'none', 'sponsors:edit': 'none',
    'vendors:view': 'workstream', 'vendors:edit': 'none',
    'finance:view': 'none', 'finance:edit': 'none',
    'attendees:view': 'none', 'attendees:contact': 'none', 'attendees:export': 'none',
    'questions:view': 'workstream', 'questions:edit': 'none',
    'files:view': 'workstream', 'files:upload': 'all', 'files:delete': 'none',
    'chat:use': 'all', 'chat:dm': 'all', 'chat:channel.create': 'none', 'chat:announce': 'none',
    'team:view': 'all', 'team:contact': 'none',
    'retro:view': 'all', 'retro:write': 'all',
    'admin:users': 'none', 'admin:roles': 'none', 'admin:permissions': 'none', 'admin:event': 'none',
  },
};
