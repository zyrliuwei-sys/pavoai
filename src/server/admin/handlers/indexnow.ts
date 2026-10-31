import {
  getIndexNowKey,
  IndexNowInputError,
  isPublicSite,
  keyFileUrl,
  saveIndexNowKey,
  siteOrigin,
  submitUrls,
} from '@/modules/indexnow/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

import type { AdminHandlerContext } from '../types';

async function status() {
  const key = await getIndexNowKey();
  return {
    key,
    keyFileUrl: key ? keyFileUrl(key) : null,
    origin: siteOrigin(),
    publicSite: isPublicSite(),
  };
}

function limit({ request, actor }: AdminHandlerContext) {
  return enforceMinIntervalRateLimit(request, {
    intervalMs: request.method === 'POST' ? 10_000 : 300,
    keyPrefix: 'indexnow-user',
    extraKey: actor.userId,
  });
}

export async function GET(context: AdminHandlerContext) {
  const limited = limit(context);
  if (limited) return limited;
  return respData(await status());
}

export async function PUT(context: AdminHandlerContext) {
  const limited = limit(context);
  if (limited) return limited;
  const { key } = await context.request.json();
  await saveIndexNowKey(key);
  return respData(await status());
}

export async function POST(context: AdminHandlerContext) {
  const limited = limit(context);
  if (limited) return limited;
  const key = await getIndexNowKey();
  if (!key) return respErr('Save an IndexNow key first', { status: 400 });
  const { urls } = await context.request.json();
  try {
    return respData(await submitUrls(key, urls));
  } catch (error) {
    if (error instanceof IndexNowInputError)
      return respErr(error.message, { status: 400 });
    throw error;
  }
}
