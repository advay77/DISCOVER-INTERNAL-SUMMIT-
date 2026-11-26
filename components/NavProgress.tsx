'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * A thin bar at the top of the screen from the moment a link is tapped until
 * the next page arrives, so a tap never feels ignored on a slow connection.
 * It only watches clicks and the URL; it does not change how routing works.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);

  // The new URL has rendered: done.
  useEffect(() => setActive(false), [pathname, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setActive(true);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Never leave it stuck if a navigation is abandoned.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 15000);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden">
      <div
        className={
          active
            ? 'h-full w-full origin-left animate-[navbar_2.5s_ease-out_forwards] bg-accent'
            : 'h-full w-full origin-left scale-x-0 bg-accent opacity-0 transition-opacity duration-300'
        }
      />
    </div>
  );
}
