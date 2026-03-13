import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, PropsWithChildren } from 'react';

/** Creates a QueryClient configured for testing (no retries, no GC caching). */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

/** Creates a wrapper component that provides a fresh QueryClient. */
export const createQueryClientWrapper = () => {
  const queryClient = createTestQueryClient();
  const QueryClientWrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return QueryClientWrapper;
};
