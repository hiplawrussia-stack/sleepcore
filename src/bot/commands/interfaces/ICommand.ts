/**
 * SleepCore Bot Command Interfaces
 * =================================
 * Command pattern implementation for Telegram bot commands.
 *
 * Based on 2025 research:
 * - Grammy best practices (grammy.dev)
 * - CBT-I Chatbot UX patterns (JMIR 2025)
 * - Mental health app command structures
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type { Context } from 'grammy';
import type { SleepCoreAPI } from '../../../SleepCoreAPI';

// ==================== Command Context ====================

/**
 * Extended context for SleepCore commands
 */
export interface ISleepCoreContext extends Context {
  /** User ID from Telegram */
  readonly userId: string;

  /** Chat ID */
  readonly chatId: number;

  /** User's display name */
  readonly displayName: string;

  /** User's language code */
  readonly languageCode: string;

  /** SleepCore API instance */
  readonly sleepCore: SleepCoreAPI;
}

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

  /** Additional data for logging */
  metadata?: Record<string, unknown>;
}

/**
 * Inline keyboard button
 */
export interface IInlineButton {
  text: string;
  callbackData?: string;
  url?: string;
}

/**
 * Reply keyboard button
 */
export interface IReplyButton {
  text: string;
  requestContact?: boolean;
  requestLocation?: boolean;
}

// ==================== Command Interface ====================

/**
 * Base command interface
 * All bot commands must implement this interface
 */
export interface ICommand {
  /** Command name (without slash) */
  readonly name: string;

  /** Command description for /help and BotFather */
  readonly description: string;

  /** Command aliases (optional) */
  readonly aliases?: string[];

  /** Whether command requires active session */
  readonly requiresSession?: boolean;

  /**
   * Execute the command
   * @param ctx - Grammy context with SleepCore extensions
   * @param args - Command arguments (text after command)
   */
  execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult>;
}

/**
 * Command with conversation flow (multi-step)
 */
export interface IConversationCommand extends ICommand {
  /** Current step in conversation */
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

// ==================== Message Formatters ====================

/**
 * Message formatting utilities
 */
export interface IMessageFormatter {
  /**
   * Format progress bar
   * @param value - Current value (0-100)
   * @param width - Bar width in characters
   */
  progressBar(value: number, width?: number): string;

  /**
   * Format sleep efficiency with color indicator
   */
  sleepEfficiency(value: number): string;

  /**
   * Format ISI score with severity
   */
  isiScore(value: number): string;

  /**
   * Format time duration
   */
  duration(minutes: number): string;

  /**
   * Format date for display
   */
  formatDate(date: Date): string;

  /**
   * Escape HTML for Telegram
   */
  escapeHtml(text: string): string;
}

// ==================== Exports ====================

export type { Context };
