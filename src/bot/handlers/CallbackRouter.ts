/**
 * Callback Router
 * ===============
 * Central router for callback query handling using Strategy pattern.
 *
 * Replaces monolithic switch-case with modular, testable handlers.
 * Based on grammY Router plugin architecture (grammy.dev/plugins/router).
 *
 * Benefits:
 * - Each handler is independently testable
 * - New handlers can be added without modifying router
 * - Follows Open/Closed Principle (SOLID)
 * - IEC 62304 compliant modular design
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/CallbackRouter
 */

import {
  type ICallbackHandler,
  type ICallbackData,
  type ICallbackResult,
  type IHandlerContext,
  type IHandlerRegistry,
  parseCallbackData,
} from './types';

/**
 * Default result when no handler matches
 */
const DEFAULT_RESULT: ICallbackResult = {
  handled: false,
  answerQuery: true,
  answerText: 'OK',
};

/**
 * Callback Router implementation
 *
 * Routes callback queries to appropriate handlers based on command prefix.
 * Uses Map for O(1) handler lookup.
 *
 * @example
 * ```typescript
 * const router = new CallbackRouter();
 * router.register(new StartCallbackHandler(deps));
 * router.register(new DiaryCallbackHandler(deps));
 *
 * // In bot.on('callback_query:data')
 * const result = await router.route(context);
 * ```
 */
export class CallbackRouter implements IHandlerRegistry {
  private handlers: Map<string, ICallbackHandler> = new Map();
  private handlerList: ICallbackHandler[] = [];

  /**
   * Register a handler for a command prefix
   * @param handler Callback handler to register
   * @throws Error if handler for command already exists
   */
  register(handler: ICallbackHandler): void {
    if (this.handlers.has(handler.command)) {
      throw new Error(`Handler for command '${handler.command}' already registered`);
    }
    this.handlers.set(handler.command, handler);
    this.handlerList.push(handler);
  }

  /**
   * Get handler for a command prefix
   * @param command Command prefix
   * @returns Handler if found, undefined otherwise
   */
  get(command: string): ICallbackHandler | undefined {
    return this.handlers.get(command);
  }

  /**
   * Get all registered handlers
   * @returns Array of all handlers
   */
  getAll(): ICallbackHandler[] {
    return [...this.handlerList];
  }

  /**
   * Check if a handler is registered for command
   * @param command Command prefix
   * @returns true if handler exists
   */
  has(command: string): boolean {
    return this.handlers.has(command);
  }

  /**
   * Get number of registered handlers
   */
  get size(): number {
    return this.handlers.size;
  }

  /**
   * Route callback to appropriate handler
   *
   * Flow:
   * 1. Parse callback data
   * 2. Find handler by command prefix
   * 3. Verify handler can process (canHandle check)
   * 4. Execute handler
   * 5. Return result or default
   *
   * @param context Handler context with ctx, sleepCoreCtx
   * @returns Result from the matched handler or default result
   */
  async route(context: IHandlerContext): Promise<ICallbackResult> {
    const { callbackData } = context;

    // Find handler by command prefix
    const handler = this.handlers.get(callbackData.command);

    if (!handler) {
      console.debug(`[CallbackRouter] No handler for command: ${callbackData.command}`);
      return DEFAULT_RESULT;
    }

    // Verify handler can process this specific callback
    if (!handler.canHandle(callbackData)) {
      console.debug(`[CallbackRouter] Handler ${handler.command} cannot handle: ${callbackData.raw}`);
      return DEFAULT_RESULT;
    }

    try {
      const result = await handler.handle(context);
      return result;
    } catch (error) {
      console.error(`[CallbackRouter] Handler ${handler.command} error:`, error);
      return {
        handled: false,
        answerQuery: true,
        answerText: 'Ошибка. Попробуйте позже.',
      };
    }
  }

  /**
   * Create handler context from Grammy context
   * @param ctx Grammy context
   * @param sleepCoreCtx Extended SleepCore context
   * @param data Raw callback data string
   * @returns Handler context
   */
  static createContext(
    ctx: unknown,
    sleepCoreCtx: unknown,
    data: string
  ): IHandlerContext {
    return {
      ctx: ctx as IHandlerContext['ctx'],
      sleepCoreCtx: sleepCoreCtx as IHandlerContext['sleepCoreCtx'],
      callbackData: parseCallbackData(data),
    };
  }
}

/**
 * Create a new CallbackRouter instance
 * Factory function for dependency injection
 */
export function createCallbackRouter(): CallbackRouter {
  return new CallbackRouter();
}
