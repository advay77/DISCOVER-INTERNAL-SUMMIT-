import Link from 'next/link';
import clsx from 'clsx';
import { requireCan, can } from '@/lib/authz';
import { db, icontains } from '@/lib/db';
import { PageHeader, Empty, StatTile, Avatar } from '@/components/ui';
import { IconFiles, IconSearch } from '@/components/icons';
import { relativeTime } from '@/lib/format';
import { Uploader } from './Uploader';
import { DeleteFile } from './DeleteFile';

/** Folders offered for uploads. Anything else found in the library (Chat) still gets a card. */
const FOLDERS = ['Sponsors', 'Speakers', 'Logistics', 'Marketing', 'Legal', 'General'];

const FOLDER_TINT: Record<string, string> = {
  Sponsors: '#1F5FA8',
  Speakers: '#1E7A4B',
  Logistics: '#B4761F',
  Marketing: '#C2347A',
  Legal: '#5E5E5A',
  General: '#8F8F89',
  Chat: '#7C4DDB',
};

/** A short type label and colour from the mime type and extension. */
function kind(name: string, mime: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return { label: 'IMG', color: '#1E7A4B' };
  if (mime.startsWith('video/')) return { label: 'VID', color: '#C2347A' };
  if (mime.startsWith('audio/')) return { label: 'AUD', color: '#7C4DDB' };
  if (mime === 'application/pdf' || ext === 'pdf') return { label: 'PDF', color: '#A62B2B' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { label: 'XLS', color: '#1E7A4B' };
  if (['ppt', 'pptx', 'key'].includes(ext)) return { label: 'PPT', color: '#B4761F' };
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return { label: 'DOC', color: '#1F5FA8' };
  if (['zip', 'rar', '7z'].includes(ext)) return { label: 'ZIP', color: '#5E5E5A' };
  return { label: ext.slice(0, 3).toUpperCase() || 'FILE', color: '#5E5E5A' };
}

function size(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; q?: string }>;
}) {
  const user = await requireCan('files:view');
  const { folder } = await searchParams;
  const q = ((await searchParams).q ?? '').trim().slice(0, 80);
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const where: any = { status: 'ready' };
  if (folder) where.folder = folder;
  if (q) where.name = icontains(q);

  const [files, grouped, totals, recent] = await Promise.all([
    db.fileAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        mime: true,
        folder: true,
        size: true,
        createdAt: true,
        messageId: true,
        uploaderId: true,
        uploader: { select: { name: true, accent: true } },
      },
    }),
    db.fileAsset.groupBy({ by: ['folder'], where: { status: 'ready' }, _count: { _all: true }, _sum: { size: true } }),
    db.fileAsset.aggregate({ where: { status: 'ready' }, _count: { _all: true }, _sum: { size: true } }),
    db.fileAsset.count({ where: { status: 'ready', createdAt: { gte: weekAgo } } }),
  ]);

  const counts: Record<string, number> = Object.fromEntries(FOLDERS.map((f) => [f, 0]));
  for (const row of grouped) counts[row.folder] = row._count._all;
  const folderList = [...FOLDERS, ...Object.keys(counts).filter((f) => !FOLDERS.includes(f))];
  const canDeleteAny = can(user, 'files:delete');
  const href = (next: { folder?: string; q?: string }) => {
    const p = new URLSearchParams();
    const f = 'folder' in next ? next.folder : folder;
    const s = 'q' in next ? next.q : q;
    if (f) p.set('folder', f);
    if (s) p.set('q', s);
    const qs = p.toString();
    return `/files${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Files"
        subtitle="The programme book, floorplans, contracts and decks — out of inboxes, attachable to any record."
        action={can(user, 'files:upload') ? <Uploader folders={FOLDERS} /> : undefined}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={totals._count._all} label="Files" tone="navy" hint="in the library" highlight />
        <StatTile value={size(totals._sum.size ?? 0)} label="Stored" tone="navy" hint="total size" />
        <StatTile value={recent} label="This week" tone="navy" hint="new uploads" />
        <StatTile value={folderList.filter((f) => counts[f]).length} label="Folders in use" tone="navy" hint={`of ${folderList.length}`} />
      </div>

      {/* Folders */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
        <FolderCard name="All files" count={totals._count._all} active={!folder} href={href({ folder: undefined })} color="#151515" />
        {folderList.map((f) => (
          <FolderCard key={f} name={f} count={counts[f] ?? 0} active={folder === f} href={href({ folder: f })} color={FOLDER_TINT[f] ?? '#5E5E5A'} />
        ))}
      </div>

      {/* Search */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <form action="/files" className="relative w-full sm:w-72">
          {folder && <input type="hidden" name="folder" value={folder} />}
          <IconSearch size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Find a file"
            aria-label="Find a file"
            className="input rounded-full border-transparent bg-white py-1.5 pl-9 shadow-card"
          />
        </form>
        <p className="text-[12.5px] text-ink-faint">
          {files.length} {files.length === 1 ? 'file' : 'files'}
          {folder ? ` in ${folder}` : ''}
          {q && (
            <>
              {' '}matching “{q}” ·{' '}
              <Link href={href({ q: undefined })} className="font-medium text-ink underline">
                clear
              </Link>
            </>
          )}
        </p>
      </div>

      {files.length === 0 ? (
        <Empty
          title={q ? `No files match “${q}”` : folder ? `Nothing in ${folder} yet` : 'No files here yet'}
          hint="Upload the programme book, the floorplan or a sponsor deck, and it is findable by everyone who should see it."
        />
      ) : (
        <section className="card divide-y divide-line overflow-hidden">
          {files.map((f) => {
            const k = kind(f.name, f.mime);
            const canDelete = !f.messageId && (canDeleteAny || f.uploaderId === user.id);
            return (
              <div key={f.id} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-panel/60 sm:px-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10.5px] font-bold tracking-wide text-snow"
                  style={{ background: k.color }}
                  aria-hidden
                >
                  {k.label}
                </span>
                <div className="min-w-0 flex-1">
                  <a href={`/api/files/${f.id}`} className="block truncate text-[14px] font-semibold text-ink hover:underline">
                    {f.name}
                  </a>
                  <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-faint">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: FOLDER_TINT[f.folder] ?? '#5E5E5A' }} />
                      {f.folder}
                    </span>
                    <span>· {size(f.size)}</span>
                    <span>· {relativeTime(f.createdAt)}</span>
                  </p>
                </div>
                {f.uploader && (
                  <span className="hidden items-center gap-1.5 text-[12.5px] text-ink-muted md:flex">
                    <Avatar name={f.uploader.name} accent={f.uploader.accent} size={22} />
                    {f.uploader.name}
                  </span>
                )}
                <a href={`/api/files/${f.id}`} className="btn-ghost btn-sm shrink-0" aria-label={`Open ${f.name}`}>
                  Open
                </a>
                {canDelete && <DeleteFile id={f.id} name={f.name} />}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function FolderCard({ name, count, active, href, color }: { name: string; count: number; active: boolean; href: string; color: string }) {
  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-2.5 rounded-tile p-3 transition',
        active ? 'bg-navy text-white' : 'bg-white shadow-card hover:ring-1 hover:ring-line-strong',
      )}
    >
      <span
        className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', active ? 'bg-white/15' : '')}
        style={active ? undefined : { background: `${color}1A`, color }}
      >
        <IconFiles size={16} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold">{name}</span>
        <span className={clsx('block text-[11.5px]', active ? 'text-white/70' : 'text-ink-faint')}>
          {count} {count === 1 ? 'file' : 'files'}
        </span>
      </span>
    </Link>
  );
}
