/**
 * Run-of-show helpers shared by the page, the editor and the server actions.
 * Times are stored the way the trackers write them — "9:00am" — so the seed
 * data and anything typed in the editor sort and display the same way.
 */

export const SESSION_KINDS = ['session', 'keynote', 'panel', 'break', 'meal', 'gala'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const KIND_LABEL: Record<string, string> = {
  session: 'Session',
  keynote: 'Keynote',
  panel: 'Panel',
  break: 'Break',
  meal: 'Meal',
  gala: 'Gala',
};

/** "9:05am" → 545. Unparseable times sort last. */
export function toMinutes(t: string | null | undefined): number {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m?\.?\s*$/i.exec(t ?? '');
  if (!m) return 24 * 60;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'p') h += 12;
  return h * 60 + Number(m[2] ?? 0);
}

/** "9:05am" → "09:05", for <input type="time">. */
export function toInputTime(t: string | null | undefined): string {
  const mins = toMinutes(t);
  if (mins >= 24 * 60) return '';
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/** "13:30" → "1:30pm". Returns null for anything that is not HH:MM. */
export function fromInputTime(v: unknown): string | null {
  const m = /^(\d{2}):(\d{2})$/.exec(String(v ?? ''));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]}${h < 12 ? 'am' : 'pm'}`;
}

/** Minutes between two stored times; 0 when either is missing. */
export function durationMinutes(start: string, end: string): number {
  const d = toMinutes(end) - toMinutes(start);
  return d > 0 && d < 24 * 60 ? d : 0;
}
