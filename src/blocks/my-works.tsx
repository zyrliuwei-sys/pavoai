import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Download,
  Film,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { apiGet, type PageResult } from '@/lib/api-client';
import type { WorkItem } from '@/lib/generation-delivery';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Button, buttonVariants } from '@/components/ui/button';

export function MyWorks() {
  const [page, setPage] = useState(1);
  const { data: session, isPending } = useSession();
  const registered = !!session?.user && !session.user.isAnonymous;
  const router = useRouter();
  useEffect(() => {
    if (!isPending && !registered)
      router.replace('/sign-in?callbackUrl=%2Fsettings%2Fworks');
  }, [isPending, registered, router]);
  const query = useQuery({
    queryKey: ['my-works', session?.user.id, page],
    queryFn: () => apiGet<PageResult<WorkItem>>(`/api/works?page=${page}`),
    enabled: registered,
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      q.state.data?.items.some((item) =>
        ['pending', 'processing', 'saving'].includes(item.status)
      )
        ? 5000
        : false,
  });
  const labels: Record<string, string> = {
    pending: m['works.pending'](),
    processing: m['works.processing'](),
    saving: m['works.saving'](),
    success: m['works.ready'](),
    failed: m['works.failed'](),
    canceled: m['works.failed'](),
  };
  if (!registered) return null;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {m['works.title']()}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">
            {m['works.description']()}
          </p>
        </div>
        <Link href="/#generator" className={buttonVariants()}>
          <Plus className="size-4" />
          {m['works.create']()}
        </Link>
      </div>
      {query.isError ? (
        <div role="alert" className="bg-card rounded-2xl border p-8">
          <p>{m['works.load_error']()}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => query.refetch()}
          >
            <RefreshCw className="size-4" />
            {m['works.retry']()}
          </Button>
        </div>
      ) : query.isPending ? (
        <div
          className="text-muted-foreground flex items-center gap-2 py-16"
          role="status"
        >
          <Loader2 className="size-5 animate-spin" />
          {m['works.loading']()}
        </div>
      ) : !query.data?.items.length ? (
        <div className="bg-card flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
          <Film className="text-muted-foreground mb-4 size-10" />
          <h2 className="text-xl font-medium">{m['works.empty']()}</h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            {m['works.empty_hint']()}
          </p>
          <Link
            href="/#generator"
            className={`${buttonVariants({ variant: 'outline' })} mt-6`}
          >
            {m['works.create']()}
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {query.data.items.map((item) => (
            <article
              key={item.id}
              className="bg-card overflow-hidden rounded-2xl border"
            >
              <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden">
                {item.previewUrl ? (
                  item.mediaType === 'video' ? (
                    <video
                      className="h-full w-full object-contain"
                      src={item.previewUrl}
                      controls
                      preload="metadata"
                      playsInline
                    />
                  ) : (
                    <img
                      className="h-full w-full object-contain"
                      src={item.previewUrl}
                      alt={item.prompt}
                      loading="lazy"
                    />
                  )
                ) : ['pending', 'processing', 'saving'].includes(
                    item.status
                  ) ? (
                  <Loader2 className="text-muted-foreground size-8 animate-spin" />
                ) : (
                  <ImageIcon className="text-muted-foreground size-8" />
                )}
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{item.model}</span>
                  <span
                    className={
                      item.status === 'failed'
                        ? 'text-destructive'
                        : 'text-foreground'
                    }
                  >
                    {labels[item.status] || item.status}
                  </span>
                </div>
                <p
                  className="line-clamp-3 min-h-16 text-sm leading-relaxed"
                  title={item.prompt}
                >
                  {item.prompt}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <time
                    className="text-muted-foreground text-xs"
                    dateTime={item.createdAt}
                  >
                    {new Date(item.createdAt).toLocaleDateString(getLocale(), {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      download
                      className={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                      })}
                    >
                      <Download className="size-4" />
                      {m['works.download']()}
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {!!query.data?.total && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            {m['works.total']({ count: query.data.total })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1 || query.isFetching}
              onClick={() => setPage(page - 1)}
            >
              {m['works.previous']()}
            </Button>
            <Button
              variant="outline"
              disabled={page * 12 >= query.data.total || query.isFetching}
              onClick={() => setPage(page + 1)}
            >
              {m['works.next']()}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
