/**
 * EvoLink provider — https://evolink.ai/
 *
 * One unified async task API for every model:
 *   POST {base}/v1/images/generations  |  POST {base}/v1/videos/generations
 *   GET  {base}/v1/tasks/{task_id}
 * Auth is a single Bearer key (admin Settings → AI → EvoLink).
 */

import {
  evoDuration,
  evoQuality,
  evoUsesFastModel,
  type EvoModel,
} from '@/config/ai-pricing';

export {
  EVO_MODELS,
  evoCostCredits,
  evoDuration,
  evoQuality,
  type EvoModel,
} from '@/config/ai-pricing';

export interface EvoConfigs {
  baseUrl: string;
  apiKey: string;
}

/** Aspect ratios every catalog model accepts (sent as `size`/`aspect_ratio`). */
export const EVO_ASPECTS = [
  '16:9',
  '9:16',
  '1:1',
  '4:3',
  '3:4',
  '3:2',
  '2:3',
  '21:9',
];

export interface EvoCreateInput {
  model: EvoModel;
  prompt: string;
  aspect: string;
  quality: string;
  fast: boolean;
  duration?: number;
}

export interface EvoTask {
  taskId: string;
}

export interface EvoTaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  urls: string[];
  error?: string;
}

/** Accept bases with or without a trailing `/v1`. */
function normalizeBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '').replace(/\/v1$/, '');
}

function headers(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

export async function evoCreateTask(
  configs: EvoConfigs,
  input: EvoCreateInput
): Promise<EvoTask> {
  const base = normalizeBase(configs.baseUrl || 'https://api.evolink.ai');
  const { model } = input;
  const fast = input.fast;
  const quality = evoQuality(model, input.quality);

  let url: string;
  let body: Record<string, unknown>;
  if (model.kind === 'image') {
    url = `${base}/v1/images/generations`;
    body = {
      model: model.model,
      prompt: input.prompt,
      size: input.aspect,
      quality,
      n: 1,
    };
    if (fast && model.fastPromptPriority) body.prompt_priority = 'fast';
  } else {
    url = `${base}/v1/videos/generations`;
    body = {
      model: evoUsesFastModel(model, quality, fast)
        ? model.fastModel
        : model.model,
      prompt: input.prompt,
      aspect_ratio: input.aspect,
      quality,
      duration: evoDuration(model, input.duration),
    };
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: headers(configs.apiKey),
    body: JSON.stringify(body),
  });

  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.id) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `EvoLink request failed (${resp.status})`
    );
  }
  return { taskId: String(data.id) };
}

export async function evoQueryTask(
  configs: EvoConfigs,
  taskId: string
): Promise<EvoTaskStatus> {
  const base = normalizeBase(configs.baseUrl || 'https://api.evolink.ai');
  const resp = await fetch(`${base}/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: headers(configs.apiKey),
  });

  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `EvoLink query failed (${resp.status})`
    );
  }

  const status = String(data?.status || 'pending') as EvoTaskStatus['status'];
  const urls: string[] = Array.isArray(data?.results)
    ? data.results.filter(
        (u: unknown) =>
          typeof u === 'string' && /^https?:\/\//.test(u as string)
      )
    : [];

  return {
    status:
      status === 'completed' || status === 'processing' || status === 'failed'
        ? status
        : 'pending',
    progress: Math.max(0, Math.min(100, Number(data?.progress) || 0)),
    urls,
    error: data?.error?.message || data?.error_message || undefined,
  };
}
