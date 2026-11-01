import { createFileRoute } from '@tanstack/react-router';

import {
  EVO_ASPECTS,
  EVO_MODELS,
  evoCostCredits,
  evoCreateTask,
  evoQueryTask,
} from '@/core/ai/evolink';
import { getAuth } from '@/core/auth';
import {
  AITaskStatus,
  attachTaskInfo,
  createTask,
  findTask,
  updateTask,
} from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

/**
 * Landing-page generator backed by EvoLink. Generation is a paid feature:
 * every call requires a signed-in user and consumes credits (see the
 * costCredits map in the EvoLink catalog). New users start with 0 credits,
 * so they must buy a plan before generating. Credits are charged when the
 * task is created and auto-revoked if it fails.
 */

const PROMPT_MAX = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TASK_ID_MAX = 64;
const CREATE_INTERVAL_MS = 10_000;
const POLL_INTERVAL_MS = 1_000;

async function readEvoConfigs() {
  const configs = await getAllConfigs();
  return {
    apiKey: configs.evolink_api_key || '',
    baseUrl: configs.evolink_base_url || 'https://api.evolink.ai/v1',
  };
}

async function requireSession(request: Request) {
  const auth = getAuth();
  return auth.api.getSession({ headers: request.headers });
}

function parseTaskInfo(raw: unknown): Record<string, any> {
  if (typeof raw !== 'string' || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function POST({ request }: { request: Request }) {
  try {
    // IP first, then per-user once authenticated (never cookies).
    const ipLimited = enforceMinIntervalRateLimit(request, {
      keyPrefix: 'ai-gen-ip',
      intervalMs: CREATE_INTERVAL_MS,
    });
    if (ipLimited) return ipLimited;

    const session = await requireSession(request);
    if (!session?.user) return respJson(401, 'Please sign in to generate');
    const userId = session.user.id;

    const userLimited = enforceMinIntervalRateLimit(request, {
      keyPrefix: 'ai-gen-user',
      intervalMs: CREATE_INTERVAL_MS,
      extraKey: userId,
    });
    if (userLimited) return userLimited;

    const body = await request.json().catch(() => ({}));
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return respErr('Prompt is required');
    if (prompt.length > PROMPT_MAX)
      return respErr(`Prompt must be at most ${PROMPT_MAX} characters`);

    // Optional delivery address the visitor left in the paywall (optional
    // field; the finished media is mailed there once the task completes).
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
    const email =
      emailRaw.length <= 200 && EMAIL_RE.test(emailRaw) ? emailRaw : '';

    // Look the model up in the server catalog; never trust the client string
    // (the price comes with it, not from the request).
    const entry = EVO_MODELS[String(body.model)];
    if (!entry) return respErr('Unknown model');

    const aspect = EVO_ASPECTS.includes(String(body.aspect))
      ? String(body.aspect)
      : '16:9';
    const quality = entry.qualities.includes(String(body.quality))
      ? String(body.quality)
      : entry.defaultQuality;
    const fast = body.fast === true;

    const configs = await readEvoConfigs();
    if (!configs.apiKey) return respErr('EvoLink API key is not configured');

    // Charge credits (atomic with the task row); 0 balance → paywall answer.
    let task;
    try {
      task = await createTask({
        userId,
        mediaType: entry.kind,
        provider: 'evolink',
        model: entry.model,
        prompt,
        costCredits: evoCostCredits(entry, quality),
      });
    } catch (error: any) {
      if (String(error?.message || '').includes('Insufficient credits'))
        return respJson(402, 'Insufficient credits — top up to generate');
      throw error;
    }

    // Create the upstream task; on failure revoke the charge.
    try {
      const evoTask = await evoCreateTask(configs, {
        model: entry,
        prompt,
        aspect,
        quality,
        fast,
      });
      await attachTaskInfo(
        task.id,
        email
          ? { evoTaskId: evoTask.taskId, guestEmail: email }
          : { evoTaskId: evoTask.taskId }
      );
    } catch (error: any) {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
      }).catch(() => {});
      return respErr(error?.message || 'Failed to create generation task');
    }

    return respData({ taskId: task.id });
  } catch (error: any) {
    return respErr(error?.message || 'Failed to create generation task');
  }
}

async function GET({ request }: { request: Request }) {
  try {
    const limited = enforceMinIntervalRateLimit(request, {
      keyPrefix: 'ai-gen-poll',
      intervalMs: POLL_INTERVAL_MS,
    });
    if (limited) return limited;

    const session = await requireSession(request);
    if (!session?.user) return respJson(401, 'Please sign in to generate');

    const taskId = new URL(request.url).searchParams.get('taskId') || '';
    if (!taskId || taskId.length > TASK_ID_MAX || !/^[\w-]+$/.test(taskId))
      return respErr('Invalid taskId');

    const task = await findTask(taskId);
    if (!task || task.userId !== session.user.id)
      return respErr('Task not found');

    const { evoTaskId } = parseTaskInfo(task.taskInfo);
    if (!evoTaskId) return respErr('Task has no provider reference');

    const configs = await readEvoConfigs();
    if (!configs.apiKey) return respErr('EvoLink API key is not configured');

    const st = await evoQueryTask(configs, String(evoTaskId));

    if (st.status === 'completed') {
      const url = st.urls[0] || '';
      if (url) {
        await updateTask({
          taskId: task.id,
          status: AITaskStatus.SUCCESS,
          taskResult: { url, urls: st.urls },
        });
        return respData({
          status: 'completed',
          progress: 100,
          url,
          error: '',
        });
      }
      // Completed without a URL — treat as failure and revoke the charge.
      await updateTask({ taskId: task.id, status: AITaskStatus.FAILED });
      return respData({
        status: 'failed',
        progress: 100,
        url: '',
        error: 'Generation returned no result',
      });
    }

    if (st.status === 'failed') {
      await updateTask({ taskId: task.id, status: AITaskStatus.FAILED });
      return respData({
        status: 'failed',
        progress: 100,
        url: '',
        error: st.error || 'Generation failed',
      });
    }

    if (task.status === AITaskStatus.PENDING) {
      await updateTask({ taskId: task.id, status: AITaskStatus.PROCESSING });
    }
    return respData({
      status: st.status,
      progress: st.progress,
      url: '',
      error: '',
    });
  } catch (error: any) {
    return respErr(error?.message || 'Failed to query generation task');
  }
}

export const Route = createFileRoute('/api/ai/generate')({
  server: { handlers: { GET, POST } },
});
