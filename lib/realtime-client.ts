'use client';

/**
 * Browser side of the realtime pings (see lib/realtime.ts).
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY at build
 * time. Without them `subscribe` does nothing and the chat keeps polling.
 * The Supabase client is loaded only when realtime is configured.
 */

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

type Client = import('@supabase/supabase-js').SupabaseClient;
let client: Promise<Client> | null = null;

function getClient() {
  if (!client) {
    client = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } }),
    );
  }
  return client;
}

export const REALTIME_CONFIGURED = !!URL_ && !!KEY;

/**
 * Calls `onChange` whenever the server pings `topic`. `onStatus(true)` once the
 * socket is joined, `onStatus(false)` if it drops. Returns an unsubscribe.
 */
export function subscribe(topic: string, onChange: () => void, onStatus: (live: boolean) => void) {
  if (!REALTIME_CONFIGURED) return () => {};
  let closed = false;
  let channel: ReturnType<Client['channel']> | null = null;
  // Coalesce bursts (a message plus its reaction) into one fetch.
  let pending: ReturnType<typeof setTimeout> | null = null;
  const fire = () => {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      onChange();
    }, 150);
  };

  getClient()
    .then((sb) => {
      if (closed) return;
      channel = sb
        .channel(topic, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'changed' }, fire)
        .subscribe((status) => onStatus(status === 'SUBSCRIBED'));
    })
    .catch(() => onStatus(false));

  return () => {
    closed = true;
    if (pending) clearTimeout(pending);
    if (channel) getClient().then((sb) => sb.removeChannel(channel!));
  };
}
