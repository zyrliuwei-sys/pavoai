import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { atomic, guard } from '@/core/db/atomic';
import {
  aiTask,
  opsAssignment,
  opsCheckout,
  opsControl,
  opsEvent,
  opsExperiment,
  opsLog,
  opsPriceSnapshot,
  opsVisitor,
  order,
  ticket,
  user,
  userRole,
} from '@/config/db/schema';
import { pricingCatalog } from '@/config/pricing';
import { getUuid as randomUUID } from '@/lib/hash';
import {
  experimentInputSchema,
  leadingVariant,
  operationsWindows,
  type ExperimentInput,
  type OperationsBootstrap,
  type OperationsEvent,
  type OperationsVariantResult,
} from '@/lib/operations';
import { operationsHash as hash } from '@/lib/operations-crypto';

const paid = ['paid', 'refunding', 'refunded'];
const DAY = 86400000;
const groups = ['monthly', 'yearly', 'lifetime'];
const BUILD = import.meta.env?.VITE_BUILD_ID || 'development';
const BUILD_LABEL = import.meta.env?.VITE_BUILD_LABEL || BUILD;
export const OPS_COOKIE = 'pavo_ops_visitor';
const notStaff = (id: any) =>
  sql`not exists (select 1 from ${userRole} where ${userRole.userId} = ${id}) and not exists (select 1 from ${opsVisitor} where ${opsVisitor.userId} = ${id} and ${opsVisitor.excluded} = true)`;

export async function getControl() {
  const [row] = await db()
    .select()
    .from(opsControl)
    .where(eq(opsControl.id, 'main'));
  return (
    row ?? {
      id: 'main',
      enabled: false,
      hourly: false,
      defaultGroup: 'monthly',
    }
  );
}

export async function snapshotPrice() {
  const data = JSON.stringify(
    Object.values(pricingCatalog)
      .filter((p) => !p.kind)
      .map((p) => ({
        id: p.productId,
        amount: p.priceInCents,
        currency: p.currency,
        credits: p.credits,
        interval: p.plan?.interval ?? null,
      }))
  );
  const id = hash(data);
  await insertOnce(db(), opsPriceSnapshot, { id, data });
  return id;
}

/** HTTP cookie is server-issued; the browser never chooses a visitor or assignment id. */
export async function bootstrap(input: {
  visitorId?: string;
  userId?: string;
  anonymous?: boolean;
  staff?: boolean;
  source: string;
  country: string;
  path: string;
}) {
  let control;
  try {
    control = await getControl();
  } catch {
    return {
      result: {
        enabled: false,
        defaultGroup: 'monthly',
      } as OperationsBootstrap,
    };
  }
  const baseline = groups.includes(control.defaultGroup)
    ? (control.defaultGroup as OperationsBootstrap['defaultGroup'])
    : 'monthly';
  if (!control.enabled)
    return {
      result: { enabled: false, defaultGroup: baseline } as OperationsBootstrap,
    };
  const [existing] = input.visitorId
    ? await db()
        .select()
        .from(opsVisitor)
        .where(eq(opsVisitor.id, input.visitorId))
    : [];
  if (input.staff) {
    if (existing)
      await db()
        .update(opsVisitor)
        .set({ excluded: true })
        .where(eq(opsVisitor.id, existing.id));
    return {
      result: { enabled: false, defaultGroup: baseline } as OperationsBootstrap,
    };
  }
  const now = new Date();
  const visitorId = existing?.id ?? randomUUID();
  if (!existing) {
    await db()
      .insert(opsVisitor)
      .values({
        id: visitorId,
        source: input.source,
        country: input.country,
        landingPath: input.path,
        buildId: BUILD,
        buildLabel: BUILD_LABEL,
        priceSnapshotId: await snapshotPrice(),
        userId: input.anonymous ? null : (input.userId ?? null),
        createdAt: now,
        lastSeenAt: now,
      });
  } else {
    await db()
      .update(opsVisitor)
      .set({
        lastSeenAt: now,
        ...(!existing.userId && input.userId && !input.anonymous
          ? { userId: sql`coalesce(${opsVisitor.userId}, ${input.userId})` }
          : {}),
      })
      .where(eq(opsVisitor.id, visitorId));
  }
  if (existing?.excluded)
    return {
      result: { enabled: false, defaultGroup: baseline } as OperationsBootstrap,
    };
  const [experiment] = await db()
    .select()
    .from(opsExperiment)
    .where(eq(opsExperiment.activeSlot, 'pricing_default'));
  let assignment: OperationsBootstrap['assignment'];
  if (experiment && experiment.status === 'running') {
    const id = hash(`${experiment.id}:${visitorId}`);
    const variant = parseInt(id.slice(0, 8), 16) % 2 === 0 ? 'A' : 'B';
    await insertOnce(db(), opsAssignment, {
      id,
      experimentId: experiment.id,
      visitorId,
      variant,
    });
    const [stored] = await db()
      .select()
      .from(opsAssignment)
      .where(eq(opsAssignment.id, id));
    assignment = {
      id,
      variant: stored.variant as 'A' | 'B',
      group: (stored.variant === 'A'
        ? experiment.controlGroup
        : experiment.variantGroup) as OperationsBootstrap['defaultGroup'],
    };
  }
  await recordBrowserEvent(visitorId, 'page_view');
  return {
    visitorId,
    result: {
      enabled: true,
      defaultGroup: assignment?.group ?? baseline,
      assignment,
    } as OperationsBootstrap,
  };
}

