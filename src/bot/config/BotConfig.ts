/**
 * Telegram Bot Configuration Schema
 *
 * Zod-based validation for bot configuration
 * Based on: 12-factor app config, Zod best practices
 *
 * @module core/telegram/config
 * @author @sleepcore/app
 * @v1.0.0
 */

import { z } from 'zod';

// ==================== Schema Definitions ====================

/**
 * Rate limiter configuration schema
 */
export const RateLimiterConfigSchema = z.object({
  timeFrame: z.number().int().positive().default(60000).describe('Time frame in milliseconds'),
  limit: z.number().int().positive().default(30).describe('Max requests per time frame'),
}).strict();

/**
 * Session storage configuration schema
 */
export const SessionStorageConfigSchema = z.object({
  type: z.enum(['memory', 'sqlite']).default('memory').describe('Storage type'),
  sqlitePath: z.string().default('./data/sessions.db').describe('SQLite database path'),
  ttlSeconds: z.number().int().min(0).default(86400).describe('Session TTL in seconds (0 = no expiration)'),
  tableName: z.string().min(1).default('bot_sessions').describe('Table name for SQLite storage'),
}).strict();

/**
 * Polling configuration schema
 */
export const PollingConfigSchema = z.object({
  timeout: z.number().int().min(1).max(60).default(30).describe('Long polling timeout in seconds'),
  limit: z.number().int().min(1).max(100).default(100).describe('Max updates per request'),
  allowedUpdates: z.array(z.enum([
    'message',
    'edited_message',
    'channel_post',
    'edited_channel_post',
    'inline_query',
    'chosen_inline_result',
    'callback_query',
    'shipping_query',
    'pre_checkout_query',
    'poll',
    'poll_answer',
    'my_chat_member',
    'chat_member',
    'chat_join_request',
  ])).optional().describe('Types of updates to receive'),
  dropPendingUpdates: z.boolean().default(false).describe('Drop pending updates on start'),
}).strict();

/**
 * Webhook configuration schema
 */
export const WebhookConfigSchema = z.object({
  url: z.string().url().describe('Webhook URL'),
  secretToken: z.string().min(1).optional().describe('Secret token for webhook verification'),
  port: z.number().int().min(1).max(65535).default(3000).describe('Port for webhook server'),
  path: z.string().default('/webhook').describe('Path for webhook endpoint'),
  maxConnections: z.number().int().min(1).max(100).default(40).describe('Maximum simultaneous connections'),
}).strict();

/**
 * Error handler configuration schema
 */
export const ErrorHandlerConfigSchema = z.object({
  logErrors: z.boolean().default(true).describe('Log errors to console'),
  reportErrors: z.boolean().default(false).describe('Report errors to external service'),
  retryOnError: z.boolean().default(true).describe('Retry failed operations'),
  maxRetries: z.number().int().min(0).max(10).default(3).describe('Max retry attempts'),
}).strict();

/**
 * Bot command schema
 */
export const BotCommandSchema = z.object({
  command: z.string().min(1).max(32).regex(/^[a-z0-9_]+$/, 'Command must be lowercase alphanumeric with underscores'),
  description: z.string().min(1).max(256).describe('Command description'),
}).strict();

/**
 * Main bot configuration schema
 */
export const BotConfigSchema = z.object({
  token: z.string().min(30).describe('Telegram bot token from @BotFather'),
  polling: PollingConfigSchema.optional().describe('Polling configuration'),
  webhook: WebhookConfigSchema.optional().describe('Webhook configuration (alternative to polling)'),
  sessionEnabled: z.boolean().default(true).describe('Enable session storage'),
  sessionStorage: SessionStorageConfigSchema.optional().describe('Session storage configuration'),
  rateLimit: RateLimiterConfigSchema.optional().describe('Rate limiter configuration'),
  commands: z.array(BotCommandSchema).optional().describe('Bot commands to register'),
  defaultParseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).default('HTML').describe('Default message parse mode'),
  errorHandler: ErrorHandlerConfigSchema.optional().describe('Error handling configuration'),
}).strict().refine(
  (data: { polling?: unknown; webhook?: unknown }) => !(data.polling && data.webhook),
  { message: 'Cannot use both polling and webhook configurations' }
);

