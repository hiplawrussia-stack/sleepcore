/**
 * /sonya Command - Sonya Avatar Evolution System
 * ===============================================
 * View Sonya's current evolution stage and progress.
 *
 * Research basis (Sprint 8 - 2025):
 * - Finch app model: 56% higher retention with virtual pet mechanics
 * - Virtual pet evolution driven by care rating (not punishment)
 * - Tamagotchi revival 2025: mental health connection recognized
 * - White Hat Gamification: meaning, accomplishment, ownership
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  IConversationCommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';
import { EVOLUTION_STAGES, type SonyaStageId } from '../../modules/evolution';

/**
 * /sonya Command Implementation
 * Migrated to GamificationEngine for SQLite persistence
 */
export class EvolutionCommand implements IConversationCommand {
  readonly name = 'sonya';
  readonly description = 'Эволюция Сони';
  readonly aliases = ['evolution', 'avatar', 'эволюция', 'соня'];
  readonly requiresSession = false;
  readonly steps = ['status', 'history', 'abilities'];

  /**
   * Execute the command - show Sonya status
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    if (args) {
      switch (args) {
        case 'history':
          return this.showEvolutionHistory(ctx);
        case 'abilities':
          return this.showAbilities(ctx);
        case 'next':
          return this.showNextStage(ctx);
        default:
          break;
      }
    }

    return this.showSonyaStatus(ctx);
  }

  /**
   * Handle conversation step
   */
  async handleStep(
    ctx: ISleepCoreContext,
    step: string,
    _data: Record<string, unknown>
  ): Promise<ICommandResult> {
    switch (step) {
      case 'status':
        return this.showSonyaStatus(ctx);
      case 'history':
        return this.showEvolutionHistory(ctx);
      case 'abilities':
        return this.showAbilities(ctx);
      default:
        return this.showSonyaStatus(ctx);
    }
  }

  /**
   * Handle callback query
   */
  async handleCallback(
    ctx: ISleepCoreContext,
    callbackData: string,
    _conversationData: Record<string, unknown>
  ): Promise<ICommandResult> {
    const [, action] = callbackData.split(':');

    switch (action) {
      case 'status':
        return this.showSonyaStatus(ctx);
      case 'history':
        return this.showEvolutionHistory(ctx);
      case 'abilities':
        return this.showAbilities(ctx);
      case 'next':
        return this.showNextStage(ctx);
      case 'interact':
        return this.interactWithSonya(ctx);
      default:
        return this.showSonyaStatus(ctx);
    }
  }

  // ==================== Response Handlers ====================

