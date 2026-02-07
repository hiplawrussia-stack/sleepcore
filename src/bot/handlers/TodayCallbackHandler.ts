/**
 * Today Callback Handler
 * ======================
 * Handles 'today:*' callbacks for today's recommendations.
 *
 * Callbacks:
 * - today:done - Mark recommendation as done
 * - today:* - General acknowledgment
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/TodayCallbackHandler
 */

import { BaseCallbackHandler } from './BaseCallbackHandler';
import type { ICallbackResult, IHandlerContext } from './types';

/**
 * Today callback handler
 * Simple acknowledgment handler
 */
export class TodayCallbackHandler extends BaseCallbackHandler {
  readonly command = 'today';

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    const { callbackData } = context;
    const { action } = callbackData;

    const text = action === 'done' ? '✅ Отлично!' : '👍';
    return this.handledWithMessage(text);
  }
}
