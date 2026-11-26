import 'server-only';
import { createHash } from 'node:crypto';

/**
 * Direct messages are channels of type "dm" with exactly two members. The key
 * is derived from the pair, so opening a conversation with someone always
 * lands in the same one, whoever starts it. It is hashed so the URL does not
 * carry anyone's id.
 */
export function dmKey(a: string, b: string) {
  const pair = [a, b].sort().join(':');
  return `dm-${createHash('sha256').update(pair).digest('hex').slice(0, 24)}`;
}
