import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';

/** The member list used by pickers. Names and roles only — no contact details. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'team:view')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const people = await db.user.findMany({
    where: { isActive: true },
    orderBy: [{ role: { level: 'asc' } }, { name: 'asc' }],
    include: { role: true },
  });

  return NextResponse.json({
    people: people.map((p) => ({
      id: p.id,
      name: p.name,
      accent: p.accent,
      role: p.role.name,
      company: p.company ?? '',
    })),
  });
}
