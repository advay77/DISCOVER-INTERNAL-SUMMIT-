'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addRetroItem } from '@/app/actions';

export function RetroForm() {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          await addRetroItem(fd);
          ref.current?.reset();
          router.refresh();
        })
      }
      className="card flex flex-wrap items-end gap-3 p-4"
    >
      <div className="min-w-[180px]">
        <label className="label">Kind</label>
        <select name="kind" className="input mt-1.5">
          <option value="plus">Plus — worked well</option>
          <option value="delta">Delta — improve</option>
          <option value="consider">Consider next year</option>
        </select>
      </div>
      <div className="min-w-[260px] flex-1">
        <label className="label">What happened</label>
        <input name="text" className="input mt-1.5" placeholder="Be specific — next year's team reads this." required />
      </div>
      <button className="btn-primary" disabled={pending}>
        {pending ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}
