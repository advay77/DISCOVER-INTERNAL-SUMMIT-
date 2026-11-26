import { requireUser, can, scopeFilter } from '@/lib/authz';
import { db } from '@/lib/db';
import { countUnread } from '@/lib/unread';
import { Sidebar, type NavEntry } from '@/components/Sidebar';
import { MobileTabBar } from '@/components/MobileTabBar';
import { Topbar } from '@/components/Topbar';
import { dateRange, daysUntil } from '@/lib/format';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Open task count, scoped exactly the way the Tasks page scopes it.
  const taskWhere: any = scopeFilter(user, 'tasks:view');

  const now = new Date();
  const [event, openTasks, overdue, unread, notices] = await Promise.all([
    db.event.findFirst({
      where: { isCurrent: true },
      select: { name: true, startDate: true, endDate: true, city: true },
    }),
    db.task.count({ where: { ...taskWhere, status: { not: 'done' } } }),
    db.task.count({ where: { AND: [taskWhere, { status: { not: 'done' }, dueDate: { lt: now } }] } }),
    countUnread(user.id),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const nav: NavEntry[] = [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', group: '' },
    ...(can(user, 'tasks:view')
      ? [{ href: '/tasks', label: 'Tasks', icon: 'tasks' as const, badge: openTasks, group: '' }]
      : []),
    ...(can(user, 'questions:view')
      ? [{ href: '/questions', label: 'Questions', icon: 'questions' as const, group: '' }]
      : []),
    { href: '/events', label: 'Events', icon: 'agenda', group: '' },

    ...(can(user, 'speakers:view')
      ? [{ href: '/speakers', label: 'Speakers', icon: 'speakers' as const, group: 'Annual Summit' }]
      : []),
    ...(can(user, 'agenda:view')
      ? [{ href: '/agenda', label: 'Run of show', icon: 'agenda' as const, group: 'Annual Summit' }]
      : []),
    ...(can(user, 'sponsors:view')
      ? [{ href: '/sponsors', label: 'Sponsors', icon: 'sponsors' as const, group: 'Annual Summit' }]
      : []),
    ...(can(user, 'vendors:view')
      ? [{ href: '/logistics', label: 'Logistics', icon: 'logistics' as const, group: 'Annual Summit' }]
      : []),
    ...(can(user, 'attendees:view')
      ? [{ href: '/attendees', label: 'Attendees', icon: 'attendees' as const, group: 'Annual Summit' }]
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
        daysToGo={event ? daysUntil(event.startDate) : null}
        overdue={can(user, 'tasks:view') ? overdue : 0}
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
          notices={notices}
          roleName={user.role.name}
          canAdmin={can(user, 'admin:users') || can(user, 'admin:permissions') || can(user, 'admin:event')}
          nav={nav}
        />
        {/* Bottom padding keeps the last row clear of the phone tab bar. */}
        <main className="flex-1 px-3.5 pb-[calc(env(safe-area-inset-bottom)+84px)] pt-4 sm:px-5 lg:px-6 lg:pb-8 lg:pt-2">
          {children}
        </main>
        <MobileTabBar nav={nav} />
      </div>
    </div>
  );
}
