'use client';

import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import clsx from 'clsx';
import { Avatar } from './ui';
import { Attachment, type Attached } from './Attachment';
import { clockTime, relativeTime } from '@/lib/format';
import { IconFiles } from './icons';
import { uploadFile } from '@/lib/upload';
import { subscribe } from '@/lib/realtime-client';

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  deleted?: boolean;
  author: { id: string; name: string; accent: string; title?: string | null };
  files?: Attached[];
  reactions?: { emoji: string; userId: string }[];
  parent?: { id: string; body: string; deleted: boolean; author: { id: string; name: string } } | null;
  /** Shown while the server has not confirmed it yet. */
  pending?: boolean;
};

type Props = {
  channelId?: string;
  entityType?: string;
  entityId?: string;
  meId: string;
  meName: string;
  meAccent: string;
  /** May remove other people's messages (admins). */
  canModerate?: boolean;
  placeholder?: string;
  compact?: boolean;
  emptyHint?: string;
};

const QUICK = ['👍', '✅', '🙌', '👀', '🎉', '❓'];
/** Poll fast when there is no realtime socket, slowly as a safety net when there is. */
const POLL_MS = 3000;
const POLL_WITH_SOCKET_MS = 30000;

function byTime(a: ChatMessage, b: ChatMessage) {
  return +new Date(a.createdAt) - +new Date(b.createdAt);
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

export function Thread({
  channelId,
  entityType,
  entityId,
  meId,
  meName,
  meAccent,
  canModerate = false,
  placeholder = 'Write a message',
  compact = false,
  emptyHint,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState('');
  const [pendingFiles, setPendingFiles] = useState<Attached[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ name: string; fraction: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [unseen, setUnseen] = useState(0);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const cursor = useRef<string | null>(null);
  const atBottom = useRef(true);
  const stickNext = useRef<'bottom' | 'keep' | null>('bottom');
  const keepFrom = useRef<{ height: number; top: number } | null>(null);
  const inFlight = useRef(false);

  const query = channelId
    ? `channelId=${encodeURIComponent(channelId)}`
    : `entityType=${encodeURIComponent(entityType ?? '')}&entityId=${encodeURIComponent(entityId ?? '')}`;

  /** Merge server rows into state: upsert by id, drop confirmed optimistic copies. */
  const merge = useCallback((incoming: ChatMessage[], replace = false) => {
    setMessages((current) => {
      const map = new Map<string, ChatMessage>(replace ? [] : current.filter((m) => !m.pending).map((m) => [m.id, m]));
      let fresh = 0;
      for (const m of incoming) {
        if (m.deleted && !map.has(m.id)) continue; // never seen it, nothing to tombstone
        if (!map.has(m.id) && m.author.id !== meId) fresh++;
        map.set(m.id, m);
      }
      const confirmed = new Set(incoming.map((m) => m.body + m.author.id));
      const pending = current.filter((m) => m.pending && !confirmed.has(m.body + m.author.id));
      if (!replace && fresh && !atBottom.current) setUnseen((n) => n + fresh);
      if (!replace && fresh && atBottom.current) stickNext.current = 'bottom';
      return [...map.values(), ...pending].sort(byTime);
    });
  }, [meId]);

  /* ----------------------------------------------------------- loading */

  const loadLatest = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?${query}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      cursor.current = data.cursor;
      setHasMore(!!data.hasMore);
      stickNext.current = 'bottom';
      merge(data.messages ?? [], true);
      return data.topic as string | undefined;
    } finally {
      setLoading(false);
    }
  }, [query, merge]);

  /** Only what changed since the last answer. */
  const poll = useCallback(async () => {
    if (!cursor.current || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/messages?${query}&after=${encodeURIComponent(cursor.current)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      cursor.current = data.cursor;
      if (data.messages?.length) merge(data.messages);
    } catch {
      /* offline for a moment — the next tick retries */
    } finally {
      inFlight.current = false;
    }
  }, [query, merge]);

  async function loadOlder() {
    const oldest = messages.find((m) => !m.pending);
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/messages?${query}&before=${encodeURIComponent(oldest.createdAt)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setHasMore(!!data.hasMore);
      const el = scroller.current;
      if (el) keepFrom.current = { height: el.scrollHeight, top: el.scrollTop };
      stickNext.current = 'keep';
      merge(data.messages ?? []);
    } finally {
      setLoadingOlder(false);
    }
  }

  // First load, realtime subscription, and polling that pauses in a hidden tab.
  useEffect(() => {
    let stop: (() => void) | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    cursor.current = null;

    const startTimer = (socket: boolean) => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') poll();
      }, socket ? POLL_WITH_SOCKET_MS : POLL_MS);
    };

    loadLatest().then((topic) => {
      if (cancelled) return;
      startTimer(false);
      if (topic) {
        stop = subscribe(topic, () => poll(), (ok) => {
          setLive(ok);
          startTimer(ok);
        });
      }
    });

    const onVisible = () => document.visibilityState === 'visible' && poll();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stop?.();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [loadLatest, poll]);

  // Scroll: stick to the bottom for new messages, hold position when older ones load.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (stickNext.current === 'bottom') {
      el.scrollTop = el.scrollHeight;
      setUnseen(0);
    } else if (stickNext.current === 'keep' && keepFrom.current) {
      el.scrollTop = el.scrollHeight - keepFrom.current.height + keepFrom.current.top;
      keepFrom.current = null;
    }
    stickNext.current = null;
  }, [messages]);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottom.current) setUnseen(0);
  }

  function jumpToBottom() {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setUnseen(0);
  }

  function jumpTo(id: string) {
    const node = document.getElementById(`msg-${id}`);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    node.classList.add('ring-2', 'ring-lime');
    setTimeout(() => node.classList.remove('ring-2', 'ring-lime'), 1600);
  }

  /* ----------------------------------------------------------- uploads */

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 10);
    if (!list.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        try {
          setProgress({ name: file.name, fraction: 0 });
          const done = await uploadFile(file, {
            folder: 'Chat',
            onProgress: (fraction) => setProgress({ name: file.name, fraction }),
          });
          setPendingFiles((p) => [
            ...p,
            { id: done.id, name: done.name, mime: done.mime || file.type || 'application/octet-stream', size: done.size },
          ]);
        } catch (err) {
          setError(err instanceof Error ? err.message : `${file.name} could not be uploaded.`);
        }
      }
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

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
        try {
          const done = await uploadFile(new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' }), {
            folder: 'Chat',
            durationMs: ms,
          });
          setPendingFiles((p) => [...p, { id: done.id, name: 'Voice note', mime: 'audio/webm', size: done.size, durationMs: ms }]);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'The voice note could not be uploaded.');
        }
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError('No microphone available, or permission was refused.');
    }
  }

  /* ----------------------------------------------------------- writing */

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = value.trim();
    const attached = pendingFiles;
    const parent = replyTo;
    if ((!body && attached.length === 0) || sending) return;

    setSending(true);
    setError(null);
    setValue('');
    setPendingFiles([]);
    setReplyTo(null);

    // Show it at once, so the box never looks like it swallowed the message.
    const optimisticId = `local-${Date.now()}`;
    stickNext.current = 'bottom';
    setMessages((m) => [
      ...m,
      {
        id: optimisticId,
        body,
        createdAt: new Date().toISOString(),
        author: { id: meId, name: meName, accent: meAccent },
        files: attached,
        reactions: [],
        parent: parent ? { id: parent.id, body: parent.body.slice(0, 160), deleted: false, author: parent.author } : null,
        pending: true,
      },
    ]);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channelId, entityType, entityId, body, fileIds: attached.map((f) => f.id), parentId: parent?.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((m) => m.map((x) => (x.id === optimisticId ? data.message : x)));
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'That message did not send. Try again.');
      }
    } catch (err) {
      setError(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'No connection. The message was not sent.');
      setMessages((m) => m.filter((x) => x.id !== optimisticId));
      setValue(body);
      setPendingFiles(attached);
      setReplyTo(parent);
    } finally {
      setSending(false);
      composer.current?.focus();
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const body = editing.body.trim();
    const id = editing.id;
    if (!body) return;
    setEditing(null);
    const before = messages.find((m) => m.id === id);
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, body, editedAt: new Date().toISOString() } : x)));
    const res = await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, body }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'The edit did not save.');
      if (before) setMessages((m) => m.map((x) => (x.id === id ? before : x)));
    }
  }

  async function remove(m: ChatMessage) {
    setMenuFor(null);
    if (!confirm('Delete this message for everyone?')) return;
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, deleted: true, body: '', files: [], reactions: [] } : x)));
    const res = await fetch(`/api/messages?id=${encodeURIComponent(m.id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'The message was not deleted.');
      setMessages((list) => list.map((x) => (x.id === m.id ? m : x)));
    }
  }

  async function react(messageId: string, emoji: string) {
    setPickerFor(null);
    setMenuFor(null);
    const res = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messageId, emoji }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setMessages((m) => m.map((x) => (x.id === messageId ? { ...x, reactions: data.reactions } : x)));
  }

  function startReply(m: ChatMessage) {
    setReplyTo(m);
    setMenuFor(null);
    composer.current?.focus();
  }

  /* ------------------------------------------------------------ render */

  const visible = messages;

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
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
        ref={scroller}
        onScroll={onScroll}
        className={clsx(
          compact ? 'max-h-96 flex-1 overflow-y-auto pr-1' : 'flex-1 overflow-y-auto px-3 py-4 sm:px-5',
          dragging && 'bg-lime-100/40',
        )}
        aria-live="polite"
      >
        {hasMore && (
          <div className="mb-3 flex justify-center">
            <button type="button" onClick={loadOlder} disabled={loadingOlder} className="btn-ghost btn-sm">
              {loadingOlder ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {loading && visible.length === 0 && <p className="py-6 text-center text-[13px] text-ink-faint">Loading…</p>}
        {!loading && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-lime text-[20px]">💬</span>
            <p className="mt-3 max-w-xs text-[13px] text-ink-faint">{emptyHint ?? 'Nothing here yet. Start the conversation.'}</p>
          </div>
        )}

        {visible.map((m, i) => {
          const prev = visible[i - 1];
          const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          const grouped =
            !newDay &&
            !m.parent &&
            prev &&
            !prev.deleted &&
            prev.author.id === m.author.id &&
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
          const mine = m.author.id === meId;
          const grouping: Record<string, string[]> = {};
          for (const r of m.reactions ?? []) (grouping[r.emoji] ??= []).push(r.userId);
          const isEditing = editing?.id === m.id;
          const actionsOpen = menuFor === m.id || pickerFor === m.id;

          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-3 flex items-center gap-3" role="separator">
                  <span className="h-px flex-1 bg-line" />
                  <span className="rounded-full bg-panel px-3 py-1 text-[11.5px] font-medium text-ink-muted">{dayLabel(m.createdAt)}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}

              <div
                id={`msg-${m.id}`}
                onClick={(e) => {
                  // Touch screens have no hover: a tap on the message shows its actions.
                  if ((e.target as HTMLElement).closest('a,button,textarea,audio,video')) return;
                  if (window.matchMedia('(hover: none)').matches) setMenuFor(menuFor === m.id ? null : m.id);
                }}
                className={clsx(
                  'group relative flex gap-3 rounded-2xl px-2.5 transition',
                  grouped ? 'py-0.5' : 'mt-1.5 py-1.5',
                  mine ? 'bg-lime-100/45 hover:bg-lime-100/70' : 'hover:bg-panel/70',
                  m.pending && 'opacity-60',
                )}
              >
                <div className="w-8 shrink-0">
                  {!grouped ? (
                    <Avatar name={m.author.name} accent={m.author.accent} size={32} />
                  ) : (
                    <span className="hidden whitespace-nowrap pt-1 text-right text-[10px] tabular-nums text-ink-faint group-hover:block">
                      {clockTime(m.createdAt).replace(/\s?[AP]M$/i, '')}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13.5px] font-semibold text-ink">{mine ? 'You' : m.author.name}</span>
                      <span className="text-[11px] text-ink-faint" title={new Date(m.createdAt).toLocaleString()}>
                        {clockTime(m.createdAt)}
                      </span>
                      {m.pending && <span className="text-[10.5px] text-ink-faint">sending…</span>}
                    </div>
                  )}

                  {m.parent && (
                    <button
                      type="button"
                      onClick={() => jumpTo(m.parent!.id)}
                      className="mb-1 mt-0.5 block w-full max-w-md rounded-xl border-l-[3px] border-navy/40 bg-panel px-3 py-1.5 text-left transition hover:bg-line/60"
                    >
                      <span className="block text-[11.5px] font-semibold text-ink-muted">
                        ↪ {m.parent.author.id === meId ? 'You' : m.parent.author.name}
                      </span>
                      <span className="block truncate text-[12.5px] text-ink-muted">
                        {m.parent.deleted ? <em>Message deleted</em> : m.parent.body || 'Attachment'}
                      </span>
                    </button>
                  )}

                  {m.deleted ? (
                    <p className="text-[13px] italic text-ink-faint">This message was deleted.</p>
                  ) : isEditing ? (
                    <div className="mt-1">
                      <textarea
                        autoFocus
                        value={editing!.body}
                        onChange={(e) => setEditing({ id: m.id, body: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit();
                          }
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        rows={2}
                        aria-label="Edit message"
                        className="input bg-white"
                      />
                      <div className="mt-1.5 flex items-center gap-2 text-[12px]">
                        <button type="button" onClick={saveEdit} className="btn-primary btn-sm">
                          Save
                        </button>
                        <button type="button" onClick={() => setEditing(null)} className="btn-ghost btn-sm">
                          Cancel
                        </button>
                        <span className="text-ink-faint">Enter to save · Esc to cancel</span>
                      </div>
                    </div>
                  ) : (
                    m.body && (
                      <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink">
                        {renderBody(m.body)}
                        {m.editedAt && <span className="ml-1.5 text-[11px] text-ink-faint">(edited)</span>}
                      </p>
                    )
                  )}

                  {!m.deleted && m.files?.map((f) => <Attachment key={f.id} file={f} />)}

                  {Object.keys(grouping).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Object.entries(grouping).map(([emoji, users]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => react(m.id, emoji)}
                          className={clsx(
                            'flex items-center gap-1 rounded-full border px-2 py-[2px] text-[12px] transition',
                            users.includes(meId)
                              ? 'border-navy/30 bg-navy text-white'
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

                {/* Actions: on hover with a mouse, on tap with a finger. */}
                {!m.deleted && !m.pending && !isEditing && (
                  <div
                    className={clsx(
                      'absolute -top-3 right-2 z-10 items-center gap-0.5 rounded-full border border-line bg-white p-0.5 shadow-pop',
                      actionsOpen ? 'flex' : 'hidden [@media(hover:hover)]:group-hover:flex',
                    )}
                  >
                    <ActionButton label="React" onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}>
                      ☺
                    </ActionButton>
                    <ActionButton label="Reply" onClick={() => startReply(m)}>
                      ↩
                    </ActionButton>
                    {mine && (
                      <ActionButton
                        label="Edit"
                        onClick={() => {
                          setEditing({ id: m.id, body: m.body });
                          setMenuFor(null);
                        }}
                      >
                        ✎
                      </ActionButton>
                    )}
                    {(mine || canModerate) && (
                      <ActionButton label="Delete" onClick={() => remove(m)} danger>
                        🗑
                      </ActionButton>
                    )}
                    {pickerFor === m.id && (
                      <div className="absolute right-0 top-full mt-1 flex gap-0.5 rounded-full border border-line bg-white p-1 shadow-pop">
                        {QUICK.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => react(m.id, e)}
                            className="rounded-full px-1.5 py-1 text-[16px] transition hover:bg-panel"
                            aria-label={`React ${e}`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unseen > 0 && (
        <button
          type="button"
          onClick={jumpToBottom}
          className="absolute bottom-[92px] left-1/2 z-20 -translate-x-1/2 rounded-full bg-navy px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-pop"
        >
          {unseen} new {unseen === 1 ? 'message' : 'messages'} ↓
        </button>
      )}

      {/* Composer */}
      <div className={compact ? 'mt-3' : 'px-3 pb-3 pt-2 sm:px-5 sm:pb-4'}>
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border-l-[3px] border-lime-600 bg-panel px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold text-ink-muted">
                Replying to {replyTo.author.id === meId ? 'yourself' : replyTo.author.name}
              </p>
              <p className="truncate text-[12.5px] text-ink-muted">{replyTo.body || 'Attachment'}</p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="text-ink-faint hover:text-ink" aria-label="Cancel reply">
              ✕
            </button>
          </div>
        )}

        {pendingFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingFiles.map((f) => (
              <span key={f.id} className="flex items-center gap-2 rounded-full bg-panel px-3 py-1 text-[12px]">
                <IconFiles size={13} className="text-ink-faint" />
                <span className="max-w-[12rem] truncate">{f.name}</span>
                <button
                  type="button"
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

        {progress && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[11.5px] text-ink-muted">
              <span className="truncate">Uploading {progress.name}</span>
              <span className="tabular-nums">{Math.round(progress.fraction * 100)}%</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${progress.fraction * 100}%` }} />
            </div>
          </div>
        )}

        {error && <p className="mb-2 text-[12px] font-medium text-brick">{error}</p>}

        <form
          onSubmit={send}
          className="flex items-end gap-1 rounded-[22px] border border-line-strong bg-white p-1.5 transition focus-within:border-ink/40 focus-within:ring-2 focus-within:ring-lime/50"
        >
          <input ref={fileInput} type="file" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />

          <IconButton label="Attach a photo, video or file" onClick={() => fileInput.current?.click()} disabled={uploading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m21 11-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6L15 7.6" />
            </svg>
          </IconButton>

          <textarea
            ref={composer}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
              // ↑ in an empty box edits your last message, as in most chat apps.
              if (e.key === 'ArrowUp' && !value) {
                const last = [...messages].reverse().find((m) => m.author.id === meId && !m.deleted && !m.pending);
                if (last) {
                  e.preventDefault();
                  setEditing({ id: last.id, body: last.body });
                }
              }
              if (e.key === 'Escape') setReplyTo(null);
            }}
            rows={1}
            placeholder={uploading ? 'Uploading…' : recording ? 'Recording… tap the mic to stop' : placeholder}
            className="max-h-40 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-[14px] text-ink outline-none placeholder:text-ink-faint max-lg:text-[16px]"
            aria-label="Message"
          />

          <IconButton label={recording ? 'Stop and attach the voice note' : 'Record a voice note'} onClick={toggleRecording} active={recording}>
            {recording ? (
              <span className="block h-3 w-3 rounded-[3px] bg-current" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            )}
          </IconButton>

          <button
            type="submit"
            disabled={sending || (!value.trim() && pendingFiles.length === 0)}
            aria-label="Send"
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-navy text-white transition hover:bg-navy-700 disabled:opacity-30"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        {!compact && (
          <p className="mt-1.5 hidden items-center gap-2 px-2 text-[11px] text-ink-faint sm:flex">
            <span className={clsx('h-1.5 w-1.5 rounded-full', live ? 'bg-forest' : 'bg-line-strong')} />
            {live ? 'Live' : 'Auto-refreshing'} · Enter sends · Shift + Enter new line · ↑ edits your last message · drop files anywhere
          </p>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={clsx(
        'flex h-7 w-7 items-center justify-center rounded-full text-[13px] text-ink-muted transition hover:bg-panel hover:text-ink',
        danger && 'hover:bg-brick-100 hover:text-brick',
      )}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={clsx(
        'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full transition disabled:opacity-40',
        active ? 'bg-brick text-snow' : 'text-ink-muted hover:bg-panel hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

/** @mentions highlighted, links clickable. */
function renderBody(body: string) {
  const parts = body.split(/(@[A-Za-z][\w.-]*|https?:\/\/[^\s<]+)/g);
  return parts.map((p, i) => {
    if (p.startsWith('@')) {
      return (
        <span key={i} className="rounded bg-brand-100 px-1 font-semibold text-brand">
          {p}
        </span>
      );
    }
    if (/^https?:\/\//.test(p)) {
      return (
        <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-brand underline">
          {p}
        </a>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function ThreadTimestamp({ at }: { at: string }) {
  return <span className="text-[11px] text-ink-faint">{relativeTime(at)}</span>;
}
