'use client';

import { useState } from 'react';

/**
 * Starts (or joins) the conversation's call: tells the channel, then opens the
 * room in a new tab. Anyone can join from the link in the message.
 */
export function CallButton({ channelId, url }: { channelId: string; url: string }) {
  const [busy, setBusy] = useState(false);

  async function start() {
    // Open first, so the popup is tied to the click and not blocked. (With
    // 'noopener' window.open always returns null, so cut the opener by hand.)
    const win = window.open(url, '_blank');
    if (win) win.opener = null;
    setBusy(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channelId, body: `📞 Started a call — join here: ${url}` }),
      });
    } finally {
      setBusy(false);
    }
    // Popup blocked: the link is in the channel now, one tap away.
  }

  return (
    <button type="button" onClick={start} disabled={busy} className="btn-ghost btn-sm" title="Start a video call for this channel">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="m16 10 6-3v10l-6-3" />
      </svg>
      <span className="hidden sm:inline">Start call</span>
    </button>
  );
}
