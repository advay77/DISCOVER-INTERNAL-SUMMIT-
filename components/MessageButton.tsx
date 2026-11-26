'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { openDm } from './NewMessage';

/** "Message" — opens your direct conversation with this person. */
export function MessageButton({ userId, name, className }: { userId: string; name: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function go(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      const key = await openDm(userId);
      router.push(`/chat/${key}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not open the conversation.');
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      aria-label={`Message ${name}`}
      className={clsx('btn-ghost btn-sm', className)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
      </svg>
      {busy ? 'Opening…' : 'Message'}
    </button>
  );
}
