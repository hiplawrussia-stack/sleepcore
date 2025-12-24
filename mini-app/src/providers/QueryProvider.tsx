/**
 * Query Provider
 * ==============
 * TanStack Query configuration with optimized defaults for Mini App.
 * Based on 2025 best practices.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/api';

// Create query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Keep cache for 30 minutes
      gcTime: 1000 * 60 * 30,
      // Retry failed requests
      retry: (failureCount, error) => {
        // Don't retry on auth or client errors
        if (error instanceof ApiError && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      // Exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (good for mobile)
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
      // Throw on 5xx errors for error boundaries
      throwOnError: (error) => {
        return error instanceof ApiError && error.status >= 500;
      },
    },
    mutations: {
      // Retry mutations once on network errors
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      // Global mutation error handler
      onError: (error) => {
        console.error('[Mutation Error]', error);
        // Could show toast notification here
      },
    },
  },
});

// Export for direct access in hooks
export { queryClient };

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider;
