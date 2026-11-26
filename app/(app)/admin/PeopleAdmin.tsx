'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Pill } from '@/components/ui';
import { setUserRole, setUserActive } from '@/app/actions';

type P = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  company: string | null;
  accent: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  workstreams: string[];
};

export function PeopleAdmin({
  people,
  roles,
  meId,
  canChangeRoles,
}: {
  people: P[];
  roles: { id: string; name: string }[];
  meId: string;
  canChangeRoles: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function act(fn: () => Promise<any>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">People</h2>
          <p className="text-[12.5px] text-ink-muted">
            These are the issued accounts. Deactivate rather than delete — history stays intact.
          </p>
        </div>
      </header>

      {error && <p className="bg-brick/10 px-5 py-2 text-[13px] font-medium text-brick">{error}</p>}

      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead className="border-b border-line bg-paper">
          <tr>
            <th className="th">Member</th>
            <th className="th">Workstreams</th>
            <th className="th">Role</th>
            <th className="th">Status</th>
            <th className="th"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {people.map((p) => (
            <tr key={p.id} className={p.isActive ? '' : 'opacity-50'}>
              <td className="td">
                <span className="flex items-center gap-3">
                  <Avatar name={p.name} accent={p.accent} size={32} />
                  <span>
                    <Link href={`/profile/${p.id}`} className="block text-[13.5px] font-medium text-ink hover:text-brand">
                      {p.name}
                    </Link>
                    <span className="block text-[12px] text-ink-faint">
                      {p.title ?? p.email}
                      {p.company ? ` · ${p.company}` : ''}
                    </span>
                  </span>
                </span>
              </td>
              <td className="td">
                <span className="flex flex-wrap gap-1">
                  {p.workstreams.map((w) => (
                    <Pill key={w} tone="neutral">
                      {w}
                    </Pill>
                  ))}
                  {p.workstreams.length === 0 && <span className="text-[12.5px] text-ink-faint">—</span>}
                </span>
              </td>
              <td className="td">
                {canChangeRoles ? (
                  <select
                    defaultValue={p.roleId}
                    disabled={pending}
                    onChange={(e) => act(() => setUserRole(p.id, e.target.value))}
                    className="input py-1.5 text-[13px]"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Pill tone="brand">{p.roleName}</Pill>
                )}
              </td>
              <td className="td">
                <Pill tone={p.isActive ? 'ok' : 'neutral'}>{p.isActive ? 'Active' : 'Deactivated'}</Pill>
              </td>
              <td className="td text-right">
                {p.id !== meId && (
                  <button
                    onClick={() => act(() => setUserActive(p.id, !p.isActive))}
                    disabled={pending}
                    className="text-[13px] font-semibold text-ink-muted hover:text-brick"
                  >
                    {p.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}
