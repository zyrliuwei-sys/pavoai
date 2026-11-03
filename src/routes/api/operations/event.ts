import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { OPS_COOKIE, recordBrowserEvent } from '@/modules/operations/service';
import { getCookieFromHeader } from '@/lib/cookie';
import { operationsEventSchema } from '@/lib/operations';
import { readOperationsJson } from '@/lib/operations-request';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respErr, respOk } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return respErr('Same-origin request required', { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 512)
    return respErr('Request too large', { status: 413 });
  const parsed = z
    .object({ kind: operationsEventSchema })
    .strict()
    .safeParse(await readOperationsJson(request, 512));
  if (!parsed.success) return respErr('Invalid event', { status: 400 });
  const limited = enforceMinIntervalRateLimit(request, {
    keyPrefix: `ops-event:${parsed.data.kind}`,
    intervalMs: 200,
  });
  if (limited) return limited;
  const visitorId = getCookieFromHeader(
    request.headers.get('cookie'),
    OPS_COOKIE
  );
  if (!visitorId || !/^[\da-f-]{36}$/i.test(visitorId)) return respOk();
  const visitorLimited = enforceMinIntervalRateLimit(request, {
    keyPrefix: `ops-visitor:${parsed.data.kind}`,
    intervalMs: 1000,
    extraKey: visitorId,
  });
  if (visitorLimited) return visitorLimited;
  try {
    await recordBrowserEvent(visitorId, parsed.data.kind);
  } catch {
    /* Analytics never blocks a product action. */
  }
  return respOk();
}
export const Route = createFileRoute('/api/operations/event')({
  server: { handlers: { POST } },
});
