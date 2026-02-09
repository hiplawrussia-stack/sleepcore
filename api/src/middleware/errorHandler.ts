/**
 * Error Handler Middleware
 * ========================
 * Global error handling with consistent API responses.
 *
 * Security Controls:
 * - OWASP A01:2021 — Broken Access Control (no info leakage)
 * - Production error sanitization (no stack traces, internal paths)
 * - Safe error messages that don't reveal system internals
 *
 * @packageDocumentation
 * @module api/middleware
 */

import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { ApiResponse } from '../types/index.js';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Safe HTTP error messages for production
 * Maps sensitive error messages to generic ones
 */
const SAFE_ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad request',
  401: 'Authentication required',
  403: 'Access denied',
  404: 'Not found',
  429: 'Too many requests',
  500: 'Internal server error',
  502: 'Service unavailable',
  503: 'Service temporarily unavailable',
};

/**
 * Patterns that indicate sensitive information in error messages
 */
const SENSITIVE_PATTERNS = [
  /database/i,
  /sql/i,
  /query/i,
  /connection/i,
  /password/i,
  /secret/i,
  /key/i,
  /token/i,
  /credential/i,
  /internal/i,
  /stack/i,
  /trace/i,
  /file/i,
  /path/i,
  /\/.*\//,  // File paths
  /:\d+:\d+/,  // Line:column numbers
];

/**
 * Check if error message contains sensitive information
 */
function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Sanitize error message for production
 */
function sanitizeErrorMessage(message: string, statusCode: number): string {
  if (!isProduction) {
    return message;
  }

  // Check for sensitive patterns
  if (containsSensitiveInfo(message)) {
    return SAFE_ERROR_MESSAGES[statusCode] || 'An error occurred';
  }

  // Allow safe, short messages through
  if (message.length < 100 && !message.includes('\n')) {
    return message;
  }

  return SAFE_ERROR_MESSAGES[statusCode] || 'An error occurred';
}

/**
 * Global error handler
 */
export const errorHandler: ErrorHandler = (err, c) => {
  // Log full error for debugging (Sentry will capture this)
  console.error('[API Error]', {
    message: err.message,
    stack: isProduction ? undefined : err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  // Zod validation errors — safe to expose field names
  if (err instanceof ZodError) {
    // Sanitize field paths to not reveal internal structure
    const safeErrors = err.errors.map(e => {
      const field = e.path.join('.');
      return field ? `${field}: ${e.message}` : e.message;
    });

    const response: ApiResponse<null> = {
      success: false,
      error: 'Validation error: ' + safeErrors.join(', '),
      timestamp: Date.now(),
    };
    return c.json(response, 400);
  }

  // HTTP exceptions
  if (err instanceof HTTPException) {
    const safeMessage = sanitizeErrorMessage(err.message, err.status);

    const response: ApiResponse<null> = {
      success: false,
      error: safeMessage,
      timestamp: Date.now(),
    };
    return c.json(response, err.status);
  }

  // Unknown errors — always sanitize in production
  const response: ApiResponse<null> = {
    success: false,
    error: isProduction
      ? 'Internal server error'
      : err.message,
    timestamp: Date.now(),
  };

  return c.json(response, 500);
};

/**
 * 404 Not Found handler
 * Note: Don't expose full path in production (could reveal internal routes)
 */
export const notFoundHandler: NotFoundHandler = (c) => {
  const response: ApiResponse<null> = {
    success: false,
    error: isProduction
      ? 'Not found'
      : `Route not found: ${c.req.method} ${c.req.path}`,
    timestamp: Date.now(),
  };

  return c.json(response, 404);
};
