import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Demo mode.
 *
 * When the deploy has no Postgres yet, the build ships a seeded SQLite file
 * and the app copies it into /tmp — the only writable place on a serverless
 * host — so the whole product works, writes included. The copy resets when the
 * instance recycles, which is exactly what a demo wants.
 *
 * Set DATABASE_URL to a Postgres URL and none of this runs.
 */
export const IS_DEMO = !!process.env.DATABASE_URL?.startsWith('file:') && !!process.env.VERCEL;

function demoUrl() {
  const source = path.join(process.cwd(), 'prisma', 'demo.db');
  const target = '/tmp/discover-demo.db';
  try {
    if (!fs.existsSync(target) && fs.existsSync(source)) fs.copyFileSync(source, target);
  } catch {
    /* fall through to the bundled read-only copy */
  }
  return `file:${fs.existsSync(target) ? target : source}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create() {
  const log: ('warn' | 'error')[] = process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];
  if (IS_DEMO) {
    return new PrismaClient({ log, datasources: { db: { url: demoUrl() } } });
  }
  return new PrismaClient({ log });
}

export const db = globalForPrisma.prisma ?? create();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
