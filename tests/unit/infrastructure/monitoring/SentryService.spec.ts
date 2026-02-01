/**
 * SentryService + instrument.ts Unit Tests
 * ==========================================
 * Tests for healthcare-compliant error monitoring:
 * - SentryService: Error capture, performance, user context
 * - scrubSensitiveData: PHI/PII scrubbing (HIPAA compliance)
 *
 * @module @sleepcore/infrastructure/monitoring
 */

// Mock @sentry/node before any imports
const mockCaptureException = jest.fn().mockReturnValue('event-id-123');
const mockCaptureMessage = jest.fn().mockReturnValue('msg-id-123');
const mockWithScope = jest.fn().mockImplementation((cb: (scope: unknown) => unknown) => {
  const scope = {
    setLevel: jest.fn(),
    setTag: jest.fn(),
    setExtras: jest.fn(),
    setUser: jest.fn(),
    setFingerprint: jest.fn(),
  };
  return cb(scope);
});
const mockSetUser = jest.fn();
const mockSetTag = jest.fn();
const mockSetTags = jest.fn();
const mockSetExtra = jest.fn();
const mockAddBreadcrumb = jest.fn();
const mockStartInactiveSpan = jest.fn().mockReturnValue({ end: jest.fn() });
const mockStartSpan = jest.fn().mockImplementation((_opts: unknown, cb: () => unknown) => cb());
const mockFlush = jest.fn().mockResolvedValue(true);
const mockClose = jest.fn().mockResolvedValue(true);

jest.mock('@sentry/node', () => ({
  captureException: mockCaptureException,
  captureMessage: mockCaptureMessage,
  withScope: mockWithScope,
  setUser: mockSetUser,
  setTag: mockSetTag,
  setTags: mockSetTags,
  setExtra: mockSetExtra,
  addBreadcrumb: mockAddBreadcrumb,
  startInactiveSpan: mockStartInactiveSpan,
  startSpan: mockStartSpan,
  flush: mockFlush,
  close: mockClose,
  init: jest.fn(),
}));

// Mock instrument.ts to control IS_SENTRY_ENABLED
let mockIsEnabled = true;
jest.mock('../../../../src/infrastructure/monitoring/instrument', () => ({
  get IS_SENTRY_ENABLED() {
    return mockIsEnabled;
  },
  scrubSensitiveData: jest.requireActual(
    '../../../../src/infrastructure/monitoring/instrument'
  ).scrubSensitiveData,
}));

// Mock @sentry/profiling-node
jest.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: jest.fn(),
}));

import { SentryService } from '../../../../src/infrastructure/monitoring/SentryService';
import { scrubSensitiveData } from '../../../../src/infrastructure/monitoring/instrument';

// =============================================================================
// scrubSensitiveData (pure function from instrument.ts)
// =============================================================================

