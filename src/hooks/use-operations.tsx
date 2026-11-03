import { createContext, useCallback, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/core/auth/client';
import { usePathname } from '@/core/i18n/navigation';
import { apiPost } from '@/lib/api-client';
import { getCookie } from '@/lib/cookie';
import type { OperationsBootstrap, OperationsEvent } from '@/lib/operations';

const OperationsContext = createContext<{
  data?: OperationsBootstrap;
  record: (kind: OperationsEvent) => void;
}>({ record: () => {} });
export function OperationsProvider({
  allowed,
  children,
}: {
  allowed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const publicPage = !/^\/(admin|settings|api)(\/|$)/.test(pathname);
  const query = useQuery({
    queryKey: ['operations-bootstrap', session?.user.id ?? 'visitor', allowed],
    enabled: allowed && publicPage,
    retry: false,
    staleTime: 300000,
    refetchOnWindowFocus: false,
    queryFn: () =>
      apiPost<OperationsBootstrap>('/api/operations/bootstrap', {
        path: window.location.pathname.slice(0, 190),
        referrer: document.referrer.slice(0, 500),
        source:
          new URLSearchParams(window.location.search)
            .get('utm_source')
            ?.slice(0, 100) || decodeURIComponent(getCookie('utm_source')),
      }),
  });
  const record = useCallback(
    (kind: OperationsEvent) => {
      if (!allowed || !publicPage || !query.data?.enabled) return;
      void apiPost(
        '/api/operations/event',
        { kind },
        { keepalive: true }
      ).catch(() => {});
    },
    [allowed, publicPage, query.data?.enabled]
  );
  useEffect(() => {
    record('page_view');
  }, [pathname, record]);
  return (
    <OperationsContext.Provider
      value={{ data: allowed && publicPage ? query.data : undefined, record }}
    >
      {children}
    </OperationsContext.Provider>
  );
}
export function useOperations() {
  return useContext(OperationsContext);
}
