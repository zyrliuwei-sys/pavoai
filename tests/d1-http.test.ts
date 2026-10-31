import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { createD1HttpBinding } from '../src/core/db/d1-http';

// An isolated SQLite batch supplies the official /raw response shape. Exercise
// the actual Drizzle D1 driver, including rollback and concurrent claims.
const sqlite = createClient({ url: ':memory:' });
after(() => sqlite.close());
const binding = createD1HttpBinding(async (queries) => {
  const results = await sqlite.batch(
    queries.map(({ sql, params }) => ({ sql, args: params as any[] })),
    'write'
  );
  return results.map((result) => ({
    success: true,
    meta: { changes: result.rowsAffected },
    results: {
      columns: result.columns,
      rows: result.rows.map((row) => result.columns.map((_, i) => row[i])),
    },
  }));
});
const db = drizzle(binding as any);
await db.run(
  sql`CREATE TABLE balance (id TEXT PRIMARY KEY, remaining INTEGER NOT NULL)`
);
await db.run(sql`CREATE TABLE claim (id TEXT PRIMARY KEY)`);

test('positional results retain duplicate column names and bound values', async () => {
  const result = await db.values(
    sql`SELECT ${'first'} AS id, ${'second'} AS id`
  );
  assert.deepEqual(result, [['first', 'second']]);
  const statement = binding.prepare('SELECT ? AS value');
  assert.equal(await statement.bind('one').first('value'), 'one');
  assert.equal(await statement.bind('two').first('value'), 'two');
});

test('a failed batch rolls back the claim and earlier balance update', async () => {
  await db.run(sql`INSERT INTO balance VALUES ('rollback', 10)`);
  await assert.rejects(
    db.batch([
      db.run(sql`INSERT INTO claim VALUES ('rollback')`),
      db.run(
        sql`UPDATE balance SET remaining = remaining - 20 WHERE id = 'rollback'`
      ),
      db.run(sql`UPDATE balance SET remaining = NULL WHERE remaining < 0`),
    ])
  );
  assert.deepEqual(
    await db.values(sql`SELECT remaining FROM balance WHERE id = 'rollback'`),
    [[10]]
  );
  assert.deepEqual(
    await db.values(sql`SELECT id FROM claim WHERE id = 'rollback'`),
    []
  );
});

test('concurrent claims change the balance exactly once', async () => {
  await db.run(sql`INSERT INTO balance VALUES ('concurrent', 100)`);
  const claim = () =>
    db.batch([
      db.run(sql`INSERT INTO claim VALUES ('concurrent')`),
      db.run(
        sql`UPDATE balance SET remaining = remaining - 30 WHERE id = 'concurrent'`
      ),
    ]);
  const outcomes = await Promise.allSettled([claim(), claim()]);
  assert.equal(
    outcomes.filter((result) => result.status === 'fulfilled').length,
    1
  );
  assert.deepEqual(
    await db.values(sql`SELECT remaining FROM balance WHERE id = 'concurrent'`),
    [[70]]
  );
});

test('a transport failure never retries an ambiguous write automatically', async () => {
  let calls = 0;
  const failed = createD1HttpBinding(async () => {
    calls++;
    throw new Error('connection lost');
  });
  await assert.rejects(
    failed.prepare('INSERT INTO claim VALUES (?)').bind('unknown').run()
  );
  assert.equal(calls, 1);
});
