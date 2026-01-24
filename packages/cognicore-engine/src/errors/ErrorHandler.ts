import type { ErrorContext } from './BaseError';
import { CogniCoreError } from './BaseError';
import { ErrorCode, ErrorSeverity, ErrorCategory } from './ErrorCodes';

/**
 * Error handler callback type
 */
export type ErrorCallback = (error: CogniCoreError) => void;

/**
 * Logger interface for dependency injection
 */
export interface ErrorLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Default console logger
 */
const defaultLogger: ErrorLogger = {
  debug: (msg, meta) => { console.debug(`[DEBUG] ${msg}`, meta ?? ''); },
  info: (msg, meta) => { console.info(`[INFO] ${msg}`, meta ?? ''); },
  warn: (msg, meta) => { console.warn(`[WARN] ${msg}`, meta ?? ''); },
  error: (msg, meta) => { console.error(`[ERROR] ${msg}`, meta ?? ''); },
};

/**
 * Configuration for ErrorHandler
 */
export interface ErrorHandlerConfig {
  /** Custom logger implementation */
  logger?: ErrorLogger;
  /** Whether to include stack traces in logs */
  includeStackTrace?: boolean;
  /** Callback for critical errors (e.g., send to alerting system) */
  onCriticalError?: ErrorCallback;
  /** Callback for all errors (e.g., send to error tracking service) */
  onError?: ErrorCallback;
  /** Environment (affects logging verbosity) */
  environment?: 'development' | 'production' | 'test';
}

