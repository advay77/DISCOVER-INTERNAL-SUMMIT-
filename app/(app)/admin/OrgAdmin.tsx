'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminUpdateRole, adminUpdateWorkstream } from '@/app/actions';

type Ws = { id: string; name: string; description: string | null; color: string; leadId: string | null; restricted: boolean; members: number };
type Role = { id: string; name: string; description: string | null; members: number };
type Option = { id: string; name: string };

export function OrgAdmin({ workstreams, roles, people }: { workstreams: Ws[]; roles: Role[]; people: Option[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="card p-5">
        <h2 className="text-[17px] font-semibold text-ink">Workstreams</h2>
        <p className="text-[12.5px] text-ink-muted">Name, colour, purpose and lead. The colour follows the workstream everywhere.</p>
        <div className="mt-4 space-y-3">
          {workstreams.map((w) => (
            <WorkstreamRow key={w.id} w={w} people={people} />
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-[17px] font-semibold text-ink">Roles</h2>
        <p className="text-[12.5px] text-ink-muted">Rename a role or describe it. What each role can do lives in the permission matrix.</p>
        <div className="mt-4 space-y-3">
          {roles.map((r) => (
            <RoleRow key={r.id} r={r} />
          ))}
        </div>
      </section>
    </div>
  );
}

function useSave() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<any>) =>
    start(async () => {
      const res = await fn();
      if (res?.error) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: 'Saved' });
        router.refresh();
        setTimeout(() => setMsg(null), 2000);
      }
    });
  return { pending, msg, run };
}

function WorkstreamRow({ w, people }: { w: Ws; people: Option[] }) {
  const { pending, msg, run } = useSave();
  return (
    <form action={(fd) => run(() => adminUpdateWorkstream(fd))} className="subcard grid gap-2.5 p-3.5 sm:grid-cols-[44px_1fr_1fr]">
      <input type="hidden" name="id" value={w.id} />
      <input
        type="color"
        name="color"
        defaultValue={w.color}
        aria-label={`${w.name} colour`}
        className="h-10 w-11 cursor-pointer rounded-xl border border-line bg-white p-1"
      />
      <input name="name" defaultValue={w.name} aria-label="Workstream name" required className="input bg-white font-semibold" />
      <select name="leadId" defaultValue={w.leadId ?? ''} aria-label={`${w.name} lead`} className="input bg-white">
        <option value="">No lead</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            Lead · {p.name}
          </option>
        ))}
      </select>
      <input
        name="description"
        defaultValue={w.description ?? ''}
        placeholder="What this workstream owns"
        aria-label={`${w.name} description`}
        className="input bg-white sm:col-span-2 sm:col-start-2"
      />
      <div className="flex items-center justify-between gap-2 sm:col-span-3">
        <span className="text-[12px] text-ink-faint">
          {w.members} {w.members === 1 ? 'member' : 'members'}
          {w.restricted && ' · board only'}
        </span>
        <span className="flex items-center gap-2">
          {msg && <span className={msg.ok ? 'text-[12.5px] font-medium text-forest' : 'text-[12.5px] font-medium text-brick'}>{msg.text}</span>}
          <button className="btn-primary btn-sm" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </button>
        </span>
      </div>
    </form>
  );
}

function RoleRow({ r }: { r: Role }) {
  const { pending, msg, run } = useSave();
  return (
    <form action={(fd) => run(() => adminUpdateRole(fd))} className="subcard space-y-2.5 p-3.5">
      <input type="hidden" name="id" value={r.id} />
      <div className="flex items-center gap-2">
        <input name="name" defaultValue={r.name} aria-label="Role name" required className="input bg-white font-semibold" />
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[12px] text-ink-muted">{r.members}</span>
      </div>
      <input name="description" defaultValue={r.description ?? ''} aria-label={`${r.name} description`} className="input bg-white" />
      <div className="flex items-center justify-end gap-2">
        {msg && <span className={msg.ok ? 'text-[12.5px] font-medium text-forest' : 'text-[12.5px] font-medium text-brick'}>{msg.text}</span>}
        <button className="btn-primary btn-sm" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
