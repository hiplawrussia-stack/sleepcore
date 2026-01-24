/**
 * CogniCore Error Codes
 *
 * Categorized by layer following DDD principles:
 * - DOMAIN_* : Business logic violations
 * - APP_* : Application/Use case errors
 * - INFRA_* : Infrastructure/Technical errors
 * - VALIDATION_* : Input validation errors
 *
 * @see https://khalilstemmler.com/articles/enterprise-typescript-nodejs/functional-error-handling/
 */
export enum ErrorCode {
  // ============================================
  // Domain Layer Errors (Business Logic)
  // ============================================

  /** Belief system errors */
  DOMAIN_BELIEF_UPDATE_FAILED = 'DOMAIN_BELIEF_UPDATE_FAILED',
  DOMAIN_BELIEF_INVALID_OBSERVATION = 'DOMAIN_BELIEF_INVALID_OBSERVATION',
  DOMAIN_BELIEF_DIMENSION_NOT_FOUND = 'DOMAIN_BELIEF_DIMENSION_NOT_FOUND',

  /** Temporal prediction errors */
  DOMAIN_TEMPORAL_NOT_INITIALIZED = 'DOMAIN_TEMPORAL_NOT_INITIALIZED',
  DOMAIN_TEMPORAL_PREDICTION_FAILED = 'DOMAIN_TEMPORAL_PREDICTION_FAILED',
  DOMAIN_TEMPORAL_INVALID_TRAJECTORY = 'DOMAIN_TEMPORAL_INVALID_TRAJECTORY',

  /** Crisis detection errors */
  DOMAIN_CRISIS_DETECTION_FAILED = 'DOMAIN_CRISIS_DETECTION_FAILED',
  DOMAIN_CRISIS_INVALID_STATE = 'DOMAIN_CRISIS_INVALID_STATE',

  /** Intervention errors */
  DOMAIN_INTERVENTION_NOT_FOUND = 'DOMAIN_INTERVENTION_NOT_FOUND',
  DOMAIN_INTERVENTION_SELECTION_FAILED = 'DOMAIN_INTERVENTION_SELECTION_FAILED',
  DOMAIN_INTERVENTION_NO_ELIGIBLE = 'DOMAIN_INTERVENTION_NO_ELIGIBLE',

  /** Metacognition errors */
  DOMAIN_METACOGNITION_INVALID_ITEM = 'DOMAIN_METACOGNITION_INVALID_ITEM',
  DOMAIN_METACOGNITION_ANALYSIS_FAILED = 'DOMAIN_METACOGNITION_ANALYSIS_FAILED',

  /** Causal model errors */
  DOMAIN_CAUSAL_NODE_NOT_FOUND = 'DOMAIN_CAUSAL_NODE_NOT_FOUND',
  DOMAIN_CAUSAL_INVALID_GRAPH = 'DOMAIN_CAUSAL_INVALID_GRAPH',

  // ============================================
  // Application Layer Errors (Use Cases)
  // ============================================

  /** Session management */
  APP_SESSION_NOT_FOUND = 'APP_SESSION_NOT_FOUND',
  APP_SESSION_EXPIRED = 'APP_SESSION_EXPIRED',
  APP_SESSION_START_FAILED = 'APP_SESSION_START_FAILED',
  APP_SESSION_END_FAILED = 'APP_SESSION_END_FAILED',

  /** Message processing */
  APP_MESSAGE_PROCESSING_FAILED = 'APP_MESSAGE_PROCESSING_FAILED',
  APP_MESSAGE_INVALID_FORMAT = 'APP_MESSAGE_INVALID_FORMAT',

  /** Pipeline errors */
  APP_PIPELINE_STAGE_FAILED = 'APP_PIPELINE_STAGE_FAILED',
  APP_PIPELINE_TIMEOUT = 'APP_PIPELINE_TIMEOUT',

  /** Voice processing */
  APP_VOICE_PROCESSING_FAILED = 'APP_VOICE_PROCESSING_FAILED',
  APP_VOICE_TRANSCRIPTION_FAILED = 'APP_VOICE_TRANSCRIPTION_FAILED',

