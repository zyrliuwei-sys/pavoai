import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test, type TestContext } from 'node:test';
import { eq } from 'drizzle-orm';

const directory = await mkdtemp(join(tmpdir(), 'pavo-paypal-test-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${directory}/test.db`,
  AUTH_SECRET: 'isolated-paypal-test-secret-not-a-real-credential',
  CONFIG_ENCRYPTION_KEY: '',
  NODE_ENV: 'test',
  VITE_APP_URL: 'https://payments.example.test',
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
const { user, order, credit, subscription } =
  await import('../src/config/db/schema');
const { PaymentManager, PayPalProvider } = await import('../src/core/payment');
const { PaymentType } = await import('../src/core/payment/types');
const { pricingCatalog } = await import('../src/config/pricing');
const { saveConfigs } = await import('../src/modules/config/service');
const { createCheckout, handlePaymentCallback, handleWebhook } =
  await import('../src/modules/payment/service');

const userId = 'paypal-test-buyer';
await db()
  .insert(user)
  .values({ id: userId, name: 'Buyer', email: 'buyer@example.test' });
after(async () => {
  await rm(directory, { recursive: true, force: true });
});

let sequence = 0;
const time = '2026-11-03T00:00:00Z';
async function configure(overrides: Record<string, string> = {}) {
  await saveConfigs({
    default_payment_provider: 'paypal',
    paypal_enabled: 'true',
    paypal_client_id: `paypal-test-client-${++sequence}`,
    paypal_client_secret: 'paypal-test-secret',
    paypal_webhook_id: 'WH-TEST',
    paypal_environment: 'live',
    ...overrides,
  });
}

function paypalMock(t: TestContext) {
  const orders = new Map<string, any>();
  const subscriptions = new Map<string, any>();
  const plans = new Map<string, any>();
  const calls: {
    host: string;
    path: string;
    method: string;
    body: any;
    authorization: string;
  }[] = [];
  let signatureValid = true;
  const json = (body: unknown, status = 200) => Response.json(body, { status });
  t.mock.method(
    globalThis,
    'fetch',
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      assert.ok(
        ['api-m.paypal.com', 'api-m.sandbox.paypal.com'].includes(url.host)
      );
      const method = init?.method || 'GET';
      const body =
        init?.body && url.pathname !== '/v1/oauth2/token'
          ? JSON.parse(String(init.body))
          : init?.body;
      calls.push({
        host: url.host,
        path: url.pathname,
        method,
        body,
        authorization: new Headers(init?.headers).get('authorization') || '',
      });
      if (url.pathname === '/v1/oauth2/token') {
        return json({ access_token: 'test-access-token', expires_in: 3600 });
      }
      if (url.pathname === '/v1/notifications/verify-webhook-signature') {
        return json({
          verification_status: signatureValid ? 'SUCCESS' : 'FAILURE',
        });
      }
      if (method === 'POST' && url.pathname === '/v1/catalogs/products') {
        return json({ id: `PRODUCT-${++sequence}`, ...body }, 201);
      }
      if (method === 'POST' && url.pathname === '/v1/billing/plans') {
        const plan = { id: `PLAN-${++sequence}`, ...body };
        plans.set(plan.id, plan);
        return json(plan, 201);
      }
      if (method === 'POST' && url.pathname === '/v1/billing/subscriptions') {
        const item = {
          id: `I-${++sequence}`,
          ...body,
          status: 'APPROVAL_PENDING',
          create_time: time,
          links: [
            {
              rel: 'approve',
              href: 'https://www.paypal.com/test-subscription',
            },
          ],
        };
        subscriptions.set(item.id, item);
        return json(item, 201);
      }
      if (method === 'POST' && url.pathname === '/v2/checkout/orders') {
        const item = {
          id: `ORDER-${++sequence}`,
          ...body,
          status: 'CREATED',
          create_time: time,
          links: [
            { rel: 'approve', href: 'https://www.paypal.com/test-order' },
          ],
        };
        orders.set(item.id, item);
        return json(item, 201);
      }
      const id = url.pathname.split('/').at(-1)!;
      const item = url.pathname.startsWith('/v2/checkout/orders/')
        ? orders.get(id)
        : url.pathname.startsWith('/v1/billing/subscriptions/')
          ? subscriptions.get(id)
          : url.pathname.startsWith('/v1/billing/plans/')
            ? plans.get(id)
            : undefined;
      if (method === 'GET')
        return item ? json(item) : json({ name: 'RESOURCE_NOT_FOUND' }, 404);
      throw new Error(`Unexpected PayPal request: ${method} ${url.pathname}`);
    }
  );
  return {
    orders,
    subscriptions,
    plans,
    calls,
    rejectSignatures: () => {
      signatureValid = false;
    },
  };
}

async function checkout(
  productId = 'starter_lifetime',
  provider: string | null = 'paypal'
) {
  const p = pricingCatalog[productId];
  return createCheckout({
    userId,
    userEmail: 'buyer@example.test',
    provider: provider ?? undefined,
    productName: p.productName,
    planName: p.planName,
    credits: p.credits,
    creditsValidDays: p.creditsValidDays,
    paymentOrder: {
      productId,
      type: p.type,
      price: { amount: p.priceInCents, currency: p.currency },
      description: p.description,
      plan: p.plan,
      customer: { email: 'buyer@example.test', name: 'Buyer' },
    },
  });
}
async function stored(sessionId: string) {
  const [row] = await db()
    .select()
    .from(order)
    .where(eq(order.paymentSessionId, sessionId));
  assert.ok(row);
  return row;
}
async function grants(orderNo: string) {
  return db().select().from(credit).where(eq(credit.orderNo, orderNo));
}
function webhook(eventType: string, resource: any) {
  return handleWebhook({
    provider: 'paypal',
    req: new Request(
      'https://payments.example.test/api/payment/notify/paypal',
      {
        method: 'POST',
        headers: {
          'paypal-auth-algo': 'SHA256withRSA',
          'paypal-cert-url': 'https://api.paypal.com/test-cert.pem',
          'paypal-transmission-id': 'TEST',
          'paypal-transmission-sig': 'test-signature',
          'paypal-transmission-time': time,
        },
        body: JSON.stringify({ event_type: eventType, resource }),
      }
    ),
  });
}
function completeOrder(item: any) {
  item.status = 'COMPLETED';
  item.purchase_units[0].payments = {
    captures: [
      {
        id: `CAP-${item.id}`,
        status: 'COMPLETED',
        amount: item.purchase_units[0].amount,
        create_time: time,
      },
    ],
  };
  return {
    id: `CAP-${item.id}`,
    status: 'COMPLETED',
    amount: item.purchase_units[0].amount,
    create_time: time,
    supplementary_data: { related_ids: { order_id: item.id } },
  };
}
function subscriptionPayment(item: any, cycle = 1) {
  const paidTime = cycle === 1 ? time : '2026-12-03T00:00:00Z';
  item.status = 'ACTIVE';
  item.start_time = time;
  item.billing_info = {
    last_payment: {
      amount: { value: '4.99', currency_code: 'USD' },
      time: paidTime,
    },
    next_billing_time:
      cycle === 1 ? '2026-12-03T00:00:00Z' : '2027-01-03T00:00:00Z',
    cycle_executions: [{ tenure_type: 'REGULAR', cycles_completed: cycle }],
  };
  return {
    id: `SALE-${item.id}-${cycle}`,
    state: 'completed',
    billing_agreement_id: item.id,
    amount: { total: '4.99', currency: 'USD' },
    create_time: paidTime,
  };
}

test('enabled Live PayPal handles concurrent monthly, annual and one-time checkouts at catalog prices', async (t) => {
  await configure();
  const mock = paypalMock(t);
  const ids = ['starter_monthly', 'pro_yearly', 'starter_lifetime'];
  const sessions = await Promise.all(ids.map((id) => checkout(id)));
  assert.equal(new Set(sessions.map((s) => s.checkoutInfo.sessionId)).size, 3);
  for (let i = 0; i < ids.length; i++) {
    const row = await stored(sessions[i].checkoutInfo.sessionId);
    const p = pricingCatalog[ids[i]];
    assert.equal(row.paymentProvider, 'paypal');
    assert.equal(row.status, 'created');
    assert.equal(row.amount, p.priceInCents);
    assert.equal(row.currency, p.currency);
    assert.equal((await grants(row.orderNo)).length, 0);
    const payload = sessions[i].checkoutParams;
    if (p.type === PaymentType.SUBSCRIPTION) {
      const plan = mock.plans.get(payload.plan_id);
      assert.equal(
        plan.billing_cycles[0].pricing_scheme.fixed_price.value,
        (p.priceInCents / 100).toFixed(2)
      );
      assert.equal(
        plan.billing_cycles[0].frequency.interval_unit,
        p.plan!.interval.toUpperCase()
      );
    } else {
      assert.equal(
        payload.purchase_units[0].amount.value,
        (p.priceInCents / 100).toFixed(2)
      );
    }
  }
  assert.ok(mock.calls.every((c) => c.host === 'api-m.paypal.com'));
  assert.ok(!mock.calls.some((c) => c.path.endsWith('/capture')));
});

test('PayPal configuration edits rebuild cached credentials, environment, webhook and enabled state', async (t) => {
  await configure();
  const mock = paypalMock(t);
  await checkout();
  const tokens = () => mock.calls.filter((c) => c.path === '/v1/oauth2/token');
  const firstCount = tokens().length;
  const clientId = Buffer.from(
    tokens()[0].authorization.slice('Basic '.length),
    'base64'
  )
    .toString()
    .split(':')[0];
  await saveConfigs({ paypal_client_secret: 'rotated-test-secret' });
  await checkout();
  assert.equal(tokens().length, firstCount + 1);
  assert.equal(
    tokens().at(-1)!.authorization,
    `Basic ${Buffer.from(`${clientId}:rotated-test-secret`).toString('base64')}`
  );
  await saveConfigs({ paypal_client_id: 'rotated-test-client' });
  await checkout();
  assert.equal(tokens().length, firstCount + 2);
  assert.equal(
    tokens().at(-1)!.authorization,
    `Basic ${Buffer.from('rotated-test-client:rotated-test-secret').toString('base64')}`
  );
  await saveConfigs({ paypal_environment: 'sandbox' });
  await checkout();
  assert.equal(tokens().at(-1)!.host, 'api-m.sandbox.paypal.com');
  await saveConfigs({ paypal_environment: 'production' });
  await checkout();
  assert.equal(tokens().at(-1)!.host, 'api-m.paypal.com');
  const beforeWebhook = tokens().length;
  await saveConfigs({ paypal_webhook_id: 'WH-ROTATED' });
  await assert.rejects(
    webhook('UNKNOWN.TEST.EVENT', {}),
    /Unknown PayPal event type/
  );
  assert.equal(tokens().length, beforeWebhook + 1);
  assert.equal(
    mock.calls.findLast((c) => c.path.endsWith('verify-webhook-signature'))!
      .body.webhook_id,
    'WH-ROTATED'
  );
  const beforeDisable = mock.calls.length;
  await saveConfigs({ paypal_enabled: 'false' });
  await assert.rejects(checkout(), /not found/);
  assert.equal(mock.calls.length, beforeDisable);
  await saveConfigs({ paypal_enabled: 'true', paypal_client_secret: '' });
  await assert.rejects(checkout(), /not found/);
  assert.equal(mock.calls.length, beforeDisable);
});

test('the configured default provider is used only when the buyer omits a provider', async (t) => {
  await configure();
  paypalMock(t);
  const session = await checkout('starter_lifetime', null);
  assert.equal(session.provider, 'paypal');
  const manager = new PaymentManager();
  manager.addProvider(
    new PayPalProvider({ clientId: 'test', clientSecret: 'test' }),
    true
  );
  await assert.rejects(
    manager.createPayment({ order: {}, provider: 'missing' }),
    /not found/
  );
  assert.equal(manager.getProvider('missing'), undefined);
});

test('capture webhook and callback racing grant permanent pack credits exactly once', async (t) => {
  await configure();
  const mock = paypalMock(t);
  const session = await checkout();
  const row = await stored(session.checkoutInfo.sessionId);
  assert.equal(row.creditsValidDays, 0);
  const capture = completeOrder(
    mock.orders.get(session.checkoutInfo.sessionId)
  );
  await Promise.allSettled([
    webhook('PAYMENT.CAPTURE.COMPLETED', capture),
    handlePaymentCallback(row.orderNo),
  ]);
  await webhook('PAYMENT.CAPTURE.COMPLETED', capture);
  await handlePaymentCallback(row.orderNo);
  assert.equal((await stored(session.checkoutInfo.sessionId)).status, 'paid');
  const credits = await grants(row.orderNo);
  assert.equal(credits.length, 1);
  assert.equal(credits[0].credits, pricingCatalog.starter_lifetime.credits);
  assert.equal(credits[0].expiresAt, null);
});

test('subscription sale webhooks accept PayPal v1 amounts and deduplicate initial payments and renewals', async (t) => {
  await configure();
  const mock = paypalMock(t);
  const session = await checkout('starter_monthly');
  const row = await stored(session.checkoutInfo.sessionId);
  const item = mock.subscriptions.get(session.checkoutInfo.sessionId);
  const first = subscriptionPayment(item);
  await webhook('PAYMENT.SALE.COMPLETED', first);
  await webhook('PAYMENT.SALE.COMPLETED', first);
  await handlePaymentCallback(row.orderNo);
  assert.equal((await stored(item.id)).status, 'paid');
  assert.equal((await grants(row.orderNo)).length, 1);
  const [sub] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionId, item.id));
  assert.ok(sub);
  assert.equal(sub.amount, 499);
  const next = subscriptionPayment(item, 2);
  await webhook('PAYMENT.SALE.COMPLETED', next);
  await webhook('PAYMENT.SALE.COMPLETED', next);
  const rows = await db()
    .select()
    .from(order)
    .where(eq(order.subscriptionNo, sub.subscriptionNo));
  assert.equal(rows.length, 2);
  const renewal = rows.find((r) => r.orderNo !== row.orderNo)!;
  assert.equal(renewal.paymentAmount, 499);
  assert.equal((await grants(renewal.orderNo)).length, 1);
  const bad = {
    ...next,
    id: 'SALE-WRONG-AMOUNT',
    amount: { total: '0.01', currency: 'USD' },
  };
  await assert.rejects(
    webhook('PAYMENT.SALE.COMPLETED', bad),
    /amount or currency/
  );
});

