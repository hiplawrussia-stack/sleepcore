/**
 * /badges Command - Achievement Badge System
 * ==========================================
 * View and manage user badges and achievements.
 *
 * Research basis:
 * - 83% employees feel more motivated with gamified elements
 * - Dopamine Response: Small, frequent boosts create return motivation
 * - Collector Instinct: Natural completion desire ("catch 'em all")
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands
 */

import type {
  ICommand,
  IConversationCommand,
  ISleepCoreContext,
  ICommandResult,
  IInlineButton,
} from './interfaces/ICommand';
import { formatter } from './utils/MessageFormatter';
import { sonya } from '../persona';
import { badgeService, type BadgeCategory, type BadgeRarity } from '../../modules/quests';

/**
 * /badges Command Implementation
 */
export class BadgeCommand implements IConversationCommand {
  readonly name = 'badges';
  readonly description = 'Твои бейджи и достижения';
  readonly aliases = ['badge', 'achievements', 'бейджи', 'достижения'];
  readonly requiresSession = false;
  readonly steps = ['list', 'category', 'details'];

  /**
   * Execute the command - show badge collection
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    if (args) {
      // Handle subcommands
      const [subcommand] = args.split(' ');
      switch (subcommand) {
        case 'all':
          return this.showAllBadges(ctx);
        case 'progress':
          return this.showProgress(ctx);
        default:
          // Try to interpret as category
          return this.showCategory(ctx, subcommand as BadgeCategory);
      }
    }

    return this.showBadgeCollection(ctx);
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
        return this.showBadgeCollection(ctx);
      case 'category':
        return this.showCategory(ctx, data.category as BadgeCategory);
      case 'details':
        return this.showBadgeDetails(ctx, data.badgeId as string);
      default:
        return this.showBadgeCollection(ctx);
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
    const [, action, param] = callbackData.split(':');

    switch (action) {
      case 'list':
        return this.showBadgeCollection(ctx);
      case 'all':
        return this.showAllBadges(ctx);
      case 'progress':
        return this.showProgress(ctx);
      case 'category':
        return this.showCategory(ctx, param as BadgeCategory);
      case 'details':
        return this.showBadgeDetails(ctx, param);
      case 'new':
        return this.showNewBadges(ctx);
      default:
        return this.showBadgeCollection(ctx);
    }
  }

  // ==================== Response Handlers ====================

  /**
   * Show badge collection (main view)
   */
  private async showBadgeCollection(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const userBadges = badgeService.getUserBadges(ctx.userId);
    const totalVisible = badgeService.getAllVisibleBadges().length;
    const totalXP = badgeService.getTotalBadgeXP(ctx.userId);
    const newBadges = badgeService.getNewBadges(ctx.userId);

    // Group user badges by category
    const badgesByCategory = new Map<BadgeCategory, number>();
    for (const ub of userBadges) {
      const badge = badgeService.getBadge(ub.badgeId);
      if (badge) {
        const count = badgesByCategory.get(badge.category) || 0;
        badgesByCategory.set(badge.category, count + 1);
      }
    }

    // Category stats
    const categoryStats: string[] = [];
    const categories: { id: BadgeCategory; name: string; icon: string }[] = [
      { id: 'achievement', name: 'Достижения', icon: '🎯' },
      { id: 'streak', name: 'Серии', icon: '🔥' },
      { id: 'milestone', name: 'Вехи', icon: '📍' },
      { id: 'evolution', name: 'Эволюция', icon: '🌱' },
      { id: 'special', name: 'Особые', icon: '✨' },
    ];

    for (const cat of categories) {
      const userCount = badgesByCategory.get(cat.id) || 0;
      const totalInCategory = badgeService.getBadgesByCategory(cat.id).filter((b) => !b.hidden).length;
      if (totalInCategory > 0) {
        categoryStats.push(`${cat.icon} ${cat.name}: ${userCount}/${totalInCategory}`);
      }
    }

    // Rarity distribution
    const rarityCount = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const ub of userBadges) {
      const badge = badgeService.getBadge(ub.badgeId);
      if (badge) {
        rarityCount[badge.rarity]++;
      }
    }

    const message = `
🏅 *Твои бейджи*

${userBadges.length === 0 ? `${formatter.info('Пока нет бейджей')}\n\nВыполняй квесты и задания чтобы получить первый бейдж!` : `
📊 *Собрано:* ${userBadges.length}/${totalVisible}
💎 *Всего XP:* ${totalXP}
${newBadges.length > 0 ? `🆕 *Новых:* ${newBadges.length}` : ''}

${formatter.divider()}

*По категориям:*
${categoryStats.join('\n')}

${formatter.divider()}

*По редкости:*
⬜ Обычные: ${rarityCount.common}
🟦 Редкие: ${rarityCount.rare}
🟪 Эпические: ${rarityCount.epic}
🟨 Легендарные: ${rarityCount.legendary}
`}

${formatter.tip('Выбери категорию для подробностей')}
    `.trim();

    const keyboard: IInlineButton[][] = [];

    // New badges button if any
    if (newBadges.length > 0) {
      keyboard.push([{ text: `🆕 Новые бейджи (${newBadges.length})`, callbackData: 'badge:new' }]);
    }

