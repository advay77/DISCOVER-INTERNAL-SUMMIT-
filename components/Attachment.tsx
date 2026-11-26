'use client';

import { useState } from 'react';
import { IconFiles } from './icons';

export type Attached = {
  id: string;
  name: string;
  mime: string;
  size: number;
  durationMs?: number | null;
};

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function Attachment({ file }: { file: Attached }) {
  const url = `/api/files/${file.id}`;
  const [broken, setBroken] = useState(false);

  if (file.mime.startsWith('image/') && !broken) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-2 block w-fit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={file.name}
          onError={() => setBroken(true)}
          className="max-h-72 max-w-[22rem] rounded-lg border border-line object-cover"
        />
        <span className="mt-1 block text-[11px] text-ink-faint">{file.name}</span>
      </a>
    );
  }

  if (file.mime.startsWith('video/')) {
    return (
      <div className="mt-2 w-fit">
        <video src={url} controls preload="metadata" className="max-h-80 max-w-[24rem] rounded-lg border border-line" />
        <span className="mt-1 block text-[11px] text-ink-faint">{file.name}</span>
      </div>
    );
  }

  if (file.mime.startsWith('audio/')) {
    return (
      <div className="mt-2 flex w-fit max-w-[22rem] items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2">
        <audio src={url} controls preload="metadata" className="h-8" />
        <span className="shrink-0 text-[11px] text-ink-faint">
          {file.durationMs ? `${Math.round(file.durationMs / 1000)}s` : 'Voice note'}
        </span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex w-fit max-w-[20rem] items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2 hover:border-line-strong"
    >
      <IconFiles size={17} className="shrink-0 text-ink-faint" />
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium text-ink">{file.name}</span>
        <span className="block text-[11px] text-ink-faint">{kb(file.size)}</span>
      </span>
    </a>
  );
}
