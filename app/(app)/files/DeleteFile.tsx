'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteFile({ id, name }: { id: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function remove() {
    if (!confirm(`Delete “${name}”? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? 'The file was not deleted.');
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label={`Delete ${name}`}
      title="Delete"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition hover:bg-brick-100 hover:text-brick"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
      </svg>
    </button>
  );
}
