/**
 * EvoLink provider — https://evolink.ai/
 *
 * One unified async task API for every model:
 *   POST {base}/v1/images/generations  |  POST {base}/v1/videos/generations
 *   GET  {base}/v1/tasks/{task_id}
 * Auth is a single Bearer key (admin Settings → AI → EvoLink).
 */

export interface EvoConfigs {
  baseUrl: string;
  apiKey: string;
}

export interface EvoModel {
  /** Decides the endpoint and the result player. */
  kind: 'image' | 'video';
  /** Model string sent to EvoLink. */
  model: string;
  /** Fast lane: a separate model id (Seedance) or prompt_priority (Seedream). */
  fastModel?: string;
  fastPromptPriority?: boolean;
  /** Quality chips the upstream accepts; others fall back to the default. */
  qualities: string[];
  defaultQuality: string;
  /**
   * Credits charged per generation, keyed by quality chip — the pricing knob
   * for the paid generator (server-side only; the client never sends a price).
   */
  costCredits: Record<string, number>;
}

/**
 * Server-side catalog — the only models the public generator may request.
 * The API route validates against this map; never trust a model string
 * from the client.
 */
export const EVO_MODELS: Record<string, EvoModel> = {
  'nano-banana-2': {
    kind: 'image',
    model: 'gemini-3.1-flash-image-preview',
    qualities: ['1K', '2K', '4K'],
    defaultQuality: '2K',
    costCredits: { '1K': 50, '2K': 80, '4K': 150 },
  },
  'seedream-4': {
    kind: 'image',
    model: 'doubao-seedream-4.0',
    fastPromptPriority: true,
    qualities: ['1K', '2K', '4K'],
    defaultQuality: '2K',
    costCredits: { '1K': 40, '2K': 60, '4K': 120 },
  },
  'wan-2-7': {
    kind: 'video',
    model: 'wan2.7-text-to-video',
    qualities: ['720p', '1080p'],
    defaultQuality: '720p',
    costCredits: { '720p': 400, '1080p': 600 },
  },
  'seedance-2-0': {
    kind: 'video',
    model: 'seedance-2.0-text-to-video',
    fastModel: 'seedance-2.0-fast-text-to-video',
    qualities: ['720p', '1080p'],
    defaultQuality: '720p',
    costCredits: { '720p': 500, '1080p': 800 },
  },
};

/** Credits for one generation on this model at this quality chip. */
export function evoCostCredits(model: EvoModel, quality: string): number {
  return (
    model.costCredits[quality] ?? model.costCredits[model.defaultQuality] ?? 0
  );
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

  let url: string;
  let body: Record<string, unknown>;
  if (model.kind === 'image') {
    url = `${base}/v1/images/generations`;
    body = {
      model: model.model,
      prompt: input.prompt,
      size: input.aspect,
      quality: input.quality,
    };
    if (fast && model.fastPromptPriority) body.prompt_priority = 'fast';
  } else {
    url = `${base}/v1/videos/generations`;
    body = {
      model: fast && model.fastModel ? model.fastModel : model.model,
      prompt: input.prompt,
      aspect_ratio: input.aspect,
      quality: input.quality,
      duration: 5,
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
