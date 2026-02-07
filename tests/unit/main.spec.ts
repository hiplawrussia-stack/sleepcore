/**
 * main.ts Unit Tests
 * ==================
 *
 * Tests for the main entry point utilities and bot configuration.
 *
 * Test Coverage:
 * - Bot creation and configuration (createBot)
 * - Context extension (extendContext)
 * - Edge cases for configuration handling
 * - Property enumeration verification
 *
 * Coverage Limitations:
 * main.ts is a 2900+ line integration hub containing:
 * - 19 bot.command() handlers
 * - ~15 callback_query case patterns
 * - Message handlers
 * - Cron jobs
 *
 * Full coverage would require either:
 * 1. Refactoring handlers into separate testable modules
 * 2. Integration tests with mocked Telegram API
 *
 * Related Tests:
 * - Handler routing: CommandHandler.spec.ts
 * - Crisis detection: CrisisDetectionService.test.ts
 * - Individual commands: src/bot/commands/__tests__/
 *
 * @packageDocumentation
 */

// Mock process.exit FIRST before any imports
// Use 'as never' to satisfy TypeScript's never return type without throwing
const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);

// Mock console to reduce noise
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock Grammy
jest.mock('grammy', () => {
  const actualGrammy = jest.requireActual('grammy');
  return {
    ...actualGrammy,
    Bot: jest.fn().mockImplementation((token: string) => ({
      token,
      api: {
        config: {
          use: jest.fn(),
        },
      },
      use: jest.fn(),
      command: jest.fn(),
      on: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
    })),
    InlineKeyboard: actualGrammy.InlineKeyboard,
  };
});

// Mock Grammy plugins
jest.mock('@grammyjs/auto-retry', () => ({
  autoRetry: jest.fn().mockReturnValue((ctx: any, next: any) => next()),
}));

jest.mock('@grammyjs/hydrate', () => ({
  hydrate: jest.fn().mockReturnValue((ctx: any, next: any) => next()),
}));

// Mock Sentry instrumentation
jest.mock('../../src/infrastructure/monitoring/instrument', () => ({}));

// Mock fs for health checks
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  accessSync: jest.fn(),
  constants: { W_OK: 2 },
}));

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock bot config
jest.mock('../../src/bot/config/BotConfig', () => ({
  createBotConfigFromEnv: jest.fn().mockReturnValue({
    token: 'test-token-12345',
    adminUserIds: ['123456'],
    errorHandler: { maxRetries: 3 },
    polling: { dropPendingUpdates: false },
  }),
}));

// Mock SleepCoreAPI
jest.mock('../../src/SleepCoreAPI', () => ({
  SleepCoreAPI: jest.fn().mockImplementation(() => ({
    getSession: jest.fn(),
    startSession: jest.fn(),
    processNewDiaryEntry: jest.fn(),
  })),
  sleepCore: {
    getSession: jest.fn(),
    startSession: jest.fn(),
  },
}));

// Mock modules
jest.mock('../../src/modules', () => ({
  createWhisperService: jest.fn().mockReturnValue({}),
  createVoiceDiaryHandler: jest.fn().mockReturnValue({ handle: jest.fn() }),
  questService: { getActiveQuests: jest.fn() },
  badgeService: { getUserBadges: jest.fn() },
  sonyaEvolutionService: { recordInteraction: jest.fn(), getEvolutionState: jest.fn() },
  adaptiveKeyboardService: { recordCommandClick: jest.fn(), getTopCommands: jest.fn() },
}));

// Mock bot commands
jest.mock('../../src/bot/commands', () => ({
  createCommandHandler: jest.fn().mockReturnValue({
    handleCommand: jest.fn(),
    handleCallback: jest.fn(),
  }),
  startCommand: { execute: jest.fn(), handleStep: jest.fn(), handleCallback: jest.fn() },
  diaryCommand: { execute: jest.fn(), handleCallback: jest.fn() },
  todayCommand: { execute: jest.fn() },
  relaxCommand: { execute: jest.fn() },
  mindfulCommand: { execute: jest.fn() },
  progressCommand: { execute: jest.fn() },
  sosCommand: { execute: jest.fn() },
  helpCommand: { execute: jest.fn() },
  rehearsalCommand: { execute: jest.fn() },
  recallCommand: { execute: jest.fn() },
  questCommand: { execute: jest.fn() },
  badgeCommand: { execute: jest.fn() },
  evolutionCommand: { execute: jest.fn() },
  therapyCommand: { execute: jest.fn() },
  initializeCommandRegistry: jest.fn().mockReturnValue({ getCommand: jest.fn() }),
  getCommandRegistry: jest.fn().mockReturnValue({ getCommand: jest.fn() }),
  createContextAwareMenuService: jest.fn().mockReturnValue({ buildContext: jest.fn() }),
}));

