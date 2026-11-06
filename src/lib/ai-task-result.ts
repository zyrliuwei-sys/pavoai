/** Drizzle stores taskResult as JSON text; callers may already have decoded it. */
export function taskResultUrl(value: unknown): string {
  try {
    const result = typeof value === 'string' ? JSON.parse(value) : value;
    if (!result || typeof result !== 'object') return '';
    const url =
      result.url || (Array.isArray(result.urls) ? result.urls[0] : '');
    if (typeof url !== 'string') return '';
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) ? url : '';
  } catch {
    return '';
  }
}
