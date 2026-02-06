/**
 * Sentry Instrumentation Unit Tests
 * ==================================
 *
 * Tests for HIPAA-compliant data scrubbing in Sentry monitoring.
 *
 * Test Coverage Requirements (IEC 62304 Class C - Security):
 * - PHI/PII field scrubbing
 * - Pattern-based scrubbing (email, phone, IDs)
 * - Nested object handling
 * - Array handling
 * - Edge cases (null, undefined, deep nesting)
 *
 * HIPAA Compliance Testing:
 * - Ensures sensitive data is properly scrubbed before sending to Sentry
 * - Verifies no PHI leaks in error reports
 *
 * @packageDocumentation
 */

import {
  scrubSensitiveData,
  beforeSendHook,
  beforeSendSpanHook,
  SENSITIVE_FIELDS,
  SENSITIVE_PATTERNS,
} from '../instrument';
import type * as Sentry from '@sentry/node';

describe('Sentry Instrumentation', () => {
  describe('scrubSensitiveData', () => {
    describe('primitive values', () => {
      it('should pass through null', () => {
        expect(scrubSensitiveData(null)).toBeNull();
      });

      it('should pass through undefined', () => {
        expect(scrubSensitiveData(undefined)).toBeUndefined();
      });

      it('should pass through numbers', () => {
        expect(scrubSensitiveData(42)).toBe(42);
        expect(scrubSensitiveData(3.14)).toBe(3.14);
        expect(scrubSensitiveData(0)).toBe(0);
      });

      it('should pass through booleans', () => {
        expect(scrubSensitiveData(true)).toBe(true);
        expect(scrubSensitiveData(false)).toBe(false);
      });

      it('should pass through non-sensitive strings', () => {
        expect(scrubSensitiveData('hello world')).toBe('hello world');
        expect(scrubSensitiveData('')).toBe('');
      });
    });

    describe('email scrubbing', () => {
      it('should scrub email addresses', () => {
        const result = scrubSensitiveData('contact user@example.com for help');
        expect(result).toBe('contact [SCRUBBED] for help');
      });

      it('should scrub multiple email addresses', () => {
        const result = scrubSensitiveData('from: a@b.com to: c@d.org');
        expect(result).toBe('from: [SCRUBBED] to: [SCRUBBED]');
      });

      it('should scrub complex email addresses', () => {
        const result = scrubSensitiveData('Email: john.doe+test@company.co.uk');
        expect(result).toBe('Email: [SCRUBBED]');
      });
    });

    describe('phone number scrubbing', () => {
      it('should scrub phone numbers with country code', () => {
        const result = scrubSensitiveData('Call +7-999-123-4567');
        expect(result).toBe('Call [SCRUBBED]');
      });

      it('should scrub phone numbers with parentheses', () => {
        const result = scrubSensitiveData('Phone: (495) 123-4567');
        expect(result).toBe('Phone: [SCRUBBED]');
      });

      it('should scrub phone numbers with spaces', () => {
        const result = scrubSensitiveData('Contact: 495 123 4567');
        expect(result).toBe('Contact: [SCRUBBED]');
      });
    });

    describe('Telegram ID scrubbing', () => {
      it('should scrub 7-digit Telegram IDs', () => {
        const result = scrubSensitiveData('User ID: 1234567');
        expect(result).toBe('User ID: [SCRUBBED]');
      });

      it('should scrub 10-digit Telegram IDs', () => {
        const result = scrubSensitiveData('Telegram: 1234567890');
        expect(result).toBe('Telegram: [SCRUBBED]');
      });

      it('should scrub 12-digit IDs', () => {
        const result = scrubSensitiveData('ID: 123456789012');
        expect(result).toBe('ID: [SCRUBBED]');
      });

      it('should not scrub short numbers', () => {
        const result = scrubSensitiveData('Score: 123456');
        expect(result).toBe('Score: 123456');
      });
    });

    describe('credit card scrubbing', () => {
      it('should scrub credit card numbers with dashes', () => {
        const result = scrubSensitiveData('Card: 1234-5678-9012-3456');
        expect(result).toBe('Card: [SCRUBBED]');
      });

      it('should scrub credit card numbers with spaces', () => {
        const result = scrubSensitiveData('Payment: 1234 5678 9012 3456');
        expect(result).toBe('Payment: [SCRUBBED]');
      });

      it('should handle continuous credit card numbers (partial match)', () => {
        // The regex pattern matches 4-4-4-4 format with separators
        // Continuous 16-digit numbers are partially matched by the Telegram ID pattern (7-12 digits)
        const result = scrubSensitiveData('CC: 1234567890123456');
        // First 12 digits matched by Telegram ID pattern, leaving 456
        expect(result).toBe('CC: [SCRUBBED]456');
      });
    });

    describe('object scrubbing', () => {
      it('should scrub sensitive field values', () => {
        const obj = {
          message: 'Hello',
          password: 'secret123',
        };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;

        expect(result.message).toBe('Hello');
        expect(result.password).toBe('[REDACTED]');
      });

      it('should scrub email field', () => {
        const obj = { email: 'user@test.com' };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;

        expect(result.email).toBe('[REDACTED]');
      });

      it('should scrub authentication fields', () => {
        const obj = {
          token: 'abc123',
          apiKey: 'xyz789',
          authorization: 'Bearer xxx',
          secret: 'hidden',
        };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;

        expect(result.token).toBe('[REDACTED]');
        expect(result.apiKey).toBe('[REDACTED]');
        expect(result.authorization).toBe('[REDACTED]');
        expect(result.secret).toBe('[REDACTED]');
      });

      it('should scrub healthcare PHI fields', () => {
        const obj = {
          ssn: '123-45-6789',
          medical_record: 'MR12345',
          diagnosis: 'Chronic insomnia',
          prescription: 'Medication XYZ',
          insurance: 'INS001',
          health_condition: 'Sleep disorder',
          isi_score: 18,
          sleep_data: { quality: 3 },
          therapy_notes: 'Patient progress notes',
        };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;

        expect(result.ssn).toBe('[REDACTED]');
        expect(result.medical_record).toBe('[REDACTED]');
        expect(result.diagnosis).toBe('[REDACTED]');
        expect(result.prescription).toBe('[REDACTED]');
        expect(result.insurance).toBe('[REDACTED]');
        expect(result.health_condition).toBe('[REDACTED]');
        expect(result.isi_score).toBe('[REDACTED]');
        expect(result.sleep_data).toBe('[REDACTED]');
        expect(result.therapy_notes).toBe('[REDACTED]');
      });

      it('should scrub PII fields', () => {
        const obj = {
          first_name: 'John',
          last_name: 'Doe',
          full_name: 'John Doe',
          phone: '+7-999-123-4567',
          address: '123 Main St',
          birth_date: '1990-01-15',
          date_of_birth: '1990-01-15',
          dob: '1990-01-15',
          telegram_id: '123456789',
          external_id: 'EXT001',
          user_id: 'USR001',
          userId: 'USR002',
          dbUserId: 1234,
        };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;

        expect(result.first_name).toBe('[REDACTED]');
        expect(result.last_name).toBe('[REDACTED]');
        expect(result.full_name).toBe('[REDACTED]');
        expect(result.phone).toBe('[REDACTED]');
        expect(result.address).toBe('[REDACTED]');
        expect(result.birth_date).toBe('[REDACTED]');
        expect(result.date_of_birth).toBe('[REDACTED]');
        expect(result.dob).toBe('[REDACTED]');
        expect(result.telegram_id).toBe('[REDACTED]');
        expect(result.external_id).toBe('[REDACTED]');
        expect(result.user_id).toBe('[REDACTED]');
        expect(result.userId).toBe('[REDACTED]');
        expect(result.dbUserId).toBe('[REDACTED]');
      });

      it('should handle case-insensitive field matching', () => {
        const obj = {
          PASSWORD: 'secret',
          Email: 'test@test.com',
          TOKEN: 'abc123',
        };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;

        expect(result.PASSWORD).toBe('[REDACTED]');
        expect(result.Email).toBe('[REDACTED]');
        expect(result.TOKEN).toBe('[REDACTED]');
      });

      it('should handle fields containing sensitive keywords', () => {
        const obj = {
          userPassword: 'secret',
          authToken: 'abc',
          emailAddress: 'test@test.com',
          patientDiagnosis: 'info',
        };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;

        expect(result.userPassword).toBe('[REDACTED]');
        expect(result.authToken).toBe('[REDACTED]');
        expect(result.emailAddress).toBe('[REDACTED]');
        expect(result.patientDiagnosis).toBe('[REDACTED]');
      });
    });

    describe('nested object scrubbing', () => {
      it('should scrub nested objects', () => {
        const obj = {
          user: {
            email: 'user@test.com',
            profile: {
              name: 'Safe',
              password: 'secret',
            },
          },
        };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;
        const user = result.user as Record<string, unknown>;
        const profile = user.profile as Record<string, unknown>;

        expect(user.email).toBe('[REDACTED]');
        expect(profile.name).toBe('Safe');
        expect(profile.password).toBe('[REDACTED]');
      });

      it('should handle deeply nested objects', () => {
        const obj = {
          level1: {
            level2: {
              level3: {
                level4: {
                  password: 'deep-secret',
                  safe: 'value',
                },
              },
            },
          },
        };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;
        const l1 = result.level1 as Record<string, unknown>;
        const l2 = l1.level2 as Record<string, unknown>;
        const l3 = l2.level3 as Record<string, unknown>;
        const l4 = l3.level4 as Record<string, unknown>;

        expect(l4.password).toBe('[REDACTED]');
        expect(l4.safe).toBe('value');
      });

      it('should prevent infinite recursion with max depth', () => {
        // Create deeply nested object (more than 10 levels)
        let obj: Record<string, unknown> = { value: 'deep' };
        for (let i = 0; i < 15; i++) {
          obj = { nested: obj };
        }

        const result = scrubSensitiveData(obj) as Record<string, unknown>;

        // Should not throw, and should truncate at max depth
        expect(result).toBeDefined();

        // Navigate to the point where MAX_DEPTH is reached
        let current = result;
        for (let i = 0; i < 10; i++) {
          current = current.nested as Record<string, unknown>;
        }
        expect(current.nested).toBe('[MAX_DEPTH]');
      });
    });

    describe('array scrubbing', () => {
      it('should scrub arrays of strings', () => {
        const arr = ['safe', 'user@test.com', 'also safe'];
        const result = scrubSensitiveData(arr) as string[];

        expect(result[0]).toBe('safe');
        expect(result[1]).toBe('[SCRUBBED]');
        expect(result[2]).toBe('also safe');
      });

      it('should scrub arrays of objects', () => {
        const arr = [
          { name: 'Safe', email: 'a@b.com' },
          { name: 'Also Safe', password: 'secret' },
        ];
        const result = scrubSensitiveData(arr) as Array<Record<string, unknown>>;

        expect(result[0].name).toBe('Safe');
        expect(result[0].email).toBe('[REDACTED]');
        expect(result[1].name).toBe('Also Safe');
        expect(result[1].password).toBe('[REDACTED]');
      });

      it('should handle nested arrays', () => {
        const arr = [
          [{ email: 'a@b.com' }],
          [{ password: 'secret' }],
        ];
        const result = scrubSensitiveData(arr) as Array<Array<Record<string, unknown>>>;

        expect(result[0][0].email).toBe('[REDACTED]');
        expect(result[1][0].password).toBe('[REDACTED]');
      });

      it('should handle empty arrays', () => {
        const result = scrubSensitiveData([]);
        expect(result).toEqual([]);
      });
    });

    describe('mixed content', () => {
      it('should handle real-world error context', () => {
        const errorContext = {
          message: 'Failed to process request',
          user: {
            user_id: 'user123',
            email: 'patient@example.com',
            telegram_id: '123456789',
          },
          request: {
            path: '/api/diary',
            body: {
              isi_score: 18,
              notes: 'Patient diary entry',
            },
            headers: {
              authorization: 'Bearer token123',
            },
          },
          error: {
            stack: 'Error at line 42',
          },
        };

        const result = scrubSensitiveData(errorContext) as Record<string, unknown>;
        const user = result.user as Record<string, unknown>;
        const request = result.request as Record<string, unknown>;
        const body = request.body as Record<string, unknown>;
        const headers = request.headers as Record<string, unknown>;

        // Message should be preserved
        expect(result.message).toBe('Failed to process request');

        // User data should be scrubbed
        expect(user.user_id).toBe('[REDACTED]');
        expect(user.email).toBe('[REDACTED]');
        expect(user.telegram_id).toBe('[REDACTED]');

        // Request body PHI should be scrubbed
        expect(body.isi_score).toBe('[REDACTED]');

        // Headers should be scrubbed
        expect(headers.authorization).toBe('[REDACTED]');

        // Error stack should be preserved
        const error = result.error as Record<string, unknown>;
        expect(error.stack).toBe('Error at line 42');
      });

      it('should handle Telegram bot context', () => {
        const ctx = {
          from: {
            telegram_id: 123456789,
            first_name: 'Иван',
            last_name: 'Петров',
            username: 'ivan_petrov',
          },
          message: {
            text: 'Contact me at ivan@mail.ru or +7-999-123-4567',
            chat: {
              type: 'private',
            },
          },
        };

        const result = scrubSensitiveData(ctx) as Record<string, unknown>;
        const from = result.from as Record<string, unknown>;
        const message = result.message as Record<string, unknown>;

        expect(from.first_name).toBe('[REDACTED]');
        expect(from.last_name).toBe('[REDACTED]');
        expect(from.telegram_id).toBe('[REDACTED]');
        expect(message.text).toBe('Contact me at [SCRUBBED] or [SCRUBBED]');
      });
    });

    describe('edge cases', () => {
      it('should handle empty objects', () => {
        expect(scrubSensitiveData({})).toEqual({});
      });

      it('should handle objects with only sensitive fields', () => {
        const obj = {
          password: 'secret',
          email: 'test@test.com',
        };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;

        expect(result.password).toBe('[REDACTED]');
        expect(result.email).toBe('[REDACTED]');
      });

      it('should handle string with multiple sensitive patterns', () => {
        const str = 'User 123456789 email user@test.com phone +1-555-123-4567';
        const result = scrubSensitiveData(str);

        expect(result).toBe('User [SCRUBBED] email [SCRUBBED] phone [SCRUBBED]');
      });

      it('should handle special characters in non-sensitive fields', () => {
        const obj = {
          message: 'Error: <invalid> & "quotes"',
          description: 'Русский текст с символами!',
        };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;

        expect(result.message).toBe('Error: <invalid> & "quotes"');
        expect(result.description).toBe('Русский текст с символами!');
      });

      it('should handle Date objects (treated as objects)', () => {
        const obj = {
          createdAt: new Date('2026-01-15'),
          message: 'test',
        };
        const result = scrubSensitiveData(obj) as Record<string, unknown>;

        // Date objects are converted to empty objects by the iteration
        expect(result.message).toBe('test');
        expect(result.createdAt).toBeDefined();
      });
    });
  });

  describe('beforeSendHook', () => {
    const originalEnv = process.env.NODE_ENV;

    // Helper to create mock ErrorEvent (Sentry.ErrorEvent requires type: undefined)
    function createMockEvent(overrides: Record<string, unknown> = {}): Sentry.ErrorEvent {
      return {
        event_id: 'test-123',
        timestamp: Date.now() / 1000,
        type: undefined,
        ...overrides,
      } as Sentry.ErrorEvent;
    }

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    describe('test environment handling', () => {
      it('should return null in test environment', () => {
        process.env.NODE_ENV = 'test';

        const event = createMockEvent();
        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).toBeNull();
      });
    });

    describe('production environment scrubbing', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should scrub user data', () => {
        const event = createMockEvent({
          user: {
            id: 'user-123',
            email: 'user@test.com',
            username: 'testuser',
            ip_address: '192.168.1.1',
          },
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.user).toEqual({
          id: '[USER_ID]',
        });
      });

      it('should handle missing user id', () => {
        const event = createMockEvent({
          user: {
            email: 'user@test.com',
          },
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.user).toEqual({
          id: undefined,
        });
      });

      it('should scrub request headers', () => {
        const event = createMockEvent({
          request: {
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer secret-token',
              'X-Custom-Header': 'Email: user@test.com',
            },
          },
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.request!.headers!['Content-Type']).toBe('application/json');
        expect(result!.request!.headers!['Authorization']).toBe('[REDACTED]');
        expect(result!.request!.headers!['X-Custom-Header']).toBe('Email: [SCRUBBED]');
      });

      it('should scrub request data', () => {
        const event = createMockEvent({
          request: {
            data: {
              message: 'Hello',
              password: 'secret123',
              email: 'user@test.com',
            },
          },
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        const data = result!.request!.data as Record<string, unknown>;
        expect(data.message).toBe('Hello');
        expect(data.password).toBe('[REDACTED]');
        expect(data.email).toBe('[REDACTED]');
      });

      it('should scrub query string', () => {
        const event = createMockEvent({
          request: {
            query_string: 'user_id=123&token=abc',
          },
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.request!.query_string).toBe('[SCRUBBED]');
      });

      it('should scrub cookies', () => {
        const event = createMockEvent({
          request: {
            cookies: { session: 'abc123', auth: 'xyz789' },
          },
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.request!.cookies).toEqual({ scrubbed: '[SCRUBBED]' });
      });

      it('should scrub breadcrumbs', () => {
        const event = createMockEvent({
          breadcrumbs: [
            {
              category: 'http',
              message: 'Request to user@test.com',
              data: {
                url: '/api/users',
                password: 'secret',
              },
            },
            {
              category: 'console',
              message: 'Log entry',
            },
          ],
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.breadcrumbs).toHaveLength(2);
        expect(result!.breadcrumbs![0].message).toBe('Request to [SCRUBBED]');
        const data = result!.breadcrumbs![0].data as Record<string, unknown>;
        expect(data.url).toBe('/api/users');
        expect(data.password).toBe('[REDACTED]');
      });

      it('should handle breadcrumbs without data or message', () => {
        const event = createMockEvent({
          breadcrumbs: [
            {
              category: 'navigation',
              timestamp: Date.now() / 1000,
            },
          ],
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.breadcrumbs![0].data).toBeUndefined();
        expect(result!.breadcrumbs![0].message).toBeUndefined();
      });

      it('should scrub extra context', () => {
        const event = createMockEvent({
          extra: {
            userId: 'user-123',
            email: 'user@test.com',
            sessionData: 'safe value',
          },
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.extra!.userId).toBe('[REDACTED]');
        expect(result!.extra!.email).toBe('[REDACTED]');
        expect(result!.extra!.sessionData).toBe('[REDACTED]');
      });

      it('should scrub tags', () => {
        const event = createMockEvent({
          tags: {
            environment: 'production',
            userId: 'user-123',
            version: '1.0.0',
          },
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.tags!.environment).toBe('production');
        expect(result!.tags!.userId).toBe('[REDACTED]');
        expect(result!.tags!.version).toBe('1.0.0');
      });

      it('should scrub exception values', () => {
        const event = createMockEvent({
          exception: {
            values: [
              {
                type: 'Error',
                value: 'Failed for user user@test.com with id 1234567890',
                stacktrace: {
                  frames: [
                    {
                      filename: 'app.js',
                      lineno: 10,
                    },
                  ],
                },
              },
            ],
          },
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.exception!.values![0].value).toBe(
          'Failed for user [SCRUBBED] with id [SCRUBBED]'
        );
        expect(result!.exception!.values![0].type).toBe('Error');
      });

      it('should handle exception without value', () => {
        const event = createMockEvent({
          exception: {
            values: [
              {
                type: 'TypeError',
              },
            ],
          },
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.exception!.values![0].value).toBeUndefined();
        expect(result!.exception!.values![0].type).toBe('TypeError');
      });

      it('should return event when no sensitive data present', () => {
        const event = createMockEvent({
          message: 'Simple error message',
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.event_id).toBe('test-123');
        expect(result!.message).toBe('Simple error message');
      });

      it('should handle event with no optional fields', () => {
        const event = createMockEvent();

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result).toEqual(event);
      });
    });

    describe('development environment', () => {
      it('should process events in development', () => {
        process.env.NODE_ENV = 'development';

        const event = createMockEvent({
          user: {
            id: 'dev-user',
            email: 'dev@test.com',
          },
        });

        const result = beforeSendHook(event, {} as Sentry.EventHint);

        expect(result).not.toBeNull();
        expect(result!.user!.id).toBe('[USER_ID]');
      });
    });
  });

  describe('beforeSendSpanHook', () => {
    it('should parameterize user IDs in span descriptions', () => {
      const span = {
        description: 'GET /api/users/1234567890/profile',
        op: 'http.client',
      };

      const result = beforeSendSpanHook(span as any);

      expect(result.description).toBe('GET /api/users/:userId/profile');
    });

    it('should handle multiple user IDs in description', () => {
      const span = {
        description: 'Copy from /users/1234567890/ to /users/9876543210/',
        op: 'db.query',
      };

      const result = beforeSendSpanHook(span as any);

      expect(result.description).toBe('Copy from /users/:userId/ to /users/:userId/');
    });

    it('should not modify spans without user IDs', () => {
      const span = {
        description: 'GET /api/health',
        op: 'http.client',
      };

      const result = beforeSendSpanHook(span as any);

      expect(result.description).toBe('GET /api/health');
    });

    it('should handle spans without description', () => {
      const span = {
        op: 'db.query',
      };

      const result = beforeSendSpanHook(span as any);

      expect(result.description).toBeUndefined();
    });

    it('should return the span object', () => {
      const span = {
        description: 'GET /api/test',
        op: 'http.client',
        status: 'ok',
      };

      const result = beforeSendSpanHook(span as any);

      expect(result).toBe(span);
      expect(result.op).toBe('http.client');
      expect(result.status).toBe('ok');
    });

    it('should only match IDs between slashes', () => {
      const span = {
        description: 'ID: 1234567890 is not in path',
        op: 'custom',
      };

      const result = beforeSendSpanHook(span as any);

      // Should not match because ID is not between slashes
      expect(result.description).toBe('ID: 1234567890 is not in path');
    });

    it('should handle 7-digit user IDs', () => {
      const span = {
        description: 'GET /users/1234567/data',
        op: 'http.client',
      };

      const result = beforeSendSpanHook(span as any);

      expect(result.description).toBe('GET /users/:userId/data');
    });

    it('should handle 12-digit user IDs', () => {
      const span = {
        description: 'GET /users/123456789012/data',
        op: 'http.client',
      };

      const result = beforeSendSpanHook(span as any);

      expect(result.description).toBe('GET /users/:userId/data');
    });
  });

  describe('configuration constants', () => {
    describe('SENSITIVE_FIELDS', () => {
      it('should include authentication fields', () => {
        expect(SENSITIVE_FIELDS).toContain('password');
        expect(SENSITIVE_FIELDS).toContain('token');
        expect(SENSITIVE_FIELDS).toContain('apiKey');
        expect(SENSITIVE_FIELDS).toContain('api_key');
        expect(SENSITIVE_FIELDS).toContain('secret');
        expect(SENSITIVE_FIELDS).toContain('authorization');
        expect(SENSITIVE_FIELDS).toContain('bearer');
        expect(SENSITIVE_FIELDS).toContain('jwt');
        expect(SENSITIVE_FIELDS).toContain('session');
        expect(SENSITIVE_FIELDS).toContain('cookie');
        expect(SENSITIVE_FIELDS).toContain('csrf');
      });

      it('should include healthcare PHI fields (HIPAA)', () => {
        expect(SENSITIVE_FIELDS).toContain('ssn');
        expect(SENSITIVE_FIELDS).toContain('social_security');
        expect(SENSITIVE_FIELDS).toContain('medical_record');
        expect(SENSITIVE_FIELDS).toContain('diagnosis');
        expect(SENSITIVE_FIELDS).toContain('prescription');
        expect(SENSITIVE_FIELDS).toContain('insurance');
        expect(SENSITIVE_FIELDS).toContain('health_condition');
        expect(SENSITIVE_FIELDS).toContain('isi_score');
        expect(SENSITIVE_FIELDS).toContain('sleep_data');
        expect(SENSITIVE_FIELDS).toContain('therapy_notes');
      });

      it('should include PII fields', () => {
        expect(SENSITIVE_FIELDS).toContain('email');
        expect(SENSITIVE_FIELDS).toContain('phone');
        expect(SENSITIVE_FIELDS).toContain('address');
        expect(SENSITIVE_FIELDS).toContain('birth_date');
        expect(SENSITIVE_FIELDS).toContain('date_of_birth');
        expect(SENSITIVE_FIELDS).toContain('dob');
        expect(SENSITIVE_FIELDS).toContain('first_name');
        expect(SENSITIVE_FIELDS).toContain('last_name');
        expect(SENSITIVE_FIELDS).toContain('full_name');
        expect(SENSITIVE_FIELDS).toContain('telegram_id');
        expect(SENSITIVE_FIELDS).toContain('external_id');
        expect(SENSITIVE_FIELDS).toContain('user_id');
        expect(SENSITIVE_FIELDS).toContain('userId');
        expect(SENSITIVE_FIELDS).toContain('dbUserId');
      });
    });

    describe('SENSITIVE_PATTERNS', () => {
      it('should have 4 pattern types', () => {
        expect(SENSITIVE_PATTERNS).toHaveLength(4);
      });

      it('should match email addresses', () => {
        const emailPattern = SENSITIVE_PATTERNS[0];
        expect('test@example.com').toMatch(emailPattern);
        expect('user.name+tag@company.co.uk').toMatch(emailPattern);
      });

      it('should match phone numbers', () => {
        const phonePattern = SENSITIVE_PATTERNS[1];
        expect('+7-999-123-4567').toMatch(phonePattern);
        expect('(495) 123-4567').toMatch(phonePattern);
      });

      it('should match Telegram IDs', () => {
        const telegramPattern = SENSITIVE_PATTERNS[2];
        expect('1234567').toMatch(telegramPattern);
        expect('123456789012').toMatch(telegramPattern);
      });

      it('should match credit card numbers', () => {
        const ccPattern = SENSITIVE_PATTERNS[3];
        expect('1234-5678-9012-3456').toMatch(ccPattern);
        expect('1234 5678 9012 3456').toMatch(ccPattern);
      });
    });
  });
});
