import Link from 'next/link';
import clsx from 'clsx';
import { initials } from '@/lib/format';

export function Avatar({
  name,
  accent = '#1F5FA8',
  size = 28,
  ring = false,
}: {
  name: string;
  accent?: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-[3px] font-semibold tracking-tight text-white',
        ring && 'ring-2 ring-white',
      )}
      style={{ background: accent, width: size, height: size, fontSize: size * 0.35 }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

/** Hairline tag with a status dot — not a filled candy pill. */
const TONES: Record<string, { box: string; dot: string }> = {
  ok: { box: 'border-forest/30 bg-forest-100 text-forest', dot: '#1E7A4B' },
  warn: { box: 'border-brass/30 bg-brass-100 text-brass', dot: '#B4761F' },
  bad: { box: 'border-brick/30 bg-brick-100 text-brick', dot: '#A62B2B' },
  brand: { box: 'border-brand/25 bg-brand-100 text-brand', dot: '#1F5FA8' },
  neutral: { box: 'border-line bg-white text-ink-muted', dot: '#8A93A0' },
  navy: { box: 'border-navy/20 bg-navy/[0.06] text-navy', dot: '#0A2240' },
};

export function Pill({
  children,
  tone = 'neutral',
  className,
  dot = true,
}: {
  children: React.ReactNode;
  tone?: string;
  className?: string;
  dot?: boolean;
}) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <span className={clsx('pill', t.box, className)}>
      {dot && <span className="h-[5px] w-[5px] rounded-full" style={{ background: t.dot }} />}
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: string; label: string }> = {
    todo: { tone: 'neutral', label: 'To do' },
    in_progress: { tone: 'brand', label: 'In progress' },
    review: { tone: 'warn', label: 'Review' },
    done: { tone: 'ok', label: 'Done' },
    Confirmed: { tone: 'ok', label: 'Confirmed' },
    Invited: { tone: 'brand', label: 'Invited' },
    Responded: { tone: 'warn', label: 'Responded' },
    Identified: { tone: 'neutral', label: 'Identified' },
    Declined: { tone: 'bad', label: 'Declined' },
    Open: { tone: 'warn', label: 'Open' },
    'In progress': { tone: 'brand', label: 'In progress' },
    Answered: { tone: 'ok', label: 'Answered' },
    Blocked: { tone: 'bad', label: 'Blocked' },
    Prospect: { tone: 'neutral', label: 'Prospect' },
    Negotiating: { tone: 'warn', label: 'Negotiating' },
    Paid: { tone: 'ok', label: 'Paid' },
    'Deposit paid': { tone: 'brand', label: 'Deposit paid' },
    Quoted: { tone: 'warn', label: 'Quoted' },
    'Not started': { tone: 'neutral', label: 'Not started' },
    Pending: { tone: 'warn', label: 'Pending' },
    Waitlist: { tone: 'neutral', label: 'Waitlist' },
  };
  const v = map[status] ?? { tone: 'neutral', label: status };
  return <Pill tone={v.tone}>{v.label}</Pill>;
}

export function Card({
  title,
  action,
  children,
  className,
  bodyClass,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={clsx('card overflow-hidden', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-label text-ink-muted">{title}</h2>
          {action}
        </header>
      )}
      <div className={bodyClass ?? 'p-5'}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div className="max-w-2xl">
        <h1 className="display text-[30px] leading-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Ring({
  value,
  label,
  sub,
  tone = '#1F5FA8',
  size = 86,
}: {
  value: number;
  label: string;
  sub?: string;
  tone?: string;
  size?: number;
}) {
  const r = (size - 7) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#E0E1DD" strokeWidth="5" fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={tone}
            strokeWidth="5"
            fill="none"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="display absolute inset-0 flex items-center justify-center text-[20px] text-ink">
          {value}%
        </div>
      </div>
      <p className="mt-2.5 text-[12px] font-semibold uppercase tracking-label text-ink-muted">{label}</p>
      {sub && <p className="mt-0.5 text-[11.5px] text-ink-faint">{sub}</p>}
    </div>
  );
}

/** A counter reads as a figure in a report: big numeral, quiet label, hairline box. */
export function StatTile({
  value,
  label,
  tone = 'brand',
  href,
  icon,
}: {
  value: React.ReactNode;
  label: string;
  tone?: 'brand' | 'ok' | 'warn' | 'bad' | 'navy';
  href?: string;
  icon?: React.ReactNode;
}) {
  const rule = {
    brand: 'before:bg-brand',
    ok: 'before:bg-forest',
    warn: 'before:bg-brass',
    bad: 'before:bg-brick',
    navy: 'before:bg-navy',
  }[tone];

  const text = {
    brand: 'text-brand',
    ok: 'text-forest',
    warn: 'text-brass',
    bad: 'text-brick',
    navy: 'text-navy',
  }[tone];

  const inner = (
    <div
      className={clsx(
        'card relative overflow-hidden px-5 py-4 transition',
        'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:content-[""]',
        rule,
        href && 'hover:border-line-strong',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="display text-[34px] leading-none text-ink">{value}</div>
        {icon && <span className={clsx('mt-0.5', text)}>{icon}</span>}
      </div>
      <div className="mt-2 text-[11.5px] uppercase tracking-label text-ink-muted">{label}</div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function Bar({ value, tone = '#1F5FA8' }: { value: number; tone?: string }) {
  return (
    <div className="h-[5px] w-full overflow-hidden bg-line">
      <div
        className="h-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: tone }}
      />
    </div>
  );
}