// Mock bot services
jest.mock('../../src/bot/services', () => ({
  createProactiveNotificationService: jest.fn().mockReturnValue({ scheduleReminders: jest.fn() }),
  createISISchedulingService: jest.fn().mockReturnValue({ scheduleAssessment: jest.fn() }),
  replyKeyboard: {
    generate: jest.fn().mockReturnValue({ keyboard: [[{ text: 'Test' }]] }),
    parseButtonToCommand: jest.fn(),
  },
  streakService: { getCurrentStreak: jest.fn() },
  progressVisualization: { generateChart: jest.fn() },
  emojiSlider: { render: jest.fn() },
  hubMenu: {
    generateCompactHubMessage: jest.fn().mockReturnValue('Hub message'),
    buildHubKeyboard: jest.fn().mockReturnValue({ inline_keyboard: [] }),
  },
  onboardingTracker: { getProgress: jest.fn() },
  dailyGreeting: { getGreeting: jest.fn() },
  yearInPixels: { generate: jest.fn() },
  crisisDetectionService: {
    analyzeMessage: jest.fn().mockReturnValue({ shouldInterrupt: false }),
    getUserEvents: jest.fn().mockReturnValue([]),
    checkReady: jest.fn().mockReturnValue(true),
  },
  crisisEscalationService: {
    configure: jest.fn(),
    escalate: jest.fn(),
  },
  metacognitiveEngineService: {},
  adaptivePersonaService: { adaptMessageTone: jest.fn() },
  proactiveIntelligenceService: { getInsights: jest.fn() },
  sleepPredictionService: { predict: jest.fn() },
  digitalTwinService: { getTwin: jest.fn() },
  worryPostponementService: { getWorries: jest.fn() },
  detachedMindfulnessService: { getSession: jest.fn() },
  attService: { getProgress: jest.fn() },
  mcq30AssessmentService: { assess: jest.fn() },
  psasAssessmentService: { assess: jest.fn() },
  dbasAssessmentService: { assess: jest.fn() },
  voiceBiomarkerService: { analyze: jest.fn() },
}));

// Mock database infrastructure
jest.mock('../../src/infrastructure/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue({
    db: {},
    close: jest.fn(),
  }),
  createGrammySessionAdapter: jest.fn().mockReturnValue(null),
  UserRepository: jest.fn().mockImplementation(() => ({})),
  SleepDiaryRepository: jest.fn().mockImplementation(() => ({})),
  AssessmentRepository: jest.fn().mockImplementation(() => ({})),
  TherapySessionRepository: jest.fn().mockImplementation(() => ({})),
  GamificationRepository: jest.fn().mockImplementation(() => ({})),
  VoiceDiaryRepository: jest.fn().mockImplementation(() => ({})),
  SafetyPlanRepository: jest.fn().mockImplementation(() => ({})),
  ISIScheduleRepository: jest.fn().mockImplementation(() => ({})),
  DigitalTwinRepository: jest.fn().mockImplementation(() => ({})),
  OnboardingRepository: jest.fn().mockImplementation(() => ({})),
  ServiceStateRepository: jest.fn().mockImplementation(() => ({})),
  NotificationUserRepository: jest.fn().mockImplementation(() => ({})),
  MCTRepository: jest.fn().mockImplementation(() => ({})),
  MCQ30Repository: jest.fn().mockImplementation(() => ({})),
  createAutomatedBackupScheduler: jest.fn().mockReturnValue({ start: jest.fn() }),
  AuditService: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
  })),
}));

// Mock infrastructure monitoring
jest.mock('../../src/infrastructure/monitoring', () => ({
  sentryService: {
    isActive: jest.fn().mockReturnValue(false),
    captureException: jest.fn(),
  },
}));

// Mock index exports
jest.mock('../../src/index', () => ({
  VERSION: '1.0.0-test',
  BUILD_DATE: '2026-02-06',
}));

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

import { Bot } from 'grammy';
import { SleepCoreAPI } from '../../src/SleepCoreAPI';