export async function recordBrowserEvent(
  visitorId: string,
  kind: OperationsEvent
) {
  const [visitor] = await db()
    .select()
    .from(opsVisitor)
    .where(eq(opsVisitor.id, visitorId));
  if (!visitor || visitor.excluded) return;
  const control = await getControl();
  if (!control.enabled) return;
  const now = new Date();
  // At most one event of each kind per visitor/hour. Reports use distinct visitors.
  await insertOnce(db(), opsEvent, {
    id: hash(`${visitorId}:${kind}:${Math.floor(now.getTime() / 3600000)}`),
    visitorId,
    kind,
    buildId: BUILD,
    buildLabel: BUILD_LABEL,
    createdAt: now,
  });
  if (kind === 'pricing_viewed') {
    const [experiment] = await db()
      .select()
      .from(opsExperiment)
      .where(eq(opsExperiment.activeSlot, 'pricing_default'));
    if (experiment)
      await db()
        .update(opsAssignment)
        .set({
          exposedAt: now,
          attributionEndsAt: new Date(now.getTime() + 7 * DAY),
        })
        .where(
          and(
            eq(opsAssignment.id, hash(`${experiment.id}:${visitorId}`)),
            isNull(opsAssignment.exposedAt)
          )
        );
  }
}

/** Called by the checkout API after an actual provider session and order exist. */
export async function linkCheckout(
  visitorId: string | undefined,
  orderNo: string,
  userId: string,
  assignmentId?: string
) {
  if (!visitorId || !(await getControl()).enabled) return;
  const [visitor] = await db()
    .select()
    .from(opsVisitor)
    .where(eq(opsVisitor.id, visitorId));
  if (
    !visitor ||
    visitor.excluded ||
    (visitor.userId && visitor.userId !== userId)
  )
    return;
  const [checkout] = await db()
    .select()
    .from(order)
    .where(and(eq(order.orderNo, orderNo), eq(order.userId, userId)));
  if (!checkout) return;
  const [buyer] = await db()
    .select({ anonymous: user.isAnonymous })
    .from(user)
    .where(eq(user.id, userId));
  const [assignment] = assignmentId
    ? await db()
        .select({ id: opsAssignment.id })
        .from(opsAssignment)
        .where(
          and(
            eq(opsAssignment.id, assignmentId),
            eq(opsAssignment.visitorId, visitorId),
            sql`${opsAssignment.exposedAt} is not null`,
            gte(opsAssignment.attributionEndsAt, new Date())
          )
        )
    : [];
  const data = JSON.stringify({
    product: checkout.productId,
    amount: checkout.amount,
    currency: checkout.currency,
    credits: checkout.creditsAmount,
  });
  const priceSnapshotId = hash(data);
  await atomic((q) => [
    guard({
      table: opsVisitor,
      column: 'id',
      where: eq(opsVisitor.id, visitorId),
      require: or(isNull(opsVisitor.userId), eq(opsVisitor.userId, userId))!,
      message: 'Visitor identity changed',
    }),
    insertOnce(q, opsPriceSnapshot, { id: priceSnapshotId, data }),
    !buyer?.anonymous &&
      q
        .update(opsVisitor)
        .set({ userId: visitor.userId ?? userId })
        .where(eq(opsVisitor.id, visitorId)),
    insertOnce(q, opsCheckout, {
      id: orderNo,
      visitorId,
      assignmentId: assignment?.id ?? null,
      priceSnapshotId,
      createdAt: new Date(),
    }),
  ]);
}

