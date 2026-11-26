'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

/**
 * Light / dark switch. The choice is kept in localStorage; with no choice
 * saved, the theme follows the device setting. The inline script in the root
 * layout applies it before first paint, so there is no flash.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {}
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className={clsx(
        'flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition hover:bg-paper hover:text-ink lg:h-11 lg:w-11 lg:bg-white lg:shadow-card',
        className,
      )}
    >
      {dark ? (
        // Sun
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Moon
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
