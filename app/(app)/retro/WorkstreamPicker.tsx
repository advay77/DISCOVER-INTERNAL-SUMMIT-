'use client';

import { useRouter } from 'next/navigation';

/** Chooses which workstream's retro is shown (kept in the URL as ?ws=). */
export function WorkstreamPicker({ workstreams, active }: { workstreams: { key: string; name: string; color: string }[]; active: string }) {
  const router = useRouter();
  const color = workstreams.find((w) => w.key === active)?.color;
  return (
    <label className="relative flex items-center gap-2">
      <span className="text-[12.5px] font-medium text-ink-muted">Workstream</span>
      <span className="pointer-events-none absolute left-[94px] h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <select
        aria-label="Workstream retro"
        value={active}
        onChange={(e) => router.push(`/retro?ws=${e.target.value}`)}
        className="input w-auto min-w-[220px] rounded-full py-2 pl-7 pr-9 font-medium"
      >
        {workstreams.map((w) => (
          <option key={w.key} value={w.key}>{w.name}</option>
        ))}
      </select>
    </label>
  );
}
