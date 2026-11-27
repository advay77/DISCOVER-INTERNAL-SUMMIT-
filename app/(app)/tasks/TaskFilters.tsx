'use client';

import { useRouter } from 'next/navigation';

type Values = { who?: string; ws?: string; pri?: string };

/** The three task filters: whose tasks, which workstream, what priority. */
export function TaskFilters({
  values,
  workstreams,
  nMine,
  base,
}: {
  values: Values;
  workstreams: { id: string; name: string }[];
  nMine: number;
  /** The other params to keep (search, view, quick filter). */
  base: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const go = (change: Values) => {
    const next = { ...base, ...values, ...change };
    const qs = Object.entries(next)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join('&');
    router.push(`/tasks${qs ? `?${qs}` : ''}`);
  };
  const sel = 'input w-full rounded-full border-transparent bg-white py-2 pl-4 pr-9 text-[13.5px] font-medium shadow-card sm:w-auto';

  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
      <select aria-label="Whose tasks" className={sel} value={values.who ?? ''} onChange={(e) => go({ who: e.target.value || undefined })}>
        <option value="">Everyone</option>
        <option value="mine">My tasks ({nMine})</option>
      </select>
      <select aria-label="Workstream" className={sel} value={values.ws ?? ''} onChange={(e) => go({ ws: e.target.value || undefined })}>
        <option value="">All workstreams</option>
        {workstreams.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>
      <select aria-label="Priority" className={sel} value={values.pri ?? ''} onChange={(e) => go({ pri: e.target.value || undefined })}>
        <option value="">Any priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
  );
}
