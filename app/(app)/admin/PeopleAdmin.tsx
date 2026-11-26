'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Avatar, Pill } from '@/components/ui';
import { IconSearch } from '@/components/icons';
import { adminUpdateUser, adminSetPassword, adminCreateUser, setUserActive } from '@/app/actions';

type P = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  company: string | null;
  phone: string | null;
  accent: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  workstreamIds: string[];
};

type Option = { id: string; name: string; color?: string };

export function PeopleAdmin({
  people,
  roles,
  workstreams,
  meId,
  canChangeRoles,
}: {
  people: P[];
  roles: Option[];
  workstreams: Option[];
  meId: string;
  canChangeRoles: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<P | 'new' | null>(null);
  const [query, setQuery] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  const wsName = useMemo(() => Object.fromEntries(workstreams.map((w) => [w.id, w])), [workstreams]);
  const shown = people.filter((p) =>
    `${p.name} ${p.email} ${p.title ?? ''} ${p.company ?? ''} ${p.roleName}`.toLowerCase().includes(query.toLowerCase()),
  );

  function toggleActive(p: P) {
    setError(null);
    start(async () => {
      const res = await setUserActive(p.id, !p.isActive);
      if ((res as any)?.error) setError((res as any).error);
      else router.refresh();
    });
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">People</h2>
          <p className="text-[12.5px] text-ink-muted">
            Edit anything about a member — name, email, role, workstreams, password. Every change is in the audit log.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="relative flex-1 sm:w-56 sm:flex-none">
            <IconSearch size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a member"
              aria-label="Find a member"
              className="input rounded-full bg-panel py-1.5 pl-9"
            />
          </label>
          <button type="button" className="btn-primary btn-sm shrink-0" onClick={() => setEditing('new')}>
            + Add member
          </button>
        </div>
      </header>

      {error && <p className="mx-5 mb-3 rounded-xl bg-brick-100 px-4 py-2 text-[13px] font-medium text-brick">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px]">
          <thead className="border-y border-line">
            <tr>
              <th className="th">Member</th>
              <th className="th">Workstreams</th>
              <th className="th">Role</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((p) => (
              <tr key={p.id} className={clsx('hover:bg-panel/60', !p.isActive && 'opacity-55')}>
                <td className="td">
                  <span className="flex items-center gap-3">
                    <Avatar name={p.name} accent={p.accent} size={34} />
                    <span className="min-w-0">
                      <Link prefetch={false} href={`/profile/${p.id}`} className="block truncate text-[13.5px] font-semibold text-ink hover:underline">
                        {p.name}
                        {p.id === meId && <span className="ml-1.5 text-[11.5px] font-medium text-ink-faint">(you)</span>}
                      </Link>
                      <span className="block truncate text-[12px] text-ink-faint">
                        {p.email}
                        {p.title ? ` · ${p.title}` : ''}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="td">
                  <span className="flex flex-wrap gap-1">
                    {p.workstreamIds.map((w) => (
                      <span key={w} className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2 py-[3px] text-[11.5px] text-ink-muted">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: wsName[w]?.color }} />
                        {wsName[w]?.name}
                      </span>
                    ))}
                    {p.workstreamIds.length === 0 && <span className="text-[12.5px] text-ink-faint">—</span>}
                  </span>
                </td>
                <td className="td">
                  <Pill tone="navy" dot={false}>
                    {p.roleName}
                  </Pill>
                </td>
                <td className="td">
                  <Pill tone={p.isActive ? 'ok' : 'neutral'}>{p.isActive ? 'Active' : 'Deactivated'}</Pill>
                </td>
                <td className="td">
                  <span className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => setEditing(p)} className="btn-ghost btn-sm" aria-label={`Edit ${p.name}`}>
                      Edit
                    </button>
                    {p.id !== meId && (
                      <button
                        type="button"
                        onClick={() => toggleActive(p)}
                        disabled={pending}
                        className="btn btn-sm text-ink-muted hover:bg-brick-100 hover:text-brick"
                      >
                        {p.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="td py-8 text-center text-ink-faint">
                  Nobody matches “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <MemberForm
          person={editing === 'new' ? null : editing}
          roles={roles}
          workstreams={workstreams}
          isMe={editing !== 'new' && editing.id === meId}
          canChangeRoles={canChangeRoles}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function MemberForm({
  person,
  roles,
  workstreams,
  isMe,
  canChangeRoles,
  onClose,
}: {
  person: P | null;
  roles: Option[];
  workstreams: Option[];
  isMe: boolean;
  canChangeRoles: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const isNew = !person;

  function submit(fd: FormData) {
    setError(null);
    start(async () => {
      const res = isNew ? await adminCreateUser(fd) : await adminUpdateUser(fd);
      if ((res as any)?.error) setError((res as any).error);
      else {
        router.refresh();
        onClose();
      }
    });
  }

  function savePassword() {
    if (!person) return;
    setError(null);
    setNotice(null);
    start(async () => {
      const res = await adminSetPassword(person.id, password);
      if ((res as any)?.error) setError((res as any).error);
      else {
        setPassword('');
        setNotice(`New password set. ${person.name} has been signed out everywhere.`);
      }
    });
  }

  function generate() {
    const words = ['Beacon', 'Harbor', 'Summit', 'Cedar', 'Atlas', 'Orbit', 'Maple', 'Granite', 'Saffron', 'Tundra'];
    const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
    const n = 10 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90);
    setPassword(`${pick()}-${n}-${pick()}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/45 p-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'Add member' : `Edit ${person!.name}`}
    >
      <div className="card my-auto w-full max-w-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {person && <Avatar name={person.name} accent={person.accent} size={40} />}
            <div>
              <h2 className="text-[18px] font-semibold text-ink">{isNew ? 'Add a member' : person!.name}</h2>
              {!isNew && <p className="text-[12.5px] text-ink-faint">{person!.email}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        <form action={submit} className="space-y-3.5">
          {person && <input type="hidden" name="id" value={person.id} />}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input name="name" required defaultValue={person?.name} className="input mt-1.5" />
            </Field>
            <Field label="Email (sign-in)">
              <input name="email" type="email" required defaultValue={person?.email} className="input mt-1.5" />
            </Field>
            <Field label="Title">
              <input name="title" defaultValue={person?.title ?? ''} className="input mt-1.5" placeholder="Board Director" />
            </Field>
            <Field label="Company">
              <input name="company" defaultValue={person?.company ?? ''} className="input mt-1.5" />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={person?.phone ?? ''} className="input mt-1.5" />
            </Field>
            <Field label="Avatar colour">
              <input name="accent" type="color" defaultValue={person?.accent ?? '#1D6FE0'} className="input mt-1.5 h-[42px] cursor-pointer p-1" />
            </Field>
            <Field label="Role">
              <select
                name="roleId"
                defaultValue={person?.roleId ?? roles[roles.length - 1]?.id}
                disabled={!canChangeRoles && !isNew}
                className="input mt-1.5"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {/* A disabled select is not submitted; keep the current role. */}
              {!canChangeRoles && person && <input type="hidden" name="roleId" value={person.roleId} />}
            </Field>
            <Field label="Status">
              <label className={clsx('input mt-1.5 flex cursor-pointer items-center gap-2', isMe && 'opacity-60')}>
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={person ? person.isActive : true}
                  disabled={isMe || isNew}
                  className="accent-[rgb(var(--navy))]"
                />
                Active — can sign in
              </label>
              {(isMe || isNew) && <input type="hidden" name="isActive" value="on" />}
            </Field>
          </div>

          <fieldset>
            <legend className="label">Workstreams</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {workstreams.map((w) => (
                <label key={w.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[13px] text-ink has-[:checked]:border-navy has-[:checked]:bg-navy has-[:checked]:text-white">
                  <input
                    type="checkbox"
                    name="workstreamIds"
                    value={w.id}
                    defaultChecked={person?.workstreamIds.includes(w.id)}
                    className="sr-only"
                  />
                  <span className="h-2 w-2 rounded-full" style={{ background: w.color }} />
                  {w.name}
                </label>
              ))}
            </div>
          </fieldset>

          {isNew && (
            <Field label="Password">
              <div className="mt-1.5 flex gap-2">
                <input
                  name="password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input font-mono"
                  placeholder="At least 10 characters"
                />
                <button type="button" onClick={generate} className="btn-ghost btn-sm shrink-0">
                  Generate
                </button>
              </div>
              <p className="mt-1 text-[11.5px] text-ink-faint">Share it with them privately. They can sign in straight away.</p>
            </Field>
          )}

          {error && <p className="rounded-xl bg-brick-100 px-4 py-2 text-[13px] font-medium text-brick">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" disabled={pending}>
              {pending ? 'Saving…' : isNew ? 'Add member' : 'Save changes'}
            </button>
          </div>
        </form>

        {!isNew && (
          <div className="mt-5 rounded-2xl bg-panel p-4">
            <p className="text-[13.5px] font-semibold text-ink">Set a new password</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">Signs {person!.name} out on every device.</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 10 characters"
                aria-label="New password"
                className="input min-w-0 flex-1 bg-white font-mono"
              />
              <button type="button" onClick={generate} className="btn-ghost btn-sm">
                Generate
              </button>
              <button type="button" onClick={savePassword} disabled={pending || password.length < 10} className="btn-primary btn-sm">
                Set password
              </button>
            </div>
            {notice && <p className="mt-2 text-[12.5px] font-medium text-forest">{notice}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
