import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { db } from '@/lib/db';
import { putFile } from '@/lib/storage';
import { rateLimit, LIMITS as RATE } from '@/lib/ratelimit';
import { text, optionalText, wholeNumber, LIMITS as BOUND } from '@/lib/validate';

/** Executables and scripts are never useful here and are refused outright. */
const BLOCKED = /\.(exe|dll|bat|cmd|com|scr|msi|ps1|sh|jar|app|vbs|js|mjs|cjs|html?|svg|php)$/i;

const MAX = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'files:upload')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

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
  if (file.size > MAX) return NextResponse.json({ error: 'That file is over 15 MB.' }, { status: 400 });

  const safeName = file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  if (BLOCKED.test(safeName)) {
    return NextResponse.json(
      { error: 'That file type cannot be shared here.' },
      { status: 400 },
    );
  }
  const stored = `${randomUUID()}-${safeName}`;
  const { data } = await putFile(stored, Buffer.from(await file.arrayBuffer()));

  const asset = await db.fileAsset.create({
    data: {
      name: safeName,
      path: stored,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      folder: text(form.get('folder'), 40) || 'General',
      durationMs: form.get('durationMs') ? wholeNumber(form.get('durationMs'), 0, 3_600_000, 0) : null,
      data,
      uploaderId: user.id,
      entityType: optionalText(form.get('entityType'), 30),
      entityId: optionalText(form.get('entityId'), 40),
    },
  });

  return NextResponse.json({ file: { id: asset.id, name: asset.name } });
}
