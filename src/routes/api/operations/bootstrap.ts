import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import { bootstrap, OPS_COOKIE } from '@/modules/operations/service';
import { hasPermission } from '@/modules/rbac/service';
import {
  getCookieFromHeader,
  getCountryFromCtx,
  sanitizeReferrer,
  sanitizeUtm,
} from '@/lib/cookie';
import { readOperationsJson } from '@/lib/operations-request';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    keyPrefix: 'ops-bootstrap',
    intervalMs: 200,
  });
  if (limited) return limited;
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin)
    return respErr('Same-origin request required', { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 2048)
    return respErr('Request too large', { status: 413 });
  const parsed = z
    .object({
      path: z.string().max(190).startsWith('/'),
      referrer: z.string().max(500).optional(),
      source: z.string().max(100).optional(),
    })
    .strict()
    .safeParse(await readOperationsJson(request, 2048));
  if (!parsed.success) return respErr('Invalid input', { status: 400 });
  const disabled = { enabled: false, defaultGroup: 'monthly' };
  try {
    const configs = await getAllConfigs();
    if (
      configs.cookie_consent_enabled === 'true' &&
      getCookieFromHeader(request.headers.get('cookie'), 'cookie_consent') !==
        'accepted'
    )
      return respData(disabled);
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    const staff =
      !!session?.user && (await hasPermission(session.user.id, 'admin.access'));
    const cookie = request.headers.get('cookie');
    const ref = sanitizeReferrer(parsed.data.referrer ?? '', [url.host]);
    const source =
      sanitizeUtm(
        parsed.data.source ||
          decodeURIComponent(getCookieFromHeader(cookie, 'utm_source') ?? '')
      ) || (ref ? new URL(ref).hostname : 'direct');
    const result = await bootstrap({
      visitorId: getCookieFromHeader(cookie, OPS_COOKIE),
      userId: session?.user.id,
      anonymous: (session?.user as { isAnonymous?: boolean } | undefined)
        ?.isAnonymous,
      staff,
      source,
      country: getCountryFromCtx({ request }),
      path: parsed.data.path.split(/[?#]/)[0],
    });
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    if (result.visitorId)
      headers.append(
        'Set-Cookie',
        `${OPS_COOKIE}=${result.visitorId}; Max-Age=31536000; Path=/; HttpOnly; SameSite=Lax${url.protocol === 'https:' ? '; Secure' : ''}`
      );
    return respData(result.result, { headers });
  } catch {
    return respData(disabled, { headers: { 'Cache-Control': 'no-store' } });
  }
}
export const Route = createFileRoute('/api/operations/bootstrap')({
  server: { handlers: { POST } },
});
