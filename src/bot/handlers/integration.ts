/**
 * Router Integration
 * ==================
 * Integration utilities for using CallbackRouter in main.ts
 *
 * This module provides the bridge between the modular handler architecture
 * and the existing main.ts callback_query handler.
 *
 * Usage in main.ts:
 * ```typescript
 * import { createCallbackProcessor } from './bot/handlers/integration';
 *
 * // During setupCallbacks():
 * const processCallback = createCallbackProcessor({
 *   // ... all handler dependencies
 * });
 *
 * // In callback_query handler:
 * const result = await processCallback(ctx, sleepCoreCtx);
 * if (result.handled) {
 *   // ... handle result
 * }
 * ```
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/integration
 */

import { InlineKeyboard, GrammyError, Context } from 'grammy';
import { registerAllHandlers } from './factory';
import { parseCallbackData } from './types';
import type { IHandlerDependencies, ICallbackResult, IHandlerContext, SessionContext } from './types';
import type { ISleepCoreContext } from '../commands';

/**
 * Callback processing result
 */
export interface IProcessorResult {
  /** Whether the callback was handled by a registered handler */
  handled: boolean;
  /** The handler result if handled */
  result?: ICallbackResult;
  /** Error if processing failed */
  error?: Error;
}

/**
 * Callback processor function type
 */
export type CallbackProcessor = (
  ctx: SessionContext,
  sleepCoreCtx: ISleepCoreContext
) => Promise<IProcessorResult>;

/**
 * Creates a callback processor that uses the modular handler architecture
 *
 * @param deps - All handler dependencies from main.ts
 * @returns Callback processor function
 *
 * @example
 * ```typescript
 * const processCallback = createCallbackProcessor({
 *   startCommand,
 *   diaryCommand,
 *   therapyCommand,
 *   // ... other commands
 *   assessmentRepository,
 *   sleepDiaryRepository,
 *   therapySessionRepository,
 *   userRepository,
 *   auditService,
 *   emojiSlider,
 *   hubMenu,
 *   // ... other services
 * });
 *
 * // Use in callback_query handler
 * const { handled, result } = await processCallback(ctx, sleepCoreCtx);
 * ```
 */
