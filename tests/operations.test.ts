import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { count, desc, eq } from 'drizzle-orm';

import {
  formatOpsMoney,
  operationsEventSchema,
  operationsWindows,
} from '../src/lib/operations';
import { readOperationsJson } from '../src/lib/operations-request';

const directory = await mkdtemp(join(tmpdir(), 'pavo-operations-test-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${directory}/test.db`,
  AUTH_SECRET: 'isolated-ops-test-secret',
  NODE_ENV: 'test',
  VITE_APP_URL: 'http://localhost:3000',
});
execFileSync(
  process.execPath,
  [
    'node_modules/drizzle-kit/bin.cjs',
    'push',
    '--dialect=sqlite',
    '--schema=./src/config/db/schema.sqlite.ts',
    `--url=${process.env.DATABASE_URL}`,
    '--force',
  ],
  { stdio: 'pipe', env: process.env }
);
const { db } = await import('../src/core/db');
const schema = await import('../src/config/db/schema');
const ops = await import('../src/modules/operations/service');
const { executeAdmin, findOperation } =
  await import('../src/server/admin/execute');
const {
  user,
  role,
  userRole,
  order,
  opsVisitor,
  opsEvent,
  opsExperiment,
  opsAssignment,
  opsCheckout,
  opsLog,
  opsPriceSnapshot,
  aiTask,
} = schema;
await db()
  .insert(user)
  .values([
    { id: 'buyer', name: 'Buyer', email: 'buyer@example.test' },
    { id: 'buyer2', name: 'Buyer 2', email: 'buyer2@example.test' },
    {
      id: 'guest',
      name: 'Guest',
      email: 'guest@example.test',
      isAnonymous: true,
    },
    { id: 'owner', name: 'Owner', email: 'owner@example.test' },
    { id: 'api', name: 'Agent', email: 'agent@example.test', type: 'api' },
  ]);
await db().insert(role).values({
  id: 'staff-role',
  name: 'super_admin',
  title: 'Owner',
  status: 'active',
});
await db()
  .insert(userRole)
  .values({ id: 'owner-role', userId: 'owner', roleId: 'staff-role' });
await db().insert(schema.permission).values({
  id: 'owner-all',
  code: '*',
  resource: 'all',
  action: 'all',
  title: 'All',
});
await db().insert(schema.rolePermission).values({
  id: 'owner-all-link',
  roleId: 'staff-role',
  permissionId: 'owner-all',
});
after(() => rm(directory, { recursive: true, force: true }));
const visit = (visitorId?: string, extra: Record<string, unknown> = {}) =>
  ops.bootstrap({
    visitorId,
    source: 'chatgpt.com',
    country: 'US',
    path: '/pricing',
    ...extra,
  });
const countRows = async (table: any) =>
  Number((await db().select({ n: count() }).from(table))[0].n);
async function insertChunks(table: any, rows: any[]) {
  for (let i = 0; i < rows.length; i += 5)
    await db()
      .insert(table)
      .values(rows.slice(i, i + 5));
}
async function newOrder(id: string, extra: Record<string, unknown> = {}) {
  await db()
    .insert(order)
    .values({
      id,
      orderNo: id,
      userId: 'buyer',
      status: 'paid',
      amount: 1990,
      currency: 'usd',
      paymentCurrency: 'USD',
      paymentAmount: 1990,
      paymentProvider: 'paypal',
      checkoutInfo: '{}',
      createdAt: new Date(),
      paidAt: new Date(),
      ...extra,
    });
}
let visitorId: string, assignmentId: string, experimentId: string;

test('same-clock windows respect Beijing midnight, and currencies keep their minor units', () => {
  const w = operationsWindows(new Date('2026-11-03T04:15:00Z'));
  assert.equal(w.from.toISOString(), '2026-11-02T16:00:00.000Z');
  assert.equal(w.previousFrom.toISOString(), '2026-11-01T16:00:00.000Z');
  assert.equal(w.previousTo.toISOString(), '2026-11-02T04:15:00.000Z');
  const midnight = operationsWindows(new Date('2027-01-01T16:00:00Z'));
  assert.equal(midnight.from.toISOString(), '2027-01-01T16:00:00.000Z');
  assert.equal(formatOpsMoney(1990, 'usd'), '$19.90');
  assert.equal(formatOpsMoney(5000, 'jpy'), '¥5,000');
});

