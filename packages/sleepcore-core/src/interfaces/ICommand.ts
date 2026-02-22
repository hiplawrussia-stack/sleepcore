/**
 * SleepCore Command Interfaces (Platform-Independent)
 * =====================================================
 * Command pattern interfaces for bot commands.
 * NO platform-specific dependencies (no Grammy, no VK-IO).
 *
 * Platform adapters (Telegram, VK, etc.) implement ISleepCoreContext
 * to provide platform-specific functionality.
 *
 * @packageDocumentation
 * @module @sleepcore/core/interfaces
 */

// ==================== Command Context ====================

/**
 * Platform-independent context for SleepCore commands.
 * Each platform adapter implements this interface.
 *
 * Example implementations:
 * - TelegramSleepCoreContext (extends Grammy Context)
 * - VKSleepCoreContext (wraps VK MessageContext)
 */
export interface ISleepCoreContext {
  /** User ID (platform-specific format, returned as string) */
  readonly userId: string;

  /** Chat/conversation ID */
  readonly chatId: number;

  /** User's display name */
  readonly displayName: string;

  /** User's language code (ISO 639-1) */
  readonly languageCode: string;

  /** SleepCore API instance */
  readonly sleepCore: ISleepCoreAPI;

  /**
   * Reply to user with text message
   */
  reply(text: string, options?: IReplyOptions): Promise<void>;

  /**
   * Send command result to user
   */
  sendResult(result: ICommandResult): Promise<void>;
}

/**
 * SleepCore API interface (minimal for command execution)
 * Full implementation in SleepCoreAPI class.
 */
export interface ISleepCoreAPI {
  /**
   * Get crisis detection service
   */
  getCrisisDetection(): ICrisisDetectionService;

  /**
   * Get crisis escalation service
   */
  getCrisisEscalation(): ICrisisEscalationService;

  /**
   * Generic method access for services
   */
  [key: string]: unknown;
}

/**
 * Crisis detection service interface
 */
export interface ICrisisDetectionService {
  /**
   * Analyze message for crisis indicators
   */
  analyzeMessage(
    text: string,
    userId: string,
    chatId: string,
    stateRiskData?: unknown
  ): ICrisisResponse;
}

/**
 * Crisis escalation service interface
 */
export interface ICrisisEscalationService {
  /**
   * Escalate crisis event
   */
  escalate(event: ICrisisEvent): Promise<{
    escalated: boolean;
    level: string;
    notificationsSent: number;
    aeCreated: boolean;
    aeId?: number;
  }>;
}

/**
 * Crisis response from detection
 */
export interface ICrisisResponse {
  readonly shouldInterrupt: boolean;
  readonly action: string;
  readonly message: string;
  readonly resources: string[];
  readonly severity: string;
  readonly event: ICrisisEvent;
}

/**
 * Crisis event for logging and escalation
 */
export interface ICrisisEvent {
  readonly userId: string;
  readonly chatId: string;
  readonly timestamp: Date;
  readonly severity: string;
  readonly crisisType: string;
  readonly confidence: number;
  readonly action: string;
  readonly messageText: string;
  readonly indicators: string[];
  readonly responseProvided: boolean;
}

// ==================== Reply Options ====================

/**
 * Platform-independent reply options
 */
export interface IReplyOptions {
  /** Inline keyboard */
  keyboard?: IInlineButton[][];

  /** Reply keyboard */
  replyKeyboard?: IReplyButton[][];

  /** Remove keyboard */
  removeKeyboard?: boolean;

  /** Parse mode hint (platform may ignore) */
  parseMode?: 'text' | 'markdown' | 'html';
}

// ==================== Command Result ====================

/**
 * Command execution result
 */
export interface ICommandResult {
  /** Whether command executed successfully */
  success: boolean;

  /** Response message to send (supports Markdown: *bold*, _italic_) */
  message?: string;

  /** Inline keyboard buttons */
  keyboard?: IInlineButton[][];

  /** Reply keyboard buttons */
  replyKeyboard?: IReplyButton[][];

  /** Whether to remove keyboard */
  removeKeyboard?: boolean;

  /** Error message if failed */
  error?: string;

  /** Additional data for logging/tracking */
  metadata?: ICommandMetadata;
}

/**
 * Command metadata for tracking conversation state
 */
export interface ICommandMetadata {
  /** Conversation is complete */
  conversationComplete?: boolean;

  /** User has completed onboarding */
  hasCompletedOnboarding?: boolean;

  /** Updated conversation data */
  conversationData?: Record<string, unknown>;

  /** Next step in conversation flow */
  nextStep?: string;

  /** Additional custom data */
  [key: string]: unknown;
}

// ==================== Keyboard Buttons ====================

/**
 * Inline keyboard button
 */
export interface IInlineButton {
  /** Button text */
  text: string;

  /** Callback data (format: 'command:action' or 'command:action:data') */
  callbackData?: string;

  /** URL to open */
  url?: string;
}

/**
 * Reply keyboard button
 */
export interface IReplyButton {
  /** Button text */
  text: string;

  /** Request contact from user */
  requestContact?: boolean;

  /** Request location from user */
  requestLocation?: boolean;
}

// ==================== Command Interface ====================

/**
 * Base command interface.
 * All bot commands must implement this interface.
 */
export interface ICommand {
  /** Command name (without slash, e.g., 'start', 'help') */
  readonly name: string;

  /** Command description for /help and bot menu */
  readonly description: string;

  /** Command aliases (optional alternative names) */
  readonly aliases?: string[];

  /** Whether command requires active session */
  readonly requiresSession?: boolean;

  /**
   * Execute the command
   * @param ctx - Platform-independent context
   * @param args - Command arguments (text after command)
   */
  execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult>;
}

/**
 * Command with conversation flow (multi-step)
 */
export interface IConversationCommand extends ICommand {
  /** Steps in conversation flow */
  readonly steps: string[];

  /**
   * Handle step in conversation
   * @param ctx - Context
   * @param step - Current step name
   * @param data - Data from previous steps
   */
  handleStep(
    ctx: ISleepCoreContext,
    step: string,
    data: Record<string, unknown>
  ): Promise<ICommandResult>;

  /**
   * Handle callback query within conversation
   * @param ctx - Context
   * @param callbackData - Callback data from button
   * @param conversationData - Current conversation state
   */
  handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    conversationData: Record<string, unknown>
  ): Promise<ICommandResult>;
}

// ==================== Command Registry ====================

/**
 * Command registry for managing bot commands
 */
export interface ICommandRegistry {
  /**
   * Register a command
   */
  register(command: ICommand): void;

  /**
   * Get command by name or alias
   */
  get(name: string): ICommand | undefined;

  /**
   * Get all registered commands
   */
  getAll(): ICommand[];

  /**
   * Check if command exists
   */
  has(name: string): boolean;
}

// ==================== Session State ====================

/**
 * User session state for conversation tracking
 */
export interface IUserSession {
  /** User ID */
  userId: string;

  /** Current command being executed */
  currentCommand?: string;

  /** Current step in multi-step command */
  currentStep?: string;

  /** Conversation data accumulated during flow */
  conversationData: Record<string, unknown>;

  /** Session start time */
  startedAt: Date;

  /** Last activity time */
  lastActivityAt: Date;

  /** Whether user has completed onboarding */
  hasCompletedOnboarding: boolean;

  /** User's preferred language */
  language: 'ru' | 'en';
}
