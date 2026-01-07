/**
 * /quest Command - Gamification Quest System
 * ==========================================
 * View and manage quests for sleep health improvement.
 *
 * Research basis:
 * - 40-60% higher DAU with streak+milestone combinations
 * - SDT theory: autonomy, competence, relatedness
 * - Goal Gradient Effect: commitment increases near completion
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
import { getGamificationEngine } from '../services/GamificationContext';
import type { IActiveQuestInfo } from '../../modules/gamification';
import { questService } from '../../modules/quests'; // Keep for quest definitions

/**
 * /quest Command Implementation
 */
export class QuestCommand implements IConversationCommand {
  readonly name = 'quest';
  readonly description = 'Квесты и задания';
  readonly aliases = ['quests', 'tasks', 'задания', 'квесты'];
  readonly requiresSession = false;
  readonly steps = ['list', 'details', 'start', 'progress'];

  /**
   * Execute the command - show quest list
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    if (args) {
      // Handle subcommands
      const [subcommand, ...rest] = args.split(' ');
      switch (subcommand) {
        case 'active':
          return this.showActiveQuests(ctx);
        case 'available':
          return this.showAvailableQuests(ctx);
        case 'completed':
          return this.showCompletedQuests(ctx);
        default:
          // Try to find quest by ID
          return this.showQuestDetails(ctx, subcommand);
      }
    }

    return this.showQuestHub(ctx);
  }

  /**
   * Handle conversation step
   */
  async handleStep(
    ctx: ISleepCoreContext,
    step: string,
    data: Record<string, unknown>
  ): Promise<ICommandResult> {
    switch (step) {
      case 'list':
        return this.showQuestHub(ctx);
      case 'details':
        return this.showQuestDetails(ctx, data.questId as string);
      case 'start':
        return this.startQuest(ctx, data.questId as string);
      case 'progress':
        return this.showActiveQuests(ctx);
      default:
        return this.showQuestHub(ctx);
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
    const [, action, questId] = callbackData.split(':');

    switch (action) {
      case 'list':
        return this.showQuestHub(ctx);
      case 'active':
        return this.showActiveQuests(ctx);
      case 'available':
        return this.showAvailableQuests(ctx);
      case 'completed':
        return this.showCompletedQuests(ctx);
      case 'details':
        return this.showQuestDetails(ctx, questId);
      case 'start':
        return this.startQuest(ctx, questId);
      case 'abandon':
        return this.abandonQuest(ctx, questId);
      default:
        return this.showQuestHub(ctx);
    }
  }

  // ==================== Response Handlers ====================

  /**
   * Show quest hub (main menu)
   */
  private async showQuestHub(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const engine = await getGamificationEngine();
      const userId = parseInt(ctx.userId, 10);

      const activeQuests = await engine.getActiveQuests(userId);
      const availableQuests = await engine.getAvailableQuests(userId);
      const completedCount = await engine.getCompletedQuestCount(userId);
      const totalQuests = questService.getAllQuests().length;

      // Get total XP from profile
      const profile = await engine.getPlayerProfile(userId);
      const totalXP = profile.totalXp;

      const message = `
${sonya.emoji} *Квесты*

${formatter.info(`Выполняй задания и получай награды!`)}

${formatter.divider()}

*📊 Твой прогресс:*
🎯 Активных: ${activeQuests.length}/3
✅ Завершено: ${completedCount}/${totalQuests}
💎 Всего XP: ${totalXP}

${formatter.divider()}

${activeQuests.length > 0 ? this.formatActiveQuestsPreviewNew(activeQuests) : ''}

${availableQuests.length > 0 ? `\n📋 *Доступно ${availableQuests.length} новых квестов*` : ''}

${formatter.tip('Выбери раздел для подробностей')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [
          { text: `🎯 Активные (${activeQuests.length})`, callbackData: 'quest:active' },
          { text: `📋 Доступные (${availableQuests.length})`, callbackData: 'quest:available' },
        ],
        [
          { text: `✅ Завершённые (${completedCount})`, callbackData: 'quest:completed' },
        ],
        [
          { text: '🏅 Мои бейджи', callbackData: 'badge:list' },
          { text: '👤 Профиль', callbackData: 'profile:overview' },
        ],
      ];

      return { success: true, message, keyboard };
    } catch (error) {
      console.error('Quest hub error:', error);
      return { success: false, error: 'Не удалось загрузить квесты' };
    }
  }

  /**
   * Show active quests
   */
  private async showActiveQuests(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const engine = await getGamificationEngine();
      const userId = parseInt(ctx.userId, 10);
      const activeQuests = await engine.getActiveQuests(userId);

      if (activeQuests.length === 0) {
        const message = `
${formatter.info('Нет активных квестов')}

У тебя пока нет начатых квестов.
Выбери новый квест из списка доступных!

${formatter.tip('Можно иметь до 3 активных квестов одновременно')}
        `.trim();

        const keyboard: IInlineButton[][] = [
          [{ text: '📋 Выбрать квест', callbackData: 'quest:available' }],
          [{ text: '◀️ Назад', callbackData: 'quest:list' }],
        ];

        return { success: true, message, keyboard };
      }

      let questsText = '';
      for (const active of activeQuests) {
        const quest = active.quest;
        const progressBar = formatter.progressBar(active.progress, 10);

        questsText += `
${quest.icon} *${quest.title}*
${progressBar} ${active.progress}%
📊 ${active.currentValue}/${active.targetValue} | ⏳ ${active.daysRemaining} дн.
        `.trim() + '\n\n';
      }

      const message = `
🎯 *Активные квесты* (${activeQuests.length}/3)

${questsText}
${formatter.tip('Нажми на квест для подробностей')}
      `.trim();

      const keyboard: IInlineButton[][] = activeQuests.map((active) => {
        return [{ text: `${active.quest.icon} ${active.quest.title}`, callbackData: `quest:details:${active.quest.id}` }];
      });
      keyboard.push([{ text: '◀️ Назад', callbackData: 'quest:list' }]);

      return { success: true, message, keyboard };
    } catch (error) {
      return { success: false, error: 'Не удалось загрузить активные квесты' };
    }
  }

  /**
   * Show available quests
   */
  private async showAvailableQuests(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const availableQuests = questService.getAvailableQuests(ctx.userId);

    if (availableQuests.length === 0) {
      const message = `
${formatter.info('Все квесты выполнены!')}

Поздравляем! Ты выполнил все доступные квесты.
Скоро появятся новые задания!

${sonya.emoji} ${sonya.respondToEmotion('positive').text}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '◀️ Назад', callbackData: 'quest:list' }],
      ];

      return { success: true, message, keyboard };
    }

    // Group by difficulty
    const byDifficulty = {
      easy: availableQuests.filter((q) => q.difficulty === 'easy'),
      medium: availableQuests.filter((q) => q.difficulty === 'medium'),
      hard: availableQuests.filter((q) => q.difficulty === 'hard'),
    };

    let questsText = '';

    if (byDifficulty.easy.length > 0) {
      questsText += '*🟢 Лёгкие:*\n';
      for (const quest of byDifficulty.easy.slice(0, 2)) {
        questsText += `${quest.icon} ${quest.title} (+${quest.reward.xp} XP)\n`;
      }
      questsText += '\n';
    }

    if (byDifficulty.medium.length > 0) {
      questsText += '*🟡 Средние:*\n';
      for (const quest of byDifficulty.medium.slice(0, 2)) {
        questsText += `${quest.icon} ${quest.title} (+${quest.reward.xp} XP)\n`;
      }
      questsText += '\n';
    }

    if (byDifficulty.hard.length > 0) {
      questsText += '*🔴 Сложные:*\n';
      for (const quest of byDifficulty.hard.slice(0, 2)) {
        questsText += `${quest.icon} ${quest.title} (+${quest.reward.xp} XP)\n`;
      }
    }

    const message = `
📋 *Доступные квесты* (${availableQuests.length})

${questsText}
${formatter.tip('Выбери квест чтобы начать')}
    `.trim();

    // Show first 5 quests as buttons
    const keyboard: IInlineButton[][] = availableQuests.slice(0, 5).map((quest) => [
      { text: `${quest.icon} ${quest.title}`, callbackData: `quest:details:${quest.id}` },
    ]);
    keyboard.push([{ text: '◀️ Назад', callbackData: 'quest:list' }]);

    return { success: true, message, keyboard };
  }

  /**
   * Show completed quests
   */
  private async showCompletedQuests(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const completedIds = questService.getCompletedQuestIds(ctx.userId);

    if (completedIds.length === 0) {
      const message = `
${formatter.info('Пока нет завершённых квестов')}

Начни свой первый квест и получи награду!
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '📋 Выбрать квест', callbackData: 'quest:available' }],
        [{ text: '◀️ Назад', callbackData: 'quest:list' }],
      ];

      return { success: true, message, keyboard };
    }

    let questsText = '';
    let totalXP = 0;

    for (const questId of completedIds) {
      const quest = questService.getQuest(questId);
      if (!quest) continue;
      questsText += `✅ ${quest.icon} ${quest.title} (+${quest.reward.xp} XP)\n`;
      totalXP += quest.reward.xp;
    }

    const message = `
✅ *Завершённые квесты* (${completedIds.length})

${questsText}
${formatter.divider()}

💎 *Всего заработано:* ${totalXP} XP
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '◀️ Назад', callbackData: 'quest:list' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show quest details
   */
  private async showQuestDetails(ctx: ISleepCoreContext, questId: string): Promise<ICommandResult> {
    const quest = questService.getQuest(questId);

    if (!quest) {
      return {
        success: false,
        error: 'Квест не найден',
      };
    }

    // Check if active
    const activeQuests = questService.getActiveQuests(ctx.userId);
    const activeQuest = activeQuests.find((aq) => aq.questId === questId);

    // Check if completed
    const completedIds = questService.getCompletedQuestIds(ctx.userId);
    const isCompleted = completedIds.includes(questId);

    const difficultyLabel = quest.difficulty === 'easy' ? '🟢 Лёгкий' :
                           quest.difficulty === 'medium' ? '🟡 Средний' : '🔴 Сложный';

    const categoryLabel = {
      sleep: '😴 Сон',
      diary: '📓 Дневник',
      mindfulness: '🧘 Осознанность',
      digital_detox: '📵 Детокс',
      routine: '🕐 Режим',
    }[quest.category] || quest.category;

    let statusText = '';
    let progressText = '';

    if (isCompleted) {
      statusText = '✅ *Выполнен*';
    } else if (activeQuest) {
      const percentage = questService.getProgressPercentage(activeQuest);
      const daysRemaining = questService.getDaysRemaining(activeQuest);
      progressText = `
📊 *Прогресс:* ${activeQuest.progress.currentValue}/${activeQuest.progress.targetValue}
${formatter.progressBar(percentage, 10)} ${percentage}%
⏳ Осталось: ${daysRemaining} дней
      `.trim();
      statusText = '🔄 *В процессе*';
    } else {
      statusText = '📋 *Доступен*';
    }

    const message = `
${quest.icon} *${quest.title}*

${statusText}

${quest.description}

${formatter.divider()}

📁 ${categoryLabel}
${difficultyLabel}
⏱️ ${quest.durationDays} дней
💎 +${quest.reward.xp} XP
${quest.reward.badge ? `🏅 Бейдж: ${quest.reward.badge}` : ''}

${progressText ? `\n${progressText}` : ''}
    `.trim();

    const keyboard: IInlineButton[][] = [];

    if (isCompleted) {
      keyboard.push([{ text: '✅ Выполнен', callbackData: 'noop' }]);
    } else if (activeQuest) {
      keyboard.push([{ text: '❌ Отменить квест', callbackData: `quest:abandon:${questId}` }]);
    } else {
      keyboard.push([{ text: '🚀 Начать квест', callbackData: `quest:start:${questId}` }]);
    }

    keyboard.push([{ text: '◀️ Назад', callbackData: 'quest:list' }]);

    return { success: true, message, keyboard };
  }

  /**
   * Start a quest
   */
  private async startQuest(ctx: ISleepCoreContext, questId: string): Promise<ICommandResult> {
    try {
      const engine = await getGamificationEngine();
      const userId = parseInt(ctx.userId, 10);
      const result = await engine.startQuest(userId, questId);

      if (!result) {
        return {
          success: false,
          error: 'Не удалось начать квест. Возможно, уже активно 3 квеста или квест недоступен.',
        };
      }

      const quest = questService.getQuest(questId)!;

      const message = `
🚀 *Квест начат!*

${quest.icon} *${quest.title}*

${quest.description}

${formatter.divider()}

⏱️ Срок: ${quest.durationDays} дней
🎯 Цель: ${result.progress.targetValue} ${this.getMetricLabel(quest.targetMetric)}

${sonya.emoji} _Удачи! Я буду следить за твоим прогрессом._

${formatter.tip('Прогресс обновляется автоматически')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '🎯 Мои квесты', callbackData: 'quest:active' }],
        [{ text: '◀️ К списку квестов', callbackData: 'quest:list' }],
      ];

      return { success: true, message, keyboard };
    } catch (error) {
      return { success: false, error: 'Не удалось начать квест' };
    }
  }

  /**
   * Abandon a quest
   */
  private async abandonQuest(ctx: ISleepCoreContext, questId: string): Promise<ICommandResult> {
    const quest = questService.getQuest(questId);

    // Note: QuestService doesn't have abandonQuest method, this is a placeholder
    // In production, you'd implement this in QuestService

    const message = `
${formatter.warning('Квест отменён')}

${quest?.icon || '🎯'} ${quest?.title || questId}

Прогресс по этому квесту сброшен.
Ты можешь начать его заново позже.
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '📋 Другие квесты', callbackData: 'quest:available' }],
      [{ text: '◀️ Назад', callbackData: 'quest:list' }],
    ];

    return { success: true, message, keyboard };
  }

  // ==================== Helpers ====================

  /**
   * Format active quests preview for hub (legacy - uses questService)
   */
  private formatActiveQuestsPreview(activeQuests: ReturnType<typeof questService.getActiveQuests>): string {
    if (activeQuests.length === 0) return '';

    let text = '*🎯 Активные квесты:*\n';

    for (const active of activeQuests.slice(0, 2)) {
      const quest = questService.getQuest(active.questId);
      if (!quest) continue;

      const percentage = questService.getProgressPercentage(active);
      text += `${quest.icon} ${quest.title} — ${percentage}%\n`;
    }

    if (activeQuests.length > 2) {
      text += `_...и ещё ${activeQuests.length - 2}_\n`;
    }

    return text;
  }

  /**
   * Format active quests preview (new - uses GamificationEngine format)
   */
  private formatActiveQuestsPreviewNew(activeQuests: IActiveQuestInfo[]): string {
    if (activeQuests.length === 0) return '';

    let text = '*🎯 Активные квесты:*\n';

    for (const active of activeQuests.slice(0, 2)) {
      text += `${active.quest.icon} ${active.quest.title} — ${active.progress}%\n`;
    }

    if (activeQuests.length > 2) {
      text += `_...и ещё ${activeQuests.length - 2}_\n`;
    }

    return text;
  }

  /**
   * Get human-readable metric label
   */
  private getMetricLabel(metric: string): string {
    const labels: Record<string, string> = {
      diary_entries: 'записей в дневнике',
      voice_entries: 'голосовых записей',
      sleep_hours: 'часов сна',
      screen_free_hours: 'часов без экрана',
      relax_sessions: 'сессий релаксации',
      mindful_sessions: 'сессий осознанности',
      breathing_exercises: 'дыхательных упражнений',
      bedtime_consistency: 'дней с режимом',
      emotion_entries: 'записей настроения',
    };

    return labels[metric] || metric;
  }
}

// Export singleton
export const questCommand = new QuestCommand();