test('tracking is opt-in, staff is ignored, and first-touch identity/version/prices remain stable', async () => {
  assert.equal((await visit()).result.enabled, false);
  assert.equal(await countRows(opsVisitor), 0);
  await ops.configure({ enabled: true, hourly: false }, 'owner');
  assert.equal(
    (await visit(undefined, { staff: true, userId: 'owner' })).result.enabled,
    false
  );
  assert.equal(await countRows(opsVisitor), 0);
  const initial = await visit();
  visitorId = initial.visitorId!;
  const [original] = await db()
    .select()
    .from(opsVisitor)
    .where(eq(opsVisitor.id, visitorId));
  await visit(visitorId, {
    source: 'google',
    country: 'DE',
    path: '/blog/changed',
    userId: 'buyer',
  });
  const [returned] = await db()
    .select()
    .from(opsVisitor)
    .where(eq(opsVisitor.id, visitorId));
  for (const key of [
    'source',
    'country',
    'landingPath',
    'buildId',
    'priceSnapshotId',
    'createdAt',
  ] as const)
    assert.deepEqual(returned[key], original[key]);
  assert.equal(returned.userId, 'buyer');
  assert.equal(await countRows(opsPriceSnapshot), 1);
  await Promise.all(
    Array.from({ length: 5 }, () =>
      ops.recordBrowserEvent(visitorId, 'generate_clicked')
    )
  );
  const events = await db()
    .select()
    .from(opsEvent)
    .where(eq(opsEvent.kind, 'generate_clicked'));
  assert.equal(events.length, 1);
  assert.equal(operationsEventSchema.safeParse('paid').success, false);
});

