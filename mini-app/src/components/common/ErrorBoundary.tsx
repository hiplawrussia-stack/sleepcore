/**
 * ErrorBoundary Component - Production Error Handling
 * ====================================================
 * Catches rendering errors and displays fallback UI.
 * Uses react-error-boundary package (2025 best practice).
 *
 * Features:
 * - Graceful error display with retry option
 * - Telegram-styled UI matching app theme
 * - Reset functionality for recovery
 *
 * @see https://github.com/bvaughn/react-error-boundary
 * @module @sleepcore/mini-app/components
 */

import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';

/**
 * Fallback UI shown when an error is caught
 */
const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  // Get error message safely (error can be unknown type)
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <div className="min-h-screen bg-night-900 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">😵</div>
        <h1 className="text-xl font-bold text-night-100 mb-3">
          Что-то пошло не так
        </h1>
        <p className="text-night-400 text-sm mb-4">
          Произошла непредвиденная ошибка. Попробуйте перезагрузить приложение.
        </p>
        {import.meta.env.DEV && (
          <details className="mb-4 text-left">
            <summary className="text-night-500 text-xs cursor-pointer hover:text-night-400">
              Техническая информация
            </summary>
            <pre className="mt-2 p-3 bg-night-800 rounded-lg text-xs text-red-400 overflow-auto max-h-32">
              {errorMessage}
            </pre>
          </details>
        )}
        <button
          onClick={resetErrorBoundary}
          className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
};

/**
 * Log error to console and Sentry
 */
const logError = (error: unknown, info: { componentStack?: string | null }) => {
  console.error('[ErrorBoundary] Caught error:', error);
  if (info.componentStack) {
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  // Send to Sentry in production
  if (import.meta.env.PROD) {
    import('@/services/sentry').then(({ captureException }) => {
      captureException(error, { componentStack: info.componentStack });
    });
  }
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback component */
  fallback?: React.ReactNode;
  /** Called when error is caught */
  onError?: (error: unknown, info: { componentStack?: string | null }) => void;
  /** Called when reset is triggered */
  onReset?: () => void;
}

/**
 * ErrorBoundary wrapper component
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback,
  onError,
  onReset,
}) => {
  const handleError = (error: unknown, info: { componentStack?: string | null }) => {
    logError(error, info);
    onError?.(error, info);
  };

  const handleReset = () => {
    onReset?.();
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={fallback ? () => <>{fallback}</> : ErrorFallback}
      onError={handleError}
      onReset={handleReset}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundary;
