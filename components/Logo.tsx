import clsx from 'clsx';

/**
 * The DISCOVER Supply Chain logo (public/discover-logo.png).
 *
 * The artwork has grey lettering that disappears on a dark background, so on
 * dark surfaces — the login panel (`tone="light"`) and dark theme everywhere —
 * it sits on a small white plate.
 */
export function Logo({
  tone = 'dark',
  size = 'md',
}: {
  /** `light` = placed on a dark surface. */
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  /** Kept for call-site compatibility; the artwork carries its own tagline. */
  tagline?: boolean;
}) {
  const height = size === 'lg' ? 'h-16' : size === 'md' ? 'h-[54px]' : 'h-9';
  return (
    <span
      className={clsx(
        'inline-flex w-fit select-none items-center',
        tone === 'light'
          ? 'rounded-2xl bg-snow px-3.5 py-2'
          : 'dark:rounded-xl dark:bg-snow dark:px-2.5 dark:py-1.5',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/discover-logo.png" alt="DISCOVER Supply Chain" className={clsx(height, 'w-auto')} />
    </span>
  );
}
