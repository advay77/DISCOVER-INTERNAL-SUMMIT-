import { requireCan, can } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, Empty, Pill } from '@/components/ui';
import { relativeTime } from '@/lib/format';
import { Uploader } from './Uploader';
import { IconFiles } from '@/components/icons';

const FOLDERS = ['Sponsors', 'Speakers', 'Logistics', 'Marketing', 'Legal', 'General'];

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const user = await requireCan('files:view');
  const { folder } = await searchParams;

  const files = await db.fileAsset.findMany({
    where: folder ? { folder } : {},
    orderBy: { createdAt: 'desc' },
    include: { uploader: true },
    take: 200,
  });

  const counts: Record<string, number> = {};
  for (const f of FOLDERS) counts[f] = await db.fileAsset.count({ where: { folder: f } });

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        title="Files"
        subtitle="The programme book, floorplans, contracts and decks — out of inboxes, attachable to any record."
        action={can(user, 'files:upload') ? <Uploader folders={FOLDERS} /> : undefined}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {FOLDERS.map((f) => (
          <a
            key={f}
            href={`/files?folder=${f}`}
            className={
              folder === f
                ? 'card border-brand p-4 ring-1 ring-brand'
                : 'card p-4 transition hover:shadow-pop'
            }
          >
            <IconFiles size={20} className="text-ink-faint" />
            <p className="mt-2 text-[13.5px] font-semibold text-ink">{f}</p>
            <p className="text-[12px] text-ink-faint">{counts[f]} files</p>
          </a>
        ))}
      </div>

      {files.length === 0 ? (
        <Empty
          title="No files here yet"
          hint="Upload the programme book, the floorplan or a sponsor deck, and it is findable by everyone who should see it."
        />
      ) : (
        <Card bodyClass="p-0">
          <table className="w-full">
            <thead className="border-b border-line bg-paper">
              <tr>
                <th className="th">File</th>
                <th className="th">Folder</th>
                <th className="th">Uploaded by</th>
                <th className="th">When</th>
                <th className="th">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {files.map((f) => (
                <tr key={f.id} className="hover:bg-paper">
                  <td className="td">
                    <a href={`/api/files/${f.id}`} className="font-medium text-ink hover:text-brand">
                      {f.name}
                    </a>
                  </td>
                  <td className="td">
                    <Pill tone="neutral">{f.folder}</Pill>
                  </td>
                  <td className="td text-[13px] text-ink-muted">{f.uploader?.name ?? '—'}</td>
                  <td className="td text-[13px] text-ink-muted">{relativeTime(f.createdAt)}</td>
                  <td className="td text-[13px] text-ink-muted">{Math.round(f.size / 1024)} KB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
