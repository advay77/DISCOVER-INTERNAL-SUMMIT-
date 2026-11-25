'use client';

import { Fragment, useState, useTransition } from 'react';
import clsx from 'clsx';
import { setPermission } from '@/app/actions';
import type { CapabilityDef, Scope } from '@/lib/capabilities';

const SCOPE_LABEL: Record<Scope, string> = {
  all: 'Everything',
  workstream: 'Their workstream',
  own: 'Only their own',
  none: 'No access',
};

const SCOPE_TONE: Record<Scope, string> = {
  all: 'bg-forest/10 text-forest border-forest/25',
  workstream: 'bg-brand-100 text-brand border-brand/25',
  own: 'bg-brass/10 text-brass border-brass/25',
  none: 'bg-paper text-ink-faint border-line',
};

type RoleView = { id: string; key: string; name: string; permissions: Record<string, string> };

export function PermissionMatrix({
  roles,
  capabilities,
  groups,
}: {
  roles: RoleView[];
  capabilities: CapabilityDef[];
  groups: string[];
}) {
  const [matrix, setMatrix] = useState(() =>
    Object.fromEntries(roles.map((r) => [r.id, { ...r.permissions }])),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [, start] = useTransition();

  function change(roleId: string, capability: string, scope: Scope) {
    const previous = matrix[roleId]?.[capability] ?? 'none';
    setMatrix((m) => ({ ...m, [roleId]: { ...m[roleId], [capability]: scope } }));
    setSaving(`${roleId}:${capability}`);
    setError(null);
    start(async () => {
      const res = await setPermission(roleId, capability, scope);
      if ((res as any)?.error) {
        setError((res as any).error);
        setMatrix((m) => ({ ...m, [roleId]: { ...m[roleId], [capability]: previous } }));
      }
      setSaving(null);
    });
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Who sees what</h2>
          <p className="text-[12.5px] text-ink-muted">
            Changes save immediately and are written to the audit log. Hidden fields are removed from the
            data, not hidden on screen.
          </p>
        </div>
        {error && (
          <p className="rounded-lg bg-brick/10 px-3 py-1.5 text-[12.5px] font-medium text-brick">{error}</p>
        )}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead className="sticky top-0 border-b border-line bg-paper">
            <tr>
              <th className="th w-[320px]">Capability</th>
              {roles.map((r) => (
                <th key={r.id} className="th text-center">
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {groups.map((group) => (
              <Fragment key={group}>
                <tr className="bg-paper/60">
                  <td colSpan={roles.length + 1} className="px-4 py-2 text-2xs font-bold uppercase tracking-wider text-ink-muted">
                    {group}
                  </td>
                </tr>

                {capabilities
                  .filter((c) => c.group === group)
                  .map((c) => (
                    <tr key={c.key} className="hover:bg-paper/40">
                      <td className="td">
                        <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                          {c.label}
                          {c.sensitive && (
                            <span className="rounded bg-brick/10 px-1.5 py-0.5 text-[10px] font-bold text-brick">
                              SENSITIVE
                            </span>
                          )}
                        </p>
                        <p className="text-[12px] leading-snug text-ink-faint">{c.help}</p>
                      </td>

                      {roles.map((r) => {
                        const value = (matrix[r.id]?.[c.key] ?? 'none') as Scope;
                        const busy = saving === `${r.id}:${c.key}`;
                        return (
                          <td key={r.id} className="px-2 py-2 text-center">
                            <select
                              value={value}
                              disabled={busy}
                              onChange={(e) => change(r.id, c.key, e.target.value as Scope)}
                              className={clsx(
                                'w-full rounded-lg border px-2 py-1.5 text-[12px] font-semibold outline-none transition',
                                SCOPE_TONE[value],
                                busy && 'opacity-50',
                              )}
                            >
                              {c.scopes.map((s) => (
                                <option key={s} value={s}>
                                  {SCOPE_LABEL[s]}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-line bg-paper px-5 py-3 text-[12.5px] text-ink-muted">
        The President can never be removed from this screen — that lock is in the server action, not the UI.
      </footer>
    </section>
  );
}
