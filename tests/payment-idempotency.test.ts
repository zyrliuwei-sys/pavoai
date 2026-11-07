import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { pricingCatalog } from '../src/config/pricing';
import { StripeProvider } from '../src/core/payment/stripe';
import { WebhookIgnoredError } from '../src/core/payment/types';

// Isolated SQLite database; no application modules load before the env is set.
const directory = await mkdtemp(join(tmpdir(), 'shipany-payment-test-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${directory}/test.db`,
  AUTH_SECRET: 'isolated-payment-test-secret-not-a-real-credential',
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
const { credit, order, subscription, user } =
  await import('../src/config/db/schema');
const {
  settleCheckoutOrder,
  handleSubscriptionRenewal,
  handleSubscriptionUpdated,
  handleWebhook,
} = await import('../src/modules/payment/service');
const { saveConfigs } = await import('../src/modules/config/service');

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

const userId = 'user-1';
await db()
  .insert(user)
  .values({ id: userId, name: 'Buyer', email: 'buyer@example.test' });

async function createOrder(orderNo: string, sessionId: string) {
  await db()
    .insert(order)
    .values({
      id: `id-${orderNo}`,
      orderNo,
      userId,
      userEmail: 'buyer@example.test',
      status: 'created',
      amount: 2900,
      currency: 'usd',
      productId: 'pro_monthly',
      paymentType: 'subscription',
      paymentProvider: 'stripe',
      paymentSessionId: sessionId,
      checkoutInfo: '{}',
      creditsAmount: 1000,
      creditsValidDays: 30,
    });
}

const DAY = 86_400_000;
function checkoutSession(sessionId: string, status = 'paid') {
  const start = new Date('2026-10-01T00:00:00Z');
  return {
    paymentStatus: status,
    paymentResult: { id: sessionId },
    paymentInfo: { transactionId: `pi_${sessionId}`, paidAt: start },
    subscriptionId: `sub_${sessionId}`,
    subscriptionResult: {},
    subscriptionInfo: {
      status: 'active',
      amount: 2900,
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      currentPeriodStart: start,
      currentPeriodEnd: new Date(start.getTime() + 30 * DAY),
    },
  };
}

async function readOrder(orderNo: string) {
  const [row] = await db()
    .select()
    .from(order)
    .where(eq(order.orderNo, orderNo));
  return row;
}

// Local SQLite can't run two write transactions at once (the second gets
// SQLITE_BUSY), so replay the race deterministically: every request read the
// order while it was still unpaid, then settles from that stale snapshot.
test('webhook and callback racing on one order grant credits and create the subscription once', async () => {
  await createOrder('ORD-RACE', 'cs_race');
  const stale = await readOrder('ORD-RACE');
  assert.equal(stale.status, 'created');

  for (let i = 0; i < 3; i++) {
    await settleCheckoutOrder(stale, checkoutSession('cs_race'), 'stripe');
  }

  const row = await readOrder('ORD-RACE');
  assert.equal(row.status, 'paid');
  assert.ok(row.subscriptionNo, 'order links to its subscription');
  const credits = await db()
    .select()
    .from(credit)
    .where(eq(credit.orderNo, 'ORD-RACE'));
  assert.equal(credits.length, 1);
  assert.equal(credits[0].credits, 1000);
  const subs = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionId, 'sub_cs_race'));
  assert.equal(subs.length, 1);
  assert.equal(subs[0].subscriptionNo, row.subscriptionNo);
});

test('a late failure event from a stale read never downgrades a paid order', async () => {
  const stale = { ...(await readOrder('ORD-RACE')), status: 'created' };
  await settleCheckoutOrder(
    stale,
    checkoutSession('cs_race', 'failed'),
    'stripe'
  );
  assert.equal((await readOrder('ORD-RACE')).status, 'paid');
});

