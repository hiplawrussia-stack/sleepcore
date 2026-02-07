/**
 * Cmd Callback Handler
 * ====================
 * Handles 'cmd:*' callbacks for executing commands from inline buttons.
 *
 * Callbacks:
 * - cmd:diary - Execute diary command
 * - cmd:relax - Execute relax command
 * - cmd:sos - Execute SOS command
 * - cmd:therapy - Execute therapy command
 * - cmd:challenges - Show challenges preview
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/CmdCallbackHandler
 */

import { InlineKeyboard } from 'grammy';
import { BaseCallbackHandler } from './BaseCallbackHandler';
import type { ICallbackResult, IHandlerContext, IHandlerDependencies } from './types';
import type { ICommandResult, ISleepCoreContext } from '../commands';

interface ICommand {
  execute(ctx: ISleepCoreContext, action?: string): Promise<ICommandResult>;
}

/**
 * Cmd callback handler
 * Executes commands from inline buttons
 */
export class CmdCallbackHandler extends BaseCallbackHandler {
  readonly command = 'cmd';

  private diaryCommand: ICommand;
  private relaxCommand: ICommand;
  private sosCommand: ICommand;
  private therapyCommand: ICommand;
  private buildKeyboard: (kb: unknown) => InlineKeyboard | undefined;

  constructor(deps: Partial<IHandlerDependencies>) {
    super(deps);
    this.diaryCommand = deps.diaryCommand as ICommand;
    this.relaxCommand = deps.relaxCommand as ICommand;
    this.sosCommand = deps.sosCommand as ICommand;
    this.therapyCommand = deps.therapyCommand as ICommand;
    this.buildKeyboard = deps.buildKeyboard as (kb: unknown) => InlineKeyboard | undefined;
  }

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    const { sleepCoreCtx, callbackData } = context;
    const { action } = callbackData;

    switch (action) {
      case 'diary':
        return this.executeCommand(context, this.diaryCommand, sleepCoreCtx);

      case 'relax':
        return this.executeCommand(context, this.relaxCommand, sleepCoreCtx);

      case 'sos':
        return this.executeCommand(context, this.sosCommand, sleepCoreCtx);

      case 'therapy':
        return this.executeCommand(context, this.therapyCommand, sleepCoreCtx);

      case 'challenges':
        return this.handleChallenges(context);

      default:
        return this.handled();
    }
  }

  private async executeCommand(
    context: IHandlerContext,
    command: ICommand,
    sleepCoreCtx: ISleepCoreContext
  ): Promise<ICallbackResult> {
    const result = await command.execute(sleepCoreCtx);

    if (result.message) {
      const kb = result.keyboard ? this.buildKeyboard(result.keyboard) : undefined;
      await this.editMessageText(context, result.message, kb);
    }

    return this.handled();
  }

  private async handleChallenges(context: IHandlerContext): Promise<ICallbackResult> {
    // Challenges feature - planned for Phase 8
    // Research (2025-2026): gamification shows small-moderate effect (Hedges g=-0.27)
    // Most effective components: progress tracking (80%), points (56%), rewards (50%)
    // Focus on CBT-I aligned challenges: sleep hygiene, consistency, relaxation
    const challengesPreview = `🎯 *Челленджи (скоро)*

Мы работаем над системой челленджей, которые помогут закрепить полезные привычки сна:

*Планируемые челленджи:*
• 🌙 "7 дней режима" — ложиться в одно время
• 📵 "Цифровой детокс" — без экранов за час до сна
• 🧘 "Неделя релаксации" — ежедневные практики
• ☕ "Без кофеина после 14:00"

_Следите за обновлениями!_`;

    const keyboard = new InlineKeyboard().text('◀️ Назад', 'menu:main');

    await this.editMessageText(context, challengesPreview, keyboard);
    return this.handled();
  }
}
