/**
 * Callback Handler Types
 * ======================
 * Type definitions for modular callback handler architecture.
 *
 * Architecture based on research (2025-2026):
 * - grammY Router plugin pattern (grammy.dev/plugins/router)
 * - Clean Architecture with Dependency Injection
 * - IEC 62304 modular design requirements
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/types
 */

import { Context, SessionFlavor } from 'grammy';
import { type ICommandResult, type ISleepCoreContext } from '../commands';

/**
 * Session data structure used in SleepCore bot
 * This matches the SessionData from main.ts
 */
export interface ISessionData {
  dbUserId?: string;
  isiData?: {
    answers: number[];
    answeredAt: string[];
    currentQuestion: number;
    step: string;
    startedAt?: string;
  };
  moodHistory?: {
    entries: Array<{
      date: string;
      mood?: number;
      sleep?: number;
      factors: string[];
    }>;
  };
  preferences: {
    notifications: boolean;
    notificationTime?: string;
  };
  therapyState?: {
    hasActiveSession?: boolean;
    currentWeek?: number;
    hasCompletedOnboarding?: boolean;
    lastDiaryDate?: string;
  };
  onboardingProgress?: {
    completedSteps: string[];
  };
  lastActivityAt?: Date;
}

/**
 * Grammy context with session support
 */
export type SessionContext = Context & SessionFlavor<ISessionData>;

/**
 * Callback data parsed from Telegram callback_query
 */
export interface ICallbackData {
  /** Primary command identifier (e.g., 'start', 'diary', 'hub') */
  command: string;
  /** Action within the command (e.g., 'consent_accept', 'back') */
  action: string;
  /** Additional parameters from callback data */
  params: string[];
  /** Original raw callback data string */
  raw: string;
}

/**
 * Result from callback handler execution
 */
export interface ICallbackResult {
  /** Whether the callback was handled */
  handled: boolean;
  /** Command result if applicable */
  result?: ICommandResult | null;
  /** Whether to answer callback query (default: true) */
  answerQuery?: boolean;
  /** Custom answer text for callback query */
  answerText?: string;
  /** Whether to show alert instead of toast */
  showAlert?: boolean;
}

/**
 * Handler context with all necessary dependencies
 */
export interface IHandlerContext {
  /** Grammy context with session support */
  ctx: SessionContext;
  /** Extended SleepCore context */
  sleepCoreCtx: ISleepCoreContext;
  /** Parsed callback data */
  callbackData: ICallbackData;
}

/**
 * Callback handler interface for modular handlers
 *
 * Each handler is responsible for a specific callback command prefix.
 * Implements Chain of Responsibility pattern for fallback handling.
 */
export interface ICallbackHandler {
  /**
   * Command prefix this handler responds to
   * @example 'start', 'diary', 'hub'
   */
  readonly command: string;

  /**
   * Handle the callback query
   * @param context Handler context with all dependencies
   * @returns Result indicating if callback was handled
   */
  handle(context: IHandlerContext): Promise<ICallbackResult>;

  /**
   * Check if this handler can process the given callback data
   * @param data Parsed callback data
   * @returns true if this handler should process the callback
   */
  canHandle(data: ICallbackData): boolean;
}

/**
 * Handler registry for managing callback handlers
 */
export interface IHandlerRegistry {
  /**
   * Register a handler for a command prefix
   * @param handler Callback handler to register
   */
  register(handler: ICallbackHandler): void;

  /**
   * Get handler for a command prefix
   * @param command Command prefix
   * @returns Handler if found, undefined otherwise
   */
  get(command: string): ICallbackHandler | undefined;

  /**
   * Get all registered handlers
   * @returns Array of all handlers
   */
  getAll(): ICallbackHandler[];

  /**
   * Route callback to appropriate handler
   * @param context Handler context
   * @returns Result from the matched handler
   */
  route(context: IHandlerContext): Promise<ICallbackResult>;
}

/**
 * Dependencies injected into callback handlers
 * Enables testability and loose coupling
 */
export interface IHandlerDependencies {
  // Commands
  startCommand: unknown;
  diaryCommand: unknown;
  therapyCommand: unknown;
  relaxCommand: unknown;
  mindfulCommand: unknown;
  progressCommand: unknown;
  sosCommand: unknown;
  helpCommand: unknown;
  rehearsalCommand: unknown;
  recallCommand: unknown;
  questCommand: unknown;
  badgeCommand: unknown;
  evolutionCommand: unknown;
  todayCommand: unknown;

  // Services
  crisisDetectionService: unknown;
  crisisEscalationService: unknown;
  emojiSlider: unknown;
  hubMenu: unknown;
  dailyGreeting: unknown;
  yearInPixels: unknown;
  sonyaEvolutionService: unknown;
  adaptiveKeyboardService: unknown;
  onboardingTracker: unknown;

  // Repositories
  assessmentRepository?: unknown;
  sleepDiaryRepository?: unknown;
  therapySessionRepository?: unknown;
  userRepository?: unknown;
  gamificationRepository?: unknown;

  // Audit
  auditService?: unknown;

  // Utilities
  buildKeyboard: (keyboard: unknown) => unknown;
  ensureGamificationSession: (dbUserId: string | undefined) => Promise<unknown>;
}

/**
 * Parse callback data string into structured format
 * @param data Raw callback data from Telegram
 * @returns Parsed callback data
 */
export function parseCallbackData(data: string): ICallbackData {
  const parts = data.split(':');
  return {
    command: parts[0] || '',
    action: parts[1] || '',
    params: parts.slice(2),
    raw: data,
  };
}
