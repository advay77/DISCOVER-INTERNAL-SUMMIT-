export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(d: Date | string | null | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function longDate(d: Date | string | null | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function dateRange(a: Date | string, b: Date | string) {
  const s = new Date(a);
  const e = new Date(b);
  const same = s.getMonth() === e.getMonth();
  return same
    ? `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`
    : `${shortDate(s)} – ${longDate(e)}`;
}

export function relativeTime(d: Date | string) {
  const then = new Date(d).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return shortDate(d);
}

export function clockTime(d: Date | string) {
  const date = new Date(d);
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export function daysUntil(d: Date | string) {
  const target = new Date(d).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function dueLabel(d: Date | string | null | undefined) {
  if (!d) return { text: 'No date', tone: 'neutral' as const };
  const n = daysUntil(d);
  if (n < 0) return { text: `${Math.abs(n)}d overdue`, tone: 'bad' as const };
  if (n === 0) return { text: 'Due today', tone: 'warn' as const };
  if (n === 1) return { text: 'Due tomorrow', tone: 'warn' as const };
  if (n <= 7) return { text: `${n} days left`, tone: 'warn' as const };
  return { text: `${n} days left`, tone: 'neutral' as const };
}

export function money(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `$${n.toLocaleString('en-US')}`;
}

export function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}
