import type { ComponentType } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';

type DocModule = {
  default: ComponentType;
  meta: { title?: string; description?: string; updated_at?: string };
};

// Internal admin knowledge base (not public content) — gated by the admin
// layout's `admin.*` permission check, so no extra permission code here.
const docs = import.meta.glob<DocModule>('/src/content/admin/*.mdx', {
  eager: true,
});

function loadDoc(locale: string): DocModule | null {
  return (
    docs[`/src/content/admin/ops-playbook.${locale}.mdx`] ??
    docs['/src/content/admin/ops-playbook.mdx'] ??
    null
  );
}

type LoaderData = { title: string };

function OpsPlaybookPage() {
  const locale = getLocale();
  const doc = loadDoc(locale);
  if (!doc) return null;
  const Content = doc.default;

  return (
    <article>
      <header className="border-border mb-6 border-b pb-5">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
          {doc.meta.title ?? m['admin.ops_playbook.title']()}
        </h1>
        {doc.meta.description ? (
          <p className="text-muted-foreground mt-2 text-sm">
            {doc.meta.description}
          </p>
        ) : null}
        {doc.meta.updated_at ? (
          <p className="text-muted-foreground mt-2 text-xs">
            {m['common.pages.last_updated']()}: {doc.meta.updated_at}
          </p>
        ) : null}
      </header>
      <div className="text-foreground/90 [&_img]:ring-border text-[15px] leading-7 [&_img]:rounded-lg [&_img]:ring-1">
        <Content />
      </div>
    </article>
  );
}

export const Route = createFileRoute('/admin/ops-playbook')({
  loader: (): LoaderData => {
    const locale = getLocale();
    const doc = loadDoc(locale);
    return { title: doc?.meta.title ?? m['admin.ops_playbook.title']() };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: loaderData.title }] : [],
  }),
  component: OpsPlaybookPage,
});
