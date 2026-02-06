/**
 * SleepCoreTelegramAdapter Tests
 * ================================
 *
 * IEC 62304 Class B - Bot adapter verification tests
 * Comprehensive unit tests for Telegram adapter implementation.
 *
 * Tests verify:
 * - Lifecycle (initialize, start, stop)
 * - Message sending and receiving
 * - Callback query handling
 * - Circuit breaker pattern
 * - Error handling
 * - Metrics tracking
 *
 * @packageDocumentation
 */

import { Bot, Context, GrammyError } from 'grammy';
import {
  SleepCoreTelegramAdapter,
  createSleepCoreAdapter,
  createSleepCoreAdapterFromEnv,
  type SleepCoreAdapterOptions,
} from '../SleepCoreTelegramAdapter';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Grammy Bot
jest.mock('grammy', () => {
  const originalModule = jest.requireActual('grammy');

  // Mock Bot class
  class MockBot {
    api = {
      getMe: jest.fn().mockResolvedValue({
        id: 123456789,
        is_bot: true,
        first_name: 'TestBot',
        username: 'test_bot',
      }),
      sendMessage: jest.fn().mockResolvedValue({
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 12345, type: 'private' },
        text: 'Test message',
      }),
      sendPhoto: jest.fn().mockResolvedValue({
        message_id: 2,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 12345, type: 'private' },
      }),
      sendDocument: jest.fn().mockResolvedValue({
        message_id: 3,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 12345, type: 'private' },
      }),
      editMessageText: jest.fn().mockResolvedValue({
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 12345, type: 'private' },
        text: 'Edited message',
      }),
      deleteMessage: jest.fn().mockResolvedValue(true),
      answerCallbackQuery: jest.fn().mockResolvedValue(true),
      sendChatAction: jest.fn().mockResolvedValue(true),
      getChat: jest.fn().mockResolvedValue({
        id: 12345,
        type: 'private',
        first_name: 'Test',
        username: 'test_user',
      }),
      getWebhookInfo: jest.fn().mockResolvedValue({
        url: '',
        has_custom_certificate: false,
        pending_update_count: 0,
      }),
      setWebhook: jest.fn().mockResolvedValue(true),
      deleteWebhook: jest.fn().mockResolvedValue(true),
      config: {
        use: jest.fn(),
      },
    };

    private handlers: Map<string, Function[]> = new Map();
    private catchHandler?: Function;

    use = jest.fn();
    on = jest.fn((event: string, handler: Function) => {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, []);
      }
      this.handlers.get(event)!.push(handler);
    });
    catch = jest.fn((handler: Function) => {
      this.catchHandler = handler;
    });
    start = jest.fn();
    stop = jest.fn().mockResolvedValue(undefined);
    handleUpdate = jest.fn();

    // Helper to trigger handlers in tests
    triggerHandler(event: string, ctx: unknown): Promise<void> {
      const handlers = this.handlers.get(event) || [];
      return Promise.all(handlers.map(h => h(ctx))).then(() => {});
    }

    triggerError(error: Error): void {
      if (this.catchHandler) {
        this.catchHandler({ error, ctx: {} });
      }
    }
  }

  return {
    ...originalModule,
    Bot: MockBot,
    InputFile: class MockInputFile {
      constructor(public data: Buffer | string, public filename?: string) {}
    },
  };
});

// Mock @grammyjs/auto-retry
jest.mock('@grammyjs/auto-retry', () => ({
  autoRetry: jest.fn(() => jest.fn()),
}));

// Mock @grammyjs/runner
jest.mock('@grammyjs/runner', () => ({
  run: jest.fn(() => ({
    stop: jest.fn(),
  })),
}));

// Mock @grammyjs/hydrate
jest.mock('@grammyjs/hydrate', () => ({
  hydrate: jest.fn(() => jest.fn()),
}));

// ============================================================================
// Test Utilities
// ============================================================================

function createAdapter(options?: Partial<SleepCoreAdapterOptions>): SleepCoreTelegramAdapter {
  return new SleepCoreTelegramAdapter({
    botToken: 'test-token-123',
    ...options,
  });
}

