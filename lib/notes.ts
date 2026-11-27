/**
 * Turns pasted meeting notes into draft tasks, without any AI service.
 *
 * Each action line becomes one task. From the line it picks up:
 *   - an owner:      "@Odi", "Odi to …", "(Taylor)", "owner: Minu Patel"
 *   - a due date:    "by Dec 5", "due 12/05", "on 2026-12-05", "tomorrow",
 *                    "next week", "by Friday", "EOW", "in 3 days"
 *   - a priority:    "urgent", "ASAP", "high priority", "!!" → high; "low priority" → low
 *   - a workstream:  its name or a short alias ("summit", "comms", "finance" …)
 * Headings ("Action items:"), blank lines and very short fragments are skipped.
 * Everything is shown for review before any task is created.
 */

export type Person = { id: string; name: string };
export type Stream = { id: string; name: string };
export type Draft = {
  key: string;
  include: boolean;
  title: string;
  ownerId: string;
  workstreamId: string;
  dueDate: string; // yyyy-mm-dd or ''
  priority: 'high' | 'medium' | 'low';
  source: string;
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const ALIASES: [RegExp, RegExp][] = [
  [/professional|webinar|earth day/i, /\b(prof(essional)?\s*dev(elopment)?|pd|webinars?|earth day)\b/i],
  [/academic/i, /\b(academic|universit(y|ies)|students?|campus|schools?)\b/i],
  [/partner/i, /\b(partners?(hips?)?|sponsors?(hip)?|prospectus)\b/i],
  [/communic/i, /\b(comms|communications?|linkedin|newsletter|email blast|social|marketing|save the date)\b/i],
  [/finance/i, /\b(finance|budget|invoices?|payments?|treasurer)\b/i],
  // Summit last: most notes mention it in passing.
  [/summit/i, /\b(summit|gala|run of show|venue|agenda|keynote|panel|hotel)\b/i],
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** A date in the future: "Dec 5" in late December means next year. */
function upcoming(month: number, day: number, today: Date, year?: number) {
  let d = new Date(year ?? today.getFullYear(), month, day);
  if (year === undefined && d < addDays(today, -1)) d = new Date(today.getFullYear() + 1, month, day);
  return Number.isNaN(d.getTime()) || d.getDate() !== day ? null : d;
}

function findDate(line: string, today: Date): { date: Date | null; match: string } {
  const l = line.toLowerCase();
  let m: RegExpMatchArray | null;
  const pre = '(?:(?:by|due|on|before|until|deadline:?)\\s+)?';

  if ((m = l.match(new RegExp(`${pre}(\\d{4})-(\\d{1,2})-(\\d{1,2})`)))) return { date: upcoming(+m[2] - 1, +m[3], today, +m[1]), match: m[0] };
  if ((m = l.match(new RegExp(`${pre}(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?`)))) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : undefined;
    return { date: upcoming(+m[1] - 1, +m[2], today, y), match: m[0] };
  }
  const mon = `(${MONTHS.join('|')})[a-z]*\\.?`;
  if ((m = l.match(new RegExp(`${pre}${mon}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`)))) {
    return { date: upcoming(MONTHS.indexOf(m[1]), +m[2], today, m[3] ? +m[3] : undefined), match: m[0] };
  }
  if ((m = l.match(new RegExp(`${pre}(\\d{1,2})(?:st|nd|rd|th)?\\s+${mon}(?:\\s+(\\d{4}))?`)))) {
    return { date: upcoming(MONTHS.indexOf(m[2]), +m[1], today, m[3] ? +m[3] : undefined), match: m[0] };
  }
  if ((m = l.match(new RegExp(`${pre}today`)))) return { date: today, match: m[0] };
  if ((m = l.match(new RegExp(`${pre}tomorrow`)))) return { date: addDays(today, 1), match: m[0] };
  if ((m = l.match(/\bin\s+(\d{1,2})\s+days?\b/))) return { date: addDays(today, +m[1]), match: m[0] };
  if ((m = l.match(/\bin\s+(\d{1,2})\s+weeks?\b/))) return { date: addDays(today, 7 * +m[1]), match: m[0] };
  if ((m = l.match(new RegExp(`${pre}(next week)`)))) return { date: addDays(today, 7), match: m[0] };
  if ((m = l.match(/\b(by\s+)?(eow|end of (the )?week)\b/))) return { date: addDays(today, (5 - today.getDay() + 7) % 7 || 7), match: m[0] };
  if ((m = l.match(/\b(by\s+)?(eom|end of (the )?month)\b/))) return { date: new Date(today.getFullYear(), today.getMonth() + 1, 0), match: m[0] };
  if ((m = l.match(new RegExp(`${pre}(next\\s+)?(${DAYS.join('|')})`)))) {
    const target = DAYS.indexOf(m[2]);
    let n = (target - today.getDay() + 7) % 7 || 7;
    if (m[1]) n += n < 7 ? 7 : 0;
    return { date: addDays(today, n), match: m[0] };
  }
  return { date: null, match: '' };
}

function findOwner(line: string, people: Person[]): { id: string | null; match: string } {
  // First names only count when exactly one person has that first name.
  const firstCount = new Map<string, number>();
  for (const p of people) { const f = p.name.split(/\s+/)[0].toLowerCase(); firstCount.set(f, (firstCount.get(f) ?? 0) + 1); }
  const cands = people
    .flatMap((p) => {
      const first = p.name.split(/\s+/)[0];
      const out = [{ id: p.id, n: p.name }];
      if (first !== p.name && firstCount.get(first.toLowerCase()) === 1) out.push({ id: p.id, n: first });
      return out;
    })
    .sort((a, b) => b.n.length - a.n.length); // "Minu Patel" before "Minu"
  for (const c of cands) {
    const esc = c.n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:@|owner:?\\s*|assigned to\\s+|\\(\\s*)?\\b${esc}\\b(?:\\s*\\))?(?:\\s+(?:to|will|should|needs to)\\b)?`, 'i');
    const m = line.match(re);
    if (m) return { id: c.id, match: m[0] };
  }
  return { id: null, match: '' };
}

function findStream(line: string, streams: Stream[]): string | null {
  for (const [nameRe, wordRe] of ALIASES) {
    if (wordRe.test(line)) {
      const s = streams.find((w) => nameRe.test(w.name));
      if (s) return s.id;
    }
  }
  for (const s of streams) if (new RegExp(`\\b${s.name}\\b`, 'i').test(line)) return s.id;
  return null;
}

function findPriority(line: string): { p: Draft['priority']; match: string } {
  let m = line.match(/\(?\b(urgent|asap|high[- ]priority|critical|p1)\b\)?|!!+/i);
  if (m) return { p: 'high', match: m[0] };
  m = line.match(/\(?\b(low[- ]priority|nice to have|p3|someday)\b\)?/i);
  if (m) return { p: 'low', match: m[0] };
  return { p: 'medium', match: '' };
}

const BULLET = /^\s*(?:[-*•·▪◦–—]|\d{1,2}[.)]|\[[ xX]?\]|☐|☑|>)\s*/;
const LABEL = /^\s*(?:action(?: item)?s?|ai|todo|to-do|task|follow[- ]?up|next steps?)\s*[:\-–]\s*/i;

export function parseNotes(
  notes: string,
  opts: { people: Person[]; streams: Stream[]; meId: string; defaultStreamId: string; today?: Date },
): Draft[] {
  const today = opts.today ?? new Date();
  today.setHours(0, 0, 0, 0);
  const out: Draft[] = [];
  notes.split(/\r?\n/).forEach((raw, i) => {
    let line = raw.replace(BULLET, '').replace(LABEL, '').trim();
    if (!line || line.length < 4) return;
    if (/[:：]$/.test(line) && line.split(/\s+/).length <= 6) return; // a heading
    if (/^(attendees?|present|agenda|notes?|minutes|date|location)\b/i.test(line)) return;
    // A meeting title such as "Summit planning call – Nov 27"
    if (!BULLET.test(raw) && /\b(call|meeting|sync|minutes|notes|recap|stand-?up|check-?in)\b/i.test(line) && line.split(/\s+/).length <= 8) return;

    const owner = findOwner(line, opts.people);
    const due = findDate(line, today);
    const pri = findPriority(line);
    const ws = findStream(line, opts.streams) ?? opts.defaultStreamId;

    let title = line;
    for (const piece of [due.match, pri.match]) if (piece) title = title.replace(new RegExp(piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
    if (owner.match) title = title.replace(owner.match, ' ');
    title = title
      .replace(/\s*[-–—,;:]\s*$/g, '')
      .replace(/^\s*[-–—,;:]\s*/g, '')
      .replace(/\(\s*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (title.length < 3) title = line;
    title = title.charAt(0).toUpperCase() + title.slice(1);

    out.push({
      key: `${i}-${title.slice(0, 12)}`,
      include: true,
      title: title.slice(0, 200),
      ownerId: owner.id ?? opts.meId,
      workstreamId: ws,
      dueDate: due.date ? iso(due.date) : '',
      priority: pri.p,
      source: raw.trim(),
    });
  });
  return out.slice(0, 60);
}
