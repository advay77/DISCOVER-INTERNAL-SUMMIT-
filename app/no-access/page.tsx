import Link from 'next/link';
import { capabilityDef } from '@/lib/capabilities';
import { requireUser } from '@/lib/authz';
import { IconLock } from '@/components/icons';

export default async function NoAccess({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const user = await requireUser();
  const { c } = await searchParams;
  const def = c ? capabilityDef(c) : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[5px] border border-brass/30 bg-brass-100 text-brass">
          <IconLock size={20} />
        </div>
        <h1 className="mt-4 text-xl font-bold text-ink">That part is not open to you</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your role is <strong className="text-ink">{user.role.name}</strong>
          {def ? (
            <>
              , which does not include <strong className="text-ink">{def.label.toLowerCase()}</strong>.
            </>
          ) : (
            '.'
          )}{' '}
          The President can change this in Admin → Roles &amp; Permissions.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 w-full">
          Back to the dashboard
        </Link>
      </div>
    </main>
  );
}
