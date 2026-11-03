import { and, eq, ne, type SQL } from 'drizzle-orm';

import { db } from '@/core/db';
import { opsEvent, opsVisitor } from '@/config/db/schema';

/**
 * Plug your own tables into the admin user timeline. Use this when the event
 * is already a row somewhere (a gift log, a referral, a moderation action);
 * for things nothing records yet, register a kind in src/config/events.ts and
 * call recordEvent()/track() instead.
 *
 * Register the source's `kind` in src/config/events.ts too (no `client`
 * flag) for its dot colour, and add `admin.user_detail.timeline_<kind>` to
 * messages/{en,zh}.json for its label.
 *
 * Example:
 *
 *   {
 *     kind: 'gift_template',
 *     load: ({ userId, from, by, limit }) =>
 *       db()
 *         .select({ id: giftLog.id, at: giftLog.createdAt, template: giftLog.templateName })
 *         .from(giftLog)
 *         .where(and(eq(giftLog.userId, userId), from(giftLog.createdAt)))
 *         .orderBy(by(giftLog.createdAt))
 *         .limit(limit)
 *         .then((rows) => rows.map((r) => ({ id: r.id, at: r.at, detail: { template: r.template } }))),
 *   }
 *
 * `from`, `by` and `limit` must be applied as shown: they keep paging exact.
 */

export interface TimelineSourceContext {
  userId: string;
  /** Cursor bound for the row's time column (undefined on the first page). */
  from: (column: any) => SQL | undefined;
  /** Sort on the row's time column in the requested direction. */
  by: (column: any) => SQL;
  limit: number;
}

export interface TimelineSourceRow {
  id: string;
  at: Date | string | number;
  detail?: Record<string, string | number | boolean | null>;
  /** Internal admin path opened when the row is clicked, e.g. /admin/gifts?id=1 */
  href?: string;
}

export interface TimelineSource {
  kind: string;
  load: (ctx: TimelineSourceContext) => Promise<TimelineSourceRow[]>;
}

export const customTimelineSources: TimelineSource[] = [
  {
    kind: 'ops_activity',
    async load({ userId, from, by, limit }) {
      try {
        const rows = await db()
          .select({
            id: opsEvent.id,
            at: opsEvent.createdAt,
            kind: opsEvent.kind,
            build: opsEvent.buildId,
            source: opsVisitor.source,
            country: opsVisitor.country,
            price: opsVisitor.priceSnapshotId,
          })
          .from(opsEvent)
          .innerJoin(opsVisitor, eq(opsEvent.visitorId, opsVisitor.id))
          .where(
            and(
              eq(opsVisitor.userId, userId),
              ne(opsEvent.kind, 'plan_selected'),
              from(opsEvent.createdAt)
            )
          )
          .orderBy(by(opsEvent.createdAt))
          .limit(limit);
        return rows.map(
          (r: {
            id: string;
            at: Date;
            kind: string;
            build: string;
            source: string;
            country: string;
            price: string;
          }) => ({
            id: r.id,
            at: r.at,
            detail: {
              event: r.kind,
              source: r.source,
              country: r.country,
              build: r.build,
              price_snapshot: r.price.slice(0, 16),
            },
            href: '/admin/operations',
          })
        );
      } catch (error) {
        if (/no such table|does not exist/i.test(String(error))) return [];
        throw error;
      }
    },
  },
];
