import assert from 'node:assert/strict';
import { test } from 'node:test';
import Stripe from 'stripe';

import { pricingCatalog } from '../src/config/pricing';
import { StripeProvider } from '../src/core/payment/stripe';
import {
  PaymentEventType,
  PaymentStatus,
  PaymentType,
} from '../src/core/payment/types';

const signingSecret = 'isolated-stripe-webhook-fixture';

function provider(managedPayments = true) {
  return new StripeProvider({
    secretKey: 'isolated-stripe-api-fixture',
    publishableKey: '',
    signingSecret,
    managedPayments,
    allowedPaymentMethods: ['card', 'alipay', 'wechat_pay'],
  });
}

function stubCheckout(instance: StripeProvider) {
  const requests: any[] = [];
  (instance as any).client = {
    checkout: {
      sessions: {
        create: async (params: any) => {
          if (params.managed_payments?.enabled) {
            assert.ok(params.line_items[0].price_data.product_data.tax_code);
            assert.equal(params.invoice_creation, undefined);
            assert.equal(params.payment_method_types, undefined);
            assert.equal(params.payment_method_options, undefined);
          }
          requests.push(params);
          return {
            id: 'cs_fixture',
            url: 'https://checkout.stripe.com/fixture',
          };
        },
      },
    },
  };
  return requests;
}

test('every AI pack and subscription creates Managed Payments checkout with its catalog classification and price', async () => {
  const instance = provider();
  const requests = stubCheckout(instance);
  const products = Object.values(pricingCatalog).filter((p) => !p.kind);
  assert.equal(products.length, 9);
  for (const product of products) {
    await instance.createPayment({
      order: {
        productId: product.productId,
        description: product.productName,
        taxCode: product.taxCode,
        type: product.type,
        price: { amount: product.priceInCents, currency: product.currency },
        plan: product.plan,
        successUrl: 'https://pavoai.net/api/payment/callback',
        cancelUrl: 'https://pavoai.net/pricing',
      },
    });
    const params = requests.at(-1);
    const price = params.line_items[0].price_data;
    assert.equal(price.unit_amount, product.priceInCents);
    assert.equal(price.currency, product.currency);
    assert.equal(
      price.product_data.tax_code,
      product.productId.startsWith('starter_')
        ? 'txcd_10105001'
        : 'txcd_10105002'
    );
    assert.deepEqual(params.managed_payments, { enabled: true });
    assert.equal(params.mode, product.plan ? 'subscription' : 'payment');
    assert.equal(price.recurring?.interval, product.plan?.interval);
  }
});

test('Managed Payments leaves CNY payment methods to Stripe', async () => {
  const instance = provider();
  const requests = stubCheckout(instance);
  await instance.createPayment({
    order: {
      type: PaymentType.ONE_TIME,
      description: 'AI credits',
      taxCode: 'txcd_10105001',
      price: { amount: 990, currency: 'cny' },
    },
  });
  assert.equal(requests.length, 1);
});

test('ordinary Stripe checkout retains invoices and configured CNY payment methods', async () => {
  const instance = provider(false);
  const requests = stubCheckout(instance);
  await instance.createPayment({
    order: {
      type: PaymentType.ONE_TIME,
      description: 'Ordinary checkout',
      price: { amount: 990, currency: 'cny' },
    },
  });
  assert.equal(requests[0].managed_payments, undefined);
  assert.deepEqual(requests[0].invoice_creation, { enabled: true });
  assert.deepEqual(requests[0].payment_method_types, [
    'card',
    'wechat_pay',
    'alipay',
  ]);
});

test('an unclassified product is rejected before Stripe calls, without assigning an AI classification to guest posts', async () => {
  const instance = provider();
  const requests = stubCheckout(instance);
  assert.equal(pricingCatalog.guest_post_standard.taxCode, undefined);
  await assert.rejects(
    instance.createPayment({
      order: {
        type: PaymentType.ONE_TIME,
        description: 'Guest post',
        customer: { email: 'buyer@example.test' },
        price: { amount: 9900, currency: 'usd' },
      },
    }),
    /product tax code is required/
  );
  assert.equal(requests.length, 0);
});

function webhook(type: string, paymentStatus: string, secret = signingSecret) {
  const payload = JSON.stringify({
    id: 'evt_fixture',
    object: 'event',
    type,
    data: {
      object: {
        id: 'cs_fixture',
        object: 'checkout.session',
        status: 'complete',
        payment_status: paymentStatus,
        amount_total: 990,
        currency: 'usd',
      },
    },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  return new Request('https://pavoai.net/api/payment/notify/stripe', {
    method: 'POST',
    body: payload,
    headers: { 'stripe-signature': signature },
  });
}

test('signed delayed-payment success fulfills checkout; completed but unpaid stays processing', async () => {
  const instance = provider();
  const pending = await instance.getPaymentEvent({
    req: webhook('checkout.session.completed', 'unpaid'),
  });
  assert.equal(pending.paymentSession?.paymentStatus, PaymentStatus.PROCESSING);
  const paid = await instance.getPaymentEvent({
    req: webhook('checkout.session.async_payment_succeeded', 'paid'),
  });
  assert.equal(paid.eventType, PaymentEventType.CHECKOUT_SUCCESS);
  assert.equal(paid.paymentSession?.paymentStatus, PaymentStatus.SUCCESS);
  assert.equal(paid.paymentSession?.paymentInfo?.paymentAmount, 990);
});

test('invalid webhook signatures cannot fulfill a checkout', async () => {
  await assert.rejects(
    provider().getPaymentEvent({
      req: webhook(
        'checkout.session.async_payment_succeeded',
        'paid',
        'wrong-signing-fixture'
      ),
    }),
    /signature/i
  );
});
