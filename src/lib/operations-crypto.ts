import { createHash } from 'node:crypto';

export function operationsHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
