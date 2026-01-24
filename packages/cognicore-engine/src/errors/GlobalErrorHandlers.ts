import { CogniCoreError } from './BaseError';
import { ErrorCode, ErrorSeverity } from './ErrorCodes';
import { ErrorHandler } from './ErrorHandler';

/**
 * Global Error Handlers
 *
 * Sets up process-level error handling for:
 * - Unhandled Promise rejections
 * - Uncaught exceptions
 *
 * Best practice: These should be set up early in application bootstrap.
 *
 * @see https://nodejs.org/api/process.html#event-unhandledrejection
 * @see https://nodejs.org/api/process.html#event-uncaughtexception
 */

export interface GlobalErrorHandlerOptions {
  /** Exit process on uncaught exception (recommended for production) */
  exitOnUncaughtException?: boolean;
  /** Exit process on unhandled rejection (recommended for production) */
  exitOnUnhandledRejection?: boolean;
  /** Grace period before exit (ms) to allow logging/cleanup */
  exitGracePeriod?: number;
  /** Custom handler for uncaught exceptions */
  onUncaughtException?: (error: Error) => void;
  /** Custom handler for unhandled rejections */
  onUnhandledRejection?: (reason: unknown) => void;
}

const defaultOptions: Required<GlobalErrorHandlerOptions> = {
  exitOnUncaughtException: true,
  exitOnUnhandledRejection: false, // Node.js 15+ already exits by default
  exitGracePeriod: 1000,
  onUncaughtException: () => {},
  onUnhandledRejection: () => {},
};

let isInitialized = false;

/**
 * Initialize global error handlers
 *
 * @example
 * ```typescript
 * // In your application entry point (index.ts or main.ts)
 * import { initializeGlobalErrorHandlers } from './errors';
 *
 * initializeGlobalErrorHandlers({
 *   exitOnUncaughtException: process.env.NODE_ENV === 'production',
 *   exitOnUnhandledRejection: process.env.NODE_ENV === 'production',
 * });
 * ```
 */
export function initializeGlobalErrorHandlers(
  options: GlobalErrorHandlerOptions = {}
): void {
  if (isInitialized) {
    console.warn('[GlobalErrorHandlers] Already initialized, skipping...');
    return;
  }

  const config = { ...defaultOptions, ...options };
  const handler = ErrorHandler.getInstance();

  /**
   * Handle unhandled Promise rejections
   *
   * This occurs when a Promise is rejected and no error handler is attached.
   * Common causes:
   * - Missing await/catch on async operations
   * - Errors thrown in Promise callbacks without error handling
   */
  process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
    const error = new CogniCoreError(
      ErrorCode.INTERNAL_ERROR,
      `Unhandled Promise Rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
      {
        component: 'GlobalErrorHandler',
        operation: 'unhandledRejection',
        metadata: {
          promiseInfo: '[Promise]',
        },
      },
      {
        cause: reason instanceof Error ? reason : undefined,
        severity: ErrorSeverity.HIGH,
        isOperational: false, // Programmer error
      }
    );

    handler.handle(error);
    config.onUnhandledRejection(reason);

    if (config.exitOnUnhandledRejection) {
      console.error('[FATAL] Exiting due to unhandled rejection...');
      setTimeout(() => process.exit(1), config.exitGracePeriod);
    }
  });

  /**
   * Handle uncaught exceptions
   *
   * This occurs when an exception is thrown and not caught anywhere.
   * According to Node.js best practices, the process should exit after this.
   *
   * @see https://nodejs.org/api/process.html#warning-using-uncaughtexception-correctly
   */
  process.on('uncaughtException', (error: Error, origin: string) => {
    const cogniError = new CogniCoreError(
      ErrorCode.INTERNAL_ERROR,
      `Uncaught Exception: ${error.message}`,
      {
        component: 'GlobalErrorHandler',
        operation: 'uncaughtException',
        metadata: {
          origin,
          errorName: error.name,
        },
      },
      {
        cause: error,
        severity: ErrorSeverity.CRITICAL,
        isOperational: false, // Programmer error - should crash
      }
    );

    handler.handle(cogniError);
    config.onUncaughtException(error);

    if (config.exitOnUncaughtException) {
      console.error('[FATAL] Exiting due to uncaught exception...');
      // Give time for async logging to complete
      setTimeout(() => process.exit(1), config.exitGracePeriod);
    }
  });

  /**
   * Handle process warnings
   * Useful for catching deprecation warnings, experimental features, etc.
   */
  process.on('warning', (warning: Error) => {
    console.warn(`[PROCESS WARNING] ${warning.name}: ${warning.message}`);
    if (warning.stack) {
      console.warn(warning.stack);
    }
  });

  isInitialized = true;
  console.info('[GlobalErrorHandlers] Initialized successfully');
}

/**
 * Check if global handlers are initialized
 */
export function isGlobalErrorHandlersInitialized(): boolean {
  return isInitialized;
}

/**
 * Reset initialization state (for testing only)
 */
export function resetGlobalErrorHandlers(): void {
  isInitialized = false;
}
