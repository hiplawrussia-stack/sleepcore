/**
 * Error Handler Middleware
 * ========================
 * Global error handling with consistent API responses.
 */

import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { ApiResponse } from '../types/index.js';

/**
 * Global error handler
 */
export const errorHandler: ErrorHandler = (err, c) => {
  console.error('[API Error]', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Validation error: ' + err.errors.map(e => e.message).join(', '),
      timestamp: Date.now(),
    };
    return c.json(response, 400);
  }

  // HTTP exceptions (from authMiddleware, etc.)
  if (err instanceof HTTPException) {
    const response: ApiResponse<null> = {
      success: false,
      error: err.message,
      timestamp: Date.now(),
    };
    return c.json(response, err.status);
  }

  // Unknown errors
  const response: ApiResponse<null> = {
    success: false,
    error: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Internal server error',
    timestamp: Date.now(),
  };

  return c.json(response, 500);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler: NotFoundHandler = (c) => {
  const response: ApiResponse<null> = {
    success: false,
    error: `Route not found: ${c.req.method} ${c.req.path}`,
    timestamp: Date.now(),
  };

  return c.json(response, 404);
};
