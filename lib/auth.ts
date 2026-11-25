import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { db } from './db';

const COOKIE = 'discover_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const raw = process.env.SESSION_SECRET || 'discover-os-development-secret-change-me';
  return new TextEncoder().encode(raw.padEnd(32, '.'));
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
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

export async function sessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload.uid as string) ?? null;
  } catch {
    return null;
  }
}

export type SessionUser = Awaited<ReturnType<typeof loadUser>>;

async function loadUser(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      role: { include: { permissions: true } },
      memberships: { include: { workstream: true } },
    },
  });
  if (!user || !user.isActive) return null;
  return user;
}

export async function currentUser() {
  const id = await sessionUserId();
  if (!id) return null;
  return loadUser(id);
}

export async function signIn(email: string, password: string, door?: 'board' | 'volunteer') {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { role: true },
  });
  if (!user || !user.isActive) return { ok: false as const, error: 'No active account with that email.' };
  const good = await verifyPassword(password, user.passwordHash);
  if (!good) return { ok: false as const, error: 'That password is not right.' };

  // The door is part of the sign-in, so a wrong door is a clear message rather
  // than a silent redirect to the wrong half of the system.
  if (door) {
    const isVolunteer = user.role.key === 'volunteer';
    if (door === 'volunteer' && !isVolunteer) {
      return { ok: false as const, error: 'That account signs in under Board & officers.' };
    }
    if (door === 'board' && isVolunteer) {
      return { ok: false as const, error: 'That account signs in under Volunteers.' };
    }
  }
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  return { ok: true as const, user };
}
