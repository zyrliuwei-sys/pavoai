import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';

import { createD1HttpBinding, type D1RawResult } from './d1-http';

const exec = promisify(execFile);
const require = createRequire(import.meta.url);
let tokenPromise: Promise<string> | undefined;
let tokenExpires = 0;

async function getToken() {
  if (!tokenPromise || Date.now() >= tokenExpires) {
    tokenExpires = Date.now() + 10 * 60_000;
    tokenPromise = exec(
      process.execPath,
      [
        resolve(dirname(require.resolve('wrangler')), '../bin/wrangler.js'),
        'auth',
        'token',
        '--json',
      ],
      { timeout: 30_000, maxBuffer: 1024 * 1024 }
    )
      .then(({ stdout }) => {
        const credential = JSON.parse(stdout);
        if (!credential.token) throw new Error('No API token');
        return credential.token as string;
      })
      .catch(() => {
        tokenPromise = undefined;
        throw new Error(
          'D1 development requires Wrangler authentication. Run wrangler login.'
        );
      });
  }
  return tokenPromise;
}

export async function createD1DevEnv() {
  const config = unstable_readConfig({ config: 'wrangler.jsonc' });
  const binding = config.d1_databases.find(
    (database: { binding: string }) => database.binding === 'DB'
  );
  if (!binding?.remote) {
    return (
      await getPlatformProxy({
        configPath: 'wrangler.jsonc',
        remoteBindings: false,
      })
    ).env;
  }
  if (!config.account_id || !binding.database_id) {
    throw new Error(
      'Remote D1 requires account_id and the DB database_id in wrangler.jsonc.'
    );
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.account_id)}/d1/database/${encodeURIComponent(binding.database_id)}/raw`;
  const DB = createD1HttpBinding(async (queries) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${await getToken()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        batch: queries.map(({ sql, params }) => ({ sql, params })),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json()) as {
      success: boolean;
      errors?: { message: string }[];
      result?: D1RawResult[];
    };
    if (
      !response.ok ||
      !data.success ||
      !data.result ||
      data.result.some((result) => !result.success)
    ) {
      if (response.status === 401 || response.status === 403)
        tokenPromise = undefined;
      throw new Error(
        data.errors?.map((error) => error.message).join('; ') ||
          `D1 query failed (HTTP ${response.status})`
      );
    }
    return data.result;
  });
  console.info(
    `[D1] Local development connected to remote database: ${binding.database_name}`
  );
  return { DB };
}
