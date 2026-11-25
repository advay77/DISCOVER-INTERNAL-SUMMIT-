import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { db } from '@/lib/db';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'attendees:export')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const rows = await db.attendee.findMany({ orderBy: { name: 'asc' } });
  const includeEmail = can(user, 'attendees:contact');

  const header = ['Name', 'Company', ...(includeEmail ? ['Email'] : []), 'Ticket', 'Paid', 'Status'];
  const csv = [
    header.join(','),
    ...rows.map((r) =>
      [
        q(r.name),
        q(r.company ?? ''),
        ...(includeEmail ? [q(r.email ?? '')] : []),
        q(r.ticketType),
        r.paid ? 'Yes' : 'No',
        q(r.status),
      ].join(','),
    ),
  ].join('\n');

  await db.auditLog.create({
    data: { actorId: user.id, action: 'attendees.export', target: `${rows.length} rows` },
  });

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="discover-attendees.csv"',
    },
  });
}

function q(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}
