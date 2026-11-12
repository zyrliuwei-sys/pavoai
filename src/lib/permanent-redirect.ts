import { permanentRedirectTarget } from '../config/permanent-redirects';

export function permanentRedirectResponse(request: Request): Response | null {
  const target = permanentRedirectTarget(new URL(request.url).pathname);
  if (!target) return null;

  return new Response(null, {
    status: 301,
    headers: { Location: target },
  });
}