test('activation or approval without a receipt leaves the subscription order unpaid', async (t) => {
  await configure();
  const mock = paypalMock(t);
  for (const status of ['ACTIVE', 'APPROVED']) {
    const session = await checkout('starter_monthly');
    const row = await stored(session.checkoutInfo.sessionId);
    const item = mock.subscriptions.get(session.checkoutInfo.sessionId);
    item.status = status;
    item.start_time = time;
    await handlePaymentCallback(row.orderNo);
    assert.equal((await stored(item.id)).status, 'created');
    assert.equal((await grants(row.orderNo)).length, 0);
  }
});

test('incorrect amount, currency and invalid webhook signatures cannot grant credits', async (t) => {
  await configure();
  const mock = paypalMock(t);
  for (const amount of [
    { value: '0.01', currency_code: 'USD' },
    { value: '9.99', currency_code: 'EUR' },
  ]) {
    const session = await checkout();
    const row = await stored(session.checkoutInfo.sessionId);
    const capture = completeOrder(
      mock.orders.get(session.checkoutInfo.sessionId)
    );
    capture.amount = amount;
    await assert.rejects(
      webhook('PAYMENT.CAPTURE.COMPLETED', capture),
      /amount or currency/
    );
    assert.equal(
      (await stored(session.checkoutInfo.sessionId)).status,
      'created'
    );
    assert.equal((await grants(row.orderNo)).length, 0);
  }
  const session = await checkout();
  const row = await stored(session.checkoutInfo.sessionId);
  const capture = completeOrder(
    mock.orders.get(session.checkoutInfo.sessionId)
  );
  mock.rejectSignatures();
  await assert.rejects(
    webhook('PAYMENT.CAPTURE.COMPLETED', capture),
    /signature/
  );
  assert.equal((await grants(row.orderNo)).length, 0);
});

test('a completed order with a pending or missing capture stays unpaid', async (t) => {
  await configure();
  const mock = paypalMock(t);
  for (const pending of [true, false]) {
    const session = await checkout();
    const row = await stored(session.checkoutInfo.sessionId);
    const item = mock.orders.get(session.checkoutInfo.sessionId);
    completeOrder(item);
    if (pending) item.purchase_units[0].payments.captures[0].status = 'PENDING';
    else delete item.purchase_units[0].payments;
    await handlePaymentCallback(row.orderNo);
    assert.equal((await stored(item.id)).status, 'created');
    assert.equal((await grants(row.orderNo)).length, 0);
  }
});
