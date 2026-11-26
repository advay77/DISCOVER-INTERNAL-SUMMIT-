import 'server-only';
import { cache } from 'react';
import { db } from './db';

/** The current cycle's event, fetched once per request and shared by layout and page. */
export const currentEvent = cache(() => db.event.findFirst({ where: { isCurrent: true } }));
