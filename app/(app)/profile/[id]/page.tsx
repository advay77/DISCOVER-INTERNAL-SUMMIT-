import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser, can } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, Avatar, Pill } from '@/components/ui';
import { longDate } from '@/lib/format';
import { ProfileForm } from '../ProfileForm';

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const isSelf = id === me.id;
  const isAdmin = can(me, 'admin:users');
  if (!isSelf && !isAdmin) redirect('/no-access?c=admin:users');

  const person = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      company: true,
      phone: true,
      accent: true,
      isActive: true,
      createdAt: true,
      role: { select: { name: true } },
      memberships: { select: { workstream: { select: { id: true, name: true, color: true } } } },
    },
  });
  if (!person) notFound();

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader
        title={isSelf ? 'Your profile' : person.name}
        subtitle={
          isSelf
            ? 'This is the one profile on your account. Changes show anywhere your name appears.'
            : 'Admin view. This person edits their own profile when they sign in.'
        }
        action={
          isAdmin && !isSelf ? (
            <Link href="/admin?tab=people" className="text-[13px] font-semibold text-brand hover:underline">
              All people
            </Link>
          ) : undefined
        }
      />

      <Card className="mb-5">
        <div className="flex items-start gap-4">
          <Avatar name={person.name} accent={person.accent} size={52} />
          <div className="min-w-0">
            <p className="text-[18px] font-semibold text-ink">{person.name}</p>
            <p className="text-[13px] text-ink-muted">{person.title || 'No title yet'}</p>
            <p className="text-[12.5px] text-ink-faint">{person.company || 'No company yet'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone="navy">{person.role.name}</Pill>
              <Pill tone={person.isActive ? 'ok' : 'neutral'}>{person.isActive ? 'Active' : 'Deactivated'}</Pill>
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <div>
            <dt className="label">Email</dt>
            <dd className="mt-1 text-[13.5px] text-ink">{person.email}</dd>
          </div>
          <div>
            <dt className="label">Phone</dt>
            <dd className="mt-1 text-[13.5px] text-ink">{person.phone || '—'}</dd>
          </div>
          <div>
            <dt className="label">Member since</dt>
            <dd className="mt-1 text-[13.5px] text-ink">{longDate(person.createdAt)}</dd>
          </div>
          <div>
            <dt className="label">Workstreams</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {person.memberships.length === 0 && <span className="text-[13px] text-ink-faint">None</span>}
              {person.memberships.map((m) => (
                <Pill key={m.workstream.id} tone="neutral">
                  {m.workstream.name}
                </Pill>
              ))}
            </dd>
          </div>
        </dl>
      </Card>

      {isSelf && (
        <Card title="Edit your profile">
          <ProfileForm
            profile={{
              name: person.name,
              title: person.title,
              company: person.company,
              phone: person.phone,
            }}
          />
        </Card>
      )}
    </div>
  );
}
