import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { MarkdownContent, markdownStyles } from '@/components/markdown-content';

type OpsDoc = {
  title: string;
  description: string;
  updated_at: string;
  markdown: string;
};

function OpsPlaybookPage() {
  const {
    data: doc,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['admin-ops-playbook'],
    queryFn: () => apiGet<OpsDoc>('/api/admin/ops-playbook'),
    // Content only changes on deploy; no need to refetch.
    staleTime: Infinity,
    retry: false,
  });

  return (
    <article>
      <header className="border-border mb-6 border-b pb-5">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
          {doc?.title ?? m['admin.ops_playbook.title']()}
        </h1>
        {doc?.description ? (
          <p className="text-muted-foreground mt-2 text-sm">
            {doc.description}
          </p>
        ) : null}
        {doc?.updated_at ? (
          <p className="text-muted-foreground mt-2 text-xs">
            {m['common.pages.last_updated']()}: {doc.updated_at}
          </p>
        ) : null}
      </header>

      {isPending ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : isError ? (
        <p className="text-muted-foreground text-sm">
          {m['admin.ops_playbook.denied']()}
        </p>
      ) : (
        <div className={markdownStyles}>
          <MarkdownContent content={doc.markdown} />
        </div>
      )}
    </article>
  );
}

export const Route = createFileRoute('/admin/ops-playbook')({
  head: () => ({
    meta: [{ title: m['admin.ops_playbook.title']() }],
  }),
  component: OpsPlaybookPage,
});
