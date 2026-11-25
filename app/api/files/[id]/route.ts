import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { db } from '@/lib/db';
import { getFile, signDownload, INLINE_SAFE } from '@/lib/storage';
import { id as validId } from '@/lib/validate';

/**
 * Files are never public URLs — every read is permission-checked here first.
 *
 * Supabase-backed files: the app checks permission, then redirects to a link
 * that works for two minutes. The bytes come straight from storage, so the
 * host's response-size limit does not apply either.
 *
 * Local files: streamed from here, with only safe media rendered inline and
 * everything else forced to download under a sandboxed policy.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'files:view')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const asset = await db.fileAsset.findUnique({ where: { id } });
  if (!asset || asset.status !== 'ready') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const inline = INLINE_SAFE.test(asset.mime);

  if (asset.backend === 'supabase') {
    try {
      const url = await signDownload(asset.path, asset.name, inline);
      return NextResponse.redirect(url, {
        status: 302,
        headers: { 'cache-control': 'private, no-store' },
      });
    } catch (e) {
      console.error('[files/get]', e);
      return NextResponse.json({ error: 'file unavailable' }, { status: 502 });
    }
  }

  try {
    const bytes = await getFile(asset);
    const safeName = asset.name.replace(/["\\\r\n]/g, '_');
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'content-type': inline ? asset.mime : 'application/octet-stream',
        'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
        'cache-control': 'private, max-age=300',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return NextResponse.json({ error: 'file missing' }, { status: 404 });
  }
}
