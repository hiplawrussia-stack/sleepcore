/**
 * Menu Callback Handler
 * =====================
 * Handles 'menu:*' callbacks for context-aware menu navigation.
 *
 * Callbacks:
 * - menu:start, menu:diary, menu:today, etc.
 * - Routes to appropriate command execution
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/MenuCallbackHandler
 */

import { BaseCallbackHandler } from './BaseCallbackHandler';
import type { ICallbackResult, IHandlerContext, IHandlerDependencies } from './types';
import type { ICommandResult, ISleepCoreContext } from '../commands';

/**
 * Menu callback handler
 * Routes menu:action callbacks to appropriate commands
 */
export class MenuCallbackHandler extends BaseCallbackHandler {
  readonly command = 'menu';

  private commands: Record<string, unknown>;
  private sonyaEvolutionService: unknown;

  constructor(deps: Partial<IHandlerDependencies>) {
    super(deps);

    this.commands = {
      start: deps.startCommand,
      diary: deps.diaryCommand,
      today: deps.todayCommand,
      relax: deps.relaxCommand,
      mindful: deps.mindfulCommand,
      progress: deps.progressCommand,
      sos: deps.sosCommand,
      help: deps.helpCommand,
      rehearsal: deps.rehearsalCommand,
      recall: deps.recallCommand,
      quest: deps.questCommand,
      badges: deps.badgeCommand,
      sonya: deps.evolutionCommand,
      therapy: deps.therapyCommand,
    };

    this.sonyaEvolutionService = deps.sonyaEvolutionService;
  }

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    const { sleepCoreCtx, callbackData } = context;
    const { action } = callbackData;

    // Gamification actions track interaction
    const gamificationActions = ['quest', 'badges', 'sonya'];
    if (gamificationActions.includes(action) && this.sonyaEvolutionService) {
      (this.sonyaEvolutionService as { recordInteraction: (userId: string, type: string) => void })
        .recordInteraction(sleepCoreCtx.userId, 'command');
    }

    // Get command for action
    const command = this.commands[action];
    if (!command) {
      this.debug(`Unknown action: ${action}`);
      return this.notHandled();
    }

    // Execute command
    const result = await (command as { execute: (ctx: ISleepCoreContext) => Promise<ICommandResult> })
      .execute(sleepCoreCtx);

    return this.handled(result);
  }
}
