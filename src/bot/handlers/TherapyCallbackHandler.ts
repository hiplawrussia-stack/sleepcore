/**
 * Therapy Callback Handler
 * ========================
 * Handles 'therapy:*' callbacks for structured CBT-I therapy sessions.
 *
 * Callbacks:
 * - therapy:* - Therapy session navigation and progress
 *
 * Session State:
 * - Updates therapy progress (week number, active session)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/TherapyCallbackHandler
 */

import { BaseCallbackHandler } from './BaseCallbackHandler';
import type { ICallbackResult, IHandlerContext, IHandlerDependencies } from './types';
import type { ICommandResult, ISleepCoreContext, IConversationCommand } from '../commands';

interface ITherapySession {
  therapyState?: {
    hasActiveSession?: boolean;
    currentWeek?: number;
    hasCompletedOnboarding?: boolean;
    lastDiaryDate?: string;
  };
}

/**
 * Therapy callback handler
 * Manages structured CBT-I therapy sessions (Phase 7)
 */
export class TherapyCallbackHandler extends BaseCallbackHandler {
  readonly command = 'therapy';

  private therapyCommand: IConversationCommand;

  constructor(deps: Partial<IHandlerDependencies>) {
    super(deps);
    this.therapyCommand = deps.therapyCommand as IConversationCommand;
  }

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, sleepCoreCtx, callbackData } = context;
    const session = ctx.session as ITherapySession;

    if (!('handleCallback' in this.therapyCommand)) {
      return this.notHandled();
    }

    const result = await this.therapyCommand.handleCallback(
      sleepCoreCtx,
      callbackData.raw,
      {}
    );

    // Update therapy progress in session state
    if (result?.metadata?.weekNumber !== undefined) {
      (ctx.session as ITherapySession).therapyState = {
        ...session.therapyState,
        hasActiveSession: true,
        currentWeek: result.metadata.weekNumber as number,
      };
    }

    return this.handled(result);
  }
}
