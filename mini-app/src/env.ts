/**
 * Environment Configuration
 * =========================
 * Type-safe environment variables with build-time validation.
 *
 * Uses @t3-oss/env-core for:
 * - Build-time validation (fails CI/CD, not production)
 * - Type-safe access with IDE autocomplete
 * - Clear error messages for missing/invalid vars
 *
 * IEC 62304 Compliance:
 * - Configuration management per §5.1.9
 * - Fail-fast prevents misconfigured deployments
 *
 * @module @sleepcore/mini-app/env
 */

import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

/**
 * Validated environment configuration
 *
 * Access via: `import { env } from '@/env'`
 *
 * @example
 * ```ts
 * import { env } from '@/env';
 *
 * const apiUrl = env.VITE_API_URL; // string (typed!)
 * const dsn = env.VITE_SENTRY_DSN; // string | undefined
 * ```
 */
export const env = createEnv({
  /**
   * Client-side variables (exposed to browser)
   * Must be prefixed with VITE_ for Vite to expose them
   */
  clientPrefix: 'VITE_',

  client: {
    /**
     * Backend API URL
     * @default '/api' (relative path for same-origin)
     */
    VITE_API_URL: z
      .string()
      .url('VITE_API_URL must be a valid URL')
      .optional()
      .default('/api'),

    /**
     * Sentry DSN for error monitoring
     * Optional - app works without it (graceful degradation)
     */
    VITE_SENTRY_DSN: z
      .string()
      .url('VITE_SENTRY_DSN must be a valid Sentry DSN URL')
      .optional(),

    /**
     * Application version for Sentry releases
     * @default '1.0.0'
     */
    VITE_APP_VERSION: z.string().optional().default('1.0.0'),
  },

  /**
   * Vite built-in variables (always available)
   */
  shared: {
    /**
     * Development mode flag
     */
    DEV: z.boolean(),

    /**
     * Production mode flag
     */
    PROD: z.boolean(),

    /**
     * Current mode (development | production | test)
     */
    MODE: z.enum(['development', 'production', 'test']),
  },

  /**
   * Runtime environment source
   * Vite exposes env vars via import.meta.env
   */
  runtimeEnv: {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    MODE: import.meta.env.MODE,
  },

  /**
   * Treat empty strings as undefined
   * Prevents "" from bypassing .optional()
   */
  emptyStringAsUndefined: true,

  /**
   * Custom error handler for validation failures
   * Provides clear, actionable error messages
   */
  onValidationError: (issues) => {
    console.error('❌ Invalid environment configuration:');
    issues.forEach((issue) => {
      const path = issue.path?.join('.') || 'unknown';
      console.error(`  - ${path}: ${issue.message}`);
    });
    throw new Error('Invalid environment configuration. Check console for details.');
  },

  /**
   * Called when server-side env is accessed on client
   * Not applicable for frontend-only app, but good practice
   */
  onInvalidAccess: (variable) => {
    throw new Error(`❌ Attempted to access server-side env variable: ${variable}`);
  },
});

/**
 * Type-safe environment for external use
 */
export type Env = typeof env;
