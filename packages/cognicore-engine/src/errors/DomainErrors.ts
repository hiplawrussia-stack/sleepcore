import { CogniCoreError, type ErrorContext } from './BaseError';
import { ErrorCode, ErrorSeverity } from './ErrorCodes';

/**
 * Domain Layer Errors
 *
 * These errors represent business logic violations and invariant failures.
 * They are operational errors that should be handled gracefully.
 */

// ============================================
// Belief System Errors
// ============================================

export class BeliefUpdateError extends CogniCoreError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(ErrorCode.DOMAIN_BELIEF_UPDATE_FAILED, message, {
      component: 'BeliefUpdateEngine',
      ...context,
    }, { cause });
  }
}

export class InvalidObservationError extends CogniCoreError {
  constructor(
    public readonly observationType: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(
      ErrorCode.DOMAIN_BELIEF_INVALID_OBSERVATION,
      `Invalid observation type: ${observationType}`,
      { component: 'BeliefUpdateEngine', ...context },
      { cause }
    );
  }
}

export class DimensionNotFoundError extends CogniCoreError {
  constructor(
    public readonly dimensionId: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.DOMAIN_BELIEF_DIMENSION_NOT_FOUND,
      `Dimension not found: ${dimensionId}`,
      { component: 'BeliefUpdateEngine', ...context }
    );
  }
}

// ============================================
// Temporal Prediction Errors
// ============================================

export class TemporalNotInitializedError extends CogniCoreError {
  constructor(
    public readonly engineType: 'PLRNN' | 'KalmanFormer' | 'Hybrid',
    context?: ErrorContext
  ) {
    super(
      ErrorCode.DOMAIN_TEMPORAL_NOT_INITIALIZED,
      `${engineType} engine not initialized. Call initialize() first.`,
      { component: `${engineType}Engine`, ...context }
    );
  }
}

export class PredictionError extends CogniCoreError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(ErrorCode.DOMAIN_TEMPORAL_PREDICTION_FAILED, message, {
      component: 'TemporalEngine',
      ...context,
    }, { cause });
  }
}

export class InvalidTrajectoryError extends CogniCoreError {
  constructor(
    public readonly reason: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.DOMAIN_TEMPORAL_INVALID_TRAJECTORY,
      `Invalid trajectory: ${reason}`,
      { component: 'TemporalEngine', ...context }
    );
  }
}

// ============================================
// Crisis Detection Errors
// ============================================

export class CrisisDetectionError extends CogniCoreError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(ErrorCode.DOMAIN_CRISIS_DETECTION_FAILED, message, {
      component: 'CrisisDetector',
      ...context,
    }, { cause, severity: ErrorSeverity.CRITICAL });
  }
}

export class InvalidCrisisStateError extends CogniCoreError {
  constructor(
    public readonly currentState: string,
    public readonly attemptedAction: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.DOMAIN_CRISIS_INVALID_STATE,
      `Cannot ${attemptedAction} in crisis state: ${currentState}`,
      { component: 'CrisisManager', ...context },
      { severity: ErrorSeverity.CRITICAL }
    );
  }
}

// ============================================
// Intervention Errors
// ============================================

export class InterventionNotFoundError extends CogniCoreError {
  constructor(
    public readonly interventionId: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.DOMAIN_INTERVENTION_NOT_FOUND,
      `Intervention not found: ${interventionId}`,
      { component: 'InterventionOptimizer', ...context }
    );
  }
}

export class InterventionSelectionError extends CogniCoreError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(ErrorCode.DOMAIN_INTERVENTION_SELECTION_FAILED, message, {
      component: 'InterventionOptimizer',
      ...context,
    }, { cause });
  }
}

export class NoEligibleInterventionsError extends CogniCoreError {
  constructor(
    public readonly reason: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.DOMAIN_INTERVENTION_NO_ELIGIBLE,
      `No eligible interventions: ${reason}`,
      { component: 'InterventionOptimizer', ...context }
    );
  }
}

// ============================================
// Metacognition Errors
// ============================================

export class InvalidMetacognitionItemError extends CogniCoreError {
  constructor(
    public readonly itemId: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.DOMAIN_METACOGNITION_INVALID_ITEM,
      `Invalid MCQ-30 item ID: ${itemId}`,
      { component: 'MetacognitiveEngine', ...context }
    );
  }
}

export class MetacognitionAnalysisError extends CogniCoreError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(ErrorCode.DOMAIN_METACOGNITION_ANALYSIS_FAILED, message, {
      component: 'MetacognitiveEngine',
      ...context,
    }, { cause });
  }
}

// ============================================
// Causal Model Errors
// ============================================

export class CausalNodeNotFoundError extends CogniCoreError {
  constructor(
    public readonly nodeId: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.DOMAIN_CAUSAL_NODE_NOT_FOUND,
      `Causal node not found: ${nodeId}`,
      { component: 'CausalEngine', ...context }
    );
  }
}

export class InvalidCausalGraphError extends CogniCoreError {
  constructor(
    public readonly reason: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.DOMAIN_CAUSAL_INVALID_GRAPH,
      `Invalid causal graph: ${reason}`,
      { component: 'CausalEngine', ...context }
    );
  }
}
