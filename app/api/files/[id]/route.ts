import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { db } from '@/lib/db';
import { getFile } from '@/lib/storage';
import { id as validId } from '@/lib/validate';

/**
 * Files are never public URLs — every read is permission-checked.
 *
 * Only media the browser can render safely is served inline. Everything else
 * downloads, and the stored type is replaced with a neutral one, so a file that
 * claims to be HTML can never execute on this origin.
 */
const INLINE_SAFE = /^(image\/(png|jpe?g|gif|webp|avif)|video\/(mp4|webm|ogg)|audio\/(mpeg|ogg|wav|webm)|application\/pdf)$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'files:view')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const asset = await db.fileAsset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: 'not found' }, { status: 404 });

  try {
    const bytes = await getFile(asset);
    const inline = INLINE_SAFE.test(asset.mime);

    // The filename is quoted and stripped so it cannot break out of the header.
    const safeName = asset.name.replace(/["\\\r\n]/g, '_');

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'content-type': inline ? asset.mime : 'application/octet-stream',
        'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
        'cache-control': 'private, max-age=300',
        'x-content-type-options': 'nosniff',
        // An uploaded file never gets to run anything on this origin.
        'content-security-policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return NextResponse.json({ error: 'file missing' }, { status: 404 });
  }
}
