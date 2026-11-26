'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadFile, MAX_UPLOAD_MB } from '@/lib/upload';
import { IconPlus } from '@/components/icons';

export function Uploader({ folders }: { folders: string[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setError('Choose a file first.');
      return;
    }

    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      await uploadFile(file, {
        folder: String(form.get('folder') ?? 'General'),
        onProgress: setProgress,
      });
      setOpen(false);
      setPicked(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <IconPlus size={14} /> Upload file
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/45 p-4 py-10">
          <form onSubmit={submit} className="card my-auto w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-ink">Upload a file</h2>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="text-ink-faint hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* The real file input covers the drop zone, so clicking and dropping both work. */}
            <label
              className={
                'relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ' +
                (over ? 'border-navy bg-accent-100/60' : picked ? 'border-forest/40 bg-forest-100/50' : 'border-line-strong bg-panel hover:border-ink/40')
              }
              onDragEnter={() => setOver(true)}
              onDragLeave={() => setOver(false)}
              onDrop={() => setOver(false)}
            >
              <input
                type="file"
                name="file"
                required
                disabled={busy}
                aria-label="File"
                onChange={(e) => setPicked(e.target.files?.[0]?.name ?? null)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-card">
                <IconPlus size={18} />
              </span>
              <span className="mt-3 text-[14px] font-semibold text-ink">{picked ?? 'Drop a file here, or click to choose'}</span>
              <span className="mt-1 text-[12px] text-ink-faint">Up to {MAX_UPLOAD_MB} MB — documents, decks, photos, video.</span>
            </label>

            <div>
              <label className="label">Folder</label>
              <select name="folder" disabled={busy} className="input mt-1.5">
                {folders.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>

            {busy && (
              <div>
                <div className="flex justify-between text-[11.5px] text-ink-muted">
                  <span>Uploading</span>
                  <span className="tabular-nums">{Math.round(progress * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            )}

            {error && <p className="text-[13px] font-medium text-brick">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy}>
                {busy ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
