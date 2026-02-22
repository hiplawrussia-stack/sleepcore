/**
 * TelegramSleepCoreContext - Grammy Context Adapter
 * ==================================================
 * Wraps Grammy Context to implement platform-independent ISleepCoreContext.
 *
 * This adapter enables commands to be written once and used across
 * multiple platforms (Telegram, VK, etc.) by abstracting away
 * platform-specific context details.
 *
 * Research basis:
 * - Adapter Pattern (Gang of Four, 1994)
 * - Grammy Context Flavors (grammy.dev 2025)
 * - TypeScript best practices for adapter patterns (2025-2026)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/platform
 */

import type { Context } from 'grammy';
import { InlineKeyboard, Keyboard } from 'grammy';
import type {
  ISleepCoreContext as IPlatformSleepCoreContext,
  ISleepCoreAPI as IPlatformSleepCoreAPI,
  ICommandResult,
  IReplyOptions,
  IInlineButton,
  IReplyButton,
} from '@sleepcore/core';
import type { SleepCoreAPI } from '../../SleepCoreAPI';

// ============================================================================
// Telegram-Specific Session Data
// ============================================================================

/**
 * Session data structure for Grammy session plugin
 */
export interface TelegramSessionData {
  /** Current command being executed */
  currentCommand?: string;

  /** Current step in multi-step command */
  currentStep?: string;

  /** Conversation data accumulated during flow */
  conversationData: Record<string, unknown>;

  /** Session start time */
  startedAt: number;

  /** Last activity time */
  lastActivityAt: number;

  /** Whether user has completed onboarding */
  hasCompletedOnboarding: boolean;

  /** User's preferred language */
  language: 'ru' | 'en';
}

/**
 * Grammy context with session flavor
 */
export interface TelegramContext extends Context {
  session: TelegramSessionData;
}

// ============================================================================
// TelegramSleepCoreContext Adapter
// ============================================================================

/**
 * Adapter that wraps Grammy Context and implements ISleepCoreContext.
 *
 * This class provides:
 * - Platform-independent interface for commands
 * - Automatic keyboard conversion (IInlineButton → InlineKeyboard)
 * - Message formatting (Markdown → HTML for Telegram)
 * - Access to underlying Grammy context when needed
 *
 * @example
 * ```typescript
 * // In middleware
 * const sleepCoreCtx = createTelegramContext(ctx, sleepCoreAPI);
 * const result = await command.execute(sleepCoreCtx);
 * await sleepCoreCtx.sendResult(result);
 * ```
 */
export class TelegramSleepCoreContext {
  /**
   * User ID (Telegram user ID as string)
   */
  readonly userId: string;

  /**
   * Chat ID (Telegram chat ID)
   */
  readonly chatId: number;

  /**
   * User's display name
   */
  readonly displayName: string;

  /**
   * User's language code (from Telegram settings)
   */
  readonly languageCode: string;

  /**
   * SleepCore API instance (full access for Telegram)
   */
  readonly sleepCore: SleepCoreAPI;

  /**
   * Original Grammy context (for platform-specific operations)
   * @internal
   */
  readonly _grammyContext: TelegramContext;

  constructor(grammyContext: TelegramContext, sleepCoreAPI: SleepCoreAPI) {
    this._grammyContext = grammyContext;
    this.sleepCore = sleepCoreAPI;

    // Extract user info from Grammy context
    const from = grammyContext.from;
    if (!from) {
      throw new Error('TelegramSleepCoreContext: No user in context');
    }

    this.userId = String(from.id);
    this.chatId = grammyContext.chat?.id ?? from.id;
    this.displayName =
      from.first_name +
      (from.last_name ? ` ${from.last_name}` : '');
    this.languageCode = from.language_code ?? 'ru';
  }

  /**
   * Reply to user with text message
   */
  async reply(text: string, options?: IReplyOptions): Promise<void> {
    const replyOptions: Parameters<TelegramContext['reply']>[1] = {
      parse_mode: 'Markdown',
    };

    // Convert inline keyboard
    if (options?.keyboard) {
      replyOptions.reply_markup = this.convertInlineKeyboard(options.keyboard);
    }

    // Convert reply keyboard
    if (options?.replyKeyboard) {
      replyOptions.reply_markup = this.convertReplyKeyboard(options.replyKeyboard);
    }

    // Remove keyboard
    if (options?.removeKeyboard) {
      replyOptions.reply_markup = { remove_keyboard: true };
    }

    await this._grammyContext.reply(text, replyOptions);
  }

