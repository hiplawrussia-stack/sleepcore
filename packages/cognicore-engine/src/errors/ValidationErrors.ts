import { CogniCoreError, type ErrorContext } from './BaseError';
import { ErrorCode, ErrorSeverity } from './ErrorCodes';

/**
 * Validation Errors
 *
 * These errors represent input validation failures.
 * They are operational errors with low severity.
 */

export class RequiredFieldError extends CogniCoreError {
  constructor(
    public readonly fieldName: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.VALIDATION_REQUIRED_FIELD,
      `Required field missing: ${fieldName}`,
      { component: 'Validator', ...context },
      { severity: ErrorSeverity.LOW }
    );
  }
}

export class InvalidFormatError extends CogniCoreError {
  constructor(
    public readonly fieldName: string,
    public readonly expectedFormat: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.VALIDATION_INVALID_FORMAT,
      `Invalid format for '${fieldName}'. Expected: ${expectedFormat}`,
      { component: 'Validator', ...context },
      { severity: ErrorSeverity.LOW }
    );
  }
}

export class OutOfRangeError extends CogniCoreError {
  constructor(
    public readonly fieldName: string,
    public readonly min: number,
    public readonly max: number,
    public readonly actual: number,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.VALIDATION_OUT_OF_RANGE,
      `Value for '${fieldName}' out of range. Expected: ${min}-${max}, got: ${actual}`,
      { component: 'Validator', ...context },
      { severity: ErrorSeverity.LOW }
    );
  }
}

export class InvalidTypeError extends CogniCoreError {
  constructor(
    public readonly fieldName: string,
    public readonly expectedType: string,
    public readonly actualType: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.VALIDATION_INVALID_TYPE,
      `Invalid type for '${fieldName}'. Expected: ${expectedType}, got: ${actualType}`,
      { component: 'Validator', ...context },
      { severity: ErrorSeverity.LOW }
    );
  }
}

export class EmptyArrayError extends CogniCoreError {
  constructor(
    public readonly fieldName: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.VALIDATION_EMPTY_ARRAY,
      `Array '${fieldName}' cannot be empty`,
      { component: 'Validator', ...context },
      { severity: ErrorSeverity.LOW }
    );
  }
}

export class InvalidIdError extends CogniCoreError {
  constructor(
    public readonly idType: string,
    public readonly invalidValue: string,
    context?: ErrorContext
  ) {
    super(
      ErrorCode.VALIDATION_INVALID_ID,
      `Invalid ${idType} ID: ${invalidValue}`,
      { component: 'Validator', ...context },
      { severity: ErrorSeverity.LOW }
    );
  }
}
