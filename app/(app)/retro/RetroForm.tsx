'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { addRetroItem } from '@/app/actions';

const KINDS = [
  { key: 'plus', label: 'Plus', hint: 'Worked well', active: 'bg-forest text-white' },
  { key: 'delta', label: 'Delta', hint: 'Improve next time', active: 'bg-brass text-white' },
  { key: 'consider', label: 'Consider', hint: 'New idea for next year', active: 'bg-brand text-white' },
];

export function RetroForm() {
  const [pending, start] = useTransition();
  const [kind, setKind] = useState('plus');
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          setError(null);
          const res = await addRetroItem(fd);
          if ((res as any)?.error) {
            setError((res as any).error);
            return;
          }
          ref.current?.reset();
          router.refresh();
        })
      }
      className="card p-4 sm:p-5"
    >
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] font-medium text-ink-muted">Add a note:</span>
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => setKind(k.key)}
            aria-pressed={kind === k.key}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition',
              kind === k.key ? k.active : 'bg-panel text-ink-muted hover:text-ink',
            )}
          >
            {k.label}
            <span className={clsx('ml-1.5 hidden font-normal sm:inline', kind === k.key ? 'opacity-80' : 'text-ink-faint')}>· {k.hint}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <textarea
          name="text"
          rows={2}
          required
          aria-label="What happened"
          placeholder="Be specific — next year's team reads this."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ref.current?.requestSubmit();
          }}
          className="input min-h-[64px] flex-1 resize-y"
        />
        <button className="btn-primary sm:h-[64px] sm:px-6" disabled={pending}>
          {pending ? 'Adding…' : 'Add note'}
        </button>
      </div>
      {error && <p className="mt-2 text-[12.5px] font-medium text-brick">{error}</p>}
    </form>
  );
}
