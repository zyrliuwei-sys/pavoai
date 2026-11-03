import { createFileRoute } from '@tanstack/react-router';
import { runAdminRoute } from '@/server/admin/execute';

export const Route = createFileRoute('/api/admin/operations/')({
  server: {
    handlers: { GET: (ctx) => runAdminRoute('operations_report', ctx) },
  },
});
