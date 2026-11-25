'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function Uploader({ folders }: { folders: string[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/files', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Upload failed.');
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + Upload file
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/35 p-4 py-10 backdrop-blur-sm">
          <form onSubmit={submit} className="card my-auto w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Upload a file</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
                ✕
              </button>
            </div>

            <div>
              <label className="label">File</label>
              <input type="file" name="file" required className="input mt-1.5 py-1.5" />
            </div>

            <div>
              <label className="label">Folder</label>
              <select name="folder" className="input mt-1.5">
                {folders.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-[13px] font-medium text-brick">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
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
