import 'server-only';
import { createHmac } from 'node:crypto';

/**
 * Realtime "something changed" pings over Supabase Realtime Broadcast.
 *
 * Messages never travel over the socket. After a write, the server sends an
 * empty ping to a topic; browsers listening on that topic re-fetch through
 * /api/messages, which applies every permission check as usual. So the socket
 * carries nothing a reader could not already fetch.
 *
 * Topics are an HMAC of the conversation under SESSION_SECRET, so they cannot
 * be guessed from a channel id. The browser learns its topic from
 * /api/messages, which only answers people allowed to read the conversation.
 *
 * Needs, on the server: SUPABASE_URL and SUPABASE_SECRET_KEY (or
 * SUPABASE_SERVICE_ROLE_KEY). In the browser: NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY. Without them, chat falls back to polling.
 */

const URL_ = process.env.SUPABASE_URL ?? '';
const KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export type Scope = { channelId: string } | { entityType: string; entityId: string };

export function scopeKey(scope: Scope) {
  return 'channelId' in scope ? `c:${scope.channelId}` : `e:${scope.entityType}:${scope.entityId}`;
}

export function topicFor(scope: Scope) {
  const secret = process.env.SESSION_SECRET ?? '';
  const digest = createHmac('sha256', secret).update(scopeKey(scope)).digest('hex').slice(0, 32);
  return `discover-${digest}`;
}

/** Best effort: a failed ping only means readers find out on their next poll. */
export async function ping(scope: Scope) {
  if (!URL_ || !KEY) return;
  try {
    await fetch(`${URL_.replace(/\/$/, '')}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: KEY, authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ messages: [{ topic: topicFor(scope), event: 'changed', payload: {} }] }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    /* polling covers it */
  }
}

/**
 * A private video-call room for a conversation, on Jitsi Meet (free, runs in
 * the browser, nothing to install). The room name is an HMAC like the topic,
 * so only people who can see the conversation can find the link.
 */
export function callRoomFor(scope: Scope) {
  const secret = process.env.SESSION_SECRET ?? '';
  const digest = createHmac('sha256', secret).update(`call:${scopeKey(scope)}`).digest('hex').slice(0, 20);
  return `https://meet.jit.si/DISCOVER-${digest}`;
}
