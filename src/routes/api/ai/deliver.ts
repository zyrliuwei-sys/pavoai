import { createFileRoute } from '@tanstack/react-router';
import { canReadGeneration } from '@/server/generation-access';
import { processGeneration } from '@/server/generation-processing';

import { getAuth } from '@/core/auth';
import { findTask } from '@/modules/ai-tasks/service';
import { deliveryOptions, jsonObject } from '@/lib/generation-delivery';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

// Compatibility/retry endpoint. The recipient is fixed when generation starts;
// a browser can never change it or ask us to send arbitrary result emails.
async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    keyPrefix: 'ai-deliver',
    intervalMs: 10_000,
  });
  if (limited) return limited;
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return respErr('Unauthorized', { status: 401 });
  const body = await request.json().catch(() => ({}));
  const task =
    typeof body.taskId === 'string' && /^[\w-]{1,64}$/.test(body.taskId)
      ? await findTask(body.taskId)
      : null;
  if (
    !task ||
    !canReadGeneration(
      task,
      session,
      typeof body.access === 'string' ? body.access : ''
    )
  )
    return respErr('Task not found', { status: 404 });
  if (deliveryOptions(task.options).delivery !== 'email')
    return respData({ sent: false });
  await processGeneration(task.id);
  const current = await findTask(task.id);
  return respData({ sent: !!jsonObject(current?.taskInfo).emailSentAt });
}
export const Route = createFileRoute('/api/ai/deliver')({
  server: { handlers: { POST } },
});
