import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { EVO_MODELS } from '@/config/ai-pricing';
import { getWorks } from '@/modules/ai-tasks/service';
import {
  deliveryOptions,
  jsonObject,
  type WorkItem,
} from '@/lib/generation-delivery';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user || session.user.isAnonymous)
    return respErr('Please sign in to view your creations', { status: 401 });
  const raw = Number(new URL(request.url).searchParams.get('page') || 1);
  const page = Number.isSafeInteger(raw)
    ? Math.max(1, Math.min(10000, raw))
    : 1;
  const result = await getWorks(session.user.id, page);
  const items: WorkItem[] = result.items
    .filter((task: any) => deliveryOptions(task.options).delivery === 'account')
    .map((task: any) => {
      const info = jsonObject(task.taskInfo);
      const ready = task.status === 'success' && !!info.storageKey;
      return {
        id: task.id,
        prompt: task.prompt,
        mediaType: task.mediaType,
        model:
          Object.values(EVO_MODELS).find((model) => model.model === task.model)
            ?.label || task.model,
        status: task.status === 'success' && !ready ? 'saving' : task.status,
        createdAt: new Date(task.createdAt).toISOString(),
        downloadUrl: ready ? `/api/works/${task.id}/download` : null,
        previewUrl: ready ? `/api/works/${task.id}/download?inline=1` : null,
      };
    });
  return respData(
    { items, total: result.total },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

export const Route = createFileRoute('/api/works/')({
  server: { handlers: { GET } },
});
