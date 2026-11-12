/** Retired public URLs. Resolve these before rendering or locale negotiation. */
export const PERMANENT_REDIRECTS: Readonly<Record<string, string>> =
  Object.freeze({
    '/blog/pavo-ai-video-generator': '/',
    '/blog/pavo-ai-image-video-maker': '/',
    '/blog/pavo-ai-work': '/',
    '/blog/app-pavo-ai': '/',
    '/zh/blog/pavo-ai-video-generator': '/zh/',
    '/zh/blog/pavo-ai-image-video-maker': '/zh/',
    '/zh/blog/pavo-ai-work': '/zh/',
    '/zh/blog/app-pavo-ai': '/zh/',
  });

export function permanentRedirectTarget(pathname: string): string | undefined {
  return PERMANENT_REDIRECTS[pathname.replace(/\/+$/, '')];
}

/** Also exclude database copies from blog listings, sitemaps and text indexes. */
export function isRetiredBlogSlug(slug: string): boolean {
  return permanentRedirectTarget(`/blog/${slug}`) !== undefined;
}