function createMockContext(overrides: Partial<any> = {}): any {
  return {
    message: {
      message_id: 123,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 12345, type: 'private' },
      from: {
        id: 67890,
        is_bot: false,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'en',
      },
      text: 'Hello bot',
    },
    chat: { id: 12345, type: 'private' },
    from: {
      id: 67890,
      is_bot: false,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'en',
    },
    callbackQuery: {
      id: 'query-123',
      from: {
        id: 67890,
        is_bot: false,
        first_name: 'Test',
        username: 'testuser',
      },
      message: {
        message_id: 456,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 12345, type: 'private' },
        text: 'Original message',
      },
      data: 'callback_data',
    },
    answerCallbackQuery: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('SleepCoreTelegramAdapter', () => {
  let adapter: SleepCoreTelegramAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = createAdapter();
  });

  afterEach(async () => {
    if (adapter.isRunning()) {
      await adapter.stop();
    }
  });

  // ==========================================================================
  // Construction
  // ==========================================================================
  describe('Construction', () => {
    it('should create adapter with valid token', () => {
      expect(adapter).toBeInstanceOf(SleepCoreTelegramAdapter);
      expect(adapter.platform).toBe('telegram');
      expect(adapter.name).toBe('Telegram (Grammy)');
    });

    it('should throw error without bot token', () => {
      expect(() => {
        new SleepCoreTelegramAdapter({ botToken: '' });
      }).toThrow('Bot token is required');
    });

    it('should have Telegram capabilities', () => {
      expect(adapter.capabilities).toBeDefined();
      expect(adapter.capabilities.maxMessageLength).toBeGreaterThan(0);
      expect(adapter.capabilities.supportsInlineButtons).toBe(true);
    });

    it('should use default options', () => {
      const defaultAdapter = createAdapter();
      const metrics = defaultAdapter.getMetrics();
      expect(metrics.messagesReceived).toBe(0);
      expect(metrics.messagesSent).toBe(0);
    });
  });

  // ==========================================================================
  // Lifecycle
  // ==========================================================================
  describe('Lifecycle', () => {
    it('should initialize successfully', async () => {
      await adapter.initialize();
      // getMe should be called
      expect(adapter.getBot().api.getMe).toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      await adapter.initialize();
      await adapter.initialize();
      // getMe should only be called once
      expect(adapter.getBot().api.getMe).toHaveBeenCalledTimes(1);
    });

    it('should start in polling mode', async () => {
      await adapter.start();
      expect(adapter.isRunning()).toBe(true);
    });

    it('should not start twice', async () => {
      await adapter.start();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await adapter.start();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Already running'));
      consoleSpy.mockRestore();
    });

    it('should stop successfully', async () => {
      await adapter.start();
      expect(adapter.isRunning()).toBe(true);
      await adapter.stop();
      expect(adapter.isRunning()).toBe(false);
    });

    it('should not stop if not running', async () => {
      expect(adapter.isRunning()).toBe(false);
      await adapter.stop();
      expect(adapter.isRunning()).toBe(false);
    });

    it('should start in webhook mode', async () => {
      const webhookAdapter = createAdapter({
        useWebhooks: true,
        webhookUrl: 'https://example.com/webhook',
      });
      await webhookAdapter.start();
      expect(webhookAdapter.getBot().api.setWebhook).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.any(Object)
      );
    });

    it('should throw error in webhook mode without URL', async () => {
      const webhookAdapter = createAdapter({
        useWebhooks: true,
      });
      await expect(webhookAdapter.start()).rejects.toThrow('Webhook URL required');
    });

    it('should start with runner when useRunner is true', async () => {
      const runnerAdapter = createAdapter({
        useRunner: true,
      });
      await runnerAdapter.start();
      expect(runnerAdapter.isRunning()).toBe(true);
    });
  });

  // ==========================================================================
  // Messaging
  // ==========================================================================
  describe('Messaging', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should send text message', async () => {
      const result = await adapter.sendMessage('12345', 'Hello world');
      expect(adapter.getBot().api.sendMessage).toHaveBeenCalledWith(
        '12345',
        'Hello world',
        expect.any(Object)
      );
      expect(result.platform).toBe('telegram');
      expect(result.chatId).toBe('12345');
    });

    it('should send message with parse mode', async () => {
      await adapter.sendMessage('12345', '*Bold* text', { parseMode: 'Markdown' });
      expect(adapter.getBot().api.sendMessage).toHaveBeenCalledWith(
        '12345',
        '*Bold* text',
        expect.objectContaining({ parse_mode: 'Markdown' })
      );
    });

    it('should send message with inline keyboard', async () => {
      await adapter.sendMessage('12345', 'Choose:', {
        inlineKeyboard: [
          [{ text: 'Option 1', callbackData: 'opt1' }],
          [{ text: 'Option 2', callbackData: 'opt2' }],
        ],
      });
      expect(adapter.getBot().api.sendMessage).toHaveBeenCalledWith(
        '12345',
        'Choose:',
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array),
          }),
        })
      );
    });

    it('should send message with reply keyboard', async () => {
      await adapter.sendMessage('12345', 'Select:', {
        replyKeyboard: [[{ text: 'Button 1' }, { text: 'Button 2' }]],
      });
      expect(adapter.getBot().api.sendMessage).toHaveBeenCalledWith(
        '12345',
        'Select:',
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            keyboard: expect.any(Array),
          }),
        })
      );
    });

    it('should send message with remove keyboard', async () => {
      await adapter.sendMessage('12345', 'Keyboard removed', {
        removeKeyboard: true,
      });
      expect(adapter.getBot().api.sendMessage).toHaveBeenCalledWith(
        '12345',
        'Keyboard removed',
        expect.objectContaining({
          reply_markup: { remove_keyboard: true },
        })
      );
    });

    it('should send message with reply', async () => {
      await adapter.sendMessage('12345', 'Reply', { replyToMessageId: '100' });
      expect(adapter.getBot().api.sendMessage).toHaveBeenCalledWith(
        '12345',
        'Reply',
        expect.objectContaining({
          reply_parameters: { message_id: 100 },
        })
      );
    });

    it('should send photo', async () => {
      const result = await adapter.sendPhoto('12345', 'photo_file_id', {
        caption: 'Photo caption',
      });
      expect(adapter.getBot().api.sendPhoto).toHaveBeenCalled();
      expect(result.chatId).toBe('12345');
    });

    it('should send photo from buffer', async () => {
      const buffer = Buffer.from('fake-image-data');
      await adapter.sendPhoto('12345', buffer);
      expect(adapter.getBot().api.sendPhoto).toHaveBeenCalled();
    });

    it('should send document', async () => {
      await adapter.sendDocument('12345', 'document_file_id', {
        caption: 'Document',
        fileName: 'test.pdf',
      });
      expect(adapter.getBot().api.sendDocument).toHaveBeenCalled();
    });

    it('should edit message', async () => {
      const result = await adapter.editMessage('12345', '1', 'Edited text');
      expect(adapter.getBot().api.editMessageText).toHaveBeenCalledWith(
        '12345',
        1,
        'Edited text',
        expect.any(Object)
      );
      expect(result.text).toBe('Edited message');
    });

    it('should handle edit message returning boolean', async () => {
      (adapter.getBot().api.editMessageText as jest.Mock).mockResolvedValueOnce(true);
      const result = await adapter.editMessage('12345', '1', 'Inline edit');
      expect(result.messageId).toBe('1');
    });

    it('should delete message', async () => {
      const result = await adapter.deleteMessage('12345', '1');
      expect(adapter.getBot().api.deleteMessage).toHaveBeenCalledWith('12345', 1);
      expect(result).toBe(true);
    });

    it('should answer callback query', async () => {
      const result = await adapter.answerCallbackQuery('query-123', {
        text: 'Answered',
        showAlert: true,
      });
      expect(adapter.getBot().api.answerCallbackQuery).toHaveBeenCalledWith('query-123', {
        text: 'Answered',
        show_alert: true,
      });
      expect(result).toBe(true);
    });

    it('should send typing indicator', async () => {
      await adapter.sendTypingIndicator('12345');
      expect(adapter.getBot().api.sendChatAction).toHaveBeenCalledWith('12345', 'typing');
    });

    it('should track metrics on message sent', async () => {
      await adapter.sendMessage('12345', 'Test');
      const metrics = adapter.getMetrics();
      expect(metrics.messagesSent).toBe(1);
      expect(metrics.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // User/Chat Info
  // ==========================================================================
  describe('User/Chat Info', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should return null for getUser (not supported)', async () => {
      const user = await adapter.getUser('12345');
      expect(user).toBeNull();
    });

    it('should get chat info', async () => {
      const chat = await adapter.getChat('12345');
      expect(chat).toBeDefined();
      expect(chat?.platformChatId).toBe('12345');
      expect(chat?.platform).toBe('telegram');
    });

    it('should return null on chat fetch error', async () => {
      (adapter.getBot().api.getChat as jest.Mock).mockRejectedValueOnce(
        new Error('Chat not found')
      );
      const chat = await adapter.getChat('invalid');
      expect(chat).toBeNull();
    });
  });

  // ==========================================================================
  // Event Handlers
  // ==========================================================================
  describe('Event Handlers', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should register message handler', async () => {
      const handler = jest.fn();
      adapter.onMessage(handler);
      // Handler is stored internally
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register callback query handler', async () => {
      const handler = jest.fn();
      adapter.onCallbackQuery(handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should register error handler', async () => {
      const handler = jest.fn();
      adapter.onError(handler);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Webhook Support
  // ==========================================================================
  describe('Webhook Support', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should get webhook info', async () => {
      const info = await adapter.getWebhookInfo();
      expect(info).toBeDefined();
      expect(info.pendingUpdateCount).toBe(0);
    });

    it('should set webhook', async () => {
      const result = await adapter.setWebhook('https://example.com/webhook', {
        maxConnections: 40,
        dropPendingUpdates: true,
      });
      expect(adapter.getBot().api.setWebhook).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should delete webhook', async () => {
      const result = await adapter.deleteWebhook();
      expect(adapter.getBot().api.deleteWebhook).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle webhook update', async () => {
      const update = { update_id: 1 };
      await adapter.handleWebhook(update);
      expect(adapter.getBot().handleUpdate).toHaveBeenCalledWith(update);
    });
  });

  // ==========================================================================
  // Circuit Breaker
  // ==========================================================================
  describe('Circuit Breaker', () => {
    beforeEach(async () => {
      adapter = createAdapter({
        circuitBreakerThreshold: 3,
        circuitResetMs: 1000,
      });
      await adapter.initialize();
    });

    it('should have circuit closed initially', () => {
      const status = adapter.getCircuitStatus();
      expect(status.open).toBe(false);
      expect(status.errorCount).toBe(0);
    });

    it('should open circuit after threshold errors', async () => {
      // Simulate errors
      (adapter.getBot().api.sendMessage as jest.Mock).mockRejectedValue(new Error('Test error'));

      for (let i = 0; i < 3; i++) {
        try {
          await adapter.sendMessage('12345', 'Test');
        } catch {
          // Expected
        }
      }

      const status = adapter.getCircuitStatus();
      expect(status.open).toBe(true);
      expect(status.errorCount).toBe(3);
    });

    it('should manually reset circuit', async () => {
      // Trip the circuit
      (adapter.getBot().api.sendMessage as jest.Mock).mockRejectedValue(new Error('Test error'));
      for (let i = 0; i < 3; i++) {
        try {
          await adapter.sendMessage('12345', 'Test');
        } catch {
          // Expected
        }
      }

      expect(adapter.getCircuitStatus().open).toBe(true);

      adapter.resetCircuit();
      const status = adapter.getCircuitStatus();
      expect(status.open).toBe(false);
      expect(status.errorCount).toBe(0);
    });

    it('should track errors in metrics', async () => {
      (adapter.getBot().api.deleteMessage as jest.Mock).mockRejectedValueOnce(
        new Error('Delete failed')
      );
      await adapter.deleteMessage('12345', '1');
      const metrics = adapter.getMetrics();
      expect(metrics.errors).toBe(1);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  describe('Error Handling', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should handle GrammyError 429 (rate limit)', async () => {
      const error = new GrammyError('Rate limit', {
        ok: false,
        error_code: 429,
        description: 'Too Many Requests',
        parameters: { retry_after: 30 },
      } as any, 'sendMessage', {});

      (adapter.getBot().api.sendMessage as jest.Mock).mockRejectedValueOnce(error);

      await expect(adapter.sendMessage('12345', 'Test')).rejects.toThrow();

      const metrics = adapter.getMetrics();
      expect(metrics.retries).toBe(1);
    });

    it('should call error handler on errors', async () => {
      const errorHandler = jest.fn();
      adapter.onError(errorHandler);

      (adapter.getBot().api.sendMessage as jest.Mock).mockRejectedValueOnce(
        new Error('Test error')
      );

      await expect(adapter.sendMessage('12345', 'Test')).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalled();
    });

    it('should handle typing indicator errors gracefully', async () => {
      (adapter.getBot().api.sendChatAction as jest.Mock).mockRejectedValueOnce(
        new Error('Typing failed')
      );

      // Should not throw
      await expect(adapter.sendTypingIndicator('12345')).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Metrics
  // ==========================================================================
  describe('Metrics', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should track messages sent', async () => {
      await adapter.sendMessage('12345', 'Test 1');
      await adapter.sendMessage('12345', 'Test 2');

      const metrics = adapter.getMetrics();
      expect(metrics.messagesSent).toBe(2);
    });

    it('should calculate average latency', async () => {
      await adapter.sendMessage('12345', 'Test');

      const metrics = adapter.getMetrics();
      expect(metrics.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should track circuit breaker trips', async () => {
      adapter = createAdapter({
        circuitBreakerThreshold: 1,
      });
      await adapter.initialize();

      (adapter.getBot().api.sendMessage as jest.Mock).mockRejectedValue(new Error('Error'));

      try {
        await adapter.sendMessage('12345', 'Test');
      } catch {
        // Expected
      }

      const metrics = adapter.getMetrics();
      expect(metrics.circuitBreakerTrips).toBe(1);
    });
  });

  // ==========================================================================
  // Public Helpers
  // ==========================================================================
  describe('Public Helpers', () => {
    it('should expose bot instance', () => {
      const bot = adapter.getBot();
      expect(bot).toBeDefined();
    });

    it('should expose API instance', () => {
      const api = adapter.getApi();
      expect(api).toBeDefined();
    });
  });
});

// ============================================================================
// Factory Tests
// ============================================================================

describe('Factory Functions', () => {
  describe('createSleepCoreAdapter', () => {
    it('should create adapter with config', () => {
      const adapter = createSleepCoreAdapter({ botToken: 'test-token' });
      expect(adapter).toBeInstanceOf(SleepCoreTelegramAdapter);
    });
  });

  describe('createSleepCoreAdapterFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should create adapter from BOT_TOKEN', () => {
      process.env.BOT_TOKEN = 'env-token';
      const adapter = createSleepCoreAdapterFromEnv();
      expect(adapter).toBeInstanceOf(SleepCoreTelegramAdapter);
    });

    it('should create adapter from TELEGRAM_BOT_TOKEN', () => {
      delete process.env.BOT_TOKEN;
      process.env.TELEGRAM_BOT_TOKEN = 'telegram-token';
      const adapter = createSleepCoreAdapterFromEnv();
      expect(adapter).toBeInstanceOf(SleepCoreTelegramAdapter);
    });

    it('should throw without any token env var', () => {
      delete process.env.BOT_TOKEN;
      delete process.env.TELEGRAM_BOT_TOKEN;
      expect(() => createSleepCoreAdapterFromEnv()).toThrow('environment variable required');
    });

    it('should configure webhook from env', () => {
      process.env.BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_USE_WEBHOOKS = 'true';
      process.env.TELEGRAM_WEBHOOK_URL = 'https://example.com/webhook';
      const adapter = createSleepCoreAdapterFromEnv();
      expect(adapter).toBeDefined();
    });

    it('should configure runner from env', () => {
      process.env.BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_USE_RUNNER = 'true';
      const adapter = createSleepCoreAdapterFromEnv();
      expect(adapter).toBeDefined();
    });
  });
});
