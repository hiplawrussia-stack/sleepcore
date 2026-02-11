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
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Placeholder, Button } from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

import App from './App';

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
 * Error fallback component
 */
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: 20,
      }}
    >
      <Placeholder
        icon={<span style={{ fontSize: 56 }}>:(</span>}
        header="Что-то пошло не так"
        action={
          <Button size="m" onClick={resetErrorBoundary}>
            Перезагрузить
          </Button>
        }
      >
        {error.message}
      </Placeholder>
    </div>
  );
}

/**
 * Render the application
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