  /** Data export/import */
  APP_EXPORT_FAILED = 'APP_EXPORT_FAILED',
  APP_IMPORT_FAILED = 'APP_IMPORT_FAILED',
  APP_DELETE_FAILED = 'APP_DELETE_FAILED',

  // ============================================
  // Infrastructure Layer Errors (Technical)
  // ============================================

  /** Storage/Repository errors */
  INFRA_STORAGE_READ_FAILED = 'INFRA_STORAGE_READ_FAILED',
  INFRA_STORAGE_WRITE_FAILED = 'INFRA_STORAGE_WRITE_FAILED',
  INFRA_STORAGE_CONNECTION_FAILED = 'INFRA_STORAGE_CONNECTION_FAILED',

  /** External service errors */
  INFRA_EXTERNAL_SERVICE_UNAVAILABLE = 'INFRA_EXTERNAL_SERVICE_UNAVAILABLE',
  INFRA_EXTERNAL_SERVICE_TIMEOUT = 'INFRA_EXTERNAL_SERVICE_TIMEOUT',
  INFRA_EXTERNAL_SERVICE_ERROR = 'INFRA_EXTERNAL_SERVICE_ERROR',

  /** NLP/AI service errors */
  INFRA_NLP_SERVICE_FAILED = 'INFRA_NLP_SERVICE_FAILED',
  INFRA_AI_MODEL_NOT_LOADED = 'INFRA_AI_MODEL_NOT_LOADED',

  // ============================================
  // Validation Errors (Input)
  // ============================================

  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE = 'VALIDATION_OUT_OF_RANGE',
  VALIDATION_INVALID_TYPE = 'VALIDATION_INVALID_TYPE',
  VALIDATION_EMPTY_ARRAY = 'VALIDATION_EMPTY_ARRAY',
  VALIDATION_INVALID_ID = 'VALIDATION_INVALID_ID',

  // ============================================
  // Generic/Unknown Errors
  // ============================================

  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

/**
 * Error severity levels for logging and alerting
 */
export enum ErrorSeverity {
  /** Informational - no action needed */
  LOW = 'low',
  /** Warning - should be investigated */
  MEDIUM = 'medium',
  /** Error - requires attention */
  HIGH = 'high',
  /** Critical - immediate action required */
  CRITICAL = 'critical',
}

/**
 * Error category for classification
 */
export enum ErrorCategory {
  /** Business logic violations */
  DOMAIN = 'domain',
  /** Application/use case failures */
  APPLICATION = 'application',
  /** Infrastructure/technical issues */
  INFRASTRUCTURE = 'infrastructure',
  /** Input validation failures */
  VALIDATION = 'validation',
  /** Unknown/unclassified errors */
  UNKNOWN = 'unknown',
}

/**
 * Mapping of error codes to their categories
 */
export function getErrorCategory(code: ErrorCode): ErrorCategory {
  if (code.startsWith('DOMAIN_')) {return ErrorCategory.DOMAIN;}
  if (code.startsWith('APP_')) {return ErrorCategory.APPLICATION;}
  if (code.startsWith('INFRA_')) {return ErrorCategory.INFRASTRUCTURE;}
  if (code.startsWith('VALIDATION_')) {return ErrorCategory.VALIDATION;}
  return ErrorCategory.UNKNOWN;
}

/**
 * Mapping of error codes to default severity
 */
export function getDefaultSeverity(code: ErrorCode): ErrorSeverity {
  // Critical errors
  if (code.includes('CRISIS')) {return ErrorSeverity.CRITICAL;}

  // High severity
  if (code.startsWith('INFRA_')) {return ErrorSeverity.HIGH;}
  if (code === ErrorCode.INTERNAL_ERROR) {return ErrorSeverity.HIGH;}

  // Medium severity
  if (code.startsWith('DOMAIN_')) {return ErrorSeverity.MEDIUM;}
  if (code.startsWith('APP_')) {return ErrorSeverity.MEDIUM;}

  // Low severity
  if (code.startsWith('VALIDATION_')) {return ErrorSeverity.LOW;}

  return ErrorSeverity.MEDIUM;
}
