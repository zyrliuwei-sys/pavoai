import { defineTask } from 'nitro/task';

import { runWithDbScope } from '../../src/core/db/request-scope';
import { inspectOperations } from '../../src/modules/operations/service';

export default defineTask({
  meta: {
    name: 'operations:inspect',
    description:
      'Save an hourly first-party operations inspection when enabled by an administrator.',
  },
  async run() {
    const workerModule = 'cloudflare:workers';
    try {
      const worker = await import(/* @vite-ignore */ workerModule);
      (globalThis as any).__CF_ENV__ = worker.env;
    } catch {
      /* Node development uses the configured local database. */
    }
    return { result: await runWithDbScope(() => inspectOperations()) };
  },
});