    // Category buttons
    keyboard.push([
      { text: '🎯 Достижения', callbackData: 'badge:category:achievement' },
      { text: '🔥 Серии', callbackData: 'badge:category:streak' },
    ]);
    keyboard.push([
      { text: '📍 Вехи', callbackData: 'badge:category:milestone' },
      { text: '✨ Особые', callbackData: 'badge:category:special' },
    ]);

    keyboard.push([
      { text: '📊 Прогресс', callbackData: 'badge:progress' },
      { text: '📋 Все бейджи', callbackData: 'badge:all' },
    ]);

    keyboard.push([{ text: '🎯 К квестам', callbackData: 'quest:list' }]);

    return { success: true, message, keyboard };
  }

  /**
   * Show new badges
   */
  private async showNewBadges(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const newBadges = badgeService.getNewBadges(ctx.userId);

    if (newBadges.length === 0) {
      return this.showBadgeCollection(ctx);
    }

    let badgesText = '';

    for (const ub of newBadges) {
      const badge = badgeService.getBadge(ub.badgeId);
      if (!badge) continue;

      const rarityLabel = this.getRarityLabel(badge.rarity);

      badgesText += `
${badge.icon} *${badge.name}* 🆕
${badge.description}
${rarityLabel} • +${badge.reward?.xp || 0} XP
      `.trim() + '\n\n';

      // Mark as seen
      badgeService.markBadgeSeen(ctx.userId, ub.badgeId);
    }

    const message = `
🎉 *Новые бейджи!*

${sonya.emoji} _Поздравляю! Ты заработал новые награды!_

${formatter.divider()}

${badgesText}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🏅 Все бейджи', callbackData: 'badge:list' }],
      [{ text: '🎯 К квестам', callbackData: 'quest:list' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show badges by category
   */
  private async showCategory(ctx: ISleepCoreContext, category: BadgeCategory): Promise<ICommandResult> {
    const allInCategory = badgeService.getBadgesByCategory(category).filter((b) => !b.hidden);
    const userBadges = badgeService.getUserBadges(ctx.userId);
    const earnedIds = new Set(userBadges.map((ub) => ub.badgeId));

    const categoryNames: Record<BadgeCategory, string> = {
      achievement: '🎯 Достижения',
      streak: '🔥 Серии',
      milestone: '📍 Вехи',
      evolution: '🌱 Эволюция',
      special: '✨ Особые',
    };

    const categoryDescriptions: Record<BadgeCategory, string> = {
      achievement: 'Награды за выполнение квестов',
      streak: 'Награды за постоянство',
      milestone: 'Отметки о прогрессе',
      evolution: 'Этапы развития Сони',
      special: 'Скрытые и особые награды',
    };

    let badgesText = '';
    const earnedCount = allInCategory.filter((b) => earnedIds.has(b.id)).length;

    for (const badge of allInCategory) {
      const earned = earnedIds.has(badge.id);
      const status = earned ? '✅' : '⬜';
      badgesText += `${status} ${badge.icon} ${badge.name}\n`;
    }

    const message = `
${categoryNames[category]}

_${categoryDescriptions[category]}_

📊 Собрано: ${earnedCount}/${allInCategory.length}

${formatter.divider()}

${badgesText}

${formatter.tip('Нажми на бейдж для подробностей')}
    `.trim();

    // Create buttons for each badge
    const keyboard: IInlineButton[][] = allInCategory.slice(0, 6).map((badge) => {
      const earned = earnedIds.has(badge.id);
      return [{ text: `${earned ? '✅' : '⬜'} ${badge.icon} ${badge.name}`, callbackData: `badge:details:${badge.id}` }];
    });

    keyboard.push([{ text: '◀️ Назад', callbackData: 'badge:list' }]);

    return { success: true, message, keyboard };
  }

  /**
   * Show all badges
   */
  private async showAllBadges(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const allBadges = badgeService.getAllVisibleBadges();
    const userBadges = badgeService.getUserBadges(ctx.userId);
    const earnedIds = new Set(userBadges.map((ub) => ub.badgeId));

    // Group by rarity
    const byRarity: Record<BadgeRarity, typeof allBadges> = {
      common: [],
      rare: [],
      epic: [],
      legendary: [],
    };

    for (const badge of allBadges) {
      byRarity[badge.rarity].push(badge);
    }

    let badgesText = '';

    if (byRarity.legendary.length > 0) {
      badgesText += '*🟨 Легендарные:*\n';
      for (const badge of byRarity.legendary) {
        const status = earnedIds.has(badge.id) ? '✅' : '⬜';
        badgesText += `${status} ${badge.icon} ${badge.name}\n`;
      }
      badgesText += '\n';
    }

    if (byRarity.epic.length > 0) {
      badgesText += '*🟪 Эпические:*\n';
      for (const badge of byRarity.epic) {
        const status = earnedIds.has(badge.id) ? '✅' : '⬜';
        badgesText += `${status} ${badge.icon} ${badge.name}\n`;
      }
      badgesText += '\n';
    }

    if (byRarity.rare.length > 0) {
      badgesText += '*🟦 Редкие:*\n';
      for (const badge of byRarity.rare.slice(0, 5)) {
        const status = earnedIds.has(badge.id) ? '✅' : '⬜';
        badgesText += `${status} ${badge.icon} ${badge.name}\n`;
      }
      if (byRarity.rare.length > 5) {
        badgesText += `_...и ещё ${byRarity.rare.length - 5}_\n`;
      }
      badgesText += '\n';
    }

    if (byRarity.common.length > 0) {
      badgesText += '*⬜ Обычные:*\n';
      for (const badge of byRarity.common.slice(0, 5)) {
        const status = earnedIds.has(badge.id) ? '✅' : '⬜';
        badgesText += `${status} ${badge.icon} ${badge.name}\n`;
      }
      if (byRarity.common.length > 5) {
        badgesText += `_...и ещё ${byRarity.common.length - 5}_\n`;
      }
    }

    const message = `
📋 *Все бейджи* (${userBadges.length}/${allBadges.length})

${badgesText}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '◀️ Назад', callbackData: 'badge:list' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show badge progress
   */
  private async showProgress(ctx: ISleepCoreContext): Promise<ICommandResult> {
    const progress = badgeService.getUserProgress(ctx.userId);

    // Find badges close to completion (50-99%)
    const closeToComplete = progress.filter((p) => p.percentage >= 50 && p.percentage < 100);

    if (closeToComplete.length === 0) {
      const message = `
📊 *Прогресс к бейджам*

${formatter.info('Пока нет бейджей близких к получению')}

Продолжай выполнять задания, чтобы приблизиться к наградам!
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '🎯 К квестам', callbackData: 'quest:list' }],
        [{ text: '◀️ Назад', callbackData: 'badge:list' }],
      ];

      return { success: true, message, keyboard };
    }

    let progressText = '';

    for (const item of closeToComplete.slice(0, 5)) {
      const progressBar = formatter.progressBar(item.percentage, 8);
      progressText += `
${item.badge.icon} *${item.badge.name}*
${progressBar} ${item.progress}/${item.target} (${item.percentage}%)
      `.trim() + '\n\n';
    }

    const message = `
📊 *Скоро получишь*

${progressText}

${formatter.tip('Продолжай — ты близко к цели!')}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '🎯 К квестам', callbackData: 'quest:list' }],
      [{ text: '◀️ Назад', callbackData: 'badge:list' }],
    ];

    return { success: true, message, keyboard };
  }

  /**
   * Show badge details
   */
  private async showBadgeDetails(ctx: ISleepCoreContext, badgeId: string): Promise<ICommandResult> {
    const badge = badgeService.getBadge(badgeId);

    if (!badge) {
      return {
        success: false,
        error: 'Бейдж не найден',
      };
    }

    const hasBadge = badgeService.hasBadge(ctx.userId, badgeId);
    const rarityLabel = this.getRarityLabel(badge.rarity);
    const categoryLabel = this.getCategoryLabel(badge.category);

    // Get progress if not earned
    let progressText = '';
    if (!hasBadge) {
      const allProgress = badgeService.getUserProgress(ctx.userId);
      const thisProgress = allProgress.find((p) => p.badge.id === badgeId);
      if (thisProgress && thisProgress.target > 1) {
        const progressBar = formatter.progressBar(thisProgress.percentage, 10);
        progressText = `
${formatter.divider()}

*Прогресс:*
${progressBar} ${thisProgress.progress}/${thisProgress.target} (${thisProgress.percentage}%)
        `.trim();
      }
    }

    const message = `
${badge.icon} *${badge.name}* ${hasBadge ? '✅' : ''}

${badge.description}

${formatter.divider()}

📁 ${categoryLabel}
${rarityLabel}
💎 +${badge.reward?.xp || 0} XP
${badge.reward?.title ? `🏆 Титул: "${badge.reward.title}"` : ''}

${hasBadge ? `\n${sonya.emoji} _Этот бейдж у тебя есть!_` : progressText}
    `.trim();

    const keyboard: IInlineButton[][] = [
      [{ text: '◀️ Назад', callbackData: `badge:category:${badge.category}` }],
      [{ text: '🏅 Все бейджи', callbackData: 'badge:list' }],
    ];

    return { success: true, message, keyboard };
  }

  // ==================== Helpers ====================

  /**
   * Get rarity label with emoji
   */
  private getRarityLabel(rarity: BadgeRarity): string {
    const labels: Record<BadgeRarity, string> = {
      common: '⬜ Обычный',
      rare: '🟦 Редкий',
      epic: '🟪 Эпический',
      legendary: '🟨 Легендарный',
    };
    return labels[rarity];
  }

  /**
   * Get category label
   */
  private getCategoryLabel(category: BadgeCategory): string {
    const labels: Record<BadgeCategory, string> = {
      achievement: '🎯 Достижение',
      streak: '🔥 Серия',
      milestone: '📍 Веха',
      evolution: '🌱 Эволюция',
      special: '✨ Особый',
    };
    return labels[category];
  }
}

// Export singleton
export const badgeCommand = new BadgeCommand();
