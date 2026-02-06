/**
 * BotConfig Unit Tests
 * ====================
 * Tests for Telegram Bot configuration validation using Zod schemas.
 *
 * @module @sleepcore/bot/config
 */

import type { ZodIssue } from 'zod';
import {
  BotConfigSchema,
  RateLimiterConfigSchema,
  SessionStorageConfigSchema,
  PollingConfigSchema,
  WebhookConfigSchema,
  ErrorHandlerConfigSchema,
  BotCommandSchema,
  ConfigValidationError,
  validateBotConfig,
  safeParseBotConfig,
  createBotConfigFromEnv,
} from '../../../../src/bot/config/BotConfig';

describe('BotConfig', () => {
  const validToken = 'a'.repeat(46); // Valid token length (>= 30)

  describe('RateLimiterConfigSchema', () => {
    it('should validate valid rate limiter config', () => {
      const config = { timeFrame: 60000, limit: 30 };
      const result = RateLimiterConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should use default values when not provided', () => {
      const result = RateLimiterConfigSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timeFrame).toBe(60000);
        expect(result.data.limit).toBe(30);
      }
    });

    it('should reject non-positive timeFrame', () => {
      const config = { timeFrame: 0, limit: 30 };
      const result = RateLimiterConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject non-integer timeFrame', () => {
      const config = { timeFrame: 60000.5, limit: 30 };
      const result = RateLimiterConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject non-positive limit', () => {
      const config = { timeFrame: 60000, limit: -1 };
      const result = RateLimiterConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });
  });

  describe('SessionStorageConfigSchema', () => {
    it('should validate memory storage type', () => {
      const config = { type: 'memory' as const };
      const result = SessionStorageConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should validate sqlite storage type', () => {
      const config = { type: 'sqlite' as const, sqlitePath: './db.sqlite' };
      const result = SessionStorageConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const result = SessionStorageConfigSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('memory');
        expect(result.data.sqlitePath).toBe('./data/sessions.db');
        expect(result.data.ttlSeconds).toBe(86400);
        expect(result.data.tableName).toBe('bot_sessions');
      }
    });

    it('should reject invalid storage type', () => {
      const config = { type: 'redis' };
      const result = SessionStorageConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject negative ttlSeconds', () => {
      const config = { type: 'memory' as const, ttlSeconds: -1 };
      const result = SessionStorageConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should allow zero ttlSeconds (no expiration)', () => {
      const config = { type: 'memory' as const, ttlSeconds: 0 };
      const result = SessionStorageConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });
  });

  describe('PollingConfigSchema', () => {
    it('should validate valid polling config', () => {
      const config = { timeout: 30, limit: 100 };
      const result = PollingConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const result = PollingConfigSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timeout).toBe(30);
        expect(result.data.limit).toBe(100);
        expect(result.data.dropPendingUpdates).toBe(false);
      }
    });

    it('should reject timeout < 1', () => {
      const config = { timeout: 0 };
      const result = PollingConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject timeout > 60', () => {
      const config = { timeout: 61 };
      const result = PollingConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject limit < 1', () => {
      const config = { limit: 0 };
      const result = PollingConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject limit > 100', () => {
      const config = { limit: 101 };
      const result = PollingConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should validate allowedUpdates with valid update types', () => {
      const config = { allowedUpdates: ['message', 'callback_query'] };
      const result = PollingConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject invalid update type', () => {
      const config = { allowedUpdates: ['invalid_type'] };
      const result = PollingConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });
  });

  describe('WebhookConfigSchema', () => {
    it('should validate valid webhook config', () => {
      const config = {
        url: 'https://example.com/webhook',
        port: 3000,
        path: '/webhook',
      };
      const result = WebhookConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const config = { url: 'not-a-url' };
      const result = WebhookConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject port < 1', () => {
      const config = {
        url: 'https://example.com',
        port: 0,
      };
      const result = WebhookConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject port > 65535', () => {
      const config = {
        url: 'https://example.com',
        port: 65536,
      };
      const result = WebhookConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should use default values', () => {
      const result = WebhookConfigSchema.safeParse({ url: 'https://example.com' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.port).toBe(3000);
        expect(result.data.path).toBe('/webhook');
        expect(result.data.maxConnections).toBe(40);
      }
    });

    it('should accept optional secretToken', () => {
      const config = {
        url: 'https://example.com',
        secretToken: 'secret123',
      };
      const result = WebhookConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });
  });

  describe('ErrorHandlerConfigSchema', () => {
    it('should validate valid error handler config', () => {
      const config = {
        logErrors: true,
        reportErrors: false,
        retryOnError: true,
        maxRetries: 3,
      };
      const result = ErrorHandlerConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const result = ErrorHandlerConfigSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logErrors).toBe(true);
        expect(result.data.reportErrors).toBe(false);
        expect(result.data.retryOnError).toBe(true);
        expect(result.data.maxRetries).toBe(3);
      }
    });

    it('should reject maxRetries < 0', () => {
      const config = { maxRetries: -1 };
      const result = ErrorHandlerConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject maxRetries > 10', () => {
      const config = { maxRetries: 11 };
      const result = ErrorHandlerConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should allow maxRetries = 0', () => {
      const config = { maxRetries: 0 };
      const result = ErrorHandlerConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });
  });

  describe('BotCommandSchema', () => {
    it('should validate valid command', () => {
      const config = { command: 'start', description: 'Start the bot' };
      const result = BotCommandSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should accept lowercase with underscores', () => {
      const config = { command: 'my_command', description: 'Description' };
      const result = BotCommandSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should accept alphanumeric commands', () => {
      const config = { command: 'test123', description: 'Description' };
      const result = BotCommandSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject uppercase letters', () => {
      const config = { command: 'Start', description: 'Description' };
      const result = BotCommandSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject special characters', () => {
      const config = { command: 'my-command', description: 'Description' };
      const result = BotCommandSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject empty command', () => {
      const config = { command: '', description: 'Description' };
      const result = BotCommandSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject command > 32 characters', () => {
      const config = { command: 'a'.repeat(33), description: 'Description' };
      const result = BotCommandSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject empty description', () => {
      const config = { command: 'start', description: '' };
      const result = BotCommandSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject description > 256 characters', () => {
      const config = { command: 'start', description: 'a'.repeat(257) };
      const result = BotCommandSchema.safeParse(config);

      expect(result.success).toBe(false);
    });
  });

  describe('BotConfigSchema', () => {
    it('should validate minimal valid config', () => {
      const config = { token: validToken };
      const result = BotConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject token < 30 characters', () => {
      const config = { token: 'short' };
      const result = BotConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should validate config with polling', () => {
      const config = {
        token: validToken,
        polling: { timeout: 30 },
      };
      const result = BotConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should validate config with webhook', () => {
      const config = {
        token: validToken,
        webhook: { url: 'https://example.com/webhook' },
      };
      const result = BotConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject config with both polling and webhook', () => {
      const config = {
        token: validToken,
        polling: { timeout: 30 },
        webhook: { url: 'https://example.com/webhook' },
      };
      const result = BotConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('polling and webhook');
      }
    });

    it('should use default parse mode', () => {
      const result = BotConfigSchema.safeParse({ token: validToken });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.defaultParseMode).toBe('HTML');
      }
    });

    it('should validate all parse modes', () => {
      for (const mode of ['HTML', 'Markdown', 'MarkdownV2'] as const) {
        const result = BotConfigSchema.safeParse({
          token: validToken,
          defaultParseMode: mode,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid parse mode', () => {
      const config = {
        token: validToken,
        defaultParseMode: 'invalid',
      };
      const result = BotConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should validate config with commands', () => {
      const config = {
        token: validToken,
        commands: [
          { command: 'start', description: 'Start bot' },
          { command: 'help', description: 'Get help' },
        ],
      };
      const result = BotConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should default sessionEnabled to true', () => {
      const result = BotConfigSchema.safeParse({ token: validToken });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionEnabled).toBe(true);
      }
    });
  });

  describe('ConfigValidationError', () => {
    it('should create error with message and issues', () => {
      const issues = [
        {
          code: 'too_small' as const,
          minimum: 30,
          type: 'string' as const,
          inclusive: true,
          exact: false,
          message: 'Token too short',
          path: ['token'],
        },
      ];
      const error = new ConfigValidationError('Invalid config', issues);

      expect(error.message).toBe('Invalid config');
      expect(error.name).toBe('ConfigValidationError');
      expect(error.issues).toEqual(issues);
    });

    it('should format errors with path', () => {
      const issues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          message: 'Expected string',
          path: ['token'],
        },
      ];
      const error = new ConfigValidationError('Invalid config', issues);
      const formatted = error.getFormattedErrors();

      expect(formatted).toEqual(['token: Expected string']);
    });

    it('should format errors without path', () => {
      const issues: ZodIssue[] = [
        {
          code: 'custom',
          message: 'Custom error',
          path: [],
        },
      ];
      const error = new ConfigValidationError('Invalid config', issues);
      const formatted = error.getFormattedErrors();

      expect(formatted).toEqual(['Custom error']);
    });

    it('should format multiple errors', () => {
      const issues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          message: 'Expected string',
          path: ['token'],
        },
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          message: 'Expected number',
          path: ['polling', 'timeout'],
        },
      ];
      const error = new ConfigValidationError('Invalid config', issues);
      const formatted = error.getFormattedErrors();

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toBe('token: Expected string');
      expect(formatted[1]).toBe('polling.timeout: Expected number');
    });
  });

  describe('validateBotConfig', () => {
    it('should return validated config for valid input', () => {
      const config = validateBotConfig({ token: validToken });

      expect(config.token).toBe(validToken);
      expect(config.defaultParseMode).toBe('HTML');
    });

    it('should throw ConfigValidationError for invalid input', () => {
      expect(() => validateBotConfig({ token: 'short' })).toThrow(ConfigValidationError);
    });

    it('should include error details in thrown error', () => {
      try {
        validateBotConfig({ token: 'short' });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        const validationError = error as ConfigValidationError;
        expect(validationError.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('safeParseBotConfig', () => {
    it('should return success result for valid config', () => {
      const result = safeParseBotConfig({ token: validToken });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toBe(validToken);
      }
    });

    it('should return error result for invalid config', () => {
      const result = safeParseBotConfig({ token: 'short' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should not throw for invalid config', () => {
      expect(() => safeParseBotConfig({ token: 'short' })).not.toThrow();
    });
  });

  describe('createBotConfigFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create config from environment variables', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.NODE_ENV = 'development';

      const config = createBotConfigFromEnv();

      expect(config.token).toBe(validToken);
    });

    it('should use production defaults in production mode', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.NODE_ENV = 'production';

      const config = createBotConfigFromEnv();

      expect(config.polling?.dropPendingUpdates).toBe(true);
      expect(config.sessionStorage?.type).toBe('sqlite');
    });

    it('should use development defaults in development mode', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.NODE_ENV = 'development';

      const config = createBotConfigFromEnv();

      expect(config.polling?.dropPendingUpdates).toBe(false);
      expect(config.sessionStorage?.type).toBe('memory');
    });

    it('should parse custom polling timeout', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.BOT_POLLING_TIMEOUT = '45';

      const config = createBotConfigFromEnv();

      expect(config.polling?.timeout).toBe(45);
    });

    it('should parse rate limit settings', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.BOT_RATE_LIMIT_TIMEFRAME = '120000';
      process.env.BOT_RATE_LIMIT = '50';

      const config = createBotConfigFromEnv();

      expect(config.rateLimit?.timeFrame).toBe(120000);
      expect(config.rateLimit?.limit).toBe(50);
    });

    it('should parse session TTL', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.BOT_SESSION_TTL = '3600';

      const config = createBotConfigFromEnv();

      expect(config.sessionStorage?.ttlSeconds).toBe(3600);
    });

    it('should parse error handler settings', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.BOT_LOG_ERRORS = 'false';
      process.env.BOT_REPORT_ERRORS = 'true';
      process.env.BOT_MAX_RETRIES = '5';

      const config = createBotConfigFromEnv();

      expect(config.errorHandler?.logErrors).toBe(false);
      expect(config.errorHandler?.reportErrors).toBe(true);
      expect(config.errorHandler?.maxRetries).toBe(5);
    });

    it('should use custom parse mode', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.BOT_PARSE_MODE = 'MarkdownV2';

      const config = createBotConfigFromEnv();

      expect(config.defaultParseMode).toBe('MarkdownV2');
    });

    it('should disable session when configured', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.BOT_SESSION_ENABLED = 'false';

      const config = createBotConfigFromEnv();

      expect(config.sessionEnabled).toBe(false);
    });

    it('should throw for missing token', () => {
      process.env.BOT_TOKEN = '';

      expect(() => createBotConfigFromEnv()).toThrow(ConfigValidationError);
    });

    it('should use explicit drop pending updates flag', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.NODE_ENV = 'development';
      process.env.BOT_DROP_PENDING_UPDATES = 'true';

      const config = createBotConfigFromEnv();

      expect(config.polling?.dropPendingUpdates).toBe(true);
    });

    it('should use custom session database path', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.BOT_SESSION_DB_PATH = './custom/path.db';

      const config = createBotConfigFromEnv();

      expect(config.sessionStorage?.sqlitePath).toBe('./custom/path.db');
    });

    it('should use custom session type', () => {
      process.env.BOT_TOKEN = validToken;
      process.env.NODE_ENV = 'development';
      process.env.BOT_SESSION_TYPE = 'sqlite';

      const config = createBotConfigFromEnv();

      expect(config.sessionStorage?.type).toBe('sqlite');
    });
  });
});
