/**
 * SleepCore Telegram Bot Module
 * ==============================
 * Production-ready Telegram bot infrastructure for SleepCore DTx
 *
 * Based on 2025 research:
 * - Grammy Framework best practices (grammy.dev)
 * - Circuit Breaker pattern for resilience (Opossum)
 * - Auto-retry for Telegram rate limits
 * - CBT-I Chatbot architecture (JMIR 2025)
 *
 * @packageDocumentation
 * @module @sleepcore/bot
 */

// ============= Interfaces =============
export {
  // Platform types
  PlatformType,
  ChatType,
  MessageType,

  // Core interfaces
  IPlatformAdapter,
  IPlatformCapabilities,
  IUniversalMessage,
  IUniversalUser,
  IUniversalChat,
  ICallbackQuery,

  // Message options
  ISendMessageOptions,
  IEditMessageOptions,

  // Webhook
  IWebhookInfo,
  IWebhookOptions,

  // Handlers
  MessageHandler,
  CallbackQueryHandler,
  ErrorHandler,

  // Telegram specific
  ITelegramConfig,
  IInlineButton,
  IKeyboardButton,
  TELEGRAM_CAPABILITIES,

  // Config types
  IAppConfig,
  IServerConfig,
  IDatabaseConfig,
  IFeatureFlags,
  IHealthCheckResult,
  IHealthCheckService,
} from './interfaces/IPlatformIntegration';

// ============= Adapters =============
export {
  SleepCoreTelegramAdapter,
  createSleepCoreAdapter,
  createSleepCoreAdapterFromEnv,
  type SleepCoreAdapterOptions,
  type AdapterMetrics,
} from './adapters/SleepCoreTelegramAdapter';

// ============= Config =============
export {
  BotConfigSchema,
  validateBotConfig,
  safeParseBotConfig,
  createBotConfigFromEnv,
  ConfigValidationError,
  type BotConfigInput,
  type BotConfigOutput,
} from './config/BotConfig';

// ============= Commands =============
export {
  // Handler
  CommandHandler,
  createCommandHandler,

  // Commands
  startCommand,
  diaryCommand,
  todayCommand,
  relaxCommand,
  mindfulCommand,
  progressCommand,
  sosCommand,
  helpCommand,
  allCommands,
  commandDescriptions,

  // Interfaces
  type ICommand,
  type IConversationCommand,
  type ICommandRegistry,
  type ICommandResult,
  type ISleepCoreContext,
  type IUserSession,

  // Utils
  MessageFormatter,
  formatter,
} from './commands';
