import 'server-only';

/**
 * Input bounds.
 *
 * React escapes everything it renders and Prisma parameterises every query, so
 * the risk here is not injection — it is unbounded input: a megabyte message,
 * a thousand-character channel name, a date that is not a date. Everything that
 * reaches the database goes through one of these first.
 */

export const LIMITS = {
  name: 120,
  email: 200,
  title: 200,
  shortText: 300,
  body: 8000,
  notes: 4000,
  channelName: 40,
  purpose: 200,
} as const;

/** Trims, strips control characters, and caps the length. */
export function text(value: unknown, max: number): string {
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

/** Same, but an empty string becomes null so the column stays clean. */
export function optionalText(value: unknown, max: number): string | null {
  const out = text(value, max);
  return out.length ? out : null;
}

export function email(value: unknown): string | null {
  const out = text(value, LIMITS.email).toLowerCase();
  // Deliberately permissive — the point is to reject nonsense, not to police
  // valid but unusual addresses.
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(out) ? out : null;
}

/** Only accepts a value from a known set, which is how every status works. */
export function oneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  const out = String(value ?? '');
  return (allowed as readonly string[]).includes(out) ? (out as T[number]) : fallback;
}

export function date(value: unknown): Date | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  // Reject anything absurd, which usually means a typo rather than an attack.
  const year = parsed.getFullYear();
  return year >= 2000 && year <= 2100 ? parsed : null;
}

export function wholeNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Ids we generate are cuids; anything else is not worth a database round trip. */
export function id(value: unknown): string | null {
  const out = String(value ?? '').trim();
  return /^[a-z0-9]{20,40}$/.test(out) ? out : null;
}

export function idList(value: unknown, max = 50): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(id).filter((x): x is string => !!x).slice(0, max);
}

export const STATUSES = {
  task: ['todo', 'in_progress', 'review', 'done'] as const,
  priority: ['low', 'medium', 'high'] as const,
  speaker: ['Identified', 'Invited', 'Responded', 'Confirmed', 'Declined'] as const,
  question: ['Open', 'In progress', 'Answered', 'Blocked'] as const,
  retro: ['plus', 'delta', 'consider'] as const,
  channel: ['public', 'private'] as const,
};
