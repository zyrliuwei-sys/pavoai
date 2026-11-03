import { createFileRoute } from '@tanstack/react-router';
import { runAdminRoute } from '@/server/admin/execute';

const actions: Record<string, string> = {
  configure: 'operations_configure',
  create: 'operations_experiment_create',
  start: 'operations_experiment_start',
  pause: 'operations_experiment_pause',
  apply: 'operations_experiment_apply',
  exclude: 'operations_exclude',
  inspect: 'operations_inspect',
};
export const Route = createFileRoute('/api/admin/operations/$action')({
  server: {
    handlers: {
      POST: (ctx) => {
        const op = actions[ctx.params.action];
        return op
          ? // The dispatch segment is not part of the operation's validated input.
            runAdminRoute(op, { request: ctx.request, params: {} })
          : new Response(null, { status: 404 });
      },
    },
  },
});
