import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { db } from '@/lib/db';
import { getFile } from '@/lib/storage';

/** Files are never public URLs — every read is permission-checked. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'files:view')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const asset = await db.fileAsset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: 'not found' }, { status: 404 });

  try {
    const bytes = await getFile(asset);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'content-type': asset.mime,
        'content-disposition': `inline; filename="${asset.name}"`,
        'cache-control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'file missing' }, { status: 404 });
  }
}
