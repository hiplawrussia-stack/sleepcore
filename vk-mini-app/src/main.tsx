/**
 * VK Mini App Entry Point
 * =======================
 * Main entry point for React application.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@vkontakte/vkui/dist/vkui.css';

import App from './App';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

/**
 * TanStack Query client
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Global error handler for unhandled errors
 */
function handleGlobalError(error: unknown) {
  console.error('[App] Unhandled error:', error);
  // In production: send to Sentry or error tracking service
}

/**
 * Render the application
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary onError={handleGlobalError}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