  /**
   * Show Sonya's current status
   */
  private async showSonyaStatus(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const userId = parseInt(ctx.userId, 10);

    const profile = await ctx.sleepCore.getPlayerProfile(userId);
    const currentStage = profile.sonyaStage;

    if (!currentStage) {
      return {
        success: false,
        error: 'Не удалось получить данные о Соне',
      };
    }

    // Get stage visual
    const stageVisual = this.getStageVisual(currentStage.id);

    // Get mood message based on stage
    const moodMessage = this.getSonyaMoodMessage(currentStage.id, profile.totalDaysActive);

    // Calculate progress to next stage
    const currentIndex = EVOLUTION_STAGES.findIndex((s) => s.id === currentStage.id);
    const nextStage = currentIndex < EVOLUTION_STAGES.length - 1
      ? EVOLUTION_STAGES[currentIndex + 1]
      : null;

    // Calculate progress bar
    let progressBar = '';
    let progressText = '';
    if (nextStage) {
      const progress = Math.min(100, Math.round((profile.totalDaysActive / nextStage.requiredDays) * 100));
      progressBar = formatter.progressBar(progress, 10);
      const daysRemaining = Math.max(0, nextStage.requiredDays - profile.totalDaysActive);
      progressText = `*Прогресс к ${nextStage.emoji} ${nextStage.name}:*
${progressBar} (${daysRemaining} дней до перехода)`;
    }

    // Count unlocked stages
    const unlockedStages = EVOLUTION_STAGES.filter(
      (s) => profile.totalDaysActive >= s.requiredDays
    );

    const message = `
${stageVisual}

${currentStage.emoji} *${currentStage.name}*

_"${moodMessage}"_

${formatter.divider()}

*📊 Статус:*
📅 Активных дней: ${profile.totalDaysActive}
🌟 Стадий открыто: ${unlockedStages.length}/${EVOLUTION_STAGES.length}
⭐ Уровень: ${profile.level}

${formatter.divider()}

${currentStage.description}

${nextStage ? progressText : '🏆 _Максимальный уровень достигнут!_'}

${formatter.tip(`${currentStage.abilities.length} способностей доступно`)}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '💬 Поговорить', callbackData: 'sonya:interact' },
        { text: '🌟 Способности', callbackData: 'sonya:abilities' },
      ],
      [
        { text: '📜 История', callbackData: 'sonya:history' },
        { text: '🎯 Следующий уровень', callbackData: 'sonya:next' },
      ],
      [
        { text: '🎯 Квесты', callbackData: 'quest:list' },
        { text: '🏅 Бейджи', callbackData: 'badge:list' },
      ],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show evolution history
   */
  private async showEvolutionHistory(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const userId = parseInt(ctx.userId, 10);

    const profile = await ctx.sleepCore.getPlayerProfile(userId);

    // Determine unlocked stages based on days active
    const unlockedStages = EVOLUTION_STAGES.filter(
      (s) => profile.totalDaysActive >= s.requiredDays
    );

    if (unlockedStages.length <= 1) {
      const message = `
📜 *История эволюции*

${formatter.info('История пока пуста')}

Соня только начинает свой путь с тобой.
Продолжай взаимодействовать, чтобы увидеть её развитие!
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '◀️ Назад', callbackData: 'sonya:status' }],
      ];

      return { success: true, message, keyboard };
    }

    let historyText = '';

    for (const stage of unlockedStages) {
      historyText += `${stage.emoji} *${stage.name}*\n`;
      historyText += `📅 Требовалось: ${stage.requiredDays} дней\n\n`;
    }

    const message = `
📜 *История эволюции Сони*

${historyText}

${sonya.emoji} _Мы прошли этот путь вместе!_
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '◀️ Назад', callbackData: 'sonya:status' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show current abilities
   */
  private async showAbilities(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const userId = parseInt(ctx.userId, 10);

    const profile = await ctx.sleepCore.getPlayerProfile(userId);
    const currentStage = profile.sonyaStage;

    if (!currentStage) {
      return { success: false, error: 'Не удалось получить данные' };
    }

    const abilities = currentStage.abilities;

    let abilitiesText = '';

    for (const ability of abilities) {
      abilitiesText += `✨ ${ability}\n`;
    }

    // Also show locked abilities from higher stages
    const currentIndex = EVOLUTION_STAGES.findIndex((s) => s.id === currentStage.id);
    const lockedAbilities: string[] = [];

    for (let i = currentIndex + 1; i < EVOLUTION_STAGES.length; i++) {
      const stage = EVOLUTION_STAGES[i];
      for (const ability of stage.abilities) {
        if (!abilities.includes(ability)) {
          lockedAbilities.push(`${stage.emoji} ${ability}`);
        }
      }
    }

    const message = `
🌟 *Способности Сони*

*${currentStage.emoji} ${currentStage.name}:*
${abilitiesText}

