import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { db } from '@/lib/db';
import { rateLimit, LIMITS as RATE } from '@/lib/ratelimit';
import { text, optionalText, wholeNumber } from '@/lib/validate';
import { STORAGE, MAX_FILE_BYTES, BLOCKED_NAME, safeFileName, signUpload } from '@/lib/storage';

/**
 * Step 1 of a direct upload.
 *
 * Checks who is uploading and what, records the file as pending, and returns a
 * one-time URL the browser PUTs the bytes to. The bytes never pass through the
 * app, which is what lifts the host's request-size limit.
 *
 * Where Supabase Storage is not configured (local development) the client is
 * told to use the plain multipart route instead.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'files:upload')) {
    return NextResponse.json({ error: 'Your role cannot upload files.' }, { status: 403 });
  }

  if (STORAGE !== 'supabase') return NextResponse.json({ direct: true });

  const limited = await rateLimit(`upload:${user.id}`, RATE.upload.limit, RATE.upload.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many uploads at once. Give it a moment.' },
      { status: 429, headers: { 'retry-after': String(limited.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = safeFileName(text(body.name, 200));
  const size = wholeNumber(body.size, 0, Number.MAX_SAFE_INTEGER, 0);
  const mime = text(body.type, 120) || 'application/octet-stream';

  if (!size) return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
  if (size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `That file is over ${MAX_FILE_BYTES / 1048576} MB.` },
      { status: 400 },
    );
  }
  if (BLOCKED_NAME.test(name)) {
    return NextResponse.json({ error: 'That file type cannot be shared here.' }, { status: 400 });
  }

  // Unguessable, and filed by month so the bucket stays browsable.
  const month = new Date().toISOString().slice(0, 7);
  const objectPath = `uploads/${month}/${randomUUID()}-${name}`;

  let uploadUrl: string;
  try {
    ({ uploadUrl } = await signUpload(objectPath));
  } catch (e) {
    console.error('[files/sign]', e);
    return NextResponse.json({ error: 'File storage is not available right now.' }, { status: 503 });
  }

  const asset = await db.fileAsset.create({
    data: {
      name,
      path: objectPath,
      mime,
      size,
      folder: text(body.folder, 40) || 'General',
      durationMs: body.durationMs ? wholeNumber(body.durationMs, 0, 3_600_000, 0) : null,
      backend: 'supabase',
      status: 'pending',
      uploaderId: user.id,
      entityType: optionalText(body.entityType, 30),
      entityId: optionalText(body.entityId, 40),
    },
  });

  return NextResponse.json({ id: asset.id, uploadUrl });
}
