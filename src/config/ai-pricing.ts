/**
 * Public, client-safe generation pricing. Verified against EvoLink's Chinese
 * model pages on 2026-11-02; see docs/research/evolink-pricing.md for sources.
 * USD micros avoid floating-point errors when rounding up to whole credits.
 */
export const AI_PRICE_MULTIPLIER = 8;
export const AI_CREDITS_PER_USD = 1000;
export const AI_VIDEO_DURATION_SECONDS = 5;

export function generationCredits(upstreamCostMicros: number): number {
  if (!Number.isSafeInteger(upstreamCostMicros) || upstreamCostMicros <= 0) {
    throw new Error('Invalid upstream generation cost');
  }
  return Math.ceil(
    (upstreamCostMicros * AI_PRICE_MULTIPLIER * AI_CREDITS_PER_USD) / 1_000_000
  );
}

export function purchasedCredits(priceInCents: number): number {
  if (!Number.isSafeInteger(priceInCents) || priceInCents < 0) {
    throw new Error('Invalid purchase amount');
  }
  return (priceInCents * AI_CREDITS_PER_USD) / 100;
}

export interface EvoModel {
  label: string;
  kind: 'image' | 'video';
  model: string;
  fastModel?: string;
  fastPromptPriority?: boolean;
  qualities: string[];
  defaultQuality: string;
  /** Integer seconds offered by Pavo (within provider limits, standard and Fast). */
  videoDuration?: { min: number; max: number; default: number };
  /** Upstream USD micros per image or per SECOND of video. */
  upstreamCostMicros: Record<string, number>;
  fastUpstreamCostMicros?: Record<string, number>;
}

export const EVO_MODELS: Record<string, EvoModel> = {
  'nano-banana-2': {
    label: 'Nano Banana 2',
    kind: 'image',
    model: 'gemini-3.1-flash-image-preview',
    qualities: ['1K', '2K', '4K'],
    defaultQuality: '2K',
    upstreamCostMicros: { '1K': 63_000, '2K': 94_000, '4K': 141_000 },
  },
  'seedream-4': {
    label: 'Seedream 4',
    kind: 'image',
    model: 'doubao-seedream-4.0',
    fastPromptPriority: true,
    qualities: ['1K', '2K', '4K'],
    defaultQuality: '2K',
    upstreamCostMicros: { '1K': 22_500, '2K': 22_500, '4K': 22_500 },
  },
  'wan-2-7': {
    label: 'Wan 2.7',
    kind: 'video',
    model: 'wan2.7-text-to-video',
    qualities: ['720p', '1080p'],
    defaultQuality: '720p',
    videoDuration: { min: 5, max: 15, default: AI_VIDEO_DURATION_SECONDS },
    upstreamCostMicros: {
      '720p': 80_000,
      '1080p': 120_000,
    },
  },
  'seedance-2-0': {
    label: 'Seedance 2.0',
    kind: 'video',
    model: 'seedance-2.0-text-to-video',
    fastModel: 'seedance-2.0-fast-text-to-video',
    qualities: ['720p', '1080p'],
    defaultQuality: '720p',
    videoDuration: { min: 5, max: 15, default: AI_VIDEO_DURATION_SECONDS },
    upstreamCostMicros: {
      '720p': 199_000,
      '1080p': 497_000,
    },
    // The website's 25% Fast promotion ended on 2026-10-06. Use the
    // regular $0.161/s rate; Fast does not accept 1080p.
    fastUpstreamCostMicros: { '720p': 161_000 },
  },
};

/** Undefined preserves the five-second default for older clients/drafts.
 * Explicit invalid values must fail before any charge or provider request. */
export function evoDuration(
  model: EvoModel,
  duration?: unknown
): number | undefined {
  if (model.kind !== 'video') return undefined;
  const range = model.videoDuration;
  if (!range) throw new Error('Video duration is not configured');
  if (duration === undefined) return range.default;
  if (
    typeof duration !== 'number' ||
    !Number.isSafeInteger(duration) ||
    duration < range.min ||
    duration > range.max
  )
    throw new Error(
      `${model.label} duration must be a whole number from ${range.min} to ${range.max} seconds`
    );
  return duration;
}

export function evoDurationOptions(model: EvoModel): number[] {
  const range = model.videoDuration;
  if (model.kind !== 'video' || !range) return [];
  return Array.from(
    { length: range.max - range.min + 1 },
    (_, i) => range.min + i
  );
}

/** Toolbar chips use lowercase ids; upstream image resolutions use uppercase. */
export function evoQuality(model: EvoModel, quality: string): string {
  return (
    model.qualities.find(
      (value) => value.toLowerCase() === quality.toLowerCase()
    ) ?? model.defaultQuality
  );
}

export function evoUsesFastModel(
  model: EvoModel,
  quality: string,
  fast = false
): boolean {
  return !!(fast && model.fastModel && model.fastUpstreamCostMicros?.[quality]);
}

/** Same quality and Fast resolution for the displayed price and server charge. */
export function evoCostCredits(
  model: EvoModel,
  quality: string,
  fast = false,
  duration?: number
): number {
  const resolvedQuality = evoQuality(model, quality);
  const costs = evoUsesFastModel(model, resolvedQuality, fast)
    ? model.fastUpstreamCostMicros!
    : model.upstreamCostMicros;
  return generationCredits(
    costs[resolvedQuality] * (evoDuration(model, duration) ?? 1)
  );
}
