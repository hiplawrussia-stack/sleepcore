/**
 * Base Callback Handler
 * =====================
 * Abstract base class for callback handlers.
 *
 * Provides common functionality:
 * - Default canHandle implementation
 * - Result builders
 * - Logging utilities
 * - Type-safe context access
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/BaseCallbackHandler
 */

import { InlineKeyboard, GrammyError } from 'grammy';
import {
  type ICallbackHandler,
  type ICallbackData,
  type ICallbackResult,
  type IHandlerContext,
  type IHandlerDependencies,
} from './types';
import type { ICommandResult } from '../commands';

/**
 * Abstract base class for callback handlers
 *
 * Extend this class to create new callback handlers.
 * Each handler is responsible for a single command prefix.
 *
 * @example
 * ```typescript
 * export class MyHandler extends BaseCallbackHandler {
 *   readonly command = 'my';
 *
 *   async handle(context: IHandlerContext): Promise<ICallbackResult> {
 *     const { ctx, callbackData } = context;
 *     // Handle callback...
 *     return this.handled();
 *   }
 * }
 * ```
 */
export abstract class BaseCallbackHandler implements ICallbackHandler {
  /**
   * Command prefix this handler responds to
   * Must be overridden by subclasses
   */
  abstract readonly command: string;

  /**
   * Dependencies injected into the handler
   */
  protected deps: Partial<IHandlerDependencies>;

  constructor(deps: Partial<IHandlerDependencies> = {}) {
    this.deps = deps;
  }

  /**
   * Handle the callback query
   * Must be implemented by subclasses
   */
  abstract handle(context: IHandlerContext): Promise<ICallbackResult>;

  /**
   * Check if this handler can process the given callback data
   * Default implementation checks command prefix match
   * Override for more specific matching
   */
  canHandle(data: ICallbackData): boolean {
    return data.command === this.command;
  }

  // =========================================================================
  // Result Builders - Fluent API for creating callback results
  // =========================================================================

  /**
   * Create a "handled" result
   * @param result Optional command result
   */
  protected handled(result?: ICommandResult | null): ICallbackResult {
    return {
      handled: true,
      result,
      answerQuery: true,
    };
  }

  /**
   * Create a "handled with message" result
   * @param text Answer text for callback query toast
   */
  protected handledWithMessage(text: string): ICallbackResult {
    return {
      handled: true,
      answerQuery: true,
      answerText: text,
    };
  }

  /**
   * Create a "not handled" result (pass to next handler)
   */
  protected notHandled(): ICallbackResult {
    return {
      handled: false,
      answerQuery: true,
      answerText: 'OK',
    };
  }

  /**
   * Create result that skips callback query answer
   */
  protected handledSilent(result?: ICommandResult | null): ICallbackResult {
    return {
      handled: true,
      result,
      answerQuery: false,
    };
  }

  /**
   * Create result with alert (modal popup)
   * @param text Alert text
   */
  protected alert(text: string): ICallbackResult {
    return {
      handled: true,
      answerQuery: true,
      answerText: text,
      showAlert: true,
    };
  }

  // =========================================================================
  // Message Utilities
  // =========================================================================

  /**
   * Edit message with result
   * Handles "message is not modified" error gracefully
   */
  protected async editMessage(
    context: IHandlerContext,
    result: ICommandResult,
    buildKeyboard: (kb: ICommandResult['keyboard']) => InlineKeyboard | undefined
  ): Promise<void> {
    const { ctx } = context;
    const keyboard = result.keyboard ? buildKeyboard(result.keyboard) : undefined;

    try {
      await ctx.editMessageText(result.message!, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (error) {
      // Handle "message is not modified" error
      if (!(error instanceof GrammyError && error.description.includes('not modified'))) {
        await ctx.reply(result.message!, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
    }
  }

  /**
   * Edit message with custom text and keyboard
   */
  protected async editMessageText(
    context: IHandlerContext,
    text: string,
    keyboard?: InlineKeyboard
  ): Promise<void> {
    const { ctx } = context;

    try {
      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (error) {
      if (!(error instanceof GrammyError && error.description.includes('not modified'))) {
        await ctx.reply(text, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
    }
  }

  // =========================================================================
  // Logging Utilities
  // =========================================================================

  /**
   * Log debug message with handler prefix
   */
  protected debug(message: string, ...args: unknown[]): void {
    console.debug(`[${this.command}Handler] ${message}`, ...args);
  }

  /**
   * Log info message with handler prefix
   */
  protected log(message: string, ...args: unknown[]): void {
    console.log(`[${this.command}Handler] ${message}`, ...args);
  }

  /**
   * Log error message with handler prefix
   */
  protected error(message: string, ...args: unknown[]): void {
    console.error(`[${this.command}Handler] ${message}`, ...args);
  }
}
