import 'server-only';
import { db } from './db';

/**
 * Rate limiting, held in the database.
 *
 * An in-memory counter is worthless on a serverless host: each request can
 * land on a fresh instance with an empty map, so the limit never bites. The
 * counters therefore live in a table, which every instance shares.
 *
 * Fixed window, one row per key. Two simultaneous requests can both read the
 * same count and each write count+1 rather than count+2 — a race worth one
 * extra attempt, which does not matter for what this defends against.
 */

export type RateVerdict = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateVerdict> {
  const now = new Date();

  try {
    const existing = await db.rateCounter.findUnique({ where: { key } });

    if (!existing || existing.resetAt <= now) {
      const resetAt = new Date(now.getTime() + windowMs);
      await db.rateCounter.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    const next = existing.count + 1;
    await db.rateCounter.update({ where: { key }, data: { count: next } });

    if (next > limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000)),
      };
    }

    return { ok: true, remaining: limit - next, retryAfterSeconds: 0 };
  } catch {
    // A limiter that cannot read its table must not lock everybody out.
    return { ok: true, remaining: limit, retryAfterSeconds: 0 };
  }
}

/** Clears a bucket — used after a successful sign-in. */
export async function resetLimit(key: string) {
  await db.rateCounter.deleteMany({ where: { key } }).catch(() => {});
}

/** Removes expired rows. Cheap, and called on sign-in so it never needs a job. */
export async function sweepLimits() {
  await db.rateCounter.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => {});
}

/**
 * Best-effort client address. Vercel sets x-forwarded-for; a missing header
 * falls back to a shared bucket, which is deliberately conservative.
 */
export function clientKey(headers: Headers, prefix: string) {
  const forwarded = headers.get('x-forwarded-for') ?? '';
  const ip = forwarded.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
  return `${prefix}:${ip}`;
}

export const LIMITS = {
  /** Sign-in attempts, per address and per account. */
  login: { limit: 8, windowMs: 10 * 60_000 },
  /** Messages per person, so one tab cannot flood a channel. */
  message: { limit: 40, windowMs: 60_000 },
  /** Uploads per person. */
  upload: { limit: 20, windowMs: 60_000 },
  /** Channel creation per person. */
  channel: { limit: 10, windowMs: 60_000 },
} as const;