${lockedAbilities.length > 0 ? `
${formatter.divider()}

*🔒 Откроются на следующих уровнях:*
${lockedAbilities.slice(0, 5).map((a) => `⬜ ${a}`).join('\n')}
${lockedAbilities.length > 5 ? `\n_...и ещё ${lockedAbilities.length - 5}_` : ''}
` : ''}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '◀️ Назад', callbackData: 'sonya:status' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show next stage requirements
   */
  private async showNextStage(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const userId = parseInt(ctx.userId, 10);

    const profile = await ctx.sleepCore.getPlayerProfile(userId);
    const currentStage = profile.sonyaStage;

    if (!currentStage) {
      return { success: false, error: 'Не удалось получить данные' };
    }

    // Find next stage
    const currentIndex = EVOLUTION_STAGES.findIndex((s) => s.id === currentStage.id);
    const nextStage = currentIndex < EVOLUTION_STAGES.length - 1
      ? EVOLUTION_STAGES[currentIndex + 1]
      : null;

    if (!nextStage) {
      const message = `
🏆 *Максимальный уровень!*

${currentStage.emoji} Соня достигла высшего уровня развития!

${sonya.emoji} _Спасибо, что прошёл этот путь со мной. Ты настоящий друг!_

${formatter.divider()}

Все способности разблокированы.
Продолжай заботиться о сне — мы навсегда вместе!
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '◀️ Назад', callbackData: 'sonya:status' }],
      ];

      return { success: true, message, keyboard };
    }

    const daysToNext = Math.max(0, nextStage.requiredDays - profile.totalDaysActive);
    const progress = Math.min(100, Math.round((profile.totalDaysActive / nextStage.requiredDays) * 100));

    const message = `
🎯 *Следующий уровень*

${nextStage.emoji} *${nextStage.name}*
${nextStage.description}

${formatter.divider()}

*Требования:*
⬜ Активных дней: ${profile.totalDaysActive}/${nextStage.requiredDays}

${formatter.divider()}

*Общий прогресс:*
${formatter.progressBar(progress, 10)} ${progress}%

${daysToNext > 0
  ? `📅 Осталось: ${daysToNext} ${this.pluralizeDays(daysToNext)}`
  : '✅ Требования выполнены!'}

${formatter.tip(progress >= 80 ? 'Почти готово!' : 'Продолжай в том же духе!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📓 Дневник', callbackData: 'menu:diary' }],
      [{ text: '◀️ Назад', callbackData: 'sonya:status' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Interact with Sonya
   */
  private async interactWithSonya(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const userId = parseInt(ctx.userId, 10);

    // Record action which may trigger evolution check
    const result = await ctx.sleepCore.recordGamificationAction(userId, 'daily_check_in');

    const profile = await ctx.sleepCore.getPlayerProfile(userId);
    const currentStage = profile.sonyaStage;

    if (!currentStage) {
      return { success: false, error: 'Не удалось получить данные' };
    }

    // Generate response based on stage and time
    const hour = new Date().getHours();
    const timeOfDay = hour >= 5 && hour < 12 ? 'morning' :
                      hour >= 12 && hour < 18 ? 'day' :
                      hour >= 18 && hour < 22 ? 'evening' : 'night';

    const responses = this.getInteractionResponses(currentStage.id, timeOfDay);
    const response = responses[Math.floor(Math.random() * responses.length)];

    // Check for evolution in result
    let evolutionMessage = '';
    if (result.evolution?.evolved && result.evolution.currentStage) {
      const newStage = result.evolution.currentStage;
      evolutionMessage = `

🎉 *Соня эволюционировала!*
${newStage.emoji} Новый уровень: *${newStage.name}*

_${newStage.description}_

🆕 Новые способности:
${newStage.abilities.map((a: string) => `✨ ${a}`).join('\n')}

      `.trim();
    }

    // Show celebrations
    let celebrationsText = '';
    if (result.celebrations.length > 0) {
      celebrationsText = '\n\n' + result.celebrations.join('\n');
    }

    const message = `
${sonya.emoji} *${sonya.name}*

_"${response}"_

${evolutionMessage}
${celebrationsText}

${formatter.divider()}

📅 Активных дней: ${profile.totalDaysActive}
${result.xpEarned > 0 ? `💎 +${result.xpEarned} XP` : ''}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [
        { text: '💬 Ещё поговорить', callbackData: 'sonya:interact' },
      ],
      [{ text: '◀️ Назад', callbackData: 'sonya:status' }],
    ];

    return { success: true, message, keyboard };
  }

  // ==================== Helpers ====================

  /**
   * Get ASCII art for stage
   */
  private getStageVisual(stageId: SonyaStageId): string {
    const visuals: Record<SonyaStageId, string> = {
      owlet: `
    .-""-.
   /  __ \\
  | (··) |
   \\____/
    zzZ
      `.trim(),
      young_owl: `
    .-""-.
   /  ◡◡ \\
  | (••) |
   \\____/
     ✧
      `.trim(),
      wise_owl: `
    .-""-.
   / ★  ★ \\
  | (◠‿◠)  |
   \\____/
    ✨✨
      `.trim(),
      master: `
  ✧ ★★★ ✧
   .-"∞"-.
  /◕  ◕\\
  | (◡‿◡) |
  \\  ♥  /
 ✨ 🌟🌟🌟 ✨
      `.trim(),
    };

    return '```\n' + (visuals[stageId] || visuals.owlet) + '\n```';
  }

  /**
   * Get mood message based on stage and days active
   */
  private getSonyaMoodMessage(stageId: SonyaStageId, daysActive: number): string {
    const messages: Record<SonyaStageId, string[]> = {
      owlet: [
        'Привет! Я Совёнок Соня. Давай вместе улучшим твой сон!',
        'Мммм... ещё так хочется спать...',
        'Я начинаю просыпаться благодаря тебе...',
      ],
      young_owl: [
        'Привет! Целая неделя вместе — это здорово!',
        'Как хорошо, что ты здесь!',
        'Мне нравится, когда ты приходишь.',
      ],
      wise_owl: [
        'Привет, друг! Месяц упорной работы — ты настоящий молодец!',
        'Готова помочь тебе сегодня!',
        'Вместе мы справимся с любыми трудностями!',
      ],
      master: [
        'Привет, Мастер сна! Ты достиг вершины.',
        'Наша связь стала по-настоящему крепкой.',
        'Я горжусь тем, чего мы достигли вместе.',
      ],
    };

    const stageMessages = messages[stageId] || messages.owlet;

    // Add variety based on days active
    if (daysActive > 30) {
      return stageMessages[2] || stageMessages[0];
    } else if (daysActive > 7) {
      return stageMessages[1] || stageMessages[0];
    }

    return stageMessages[0];
  }

  /**
   * Get interaction responses based on stage and time
   */
  private getInteractionResponses(stageId: SonyaStageId, timeOfDay: string): string[] {
    const baseResponses: Record<SonyaStageId, string[]> = {
      owlet: [
        'Приятно, что ты здесь... *зевает*',
        'Я постараюсь быть полезной...',
        'Расскажи мне о своём дне...',
      ],
      young_owl: [
        'Рада тебя видеть!',
        'Как ты себя чувствуешь?',
        'Давай поработаем над твоим сном!',
      ],
      wise_owl: [
        'Отлично, что ты пришёл!',
        'Я уже знаю, что тебе может помочь!',
        'Готова к новым свершениям?',
      ],
      master: [
        'Наша связь даёт мне силы.',
        'Ты достиг удивительного прогресса!',
        'Я счастлива быть рядом с тобой.',
      ],
    };

    // Add time-specific responses
    const timeResponses: Record<string, string[]> = {
      morning: [
        'Доброе утро! Как спалось?',
        'Новый день — новые возможности!',
      ],
      day: [
        'Как проходит твой день?',
        'Не забудь сделать перерыв!',
      ],
      evening: [
        'Добрый вечер! Скоро пора готовиться ко сну.',
        'Как насчёт релаксации перед сном?',
      ],
      night: [
        'Уже поздно... пора отдыхать.',
        'Помни про режим сна!',
      ],
    };

    return [...(baseResponses[stageId] || baseResponses.owlet), ...(timeResponses[timeOfDay] || [])];
  }

  /**
   * Pluralize days in Russian
   */
  private pluralizeDays(n: number): string {
    const lastTwo = n % 100;
    const lastOne = n % 10;

    if (lastTwo >= 11 && lastTwo <= 19) {
      return 'дней';
    }
    if (lastOne === 1) {
      return 'день';
    }
    if (lastOne >= 2 && lastOne <= 4) {
      return 'дня';
    }
    return 'дней';
  }
}

// Export singleton
export const evolutionCommand = new EvolutionCommand();
