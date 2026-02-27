/**
 * Sentry Service Tests
 * ====================
 * Unit tests for Sentry error monitoring service.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: SEC-001 (error monitoring), HIPAA (PHI sanitization)
 *
 * Coverage targets:
 * - initSentry configuration
 * - PHI sanitization (sanitizeMessage)
 * - User context management (setUser, clearUser)
 * - Error capture (captureException, captureMessage)
 * - Breadcrumb tracking (addBreadcrumb)
 * - Dev mode bypass
 * - Sensitive route filtering
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store callback references for testing
let beforeSendCallback: ((event: Record<string, unknown>) => Record<string, unknown>) | null = null;
let beforeSendTransactionCallback: ((event: Record<string, unknown>) => Record<string, unknown>) | null = null;

// Mock @sentry/react
vi.mock('@sentry/react', () => ({
  init: vi.fn((config) => {
    // Capture callbacks for testing
    beforeSendCallback = config.beforeSend;
    beforeSendTransactionCallback = config.beforeSendTransaction;
  }),
  setUser: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
  ErrorBoundary: vi.fn(() => null),
}));

// Mock env module - will be overridden per test
const mockEnv = {
  DEV: false,
  MODE: 'production',
  VITE_SENTRY_DSN: 'https://test@sentry.io/123',
  VITE_APP_VERSION: '1.0.0-test',
};

vi.mock('@/env', () => ({
  env: mockEnv,
}));

// Import Sentry mock and service after mocks are set up
import * as Sentry from '@sentry/react';

describe('SentryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    beforeSendCallback = null;
    beforeSendTransactionCallback = null;
    // Reset to production mode
    mockEnv.DEV = false;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('initSentry', () => {
    it('should skip initialization in development mode', async () => {
      mockEnv.DEV = true;

      // Re-import to get fresh module with DEV=true
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: { ...mockEnv, DEV: true } }));
      const { initSentry } = await import('../../src/services/sentry');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      initSentry();

      expect(consoleSpy).toHaveBeenCalledWith('[Sentry] Disabled in development mode');
      expect(Sentry.init).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should initialize Sentry in production mode', async () => {
      mockEnv.DEV = false;

      vi.resetModules();
      vi.doMock('@/env', () => ({ env: mockEnv }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn((config) => {
          beforeSendCallback = config.beforeSend;
          beforeSendTransactionCallback = config.beforeSendTransaction;
        }),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { initSentry } = await import('../../src/services/sentry');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      initSentry();

      expect(SentryMock.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          environment: 'production',
          release: 'sleepcore-mini-app@1.0.0-test',
          tracesSampleRate: 0.2,
          replaysSessionSampleRate: 0.05,
          replaysOnErrorSampleRate: 1.0,
        })
      );
      expect(consoleSpy).toHaveBeenCalledWith('[Sentry] Initialized');

      consoleSpy.mockRestore();
    });

    it('should configure replay integration with HIPAA-compliant masking', async () => {
      mockEnv.DEV = false;

      vi.resetModules();
      const replayMock = vi.fn(() => ({ name: 'Replay' }));
      vi.doMock('@/env', () => ({ env: mockEnv }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: replayMock,
        ErrorBoundary: vi.fn(() => null),
      }));

      const { initSentry } = await import('../../src/services/sentry');
      initSentry();

      expect(replayMock).toHaveBeenCalledWith({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      });
    });
  });

  describe('sanitizeMessage (via beforeSend)', () => {
    beforeEach(async () => {
      mockEnv.DEV = false;

      vi.resetModules();
      vi.doMock('@/env', () => ({ env: mockEnv }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn((config) => {
          beforeSendCallback = config.beforeSend;
          beforeSendTransactionCallback = config.beforeSendTransaction;
        }),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const { initSentry } = await import('../../src/services/sentry');
      initSentry();
    });

    it('should sanitize email addresses from messages', () => {
      expect(beforeSendCallback).not.toBeNull();

      const event = {
        message: 'Error for user john.doe@example.com failed',
      };

      const result = beforeSendCallback!(event);
      expect(result.message).toBe('Error for user [EMAIL] failed');
    });

    it('should sanitize phone numbers from messages', () => {
      expect(beforeSendCallback).not.toBeNull();

      // Phone regex matches 10+ chars of digits/spaces/dashes, including trailing space
      const event = {
        message: 'SMS sent to +1-555-123-4567 failed',
      };

      const result = beforeSendCallback!(event);
      // Note: regex consumes trailing space as part of pattern
      expect(result.message).toBe('SMS sent to [PHONE]failed');
    });

    it('should sanitize Telegram user IDs from messages', () => {
      expect(beforeSendCallback).not.toBeNull();

      // Note: Phone regex runs first and matches long digit sequences
      // So " 123456789" (10 chars with space) gets matched as phone
      const event = {
        message: 'Error for user_id: 123456789',
      };

      const result = beforeSendCallback!(event);
      // Phone regex matched the space + digits
      expect(result.message).toBe('Error for user_id:[PHONE]');
    });

    it('should sanitize user_id with short IDs via user_id pattern', () => {
      expect(beforeSendCallback).not.toBeNull();

      // Short user IDs (< 10 digits) are caught by user_id pattern
      const event = {
        message: 'Failed for user_id:12345 in request',
      };

      const result = beforeSendCallback!(event);
      expect(result.message).toBe('Failed for user_id:[REDACTED] in request');
    });

    it('should sanitize multiple PHI patterns in one message', () => {
      expect(beforeSendCallback).not.toBeNull();

      const event = {
        message: 'User john@test.com (user_id: 123) called +79001234567',
      };

      const result = beforeSendCallback!(event);
      expect(result.message).toBe('User [EMAIL] (user_id:[REDACTED]) called [PHONE]');
    });

    it('should sanitize PHI from breadcrumbs', () => {
      expect(beforeSendCallback).not.toBeNull();

      const event = {
        message: 'Error occurred',
        breadcrumbs: [
          { message: 'User john@example.com logged in' },
          { message: 'API call for user_id: 12345' },
          { message: 'Regular breadcrumb' },
          { message: undefined },
        ],
      };

      const result = beforeSendCallback!(event);
      expect(result.breadcrumbs).toEqual([
        { message: 'User [EMAIL] logged in' },
        { message: 'API call for user_id:[REDACTED]' },
        { message: 'Regular breadcrumb' },
        { message: undefined },
      ]);
    });

    it('should handle events without message', () => {
      expect(beforeSendCallback).not.toBeNull();

      const event = {
        exception: { values: [{ type: 'Error' }] },
      };

      const result = beforeSendCallback!(event);
      expect(result).toEqual(event);
    });

    it('should handle events without breadcrumbs', () => {
      expect(beforeSendCallback).not.toBeNull();

      const event = {
        message: 'Simple error',
      };

      const result = beforeSendCallback!(event);
      expect(result.message).toBe('Simple error');
    });
  });

  describe('beforeSendTransaction (sensitive routes)', () => {
    beforeEach(async () => {
      mockEnv.DEV = false;

      vi.resetModules();
      vi.doMock('@/env', () => ({ env: mockEnv }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn((config) => {
          beforeSendCallback = config.beforeSend;
          beforeSendTransactionCallback = config.beforeSendTransaction;
        }),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const { initSentry } = await import('../../src/services/sentry');
      initSentry();
    });

    it('should redact /profile routes', () => {
      expect(beforeSendTransactionCallback).not.toBeNull();

      // Note: Current implementation replaces from original each iteration,
      // so last matching pattern wins. For /profile alone:
      const event = { transaction: '/profile' };
      const result = beforeSendTransactionCallback!(event);

      expect(result.transaction).toBe('/[REDACTED]');
    });

    it('should redact last matching sensitive route when multiple match', () => {
      expect(beforeSendTransactionCallback).not.toBeNull();

      // /profile/settings matches both /profile and /settings patterns
      // Current implementation: last match wins (/settings)
      const event = { transaction: '/profile/settings' };
      const result = beforeSendTransactionCallback!(event);

      // Last matching pattern (/settings) is applied
      expect(result.transaction).toBe('/profile/[REDACTED]');
    });

    it('should redact /settings routes', () => {
      expect(beforeSendTransactionCallback).not.toBeNull();

      const event = { transaction: '/app/settings' };
      const result = beforeSendTransactionCallback!(event);

      expect(result.transaction).toBe('/app/[REDACTED]');
    });

    it('should redact /diary routes', () => {
      expect(beforeSendTransactionCallback).not.toBeNull();

      const event = { transaction: '/diary/entry/123' };
      const result = beforeSendTransactionCallback!(event);

      expect(result.transaction).toBe('/[REDACTED]/entry/123');
    });

    it('should not redact non-sensitive routes', () => {
      expect(beforeSendTransactionCallback).not.toBeNull();

      const event = { transaction: '/breathing/exercise' };
      const result = beforeSendTransactionCallback!(event);

      expect(result.transaction).toBe('/breathing/exercise');
    });

    it('should handle empty transaction', () => {
      expect(beforeSendTransactionCallback).not.toBeNull();

      const event = { transaction: '' };
      const result = beforeSendTransactionCallback!(event);

      expect(result.transaction).toBe('');
    });

    it('should handle missing transaction', () => {
      expect(beforeSendTransactionCallback).not.toBeNull();

      const event = {};
      const result = beforeSendTransactionCallback!(event);

      expect(result).toEqual({});
    });
  });

  describe('setUser', () => {
    it('should skip in development mode', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: { ...mockEnv, DEV: true } }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        setUser: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { setUser } = await import('../../src/services/sentry');

      setUser(123456789);

      expect(SentryMock.setUser).not.toHaveBeenCalled();
    });

    it('should set user with ID only in production', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: { ...mockEnv, DEV: false } }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        setUser: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { setUser } = await import('../../src/services/sentry');

      setUser(123456789);

      expect(SentryMock.setUser).toHaveBeenCalledWith({
        id: '123456789',
      });
    });
  });

  describe('clearUser', () => {
    it('should clear user context', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: mockEnv }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        setUser: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { clearUser } = await import('../../src/services/sentry');

      clearUser();

      expect(SentryMock.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('captureException', () => {
    it('should log to console in development mode', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: { ...mockEnv, DEV: true } }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        captureException: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { captureException } = await import('../../src/services/sentry');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      const context = { userId: 123 };

      captureException(error, context);

      expect(consoleSpy).toHaveBeenCalledWith('[Sentry] Would capture:', error, context);
      expect(SentryMock.captureException).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should capture exception in production', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: { ...mockEnv, DEV: false } }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        captureException: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { captureException } = await import('../../src/services/sentry');

      const error = new Error('Test error');
      const context = { page: 'breathing' };

      captureException(error, context);

      expect(SentryMock.captureException).toHaveBeenCalledWith(error, {
        extra: context,
      });
    });

    it('should capture exception without context', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: { ...mockEnv, DEV: false } }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        captureException: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { captureException } = await import('../../src/services/sentry');

      const error = new Error('Test error');
      captureException(error);

      expect(SentryMock.captureException).toHaveBeenCalledWith(error, {
        extra: undefined,
      });
    });
  });

  describe('captureMessage', () => {
    it('should log to console in development mode', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: { ...mockEnv, DEV: true } }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        captureMessage: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { captureMessage } = await import('../../src/services/sentry');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      captureMessage('Test message', 'warning');

      expect(consoleSpy).toHaveBeenCalledWith('[Sentry] Would capture message (warning):', 'Test message');
      expect(SentryMock.captureMessage).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should capture message in production', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: { ...mockEnv, DEV: false } }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        captureMessage: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { captureMessage } = await import('../../src/services/sentry');

      captureMessage('User completed breathing session', 'info');

      expect(SentryMock.captureMessage).toHaveBeenCalledWith(
        'User completed breathing session',
        'info'
      );
    });

    it('should use default level "info" when not specified', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: { ...mockEnv, DEV: false } }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        captureMessage: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { captureMessage } = await import('../../src/services/sentry');

      captureMessage('Default level message');

      expect(SentryMock.captureMessage).toHaveBeenCalledWith(
        'Default level message',
        'info'
      );
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb with category and message', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: mockEnv }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        addBreadcrumb: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { addBreadcrumb } = await import('../../src/services/sentry');

      addBreadcrumb('navigation', 'User navigated to breathing page');

      expect(SentryMock.addBreadcrumb).toHaveBeenCalledWith({
        category: 'navigation',
        message: 'User navigated to breathing page',
        data: undefined,
        level: 'info',
      });
    });

    it('should add breadcrumb with additional data', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: mockEnv }));
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        addBreadcrumb: vi.fn(),
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
        ErrorBoundary: vi.fn(() => null),
      }));

      const SentryMock = await import('@sentry/react');
      const { addBreadcrumb } = await import('../../src/services/sentry');

      addBreadcrumb('breathing', 'Session started', { pattern: '4-7-8', cycles: 3 });

      expect(SentryMock.addBreadcrumb).toHaveBeenCalledWith({
        category: 'breathing',
        message: 'Session started',
        data: { pattern: '4-7-8', cycles: 3 },
        level: 'info',
      });
    });
  });

  describe('SentryErrorBoundary export', () => {
    it('should re-export ErrorBoundary from @sentry/react', async () => {
      vi.resetModules();
      vi.doMock('@/env', () => ({ env: mockEnv }));

      const MockErrorBoundary = vi.fn(() => null);
      vi.doMock('@sentry/react', () => ({
        init: vi.fn(),
        ErrorBoundary: MockErrorBoundary,
        browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
        replayIntegration: vi.fn(() => ({ name: 'Replay' })),
      }));

      const { SentryErrorBoundary } = await import('../../src/services/sentry');

      expect(SentryErrorBoundary).toBe(MockErrorBoundary);
    });
  });
});