  /**
   * Send command result to user
   */
  async sendResult(result: ICommandResult): Promise<void> {
    if (!result.message) {
      return;
    }

    const options: IReplyOptions = {};

    if (result.keyboard) {
      options.keyboard = result.keyboard;
    }

    if (result.replyKeyboard) {
      options.replyKeyboard = result.replyKeyboard;
    }

    if (result.removeKeyboard) {
      options.removeKeyboard = result.removeKeyboard;
    }

    await this.reply(result.message, options);
  }

  // ============================================================================
  // Keyboard Conversion
  // ============================================================================

  /**
   * Convert platform-independent inline buttons to Grammy InlineKeyboard
   */
  private convertInlineKeyboard(buttons: IInlineButton[][]): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    for (const row of buttons) {
      for (const button of row) {
        if (button.url) {
          keyboard.url(button.text, button.url);
        } else if (button.callbackData) {
          keyboard.text(button.text, button.callbackData);
        }
      }
      keyboard.row();
    }

    return keyboard;
  }

  /**
   * Convert platform-independent reply buttons to Grammy Keyboard
   */
  private convertReplyKeyboard(buttons: IReplyButton[][]): Keyboard {
    const keyboard = new Keyboard();

    for (const row of buttons) {
      for (const button of row) {
        if (button.requestContact) {
          keyboard.requestContact(button.text);
        } else if (button.requestLocation) {
          keyboard.requestLocation(button.text);
        } else {
          keyboard.text(button.text);
        }
      }
      keyboard.row();
    }

    return keyboard.resized();
  }

  // ============================================================================
  // Grammy Context Access (for platform-specific operations)
  // ============================================================================

  /**
   * Get underlying Grammy context.
   * Use sparingly - prefer platform-independent methods.
   */
  getGrammyContext(): TelegramContext {
    return this._grammyContext;
  }

  /**
   * Get session data
   */
  getSession(): TelegramSessionData {
    return this._grammyContext.session;
  }

  /**
   * Update session data
   */
  updateSession(updates: Partial<TelegramSessionData>): void {
    Object.assign(this._grammyContext.session, updates);
  }

  /**
   * Answer callback query (Telegram-specific)
   */
  async answerCallbackQuery(text?: string): Promise<void> {
    if (this._grammyContext.callbackQuery) {
      await this._grammyContext.answerCallbackQuery({ text });
    }
  }

  /**
   * Edit message text (Telegram-specific)
   */
  async editMessageText(
    text: string,
    keyboard?: IInlineButton[][]
  ): Promise<void> {
    const options: Parameters<TelegramContext['editMessageText']>[1] = {
      parse_mode: 'Markdown',
    };

    if (keyboard) {
      options.reply_markup = this.convertInlineKeyboard(keyboard);
    }

    await this._grammyContext.editMessageText(text, options);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create TelegramSleepCoreContext from Grammy context
 *
 * @param grammyContext - Grammy context with session
 * @param sleepCoreAPI - SleepCore API instance
 * @returns Platform-independent context
 *
 * @example
 * ```typescript
 * bot.command('start', async (ctx) => {
 *   const sleepCoreCtx = createTelegramContext(ctx, sleepCore);
 *   const result = await startCommand.execute(sleepCoreCtx);
 *   await sleepCoreCtx.sendResult(result);
 * });
 * ```
 */
export function createTelegramContext(
  grammyContext: TelegramContext,
  sleepCoreAPI: SleepCoreAPI
): TelegramSleepCoreContext {
  return new TelegramSleepCoreContext(grammyContext, sleepCoreAPI);
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if context is TelegramSleepCoreContext
 */
export function isTelegramContext(
  ctx: unknown
): ctx is TelegramSleepCoreContext {
  return ctx instanceof TelegramSleepCoreContext;
}

/**
 * Get Grammy context from any SleepCore context (throws if not Telegram)
 */
export function getGrammyContextOrThrow(
  ctx: unknown
): TelegramContext {
  if (!isTelegramContext(ctx)) {
    throw new Error('Expected TelegramSleepCoreContext');
  }
  return ctx.getGrammyContext();
}
