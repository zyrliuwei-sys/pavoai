import { createFileRoute } from '@tanstack/react-router';
import { canReadGeneration } from '@/server/generation-access';

import { getAuth } from '@/core/auth';
import {
  fetchProviderMedia,
  mediaResponse,
  worksBucket,
} from '@/core/storage/works';
import { findTask } from '@/modules/ai-tasks/service';
import { taskResultUrl } from '@/lib/ai-task-result';
import { deliveryOptions, jsonObject } from '@/lib/generation-delivery';
import { respErr } from '@/lib/resp';

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const url = new URL(request.url);
  const task = /^[\w-]{1,64}$/.test(params.id)
    ? await findTask(params.id)
    : null;
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (
    !task ||
    !canReadGeneration(
      task,
      session,
      url.searchParams.get('access') || '',
      url.searchParams.get('mail') || ''
    )
  )
    return respErr('Creation not found', { status: 404 });
  if (task.status !== 'success')
    return respErr('Creation is not ready', { status: 409 });
  const info = jsonObject(task.taskInfo);
  const inline = url.searchParams.get('inline') === '1';
  if (deliveryOptions(task.options).delivery !== 'temporary') {
    if (!info.storageKey)
      return respErr('Creation is still being saved', { status: 409 });
    const bucket = worksBucket();
    if (!bucket)
      return respErr('Download is temporarily unavailable', { status: 503 });
    const rangeHeader = request.headers.get('range');
    if (rangeHeader && !/^bytes=(?:\d+-\d*|-\d+)$/.test(rangeHeader))
      return respErr('Invalid range', { status: 416 });
    let object;
    try {
      object = await bucket.get(
        info.storageKey,
        rangeHeader ? { range: request.headers } : undefined
      );
    } catch {
      return respErr('Download is unavailable', {
        status: rangeHeader ? 416 : 503,
      });
    }
    if (!object) return respErr('Creation not found', { status: 404 });
    const range = rangeHeader ? object.range : undefined;
    const headers = new Headers();
    headers.set('Content-Length', String(range?.length ?? object.size));
    if (range)
      headers.set(
        'Content-Range',
        `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`
      );
    return mediaResponse(
      object.body,
      object.httpMetadata?.contentType || info.contentType,
      task.id,
      inline,
      headers,
      range ? 206 : 200
    );
  }
  try {
    const { response, contentType } = await fetchProviderMedia(
      taskResultUrl(task.taskResult),
      task.mediaType,
      request.headers.get('range')
    );
    const headers = new Headers();
    for (const name of ['Content-Length', 'Content-Range']) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return mediaResponse(
      response.body!,
      contentType,
      task.id,
      inline,
      headers,
      response.status
    );
  } catch {
    return respErr('Download is no longer available', { status: 410 });
  }
}

export const Route = createFileRoute('/api/works/$id/download')({
  server: { handlers: { GET } },
});
