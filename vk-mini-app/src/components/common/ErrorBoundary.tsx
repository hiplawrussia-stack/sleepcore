/**
 * Error Boundary Component (VK Mini App)
 * ======================================
 * React Error Boundary using react-error-boundary library.
 * Provides graceful error handling with VKUI styling.
 *
 * Features:
 * - Catches render/lifecycle errors
 * - Custom fallback UI with VKUI components
 * - Error logging to console (Sentry in production)
 * - Reset functionality
 * - Dev mode: shows stack trace
 *
 * Note: Does NOT catch:
 * - Event handlers (use try/catch)
 * - Async code (use .catch() or try/catch)
 * - Server-side rendering
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 * @module @sleepcore/vk-mini-app/components/common
 */

import React, { useCallback } from 'react';
import {
  ErrorBoundary as ReactErrorBoundary,
  FallbackProps,
} from 'react-error-boundary';
import {
  Placeholder,
  Button,
  Div,
  Text,
  Card,
  Spacing,
  Title,
} from '@vkontakte/vkui';
import {
  Icon56ErrorTriangleOutline,
  Icon28RefreshOutline,
} from '@vkontakte/icons';
import { vk } from '@/services/vk';

// Check if we're in development mode
const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

/**
 * Get error message from unknown error
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

/**
 * Get error name from unknown error
 */
function getErrorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  return 'Error';
}

/**
 * Get error stack from unknown error
 */
function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

/**
 * Props for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: React.ReactNode;
  /** Custom fallback component (optional) */
  fallback?: React.ReactNode;
  /** Callback when error occurs */
  onError?: (error: unknown, info: { componentStack?: string | null }) => void;
  /** Callback when reset is triggered */
  onReset?: () => void;
}

/**
 * Default error fallback component
 */
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const handleReset = useCallback(() => {
    vk.hapticFeedback('impact', 'medium');
    resetErrorBoundary();
  }, [resetErrorBoundary]);

  const handleReload = useCallback(() => {
    vk.hapticFeedback('impact', 'medium');
    window.location.reload();
  }, []);

  const errorMessage = getErrorMessage(error);
  const errorName = getErrorName(error);
  const errorStack = getErrorStack(error);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 20,
        backgroundColor: 'var(--vkui--color_background)',
      }}
    >
      <Placeholder
        icon={
          <Icon56ErrorTriangleOutline
            style={{ color: 'var(--vkui--color_accent_red)' }}
          />
        }
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              size="m"
              mode="secondary"
              before={<Icon28RefreshOutline />}
              onClick={handleReset}
            >
              Попробовать снова
            </Button>
            <Button size="m" mode="primary" onClick={handleReload}>
              Перезагрузить
            </Button>
          </div>
        }
      >
        <Title level="2" style={{ marginBottom: 8 }}>Что-то пошло не так</Title>
        <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
          Произошла непредвиденная ошибка. Попробуйте обновить страницу.
        </Text>

        {/* Development mode: show error details */}
        {isDevelopment && (
          <>
            <Spacing size={16} />
            <Card
              mode="outline"
              style={{
                padding: 12,
                backgroundColor: 'var(--vkui--color_background_secondary)',
                maxWidth: 400,
                margin: '0 auto',
              }}
            >
              <Text
                weight="2"
                style={{
                  color: 'var(--vkui--color_text_negative)',
                  marginBottom: 8,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {errorName}: {errorMessage}
              </Text>
              {errorStack && (
                <Text
                  style={{
                    color: 'var(--vkui--color_text_tertiary)',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: 150,
                    overflow: 'auto',
                  }}
                >
                  {errorStack.split('\n').slice(1, 6).join('\n')}
                </Text>
              )}
            </Card>
          </>
        )}
      </Placeholder>
    </div>
  );
}

/**
 * Minimal error fallback for nested boundaries
 */
export function MinimalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = getErrorMessage(error);

  return (
    <Div style={{ textAlign: 'center', padding: 24 }}>
      <Text style={{ color: 'var(--vkui--color_text_secondary)', marginBottom: 12 }}>
        Не удалось загрузить компонент
      </Text>
      <Button size="s" mode="secondary" onClick={resetErrorBoundary}>
        Повторить
      </Button>
      {isDevelopment && (
        <Text
          style={{
            color: 'var(--vkui--color_text_tertiary)',
            fontSize: 11,
            marginTop: 8,
            fontFamily: 'monospace',
          }}
        >
          {errorMessage}
        </Text>
      )}
    </Div>
  );
}

/**
 * Error logging function
 */
function logError(error: unknown, info: { componentStack?: string | null }) {
  // Log to console in development
  console.error('[ErrorBoundary] Caught error:', error);
  if (info.componentStack) {
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  // In production, send to Sentry or other error tracking service
  // if (typeof Sentry !== 'undefined') {
  //   Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  // }
}

/**
 * Error Boundary wrapper component
 *
 * @example
 * // Wrap entire app
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * @example
 * // Wrap specific section with custom fallback
 * <ErrorBoundary
 *   fallback={<p>Section failed to load</p>}
 *   onError={(error) => trackError(error)}
 * >
 *   <DangerousComponent />
 * </ErrorBoundary>
 */
export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback,
  onError,
  onReset,
}) => {
  const handleError = useCallback(
    (error: unknown, info: { componentStack?: string | null }) => {
      logError(error, info);
      onError?.(error, info);
    },
    [onError]
  );

  const handleReset = useCallback(() => {
    onReset?.();
  }, [onReset]);

  // Custom fallback or default
  if (fallback) {
    return (
      <ReactErrorBoundary
        fallback={fallback}
        onError={handleError}
        onReset={handleReset}
      >
        {children}
      </ReactErrorBoundary>
    );
  }

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={handleReset}
    >
      {children}
    </ReactErrorBoundary>
  );
};

/**
 * Minimal Error Boundary for nested sections
 * Uses smaller fallback UI suitable for cards/sections
 */
export const SectionErrorBoundary: React.FC<{
  children: React.ReactNode;
  onError?: (error: unknown) => void;
}> = ({ children, onError }) => {
  const handleError = useCallback(
    (error: unknown, info: { componentStack?: string | null }) => {
      logError(error, info);
      onError?.(error);
    },
    [onError]
  );

  return (
    <ReactErrorBoundary
      FallbackComponent={MinimalErrorFallback}
      onError={handleError}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundary;