// ==================== Type Exports ====================

export type RateLimiterConfigInput = z.input<typeof RateLimiterConfigSchema>;
export type SessionStorageConfigInput = z.input<typeof SessionStorageConfigSchema>;
export type PollingConfigInput = z.input<typeof PollingConfigSchema>;
export type WebhookConfigInput = z.input<typeof WebhookConfigSchema>;
export type ErrorHandlerConfigInput = z.input<typeof ErrorHandlerConfigSchema>;
export type BotCommandInput = z.input<typeof BotCommandSchema>;
export type BotConfigInput = z.input<typeof BotConfigSchema>;

export type RateLimiterConfigOutput = z.output<typeof RateLimiterConfigSchema>;
export type SessionStorageConfigOutput = z.output<typeof SessionStorageConfigSchema>;
export type PollingConfigOutput = z.output<typeof PollingConfigSchema>;
export type WebhookConfigOutput = z.output<typeof WebhookConfigSchema>;
export type ErrorHandlerConfigOutput = z.output<typeof ErrorHandlerConfigSchema>;
export type BotCommandOutput = z.output<typeof BotCommandSchema>;
export type BotConfigOutput = z.output<typeof BotConfigSchema>;

// ==================== Validation Functions ====================

/**
 * Configuration validation error
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }

  /**
   * Get formatted error messages
   */
  getFormattedErrors(): string[] {
    return this.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    });
  }
}

/**
 * Validate bot configuration
 * @throws ConfigValidationError if validation fails
 */
export function validateBotConfig(config: unknown): BotConfigOutput {
  const result = BotConfigSchema.safeParse(config);

  if (!result.success) {
    throw new ConfigValidationError(
      'Invalid bot configuration',
      result.error.issues
    );
  }

  return result.data;
}

/**
 * Validate bot configuration (safe version)
 * @returns Validation result without throwing
 */
export function safeParseBotConfig(config: unknown) {
  return BotConfigSchema.safeParse(config);
}

/**
 * Create bot config from environment variables
 */
export function createBotConfigFromEnv(): BotConfigOutput {
  const env = process.env;
  const nodeEnv = env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';

  const config: BotConfigInput = {
    token: env.BOT_TOKEN || '',
    polling: {
      timeout: parseInt(env.BOT_POLLING_TIMEOUT || '30', 10),
      dropPendingUpdates: isProd || env.BOT_DROP_PENDING_UPDATES === 'true',
    },
    sessionEnabled: env.BOT_SESSION_ENABLED !== 'false',
    sessionStorage: {
      type: (env.BOT_SESSION_TYPE as 'memory' | 'sqlite') || (isProd ? 'sqlite' : 'memory'),
      sqlitePath: env.BOT_SESSION_DB_PATH || './data/sessions.db',
      ttlSeconds: parseInt(env.BOT_SESSION_TTL || '86400', 10),
    },
    rateLimit: {
      timeFrame: parseInt(env.BOT_RATE_LIMIT_TIMEFRAME || '60000', 10),
      limit: parseInt(env.BOT_RATE_LIMIT || '30', 10),
    },
    defaultParseMode: (env.BOT_PARSE_MODE as 'HTML' | 'Markdown' | 'MarkdownV2') || 'HTML',
    errorHandler: {
      logErrors: env.BOT_LOG_ERRORS !== 'false',
      reportErrors: env.BOT_REPORT_ERRORS === 'true',
      maxRetries: parseInt(env.BOT_MAX_RETRIES || '3', 10),
    },
  };

  return validateBotConfig(config);
}

// ==================== Default Export ====================

export default BotConfigSchema;