test('first-purchase credit pack callback retries grant permanent credits once without a subscription', async () => {
  const product = pricingCatalog.starter_lifetime;
  const orderNo = 'ORD-FIRST-PACK';
  await db().insert(order).values({
    id: 'id-first-pack',
    orderNo,
    userId,
    userEmail: 'buyer@example.test',
    status: 'created',
    amount: product.priceInCents,
    currency: product.currency,
    productId: product.productId,
    paymentType: product.type,
    paymentProvider: 'stripe',
    paymentSessionId: 'cs_first_pack',
    checkoutInfo: '{}',
    creditsAmount: product.credits,
    creditsValidDays: product.creditsValidDays,
  });
  const stale = await readOrder(orderNo);
  const subscriptionsBefore = await db().select().from(subscription);
  // Signed initial/async webhooks and the browser callback can all read the
  // same unpaid order before any of them commits. Replay those stale reads.
  const secret = 'isolated-stripe-pack-webhook-fixture';
  const provider = new StripeProvider({
    secretKey: 'isolated-stripe-api-fixture',
    publishableKey: '',
    signingSecret: secret,
  });
  for (const type of [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.completed',
  ]) {
    const payload = JSON.stringify({
      id: `evt_${type}`,
      object: 'event',
      type,
      data: {
        object: {
          id: 'cs_first_pack',
          object: 'checkout.session',
          status: 'complete',
          payment_status: 'paid',
          amount_total: 990,
          currency: 'usd',
        },
      },
    });
    const event = await provider.getPaymentEvent({
      req: new Request('https://pavoai.net/api/payment/notify/stripe', {
        method: 'POST',
        body: payload,
        headers: {
          'stripe-signature': Stripe.webhooks.generateTestHeaderString({
            payload,
            secret,
          }),
        },
      }),
    });
    await settleCheckoutOrder(stale, event.paymentSession, 'stripe');
  }
  const settled = await readOrder(orderNo);
  assert.equal(settled.status, 'paid');
  assert.equal(settled.amount, 990);
  assert.equal(settled.paymentType, 'one-time');
  assert.ok(!settled.subscriptionNo);
  const grants = await db()
    .select()
    .from(credit)
    .where(eq(credit.orderNo, orderNo));
  assert.equal(grants.length, 1);
  assert.equal(grants[0].credits, 9900);
  assert.equal(grants[0].remainingCredits, 9900);
  assert.equal(grants[0].expiresAt, null);
  assert.deepEqual(await db().select().from(subscription), subscriptionsBefore);
});

test('saving a Stripe signing secret refreshes a previously cached provider', async () => {
  const oldSecret = 'isolated-stripe-old-signing-fixture';
  const newSecret = 'isolated-stripe-new-signing-fixture';
  await saveConfigs({
    stripe_secret_key: 'isolated-stripe-api-fixture',
    stripe_signing_secret: oldSecret,
  });
  const request = (secret: string) => {
    // Authentic but unsupported event: exercises verification without any
    // provider/network request or order mutation.
    const payload = JSON.stringify({
      id: 'evt_probe',
      object: 'event',
      type: 'pavo.connection_check',
      data: { object: {} },
    });
    return new Request('https://pavoai.net/api/payment/notify/stripe', {
      method: 'POST',
      body: payload,
      headers: {
        'stripe-signature': Stripe.webhooks.generateTestHeaderString({
          payload,
          secret,
        }),
      },
    });
  };
  await assert.rejects(
    handleWebhook({ req: request(oldSecret), provider: 'stripe' }),
    WebhookIgnoredError
  );
  await saveConfigs({ stripe_signing_secret: newSecret });
  await assert.rejects(
    handleWebhook({ req: request(newSecret), provider: 'stripe' }),
    WebhookIgnoredError
  );
  await assert.rejects(
    handleWebhook({ req: request(oldSecret), provider: 'stripe' }),
    /signature/i
  );
});

test('duplicate renewal deliveries for one period create one renewal order and one grant', async () => {
  const [sub] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionId, 'sub_cs_race'));
  const nextStart = new Date(sub.currentPeriodEnd!.getTime());
  const renewal = (transactionId: string) => ({
    paymentStatus: 'paid',
    paymentResult: { id: 'in_renew' },
    paymentInfo: { transactionId, paidAt: nextStart },
    subscriptionId: 'sub_cs_race',
    subscriptionInfo: {
      currentPeriodStart: nextStart,
      currentPeriodEnd: new Date(nextStart.getTime() + 30 * DAY),
    },
  });
  // The same invoice delivered twice (retry), then again under a different
  // event/transaction id — which slips past the transactionId check.
  await handleSubscriptionRenewal(renewal('pi_renew_1'), 'stripe');
  await handleSubscriptionRenewal(renewal('pi_renew_1'), 'stripe');
  await handleSubscriptionRenewal(renewal('pi_renew_1b'), 'stripe');

  const renewals = await db()
    .select()
    .from(order)
    .where(eq(order.paymentType, 'renew'));
  assert.equal(renewals.length, 1);
  const grants = await db()
    .select()
    .from(credit)
    .where(eq(credit.orderNo, renewals[0].orderNo));
  assert.equal(grants.length, 1);
  const [updated] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionId, 'sub_cs_race'));
  assert.equal(updated.currentPeriodStart!.getTime(), nextStart.getTime());

  // The following period still renews normally.
  const later = new Date(nextStart.getTime() + 30 * DAY);
  await handleSubscriptionRenewal(
    {
      ...renewal('pi_renew_2'),
      subscriptionInfo: {
        currentPeriodStart: later,
        currentPeriodEnd: new Date(later.getTime() + 30 * DAY),
      },
    },
    'stripe'
  );
  const all = await db()
    .select()
    .from(order)
    .where(eq(order.paymentType, 'renew'));
  assert.equal(all.length, 2);
});

