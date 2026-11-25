import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { db } from '@/lib/db';
import { putFile, STORAGE, MAX_FILE_BYTES, BLOCKED_NAME, safeFileName } from '@/lib/storage';
import { rateLimit, LIMITS as RATE } from '@/lib/ratelimit';
import { text, optionalText, wholeNumber } from '@/lib/validate';

/**
 * Multipart upload through the app. Used only where Supabase Storage is not
 * configured — local development. Hosted uploads go browser → Supabase via
 * /api/files/sign, because a host like Vercel refuses request bodies over
 * about 4.5 MB.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'files:upload')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (STORAGE === 'supabase') {
    return NextResponse.json(
      { error: 'Uploads go directly to storage here. Refresh the page and try again.' },
      { status: 400 },
    );
  }

  const limited = await rateLimit(`upload:${user.id}`, RATE.upload.limit, RATE.upload.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many uploads at once. Give it a moment.' },
      { status: 429, headers: { 'retry-after': String(limited.retryAfterSeconds) } },
    );
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file given.' }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `That file is over ${MAX_FILE_BYTES / 1048576} MB.` }, { status: 400 });
  }

  const name = safeFileName(file.name);
  if (BLOCKED_NAME.test(name)) {
    return NextResponse.json({ error: 'That file type cannot be shared here.' }, { status: 400 });
  }

  const stored = `${randomUUID()}-${name}`;
  const { data, backend } = await putFile(stored, Buffer.from(await file.arrayBuffer()));

  const asset = await db.fileAsset.create({
    data: {
      name,
      path: stored,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      folder: text(form.get('folder'), 40) || 'General',
      durationMs: form.get('durationMs') ? wholeNumber(form.get('durationMs'), 0, 3_600_000, 0) : null,
      backend,
      status: 'ready',
      data,
      uploaderId: user.id,
      entityType: optionalText(form.get('entityType'), 30),
      entityId: optionalText(form.get('entityId'), 40),
    },
  });

  return NextResponse.json({
    file: { id: asset.id, name: asset.name, mime: asset.mime, size: asset.size, durationMs: asset.durationMs },
  });
}
