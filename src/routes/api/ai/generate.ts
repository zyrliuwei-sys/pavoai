import { createFileRoute } from '@tanstack/react-router';

import {
  EVO_ASPECTS,
  EVO_MODELS,
  evoCreateTask,
  evoQueryTask,
} from '@/core/ai/evolink';
import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

/**
 * Public landing-page generator backed by EvoLink. Visitors aren't charged
 * credits, so every guard here exists to cap abuse: IP + user rate limits,
 * a fixed model catalog, and bounded prompt/aspect/quality values.
 */

const PROMPT_MAX = 2000;
const TASK_ID_MAX = 128;
/** Real money per call — keep this tight. */
const CREATE_INTERVAL_MS = 30_000;
/** Poll cadence the client uses is ~2.5s; allow a slightly faster one. */
const POLL_INTERVAL_MS = 1_000;

async function readEvoConfigs() {
  const configs = await getAllConfigs();
  return {
    apiKey: configs.evolink_api_key || '',
    baseUrl: configs.evolink_base_url || 'https://api.evolink.ai/v1',
  };
}

function clientIp(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

async function POST({ request }: { request: Request }) {
  try {
    // IP first, then per-user once authenticated (never cookies).
    const ipLimited = enforceMinIntervalRateLimit(request, {
      keyPrefix: 'ai-gen-ip',
      intervalMs: CREATE_INTERVAL_MS,
    });
    if (ipLimited) return ipLimited;

    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user) {
      const userLimited = enforceMinIntervalRateLimit(request, {
        keyPrefix: 'ai-gen-user',
        intervalMs: CREATE_INTERVAL_MS,
        extraKey: session.user.id,
      });
      if (userLimited) return userLimited;
    }

    const body = await request.json().catch(() => ({}));
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return respErr('Prompt is required');
    if (prompt.length > PROMPT_MAX)
      return respErr(`Prompt must be at most ${PROMPT_MAX} characters`);

    // Look the model up in the server catalog; never trust the client string.
    const entry = EVO_MODELS[String(body.model)];
    if (!entry) return respErr('Unknown model');

    const aspect = EVO_ASPECTS.includes(String(body.aspect))
      ? String(body.aspect)
      : '16:9';
    const quality = entry.qualities.includes(String(body.quality))
      ? String(body.quality)
      : entry.defaultQuality;

    const configs = await readEvoConfigs();
    if (!configs.apiKey) return respErr('EvoLink API key is not configured');

    const task = await evoCreateTask(configs, {
      model: entry,
      prompt,
      aspect,
      quality,
      fast: body.fast === true,
    });
    return respData(task);
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

    const taskId = new URL(request.url).searchParams.get('taskId') || '';
    if (!taskId || taskId.length > TASK_ID_MAX || !/^[\w-]+$/.test(taskId))
      return respErr('Invalid taskId');

    const configs = await readEvoConfigs();
    if (!configs.apiKey) return respErr('EvoLink API key is not configured');

    const task = await evoQueryTask(configs, taskId);
    return respData({
      status: task.status,
      progress: task.progress,
      url: task.urls[0] || '',
      error: task.error || '',
    });
  } catch (error: any) {
    return respErr(error?.message || 'Failed to query generation task');
  }
}

export const Route = createFileRoute('/api/ai/generate')({
  server: { handlers: { GET, POST } },
});
