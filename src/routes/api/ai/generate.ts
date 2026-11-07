import { createFileRoute } from '@tanstack/react-router';
import {
  accessHash,
  canReadGeneration,
  newGenerationAccess,
} from '@/server/generation-access';
import {
  generationStatus,
  processGeneration,
} from '@/server/generation-processing';

import {
  EVO_ASPECTS,
  EVO_MODELS,
  evoCostCredits,
  evoCreateTask,
  evoDuration,
  evoQuality,
} from '@/core/ai/evolink';
import { getAuth, getEmailProvider } from '@/core/auth';
import { worksBucket } from '@/core/storage/works';
import {
  AITaskStatus,
  attachTaskInfo,
  createTask,
  findTask,
  updateTask,
} from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { generationDelivery } from '@/lib/generation-delivery';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';
import { getLocale } from '@/paraglide/runtime.js';

/**
 * Landing-page generator backed by EvoLink. Generation is a paid feature:
 * every call requires a signed-in user and consumes credits (see the
 * verified upstream rates in the EvoLink catalog). New users start with 0 credits,
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
    if (emailRaw && (emailRaw.length > 200 || !EMAIL_RE.test(emailRaw)))
      return respErr('Please enter a valid email address');
    const anonymous = session.user.isAnonymous === true;
    const email = anonymous ? emailRaw : '';
    const delivery = generationDelivery(anonymous, email);
    const allConfigs = await getAllConfigs();
    if (delivery !== 'temporary' && !worksBucket())
      return respErr(
        'Saving creations is temporarily unavailable. Please try again later.'
      );
    if (delivery === 'email' && !getEmailProvider(allConfigs))
      return respErr(
        'Email delivery is temporarily unavailable. Clear the email to download on this page, or try again later.'
      );
    const access = anonymous ? newGenerationAccess() : '';

    // Look the model up in the server catalog; never trust the client string
    // (the price comes with it, not from the request).
    const entry = Object.hasOwn(EVO_MODELS, String(body.model))
      ? EVO_MODELS[String(body.model)]
      : undefined;
    if (!entry) return respErr('Unknown model');

    const aspect = EVO_ASPECTS.includes(String(body.aspect))
      ? String(body.aspect)
      : '16:9';
    const quality = evoQuality(entry, String(body.quality));
    const fast = body.fast === true;
    let duration: number | undefined;
    try {
      duration = evoDuration(entry, body.duration);
    } catch (error) {
      return respJson(400, (error as Error).message, undefined, {
        status: 400,
      });
    }

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
        costCredits: evoCostCredits(entry, quality, fast, duration),
        scene: 'generation_delivery_pending',
        options: {
          duration,
          quality,
          aspect,
          fast,
          delivery,
          email: email || undefined,
          locale: getLocale(),
          accessHash: access ? accessHash(access) : undefined,
        },
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
        duration,
      });
      await attachTaskInfo(task.id, { evoTaskId: evoTask.taskId });
    } catch (error: any) {
      await updateTask({
        taskId: task.id,
        status: AITaskStatus.FAILED,
      }).catch(() => {});
      return respErr('Failed to create generation task. Please try again.');
    }

    return respData({ taskId: task.id, access, delivery });
  } catch (error: any) {
    return respErr('Failed to create generation task. Please try again.');
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
    const access = new URL(request.url).searchParams.get('access') || '';
    if (!task || !canReadGeneration(task, session, access))
      return respJson(404, 'Task not found', undefined, { status: 404 });
    await processGeneration(task.id);
    const current = await findTask(task.id);
    return respData(generationStatus(current!, access), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error: any) {
    return respErr('Failed to query generation task. Retrying shortly.');
  }
}

export const Route = createFileRoute('/api/ai/generate')({
  server: { handlers: { GET, POST } },
});
