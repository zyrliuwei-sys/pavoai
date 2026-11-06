import { defineTask } from 'nitro/task';

import { runWithDbScope } from '../../src/core/db/request-scope';
import { processPendingGenerations } from '../../src/server/generation-processing';

export default defineTask({
  meta: {
    name: 'generations:process',
    description:
      'Save finished creations and deliver guest emails even after the browser closes.',
  },
  async run() {
    const workerModule = 'cloudflare:workers';
    try {
      const worker = await import(/* @vite-ignore */ workerModule);
      (globalThis as any).__CF_ENV__ = worker.env;
    } catch {
      /* Tests use isolated bindings. */
    }
    return { result: await runWithDbScope(() => processPendingGenerations()) };
  },
});
