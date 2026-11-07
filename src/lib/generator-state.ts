import { EVO_MODELS, evoDuration } from '@/config/ai-pricing';

/** Draft recovery must not turn a refresh or a cancelled paywall into a charge. */
export interface GenerationSelection {
  modelId: string;
  quality: string;
  aspect: string;
  fast: boolean;
  duration?: number;
}

export interface PendingGeneration {
  prompt: string;
  tabId: string;
  email?: string;
  auto?: boolean;
  selection?: GenerationSelection;
}

export function parsePendingGeneration(
  raw: string | null
): PendingGeneration | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (
      !value ||
      typeof value.prompt !== 'string' ||
      !value.prompt.trim() ||
      value.prompt.length > 2000 ||
      !['video', 'image'].includes(value.tabId)
    )
      return null;
    const selection = value.selection;
    if (
      selection &&
      (typeof selection.modelId !== 'string' ||
        typeof selection.quality !== 'string' ||
        typeof selection.aspect !== 'string' ||
        typeof selection.fast !== 'boolean')
    )
      return null;
    if (selection) {
      const model = Object.hasOwn(EVO_MODELS, selection.modelId)
        ? EVO_MODELS[selection.modelId]
        : undefined;
      if (!model || model.kind !== value.tabId) return null;
      if (model.kind === 'video')
        selection.duration = evoDuration(model, selection.duration);
    }
    return {
      prompt: value.prompt,
      tabId: value.tabId,
      auto: value.auto === true,
      email: typeof value.email === 'string' ? value.email : undefined,
      selection,
    };
  } catch {
    return null;
  }
}

export function shouldResumeGeneration(
  pending: PendingGeneration,
  search: string
): boolean {
  return (
    pending.auto === true &&
    new URLSearchParams(search).get('checkout') === 'returned'
  );
}
