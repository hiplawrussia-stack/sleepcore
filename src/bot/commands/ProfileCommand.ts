/**
 * /profile Command - Unified Player Profile
 * ==========================================
 * Shows player's complete gamification profile using GamificationEngine.
 *
 * Research basis (Sprint 7):
 * - LinkedIn profile completion increased 60% with progress bars
 * - Unified profile view improves engagement
 * - White Hat gamification: meaning, accomplishment, empowerment
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
import { getGamificationEngine } from '../services/GamificationContext';
import type { IPlayerProfile } from '../../modules/gamification';

/**
 * /profile Command Implementation
 */
export class ProfileCommand implements IConversationCommand {
  readonly name = 'profile';
  readonly description = 'Твой профиль игрока';
  readonly aliases = ['me', 'профиль', 'stats'];
  readonly requiresSession = false;
  readonly steps = ['overview', 'xp', 'streaks', 'settings'];

  /**
   * Execute the command - show profile overview
   */
  async execute(ctx: ISleepCoreContext, args?: string): Promise<ICommandResult> {
    if (args) {
      switch (args) {
        case 'xp':
          return this.showXPDetails(ctx);
        case 'streaks':
          return this.showStreaks(ctx);
        case 'settings':
          return this.showSettings(ctx);
        default:
          break;
      }
    }

    return this.showProfileOverview(ctx);
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
      case 'overview':
        return this.showProfileOverview(ctx);
      case 'xp':
        return this.showXPDetails(ctx);
      case 'streaks':
        return this.showStreaks(ctx);
      case 'settings':
        return this.showSettings(ctx);
      default:
        return this.showProfileOverview(ctx);
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
      case 'overview':
        return this.showProfileOverview(ctx);
      case 'xp':
        return this.showXPDetails(ctx);
      case 'streaks':
        return this.showStreaks(ctx);
      case 'settings':
        return this.showSettings(ctx);
      case 'toggle_compassion':
        return this.toggleCompassionMode(ctx);
      case 'toggle_soft_reset':
        return this.toggleSoftReset(ctx);
      case 'check_in':
        return this.doDailyCheckIn(ctx);
      default:
        return this.showProfileOverview(ctx);
    }
  }

  // ==================== Profile Views ====================

  /**
   * Show main profile overview
   */
  private async showProfileOverview(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const engine = await getGamificationEngine();
      const userId = parseInt(ctx.userId, 10);

      const profile = await engine.getPlayerProfile(userId);

      // Build profile card
      const levelProgress = formatter.progressBar(profile.levelProgress, 10);
      const longestStreakDisplay = profile.longestStreak > 0
        ? `🏆 Рекорд: ${profile.longestStreak} дн`
        : '';

      // Get current streak
      const currentStreak = profile.streaks.find(s => s.type === 'daily_login');
      const streakDisplay = currentStreak && currentStreak.currentCount > 0
        ? formatter.streakBadge(currentStreak.currentCount)
        : '';

      const message = `
👤 *Профиль игрока*

${profile.sonyaEmoji} *${ctx.displayName}*
${this.getEngagementTitle(profile.engagementLevel)}

${formatter.divider()}

⭐ *Уровень ${profile.level}*
${levelProgress}
💎 ${profile.totalXp} XP (${profile.xpToNextLevel} до след. уровня)

${formatter.divider()}

*📊 Статистика:*
📅 Активных дней: ${profile.totalDaysActive}
${streakDisplay}
${longestStreakDisplay}

🎯 Квестов: ${profile.completedQuestCount} завершено
🏅 Бейджей: ${profile.badgeCount} (${profile.totalBadgeXp} XP)

${formatter.divider()}

*${profile.sonyaEmoji} ${profile.sonyaName}*
_Этап: ${profile.sonyaStage.name}_

${formatter.tip('Выбери раздел для подробностей')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [
          { text: '📊 Подробно XP', callbackData: 'profile:xp' },
          { text: '🔥 Стрики', callbackData: 'profile:streaks' },
        ],
        [
          { text: '🎯 Квесты', callbackData: 'quest:list' },
          { text: '🏅 Бейджи', callbackData: 'badge:list' },
        ],
        [
          { text: `${profile.sonyaEmoji} Соня`, callbackData: 'sonya:status' },
          { text: '⚙️ Настройки', callbackData: 'profile:settings' },
        ],
        [
          { text: '✅ Отметиться', callbackData: 'profile:check_in' },
        ],
      ];

      return { success: true, message, keyboard };
    } catch (error) {
      console.error('Profile command error:', error);
      return {
        success: false,
        error: 'Не удалось загрузить профиль. Попробуйте позже.',
      };
    }
  }

  /**
   * Show detailed XP information
   */
  private async showXPDetails(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const engine = await getGamificationEngine();
      const userId = parseInt(ctx.userId, 10);

      const xpStatus = await engine.getXPStatus(userId);
      const profile = await engine.getPlayerProfile(userId);

      // Calculate level thresholds
      const currentLevelXP = this.getLevelXP(xpStatus.level);
      const nextLevelXP = this.getLevelXP(xpStatus.level + 1);
      const xpInCurrentLevel = xpStatus.totalXp - currentLevelXP;
      const xpNeededForLevel = nextLevelXP - currentLevelXP;

      const message = `
💎 *Опыт и Уровень*

⭐ *Уровень ${xpStatus.level}*
${formatter.progressBar(xpStatus.levelProgress, 12)}

${formatter.divider()}

*📊 Детали XP:*
💎 Всего: ${xpStatus.totalXp} XP
📈 В этом уровне: ${xpInCurrentLevel}/${xpNeededForLevel} XP
🎯 До уровня ${xpStatus.level + 1}: ${xpStatus.xpToNextLevel} XP

${formatter.divider()}

*📚 Источники XP:*
🎯 Квесты: ${profile.completedQuestCount * 50}+ XP
🏅 Бейджи: ${profile.totalBadgeXp} XP
📝 Действия: остальное

${formatter.divider()}

*💡 Как заработать XP:*
• Ежедневный чек-ин: +25 XP
• Запись в дневник: +15 XP
• Релаксация: +15 XP
• Завершение квестов: +50-200 XP
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '✅ Отметиться (+25 XP)', callbackData: 'profile:check_in' }],
        [{ text: '📓 Дневник (+15 XP)', callbackData: 'diary:new' }],
        [{ text: '◀️ Назад', callbackData: 'profile:overview' }],
      ];

      return { success: true, message, keyboard };
    } catch (error) {
      return { success: false, error: 'Не удалось загрузить данные XP' };
    }
  }

  /**
   * Show streak information
   */
  private async showStreaks(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const engine = await getGamificationEngine();
      const userId = parseInt(ctx.userId, 10);

      const streaks = await engine.getStreaks(userId);
      const settings = await engine.getSettings(userId);

      let streaksText = '';

      if (streaks.length === 0) {
        streaksText = `${formatter.info('Нет активных стриков')}\n\nНачни ежедневную активность чтобы запустить стрик!`;
      } else {
        for (const streak of streaks) {
          const typeLabel = this.getStreakTypeLabel(streak.type);
          const icon = streak.isFrozen ? '❄️' : '🔥';
          const status = streak.isFrozen
            ? `(заморожен до ${this.formatDate(streak.frozenUntil!)})`
            : '';

          const progressBar = formatter.progressBar(
            Math.min(100, (streak.currentCount / 30) * 100),
            8
          );

          streaksText += `
${icon} *${typeLabel}*
${progressBar}
Текущий: ${streak.currentCount} дн ${status}
🏆 Рекорд: ${streak.longestCount} дн
${streak.multiplier > 1 ? `✨ Множитель: x${streak.multiplier}` : ''}
          `.trim() + '\n\n';
        }
      }

      const message = `
🔥 *Твои стрики*

${streaksText}

${formatter.divider()}

${settings.compassionEnabled
  ? '💚 *Режим сострадания* активен\nПропуск 1 дня не обнуляет стрик'
  : ''}

${settings.softResetEnabled
  ? '🛡️ *Мягкий сброс* активен\nСтрик сохраняет часть прогресса при пропуске'
  : ''}

${formatter.tip('Заходи каждый день чтобы поддерживать стрик!')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '✅ Отметиться сегодня', callbackData: 'profile:check_in' }],
        [{ text: '⚙️ Настройки стриков', callbackData: 'profile:settings' }],
        [{ text: '◀️ Назад', callbackData: 'profile:overview' }],
      ];

      return { success: true, message, keyboard };
    } catch (error) {
      return { success: false, error: 'Не удалось загрузить стрики' };
    }
  }

  /**
   * Show gamification settings
   */
  private async showSettings(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const engine = await getGamificationEngine();
      const userId = parseInt(ctx.userId, 10);

      const settings = await engine.getSettings(userId);

      const message = `
⚙️ *Настройки геймификации*

${formatter.divider()}

*💚 Режим сострадания*
${settings.compassionEnabled ? '✅ Включён' : '❌ Выключен'}
_Пропуск 1 дня не обнуляет стрик полностью_

*🛡️ Мягкий сброс*
${settings.softResetEnabled ? '✅ Включён' : '❌ Выключен'}
_При пропуске сохраняется часть прогресса_

${formatter.divider()}

*⏰ Лимиты времени:*
📱 Мягкий лимит: ${settings.softLimitMinutes} мин
📵 Дневной лимит: ${settings.dailyLimitMinutes} мин

${formatter.tip('Настройки влияют на сохранение прогресса')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [
          {
            text: settings.compassionEnabled ? '💚 Откл. сострадание' : '💚 Вкл. сострадание',
            callbackData: 'profile:toggle_compassion'
          },
        ],
        [
          {
            text: settings.softResetEnabled ? '🛡️ Откл. мягкий сброс' : '🛡️ Вкл. мягкий сброс',
            callbackData: 'profile:toggle_soft_reset'
          },
        ],
        [{ text: '◀️ Назад', callbackData: 'profile:overview' }],
      ];

      return { success: true, message, keyboard };
    } catch (error) {
      return { success: false, error: 'Не удалось загрузить настройки' };
    }
  }

  // ==================== Actions ====================

  /**
   * Toggle compassion mode
   */
  private async toggleCompassionMode(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const engine = await getGamificationEngine();
      const userId = parseInt(ctx.userId, 10);

      const settings = await engine.getSettings(userId);
      await engine.updateSettings(userId, {
        compassionEnabled: !settings.compassionEnabled,
      });

      const newSettings = await engine.getSettings(userId);

      return {
        success: true,
        message: `${newSettings.compassionEnabled ? '✅ Режим сострадания включён' : '❌ Режим сострадания выключен'}`,
        keyboard: [
          [{ text: '◀️ К настройкам', callbackData: 'profile:settings' }],
        ],
      };
    } catch (error) {
      return { success: false, error: 'Не удалось изменить настройку' };
    }
  }

  /**
   * Toggle soft reset
   */
  private async toggleSoftReset(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const engine = await getGamificationEngine();
      const userId = parseInt(ctx.userId, 10);

      const settings = await engine.getSettings(userId);
      await engine.updateSettings(userId, {
        softResetEnabled: !settings.softResetEnabled,
      });

      const newSettings = await engine.getSettings(userId);

      return {
        success: true,
        message: `${newSettings.softResetEnabled ? '✅ Мягкий сброс включён' : '❌ Мягкий сброс выключен'}`,
        keyboard: [
          [{ text: '◀️ К настройкам', callbackData: 'profile:settings' }],
        ],
      };
    } catch (error) {
      return { success: false, error: 'Не удалось изменить настройку' };
    }
  }

  /**
   * Do daily check-in
   */
  private async doDailyCheckIn(ctx: ISleepCoreContext): Promise<ICommandResult> {
    try {
      const engine = await getGamificationEngine();
      const userId = parseInt(ctx.userId, 10);

      const result = await engine.recordDailyCheckIn(userId);

      let celebrationText = '';
      if (result.leveledUp) {
        celebrationText = `\n\n🎉 *Новый уровень ${result.level}!*`;
      }

      if (result.awardedBadges.length > 0) {
        celebrationText += '\n\n🏅 *Новые бейджи:*\n';
        for (const badgeResult of result.awardedBadges) {
          if (badgeResult.badge) {
            celebrationText += `${badgeResult.badge.icon} ${badgeResult.badge.name}\n`;
          }
        }
      }

      const streakInfo = result.streakUpdates.find(s => s.type === 'daily_login');
      const streakText = streakInfo
        ? `🔥 Стрик: ${streakInfo.currentCount} ${streakInfo.isNewRecord ? '(новый рекорд!)' : ''}`
        : '';

      const message = `
✅ *Ежедневный чек-ин!*

💎 +${result.xpEarned} XP
📊 Всего: ${result.totalXp} XP
${streakText}
${celebrationText}

${formatter.tip('Возвращайся завтра!')}
      `.trim();

      const keyboard: IInlineButton[][] = [
        [{ text: '👤 К профилю', callbackData: 'profile:overview' }],
        [{ text: '🎯 Квесты', callbackData: 'quest:list' }],
      ];

      return { success: true, message, keyboard };
    } catch (error) {
      return { success: false, error: 'Не удалось выполнить чек-ин' };
    }
  }

  // ==================== Helpers ====================

  /**
   * Get engagement level title
   */
  private getEngagementTitle(level: string): string {
    const titles: Record<string, string> = {
      new_user: '🌱 Новичок',
      casual: '🌿 Любитель',
      regular: '🌳 Постоянный',
      engaged: '🌲 Активист',
      power_user: '🌟 Мастер',
    };
    return titles[level] || '🌱 Новичок';
  }

  /**
   * Get streak type label
   */
  private getStreakTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      daily_login: 'Ежедневный вход',
      sleep_diary: 'Дневник сна',
      exercise: 'Упражнения',
      mindfulness: 'Осознанность',
      digital_detox: 'Цифровой детокс',
    };
    return labels[type] || type;
  }

  /**
   * Calculate XP required for level
   */
  private getLevelXP(level: number): number {
    // Formula: 100 * level * 1.5
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  }
}

// Export singleton
export const profileCommand = new ProfileCommand();
