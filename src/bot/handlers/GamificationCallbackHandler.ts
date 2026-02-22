/**
 * Gamification Callback Handler
 * =============================
 * Handles gamification-related callbacks.
 *
 * Callbacks:
 * - quest:* - Quest system callbacks
 * - badge:* - Badge system callbacks
 * - sonya:* - Sonya evolution callbacks
 * - voice:* - Voice diary callbacks
 * - rehearsal:* - Rehearsal callbacks
 * - recall:* - Recall callbacks
 * - relax:* - Relaxation callbacks
 * - mindful:* - Mindfulness callbacks
 *
 * @packageDocumentation
 * @module @sleepcore/bot/handlers/GamificationCallbackHandler
 */

import { InlineKeyboard } from 'grammy';
import { BaseCallbackHandler } from './BaseCallbackHandler';
import type { ICallbackResult, IHandlerContext, IHandlerDependencies } from './types';
import type { ICommandResult, ISleepCoreContext } from '../commands';

interface ISonyaEvolutionService {
  recordInteraction(userId: string, type: string): void;
}

interface ICommand {
  execute(ctx: ISleepCoreContext, action?: string): Promise<ICommandResult>;
  handleCallback?(ctx: ISleepCoreContext, data: string, state: unknown): Promise<ICommandResult>;
}

/**
 * Gamification callback handler
 * Handles quest, badge, sonya, voice, rehearsal, recall, relax, mindful callbacks
 */
export class GamificationCallbackHandler extends BaseCallbackHandler {
  readonly command = 'quest'; // Primary command, but handles multiple

  private sonyaEvolutionService: ISonyaEvolutionService;
  private questCommand: ICommand;
  private badgeCommand: ICommand;
  private evolutionCommand: ICommand;
  private rehearsalCommand: ICommand;
  private recallCommand: ICommand;
  private relaxCommand: ICommand;
  private mindfulCommand: ICommand;
  private ensureGamificationSession: (dbUserId: string | undefined) => Promise<unknown>;

  // Additional commands this handler responds to
  private additionalCommands = ['badge', 'sonya', 'voice', 'rehearsal', 'recall', 'relax', 'mindful'];

  constructor(deps: Partial<IHandlerDependencies>) {
    super(deps);
    this.sonyaEvolutionService = deps.sonyaEvolutionService as ISonyaEvolutionService;
    this.questCommand = deps.questCommand as ICommand;
    this.badgeCommand = deps.badgeCommand as ICommand;
    this.evolutionCommand = deps.evolutionCommand as ICommand;
    this.rehearsalCommand = deps.rehearsalCommand as ICommand;
    this.recallCommand = deps.recallCommand as ICommand;
    this.relaxCommand = deps.relaxCommand as ICommand;
    this.mindfulCommand = deps.mindfulCommand as ICommand;
    this.ensureGamificationSession = deps.ensureGamificationSession as (dbUserId: string | undefined) => Promise<unknown>;
  }

  canHandle(data: { command: string }): boolean {
    return data.command === this.command || this.additionalCommands.includes(data.command);
  }

  async handle(context: IHandlerContext): Promise<ICallbackResult> {
    const { ctx, sleepCoreCtx, callbackData } = context;
    const { command } = callbackData;

    const session = ctx.session as { dbUserId?: string };

    // Record interaction for evolution tracking (gamification commands)
    if (['quest', 'badge', 'sonya'].includes(command)) {
      this.sonyaEvolutionService.recordInteraction(sleepCoreCtx.userId, 'callback');
      // Ensure session is active for ethical engagement tracking
      this.ensureGamificationSession(session.dbUserId).catch(() => {});
    }

    switch (command) {
      case 'quest':
        return this.handleWithCallback(context, this.questCommand);

      case 'badge':
        return this.handleWithCallback(context, this.badgeCommand);

      case 'sonya':
        return this.handleWithCallback(context, this.evolutionCommand);

      case 'rehearsal':
        return this.handleWithCallback(context, this.rehearsalCommand);

      case 'recall':
        return this.handleWithCallback(context, this.recallCommand);

      case 'relax':
        return this.handleRelaxMindful(context, this.relaxCommand);

      case 'mindful':
        return this.handleRelaxMindful(context, this.mindfulCommand);

      case 'voice':
        return this.handleVoice(context);

      default:
        return this.notHandled();
    }
  }

  private async handleWithCallback(
    context: IHandlerContext,
    command: ICommand
  ): Promise<ICallbackResult> {
    const { sleepCoreCtx, callbackData } = context;

    if ('handleCallback' in command && command.handleCallback) {
      const result = await command.handleCallback(
        sleepCoreCtx,
        callbackData.raw,
        {}
      );
      return this.handled(result);
    }

    return this.notHandled();
  }

  private async handleRelaxMindful(
    context: IHandlerContext,
    command: ICommand
  ): Promise<ICallbackResult> {
    const { sleepCoreCtx, callbackData } = context;
    const result = await command.execute(sleepCoreCtx, callbackData.action);
    return this.handled(result);
  }

  private async handleVoice(context: IHandlerContext): Promise<ICallbackResult> {
    const { callbackData } = context;
    const { action } = callbackData;

    if (action === 'stats') {
      // Show voice diary statistics
      const voiceStats = {
        totalEntries: 0, // TODO: Get from database
        totalMinutes: 0,
        avgDuration: 0,
        mostCommonEmotion: 'neutral',
      };

      const statsMessage =
        `🎤 *Статистика голосового дневника*\n\n` +
        `📝 Записей: ${voiceStats.totalEntries}\n` +
        `⏱ Всего минут: ${voiceStats.totalMinutes}\n` +
        `📊 Ср. длительность: ${voiceStats.avgDuration}с\n\n` +
        `_Голосовой дневник помогает выразить эмоции,\n` +
        `которые сложно описать словами._`;

      const keyboard = new InlineKeyboard()
        .text('📓 Новая запись', 'diary:new')
        .text('◀️ Назад', 'hub:back');

      await this.editMessageText(context, statsMessage, keyboard);
      return this.handled();
    }

    return this.notHandled();
  }
}