export async function createExperiment(
  input: ExperimentInput,
  actorId: string
) {
  const data = experimentInputSchema.parse(input);
  const id = randomUUID();
  await atomic((q) => [
    q.insert(opsExperiment).values({ id, ...data }),
    q.insert(opsLog).values({
      id: randomUUID(),
      experimentId: id,
      actorId,
      action: 'created',
      detail: JSON.stringify(data),
    }),
  ]);
  return { id };
}

export async function experimentResults(id: string): Promise<
  typeof opsExperiment.$inferSelect & {
    rows: OperationsVariantResult[];
    leader: OperationsVariantResult | null;
  }
> {
  const [exp] = await db()
    .select()
    .from(opsExperiment)
    .where(eq(opsExperiment.id, id));
  if (!exp) throw new Error('Experiment not found');
  const [exposures, payments] = await Promise.all([
    db()
      .select({ variant: opsAssignment.variant, visitors: count() })
      .from(opsAssignment)
      .innerJoin(opsVisitor, eq(opsVisitor.id, opsAssignment.visitorId))
      .where(
        and(
          eq(opsAssignment.experimentId, id),
          sql`${opsAssignment.exposedAt} is not null`,
          eq(opsVisitor.excluded, false)
        )
      )
      .groupBy(opsAssignment.variant),
    db()
      .select({
        variant: opsAssignment.variant,
        revenue: sql<number>`sum(coalesce(${order.paymentAmount},${order.amount}) - coalesce(${order.refundAmount},0))`,
        buyers: sql<number>`count(distinct ${opsAssignment.visitorId})`,
      })
      .from(opsAssignment)
      .innerJoin(opsVisitor, eq(opsVisitor.id, opsAssignment.visitorId))
      .innerJoin(opsCheckout, eq(opsCheckout.assignmentId, opsAssignment.id))
      .innerJoin(order, eq(order.orderNo, opsCheckout.id))
      .where(
        and(
          eq(opsAssignment.experimentId, id),
          eq(opsVisitor.excluded, false),
          inArray(order.status, paid),
          isNull(order.deletedAt),
          sql`lower(coalesce(${order.paymentCurrency},${order.currency})) = 'usd'`,
          sql`${order.paidAt} >= ${opsAssignment.exposedAt}`,
          sql`${order.paidAt} < ${opsAssignment.attributionEndsAt}`
        )
      )
      .groupBy(opsAssignment.variant),
  ]);
  const rows = (['A', 'B'] as const).map((variant) => {
    const visitors = Number(
      exposures.find((r: any) => r.variant === variant)?.visitors ?? 0
    );
    const p = payments.find((r: any) => r.variant === variant);
    const revenue = Number(p?.revenue ?? 0),
      buyers = Number(p?.buyers ?? 0);
    return {
      variant,
      group: variant === 'A' ? exp.controlGroup : exp.variantGroup,
      visitors,
      buyers,
      revenue,
      revenuePerVisitor: visitors ? revenue / visitors : 0,
      conversionRate: visitors ? buyers / visitors : null,
    };
  }) satisfies OperationsVariantResult[];
  return { ...exp, rows, leader: leadingVariant(rows, exp.minVisitors) };
}

export async function transitionExperiment(
  id: string,
  action: 'start' | 'pause' | 'apply',
  actorId: string
) {
  const exp = await experimentResults(id);
  const control = await getControl();
  if (!control.enabled) throw new Error('Enable operations tracking first');
  if (action === 'apply' && !exp.leader)
    throw new Error(
      'Both variants must reach the observation threshold and have different revenue per visitor'
    );
  if (
    (action === 'start' && !['draft', 'paused'].includes(exp.status)) ||
    (action !== 'start' && exp.status !== 'running')
  )
    throw new Error('Invalid experiment state');
  await atomic((q) => [
    guard({
      table: opsExperiment,
      column: 'id',
      where: eq(opsExperiment.id, id),
      require: eq(opsExperiment.status, exp.status),
      message: 'Experiment changed; refresh and retry',
    }),
    q
      .update(opsExperiment)
      .set({
        status:
          action === 'start'
            ? 'running'
            : action === 'pause'
              ? 'paused'
              : 'finished',
        activeSlot: action === 'start' ? 'pricing_default' : null,
        ...(action === 'start'
          ? { startedAt: exp.startedAt ?? new Date() }
          : {}),
        ...(action === 'apply'
          ? { winnerGroup: exp.leader!.group, endedAt: new Date() }
          : {}),
      })
      .where(eq(opsExperiment.id, id)),
    action === 'apply' &&
      q
        .update(opsControl)
        .set({ defaultGroup: exp.leader!.group })
        .where(eq(opsControl.id, 'main')),
    q.insert(opsLog).values({
      id: randomUUID(),
      experimentId: id,
      actorId,
      action,
      detail: JSON.stringify({
        rows: exp.rows,
        leader: exp.leader,
        threshold: exp.minVisitors,
      }),
    }),
  ]);
  return { id };
}

