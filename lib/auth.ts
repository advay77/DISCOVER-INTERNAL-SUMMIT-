import 'server-only';
import { cookies, headers } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { rateLimit, resetLimit, sweepLimits, clientKey, LIMITS } from './ratelimit';

const COOKIE = 'discover_session';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days
const BCRYPT_ROUNDS = 12;

/**
 * The signing key.
 *
 * A weak or missing SESSION_SECRET means anyone can mint a session cookie, so
 * production refuses to start without a real one rather than quietly using a
 * default.
 */
function secret() {
  const raw = process.env.SESSION_SECRET ?? '';

  if (process.env.NODE_ENV === 'production' && raw.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or too short. Set a random value of at least 32 characters.',
    );
  }

  const key = raw || 'discover-os-development-only-secret-not-for-production';
  return new TextEncoder().encode(key.padEnd(32, '.'));
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string, epoch: number) {
  const token = await new SignJWT({ uid: userId, epoch })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function readToken(): Promise<{ uid: string; epoch: number } | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    const uid = payload.uid;
    if (typeof uid !== 'string') return null;
    return { uid, epoch: typeof payload.epoch === 'number' ? payload.epoch : 0 };
  } catch {
    return null;
  }
}

export type SessionUser = Awaited<ReturnType<typeof loadUser>>;

async function loadUser(id: string, epoch: number) {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      role: { include: { permissions: true } },
      memberships: { include: { workstream: true } },
    },
  });

  if (!user || !user.isActive) return null;

  // Deactivating someone, or changing their password, bumps sessionEpoch and
  // every cookie issued before that stops working immediately.
  if (user.sessionEpoch !== epoch) return null;

  return user;
}

export async function currentUser() {
  const token = await readToken();
  if (!token) return null;
  return loadUser(token.uid, token.epoch);
}

export async function signIn(email: string, password: string, door?: 'board' | 'volunteer') {
  const clean = email.toLowerCase().trim().slice(0, 200);

  // Guard the address first, so guessing is slow regardless of the account.
  const head = await headers();
  const [byIp, byAccount] = await Promise.all([
    rateLimit(clientKey(head, 'login'), LIMITS.login.limit, LIMITS.login.windowMs),
    rateLimit(`login:acct:${clean}`, LIMITS.login.limit, LIMITS.login.windowMs),
  ]);

  if (!byIp.ok || !byAccount.ok) {
    const wait = Math.max(byIp.retryAfterSeconds, byAccount.retryAfterSeconds);
    return {
      ok: false as const,
      error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute${wait > 60 ? 's' : ''}.`,
    };
  }

  const user = await db.user.findUnique({ where: { email: clean }, include: { role: true } });

  // One message for both failures, so the form cannot be used to discover which
  // addresses have accounts. The hash still runs when there is no user, so the
  // two paths take the same time.
  const WRONG = { ok: false as const, error: 'That email and password do not match an account.' };
  const DUMMY = '$2a$12$abcdefghijklmnopqrstuv0123456789012345678901234567890ab';

  if (!user || !user.isActive) {
    await verifyPassword(password, DUMMY).catch(() => false);
    return WRONG;
  }

  const good = await verifyPassword(password, user.passwordHash);
  if (!good) return WRONG;

  if (door) {
    const isVolunteer = user.role.key === 'volunteer';
    if (door === 'volunteer' && !isVolunteer) {
      return { ok: false as const, error: 'That account signs in under Board & officers.' };
    }
    if (door === 'board' && isVolunteer) {
      return { ok: false as const, error: 'That account signs in under Volunteers.' };
    }
  }

  await resetLimit(`login:acct:${clean}`);
  await resetLimit(clientKey(head, 'login'));
  void sweepLimits();
  await createSession(user.id, user.sessionEpoch);
  await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });

  return { ok: true as const, user };
}
