/**
 * DISCOVER wordmark — a reconstruction of the mark on the reference boards
 * (arc above, wordmark, tagline). Swap in the official SVG here and it changes
 * everywhere in the product.
 */
export function Logo({
  tone = 'light',
  size = 'md',
  tagline = true,
}: {
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  tagline?: boolean;
}) {
  const word = size === 'lg' ? 'text-[32px]' : size === 'md' ? 'text-[20px]' : 'text-[16px]';
  const color = tone === 'light' ? 'text-white' : 'text-navy';
  const arcColor = tone === 'light' ? '#8FB4DC' : '#1F5FA8';
  const tagColor = tone === 'light' ? 'text-white/45' : 'text-ink-faint';
  const tagSize = size === 'lg' ? 'text-[10px]' : 'text-[8px]';

  return (
    <div className="select-none leading-none">
      <svg
        viewBox="0 0 200 16"
        className={size === 'lg' ? 'h-2.5 w-[188px]' : size === 'md' ? 'h-2 w-[124px]' : 'h-1.5 w-[98px]'}
        fill="none"
        aria-hidden
      >
        <path d="M2 14C42 2 158 2 198 14" stroke={arcColor} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className={`${word} ${color} mt-1.5 font-bold tracking-[0.14em]`}>DISCOVER</div>
      {tagline && (
        <div className={`${tagSize} ${tagColor} mt-1.5 font-semibold uppercase tracking-[0.2em]`}>
          Educate. Connect. Lead.
        </div>
      )}
    </div>
  );
}
