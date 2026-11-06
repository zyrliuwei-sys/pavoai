import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { envConfigs } from '@/config';
import { deliveryOptions } from '@/lib/generation-delivery';

export const newGenerationAccess = () => randomBytes(32).toString('hex');
export const accessHash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function emailDownloadToken(taskId: string) {
  if (!envConfigs.auth_secret) throw new Error('Auth secret is not configured');
  return createHmac('sha256', envConfigs.auth_secret)
    .update(`generation-email:${taskId}`)
    .digest('hex');
}
export function canReadGeneration(
  task: { id: string; userId: string; options: unknown },
  session: { user: { id: string; isAnonymous?: boolean | null } } | null,
  token = '',
  emailToken = ''
) {
  const options = deliveryOptions(task.options);
  if (
    options.delivery === 'email' &&
    emailToken &&
    equal(emailDownloadToken(task.id), emailToken)
  )
    return true;
  if (!session?.user || task.userId !== session.user.id) return false;
  if (options.delivery === 'account') return session.user.isAnonymous !== true;
  return (
    !!options.accessHash &&
    !!token &&
    equal(options.accessHash, accessHash(token))
  );
}