export async function configure(
  input: { enabled: boolean; hourly: boolean; defaultGroup?: string },
  actorId: string
) {
  input = { ...input, hourly: input.enabled && input.hourly };
  const [existing] = await db()
    .select()
    .from(opsControl)
    .where(eq(opsControl.id, 'main'));
  await atomic((q) => [
    existing
      ? q.update(opsControl).set(input).where(eq(opsControl.id, 'main'))
      : q.insert(opsControl).values({ id: 'main', ...input }),
    q.insert(opsLog).values({
      id: randomUUID(),
      actorId,
      action: 'configured',
      detail: JSON.stringify(input),
    }),
  ]);
}

export async function excludeVisitor(
  id: string,
  excluded: boolean,
  actorId: string
) {
  await atomic((q) => [
    q.update(opsVisitor).set({ excluded }).where(eq(opsVisitor.id, id)),
    q.insert(opsLog).values({
      id: randomUUID(),
      actorId,
      action: 'traffic_excluded',
      detail: JSON.stringify({ visitor: id, excluded }),
    }),
  ]);
}

export async function getOperationsReport(
  input: { days: number; build?: string } = { days: 7 },
  now = new Date()
) {
  const control = await getControl();
  const since = new Date(now.getTime() - input.days * DAY);
  const window = operationsWindows(now);
  const cohort = and(
    gte(opsVisitor.createdAt, since),
    lt(opsVisitor.createdAt, now),
    eq(opsVisitor.excluded, false),
    input.build ? eq(opsVisitor.buildId, input.build) : undefined
  );
  const [
    visitors,
    events,
    checkouts,
    experiments,
    logs,
    builds,
    health,
    pending,
    tickets,
    current,
    previous,
    registered,
    snapshots,
  ] = await Promise.all([
    db().select().from(opsVisitor).where(cohort).limit(10001),
    db()
      .selectDistinct({ visitorId: opsEvent.visitorId, kind: opsEvent.kind })
      .from(opsEvent)
      .innerJoin(opsVisitor, eq(opsEvent.visitorId, opsVisitor.id))
      .where(cohort),
    db()
      .select({
        visitorId: opsCheckout.visitorId,
        paid: order.status,
        amount: sql<number>`coalesce(${order.paymentAmount},${order.amount})-coalesce(${order.refundAmount},0)`,
        currency: sql<string>`lower(coalesce(${order.paymentCurrency},${order.currency}))`,
        createdAt: opsCheckout.createdAt,
        paidAt: order.paidAt,
      })
      .from(opsCheckout)
      .innerJoin(opsVisitor, eq(opsCheckout.visitorId, opsVisitor.id))
      .innerJoin(order, eq(order.orderNo, opsCheckout.id))
      .where(
        and(
          cohort,
          isNull(order.deletedAt),
          ne(order.status, 'deleted'),
          lt(order.createdAt, now)
        )
      ),
    db()
      .select({ id: opsExperiment.id })
      .from(opsExperiment)
      .orderBy(desc(opsExperiment.createdAt))
      .limit(20),
    db().select().from(opsLog).orderBy(desc(opsLog.createdAt)).limit(30),
    db()
      .selectDistinct({ id: opsVisitor.buildId })
      .from(opsVisitor)
      .orderBy(desc(opsVisitor.buildId))
      .limit(50),
    db()
      .select({ status: aiTask.status, count: count() })
      .from(aiTask)
      .innerJoin(user, eq(aiTask.userId, user.id))
      .where(
        and(
          gte(aiTask.createdAt, new Date(now.getTime() - DAY)),
          lt(aiTask.createdAt, now),
          isNull(aiTask.deletedAt),
          eq(user.type, 'user'),
          notStaff(user.id)
        )
      )
      .groupBy(aiTask.status),
    db()
      .select({ count: sql<number>`count(distinct ${order.userId})` })
      .from(order)
      .innerJoin(user, eq(order.userId, user.id))
      .where(
        and(
          gte(order.createdAt, new Date(now.getTime() - DAY)),
          lt(order.createdAt, now),
          eq(order.status, 'created'),
          isNull(order.deletedAt),
          eq(user.type, 'user'),
          notStaff(user.id),
          notInArray(
            order.userId,
            db()
              .select({ id: order.userId })
              .from(order)
              .where(
                and(
                  inArray(order.status, paid),
                  gte(order.paidAt, new Date(now.getTime() - DAY)),
                  isNull(order.deletedAt)
                )
              )
          )
        )
      ),
    db()
      .select({ count: count() })
      .from(ticket)
      .where(eq(ticket.status, 'open')),
    revenuePeriod(window.from, window.to),
    revenuePeriod(window.previousFrom, window.previousTo),
    db()
      .select({ id: opsVisitor.id })
      .from(opsVisitor)
      .innerJoin(user, eq(opsVisitor.userId, user.id))
      .where(and(cohort, eq(user.isAnonymous, false), eq(user.type, 'user'))),
    db()
      .select()
      .from(opsPriceSnapshot)
      .orderBy(desc(opsPriceSnapshot.createdAt))
      .limit(10),
  ]);
  if (visitors.length > 10000)
    throw new Error(
      'More than 10,000 visitors in this cohort. Select a shorter date range.'
    );
  const eventSets = new Map<string, Set<string>>();
  for (const e of events) {
    if (!eventSets.has(e.kind)) eventSets.set(e.kind, new Set());
    eventSets.get(e.kind)!.add(e.visitorId);
  }
  const checkoutSet = new Set<string>(checkouts.map((r: any) => r.visitorId));
  const paidSet = new Set<string>(
    checkouts
      .filter(
        (r: any) =>
          paid.includes(r.paid) && r.paidAt && new Date(r.paidAt) < now
      )
      .map((r: any) => r.visitorId)
  );
  const signed = new Set<string>(
    registered.map((row: { id: string }) => row.id)
  );
  const priceSeen = new Set([
    ...(eventSets.get('pricing_viewed') ?? []),
    ...(eventSets.get('paywall_viewed') ?? []),
  ]);
  const funnel = [
    { kind: 'visit', count: visitors.length },
    {
      kind: 'generate_clicked',
      count: eventSets.get('generate_clicked')?.size ?? 0,
    },
    { kind: 'signup', count: signed.size },
    {
      kind: 'pricing_viewed',
      count: priceSeen.size,
    },
    { kind: 'plan_selected', count: eventSets.get('plan_selected')?.size ?? 0 },
    { kind: 'checkout', count: checkoutSet.size },
    { kind: 'paid', count: paidSet.size },
  ];
  function breakdown(key: 'source' | 'country' | 'landingPath' | 'buildId') {
    const rows = new Map<
      string,
      {
        value: string;
        visitors: number;
        signups: number;
        checkouts: number;
        buyers: number;
        usdRevenue: number;
      }
    >();
    for (const v of visitors) {
      const value = v[key] || '(unknown)';
      const row = rows.get(value) ?? {
        value,
        visitors: 0,
        signups: 0,
        checkouts: 0,
        buyers: 0,
        usdRevenue: 0,
      };
      row.visitors++;
      if (signed.has(v.id)) row.signups++;
      if (checkoutSet.has(v.id)) row.checkouts++;
      if (paidSet.has(v.id)) row.buyers++;
      rows.set(value, row);
    }
    const visitorMap = new Map(visitors.map((v: any) => [v.id, v]));
    for (const c of checkouts) {
      if (
        c.currency !== 'usd' ||
        !paid.includes(c.paid) ||
        !c.paidAt ||
        new Date(c.paidAt) >= now
      )
        continue;
      const v = visitorMap.get(c.visitorId) as any;
      const row = rows.get(v[key] || '(unknown)');
      if (row) row.usdRevenue += Number(c.amount);
    }
    return [...rows.values()]
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 50);
  }
  const completed = Number(
      health.find((r: any) => r.status === 'success')?.count ?? 0
    ),
    failed = Number(health.find((r: any) => r.status === 'failed')?.count ?? 0);
  return {
    snapshots,
    generatedAt: now.toISOString(),
    timezone: 'Asia/Shanghai',
    cohort: {
      from: since.toISOString(),
      to: now.toISOString(),
      days: input.days,
      build: input.build ?? null,
    },
    control,
    window: {
      from: window.from.toISOString(),
      to: now.toISOString(),
      previousFrom: window.previousFrom.toISOString(),
      previousTo: window.previousTo.toISOString(),
    },
    current,
    previous,
    health: {
      completed,
      failed,
      pending: health
        .filter(
          (r: any) => !['success', 'failed', 'canceled'].includes(r.status)
        )
        .reduce((n: number, r: any) => n + Number(r.count), 0),
      rate: completed + failed ? completed / (completed + failed) : null,
    },
    pendingUsers: Number(pending[0]?.count ?? 0),
    openTickets: Number(tickets[0]?.count ?? 0),
    funnel,
    breakdowns: {
      source: breakdown('source'),
      country: breakdown('country'),
      landingPath: breakdown('landingPath'),
      buildId: breakdown('buildId'),
    },
    builds: builds.map((r: any) => r.id),
    experiments: await Promise.all(
      experiments.map((e: any) => experimentResults(e.id))
    ),
    logs,
    visitors: await db()
      .select()
      .from(opsVisitor)
      .orderBy(desc(opsVisitor.createdAt))
      .limit(30),
  };
}