// Stripe sends `customer.subscription.updated` (new period) and
// `invoice.payment_succeeded` (the renewal payment) together, in either order.
// Neither order may lose the renewal grant or grant it twice.
async function renewalFixture(key: string) {
  await createOrder(`ORD-${key}`, `cs_${key}`);
  await settleCheckoutOrder(
    await readOrder(`ORD-${key}`),
    checkoutSession(`cs_${key}`),
    'stripe'
  );
  const [sub] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionId, `sub_cs_${key}`));
  const start = new Date(sub.currentPeriodEnd!.getTime());
  const period = {
    status: 'active',
    currentPeriodStart: start,
    currentPeriodEnd: new Date(start.getTime() + 30 * DAY),
  };
  return {
    sub,
    start,
    updated: {
      subscriptionId: `sub_cs_${key}`,
      subscriptionInfo: period,
    },
    renewal: {
      paymentStatus: 'paid',
      paymentResult: { id: `in_${key}` },
      paymentInfo: { transactionId: `pi_${key}_renew`, paidAt: start },
      subscriptionId: `sub_cs_${key}`,
      subscriptionInfo: period,
    },
  };
}

async function renewalState(subscriptionNo: string) {
  const renewals = await db()
    .select()
    .from(order)
    .where(eq(order.subscriptionNo, subscriptionNo));
  const renewOrders = renewals.filter(
    (r: { paymentType: string | null }) => r.paymentType === 'renew'
  );
  const grants = renewOrders.length
    ? await db()
        .select()
        .from(credit)
        .where(eq(credit.orderNo, renewOrders[0].orderNo))
    : [];
  const [sub] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionNo, subscriptionNo));
  return { renewOrders, grants, sub };
}

for (const order_ of ['updated-first', 'renewal-first'] as const) {
  test(`renewal is granted exactly once when ${order_.replace('-', ' ')}`, async () => {
    const { sub, start, updated, renewal } = await renewalFixture(order_);
    if (order_ === 'updated-first') {
      await handleSubscriptionUpdated(updated, 'stripe');
      await handleSubscriptionRenewal(renewal, 'stripe');
    } else {
      await handleSubscriptionRenewal(renewal, 'stripe');
      await handleSubscriptionUpdated(updated, 'stripe');
    }
    // A retry of either event changes nothing.
    await handleSubscriptionRenewal(
      {
        ...renewal,
        paymentInfo: { ...renewal.paymentInfo, transactionId: 'pi_other' },
      },
      'stripe'
    );
    await handleSubscriptionUpdated(updated, 'stripe');

    const state = await renewalState(sub.subscriptionNo);
    assert.equal(state.renewOrders.length, 1);
    assert.equal(state.grants.length, 1);
    assert.equal(state.grants[0].credits, 1000);
    assert.equal(state.sub.currentPeriodStart!.getTime(), start.getTime());
  });
}

test('a stale subscription update never rewinds the period', async () => {
  const { sub, start, updated, renewal } = await renewalFixture('stale');
  await handleSubscriptionRenewal(renewal, 'stripe');
  await handleSubscriptionUpdated(
    {
      ...updated,
      subscriptionInfo: {
        status: 'active',
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
    },
    'stripe'
  );
  const state = await renewalState(sub.subscriptionNo);
  assert.equal(state.sub.currentPeriodStart!.getTime(), start.getTime());
});
