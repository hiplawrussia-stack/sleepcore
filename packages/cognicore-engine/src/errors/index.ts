/**
 * CogniCore Error Handling Module
 *
 * Centralized error handling infrastructure following 2025-2026 best practices:
 *
 * - Custom error class hierarchy
 * - Error codes and categorization (Domain/Application/Infrastructure/Validation)
 * - Severity levels (Low/Medium/High/Critical)
 * - Operational vs Programmer error distinction
 * - Centralized ErrorHandler with logging and callbacks
 * - Global process error handlers
 *
 * @example
 * ```typescript
 * import {
 *   CogniCoreError,
 *   ErrorCode,
 *   ErrorHandler,
 *   initializeGlobalErrorHandlers,
 *   BeliefUpdateError,
 * } from './errors';
 *
 * // Initialize global handlers at startup
 * initializeGlobalErrorHandlers();
 *
 * // Use centralized handler
 * const handler = ErrorHandler.getInstance();
 *
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const handled = handler.handle(error, { component: 'MyComponent' });
 *   return { error: handled.toClientResponse() };
 * }
 *
 * // Or throw specific errors
 * throw new BeliefUpdateError('Failed to update cognitive dimension');
 * ```
 *
 * @module errors
 */

// Base classes and types
export { CogniCoreError } from './BaseError';
export type { ErrorContext, SerializedError } from './BaseError';

// Error codes and enums
export {
  ErrorCode,
  ErrorSeverity,
  ErrorCategory,
  getErrorCategory,
  getDefaultSeverity,
} from './ErrorCodes';

// Domain errors
export {
  BeliefUpdateError,
  InvalidObservationError,
  DimensionNotFoundError,
  TemporalNotInitializedError,
  PredictionError,
  InvalidTrajectoryError,
  CrisisDetectionError,
  InvalidCrisisStateError,
  InterventionNotFoundError,
  InterventionSelectionError,
  NoEligibleInterventionsError,
  InvalidMetacognitionItemError,
  MetacognitionAnalysisError,
  CausalNodeNotFoundError,
  InvalidCausalGraphError,
} from './DomainErrors';

// Application errors
export {
  SessionNotFoundError,
  SessionExpiredError,
  SessionStartError,
  SessionEndError,
  MessageProcessingError,
  InvalidMessageFormatError,
  PipelineStageError,
  PipelineTimeoutError,
  VoiceProcessingError,
  TranscriptionError,
  DataExportError,
  DataImportError,
  DataDeleteError,
} from './ApplicationErrors';

// Infrastructure errors
export {
  StorageReadError,
  StorageWriteError,
  StorageConnectionError,
  ExternalServiceUnavailableError,
  ExternalServiceTimeoutError,
  ExternalServiceError,
  NLPServiceError,
  AIModelNotLoadedError,
} from './InfrastructureErrors';

// Validation errors
export {
  RequiredFieldError,
  InvalidFormatError,
  OutOfRangeError,
  InvalidTypeError,
  EmptyArrayError,
  InvalidIdError,
} from './ValidationErrors';

// Error handler
export { ErrorHandler, errorHandler } from './ErrorHandler';
export type { ErrorCallback, ErrorLogger, ErrorHandlerConfig } from './ErrorHandler';

// Global handlers
export {
  initializeGlobalErrorHandlers,
  isGlobalErrorHandlersInitialized,
  resetGlobalErrorHandlers,
} from './GlobalErrorHandlers';
export type { GlobalErrorHandlerOptions } from './GlobalErrorHandlers';
