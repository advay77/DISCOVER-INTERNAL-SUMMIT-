import 'server-only';
import { redirect } from 'next/navigation';
import { currentUser, type SessionUser } from './auth';
import type { Scope } from './capabilities';

/**
 * One place where permission is decided.
 *
 * The rule that matters: scoping happens BEFORE the query runs, and gated
 * fields are stripped from the payload server-side. A denied field is absent
 * from the response, not hidden with CSS.
 */

export type Actor = NonNullable<SessionUser>;

export async function requireUser(): Promise<Actor> {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}

export function workstreamIds(user: Actor): string[] {
  const ids = user.memberships.map((m) => m.workstreamId);
  return Array.from(new Set(ids));
}

export function scopeOf(user: Actor, capability: string): Scope {
  const row = user.role.permissions.find((p) => p.capability === capability);
  // The President can never be locked out of the permission editor.
  if (capability === 'admin:permissions' && user.role.key === 'president') return 'all';
  return (row?.scope as Scope) ?? 'none';
}

export function can(user: Actor, capability: string): boolean {
  return scopeOf(user, capability) !== 'none';
}

export async function requireCan(capability: string): Promise<Actor> {
  const user = await requireUser();
  if (!can(user, capability)) redirect('/no-access?c=' + encodeURIComponent(capability));
  return user;
}

/**
 * Turns a capability into a Prisma `where` fragment.
 * `all`       → {}                      (no narrowing)
 * `workstream`→ workstream in mine (plus anything I own)
 * `own`       → only records I own
 * `none`      → impossible filter, so a bad call returns nothing rather than everything
 */
export function scopeFilter(
  user: Actor,
  capability: string,
  opts: { ownerField?: string; workstreamField?: string } = {},
) {
  const ownerField = opts.ownerField ?? 'ownerId';
  const workstreamField = opts.workstreamField ?? 'workstreamId';
  const scope = scopeOf(user, capability);

  if (scope === 'all') return {};
  if (scope === 'none') return { id: '__denied__' };

  const mine = workstreamIds(user);

  if (scope === 'workstream') {
    return {
      OR: [
        { [workstreamField]: { in: mine.length ? mine : ['__none__'] } },
        { [ownerField]: user.id },
      ],
    };
  }

  // own
  return { [ownerField]: user.id };
}

/** True when the actor may act on this particular record under the capability. */
export function allows(
  user: Actor,
  capability: string,
  record: { ownerId?: string | null; workstreamId?: string | null },
): boolean {
  const scope = scopeOf(user, capability);
  if (scope === 'all') return true;
  if (scope === 'none') return false;
  if (scope === 'own') return record.ownerId === user.id;
  return (
    record.ownerId === user.id ||
    (!!record.workstreamId && workstreamIds(user).includes(record.workstreamId))
  );
}

/**
 * Removes gated fields from a record before it reaches a client component.
 * Used for speaker/attendee contact details and every money field.
 */
export function redact<T extends Record<string, any>>(
  user: Actor,
  record: T,
  gates: { capability: string; fields: (keyof T)[] }[],
): T {
  const out: Record<string, any> = { ...record };
  for (const gate of gates) {
    const scope = scopeOf(user, gate.capability);
    const permitted =
      scope === 'all' ||
      (scope === 'workstream' && allows(user, gate.capability, record as any));
    if (!permitted) {
      for (const f of gate.fields) delete out[f as string];
    }
  }
  return out as T;
}

export function redactMany<T extends Record<string, any>>(
  user: Actor,
  records: T[],
  gates: { capability: string; fields: (keyof T)[] }[],
): T[] {
  return records.map((r) => redact(user, r, gates));
}

export const SPEAKER_GATES = [
  { capability: 'speakers:contact', fields: ['email', 'phone'] as const },
];

export const MONEY_GATES = [{ capability: 'finance:view', fields: ['amount'] as const }];
