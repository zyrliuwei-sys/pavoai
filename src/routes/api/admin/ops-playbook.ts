import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr } from '@/lib/resp';
// Bundled into the server chunk only (`?raw`, server route) — never ships in
// the public assets, unlike an eager MDX import.
import raw from '@/content/admin/ops-playbook.md?raw';

async function GET({ request }: { request: Request }) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return respErr('Unauthorized');
  const allowed = await hasPermission(session.user.id, 'admin.*');
  if (!allowed) return respErr('Forbidden');

  return respData({
    title: '哥飞：让 AI 统计数据 → 读数据 → 做实验 → 选最赚钱的版本',
    description:
      'AI 精细化运营方法论：自建事件统计、数据看板、A/B 实验引擎与决策案例整理。',
    updated_at: '2026-10-14',
    markdown: raw,
  });
}

export const Route = createFileRoute('/api/admin/ops-playbook')({
  server: { handlers: { GET } },
});
