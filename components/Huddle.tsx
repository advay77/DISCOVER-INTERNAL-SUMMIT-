'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Avatar } from './ui';

/**
 * A voice huddle on a channel.
 *
 * Mesh WebRTC audio between everyone in the room. Signalling is polled through
 * /api/huddle rather than a socket server — fine for a handful of people, and
 * the swap to websockets is confined to this file.
 *
 * Deterministic politeness rule: the person with the lower user id makes the
 * offer, so two peers never both offer at once.
 */

type Participant = { userId: string; name: string; accent: string; muted: boolean };

const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };

export function Huddle({ channelId, meId, channelName }: { channelId: string; meId: string; channelName: string }) {
  const [inCall, setInCall] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioEls = useRef<Map<string, HTMLAudioElement>>(new Map());
  const inCallRef = useRef(false);

  const post = useCallback(
    (body: Record<string, unknown>) =>
      fetch('/api/huddle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channelId, ...body }),
      }),
    [channelId],
  );

  const attachRemote = useCallback((peerId: string, stream: MediaStream) => {
    let el = audioEls.current.get(peerId);
    if (!el) {
      el = document.createElement('audio');
      el.autoplay = true;
      document.body.appendChild(el);
      audioEls.current.set(peerId, el);
    }
    el.srcObject = stream;
    el.play().catch(() => {});
  }, []);

  const makePeer = useCallback(
    (peerId: string) => {
      const existing = peers.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(ICE);
      localStream.current?.getTracks().forEach((t) => pc.addTrack(t, localStream.current!));

      pc.ontrack = (e) => attachRemote(peerId, e.streams[0]);
      pc.onicecandidate = (e) => {
        if (e.candidate) post({ action: 'signal', to: peerId, kind: 'ice', payload: JSON.stringify(e.candidate) });
      };
      pc.onconnectionstatechange = () => {
        if (['failed', 'closed'].includes(pc.connectionState)) {
          pc.close();
          peers.current.delete(peerId);
        }
      };

      peers.current.set(peerId, pc);
      return pc;
    },
    [attachRemote, post],
  );

  const tearDown = useCallback(() => {
    peers.current.forEach((pc) => pc.close());
    peers.current.clear();
    audioEls.current.forEach((el) => el.remove());
    audioEls.current.clear();
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
  }, []);

  /* ------------------------------------------------------------- polling */

  useEffect(() => {
    let stop = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/huddle?channelId=${channelId}`, { cache: 'no-store' });
        if (!res.ok || stop) return;
        const data = await res.json();
        setParticipants(data.participants ?? []);

        if (!inCallRef.current) return;

        await post({ action: 'heartbeat', muted });

        // Offer to everyone already here whose id sorts above mine.
        for (const p of data.participants as Participant[]) {
          if (p.userId === meId) continue;
          if (peers.current.has(p.userId)) continue;
          if (meId < p.userId) {
            const pc = makePeer(p.userId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await post({ action: 'signal', to: p.userId, kind: 'offer', payload: JSON.stringify(offer) });
          }
        }

        // Drop peers who left.
        const here = new Set((data.participants as Participant[]).map((p) => p.userId));
        peers.current.forEach((pc, id) => {
          if (!here.has(id)) {
            pc.close();
            peers.current.delete(id);
            audioEls.current.get(id)?.remove();
            audioEls.current.delete(id);
          }
        });

        for (const sig of data.signals ?? []) {
          const pc = makePeer(sig.from);
          if (sig.kind === 'offer') {
            await pc.setRemoteDescription(JSON.parse(sig.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await post({ action: 'signal', to: sig.from, kind: 'answer', payload: JSON.stringify(answer) });
          } else if (sig.kind === 'answer') {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(JSON.parse(sig.payload));
            }
          } else if (sig.kind === 'ice') {
            try {
              await pc.addIceCandidate(JSON.parse(sig.payload));
            } catch {
              /* candidate arrived before the description — the next one will land */
            }
          }
        }
      } catch {
        /* a dropped poll is not an error worth showing */
      }
    };

    tick();
    const t = setInterval(tick, 1800);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [channelId, makePeer, meId, muted, post]);

  useEffect(() => {
    return () => {
      if (inCallRef.current) {
        navigator.sendBeacon?.(
          '/api/huddle',
          new Blob([JSON.stringify({ channelId, action: 'leave' })], { type: 'application/json' }),
        );
      }
      tearDown();
    };
  }, [channelId, tearDown]);

  /* --------------------------------------------------------------- actions */

  async function join() {
    setError(null);
    setConnecting(true);
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      await post({ action: 'join' });
      inCallRef.current = true;
      setInCall(true);
    } catch {
      setError('No microphone, or permission was refused.');
    } finally {
      setConnecting(false);
    }
  }

  async function leave() {
    inCallRef.current = false;
    setInCall(false);
    await post({ action: 'leave' });
    tearDown();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    post({ action: 'heartbeat', muted: next });
  }

  const others = participants.filter((p) => p.userId !== meId);

  return (
    <div className="border-b border-line bg-paper px-5 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xs font-semibold uppercase tracking-label text-ink-faint">Huddle</span>

        {participants.length === 0 && !inCall && (
          <span className="text-[12.5px] text-ink-faint">No one is talking in #{channelName}</span>
        )}

        {participants.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {participants.map((p) => (
                <span key={p.userId} className={clsx('relative', p.muted && 'opacity-50')}>
                  <Avatar name={p.name} accent={p.accent} size={24} ring />
                </span>
              ))}
            </div>
            <span className="text-[12.5px] text-ink-muted">
              {participants.length === 1 && participants[0].userId === meId
                ? 'You are in — waiting for others'
                : `${participants.length} in the huddle`}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {inCall && (
            <button
              onClick={toggleMute}
              className={clsx(
                'btn btn-sm border',
                muted
                  ? 'border-brick bg-brick-100 text-brick'
                  : 'border-line-strong bg-white text-ink-muted hover:border-navy hover:text-ink',
              )}
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
          )}

          {inCall ? (
            <button onClick={leave} className="btn btn-sm bg-brick text-white hover:bg-brick/90">
              Leave
            </button>
          ) : (
            <button onClick={join} disabled={connecting} className="btn-primary btn-sm">
              {connecting ? 'Connecting…' : participants.length ? 'Join huddle' : 'Start huddle'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-1.5 text-[12px] font-medium text-brick">{error}</p>}

      {inCall && others.length === 0 && (
        <p className="mt-1.5 text-[12px] text-ink-faint">
          You are the only one here. Anyone in #{channelName} can join from this bar.
        </p>
      )}
    </div>
  );
}
