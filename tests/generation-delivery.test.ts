import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { eq } from 'drizzle-orm';

const directory = await mkdtemp(join(tmpdir(), 'pavo-delivery-test-'));
Object.assign(process.env, {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${directory}/test.db`,
  AUTH_SECRET: 'isolated-delivery-test-secret-not-a-live-key',
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
const useD1 = process.env.WORKS_D1 === '1';
let localEnv: any = {};
let dispose: (() => Promise<void>) | undefined;
if (useD1) {
  const { createClient } = await import('@libsql/client');
  const sqlite = createClient({ url: process.env.DATABASE_URL! });
  const ddl = (
    await sqlite.execute(
      "select sql from sqlite_master where sql is not null and name not like 'sqlite_%' and name not like '__drizzle%' order by type = 'index'"
    )
  ).rows.map((row) => String(row.sql));
  sqlite.close();
  const path = join(directory, 'wrangler.json');
  await writeFile(
    path,
    JSON.stringify({
      name: 'pavo-delivery-test',
      compatibility_date: '2026-10-01',
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'local-test',
          database_id: '00000000-0000-0000-0000-000000000001',
        },
      ],
      r2_buckets: [
        { binding: 'WORKS_BUCKET', bucket_name: 'local-private-works' },
      ],
    })
  );
  const { getPlatformProxy } = await import('wrangler');
  const proxy = await getPlatformProxy<any>({
    configPath: path,
    remoteBindings: false,
    persist: { path: join(directory, 'bindings') },
  });
  for (const statement of ddl) await proxy.env.DB.prepare(statement).run();
  localEnv = proxy.env;
  (globalThis as any).__CF_ENV__ = localEnv;
  process.env.DATABASE_PROVIDER = 'd1';
  dispose = proxy.dispose;
}
const { db } = await import('../src/core/db');
const schema = await import('../src/config/db/schema');
const { getAuth } = await import('../src/core/auth');
const { getDbConfigs } = await import('../src/modules/config/service');
const { getBalance } = await import('../src/modules/credits/service');
const { findTask, attachTaskInfo, updateTask, AITaskStatus } =
  await import('../src/modules/ai-tasks/service');
const { processGeneration, processPendingGenerations } =
  await import('../src/server/generation-processing');
const { emailDownloadToken } = await import('../src/server/generation-access');
const { providerMediaUrl } = await import('../src/core/storage/works');
const { Route: generationRoute } =
  await import('../src/routes/api/ai/generate');
const { Route: worksRoute } = await import('../src/routes/api/works/index');
const { Route: downloadRoute } =
  await import('../src/routes/api/works/$id/download');
const generate = (generationRoute.options as any).server.handlers;
const works = (worksRoute.options as any).server.handlers.GET;
const download = (downloadRoute.options as any).server.handlers.GET;
const originalFetch = globalThis.fetch;
let session: any = null;
getAuth().api.getSession = async () => session;
let sequence = 0;
let emails: { to: string[]; text: string; idempotency: string | null }[] = [];
let providerCalls = 0;
const providerRequests: Record<string, unknown>[] = [];
let mediaAvailable = true;
const states = new Map<string, string>();
const objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
const bucket = {
  async put(key: string, body: any, options: any) {
    if (localEnv.WORKS_BUCKET)
      await localEnv.WORKS_BUCKET.put(key, body, options);
    objects.set(key, {
      bytes: new Uint8Array(await new Response(body).arrayBuffer()),
      contentType: options.httpMetadata.contentType,
    });
  },
  async get(key: string, options?: any) {
    if (localEnv.WORKS_BUCKET) return localEnv.WORKS_BUCKET.get(key, options);
    const object = objects.get(key);
    return object
      ? {
          body: new Response(new Uint8Array(object.bytes)).body,
          size: object.bytes.length,
          httpMetadata: { contentType: object.contentType },
        }
      : null;
  },
};
(globalThis as any).__CF_ENV__ = { ...localEnv, WORKS_BUCKET: bucket };
globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(input instanceof Request ? input.url : input);
  if (
    url.includes('/images/generations') ||
    url.includes('/videos/generations')
  ) {
    providerCalls++;
    providerRequests.push(JSON.parse(init.body));
    const id = `remote-${++sequence}`;
    states.set(id, 'completed');
    return Response.json({ id });
  }
  if (url.includes('/tasks/')) {
    const id = url.split('/').at(-1)!;
    return Response.json({
      status: states.get(id) || 'completed',
      progress: 100,
      results: ['https://media.example.com/result.png'],
    });
  }
  if (url.startsWith('https://media.example.com/')) {
    if (!mediaAvailable) return new Response('expired', { status: 404 });
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { 'content-type': 'image/png' },
    });
  }
  if (url === 'https://api.resend.com/emails') {
    const body = JSON.parse(init.body);
    emails.push({
      to: body.to,
      text: body.text,
      idempotency: new Headers(init.headers).get('idempotency-key'),
    });
    return Response.json({ id: `email-${emails.length}` });
  }
  throw new Error(`Unexpected network request: ${new URL(url).hostname}`);
}) as typeof fetch;
for (const [name, value] of Object.entries({
  evolink_api_key: 'test-evolink-key',
  evolink_base_url: 'https://api.example.com/v1',
  resend_api_key: 'test-resend-key',
  resend_sender_email: 'Pavo <test@example.com>',
}))
  await db().insert(schema.config).values({ name, value });
for (const [id, anonymous] of [
  ['member', false],
  ['other', false],
  ['guest', true],
] as const) {
  await db()
    .insert(schema.user)
    .values({
      id,
      name: id,
      email: `${id}@example.com`,
      isAnonymous: anonymous,
    });
  await db()
    .insert(schema.credit)
    .values({
      id: `grant-${id}`,
      userId: id,
      transactionNo: `grant-${id}`,
      transactionType: 'grant',
      transactionScene: 'test',
      credits: 10000,
      remainingCredits: 10000,
      status: 'active',
    });
}
let ip = 0;
function request(path: string, body?: object) {
  return new Request(`http://localhost:3000${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `198.51.100.${++ip}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
async function start(userId: string, email = '') {
  session = { user: { id: userId, isAnonymous: userId === 'guest' } };
  // Per-user create limiter deliberately stays active in production; this test
  // creates a fresh guest/member id for each independent charged request.
  const response = await generate.POST({
    request: request('/api/ai/generate', {
      prompt: 'A ceramic cup',
      model: 'seedream-4',
      quality: '2K',
      aspect: '1:1',
      email,
    }),
  });
  return { response, body: await response.json() };
}
async function freshUser(id: string, anonymous = true, budget = 1000) {
  await db()
    .insert(schema.user)
    .values({
      id,
      name: id,
      email: `${id}@example.com`,
      isAnonymous: anonymous,
    });
  await db()
    .insert(schema.credit)
    .values({
      id: `grant-${id}`,
      userId: id,
      transactionNo: `grant-${id}`,
      transactionType: 'grant',
      transactionScene: 'test',
      credits: budget,
      remainingCredits: budget,
      status: 'active',
    });
  session = { user: { id, isAnonymous: anonymous } };
}
after(async () => {
  globalThis.fetch = originalFetch;
  delete (globalThis as any).__CF_ENV__;
  await dispose?.();
  await rm(directory, { recursive: true, force: true });
});

test('registered results survive provider expiry; list and downloads enforce ownership', async () => {
  const { body } = await start('member');
  assert.equal(body.code, 0);
  const id = body.data.taskId;
  await processGeneration(id);
  assert.equal(await getBalance('member'), 9820);
  const list = await (await works({ request: request('/api/works') })).json();
  assert.equal(list.data.items[0].status, 'success');
  assert.equal(list.data.items[0].id, id);
  assert.equal('options' in list.data.items[0], false);
  mediaAvailable = false;
  const response = await download({
    request: request(`/api/works/${id}/download`),
    params: { id },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition')!, /^attachment/);
  assert.equal((await response.arrayBuffer()).byteLength, 4);
  if (useD1) {
    const rangeRequest = request(`/api/works/${id}/download?inline=1`);
    rangeRequest.headers.set('Range', 'bytes=0-1');
    const partial = await download({ request: rangeRequest, params: { id } });
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get('content-range'), 'bytes 0-1/4');
    assert.equal((await partial.arrayBuffer()).byteLength, 2);
  }
  session = { user: { id: 'other', isAnonymous: false } };
  assert.equal(
    (
      await download({
        request: request(`/api/works/${id}/download`),
        params: { id },
      })
    ).status,
    404
  );
  session = null;
  assert.equal((await works({ request: request('/api/works') })).status, 401);
  mediaAvailable = true;
});

test('guest without email has only an in-memory capability; refresh cannot recover it', async () => {
  const before = objects.size;
  const { body } = await start('guest');
  assert.equal(body.code, 0);
  const { taskId: id, access } = body.data;
  assert.equal(body.data.delivery, 'temporary');
  assert.ok(access);
  await processGeneration(id);
  assert.equal(objects.size, before);
  assert.equal(
    (await generate.GET({ request: request(`/api/ai/generate?taskId=${id}`) }))
      .status,
    404
  );
  const result = await (
    await generate.GET({
      request: request(`/api/ai/generate?taskId=${id}&access=${access}`),
    })
  ).json();
  assert.equal(result.data.status, 'completed');
  assert.equal((await works({ request: request('/api/works') })).status, 401);
  assert.equal(
    (
      await download({
        request: request(`/api/works/${id}/download`),
        params: { id },
      })
    ).status,
    404
  );
  assert.equal(
    (
      await download({
        request: request(result.data.downloadUrl),
        params: { id },
      })
    ).status,
    200
  );
  assert.equal(emails.length, 0);
});

test('guest email is delivered by background processing without a browser; concurrent runs send once', async () => {
  await freshUser('email-guest');
  const result = await generate.POST({
    request: request('/api/ai/generate', {
      prompt: 'A cup',
      model: 'seedream-4',
      email: 'recipient@example.com',
    }),
  });
  const body = await result.json();
  assert.equal(body.code, 0);
  const id = body.data.taskId;
  session = null;
  await Promise.all([
    processGeneration(id),
    processGeneration(id),
    processPendingGenerations(),
  ]);
  assert.equal(emails.length, 1);
  assert.deepEqual(emails[0].to, ['recipient@example.com']);
  assert.equal(emails[0].idempotency, `generation-${id}`);
  const link = emails[0].text.match(/http[^\s]+/)![0];
  const response = await download({
    request: new Request(link),
    params: { id },
  });
  assert.equal(response.status, 200);
  assert.equal(
    (
      await download({
        request: request(`/api/works/${id}/download?mail=wrong`),
        params: { id },
      })
    ).status,
    404
  );
  assert.equal(
    (
      await download({
        request: request(
          `/api/works/${id}/download?mail=${emailDownloadToken('other-task')}`
        ),
        params: { id },
      })
    ).status,
    404
  );
  await processGeneration(id);
  assert.equal(emails.length, 1);
});

test('missing storage/email fail before spending credits or submitting to the provider', async () => {
  await freshUser('unavailable-member', false);
  delete (globalThis as any).__CF_ENV__.WORKS_BUCKET;
  const calls = providerCalls;
  const unavailable = await generate.POST({
    request: request('/api/ai/generate', {
      prompt: 'test',
      model: 'seedream-4',
    }),
  });
  assert.notEqual((await unavailable.json()).code, 0);
  assert.equal(await getBalance('unavailable-member'), 1000);
  assert.equal(providerCalls, calls);
  (globalThis as any).__CF_ENV__.WORKS_BUCKET = bucket;
  await freshUser('unavailable-email');
  const configs = await getDbConfigs();
  const saved = configs.resend_api_key;
  configs.resend_api_key = '';
  const email = await generate.POST({
    request: request('/api/ai/generate', {
      prompt: 'test',
      model: 'seedream-4',
      email: 'recipient@example.com',
    }),
  });
  assert.notEqual((await email.json()).code, 0);
  assert.equal(await getBalance('unavailable-email'), 1000);
  assert.equal(providerCalls, calls);
  configs.resend_api_key = saved;
});

test('prototype names cannot select a model or spend credits', async () => {
  await freshUser('invalid-model', false);
  const calls = providerCalls;
  const response = await generate.POST({
    request: request('/api/ai/generate', {
      prompt: 'test',
      model: 'constructor',
    }),
  });
  const body = await response.json();
  assert.equal(body.message, 'Unknown model');
  assert.equal(await getBalance('invalid-model'), 1000);
  assert.equal(providerCalls, calls);
});

test('video API charges and submits the selected duration, including Fast and legacy defaults', async () => {
  for (const [model, duration, fast, quality, charge] of [
    ['seedance-2-0', 5, false, '720p', 7960],
    ['seedance-2-0', 15, true, '720p', 19320],
    ['seedance-2-0', 10, true, '1080p', 39760],
    ['wan-2-7', 5, false, '720p', 3200],
    ['wan-2-7', 15, false, '1080p', 14400],
    ['wan-2-7', undefined, false, '720p', 3200],
  ] as const) {
    const id = `duration-${model}-${duration}-${quality}`;
    await freshUser(id, true, 50000);
    const body = await (
      await generate.POST({
        request: request('/api/ai/generate', {
          prompt: 'A landscape',
          model,
          duration,
          fast,
          quality,
          aspect: '9:16',
        }),
      })
    ).json();
    assert.equal(body.code, 0, body.message);
    assert.equal(await getBalance(id), 50000 - charge);
    const task = (await findTask(body.data.taskId))!;
    assert.equal(task.costCredits, charge);
    assert.equal(JSON.parse(task.options!).duration, duration ?? 5);
    assert.equal(providerRequests.at(-1)!.duration, duration ?? 5);
    assert.equal(providerRequests.at(-1)!.quality, quality);
    assert.equal(providerRequests.at(-1)!.aspect_ratio, '9:16');
    if (model === 'seedance-2-0')
      assert.equal(
        providerRequests.at(-1)!.model,
        fast && quality === '720p'
          ? 'seedance-2.0-fast-text-to-video'
          : 'seedance-2.0-text-to-video'
      );
  }
});

test('invalid video duration fails before charging, recording a task or calling the provider', async () => {
  let index = 0;
  for (const model of ['seedance-2-0', 'wan-2-7']) {
    for (const duration of [
      null,
      0,
      1,
      2,
      3,
      4,
      16,
      180,
      5.5,
      '10',
      false,
      {},
    ]) {
      const id = `invalid-duration-${index++}`;
      await freshUser(id);
      const calls = providerCalls;
      const response = await generate.POST({
        request: request('/api/ai/generate', {
          prompt: 'test',
          model,
          duration,
        }),
      });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).code, 400);
      assert.equal(await getBalance(id), 1000);
      assert.equal(providerCalls, calls);
      assert.equal(
        (
          await db()
            .select()
            .from(schema.aiTask)
            .where(eq(schema.aiTask.userId, id))
        ).length,
        0
      );
    }
  }
});

test('storage failures retry without refunding successful generation', async () => {
  await freshUser('retry-member', false);
  const body = await (
    await generate.POST({
      request: request('/api/ai/generate', {
        prompt: 'test',
        model: 'seedream-4',
      }),
    })
  ).json();
  assert.equal(body.code, 0);
  const id = body.data.taskId;
  (globalThis as any).__CF_ENV__.WORKS_BUCKET = {
    ...bucket,
    put: async () => {
      throw new Error('temporary storage failure');
    },
  };
  await processGeneration(id);
  assert.equal((await findTask(id))!.status, 'success');
  assert.equal(await getBalance('retry-member'), 820);
  (globalThis as any).__CF_ENV__.WORKS_BUCKET = bucket;
  await attachTaskInfo(id, { retryAt: 0 });
  await processGeneration(id);
  assert.equal((await findTask(id))!.scene, 'generation_delivered');
  assert.equal(await getBalance('retry-member'), 820);
  // A stale failed response cannot undo a stored success or refund it.
  await updateTask({ taskId: id, status: AITaskStatus.FAILED });
  assert.equal((await findTask(id))!.status, 'success');
  assert.equal(await getBalance('retry-member'), 820);
});

test('concurrent provider failure processing returns the charge exactly once', async () => {
  await freshUser('failed-member', false);
  const body = await (
    await generate.POST({
      request: request('/api/ai/generate', {
        prompt: 'test',
        model: 'seedream-4',
      }),
    })
  ).json();
  assert.equal(body.code, 0);
  const id = body.data.taskId;
  const info = JSON.parse((await findTask(id))!.taskInfo!);
  states.set(info.evoTaskId, 'failed');
  await Promise.all([processGeneration(id), processGeneration(id)]);
  assert.equal(await getBalance('failed-member'), 1000);
  assert.equal((await findTask(id))!.status, 'failed');
});

test('media downloads reject non-HTTPS, private literal and credential URLs', () => {
  for (const url of [
    'http://media.example.com/x',
    'https://127.0.0.1/x',
    'https://169.254.169.254/x',
    'https://[::1]/x',
    'https://localhost/x',
    'https://foo.internal/x',
    'https://a:b@media.example.com/x',
  ])
    assert.throws(() => providerMediaUrl(url));
});

test('a failed credit restoration rolls back the failed task state in the same batch', async () => {
  await freshUser('rollback-member', false);
  const body = await (
    await generate.POST({
      request: request('/api/ai/generate', {
        prompt: 'test',
        model: 'seedream-4',
      }),
    })
  ).json();
  assert.equal(body.code, 0);
  const id = body.data.taskId;
  await testDdl(
    "CREATE TRIGGER fail_test_refund BEFORE UPDATE OF remaining_credits ON credit WHEN NEW.user_id = 'rollback-member' AND NEW.remaining_credits > OLD.remaining_credits BEGIN SELECT RAISE(ABORT, 'test refund failure'); END"
  );
  await assert.rejects(updateTask({ taskId: id, status: AITaskStatus.FAILED }));
  assert.equal((await findTask(id))!.status, 'pending');
  assert.equal(await getBalance('rollback-member'), 820);
  await testDdl('DROP TRIGGER fail_test_refund');
  await updateTask({ taskId: id, status: AITaskStatus.FAILED });
  assert.equal(await getBalance('rollback-member'), 1000);
});

async function testDdl(statement: string) {
  return useD1
    ? localEnv.DB.prepare(statement).run()
    : db().$client.execute(statement);
}
