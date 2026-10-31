import { apiGetText } from '@/lib/api-client';
import { INDEXNOW_KEY_PATTERN, MAX_INDEXNOW_URLS } from '@/lib/indexnow';

/** Read via the browser: Workers cannot fetch their own custom domain. */
export async function checkIndexNowKeyFile(key: string) {
  if (!INDEXNOW_KEY_PATTERN.test(key)) throw new Error('Invalid IndexNow key');
  const response = await apiGetText(`/${key}.txt`);
  return {
    ok: response.ok && response.text.trim() === key,
    status: response.status,
  };
}

/** Follow bounded, same-site sitemap indexes; preserve localized URLs and queries. */
export async function readIndexNowSitemap(origin: string): Promise<string[]> {
  const expectedOrigin = new URL(origin).origin;
  const visited = new Set<string>();
  const urls = new Set<string>();

  async function read(path: string, depth: number): Promise<void> {
    if (visited.has(path)) return;
    if (depth > 3 || visited.size >= 20)
      throw new Error('Sitemap index is too large');
    visited.add(path);
    const response = await apiGetText(path);
    if (!response.ok)
      throw new Error(`Sitemap returned HTTP ${response.status}`);
    const doc = new DOMParser().parseFromString(
      response.text,
      'application/xml'
    );
    if (doc.getElementsByTagName('parsererror').length)
      throw new Error('Invalid sitemap XML');
    const root = doc.documentElement.localName;
    if (root !== 'sitemapindex' && root !== 'urlset')
      throw new Error('Invalid sitemap XML');
    const locations = [...doc.getElementsByTagNameNS('*', 'loc')]
      .map((element) => element.textContent?.trim() ?? '')
      .filter(Boolean);
    for (const location of locations) {
      const url = new URL(location, expectedOrigin);
      if (url.origin !== expectedOrigin || url.username || url.password) {
        throw new Error('Sitemap URLs must belong to this site');
      }
      if (root === 'sitemapindex') {
        await read(url.pathname + url.search, depth + 1);
      } else {
        urls.add(url.href);
        if (urls.size > MAX_INDEXNOW_URLS)
          throw new Error(`Submit at most ${MAX_INDEXNOW_URLS} URLs at a time`);
      }
    }
  }
  await read('/sitemap.xml', 0);
  return [...urls];
}
