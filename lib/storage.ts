import 'server-only';
import { writeFile, readFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Where uploaded files live.
 *
 *   supabase — Supabase Storage. The browser uploads straight to it through a
 *              short-lived signed URL, so the app host's request-size limit
 *              (about 4.5 MB on Vercel) never applies, and files do not fill
 *              the database. Downloads are short-lived signed links handed out
 *              only after the app has checked permission.
 *   disk     — ./storage on this machine. Local development.
 *   db       — bytes in the database row. Legacy; still readable.
 *
 * STORAGE=supabase|disk|db forces one. Otherwise a host with Supabase
 * credentials uses Supabase, and anywhere else uses disk.
 */

export const BUCKET = process.env.SUPABASE_BUCKET || 'discover-files';

/** Hard ceiling per file. Supabase's own per-file limit on the free plan is 50 MB. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const HAS_SUPABASE = !!SUPABASE_URL && !!SUPABASE_KEY;

export const STORAGE: 'supabase' | 'disk' | 'db' =
  process.env.STORAGE === 'supabase' || process.env.STORAGE === 'disk' || process.env.STORAGE === 'db'
    ? (process.env.STORAGE as 'supabase' | 'disk' | 'db')
    : process.env.VERCEL && HAS_SUPABASE
      ? 'supabase'
      : 'disk';

if (STORAGE === 'supabase' && !HAS_SUPABASE) {
  // Fail at the first upload with a clear message rather than a confusing one.
  console.error('[storage] STORAGE=supabase but SUPABASE_URL or SUPABASE_SECRET_KEY is missing');
}

/** The browser needs this origin in its CSP to load and upload files. */
export const STORAGE_ORIGIN = HAS_SUPABASE ? new URL(SUPABASE_URL).origin : '';

let client: SupabaseClient | null = null;
function supabase() {
  if (!HAS_SUPABASE) throw new Error('Supabase Storage is not configured.');
  // The secret key bypasses row-level security, so it must only ever be used
  // here on the server and never sent to a browser.
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/* ------------------------------------------------------------- supabase */

/** A one-time URL the browser can PUT the file to, valid for two hours. */
export async function signUpload(objectPath: string) {
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUploadUrl(objectPath);
  if (error || !data) throw new Error(error?.message ?? 'Could not prepare the upload.');
  return { uploadUrl: data.signedUrl };
}

/**
 * Confirms the object really arrived, and returns its stored size, so a
 * client cannot mark an upload complete that never happened.
 */
export async function confirmUpload(objectPath: string): Promise<number | null> {
  const folder = path.posix.dirname(objectPath);
  const file = path.posix.basename(objectPath);
  const { data, error } = await supabase().storage.from(BUCKET).list(folder, { search: file, limit: 5 });
  if (error || !data) return null;
  const hit = data.find((o) => o.name === file);
  if (!hit) return null;
  const size = Number((hit.metadata as any)?.size ?? 0);
  return Number.isFinite(size) ? size : null;
}

/** A link valid for two minutes. Inline for safe media, download otherwise. */
export async function signDownload(objectPath: string, filename: string, inline: boolean) {
  const { data, error } = await supabase()
    .storage.from(BUCKET)
    .createSignedUrl(objectPath, 120, inline ? undefined : { download: filename });
  if (error || !data) throw new Error(error?.message ?? 'Could not prepare the download.');
  return data.signedUrl;
}

export async function removeObject(objectPath: string) {
  await supabase().storage.from(BUCKET).remove([objectPath]).catch(() => {});
}

/* ----------------------------------------------------- disk / db (local) */

const ROOT = path.join(process.cwd(), 'storage');

export async function putFile(storedName: string, bytes: Buffer) {
  if (STORAGE === 'db') return { data: bytes, backend: 'db' as const };
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, storedName), bytes);
  return { data: null, backend: 'disk' as const };
}

export async function getFile(asset: { path: string; data: Uint8Array | null }) {
  if (asset.data) return Buffer.from(asset.data);
  const full = path.resolve(ROOT, asset.path);
  if (!full.startsWith(path.resolve(ROOT))) throw new Error('bad path');
  return readFile(full);
}

export async function dropFile(asset: { path: string; data: Uint8Array | null; backend?: string }) {
  if (asset.backend === 'supabase') return removeObject(asset.path);
  if (asset.data) return;
  await unlink(path.resolve(ROOT, asset.path)).catch(() => {});
}

/* --------------------------------------------------------------- policy */

/** Executables and scripts are never useful here and are refused outright. */
export const BLOCKED_NAME = /\.(exe|dll|bat|cmd|com|scr|msi|ps1|sh|jar|app|vbs|js|mjs|cjs|html?|svg|php)$/i;

/** Only media a browser renders safely is shown inline; the rest downloads. */
export const INLINE_SAFE =
  /^(image\/(png|jpe?g|gif|webp|avif)|video\/(mp4|webm|ogg|quicktime)|audio\/(mpeg|ogg|wav|webm|mp4)|application\/pdf)$/i;

export function safeFileName(name: string) {
  return name.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || 'file';
}
