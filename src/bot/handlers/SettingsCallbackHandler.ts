/**
 * Settings Callback Handler
 * =========================
 * Handles 'settings:*' callbacks for user preferences.
 *
 * Callbacks:
 * - settings:toggle - Toggle notifications on/off
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/SettingsCallbackHandler
 */

import { BaseCallbackHandler } from './BaseCallbackHandler';
import type { ICallbackResult, IHandlerContext } from './types';

/**
 * Settings callback handler
 */
export class SettingsCallbackHandler extends BaseCallbackHandler {
  readonly command = 'settings';

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, callbackData } = context;
    const { action } = callbackData;

    if (action === 'toggle') {
      // Toggle notifications
      const session = ctx.session as {
        preferences: { notifications: boolean };
      };

      session.preferences.notifications = !session.preferences.notifications;

      return this.handledWithMessage(
        session.preferences.notifications ? '🔔 Вкл' : '🔕 Выкл'
      );
    }

    return this.notHandled();
  }
}
