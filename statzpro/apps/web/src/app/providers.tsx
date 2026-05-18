'use client';

/**
 * apps/web — Client-side providers wrapper.
 *
 * All React context providers live here. Keeping them separate from the
 * root layout allows the layout to stay as a Server Component.
 */

import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SupabaseProvider } from '@/lib/supabase';
import { StorageProviderRoot } from '@/lib/storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Historical data: cache for 5 minutes, refetch on window focus
      staleTime:             5 * 60 * 1000,
      gcTime:               10 * 60 * 1000,
      refetchOnWindowFocus:  true,
      retry:                 2,
    },
    mutations: {
      // Mutations: no automatic retry (handled by useEventSync)
      retry: 0,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider>
        <StorageProviderRoot>
          {children}
        </StorageProviderRoot>
      </SupabaseProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
