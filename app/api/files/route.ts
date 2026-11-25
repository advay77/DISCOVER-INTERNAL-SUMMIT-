import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { currentUser } from '@/lib/auth';
import { can } from '@/lib/authz';
import { db } from '@/lib/db';
import { putFile } from '@/lib/storage';

const MAX = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!can(user, 'files:upload')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file given.' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: 'That file is over 15 MB.' }, { status: 400 });

  const safeName = file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  const stored = `${randomUUID()}-${safeName}`;
  const { data } = await putFile(stored, Buffer.from(await file.arrayBuffer()));

  const asset = await db.fileAsset.create({
    data: {
      name: safeName,
      path: stored,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      folder: String(form.get('folder') ?? 'General'),
      durationMs: form.get('durationMs') ? Number(form.get('durationMs')) : null,
      data,
      uploaderId: user.id,
      entityType: (form.get('entityType') as string) || null,
      entityId: (form.get('entityId') as string) || null,
    },
  });

  return NextResponse.json({ file: { id: asset.id, name: asset.name } });
}