test('concurrent experiment starts claim one active slot and one matching start log', async () => {
  const input = {
    name: 'Pricing layout',
    hypothesis: 'Credit packs first increase revenue per visitor',
    controlGroup: 'monthly' as const,
    variantGroup: 'lifetime' as const,
    minVisitors: 50,
  };
  const a = await ops.createExperiment(input, 'owner'),
    b = await ops.createExperiment(
      { ...input, name: 'Competing experiment' },
      'owner'
    );
  const results = await Promise.allSettled([
    ops.transitionExperiment(a.id, 'start', 'owner'),
    ops.transitionExperiment(b.id, 'start', 'owner'),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const active = await db()
    .select()
    .from(opsExperiment)
    .where(eq(opsExperiment.activeSlot, 'pricing_default'));
  assert.equal(active.length, 1);
  experimentId = active[0].id;
  const logs = await db()
    .select()
    .from(opsLog)
    .where(eq(opsLog.action, 'start'));
  assert.equal(logs.length, 1);
  const boot = await visit(visitorId);
  assignmentId = boot.result.assignment!.id;
  const again = await visit(visitorId);
  assert.deepEqual(boot.result.assignment, again.result.assignment);
  const before = await ops.experimentResults(experimentId);
  assert.equal(
    before.rows.reduce((s, r) => s + r.visitors, 0),
    0
  );
  await Promise.all([
    ops.recordBrowserEvent(visitorId, 'pricing_viewed'),
    ops.recordBrowserEvent(visitorId, 'pricing_viewed'),
  ]);
  const after = await ops.experimentResults(experimentId);
  assert.equal(
    after.rows.reduce((s, r) => s + r.visitors, 0),
    1
  );
  await assert.rejects(
    ops.transitionExperiment(experimentId, 'apply', 'owner'),
    /observation threshold/
  );
});

test('checkout attribution uses trusted order ownership, ignores forged assignments and deduplicates retries', async () => {
  await newOrder('paid-one');
  await Promise.all([
    ops.linkCheckout(visitorId, 'paid-one', 'buyer', assignmentId),
    ops.linkCheckout(visitorId, 'paid-one', 'buyer', assignmentId),
  ]);
  assert.equal(await countRows(opsCheckout), 1);
  let [stored] = await db()
    .select()
    .from(opsCheckout)
    .where(eq(opsCheckout.id, 'paid-one'));
  assert.equal(stored.assignmentId, assignmentId);
  await ops.linkCheckout(visitorId, 'paid-one', 'buyer2', assignmentId);
  assert.equal(await countRows(opsCheckout), 1);
  await newOrder('paid-forged');
  await ops.linkCheckout(visitorId, 'paid-forged', 'buyer', 'a'.repeat(64));
  [stored] = await db()
    .select()
    .from(opsCheckout)
    .where(eq(opsCheckout.id, 'paid-forged'));
  assert.equal(stored.assignmentId, null);
  const guest = await visit(undefined, { userId: 'guest', anonymous: true });
  await newOrder('guest-paid', { userId: 'guest' });
  await ops.linkCheckout(guest.visitorId!, 'guest-paid', 'guest');
  const [anon] = await db()
    .select()
    .from(opsVisitor)
    .where(eq(opsVisitor.id, guest.visitorId!));
  assert.equal(anon.userId, null, 'Guest checkout is not a registration');
  const snapshots = await db()
    .select()
    .from(opsPriceSnapshot)
    .where(eq(opsPriceSnapshot.id, stored.priceSnapshotId));
  assert.equal(JSON.parse(snapshots[0].data).currency, 'usd');
});

test('applying a leader requires both samples; one finish logs the exact observed result and changes only the default tab', async () => {
  const previous = await ops.experimentResults(experimentId);
  const now = new Date(),
    since = new Date(now.getTime() - 10000),
    end = new Date(now.getTime() + 7 * 86400000);
  const visitors = Array.from({ length: 100 }, (_, i) => ({
    id: `sample-${i}`,
    source: 'sample',
    country: 'US',
    landingPath: '/pricing',
    buildId: 'fixture',
    priceSnapshotId: 'fixture',
    createdAt: since,
    lastSeenAt: since,
  }));
  await insertChunks(opsVisitor, visitors);
  await insertChunks(
    opsAssignment,
    visitors.map((v, i) => ({
      id: `assignment-${i}`,
      experimentId,
      visitorId: v.id,
      variant: i < 50 ? 'A' : 'B',
      exposedAt: since,
      attributionEndsAt: end,
      createdAt: since,
    }))
  );
  await newOrder('winner-revenue', { amount: 9990, paymentAmount: 9990 });
  await db().insert(opsCheckout).values({
    id: 'winner-revenue',
    visitorId: 'sample-0',
    assignmentId: 'assignment-0',
    priceSnapshotId: 'fixture',
  });
  const before = await ops.experimentResults(experimentId);
  assert.equal(before.leader?.variant, 'A');
  assert.equal(before.rows[0].buyers, previous.rows[0].buyers + 1);
  await ops.transitionExperiment(experimentId, 'apply', 'owner');
  assert.equal((await ops.getControl()).defaultGroup, 'monthly');
  assert.equal((await ops.experimentResults(experimentId)).status, 'finished');
  const records = await db()
    .select()
    .from(opsLog)
    .where(eq(opsLog.action, 'apply'));
  assert.equal(records.length, 1);
  assert.equal(JSON.parse(records[0].detail).leader.variant, 'A');
  await assert.rejects(
    ops.transitionExperiment(experimentId, 'apply', 'owner'),
    /Invalid experiment state/
  );
});

test('same-clock revenue uses payment and refund timestamps, separates currencies, and excludes staff/API/test traffic', async () => {
  await db().delete(opsCheckout);
  await db().delete(order);
  const now = new Date('2026-11-03T04:00:00Z');
  await newOrder('today', {
    amount: 5000,
    paymentAmount: 5000,
    paidAt: new Date('2026-11-03T02:00:00Z'),
  });
  await newOrder('yesterday', {
    amount: 4500,
    paymentAmount: 4500,
    paidAt: new Date('2026-11-02T02:00:00Z'),
    status: 'refunded',
    refundAmount: 1000,
    refundedAt: new Date('2026-11-03T03:00:00Z'),
  });
  await newOrder('too-late-yesterday', {
    amount: 9900,
    paymentAmount: 9900,
    paidAt: new Date('2026-11-02T05:00:00Z'),
  });
  await newOrder('yen', {
    currency: 'jpy',
    paymentCurrency: 'JPY',
    amount: 5000,
    paymentAmount: 5000,
    paidAt: new Date('2026-11-03T03:00:00Z'),
  });
  await newOrder('staff', {
    userId: 'owner',
    amount: 999999,
    paymentAmount: 999999,
    paidAt: new Date('2026-11-03T03:00:00Z'),
  });
  await newOrder('service', {
    userId: 'api',
    amount: 999999,
    paymentAmount: 999999,
    paidAt: new Date('2026-11-03T03:00:00Z'),
  });
  await newOrder('pending-a', {
    userId: 'buyer2',
    status: 'created',
    paidAt: null,
    createdAt: new Date('2026-11-03T02:00:00Z'),
  });
  await newOrder('pending-b', {
    userId: 'buyer2',
    status: 'created',
    paidAt: null,
    createdAt: new Date('2026-11-03T02:00:00Z'),
  });
  for (const [i, status] of [
    'success',
    'success',
    'failed',
    'processing',
  ].entries())
    await db()
      .insert(aiTask)
      .values({
        id: `health-${i}`,
        userId: 'buyer',
        mediaType: 'video',
        provider: 'fixture',
        model: 'fixture',
        prompt: 'test',
        status,
        createdAt: new Date('2026-11-03T02:00:00Z'),
      });
  const report = await ops.getOperationsReport({ days: 7 }, now);
  assert.deepEqual(
    report.current.find((r) => r.currency === 'usd'),
    { currency: 'usd', amount: 4000, orders: 1 }
  );
  assert.deepEqual(
    report.previous.find((r) => r.currency === 'usd'),
    { currency: 'usd', amount: 4500, orders: 1 }
  );
  assert.deepEqual(
    report.current.find((r) => r.currency === 'jpy'),
    { currency: 'jpy', amount: 5000, orders: 1 }
  );
  assert.equal(report.pendingUsers, 1);
  assert.equal(report.health.rate, 2 / 3);
  assert.equal(report.health.pending, 1);
});

test('inspection is opt-in and one hour is saved once; read-only actors cannot mutate experiments', async () => {
  assert.deepEqual(await ops.inspectOperations(), { skipped: true });
  await ops.configure({ enabled: true, hourly: true }, 'owner');
  const now = new Date();
  await Promise.all([
    ops.inspectOperations(undefined, now),
    ops.inspectOperations(undefined, now),
  ]);
  const inspections = await db()
    .select()
    .from(opsLog)
    .where(eq(opsLog.action, 'inspection'));
  assert.equal(inspections.length, 1);
  await assert.rejects(
    executeAdmin(
      findOperation('operations_experiment_start'),
      { id: experimentId },
      { userId: 'buyer', permissions: ['admin.operations.read'] }
    ),
    /Forbidden/
  );
  const before = await countRows(opsEvent);
  await ops.excludeVisitor(visitorId, true, 'owner');
  await ops.recordBrowserEvent(visitorId, 'plan_selected');
  assert.equal(await countRows(opsEvent), before);
});

test('public telemetry accepts bounded JSON only, including a chunked oversized request', async () => {
  const okay = new Request('http://localhost/ops', {
    method: 'POST',
    body: JSON.stringify({ kind: 'pricing_viewed' }),
  });
  assert.deepEqual(await readOperationsJson(okay, 512), {
    kind: 'pricing_viewed',
  });
  const tooBig = new Request('http://localhost/ops', {
    method: 'POST',
    body: 'x'.repeat(10000),
  });
  assert.equal(await readOperationsJson(tooBig, 512), null);
});

test('admin action dispatch does not leak its route segment into strict operation input', async (t) => {
  const { getAuth } = await import('../src/core/auth');
  const api = getAuth().api as any;
  t.mock.method(api, 'getSession', async () => ({
    user: { id: 'owner', name: 'Owner', email: 'owner@example.test' },
  }));
  const { Route } = await import('../src/routes/api/admin/operations/$action');
  const post = (Route.options as any).server.handlers.POST;
  const request = () =>
    new Request('http://localhost:3000/api/admin/operations/configure', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ enabled: true, hourly: false }),
    });
  const response = await post({
    request: request(),
    params: { action: 'configure' },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).code, 0);
  assert.equal((await ops.getControl()).enabled, true);
  await ops.configure({ enabled: false, hourly: true }, 'owner');
  assert.equal(
    (await ops.getControl()).hourly,
    false,
    'Inspection must stop with tracking'
  );
  assert.equal(
    (await post({ request: request(), params: { action: 'unregistered' } }))
      .status,
    404
  );
});

test('operations activity joins the owning user timeline and obeys its limit', async () => {
  const { customTimelineSources } =
    await import('../src/server/admin/timeline-sources');
  const source = customTimelineSources.find((s) => s.kind === 'ops_activity')!;
  const context = {
    userId: 'buyer',
    from: () => undefined,
    by: (column: any) => desc(column),
    limit: 2,
  };
  const rows = await source.load(context);
  assert.ok(rows.length > 0 && rows.length <= 2);
  assert.ok(
    rows.every(
      (r) =>
        r.href === '/admin/operations' && typeof r.detail?.event === 'string'
    )
  );
  assert.deepEqual(await source.load({ ...context, userId: 'buyer2' }), []);
});
