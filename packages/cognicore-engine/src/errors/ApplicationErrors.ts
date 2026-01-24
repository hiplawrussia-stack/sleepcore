import { CogniCoreError, type ErrorContext } from './BaseError';
import { ErrorCode } from './ErrorCodes';

/**
 * Application Layer Errors
 *
 * These errors represent use case failures and coordination issues.
 * They occur when orchestrating domain operations.
 */

// ============================================
// Session Management Errors
// ============================================

export class SessionNotFoundError extends CogniCoreError {
  constructor(
    public readonly sessionId: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.APP_SESSION_NOT_FOUND,
      `Session not found: ${sessionId}`,
      { component: 'SessionManager', ...context }
    );
  }
}

export class SessionExpiredError extends CogniCoreError {
  constructor(
    public readonly sessionId: string,
    public readonly expiredAt: Date,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.APP_SESSION_EXPIRED,
      `Session expired: ${sessionId} at ${expiredAt.toISOString()}`,
      { component: 'SessionManager', ...context }
    );
  }
}

export class SessionStartError extends CogniCoreError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(ErrorCode.APP_SESSION_START_FAILED, message, {
      component: 'SessionManager',
      ...context,
    }, { cause });
  }
}

export class SessionEndError extends CogniCoreError {
  constructor(
    public readonly sessionId: string,
    message: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(ErrorCode.APP_SESSION_END_FAILED, message, {
      component: 'SessionManager',
      sessionId,
      ...context,
    }, { cause });
  }
}

// ============================================
// Message Processing Errors
// ============================================

export class MessageProcessingError extends CogniCoreError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(ErrorCode.APP_MESSAGE_PROCESSING_FAILED, message, {
      component: 'MessageProcessor',
      ...context,
    }, { cause });
  }
}

export class InvalidMessageFormatError extends CogniCoreError {
  constructor(
    public readonly expectedFormat: string,
    public readonly received: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.APP_MESSAGE_INVALID_FORMAT,
      `Invalid message format. Expected: ${expectedFormat}, received: ${received}`,
      { component: 'MessageProcessor', ...context }
    );
  }
}

// ============================================
// Pipeline Errors
// ============================================

export class PipelineStageError extends CogniCoreError {
  constructor(
    public readonly stageName: string,
    message: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(ErrorCode.APP_PIPELINE_STAGE_FAILED, message, {
      component: 'MessageProcessingPipeline',
      operation: stageName,
      ...context,
    }, { cause });
  }
}

export class PipelineTimeoutError extends CogniCoreError {
  constructor(
    public readonly stageName: string,
    public readonly timeoutMs: number,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.APP_PIPELINE_TIMEOUT,
      `Pipeline stage '${stageName}' timed out after ${timeoutMs}ms`,
      { component: 'MessageProcessingPipeline', operation: stageName, ...context }
    );
  }
}

// ============================================
// Voice Processing Errors
// ============================================

export class VoiceProcessingError extends CogniCoreError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(ErrorCode.APP_VOICE_PROCESSING_FAILED, message, {
      component: 'VoiceInputAdapter',
      ...context,
    }, { cause });
  }
}

export class TranscriptionError extends CogniCoreError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(ErrorCode.APP_VOICE_TRANSCRIPTION_FAILED, message, {
      component: 'VoiceInputAdapter',
      ...context,
    }, { cause });
  }
}

// ============================================
// Data Operations Errors
// ============================================

export class DataExportError extends CogniCoreError {
  constructor(
    public readonly userId: string,
    message: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(ErrorCode.APP_EXPORT_FAILED, message, {
      component: 'DataExporter',
      userId,
      ...context,
    }, { cause });
  }
}

export class DataImportError extends CogniCoreError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(ErrorCode.APP_IMPORT_FAILED, message, {
      component: 'DataImporter',
      ...context,
    }, { cause });
  }
}

export class DataDeleteError extends CogniCoreError {
  constructor(
    public readonly userId: string,
    message: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(ErrorCode.APP_DELETE_FAILED, message, {
      component: 'DataManager',
      userId,
      ...context,
    }, { cause });
  }
}
