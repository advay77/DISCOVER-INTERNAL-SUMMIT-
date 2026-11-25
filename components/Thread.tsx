'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { Avatar } from './ui';
import { Attachment, type Attached } from './Attachment';
import { clockTime, relativeTime } from '@/lib/format';
import { IconPlus, IconFiles } from './icons';

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; accent: string; title?: string | null };
  files?: Attached[];
  reactions?: { emoji: string; userId: string }[];
};

type Props = {
  channelId?: string;
  entityType?: string;
  entityId?: string;
  meId: string;
  placeholder?: string;
  compact?: boolean;
  emptyHint?: string;
};

const QUICK = ['👍', '✅', '🙌', '👀', '🎉', '❓'];

export function Thread({
  channelId,
  entityType,
  entityId,
  meId,
  placeholder = 'Write a message',
  compact = false,
  emptyHint,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState('');
  const [pendingFiles, setPendingFiles] = useState<Attached[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bottom = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const firstLoad = useRef(true);

  const query = channelId ? `channelId=${channelId}` : `entityType=${entityType}&entityId=${entityId}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?${query}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    firstLoad.current = true;
    setLoading(true);
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!messages.length) return;
    bottom.current?.scrollIntoView({ behavior: firstLoad.current ? 'auto' : 'smooth' });
    firstLoad.current = false;
  }, [messages.length]);

  /* ---------------------------------------------------------------- uploads */

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 10);
    if (!list.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'Chat');
        const res = await fetch('/api/files', { method: 'POST', body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? `${file.name} could not be uploaded.`);
          continue;
        }
        const data = await res.json();
        setPendingFiles((p) => [
          ...p,
          { id: data.file.id, name: data.file.name, mime: file.type || 'application/octet-stream', size: file.size },
        ]);
      }
    } finally {
      setUploading(false);
    }
  }

  /* ------------------------------------------------------------ voice notes */

  async function toggleRecording() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      startedAt.current = Date.now();
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const ms = Date.now() - startedAt.current;
        if (blob.size < 800) return;
        const fd = new FormData();
        fd.append('file', new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' }));
        fd.append('folder', 'Chat');
        fd.append('durationMs', String(ms));
        const res = await fetch('/api/files', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          setPendingFiles((p) => [
            ...p,
            { id: data.file.id, name: 'Voice note', mime: 'audio/webm', size: blob.size, durationMs: ms },
          ]);
        }
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError('No microphone available, or permission was refused.');
    }
  }

  /* ---------------------------------------------------------------- sending */

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = value.trim();
    if ((!body && pendingFiles.length === 0) || sending) return;
    setSending(true);
    setValue('');
    const fileIds = pendingFiles.map((f) => f.id);
    setPendingFiles([]);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channelId, entityType, entityId, body, fileIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((m) => [...m, data.message]);
      } else {
        setValue(body);
      }
    } finally {
      setSending(false);
    }
  }

  async function react(messageId: string, emoji: string) {
    setPickerFor(null);
    const res = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messageId, emoji }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setMessages((m) => m.map((x) => (x.id === messageId ? { ...x, reactions: data.reactions } : x)));
  }

  /* ----------------------------------------------------------------- render */

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
      }}
    >
      <div
        className={clsx(
          compact
            ? 'max-h-80 flex-1 space-y-4 overflow-y-auto pr-1'
            : 'flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5',
          dragging && 'bg-brand-50',
        )}
      >
        {loading && messages.length === 0 && (
          <p className="py-6 text-center text-[13px] text-ink-faint">Loading…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="py-8 text-center text-[13px] text-ink-faint">
            {emptyHint ?? 'Nothing here yet. Start the conversation.'}
          </p>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped =
            prev &&
            prev.author.id === m.author.id &&
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;

          const grouping: Record<string, string[]> = {};
          for (const r of m.reactions ?? []) {
            (grouping[r.emoji] ??= []).push(r.userId);
          }

          return (
            <div key={m.id} className={clsx('group relative flex gap-3', grouped && 'pl-[42px]')}>
              {!grouped && <Avatar name={m.author.name} accent={m.author.accent} size={30} />}

              <div className="min-w-0 flex-1">
                {!grouped && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-ink">{m.author.name}</span>
                    <span className="text-[11px] text-ink-faint">{clockTime(m.createdAt)}</span>
                  </div>
                )}

                {m.body && (
                  <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-ink">
                    {renderMentions(m.body)}
                  </p>
                )}

                {m.files?.map((f) => (
                  <Attachment key={f.id} file={f} />
                ))}

                {Object.keys(grouping).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(grouping).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => react(m.id, emoji)}
                        className={clsx(
                          'flex items-center gap-1 rounded-[3px] border px-1.5 py-[2px] text-[11.5px] transition',
                          users.includes(meId)
                            ? 'border-brand/40 bg-brand-100 text-brand'
                            : 'border-line bg-white text-ink-muted hover:border-line-strong',
                        )}
                      >
                        <span>{emoji}</span>
                        <span className="font-semibold">{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* hover action: react */}
              <div className="absolute right-0 top-0 hidden group-hover:block">
                <button
                  onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}
                  className="rounded-[3px] border border-line bg-white px-1.5 py-0.5 text-[12px] text-ink-muted hover:border-line-strong"
                  aria-label="Add a reaction"
                >
                  ☺
                </button>
                {pickerFor === m.id && (
                  <div className="absolute right-0 z-10 mt-1 flex gap-0.5 rounded-[4px] border border-line bg-white p-1 shadow-pop">
                    {QUICK.map((e) => (
                      <button
                        key={e}
                        onClick={() => react(m.id, e)}
                        className="rounded-[3px] px-1.5 py-1 text-[15px] hover:bg-paper"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {/* Composer */}
      <div className={compact ? 'mt-3' : 'border-t border-line bg-white px-4 py-2.5 sm:px-5 sm:py-3'}>
        {pendingFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingFiles.map((f) => (
              <span
                key={f.id}
                className="flex items-center gap-2 rounded-[3px] border border-line bg-paper px-2 py-1 text-[12px]"
              >
                <IconFiles size={13} className="text-ink-faint" />
                <span className="max-w-[12rem] truncate">{f.name}</span>
                <button
                  onClick={() => setPendingFiles((p) => p.filter((x) => x.id !== f.id))}
                  className="text-ink-faint hover:text-brick"
                  aria-label={`Remove ${f.name}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {error && <p className="mb-2 text-[12px] font-medium text-brick">{error}</p>}

        <form onSubmit={send} className="flex flex-wrap items-end gap-2">
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => e.target.files && upload(e.target.files)}
          />

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="btn-ghost btn-sm shrink-0"
            title="Attach a photo, video or file"
            aria-label="Attach a file"
          >
            <IconPlus size={15} />
          </button>

          <button
            type="button"
            onClick={toggleRecording}
            className={clsx(
              'btn-sm shrink-0 rounded-[5px] border px-2.5 font-semibold transition',
              recording
                ? 'border-brick bg-brick text-white'
                : 'border-line-strong bg-white text-ink-muted hover:border-navy hover:text-ink',
            )}
            title={recording ? 'Stop and attach the voice note' : 'Record a voice note'}
          >
            {recording ? '■ Stop' : '● Voice'}
          </button>

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={uploading ? 'Uploading…' : placeholder}
            className="input order-first max-h-28 min-h-[38px] w-full resize-y py-2 sm:order-none sm:w-auto sm:flex-1"
            aria-label="Message"
          />

          <button
            type="submit"
            disabled={sending || (!value.trim() && pendingFiles.length === 0)}
            className="btn-primary btn-sm ml-auto shrink-0 sm:ml-0"
          >
            {sending ? '…' : 'Send'}
          </button>
        </form>

        {!compact && (
          <p className="mt-1.5 hidden text-[11px] text-ink-faint sm:block">
            Enter sends · Shift + Enter for a new line · drag files anywhere in this panel
          </p>
        )}
      </div>
    </div>
  );
}

function renderMentions(body: string) {
  const parts = body.split(/(@[A-Za-z][\w.-]*)/g);
  return parts.map((p, i) =>
    p.startsWith('@') ? (
      <span key={i} className="rounded-[2px] bg-brand-100 px-1 font-semibold text-brand">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function ThreadTimestamp({ at }: { at: string }) {
  return <span className="text-[11px] text-ink-faint">{relativeTime(at)}</span>;
}