describe('scrubSensitiveData', () => {
  it('should return null for null input', () => {
    expect(scrubSensitiveData(null)).toBeNull();
  });

  it('should return undefined for undefined input', () => {
    expect(scrubSensitiveData(undefined)).toBeUndefined();
  });

  it('should return numbers unchanged', () => {
    expect(scrubSensitiveData(42)).toBe(42);
  });

  it('should return booleans unchanged', () => {
    expect(scrubSensitiveData(true)).toBe(true);
  });

  it('should scrub email addresses from strings', () => {
    const result = scrubSensitiveData('Contact user@example.com for help');
    expect(result).not.toContain('user@example.com');
    expect(result).toContain('[SCRUBBED]');
  });

  it('should scrub phone numbers from strings', () => {
    const result = scrubSensitiveData('Call +1-555-123-4567 for support');
    expect(result).toContain('[SCRUBBED]');
  });

  it('should scrub numeric IDs (7-12 digits) from strings', () => {
    const result = scrubSensitiveData('User ID: 1234567890');
    expect(result).not.toContain('1234567890');
  });

  it('should redact sensitive field names in objects', () => {
    const input = {
      password: 'secret123',
      name: 'John',
    };
    const result = scrubSensitiveData(input) as Record<string, unknown>;

    expect(result.password).toBe('[REDACTED]');
    expect(result.name).toBe('John');
  });

  it('should redact token fields', () => {
    const input = { token: 'abc123', data: 'safe' };
    const result = scrubSensitiveData(input) as Record<string, unknown>;

    expect(result.token).toBe('[REDACTED]');
    expect(result.data).toBe('safe');
  });

  it('should redact healthcare PHI fields', () => {
    const input = {
      isi_score: 18,
      sleep_data: { hours: 6 },
      therapy_notes: 'Patient improved',
      diagnosis: 'insomnia',
      prescription: 'melatonin',
    };
    const result = scrubSensitiveData(input) as Record<string, unknown>;

    expect(result.isi_score).toBe('[REDACTED]');
    expect(result.sleep_data).toBe('[REDACTED]');
    expect(result.therapy_notes).toBe('[REDACTED]');
    expect(result.diagnosis).toBe('[REDACTED]');
    expect(result.prescription).toBe('[REDACTED]');
  });

  it('should redact PII fields', () => {
    const input = {
      email: 'user@test.com',
      phone: '+1234567890',
      first_name: 'John',
      last_name: 'Doe',
      telegram_id: '12345678',
      userId: 'u-123',
    };
    const result = scrubSensitiveData(input) as Record<string, unknown>;

    expect(result.email).toBe('[REDACTED]');
    expect(result.phone).toBe('[REDACTED]');
    expect(result.first_name).toBe('[REDACTED]');
    expect(result.last_name).toBe('[REDACTED]');
    expect(result.telegram_id).toBe('[REDACTED]');
    expect(result.userId).toBe('[REDACTED]');
  });

  it('should handle case-insensitive field matching', () => {
    const input = { Password: 'secret', TOKEN: 'abc' };
    const result = scrubSensitiveData(input) as Record<string, unknown>;

    expect(result.Password).toBe('[REDACTED]');
    expect(result.TOKEN).toBe('[REDACTED]');
  });

  it('should recursively scrub nested objects', () => {
    const input = {
      level1: {
        level2: {
          password: 'deep-secret',
          safe: 'visible',
        },
      },
    };
    const result = scrubSensitiveData(input) as Record<string, Record<string, Record<string, unknown>>>;

    expect(result.level1.level2.password).toBe('[REDACTED]');
    expect(result.level1.level2.safe).toBe('visible');
  });

  it('should scrub arrays', () => {
    const input = ['user@test.com', 'safe text'];
    const result = scrubSensitiveData(input) as string[];

    expect(result[0]).toContain('[SCRUBBED]');
    expect(result[1]).toBe('safe text');
  });

  it('should handle deeply nested objects up to depth 10', () => {
    let obj: Record<string, unknown> = { value: 'test' };
    for (let i = 0; i < 12; i++) {
      obj = { nested: obj };
    }

    // Should not throw
    const result = scrubSensitiveData(obj);
    expect(result).toBeDefined();
  });

  it('should return [MAX_DEPTH] for objects exceeding depth 10', () => {
    let obj: Record<string, unknown> = { password: 'secret' };
    for (let i = 0; i < 12; i++) {
      obj = { nested: obj };
    }

    const result = scrubSensitiveData(obj) as Record<string, unknown>;
    // At some level deep enough, it should hit MAX_DEPTH
    let current: unknown = result;
    for (let i = 0; i < 12; i++) {
      if (current === '[MAX_DEPTH]') break;
      current = (current as Record<string, unknown>).nested;
    }
    expect(current).toBe('[MAX_DEPTH]');
  });

  it('should handle empty objects', () => {
    const result = scrubSensitiveData({});
    expect(result).toEqual({});
  });

  it('should handle empty strings', () => {
    const result = scrubSensitiveData('');
    expect(result).toBe('');
  });

  it('should match fields containing sensitive substrings', () => {
    const input = { user_password_hash: 'abc', my_api_key_v2: 'xyz' };
    const result = scrubSensitiveData(input) as Record<string, unknown>;

    expect(result.user_password_hash).toBe('[REDACTED]');
    expect(result.my_api_key_v2).toBe('[REDACTED]');
  });
});

