import { z } from 'zod';

export const pricingGroupSchema = z.enum(['monthly', 'yearly', 'lifetime']);
export type OperationsPricingGroup = z.infer<typeof pricingGroupSchema>;
export const operationsEventSchema = z.enum([
  'page_view',
  'generate_clicked',
  'pricing_viewed',
  'paywall_viewed',
  'plan_selected',
]);
export type OperationsEvent = z.infer<typeof operationsEventSchema>;
export const experimentInputSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    hypothesis: z.string().trim().min(5).max(1000),
    controlGroup: pricingGroupSchema,
    variantGroup: pricingGroupSchema,
    minVisitors: z.coerce.number().int().min(50).max(10000),
  })
  .strict()
  .refine((v) => v.controlGroup !== v.variantGroup, {
    message: 'Choose two different layouts',
    path: ['variantGroup'],
  });

export type ExperimentInput = z.infer<typeof experimentInputSchema>;
export interface OperationsBootstrap {
  enabled: boolean;
  defaultGroup: OperationsPricingGroup;
  assignment?: {
    id: string;
    variant: 'A' | 'B';
    group: OperationsPricingGroup;
  };
}

/** Asia/Shanghai has no DST. Both comparison windows end at the same clock time. */
export function operationsWindows(now = new Date()) {
  const day = 86400000;
  const start =
    Math.floor((now.getTime() + 8 * 3600000) / day) * day - 8 * 3600000;
  return {
    from: new Date(start),
    to: now,
    previousFrom: new Date(start - day),
    previousTo: new Date(now.getTime() - day),
  };
}

export interface OperationsVariantResult {
  variant: 'A' | 'B';
  group: string;
  visitors: number;
  buyers: number;
  revenue: number;
  revenuePerVisitor: number;
  conversionRate: number | null;
}

/** Observed revenue per exposed visitor. No statistical certainty is invented. */
export function leadingVariant(
  rows: OperationsVariantResult[],
  minimum: number
) {
  if (rows.length !== 2 || rows.some((r) => r.visitors < minimum)) return null;
  if (rows[0].revenuePerVisitor === rows[1].revenuePerVisitor) return null;
  return [...rows].sort((a, b) => b.revenuePerVisitor - a.revenuePerVisitor)[0];
}

export function formatOpsMoney(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amount / 10 ** digits);
}

export interface OperationsReport {
  installed: boolean;
  snapshots: { id: string; data: string; createdAt: string }[];
  generatedAt: string;
  timezone: string;
  cohort: { from: string; to: string; days: number; build: string | null };
  control: { enabled: boolean; hourly: boolean; defaultGroup: string };
  window: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
  };
  current: { currency: string; amount: number; orders: number }[];
  previous: { currency: string; amount: number; orders: number }[];
  health: {
    completed: number;
    failed: number;
    pending: number;
    rate: number | null;
  };
  pendingUsers: number;
  openTickets: number;
  funnel: { kind: string; count: number }[];
  breakdowns: Record<
    'source' | 'country' | 'landingPath' | 'buildId',
    {
      value: string;
      visitors: number;
      signups: number;
      checkouts: number;
      buyers: number;
      usdRevenue: number;
    }[]
  >;
  builds: string[];
  experiments: {
    id: string;
    name: string;
    hypothesis: string;
    status: string;
    minVisitors: number;
    rows: OperationsVariantResult[];
    leader: OperationsVariantResult | null;
  }[];
  logs: {
    id: string;
    action: string;
    detail: string;
    createdAt: string;
    experimentId: string | null;
  }[];
  visitors: {
    id: string;
    source: string;
    country: string;
    landingPath: string;
    buildId: string;
    buildLabel: string;
    priceSnapshotId: string;
    excluded: boolean;
    createdAt: string;
  }[];
}
