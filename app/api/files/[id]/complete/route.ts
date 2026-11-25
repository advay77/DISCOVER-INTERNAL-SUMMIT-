import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { id as validId } from '@/lib/validate';
import { confirmUpload } from '@/lib/storage';

/**
 * Step 3 of a direct upload: the browser says it has finished, and the server
 * checks with Supabase that the object really exists before marking the file
 * ready. Only the person who started the upload can finish it.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const asset = await db.fileAsset.findUnique({ where: { id } });
  if (!asset || asset.uploaderId !== user.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (asset.status === 'ready') {
    return NextResponse.json({ file: { id: asset.id, name: asset.name, mime: asset.mime, size: asset.size } });
  }

  const stored = await confirmUpload(asset.path).catch(() => null);
  if (stored === null) {
    return NextResponse.json(
      { error: 'The upload did not arrive. Try again.' },
      { status: 409 },
    );
  }

  const ready = await db.fileAsset.update({
    where: { id },
    // Trust the size Supabase recorded, not the one the browser declared.
    data: { status: 'ready', size: stored || asset.size },
  });

  return NextResponse.json({
    file: {
      id: ready.id,
      name: ready.name,
      mime: ready.mime,
      size: ready.size,
      durationMs: ready.durationMs,
    },
  });
}