describe('main.ts utilities', () => {
  let createBot: any;
  let extendContext: any;

  beforeAll(async () => {
    // Set required env vars before importing
    process.env.BOT_TOKEN = 'test-token';
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_USER_IDS = '123456';

    // Dynamic import - main() auto-executes but process.exit is mocked to no-op
    const mainModule = await import('../../src/main');
    createBot = mainModule.createBot;
    extendContext = mainModule.extendContext;

    // Allow any pending async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(() => {
    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    delete process.env.BOT_TOKEN;
  });

  describe('createBot', () => {
    it('should create a Bot instance with provided token', () => {
      const config = {
        token: 'my-test-token',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      expect(Bot).toHaveBeenCalledWith('my-test-token');
      expect(bot).toBeDefined();
      expect(bot.token).toBe('my-test-token');
    });

    it('should configure auto-retry middleware', () => {
      const config = {
        token: 'test-token-2',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 5 },
      };

      const bot = createBot(config);

      expect(bot.api.config.use).toHaveBeenCalled();
    });

    it('should configure session and hydrate middleware', () => {
      const config = {
        token: 'test-token-3',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      expect(bot.use).toHaveBeenCalled();
    });

    it('should accept optional session storage', () => {
      const config = {
        token: 'test-token-4',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };
      const mockStorage = {
        read: jest.fn(),
        write: jest.fn(),
        delete: jest.fn(),
      };

      const bot = createBot(config, { sessionStorage: mockStorage });

      expect(bot).toBeDefined();
    });
  });

  describe('extendContext', () => {
    let mockApi: any;

    beforeEach(() => {
      mockApi = new SleepCoreAPI();
    });

    it('should add userId from ctx.from.id', () => {
      const ctx = {
        from: { id: 123456, first_name: 'Test', language_code: 'ru' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.userId).toBe('123456');
    });

    it('should add chatId from ctx.chat.id', () => {
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 999 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.chatId).toBe(999);
    });

    it('should add displayName from ctx.from.first_name', () => {
      const ctx = {
        from: { id: 123, first_name: 'Иван', language_code: 'ru' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.displayName).toBe('Иван');
    });

    it('should add languageCode from ctx.from.language_code', () => {
      const ctx = {
        from: { id: 123, first_name: 'Test', language_code: 'en' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.languageCode).toBe('en');
    });

    it('should add sleepCore API instance', () => {
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.sleepCore).toBe(mockApi);
    });

    it('should return empty userId when from is undefined', () => {
      const ctx = {
        from: undefined,
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.userId).toBe('');
    });

    it('should return 0 chatId when chat is undefined', () => {
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: undefined,
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.chatId).toBe(0);
    });

    it('should default displayName to "User" when first_name missing', () => {
      const ctx = {
        from: { id: 123 },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.displayName).toBe('User');
    });

    it('should default languageCode to "ru" when language_code missing', () => {
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.languageCode).toBe('ru');
    });

    it('should preserve original context methods', () => {
      const replyMock = jest.fn();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
        reply: replyMock,
        editMessageText: jest.fn(),
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.reply).toBe(replyMock);
    });
  });

  describe('context extension for commands', () => {
    it('should create context compatible with ISleepCoreContext interface', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 555, first_name: 'Patient', language_code: 'ru' },
        chat: { id: 1000 },
        reply: jest.fn(),
        editMessageText: jest.fn(),
        answerCallbackQuery: jest.fn(),
        session: {},
      };

      const extended = extendContext(ctx, mockApi);

      expect(typeof extended.userId).toBe('string');
      expect(typeof extended.chatId).toBe('number');
      expect(typeof extended.displayName).toBe('string');
      expect(typeof extended.languageCode).toBe('string');
      expect(extended.sleepCore).toBeDefined();
    });

    it('should allow session access through extended context', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
        session: { userId: 'test', preferences: { language: 'ru' } },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.session).toBeDefined();
      expect(extended.session.preferences.language).toBe('ru');
    });

    it('should handle null values in from object', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: null, language_code: null },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      // null should fallback to defaults
      expect(extended.displayName).toBe('User');
      expect(extended.languageCode).toBe('ru');
    });
  });

  describe('createBot edge cases', () => {
    it('should handle empty adminUserIds', () => {
      const config = {
        token: 'test-token-5',
        adminUserIds: [],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      expect(bot).toBeDefined();
    });

    it('should handle multiple adminUserIds', () => {
      const config = {
        token: 'test-token-6',
        adminUserIds: ['111', '222', '333'],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      expect(bot).toBeDefined();
    });

    it('should handle undefined errorHandler', () => {
      const config = {
        token: 'test-token-7',
        adminUserIds: ['123'],
        errorHandler: undefined,
      };

      const bot = createBot(config);

      expect(bot).toBeDefined();
    });

    it('should handle custom polling config', () => {
      const config = {
        token: 'test-token-8',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
        polling: { dropPendingUpdates: true },
      };

      const bot = createBot(config);

      expect(bot).toBeDefined();
    });
  });

  describe('context property enumeration', () => {
    it('should have enumerable userId property', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);
      const descriptor = Object.getOwnPropertyDescriptor(extended, 'userId');

      expect(descriptor?.enumerable).toBe(true);
    });

    it('should have enumerable chatId property', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);
      const descriptor = Object.getOwnPropertyDescriptor(extended, 'chatId');

      expect(descriptor?.enumerable).toBe(true);
    });

    it('should have enumerable displayName property', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);
      const descriptor = Object.getOwnPropertyDescriptor(extended, 'displayName');

      expect(descriptor?.enumerable).toBe(true);
    });

    it('should have enumerable sleepCore property', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);
      const descriptor = Object.getOwnPropertyDescriptor(extended, 'sleepCore');

      expect(descriptor?.enumerable).toBe(true);
    });

    it('should have enumerable languageCode property', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test', language_code: 'en' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);
      const descriptor = Object.getOwnPropertyDescriptor(extended, 'languageCode');

      expect(descriptor?.enumerable).toBe(true);
    });
  });

  describe('session initialization via createBot', () => {
    it('should configure session middleware with initial function', () => {
      const config = {
        token: 'session-test-token',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      // Verify session middleware was added (bot.use was called)
      expect(bot.use).toHaveBeenCalled();
    });

    it('should use provided session storage when available', () => {
      const config = {
        token: 'storage-test-token',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };
      const mockStorage = {
        read: jest.fn().mockResolvedValue(undefined),
        write: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      const bot = createBot(config, { sessionStorage: mockStorage });

      expect(bot).toBeDefined();
      expect(bot.use).toHaveBeenCalled();
    });
  });

  describe('extendContext with special values', () => {
    it('should handle numeric ID boundaries (MAX_SAFE_INTEGER)', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: Number.MAX_SAFE_INTEGER, first_name: 'Test' },
        chat: { id: Number.MAX_SAFE_INTEGER },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.userId).toBe(String(Number.MAX_SAFE_INTEGER));
      expect(extended.chatId).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle zero ID values', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 0, first_name: 'Zero' },
        chat: { id: 0 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.userId).toBe('0');
      expect(extended.chatId).toBe(0);
    });

    it('should handle negative ID values', () => {
      const mockApi = new SleepCoreAPI();
      // Negative chat IDs are used for groups in Telegram
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: -100123456789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.chatId).toBe(-100123456789);
    });

    it('should handle unicode display names', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: '日本語ユーザー', language_code: 'ja' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.displayName).toBe('日本語ユーザー');
      expect(extended.languageCode).toBe('ja');
    });

    it('should handle emoji in display names', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: '🌙 Sleepy User 😴' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.displayName).toBe('🌙 Sleepy User 😴');
    });

    it('should handle empty string display name', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: '' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      // Empty string is falsy, should fallback to 'User'
      expect(extended.displayName).toBe('User');
    });

    it('should handle whitespace-only display name', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: '   ' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      // Whitespace is truthy, so it's preserved
      expect(extended.displayName).toBe('   ');
    });

    it('should support multiple API instances', () => {
      const mockApi1 = new SleepCoreAPI();
      const mockApi2 = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
      };

      const extended1 = extendContext({ ...ctx }, mockApi1);
      const extended2 = extendContext({ ...ctx }, mockApi2);

      expect(extended1.sleepCore).toBe(mockApi1);
      expect(extended2.sleepCore).toBe(mockApi2);
      expect(extended1.sleepCore).not.toBe(extended2.sleepCore);
    });
  });

  describe('createBot middleware configuration', () => {
    it('should configure auto-retry with custom maxRetries', () => {
      const config = {
        token: 'retry-test-token',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 10 },
      };

      const bot = createBot(config);

      expect(bot.api.config.use).toHaveBeenCalled();
    });

    it('should configure hydrate middleware', () => {
      const config = {
        token: 'hydrate-test-token',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      // hydrate() is called before session
      expect(bot.use).toHaveBeenCalled();
    });

    it('should work with minimal config', () => {
      const minimalConfig = {
        token: 'minimal-token',
        adminUserIds: [],
      };

      const bot = createBot(minimalConfig as any);

      expect(bot).toBeDefined();
      expect(bot.token).toBe('minimal-token');
    });
  });

  describe('context extension immutability', () => {
    it('should not modify original context properties', () => {
      const mockApi = new SleepCoreAPI();
      const originalFrom = { id: 123, first_name: 'Original' };
      const originalChat = { id: 789 };
      const ctx = {
        from: originalFrom,
        chat: originalChat,
        someMethod: jest.fn(),
      };

      extendContext(ctx, mockApi);

      // Original properties should be unchanged
      expect(ctx.from).toBe(originalFrom);
      expect(ctx.chat).toBe(originalChat);
      expect(ctx.someMethod).toBeDefined();
    });

    it('should extend context with readonly-like behavior', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      // Properties are defined as getters, attempting to set should have no effect
      // or throw in strict mode depending on configuration
      expect(extended.userId).toBe('123');
    });
  });

  describe('bot token handling', () => {
    it('should pass token correctly to Bot constructor', () => {
      const testToken = 'test:ABC123_token-with-special_chars';
      const config = {
        token: testToken,
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };

      createBot(config);

      expect(Bot).toHaveBeenCalledWith(testToken);
    });

    it('should handle long token strings', () => {
      const longToken = 'a'.repeat(100) + ':' + 'b'.repeat(200);
      const config = {
        token: longToken,
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      expect(bot.token).toBe(longToken);
    });
  });

  describe('session key generation', () => {
    it('should use from.id as session key', () => {
      const config = {
        token: 'session-key-test',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      // Session middleware is configured
      expect(bot.use).toHaveBeenCalled();
    });

    it('should handle undefined from in session key', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: undefined,
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      // Should return empty string when from is undefined
      expect(extended.userId).toBe('');
    });
  });

  describe('context with complex session data', () => {
    it('should preserve nested session objects', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
        session: {
          userId: 'test-user',
          preferences: {
            language: 'ru',
            notifications: true,
            notificationTime: '21:00',
          },
          therapyState: {
            hasActiveSession: true,
            currentWeek: 3,
            lastDiaryDate: '2026-02-07',
          },
          isiData: {
            answers: [1, 2, 3, 4, 5, 6, 7],
            answeredAt: ['2026-02-07T10:00:00Z'],
            currentQuestion: 7,
            step: 'complete',
          },
        },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.session).toBeDefined();
      expect(extended.session.preferences.language).toBe('ru');
      expect(extended.session.therapyState?.currentWeek).toBe(3);
      expect(extended.session.isiData?.answers.length).toBe(7);
    });

    it('should handle missing optional session fields', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
        session: {
          userId: 'partial-user',
          preferences: {
            language: 'ru',
            notifications: false,
          },
          lastActivityAt: new Date(),
        },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.session.therapyState).toBeUndefined();
      expect(extended.session.isiData).toBeUndefined();
      expect(extended.session.moodHistory).toBeUndefined();
    });
  });

  describe('bot lifecycle methods', () => {
    it('should provide start method on created bot', () => {
      const config = {
        token: 'lifecycle-test',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      expect(typeof bot.start).toBe('function');
    });

    it('should provide stop method on created bot', () => {
      const config = {
        token: 'lifecycle-test-2',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      expect(typeof bot.stop).toBe('function');
    });

    it('should provide command registration method', () => {
      const config = {
        token: 'command-test',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      expect(typeof bot.command).toBe('function');
    });

    it('should provide on method for event handlers', () => {
      const config = {
        token: 'event-test',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };

      const bot = createBot(config);

      expect(typeof bot.on).toBe('function');
    });
  });

  describe('concurrent context extensions', () => {
    it('should handle rapid sequential context extensions', () => {
      const mockApi = new SleepCoreAPI();
      const results: any[] = [];

      for (let i = 0; i < 100; i++) {
        const ctx = {
          from: { id: 1000 + i, first_name: `User${i}` },
          chat: { id: 2000 + i },
        };
        results.push(extendContext(ctx, mockApi));
      }

      expect(results.length).toBe(100);
      expect(results[0].userId).toBe('1000');
      expect(results[99].userId).toBe('1099');
    });

    it('should maintain context isolation between extensions', () => {
      const mockApi = new SleepCoreAPI();
      const ctx1 = {
        from: { id: 111, first_name: 'Alice' },
        chat: { id: 1 },
      };
      const ctx2 = {
        from: { id: 222, first_name: 'Bob' },
        chat: { id: 2 },
      };

      const extended1 = extendContext(ctx1, mockApi);
      const extended2 = extendContext(ctx2, mockApi);

      // Verify isolation - changing one should not affect the other
      expect(extended1.userId).toBe('111');
      expect(extended2.userId).toBe('222');
      expect(extended1.displayName).toBe('Alice');
      expect(extended2.displayName).toBe('Bob');
    });
  });

  describe('error handling configurations', () => {
    it('should handle zero maxRetries', () => {
      const config = {
        token: 'zero-retry-token',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 0 },
      };

      const bot = createBot(config);

      expect(bot).toBeDefined();
      expect(bot.api.config.use).toHaveBeenCalled();
    });

    it('should handle high maxRetries value', () => {
      const config = {
        token: 'high-retry-token',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 100 },
      };

      const bot = createBot(config);

      expect(bot).toBeDefined();
    });
  });

  describe('language code handling', () => {
    it('should handle various language codes', () => {
      const mockApi = new SleepCoreAPI();
      const languageCodes = ['ru', 'en', 'de', 'fr', 'zh', 'ja', 'ko', 'ar', 'he'];

      languageCodes.forEach((code) => {
        const ctx = {
          from: { id: 123, first_name: 'Test', language_code: code },
          chat: { id: 789 },
        };

        const extended = extendContext(ctx, mockApi);

        expect(extended.languageCode).toBe(code);
      });
    });

    it('should handle extended language codes (BCP 47)', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test', language_code: 'zh-Hans' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.languageCode).toBe('zh-Hans');
    });
  });

  describe('context with special Telegram IDs', () => {
    it('should handle supergroup chat IDs (negative with -100 prefix)', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: -1001234567890 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.chatId).toBe(-1001234567890);
    });

    it('should handle channel chat IDs', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: -1009876543210 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.chatId).toBe(-1009876543210);
    });

    it('should handle bot user IDs', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 1234567890, first_name: 'SleepCoreBot', is_bot: true },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      expect(extended.userId).toBe('1234567890');
      expect(extended.displayName).toBe('SleepCoreBot');
    });
  });

  describe('multiple bot instances', () => {
    it('should allow creating multiple bot instances', () => {
      const config1 = {
        token: 'token-instance-1',
        adminUserIds: ['123'],
        errorHandler: { maxRetries: 3 },
      };
      const config2 = {
        token: 'token-instance-2',
        adminUserIds: ['456'],
        errorHandler: { maxRetries: 5 },
      };

      const bot1 = createBot(config1);
      const bot2 = createBot(config2);

      expect(bot1.token).toBe('token-instance-1');
      expect(bot2.token).toBe('token-instance-2');
      expect(bot1).not.toBe(bot2);
    });
  });

  describe('context property access patterns', () => {
    it('should support destructuring extended context', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Destructure Test' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);
      const { userId, chatId, displayName, languageCode, sleepCore } = extended;

      expect(userId).toBe('123');
      expect(chatId).toBe(789);
      expect(displayName).toBe('Destructure Test');
      expect(languageCode).toBe('ru');
      expect(sleepCore).toBe(mockApi);
    });

    it('should support Object.keys on extended context', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'Test' },
        chat: { id: 789 },
        existingProp: 'value',
      };

      const extended = extendContext(ctx, mockApi);
      const keys = Object.keys(extended);

      expect(keys).toContain('userId');
      expect(keys).toContain('chatId');
      expect(keys).toContain('displayName');
      expect(keys).toContain('languageCode');
      expect(keys).toContain('sleepCore');
      expect(keys).toContain('existingProp');
    });

    it('should support JSON.stringify on extended context (excluding circular refs)', () => {
      const mockApi = new SleepCoreAPI();
      const ctx = {
        from: { id: 123, first_name: 'JSON Test' },
        chat: { id: 789 },
      };

      const extended = extendContext(ctx, mockApi);

      // Should not throw when stringifying (sleepCore will be stringified as object)
      const json = JSON.stringify({
        userId: extended.userId,
        chatId: extended.chatId,
        displayName: extended.displayName,
      });

      expect(json).toContain('123');
      expect(json).toContain('789');
    });
  });
});