export function createCallbackProcessor(
  deps: Partial<IHandlerDependencies>
): CallbackProcessor {
  // Create router with all handlers
  const router = registerAllHandlers(deps);

  return async (ctx: SessionContext, sleepCoreCtx: ISleepCoreContext): Promise<IProcessorResult> => {
    try {
      // Get callback data
      const data = (ctx.callbackQuery as { data?: string })?.data;
      if (!data) {
        return { handled: false };
      }

      // Parse callback data
      const callbackData = parseCallbackData(data);

      // Create handler context
      const context: IHandlerContext = {
        ctx: ctx as IHandlerContext['ctx'],
        sleepCoreCtx,
        callbackData,
      };

      // Route to appropriate handler
      const result = await router.route(context);

      return {
        handled: result.handled,
        result,
      };
    } catch (error) {
      return {
        handled: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  };
}

/**
 * Helper: Build InlineKeyboard from command result keyboard spec
 *
 * @param keyboardSpec - Keyboard specification from command result
 * @returns InlineKeyboard or undefined
 */
export function buildKeyboard(keyboardSpec: unknown): InlineKeyboard | undefined {
  if (!keyboardSpec || !Array.isArray(keyboardSpec)) {
    return undefined;
  }

  const keyboard = new InlineKeyboard();

  for (const row of keyboardSpec) {
    if (Array.isArray(row)) {
      for (const button of row) {
        if (button && typeof button === 'object') {
          const btn = button as { text?: string; callback_data?: string; url?: string };
          if (btn.text && btn.callback_data) {
            keyboard.text(btn.text, btn.callback_data);
          } else if (btn.text && btn.url) {
            keyboard.url(btn.text, btn.url);
          }
        }
      }
      keyboard.row();
    }
  }

  return keyboard;
}

/**
 * Helper: Process command result and send response
 *
 * @param ctx - Grammy context
 * @param result - Command result with message and keyboard
 */
export async function sendCommandResult(
  ctx: Context,
  result: { message?: string; keyboard?: unknown }
): Promise<void> {
  if (!result.message) return;

  const keyboard = buildKeyboard(result.keyboard);

  try {
    await ctx.editMessageText(result.message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (error) {
    // If edit fails (message not modified), try reply
    if (!(error instanceof GrammyError && error.description.includes('not modified'))) {
      await ctx.reply(result.message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }
  }
}

/**
 * Integration example for main.ts
 *
 * This shows how to integrate the router into the existing callback_query handler.
 * The key points are:
 *
 * 1. Keep safety-critical code (crisis monitoring) BEFORE routing
 * 2. Keep adaptive keyboard tracking BEFORE routing
 * 3. Use router for command dispatch
 * 4. Keep result processing AFTER routing
 *
 * @example
 * ```typescript
 * // In setupCallbacks():
 *
 * const processCallback = createCallbackProcessor({
 *   // Commands
 *   startCommand,
 *   diaryCommand,
 *   therapyCommand,
 *   todayCommand,
 *   relaxCommand,
 *   mindfulCommand,
 *   progressCommand,
 *   sosCommand,
 *   helpCommand,
 *   rehearsalCommand,
 *   recallCommand,
 *   questCommand,
 *   badgeCommand,
 *   evolutionCommand,
 *
 *   // Repositories
 *   assessmentRepository,
 *   sleepDiaryRepository,
 *   therapySessionRepository,
 *   userRepository,
 *
 *   // Services
 *   auditService,
 *   sonyaEvolutionService,
 *   ensureGamificationSession,
 *
 *   // UI Components
 *   emojiSlider,
 *   hubMenu,
 *   yearInPixels,
 *   dailyGreeting,
 *   onboardingTracker,
 *   buildKeyboard,
 * });
 *
 * bot.on('callback_query:data', async (ctx) => {
 *   const data = ctx.callbackQuery.data;
 *   ctx.session.lastActivityAt = new Date();
 *
 *   const [command, action] = data.split(':');
 *   const sleepCoreCtx = extendContext(ctx, api);
 *
 *   // =========================================================================
 *   // SAFETY: Crisis State Monitoring (keep this - safety critical)
 *   // =========================================================================
 *   try {
 *     // ... existing crisis monitoring code ...
 *   } catch (crisisError) {
 *     console.error('[CRISIS] State monitoring error:', crisisError);
 *   }
 *
 *   // Adaptive keyboard tracking (keep this)
 *   if (['menu', 'quest', 'badge', ...].includes(command)) {
 *     adaptiveKeyboardService.recordCommandClick(sleepCoreCtx.userId, command).catch(() => {});
 *   }
 *
 *   try {
 *     // =====================================================================
 *     // NEW: Use router for callback processing
 *     // =====================================================================
 *     const { handled, result, error } = await processCallback(ctx, sleepCoreCtx);
 *
 *     if (error) {
 *       console.error('Callback handler error:', error);
 *       await ctx.answerCallbackQuery({ text: 'Ошибка. Попробуйте позже.' });
 *       return;
 *     }
 *
 *     if (handled && result?.commandResult?.message) {
 *       await sendCommandResult(ctx, result.commandResult);
 *     }
 *
 *     await ctx.answerCallbackQuery(
 *       result?.alertText ? { text: result.alertText } : undefined
 *     );
 *
 *   } catch (error) {
 *     console.error('Callback error:', error);
 *     await ctx.answerCallbackQuery({ text: 'Ошибка. Попробуйте позже.' });
 *   }
 * });
 * ```
 */
export const INTEGRATION_GUIDE = `
See the JSDoc above for the integration example.

Key files:
- src/bot/handlers/index.ts - Module exports
- src/bot/handlers/factory.ts - createAllHandlers, registerAllHandlers
- src/bot/handlers/types.ts - Type definitions
- src/bot/handlers/CallbackRouter.ts - Router implementation
- src/bot/handlers/*CallbackHandler.ts - Individual handlers

The modular architecture:
1. Separates concerns (each handler in its own file)
2. Enables unit testing (dependency injection)
3. Follows O(1) command lookup (Strategy pattern with Map)
4. Maintains IEC 62304 traceability
`;
