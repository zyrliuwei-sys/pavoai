export type DeliveryMode = 'account' | 'email' | 'temporary';

export interface GenerationDelivery {
  delivery: DeliveryMode;
  email?: string;
  locale: 'en' | 'zh';
  accessHash?: string;
}

export function jsonObject(raw: unknown): Record<string, any> {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}

export function deliveryOptions(raw: unknown): GenerationDelivery {
  const value = jsonObject(raw);
  return {
    delivery: ['account', 'email', 'temporary'].includes(value.delivery)
      ? value.delivery
      : 'account',
    email: typeof value.email === 'string' ? value.email : undefined,
    locale: value.locale === 'zh' ? 'zh' : 'en',
    accessHash:
      typeof value.accessHash === 'string' ? value.accessHash : undefined,
  };
}

export function generationDelivery(
  anonymous: boolean,
  email: string
): DeliveryMode {
  return anonymous ? (email ? 'email' : 'temporary') : 'account';
}

export interface WorkItem {
  id: string;
  prompt: string;
  mediaType: string;
  model: string;
  status: string;
  createdAt: string;
  downloadUrl: string | null;
  previewUrl: string | null;
}
