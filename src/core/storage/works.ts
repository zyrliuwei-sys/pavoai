/** Private generation files. Bind WORKS_BUCKET to an R2 bucket; never expose it publicly. */
type WorkBucket = {
  put(
    key: string,
    body: ReadableStream | Uint8Array,
    options: { httpMetadata: { contentType: string } }
  ): Promise<unknown>;
  get(
    key: string,
    options?: { range: Headers }
  ): Promise<{
    body: ReadableStream;
    size: number;
    httpMetadata?: { contentType?: string };
    range?: { offset: number; length: number };
  } | null>;
};

export function worksBucket(): WorkBucket | null {
  const g = globalThis as any;
  return (g.__CF_ENV__ ?? g.__env__)?.WORKS_BUCKET ?? null;
}

/** Only call with a URL returned by our authenticated provider query, never a request URL. */
export function providerMediaUrl(raw: string): URL {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !host.includes('.') ||
    /^[\d.]+$/.test(host) ||
    host.includes(':') ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)
  ) {
    throw new Error('Invalid provider media URL');
  }
  return url;
}

export async function fetchProviderMedia(
  url: string,
  mediaType: string,
  range?: string | null
) {
  const response = await fetch(providerMediaUrl(url), {
    redirect: 'error',
    signal: AbortSignal.timeout(120_000),
    headers: {
      'Accept-Encoding': 'identity',
      ...(range ? { Range: range } : {}),
    },
  });
  const contentType = (response.headers.get('content-type') || '').split(
    ';'
  )[0];
  const permitted =
    mediaType === 'video'
      ? ['video/mp4', 'video/webm']
      : ['image/png', 'image/jpeg', 'image/webp'];
  if (!response.ok || !response.body || !permitted.includes(contentType)) {
    await response.body?.cancel();
    throw new Error('Generated media is not available yet');
  }
  if (Number(response.headers.get('content-length') || 0) > 200 * 1024 * 1024) {
    await response.body.cancel();
    throw new Error('Generated media exceeds the storage limit');
  }
  return { response, contentType };
}

export async function storeWork(
  taskId: string,
  url: string,
  mediaType: string
) {
  const bucket = worksBucket();
  if (!bucket) throw new Error('Work storage is not configured');
  const key = `generations/${taskId}`;
  const { response, contentType } = await fetchProviderMedia(url, mediaType);
  const length = Number(response.headers.get('content-length') || 0);
  const FixedLength = (globalThis as any).FixedLengthStream;
  if (length > 0 && FixedLength) {
    // Preserve a known length for R2 without buffering a video in Worker memory.
    await bucket.put(key, response.body!.pipeThrough(new FixedLength(length)), {
      httpMetadata: { contentType },
    });
  } else {
    // Some CDNs omit Content-Length. Bound this fallback to keep Worker memory safe.
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32 * 1024 * 1024) {
        await reader.cancel();
        throw new Error('Media without a length exceeds the buffering limit');
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    await bucket.put(key, body, { httpMetadata: { contentType } });
  }
  return { storageKey: key, contentType };
}

export function mediaResponse(
  body: ReadableStream,
  contentType: string,
  taskId: string,
  inline: boolean,
  extra?: HeadersInit,
  status = 200
) {
  const extension =
    (
      {
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
      } as Record<string, string>
    )[contentType] || 'bin';
  const headers = new Headers(extra);
  headers.set('Content-Type', contentType);
  headers.set(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename="pavoai-${taskId}.${extension}"`
  );
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Accept-Ranges', 'bytes');
  return new Response(body, { status, headers });
}