/**
 * Centralized Error Handler
 *
 * Provides:
 * - Consistent error handling across the application
 * - Structured logging with severity levels
 * - Error categorization and classification
 * - Callbacks for alerting and monitoring integration
 *
 * @example
 * ```typescript
 * const handler = ErrorHandler.getInstance();
 *
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handler.handle(error, {
 *     component: 'MyComponent',
 *     operation: 'someOperation'
 *   });
 * }
 * ```
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: Required<ErrorHandlerConfig>;
  private errorCounts = new Map<ErrorCode, number>();

  private constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      logger: config.logger ?? defaultLogger,
      includeStackTrace: config.includeStackTrace ?? true,
      onCriticalError: config.onCriticalError ?? (() => {}),
      onError: config.onError ?? (() => {}),
      environment: config.environment ?? 'development',
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ErrorHandlerConfig): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    ErrorHandler.instance = undefined as unknown as ErrorHandler;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Handle an error - the main entry point
   *
   * @param error - The error to handle (can be any type)
   * @param context - Additional context for logging
   * @param defaultCode - Default error code if error is not CogniCoreError
   * @returns The normalized CogniCoreError
   */
  handle(
    error: unknown,
    context: ErrorContext = {},
    defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR
  ): CogniCoreError {
    // Normalize to CogniCoreError
    const normalizedError = CogniCoreError.fromUnknown(error, defaultCode, context);

    // Track error counts
    this.incrementErrorCount(normalizedError.code);

    // Log based on severity
    this.logError(normalizedError);

    // Trigger callbacks
    this.config.onError(normalizedError);

    if (normalizedError.severity === ErrorSeverity.CRITICAL) {
      this.config.onCriticalError(normalizedError);
    }

    return normalizedError;
  }

  /**
   * Handle error and return a safe response for API
   */
  handleForResponse(
    error: unknown,
    context: ErrorContext = {},
    defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR
  ): { code: string; message: string; timestamp: string } {
    const normalizedError = this.handle(error, context, defaultCode);
    return normalizedError.toClientResponse();
  }

  /**
   * Wrap an async function with error handling
   */
  wrapAsync<T, Args extends unknown[]>(
    fn: (...args: Args) => Promise<T>,
    context: ErrorContext = {},
    defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR
  ): (...args: Args) => Promise<T> {
    return async (...args: Args): Promise<T> => {
      try {
        return await fn(...args);
      } catch (error) {
        throw this.handle(error, context, defaultCode);
      }
    };
  }

  /**
   * Wrap a sync function with error handling
   */
  wrapSync<T, Args extends unknown[]>(
    fn: (...args: Args) => T,
    context: ErrorContext = {},
    defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR
  ): (...args: Args) => T {
    return (...args: Args): T => {
      try {
        return fn(...args);
      } catch (error) {
        throw this.handle(error, context, defaultCode);
      }
    };
  }

  /**
   * Log error based on severity
   */
  private logError(error: CogniCoreError): void {
    const serialized = error.toJSON();
    const logData: Record<string, unknown> = {
      code: serialized.code,
      category: serialized.category,
      severity: serialized.severity,
      timestamp: serialized.timestamp,
      context: serialized.context,
    };

    if (this.config.includeStackTrace && serialized.stack) {
      logData.stack = serialized.stack;
    }

    if (serialized.cause) {
      logData.cause = serialized.cause;
    }

    const message = `[${error.code}] ${error.message}`;

    switch (error.severity) {
      case ErrorSeverity.LOW:
        this.config.logger.debug(message, logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.config.logger.info(message, logData);
        break;
      case ErrorSeverity.HIGH:
        this.config.logger.warn(message, logData);
        break;
      case ErrorSeverity.CRITICAL:
        this.config.logger.error(message, logData);
        break;
    }
  }

  /**
   * Increment error count for tracking
   */
  private incrementErrorCount(code: ErrorCode): void {
    const current = this.errorCounts.get(code) ?? 0;
    this.errorCounts.set(code, current + 1);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const byCode: Record<string, number> = {};
    const byCategory: Record<string, number> = {
      [ErrorCategory.DOMAIN]: 0,
      [ErrorCategory.APPLICATION]: 0,
      [ErrorCategory.INFRASTRUCTURE]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.UNKNOWN]: 0,
    };
    const bySeverity: Record<string, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    let total = 0;

    this.errorCounts.forEach((count, code) => {
      byCode[code] = count;
      total += count;

      // Categorize
      if (code.startsWith('DOMAIN_')) {
        byCategory[ErrorCategory.DOMAIN] = (byCategory[ErrorCategory.DOMAIN] ?? 0) + count;
      } else if (code.startsWith('APP_')) {
        byCategory[ErrorCategory.APPLICATION] = (byCategory[ErrorCategory.APPLICATION] ?? 0) + count;
      } else if (code.startsWith('INFRA_')) {
        byCategory[ErrorCategory.INFRASTRUCTURE] = (byCategory[ErrorCategory.INFRASTRUCTURE] ?? 0) + count;
      } else if (code.startsWith('VALIDATION_')) {
        byCategory[ErrorCategory.VALIDATION] = (byCategory[ErrorCategory.VALIDATION] ?? 0) + count;
      } else {
        byCategory[ErrorCategory.UNKNOWN] = (byCategory[ErrorCategory.UNKNOWN] ?? 0) + count;
      }

      // Severity (simplified - would need actual error instances for accurate)
      if (code.includes('CRISIS')) {
        bySeverity[ErrorSeverity.CRITICAL] = (bySeverity[ErrorSeverity.CRITICAL] ?? 0) + count;
      } else if (code.startsWith('INFRA_')) {
        bySeverity[ErrorSeverity.HIGH] = (bySeverity[ErrorSeverity.HIGH] ?? 0) + count;
      } else if (code.startsWith('VALIDATION_')) {
        bySeverity[ErrorSeverity.LOW] = (bySeverity[ErrorSeverity.LOW] ?? 0) + count;
      } else {
        bySeverity[ErrorSeverity.MEDIUM] = (bySeverity[ErrorSeverity.MEDIUM] ?? 0) + count;
      }
    });

    return { total, byCode, byCategory, bySeverity };
  }

  /**
   * Reset error statistics
   */
  resetErrorStats(): void {
    this.errorCounts.clear();
  }

  /**
   * Check if error should crash the process (programmer error)
   */
  shouldCrash(error: CogniCoreError): boolean {
    return !error.isOperational;
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = ErrorHandler.getInstance();
