import { requireUser, can, scopeFilter } from '@/lib/authz';
import { db } from '@/lib/db';
import { Sidebar, MobileNav, type NavEntry } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { dateRange } from '@/lib/format';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const event = await db.event.findFirst({ where: { isCurrent: true } });

  // Open task count, scoped exactly the way the Tasks page scopes it.
  const taskWhere: any = scopeFilter(user, 'tasks:view');

  const [openTasks, unread] = await Promise.all([
    db.task.count({ where: { ...taskWhere, status: { not: 'done' } } }),
    countUnread(user.id),
  ]);

  const nav: NavEntry[] = [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', group: '' },
    ...(can(user, 'tasks:view')
      ? [{ href: '/tasks', label: 'Tasks', icon: 'tasks' as const, badge: openTasks, group: '' }]
      : []),
    ...(can(user, 'questions:view')
      ? [{ href: '/questions', label: 'Questions', icon: 'questions' as const, group: '' }]
      : []),

    ...(can(user, 'speakers:view')
      ? [{ href: '/speakers', label: 'Speakers', icon: 'speakers' as const, group: 'Summit' }]
      : []),
    ...(can(user, 'agenda:view')
      ? [{ href: '/agenda', label: 'Run of show', icon: 'agenda' as const, group: 'Summit' }]
      : []),
    ...(can(user, 'sponsors:view')
      ? [{ href: '/sponsors', label: 'Sponsors', icon: 'sponsors' as const, group: 'Summit' }]
      : []),
    ...(can(user, 'vendors:view')
      ? [{ href: '/logistics', label: 'Logistics', icon: 'logistics' as const, group: 'Summit' }]
      : []),
    ...(can(user, 'attendees:view')
      ? [{ href: '/attendees', label: 'Attendees', icon: 'attendees' as const, group: 'Summit' }]
      : []),

    ...(can(user, 'chat:use')
      ? [{ href: '/chat', label: 'Messages', icon: 'chat' as const, badge: unread, group: '' }]
      : []),
    ...(can(user, 'files:view') ? [{ href: '/files', label: 'Files', icon: 'files' as const, group: 'Organisation' }] : []),
    ...(can(user, 'team:view') ? [{ href: '/team', label: 'Team', icon: 'team' as const, group: 'Organisation' }] : []),
    ...(can(user, 'retro:view') ? [{ href: '/retro', label: 'Retro', icon: 'retro' as const, group: 'Organisation' }] : []),
    ...(can(user, 'admin:users') || can(user, 'admin:permissions')
      ? [{ href: '/admin', label: 'Admin', icon: 'admin' as const, group: 'Organisation' }]
      : []),
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar
        nav={nav}
        eventName={event?.name ?? 'No active cycle'}
        eventTagline={
          event ? `${dateRange(event.startDate, event.endDate)} · ${event.city ?? ''}` : 'Create one in Admin'
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={{
            name: user.name,
            email: user.email,
            accent: user.accent,
            title: user.title,
            company: user.company,
          }}
          unread={unread}
          roleName={user.role.name}
          canAdmin={can(user, 'admin:users') || can(user, 'admin:permissions') || can(user, 'admin:event')}
        />
        <MobileNav nav={nav} />
        <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}

async function countUnread(userId: string) {
  const memberships = await db.channelMember.findMany({ where: { userId } });
  if (!memberships.length) return 0;
  let total = 0;
  for (const m of memberships) {
    total += await db.message.count({
      where: {
        channelId: m.channelId,
        createdAt: { gt: m.lastReadAt },
        authorId: { not: userId },
        deletedAt: null,
      },
    });
  }
  return total;
}
