import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pricingCatalog } from '../src/config/pricing';
import { paymentProviderSupportsCurrency } from '../src/lib/payment-currency';
import { getPricingDisplayAmounts } from '../src/lib/pricing-display';
import { resolveCharge } from '../src/server/payment/charge';

test('annual cards show monthly prices while keeping the full annual total', () => {
  for (const [tier, monthlyCents] of [
    ['starter', 1990],
    ['pro', 4990],
    ['enterprise', 7990],
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

test('each billing option has three distinct tiers at the requested USD starting prices', () => {
  const tiers = ['starter', 'pro', 'enterprise'];
  const groups = ['monthly', 'yearly', 'lifetime'];
  const expected = {
    monthly: [1990, 5990, 9990],
    yearly: [1990, 4990, 7990],
    lifetime: [990, 2990, 7990],
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
  assert.equal(pricingCatalog.starter_yearly.priceInCents, 23880);
  assert.equal(pricingCatalog.pro_yearly.priceInCents, 59880);
  assert.equal(pricingCatalog.enterprise_yearly.priceInCents, 95880);
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
  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: pricingCatalog.starter_yearly.currency.toUpperCase(),
    currencyDisplay: 'narrowSymbol',
  });
  assert.equal(money.format(display.displayPriceInCents / 100), '$5.00');
  assert.equal(money.format(display.checkoutPriceInCents / 100), '$59.99');
  assert.equal(product.priceInCents, 5999);
});

test('concurrent provider quotes preserve each billing option’s full checkout amount', async () => {
  for (const product of Object.values(pricingCatalog).filter((p) => !p.kind)) {
    const original = structuredClone(product);
    const display = getPricingDisplayAmounts(product);
    const quotes = await Promise.all(
      ['stripe', 'paypal', 'creem'].map((paymentProvider) =>
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

test('USD packages cannot reuse their dollar amount as yuan on native CNY providers', async () => {
  const quotes = await Promise.all(
    Object.values(pricingCatalog)
      .filter((p) => !p.kind)
      .flatMap((product) =>
        ['alipay', 'wechat'].map((paymentProvider) =>
          resolveCharge({
            product,
            paymentProvider,
            userId: 'pricing-display-test',
            configs: {},
          })
        )
      )
  );
  for (const quote of quotes) {
    assert.ok('error' in quote);
    assert.match(quote.error, /not available via (alipay|wechat)/);
  }
  for (const provider of ['paypal', 'stripe', 'creem']) {
    assert.equal(paymentProviderSupportsCurrency(provider, 'usd'), true);
  }
  for (const provider of ['alipay', 'wechat']) {
    assert.equal(paymentProviderSupportsCurrency(provider, 'usd'), false);
    assert.equal(paymentProviderSupportsCurrency(provider, 'cny'), true);
    const cny = await resolveCharge({
      product: pricingCatalog.guest_post_standard,
      paymentProvider: provider,
      userId: 'pricing-display-test',
      configs: {},
    });
    assert.deepEqual(cny, {
      amount: 69900,
      currency: 'cny',
      providerKey: provider,
    });
  }
  const usd = await resolveCharge({
    product: pricingCatalog.guest_post_standard,
    paymentProvider: 'creem',
    userId: 'pricing-display-test',
    configs: {},
  });
  assert.deepEqual(usd, {
    amount: 9900,
    currency: 'usd',
    providerKey: 'creem',
  });
});
