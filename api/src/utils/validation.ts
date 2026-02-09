/**
 * Query Parameter Validation Utilities
 * =====================================
 * Safe parsing and validation for query parameters.
 *
 * Security Controls:
 * - OWASP A03:2021 — Injection
 * - Prevent NaN/Infinity injection
 * - Enforce safe ranges
 *
 * @packageDocumentation
 * @module api/utils
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ParseIntOptions {
  /** Default value if parsing fails or value is missing */
  default: number;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
}

export interface ParseBoolOptions {
  /** Default value if parsing fails or value is missing */
  default: boolean;
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Safely parse an integer query parameter
 *
 * @param value Query parameter value (string | undefined)
 * @param options Parsing options with default, min, max
 * @returns Validated integer within bounds
 *
 * @example
 * ```typescript
 * const limit = safeParseInt(c.req.query('limit'), { default: 100, min: 1, max: 1000 });
 * const since = safeParseInt(c.req.query('since'), { default: 0, min: 0 });
 * ```
 */
export function safeParseInt(
  value: string | undefined,
  options: ParseIntOptions
): number {
  const { default: defaultValue, min, max } = options;

  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  // Parse as integer
  const parsed = parseInt(value, 10);

  // Check for NaN or Infinity
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  // Apply bounds
  let result = parsed;

  if (min !== undefined && result < min) {
    result = min;
  }

  if (max !== undefined && result > max) {
    result = max;
  }

  return result;
}

/**
 * Safely parse a float query parameter
 *
 * @param value Query parameter value (string | undefined)
 * @param options Parsing options with default, min, max
 * @returns Validated float within bounds
 */
export function safeParseFloat(
  value: string | undefined,
  options: ParseIntOptions
): number {
  const { default: defaultValue, min, max } = options;

  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  // Parse as float
  const parsed = parseFloat(value);

  // Check for NaN or Infinity
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  // Apply bounds
  let result = parsed;

  if (min !== undefined && result < min) {
    result = min;
  }

  if (max !== undefined && result > max) {
    result = max;
  }

  return result;
}

/**
 * Safely parse a boolean query parameter
 *
 * @param value Query parameter value (string | undefined)
 * @param options Parsing options with default
 * @returns Validated boolean
 *
 * @example
 * ```typescript
 * const includeDeleted = safeParseBool(c.req.query('includeDeleted'), { default: false });
 * ```
 */
export function safeParseBool(
  value: string | undefined,
  options: ParseBoolOptions
): boolean {
  const { default: defaultValue } = options;

  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const lower = value.toLowerCase();

  if (lower === 'true' || lower === '1' || lower === 'yes') {
    return true;
  }

  if (lower === 'false' || lower === '0' || lower === 'no') {
    return false;
  }

  return defaultValue;
}

/**
 * Validate and sanitize a string query parameter
 *
 * @param value Query parameter value
 * @param options Validation options
 * @returns Sanitized string or undefined
 */
export function safeParseString(
  value: string | undefined,
  options: {
    default?: string;
    maxLength?: number;
    pattern?: RegExp;
    allowedValues?: readonly string[];
  } = {}
): string | undefined {
  const { default: defaultValue, maxLength, pattern, allowedValues } = options;

  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  let result = value;

  // Enforce max length
  if (maxLength !== undefined && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }

  // Check pattern
  if (pattern !== undefined && !pattern.test(result)) {
    return defaultValue;
  }

  // Check allowed values
  if (allowedValues !== undefined && !allowedValues.includes(result)) {
    return defaultValue;
  }

  return result;
}

/**
 * Common validation constants for query parameters
 */
export const QUERY_LIMITS = {
  /** Maximum items per page for pagination */
  MAX_PAGE_SIZE: 1000,
  /** Default page size */
  DEFAULT_PAGE_SIZE: 100,
  /** Maximum timestamp value (year 3000) */
  MAX_TIMESTAMP: 32503680000000,
  /** Minimum timestamp value (year 2020) */
  MIN_TIMESTAMP: 1577836800000,
} as const;
