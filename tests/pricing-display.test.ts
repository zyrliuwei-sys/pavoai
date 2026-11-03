import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pricingCatalog } from '../src/config/pricing';
import { getPricingDisplayAmounts } from '../src/lib/pricing-display';
import { resolveCharge } from '../src/server/payment/charge';

test('annual cards show monthly prices while keeping the full annual total', () => {
  for (const [tier, monthlyCents] of [
    ['starter', 399],
    ['pro', 1199],
    ['enterprise', 3199],
  ] as const) {
    const product = pricingCatalog[`${tier}_yearly`];
    assert.deepEqual(getPricingDisplayAmounts(product), {
      displayPriceInCents: monthlyCents,
      checkoutPriceInCents: monthlyCents * 12,
      billedAnnually: true,
    });
    assert.equal(product.plan?.interval, 'year');
    assert.equal(product.plan?.intervalCount, 1);
  }
});

test('every tier and billing option has a distinct displayed price', () => {
  const tiers = ['starter', 'pro', 'enterprise'];
  const groups = ['monthly', 'yearly', 'lifetime'];
  const expected = {
    monthly: [499, 1499, 3999],
    yearly: [399, 1199, 3199],
    lifetime: [999, 2999, 7999],
  };
  for (const group of groups) {
    const prices = tiers.map(
      (tier) =>
        getPricingDisplayAmounts(pricingCatalog[`${tier}_${group}`])
          .displayPriceInCents
    );
    assert.deepEqual(prices, expected[group as keyof typeof expected]);
    assert.equal(new Set(prices).size, 3);
  }
  for (const tier of tiers) {
    const prices = groups.map(
      (group) =>
        getPricingDisplayAmounts(pricingCatalog[`${tier}_${group}`])
          .displayPriceInCents
    );
    assert.equal(new Set(prices).size, 3);
  }
});

test('monthly subscriptions and one-time packs retain their displayed totals', () => {
  for (const tier of ['starter', 'pro', 'enterprise']) {
    for (const group of ['monthly', 'lifetime']) {
      const product = pricingCatalog[`${tier}_${group}`];
      const display = getPricingDisplayAmounts(product);
      assert.equal(display.displayPriceInCents, product.priceInCents);
      assert.equal(display.checkoutPriceInCents, product.priceInCents);
      assert.equal(display.billedAnnually, false);
    }
  }
});

test('credit packs are one-time purchases with explicitly permanent credits', () => {
  for (const tier of ['starter', 'pro', 'enterprise']) {
    const product = pricingCatalog[`${tier}_lifetime`];
    assert.equal(product.type, 'one-time');
    assert.equal(product.plan, undefined);
    assert.equal(product.creditsValidDays, 0);
    assert.ok(product.credits > 0);
    assert.match(product.productName, /Credit Pack$/);
  }
});

test('rounding a monthly comparison cannot change the annual checkout total', () => {
  const product = { ...pricingCatalog.starter_yearly, priceInCents: 5999 };
  const display = getPricingDisplayAmounts(product);
  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  assert.equal(usd.format(display.displayPriceInCents / 100), '$5.00');
  assert.equal(usd.format(display.checkoutPriceInCents / 100), '$59.99');
  assert.equal(product.priceInCents, 5999);
});

test('concurrent provider quotes preserve each billing option’s full checkout amount', async () => {
  for (const product of Object.values(pricingCatalog).filter((p) => !p.kind)) {
    const original = structuredClone(product);
    const display = getPricingDisplayAmounts(product);
    const quotes = await Promise.all(
      ['stripe', 'creem', 'paypal'].map((paymentProvider) =>
        resolveCharge({
          product,
          paymentProvider,
          userId: 'pricing-display-test',
          configs: {},
        })
      )
    );
    for (const quote of quotes) {
      assert.ok('amount' in quote);
      assert.equal(quote.amount, display.checkoutPriceInCents);
      assert.equal(
        quote.amount,
        display.displayPriceInCents * (display.billedAnnually ? 12 : 1)
      );
      assert.equal(quote.currency, 'usd');
    }
    assert.deepEqual(product, original);
  }
});
