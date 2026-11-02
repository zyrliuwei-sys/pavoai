import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { eq } from 'drizzle-orm';

import {
  AI_CREDITS_PER_USD,
  EVO_MODELS,
  evoCostCredits,
  generationCredits,
} from '../src/config/ai-pricing';
import { pricingCatalog } from '../src/config/pricing';
import { evoCreateTask } from '../src/core/ai/evolink';

// Isolated SQLite DB: never load the application DB before setting test env.
const directory = await mkdtemp(join(tmpdir(), 'pavo-ai-pricing-test-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${directory}/test.db`,
  AUTH_SECRET: 'isolated-pricing-test-secret-not-a-real-credential',
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
const { aiTask, credit, user } = await import('../src/config/db/schema');
const { createTask, updateTask, AITaskStatus } =
  await import('../src/modules/ai-tasks/service');
const { getBalance } = await import('../src/modules/credits/service');
after(async () => rm(directory, { recursive: true, force: true }));

test('all four models charge 8× the verified per-image or five-second base fee', () => {
  const rates: [string, string, number][] = [
    ['nano-banana-2', '1K', 504],
    ['nano-banana-2', '2K', 752],
    ['nano-banana-2', '4K', 1128],
    ['seedream-4', '1K', 180],
    ['seedream-4', '2K', 180],
    ['seedream-4', '4K', 180],
    ['wan-2-7', '720p', 3200],
    ['wan-2-7', '1080p', 4800],
    ['seedance-2-0', '720p', 7960],
    ['seedance-2-0', '1080p', 19880],
  ];
  for (const [id, quality, expected] of rates) {
    assert.equal(evoCostCredits(EVO_MODELS[id], quality), expected);
  }
  assert.equal(evoCostCredits(EVO_MODELS['seedance-2-0'], '720p', true), 6440);
});

test('unsupported quality and unsupported Fast resolution cannot undercharge', () => {
  const model = EVO_MODELS['seedance-2-0'];
  assert.equal(evoCostCredits(model, '1080p', true), 19880);
  assert.equal(evoCostCredits(model, 'untrusted'), 7960);
  assert.equal(evoCostCredits(model, 'untrusted', true), 6440);
  assert.equal(evoCostCredits(EVO_MODELS['nano-banana-2'], '1k'), 504);
  assert.equal(evoCostCredits(EVO_MODELS['nano-banana-2'], '4k'), 1128);
  assert.equal(generationCredits(22_501), 181);
  for (const invalid of [0, -1, NaN, Infinity, 0.1]) {
    assert.throws(() => generationCredits(invalid), /Invalid upstream/);
  }
});

test('every package preserves the same USD value per credit, including annual and one-time', () => {
  const packages = Object.values(pricingCatalog).filter((p) => !p.kind);
  assert.equal(packages.length, 9);
  for (const product of packages) {
    assert.equal(product.currency, 'usd');
    assert.equal(
      product.credits / AI_CREDITS_PER_USD,
      product.priceInCents / 100
    );
    assert.ok(Number.isSafeInteger(product.credits));
  }
  for (const tier of ['starter', 'pro', 'enterprise']) {
    const monthly = pricingCatalog[`${tier}_monthly`];
    const yearly = pricingCatalog[`${tier}_yearly`];
    const once = pricingCatalog[`${tier}_lifetime`];
    assert.ok(yearly.priceInCents / 12 < monthly.priceInCents);
    assert.ok(once.priceInCents > monthly.priceInCents);
    assert.equal(once.plan, undefined);
  }
  assert.equal(pricingCatalog.starter_monthly.priceInCents, 499);
  assert.equal(pricingCatalog.pro_monthly.priceInCents, 1499);
  assert.equal(pricingCatalog.enterprise_monthly.priceInCents, 3999);
  assert.equal(pricingCatalog.starter_yearly.priceInCents, 4788);
  assert.equal(pricingCatalog.pro_yearly.priceInCents, 14388);
  assert.equal(pricingCatalog.enterprise_yearly.priceInCents, 38388);
  assert.equal(pricingCatalog.starter_lifetime.priceInCents, 999);
  assert.equal(pricingCatalog.pro_lifetime.priceInCents, 2999);
  assert.equal(pricingCatalog.enterprise_lifetime.priceInCents, 7999);
});

test('upstream requests match the quoted Fast route, supported quality and five-second billing unit', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return Response.json({ id: 'test-upstream-task' });
  };
  try {
    for (const [id, quality, fast] of [
      ['seedance-2-0', '720p', true],
      ['seedance-2-0', '1080p', true],
      ['wan-2-7', '720p', true],
      ['seedream-4', '4k', true],
    ] as const) {
      await evoCreateTask(
        { baseUrl: 'https://example.test/v1', apiKey: 'test-token' },
        {
          model: EVO_MODELS[id],
          prompt: 'A landscape',
          aspect: '16:9',
          quality,
          fast,
        }
      );
    }
    assert.equal(requests[0].model, 'seedance-2.0-fast-text-to-video');
    assert.equal(requests[1].model, 'seedance-2.0-text-to-video');
    assert.equal(requests[1].quality, '1080p');
    assert.equal(requests[2].model, 'wan2.7-text-to-video');
    for (const request of requests.slice(0, 3))
      assert.equal(request.duration, 5);
    assert.equal(requests[3].n, 1);
    assert.equal(requests[3].quality, '4K');
    assert.equal(requests[3].prompt_priority, 'fast');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('concurrent generations cannot spend the same package balance twice; a failure refunds once', async () => {
  const userId = 'pricing-buyer';
  const budget = pricingCatalog.starter_monthly.credits;
  const charge = evoCostCredits(EVO_MODELS['wan-2-7'], '720p');
  await db()
    .insert(user)
    .values({ id: userId, name: 'Buyer', email: 'pricing@example.test' });
  await db().insert(credit).values({
    id: 'pricing-grant',
    userId,
    transactionNo: 'pricing-grant',
    transactionType: 'grant',
    transactionScene: 'payment',
    credits: budget,
    remainingCredits: budget,
    status: 'active',
  });
  const results = await Promise.allSettled(
    Array.from({ length: 3 }, () =>
      createTask({
        userId,
        mediaType: 'video',
        provider: 'evolink',
        model: EVO_MODELS['wan-2-7'].model,
        prompt: 'A landscape',
        costCredits: charge,
      })
    )
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(await getBalance(userId), budget - charge);
  const tasks = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.userId, userId));
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].costCredits, 3200);
  await Promise.all([
    updateTask({ taskId: tasks[0].id, status: AITaskStatus.FAILED }),
    updateTask({ taskId: tasks[0].id, status: AITaskStatus.FAILED }),
  ]);
  assert.equal(await getBalance(userId), budget);
});
