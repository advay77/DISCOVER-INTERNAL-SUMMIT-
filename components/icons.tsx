/**
 * A single line-icon set at 1.5px stroke, drawn on a 24px grid.
 * Everything in the product draws from here — no emoji anywhere in the UI.
 */

type P = { size?: number; className?: string };

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
});

export const IconDashboard = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1" />
    <rect x="13.5" y="3" width="7.5" height="4.5" rx="1" />
    <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1" />
  </svg>
);

export const IconTask = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M9 5h10M9 12h10M9 19h10" />
    <path d="M3.5 5.5 4.6 6.6 6.8 4.2" />
    <path d="M3.5 12.5 4.6 13.6 6.8 11.2" />
    <circle cx="5" cy="19" r="1.6" />
  </svg>
);

export const IconSpeaker = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21M8.5 21h7" />
  </svg>
);

export const IconAgenda = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <rect x="3" y="4.5" width="18" height="16" rx="1.5" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    <path d="M7 13.5h5M7 17h8" />
  </svg>
);

export const IconSponsor = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M12 2.8 14.6 8l5.8.85-4.2 4.1 1 5.8L12 16l-5.2 2.75 1-5.8-4.2-4.1L9.4 8Z" />
    <path d="M8.5 21.2h7" />
  </svg>
);

export const IconLogistics = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M2.5 7.5 12 3l9.5 4.5v9L12 21l-9.5-4.5Z" />
    <path d="M2.5 7.5 12 12l9.5-4.5M12 12v9" />
  </svg>
);

export const IconAttendees = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 20c.6-3.4 3.1-5.3 6.2-5.3s5.6 1.9 6.2 5.3" />
    <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.6M17.6 14.9c2.1.5 3.5 2.3 3.9 5.1" />
  </svg>
);

export const IconQuestion = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M9.6 9.3a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.6" />
    <path d="M12 17.1h.01" />
  </svg>
);

export const IconChat = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M20.5 12.2c0 4.1-3.8 7.4-8.5 7.4a9.9 9.9 0 0 1-2.9-.43L4.2 21l1.3-3.5A7 7 0 0 1 3.5 12.2c0-4.1 3.8-7.4 8.5-7.4s8.5 3.3 8.5 7.4Z" />
  </svg>
);

export const IconFiles = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M3.2 6.6c0-1 .8-1.8 1.8-1.8h4l2.1 2.4h7.9c1 0 1.8.8 1.8 1.8v8.6c0 1-.8 1.8-1.8 1.8H5c-1 0-1.8-.8-1.8-1.8Z" />
  </svg>
);

export const IconTeam = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="7" r="3.2" />
    <circle cx="5" cy="17" r="2.6" />
    <circle cx="19" cy="17" r="2.6" />
    <path d="M12 10.2v3.4M12 13.6 6.8 15.2M12 13.6l5.2 1.6" />
  </svg>
);

export const IconRetro = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1" />
    <path d="M3.2 19.2v-5h5" />
  </svg>
);

export const IconAdmin = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M12 2.8 20 6.4v5.3c0 4.6-3.3 8.5-8 9.5-4.7-1-8-4.9-8-9.5V6.4Z" />
    <path d="m8.9 12.1 2.1 2.1 4.1-4.3" />
  </svg>
);

export const IconSearch = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="11" cy="11" r="6.6" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const IconBell = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M6.2 10.2a5.8 5.8 0 1 1 11.6 0c0 3.3.9 5 1.7 5.9H4.5c.8-.9 1.7-2.6 1.7-5.9Z" />
    <path d="M10 19.3a2.2 2.2 0 0 0 4 0" />
  </svg>
);

export const IconAlert = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M12 3.4 22 20.4H2Z" />
    <path d="M12 10v4.2M12 17.4h.01" />
  </svg>
);

export const IconClock = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M12 6.6V12l3.6 2.1" />
  </svg>
);

export const IconCheck = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconLock = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <rect x="4.2" y="10.4" width="15.6" height="10.4" rx="1.8" />
    <path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8" />
  </svg>
);

export const IconPin = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export const IconMoney = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <rect x="2.8" y="5.8" width="18.4" height="12.4" rx="1.6" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6.2 12h.01M17.8 12h.01" />
  </svg>
);

export const IconMore = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="5" cy="12" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="19" cy="12" r="1.4" />
  </svg>
);

export const IconPlus = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M12 5.5v13M5.5 12h13" />
  </svg>
);

export const IconArrow = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
  </svg>
);

export const IconHash = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M9.4 3.6 7.6 20.4M16.4 3.6l-1.8 16.8M3.8 8.8h16.4M3.2 15.2h16.4" />
  </svg>
);

export const NAV_ICONS = {
  dashboard: IconDashboard,
  tasks: IconTask,
  speakers: IconSpeaker,
  agenda: IconAgenda,
  sponsors: IconSponsor,
  logistics: IconLogistics,
  attendees: IconAttendees,
  questions: IconQuestion,
  chat: IconChat,
  files: IconFiles,
  team: IconTeam,
  retro: IconRetro,
  admin: IconAdmin,
} as const;

export type NavIconKey = keyof typeof NAV_ICONS;
