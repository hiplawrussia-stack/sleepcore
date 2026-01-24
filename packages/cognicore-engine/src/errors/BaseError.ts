import {
  ErrorCode,
  type ErrorSeverity,
  type ErrorCategory,
  getErrorCategory,
  getDefaultSeverity,
} from './ErrorCodes';

/**
 * Error context for structured logging
 */
export interface ErrorContext {
  /** Unique correlation ID for tracing */
  correlationId?: string;
  /** User ID if available */
  userId?: string;
  /** Session ID if available */
  sessionId?: string;
  /** Component/module where error occurred */
  component?: string;
  /** Operation that failed */
  operation?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Serialized error format for API responses and logging
 */
export interface SerializedError {
  code: ErrorCode;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: string;
  context?: ErrorContext;
  cause?: string;
  stack?: string;
}

/**
 * Base error class for all CogniCore errors
 *
 * Provides:
 * - Structured error codes
 * - Severity classification
 * - Context for debugging
 * - Serialization for logging/API responses
 *
 * @example
 * ```typescript
 * throw new CogniCoreError(
 *   ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED,
 *   'Failed to update belief state',
 *   { component: 'BeliefUpdateEngine', operation: 'updateCognitiveDimension' }
 * );
 * ```
 */
export class CogniCoreError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {},
    options?: {
      cause?: Error;
      severity?: ErrorSeverity;
      isOperational?: boolean;
    }
  ) {
    super(message, { cause: options?.cause });

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = code;
    this.category = getErrorCategory(code);
    this.severity = options?.severity ?? getDefaultSeverity(code);
    this.context = context;
    this.timestamp = new Date();

    // Operational errors are expected and can be handled gracefully
    // Non-operational errors are programmer bugs that should crash
    this.isOperational = options?.isOperational ?? true;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for logging or API response
   */
  toJSON(): SerializedError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }

  /**
   * Create a safe version of error for client response (no sensitive data)
   */
  toClientResponse(): Pick<SerializedError, 'code' | 'message' | 'timestamp'> {
    return {
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Create CogniCoreError from unknown error
   */
  static fromUnknown(
    error: unknown,
    defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    context: ErrorContext = {}
  ): CogniCoreError {
    if (error instanceof CogniCoreError) {
      return error;
    }

    if (error instanceof Error) {
      return new CogniCoreError(defaultCode, error.message, context, {
        cause: error,
      });
    }

    return new CogniCoreError(
      defaultCode,
      typeof error === 'string' ? error : 'An unknown error occurred',
      context
    );
  }

  /**
   * Check if error is a specific type
   */
  static isErrorCode(error: unknown, code: ErrorCode): boolean {
    return error instanceof CogniCoreError && error.code === code;
  }

  /**
   * Check if error belongs to a category
   */
  static isCategory(error: unknown, category: ErrorCategory): boolean {
    return error instanceof CogniCoreError && error.category === category;
  }
}
