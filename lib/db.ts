import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Demo mode.
 *
 * When a deploy has no Postgres, the build ships a seeded SQLite file and the
 * app copies it into /tmp — the only writable place on a serverless host — so
 * the whole product works, writes included. The copy resets when the instance
 * recycles, which is what a demo wants.
 *
 * The decision is made from the connection string alone, and the demo path
 * always passes an explicit URL. It must never depend on DATABASE_URL being
 * present at runtime, because on a hosted demo it is not.
 */
const RAW_URL = process.env.DATABASE_URL ?? '';
const HAS_POSTGRES = RAW_URL.startsWith('postgres');

/**
 * A text filter that ignores letter case on both engines. SQLite's LIKE already
 * does; Postgres needs `mode: 'insensitive'`, which the SQLite client rejects.
 */
export function icontains(term: string): { contains: string } {
  return (HAS_POSTGRES ? { contains: term, mode: 'insensitive' } : { contains: term }) as { contains: string };
}

/** Hosted with no Postgres → demo. Local development is never demo. */
export const IS_DEMO = !HAS_POSTGRES && (!!process.env.VERCEL || RAW_URL === '');

function demoUrl() {
  const source = path.join(process.cwd(), 'prisma', 'demo.db');
  const target = '/tmp/discover-demo.db';
  try {
    if (!fs.existsSync(target) && fs.existsSync(source)) fs.copyFileSync(source, target);
    if (fs.existsSync(target)) return `file:${target}`;
  } catch {
    /* fall back to the bundled copy, which at least reads */
  }
  return `file:${source}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create() {
  const log: ('warn' | 'error')[] =
    process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];

  if (IS_DEMO) {
    const url = demoUrl();
    console.log(`[discover] demo database at ${url}`);
    return new PrismaClient({ log, datasources: { db: { url } } });
  }

  return new PrismaClient({ log });
}

export const db = globalForPrisma.prisma ?? create();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