async function revenuePeriod(from: Date, to: Date) {
  const currency = sql<string>`lower(coalesce(${order.paymentCurrency},${order.currency}))`;
  const eligible = and(
    isNull(order.deletedAt),
    eq(user.type, 'user'),
    notStaff(user.id)
  );
  const [gross, refunds] = await Promise.all([
    db()
      .select({
        currency,
        amount: sql<number>`sum(coalesce(${order.paymentAmount},${order.amount}))`,
        orders: count(),
      })
      .from(order)
      .innerJoin(user, eq(order.userId, user.id))
      .where(
        and(
          eligible,
          gte(order.paidAt, from),
          lt(order.paidAt, to),
          inArray(order.status, paid)
        )
      )
      .groupBy(currency),
    db()
      .select({
        currency,
        amount: sql<number>`sum(coalesce(${order.refundAmount},0))`,
      })
      .from(order)
      .innerJoin(user, eq(order.userId, user.id))
      .where(
        and(eligible, gte(order.refundedAt, from), lt(order.refundedAt, to))
      )
      .groupBy(currency),
  ]);
  const totals = new Map<
    string,
    { currency: string; amount: number; orders: number }
  >();
  for (const row of gross)
    totals.set(row.currency, {
      currency: row.currency,
      amount: Number(row.amount ?? 0),
      orders: Number(row.orders),
    });
  for (const row of refunds) {
    const value = totals.get(row.currency) ?? {
      currency: row.currency,
      amount: 0,
      orders: 0,
    };
    value.amount -= Number(row.amount ?? 0);
    totals.set(row.currency, value);
  }
  return [...totals.values()];
}

