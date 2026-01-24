import { CogniCoreError, type ErrorContext } from './BaseError';
import { ErrorCode, ErrorSeverity } from './ErrorCodes';

/**
 * Infrastructure Layer Errors
 *
 * These errors represent technical/system-level failures.
 * Storage, external services, and system resource issues.
 */

// ============================================
// Storage Errors
// ============================================

export class StorageReadError extends CogniCoreError {
  constructor(
    public readonly storageType: string,
    message: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(ErrorCode.INFRA_STORAGE_READ_FAILED, message, {
      component: storageType,
      ...context,
    }, { cause, severity: ErrorSeverity.HIGH });
  }
}

export class StorageWriteError extends CogniCoreError {
  constructor(
    public readonly storageType: string,
    message: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(ErrorCode.INFRA_STORAGE_WRITE_FAILED, message, {
      component: storageType,
      ...context,
    }, { cause, severity: ErrorSeverity.HIGH });
  }
}

export class StorageConnectionError extends CogniCoreError {
  constructor(
    public readonly storageType: string,
    message: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(ErrorCode.INFRA_STORAGE_CONNECTION_FAILED, message, {
      component: storageType,
      ...context,
    }, { cause, severity: ErrorSeverity.CRITICAL });
  }
}

// ============================================
// External Service Errors
// ============================================

export class ExternalServiceUnavailableError extends CogniCoreError {
  constructor(
    public readonly serviceName: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(
      ErrorCode.INFRA_EXTERNAL_SERVICE_UNAVAILABLE,
      `External service unavailable: ${serviceName}`,
      { component: serviceName, ...context },
      { cause, severity: ErrorSeverity.HIGH }
    );
  }
}

export class ExternalServiceTimeoutError extends CogniCoreError {
  constructor(
    public readonly serviceName: string,
    public readonly timeoutMs: number,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.INFRA_EXTERNAL_SERVICE_TIMEOUT,
      `External service '${serviceName}' timed out after ${timeoutMs}ms`,
      { component: serviceName, ...context },
      { severity: ErrorSeverity.HIGH }
    );
  }
}

export class ExternalServiceError extends CogniCoreError {
  constructor(
    public readonly serviceName: string,
    message: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(ErrorCode.INFRA_EXTERNAL_SERVICE_ERROR, message, {
      component: serviceName,
      ...context,
    }, { cause, severity: ErrorSeverity.HIGH });
  }
}

// ============================================
// NLP/AI Service Errors
// ============================================

export class NLPServiceError extends CogniCoreError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(ErrorCode.INFRA_NLP_SERVICE_FAILED, message, {
      component: 'NLPService',
      ...context,
    }, { cause, severity: ErrorSeverity.HIGH });
  }
}

export class AIModelNotLoadedError extends CogniCoreError {
  constructor(
    public readonly modelName: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.INFRA_AI_MODEL_NOT_LOADED,
      `AI model not loaded: ${modelName}`,
      { component: 'AIModelLoader', ...context },
      { severity: ErrorSeverity.HIGH }
    );
  }
}