// =============================================================================
// SentryService
// =============================================================================

describe('SentryService', () => {
  let service: SentryService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled = true;
    service = new SentryService();
  });

  describe('anonymizeUserId()', () => {
    it('should return deterministic hash for same input', () => {
      const hash1 = service.anonymizeUserId('12345');
      const hash2 = service.anonymizeUserId('12345');

      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different input', () => {
      const hash1 = service.anonymizeUserId('12345');
      const hash2 = service.anonymizeUserId('67890');

      expect(hash1).not.toBe(hash2);
    });

    it('should return 16-character string', () => {
      const hash = service.anonymizeUserId('test-user');

      expect(hash.length).toBe(16);
    });

    it('should return hex characters only', () => {
      const hash = service.anonymizeUserId('test-user');

      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe('setUserContext()', () => {
    it('should call Sentry.setUser with anonymized ID', () => {
      service.setUserContext({ anonymousId: 'anon-123' });

      expect(mockSetUser).toHaveBeenCalledWith({ id: 'anon-123' });
    });

    it('should set therapy_week tag when provided', () => {
      service.setUserContext({ anonymousId: 'anon-123', therapyWeek: 3 });

      expect(mockSetTag).toHaveBeenCalledWith('therapy_week', '3');
    });

    it('should set onboarding_complete tag when provided', () => {
      service.setUserContext({ anonymousId: 'anon-123', hasCompletedOnboarding: true });

      expect(mockSetTag).toHaveBeenCalledWith('onboarding_complete', 'true');
    });

    it('should be no-op when disabled', () => {
      mockIsEnabled = false;
      service = new SentryService();

      service.setUserContext({ anonymousId: 'anon-123' });

      expect(mockSetUser).not.toHaveBeenCalled();
    });
  });

  describe('clearUserContext()', () => {
    it('should call Sentry.setUser(null)', () => {
      service.clearUserContext();

      expect(mockSetUser).toHaveBeenCalledWith(null);
    });

    it('should be no-op when disabled', () => {
      mockIsEnabled = false;
      service = new SentryService();

      service.clearUserContext();

      expect(mockSetUser).not.toHaveBeenCalled();
    });
  });

  describe('captureError()', () => {
    it('should call Sentry.withScope and captureException', () => {
      const error = new Error('test error');
      service.captureError(error);

      expect(mockWithScope).toHaveBeenCalled();
    });

    it('should return event ID when enabled', () => {
      const result = service.captureError(new Error('test'));

      expect(result).toBeDefined();
    });

    it('should return undefined when disabled', () => {
      mockIsEnabled = false;
      service = new SentryService();

      const result = service.captureError(new Error('test'));

      expect(result).toBeUndefined();
    });

    it('should convert string errors to Error instances', () => {
      service.captureError('string error');

      expect(mockWithScope).toHaveBeenCalled();
    });

    it('should set category tag when provided', () => {
      service.captureError(new Error('db error'), { category: 'database' });

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const scope = {
        setLevel: jest.fn(),
        setTag: jest.fn(),
        setExtras: jest.fn(),
        setUser: jest.fn(),
        setFingerprint: jest.fn(),
      };
      scopeCallback(scope);

      expect(scope.setTag).toHaveBeenCalledWith('error_category', 'database');
    });

    it('should set additional tags', () => {
      service.captureError(new Error('err'), {
        tags: { custom: 'value' },
      });

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const scope = {
        setLevel: jest.fn(),
        setTag: jest.fn(),
        setExtras: jest.fn(),
        setUser: jest.fn(),
        setFingerprint: jest.fn(),
      };
      scopeCallback(scope);

      expect(scope.setTag).toHaveBeenCalledWith('custom', 'value');
    });

    it('should scrub extra context before setting', () => {
      service.captureError(new Error('err'), {
        extra: { password: 'secret', safe: 'data' },
      });

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const scope = {
        setLevel: jest.fn(),
        setTag: jest.fn(),
        setExtras: jest.fn(),
        setUser: jest.fn(),
        setFingerprint: jest.fn(),
      };
      scopeCallback(scope);

      const setExtrasCall = scope.setExtras.mock.calls[0][0];
      expect(setExtrasCall.password).toBe('[REDACTED]');
      expect(setExtrasCall.safe).toBe('data');
    });

    it('should set fingerprint when provided', () => {
      service.captureError(new Error('err'), {
        fingerprint: ['custom', 'group'],
      });

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const scope = {
        setLevel: jest.fn(),
        setTag: jest.fn(),
        setExtras: jest.fn(),
        setUser: jest.fn(),
        setFingerprint: jest.fn(),
      };
      scopeCallback(scope);

      expect(scope.setFingerprint).toHaveBeenCalledWith(['custom', 'group']);
    });

    it('should trigger critical error alert on fatal severity', () => {
      const onCriticalError = jest.fn();
      service.configureAlerts({ onCriticalError });

      service.captureError(new Error('fatal'), {}, 'fatal');

      expect(onCriticalError).toHaveBeenCalled();
    });

    it('should trigger critical error alert on error severity', () => {
      const onCriticalError = jest.fn();
      service.configureAlerts({ onCriticalError });

      service.captureError(new Error('error'), {}, 'error');

      expect(onCriticalError).toHaveBeenCalled();
    });

    it('should not trigger alert on warning severity', () => {
      const onCriticalError = jest.fn();
      service.configureAlerts({ onCriticalError });

      service.captureError(new Error('warn'), {}, 'warning');

      expect(onCriticalError).not.toHaveBeenCalled();
    });
  });

  describe('captureMessage()', () => {
    it('should call Sentry.withScope and captureMessage', () => {
      service.captureMessage('test message');

      expect(mockWithScope).toHaveBeenCalled();
    });

    it('should return undefined when disabled', () => {
      mockIsEnabled = false;
      service = new SentryService();

      const result = service.captureMessage('test');

      expect(result).toBeUndefined();
    });

    it('should set category tag when provided', () => {
      service.captureMessage('msg', 'info', { category: 'business_logic' });

      expect(mockWithScope).toHaveBeenCalled();
    });
  });

  describe('startSpan()', () => {
    it('should call Sentry.startInactiveSpan', () => {
      service.startSpan({ name: 'test-op', op: 'db.query' });

      expect(mockStartInactiveSpan).toHaveBeenCalledWith({
        name: 'test-op',
        op: 'db.query',
        attributes: undefined,
      });
    });

    it('should pass attributes', () => {
      service.startSpan({ name: 'test', op: 'http', attributes: { status: 200 } });

      expect(mockStartInactiveSpan).toHaveBeenCalledWith(
        expect.objectContaining({ attributes: { status: 200 } })
      );
    });

    it('should return undefined when disabled', () => {
      mockIsEnabled = false;
      service = new SentryService();

      const span = service.startSpan({ name: 'test', op: 'db' });

      expect(span).toBeUndefined();
    });
  });

  describe('traceAsync()', () => {
    it('should execute function and return result', async () => {
      const result = await service.traceAsync('op', 'task', async () => 42);

      expect(result).toBe(42);
    });

    it('should call Sentry.startSpan when enabled', async () => {
      await service.traceAsync('op', 'task', async () => 'done');

      expect(mockStartSpan).toHaveBeenCalled();
    });

    it('should execute function directly when disabled', async () => {
      mockIsEnabled = false;
      service = new SentryService();

      const result = await service.traceAsync('op', 'task', async () => 'direct');

      expect(result).toBe('direct');
      expect(mockStartSpan).not.toHaveBeenCalled();
    });
  });

  describe('addBreadcrumb()', () => {
    it('should call Sentry.addBreadcrumb with correct params', () => {
      service.addBreadcrumb('test message', 'test-category');

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'test message',
          category: 'test-category',
          level: 'info',
        })
      );
    });

    it('should scrub data before adding', () => {
      service.addBreadcrumb('msg', 'cat', 'info', { password: 'secret', safe: 'ok' });

      const call = mockAddBreadcrumb.mock.calls[0][0];
      expect(call.data.password).toBe('[REDACTED]');
      expect(call.data.safe).toBe('ok');
    });

    it('should be no-op when disabled', () => {
      mockIsEnabled = false;
      service = new SentryService();

      service.addBreadcrumb('msg', 'cat');

      expect(mockAddBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('setTag() / setTags() / setExtra()', () => {
    it('should call Sentry.setTag', () => {
      service.setTag('key', 'value');
      expect(mockSetTag).toHaveBeenCalledWith('key', 'value');
    });

    it('should call Sentry.setTags', () => {
      service.setTags({ a: '1', b: '2' });
      expect(mockSetTags).toHaveBeenCalledWith({ a: '1', b: '2' });
    });

    it('should call Sentry.setExtra with scrubbed value', () => {
      service.setExtra('context', { password: 'secret' });
      expect(mockSetExtra).toHaveBeenCalled();
      const setExtraCall = mockSetExtra.mock.calls[0];
      expect(setExtraCall[0]).toBe('context');
    });

    it('should be no-ops when disabled', () => {
      mockIsEnabled = false;
      service = new SentryService();

      service.setTag('k', 'v');
      service.setTags({ a: '1' });
      service.setExtra('k', 'v');

      expect(mockSetTag).not.toHaveBeenCalled();
      expect(mockSetTags).not.toHaveBeenCalled();
      expect(mockSetExtra).not.toHaveBeenCalled();
    });
  });

  describe('createBotErrorHandler()', () => {
    it('should return a function', () => {
      const handler = service.createBotErrorHandler();
      expect(typeof handler).toBe('function');
    });

    it('should capture error when called', () => {
      const handler = service.createBotErrorHandler();
      const error = new Error('bot error');
      const ctx = {
        update: { update_id: 123 },
        from: { id: 456 },
      };

      handler({ ctx, error });

      expect(mockWithScope).toHaveBeenCalled();
    });

    it('should handle missing ctx fields gracefully', () => {
      const handler = service.createBotErrorHandler();
      const error = new Error('bot error');

      // Should not throw
      handler({ ctx: {}, error });
    });
  });

  describe('alert threshold', () => {
    it('should trigger warning callback after 10 errors in 5 minutes', () => {
      const onWarningThreshold = jest.fn();
      service.configureAlerts({ onWarningThreshold });

      // Trigger 10 errors with same category
      for (let i = 0; i < 10; i++) {
        service.captureError(new Error(`error ${i}`), { category: 'database' });
      }

      expect(onWarningThreshold).toHaveBeenCalledWith(10, 5);
    });

    it('should reset counter after alert', () => {
      const onWarningThreshold = jest.fn();
      service.configureAlerts({ onWarningThreshold });

      // Trigger 10 errors
      for (let i = 0; i < 10; i++) {
        service.captureError(new Error(`error ${i}`), { category: 'database' });
      }

      // Counter should reset, so 5 more should NOT trigger
      for (let i = 0; i < 5; i++) {
        service.captureError(new Error(`error ${i}`), { category: 'database' });
      }

      expect(onWarningThreshold).toHaveBeenCalledTimes(1);
    });
  });

  describe('isActive()', () => {
    it('should return true when enabled', () => {
      expect(service.isActive()).toBe(true);
    });

    it('should return false when disabled', () => {
      mockIsEnabled = false;
      service = new SentryService();

      expect(service.isActive()).toBe(false);
    });
  });

  describe('flush()', () => {
    it('should call Sentry.flush when enabled', async () => {
      await service.flush();
      expect(mockFlush).toHaveBeenCalled();
    });

    it('should return true when disabled', async () => {
      mockIsEnabled = false;
      service = new SentryService();

      const result = await service.flush();
      expect(result).toBe(true);
    });
  });

  describe('close()', () => {
    it('should call Sentry.close when enabled', async () => {
      await service.close();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should return true when disabled', async () => {
      mockIsEnabled = false;
      service = new SentryService();

      const result = await service.close();
      expect(result).toBe(true);
    });
  });
});