/** Idempotent hourly snapshots; no emails, price changes, or automatic winner promotion. */
export async function inspectOperations(actorId?: string, now = new Date()) {
  let control;
  try {
    control = await getControl();
  } catch (error) {
    if (/no such table|does not exist/i.test(String(error)))
      return { skipped: true };
    throw error;
  }
  if (!control.enabled || (!actorId && !control.hourly))
    return { skipped: true };
  const report = await getOperationsReport({ days: 1 }, now);
  const signals = {
    generationFailureRate:
      report.health.rate === null ? null : 1 - report.health.rate,
    pendingUsers: report.pendingUsers,
    openTickets: report.openTickets,
    observedLeaders: report.experiments
      .filter((e) => e.leader)
      .map((e) => ({ id: e.id, leader: e.leader })),
  };
  const id = actorId
    ? randomUUID()
    : `hourly_${Math.floor(now.getTime() / 3600000)}`;
  await insertOnce(db(), opsLog, {
    id,
    actorId: actorId ?? null,
    action: 'inspection',
    detail: JSON.stringify({
      generatedAt: report.generatedAt,
      current: report.current,
      previous: report.previous,
      health: report.health,
      signals,
    }),
    createdAt: now,
  });
  return { id, signals };
}

// Drizzle uses different conflict APIs on MySQL and SQLite/Postgres.
function insertOnce(q: any, table: any, values: Record<string, unknown>) {
  const statement = q.insert(table).values(values);
  return typeof statement.onConflictDoNothing === 'function'
    ? statement.onConflictDoNothing()
    : statement.onDuplicateKeyUpdate({ set: { id: sql`${table.id}` } });
}
