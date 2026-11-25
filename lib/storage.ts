import 'server-only';
import { writeFile, readFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';

/**
 * Where uploads live.
 *
 * Local development writes to ./storage. A hosted deploy has no writable disk,
 * so the bytes go in the database instead. Set STORAGE=disk or STORAGE=db to
 * force one; otherwise a Vercel deployment picks the database automatically.
 */
export const STORAGE: 'disk' | 'db' =
  process.env.STORAGE === 'disk'
    ? 'disk'
    : process.env.STORAGE === 'db'
      ? 'db'
      : process.env.VERCEL
        ? 'db'
        : 'disk';

const ROOT = path.join(process.cwd(), 'storage');

export async function putFile(storedName: string, bytes: Buffer) {
  if (STORAGE === 'db') return { data: bytes };
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, storedName), bytes);
  return { data: null };
}

export async function getFile(asset: { path: string; data: Uint8Array | null }) {
  if (asset.data) return Buffer.from(asset.data);
  const full = path.resolve(ROOT, asset.path);
  if (!full.startsWith(path.resolve(ROOT))) throw new Error('bad path');
  return readFile(full);
}

export async function dropFile(asset: { path: string; data: Uint8Array | null }) {
  if (asset.data) return;
  await unlink(path.resolve(ROOT, asset.path)).catch(() => {});
}
