'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Pill } from '@/components/ui';
import { setUserRole, setUserActive, inviteUser } from '@/app/actions';

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
  workstreams,
  meId,
  canChangeRoles,
}: {
  people: P[];
  roles: { id: string; name: string }[];
  workstreams: { id: string; name: string }[];
  meId: string;
  canChangeRoles: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
            Deactivate rather than delete — a departing director&rsquo;s history stays intact.
          </p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setOpen(true)}>
          + Invite member
        </button>
      </header>

      {error && <p className="bg-brick/10 px-5 py-2 text-[13px] font-medium text-brick">{error}</p>}
      {notice && <p className="bg-forest/10 px-5 py-2 text-[13px] font-medium text-forest">{notice}</p>}

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
                    <span className="block text-[13.5px] font-medium text-ink">{p.name}</span>
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/35 p-4 py-10 backdrop-blur-sm">
          <div className="card my-auto w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Invite a member</h2>
              <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
                ✕
              </button>
            </div>

            <form
              action={(fd) =>
                start(async () => {
                  const res = await inviteUser(fd);
                  if ((res as any)?.error) setError((res as any).error);
                  else {
                    setOpen(false);
                    setNotice(
                      'Invited. Their first password is recorded in the audit log — send it to them privately and have them change it.',
                    );
                    router.refresh();
                  }
                })
              }
              className="space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Name</label>
                  <input name="name" className="input mt-1.5" required />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input name="email" type="email" className="input mt-1.5" required />
                </div>
                <div>
                  <label className="label">Title</label>
                  <input name="title" className="input mt-1.5" />
                </div>
                <div>
                  <label className="label">Company</label>
                  <input name="company" className="input mt-1.5" />
                </div>
              </div>

              <div>
                <label className="label">Role</label>
                <select name="roleId" className="input mt-1.5" required>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Workstreams</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {workstreams.map((w) => (
                    <label key={w.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px]">
                      <input type="checkbox" name="workstreams" value={w.id} className="accent-brand" />
                      {w.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary" disabled={pending}>
                  {pending ? 'Inviting…' : 'Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
