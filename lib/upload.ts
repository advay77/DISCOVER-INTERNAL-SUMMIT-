/**
 * Uploading a file from the browser.
 *
 * Hosted: ask the app for a one-time URL, PUT the bytes straight to Supabase
 * Storage with real progress, then ask the app to confirm. The file never
 * passes through the app host, so its request-size limit does not apply.
 *
 * Local development (no Supabase Storage): one multipart POST to the app.
 *
 * Browser-only — imported by client components.
 */

export type UploadedFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  durationMs?: number | null;
};

export type UploadOptions = {
  folder?: string;
  durationMs?: number;
  entityType?: string;
  entityId?: string;
  onProgress?: (fraction: number) => void;
};

export const MAX_UPLOAD_MB = 50;

export async function uploadFile(file: File, opts: UploadOptions = {}): Promise<UploadedFile> {
  if (file.size === 0) throw new Error(`${file.name} is empty.`);
  if (file.size > MAX_UPLOAD_MB * 1048576) {
    throw new Error(`${file.name} is over ${MAX_UPLOAD_MB} MB.`);
  }

  const sign = await fetch('/api/files/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      folder: opts.folder ?? 'General',
      durationMs: opts.durationMs,
      entityType: opts.entityType,
      entityId: opts.entityId,
    }),
  });
  const signed = await sign.json().catch(() => ({}));
  if (!sign.ok) throw new Error(signed.error ?? `${file.name} could not be uploaded.`);

  // No Supabase Storage here — send it through the app.
  if (signed.direct) return uploadThroughApp(file, opts);

  await putWithProgress(signed.uploadUrl, file, opts.onProgress);

  const done = await fetch(`/api/files/${signed.id}/complete`, { method: 'POST' });
  const confirmed = await done.json().catch(() => ({}));
  if (!done.ok) throw new Error(confirmed.error ?? `${file.name} did not finish uploading.`);
  return confirmed.file as UploadedFile;
}

/** XHR rather than fetch, because fetch cannot report upload progress. */
function putWithProgress(url: string, file: File, onProgress?: (f: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? (onProgress?.(1), resolve())
        : reject(new Error(`${file.name} was refused by storage (${xhr.status}).`));
    xhr.onerror = () => reject(new Error(`Connection lost while uploading ${file.name}.`));
    xhr.send(file);
  });
}

async function uploadThroughApp(file: File, opts: UploadOptions): Promise<UploadedFile> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', opts.folder ?? 'General');
  if (opts.durationMs) fd.append('durationMs', String(opts.durationMs));
  if (opts.entityType) fd.append('entityType', opts.entityType);
  if (opts.entityId) fd.append('entityId', opts.entityId);

  const res = await fetch('/api/files', { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${file.name} could not be uploaded.`);
  opts.onProgress?.(1);
  return data.file as UploadedFile;
}
