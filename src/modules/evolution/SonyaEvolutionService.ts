/**
 * SonyaEvolutionService - Avatar Evolution System
 * ================================================
 *
 * Implements gamification through Sonya (сова) avatar evolution.
 * Users see Sonya grow from owlet to wise owl as they progress.
 *
 * Research basis:
 * - eQuoo: Avatar customization + levels = +21% retention, 90% adherence
 * - SPARX: Avatar-based CBT effective for depression
 * - Duolingo: 7-day streak = 3.6x engagement
 * - UCL Study: 66 days = habit automation threshold
 *
 * Evolution stages:
 * - 🐣 Совёнок (Owlet): 0-6 days
 * - 🦉 Молодая сова (Young Owl): 7-29 days
 * - 🦉✨ Мудрая сова (Wise Owl): 30-65 days
 * - 🏆🦉 Мастер сна (Sleep Master): 66+ days
 *
 * WARNING (from research):
 * - Avoid over-personification (companion attachment risks)
 * - Emphasize Sonya as therapeutic tool, not friend replacement
 * - Include reminders that this is AI assistance
 *
 * @packageDocumentation
 * @module @sleepcore/modules/evolution
 */

/**
 * Evolution stage identifier
 */
export type SonyaStageId = 'owlet' | 'young_owl' | 'wise_owl' | 'master';

/**
 * Evolution stage definition
 */
export interface ISonyaStage {
  id: SonyaStageId;
  name: string;
  emoji: string;
  requiredDays: number;
  greeting: string;
  description: string;
  unlockMessage: string;
  abilities: string[];
}

/**
 * User evolution data
 */
export interface IUserEvolutionData {
  userId: string;
  currentStage: SonyaStageId;
  daysActive: number;
  stagesUnlocked: SonyaStageId[];
  lastEvolutionCheck: Date;
  celebrationShown: boolean;
}

/**
 * Evolution check result
 */
export interface IEvolutionResult {
  evolved: boolean;
  previousStage: ISonyaStage | null;
  currentStage: ISonyaStage;
  nextStage: ISonyaStage | null;
  daysToNextStage: number;
  progressPercent: number;
  celebrationMessage: string | null;
}

/**
 * Evolution stage definitions
 * Based on habit formation research (Phillippa Lally 2009, Duolingo 2025)
 */
const EVOLUTION_STAGES: ISonyaStage[] = [
  {
    id: 'owlet',
    name: 'Совёнок Соня',
    emoji: '🐣',
    requiredDays: 0,
    greeting: 'Привет! Я Совёнок Соня. Давай вместе улучшим твой сон!',
    description: 'Маленький совёнок, который только учится помогать со сном.',
    unlockMessage: 'Добро пожаловать! Я — Совёнок Соня, твой помощник в мире сна.',
    abilities: ['Базовый дневник сна', 'Простые советы', 'SOS-помощь'],
  },
  {
    id: 'young_owl',
    name: 'Молодая сова Соня',
    emoji: '🦉',
    requiredDays: 7,
    greeting: 'Привет! Целая неделя вместе — это здорово! Как спалось?',
    description: 'Подросшая сова с большим опытом в помощи со сном.',
    unlockMessage: '🎉 Поздравляю! После 7 дней я превратилась в Молодую сову!\n\n' +
      'Теперь я могу помогать тебе ещё лучше. Исследования показывают, ' +
      'что 7 дней регулярности — первый серьёзный шаг к формированию привычки!',
    abilities: [
      'Расширенный анализ сна',
      'Персонализированные рекомендации',
      'Техники релаксации',
      'Мысленная репетиция',
    ],
  },
  {
    id: 'wise_owl',
    name: 'Мудрая сова Соня',
    emoji: '🦉✨',
    requiredDays: 30,
    greeting: 'Привет, друг! Месяц упорной работы — ты настоящий молодец!',
    description: 'Мудрая сова с глубоким пониманием твоих паттернов сна.',
    unlockMessage: '🌟 Невероятно! 30 дней вместе!\n\n' +
      'Я стала Мудрой совой. Теперь я хорошо понимаю твои паттерны сна ' +
      'и могу давать более точные рекомендации. Привычка почти сформирована!',
    abilities: [
      'Глубокий анализ паттернов',
      'Предиктивные рекомендации',
      'Когнитивная реструктуризация',
      'Персонализированные сценарии',
    ],
  },
  {
    id: 'master',
    name: 'Мастер сна Соня',
    emoji: '🏆🦉',
    requiredDays: 66,
    greeting: 'Привет, Мастер сна! Ты достиг вершины. Как я могу помочь сегодня?',
    description: 'Легендарная сова-мастер для пользователей с автоматизированной привычкой.',
    unlockMessage: '🏆 ПОЗДРАВЛЯЮ! 66 дней — привычка сформирована!\n\n' +
      'По исследованию UCL (Phillippa Lally, 2009), 66 дней — это медианный срок ' +
      'формирования автоматической привычки. Теперь здоровый сон — часть твоей жизни!\n\n' +
      'Я стала Мастером сна. Это высшая стадия эволюции!',
    abilities: [
      'Все предыдущие способности',
      'Экспертный анализ',
      'Долгосрочные тренды',
      'Менторство для новичков',
    ],
  },
];

/**
 * SonyaEvolutionService - Manages Sonya avatar evolution
 */
export class SonyaEvolutionService {
  private stages: ISonyaStage[];
  private userData: Map<string, IUserEvolutionData>;

  constructor(customStages?: ISonyaStage[]) {
    this.stages = customStages || [...EVOLUTION_STAGES];
    this.userData = new Map();
  }

  /**
   * Get all evolution stages
   */
  getStages(): ISonyaStage[] {
    return [...this.stages];
  }

  /**
   * Get stage by ID
   */
  getStage(stageId: SonyaStageId): ISonyaStage | null {
    return this.stages.find((s) => s.id === stageId) || null;
  }

  /**
   * Get user's current evolution data
   */
  getUserData(userId: string): IUserEvolutionData {
    let data = this.userData.get(userId);

    if (!data) {
      data = {
        userId,
        currentStage: 'owlet',
        daysActive: 0,
        stagesUnlocked: ['owlet'],
        lastEvolutionCheck: new Date(),
        celebrationShown: false,
      };
      this.userData.set(userId, data);
    }

    return data;
  }

  /**
   * Update user's active days and check for evolution
   */
  async checkEvolution(userId: string, daysActive: number): Promise<IEvolutionResult> {
    const userData = this.getUserData(userId);
    const previousStageId = userData.currentStage;
    const previousStage = this.getStage(previousStageId);

    // Update days active
    userData.daysActive = daysActive;
    userData.lastEvolutionCheck = new Date();

    // Determine current stage based on days
    const currentStage = this.getStageForDays(daysActive);
    const evolved = currentStage.id !== previousStageId;

    // Update user data if evolved
    if (evolved) {
      userData.currentStage = currentStage.id;
      userData.celebrationShown = false;

      // Add to unlocked stages
      if (!userData.stagesUnlocked.includes(currentStage.id)) {
        userData.stagesUnlocked.push(currentStage.id);
      }
    }

    this.userData.set(userId, userData);

    // Calculate progress to next stage
    const nextStage = this.getNextStage(currentStage.id);
    const { daysToNext, progressPercent } = this.calculateProgress(
      daysActive,
      currentStage,
      nextStage
    );

    // Generate celebration message if evolved and not shown
    let celebrationMessage: string | null = null;
    if (evolved && !userData.celebrationShown) {
      celebrationMessage = this.generateCelebrationMessage(currentStage);
      userData.celebrationShown = true;
      this.userData.set(userId, userData);
    }

    return {
      evolved,
      previousStage,
      currentStage,
      nextStage,
      daysToNextStage: daysToNext,
      progressPercent,
      celebrationMessage,
    };
  }

  /**
   * Get stage for given number of active days
   */
  private getStageForDays(daysActive: number): ISonyaStage {
    // Find the highest stage the user qualifies for
    let currentStage = this.stages[0];

    for (const stage of this.stages) {
      if (daysActive >= stage.requiredDays) {
        currentStage = stage;
      } else {
        break;
      }
    }

    return currentStage;
  }

  /**
   * Get next evolution stage
   */
  private getNextStage(currentStageId: SonyaStageId): ISonyaStage | null {
    const currentIndex = this.stages.findIndex((s) => s.id === currentStageId);
    if (currentIndex < 0 || currentIndex >= this.stages.length - 1) {
      return null;
    }
    return this.stages[currentIndex + 1];
  }

  /**
   * Calculate progress to next stage
   */
  private calculateProgress(
    daysActive: number,
    currentStage: ISonyaStage,
    nextStage: ISonyaStage | null
  ): { daysToNext: number; progressPercent: number } {
    if (!nextStage) {
      // Already at max stage
      return { daysToNext: 0, progressPercent: 100 };
    }

    const daysToNext = nextStage.requiredDays - daysActive;
    const stageRange = nextStage.requiredDays - currentStage.requiredDays;
    const daysInStage = daysActive - currentStage.requiredDays;
    const progressPercent = Math.min(100, Math.round((daysInStage / stageRange) * 100));

    return { daysToNext, progressPercent };
  }

  /**
   * Generate celebration message for stage unlock
   */
  private generateCelebrationMessage(stage: ISonyaStage): string {
    const header = `${stage.emoji} *${stage.name}*\n\n`;
    const body = stage.unlockMessage;
    const abilities = stage.abilities.length > 0
      ? `\n\n*Новые возможности:*\n${stage.abilities.map((a) => `• ${a}`).join('\n')}`
      : '';

    return header + body + abilities;
  }

  /**
   * Get Sonya's greeting based on current stage
   */
  getSonyaGreeting(userId: string): string {
    const userData = this.getUserData(userId);
    const stage = this.getStage(userData.currentStage);
    return stage ? `${stage.emoji} ${stage.greeting}` : '🦉 Привет!';
  }

  /**
   * Get Sonya's current emoji
   */
  getSonyaEmoji(userId: string): string {
    const userData = this.getUserData(userId);
    const stage = this.getStage(userData.currentStage);
    return stage?.emoji || '🦉';
  }

  /**
   * Get Sonya's current name
   */
  getSonyaName(userId: string): string {
    const userData = this.getUserData(userId);
    const stage = this.getStage(userData.currentStage);
    return stage?.name || 'Соня';
  }

  /**
   * Get evolution status summary
   */
  getEvolutionStatus(userId: string): string {
    const userData = this.getUserData(userId);
    const currentStage = this.getStage(userData.currentStage);
    const nextStage = this.getNextStage(userData.currentStage);

    if (!currentStage) return 'Статус неизвестен';

    let status = `${currentStage.emoji} *${currentStage.name}*\n`;
    status += `Активных дней: ${userData.daysActive}\n`;

    if (nextStage) {
      const daysToNext = nextStage.requiredDays - userData.daysActive;
      status += `\nДо следующей стадии (${nextStage.name}): ${daysToNext} ${this.pluralizeDays(daysToNext)}`;
    } else {
      status += '\n🏆 Максимальный уровень достигнут!';
    }

    return status;
  }

  /**
   * Get progress bar for evolution
   */
  getProgressBar(userId: string, length: number = 10): string {
    const userData = this.getUserData(userId);
    const currentStage = this.getStage(userData.currentStage);
    const nextStage = this.getNextStage(userData.currentStage);

    if (!currentStage || !nextStage) {
      // Max level reached
      return '█'.repeat(length);
    }

    const { progressPercent } = this.calculateProgress(
      userData.daysActive,
      currentStage,
      nextStage
    );

    const filled = Math.round((progressPercent / 100) * length);
    const empty = length - filled;

    return '█'.repeat(filled) + '░'.repeat(empty);
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

  /**
   * Record user interaction for engagement tracking
   * @param userId - User ID
   * @param interactionType - Type of interaction (command, callback, voice, etc.)
   */
  recordInteraction(userId: string, interactionType: string): void {
    const userData = this.getUserData(userId);
    // Update last interaction timestamp
    userData.lastEvolutionCheck = new Date();
    this.userData.set(userId, userData);
    console.log(`[Evolution] Recorded ${interactionType} interaction for user ${userId}`);
  }

  /**
   * Add XP to user's evolution progress
   * Note: This is a placeholder for future XP-based evolution system
   * @param userId - User ID
   * @param xp - Amount of XP to add
   */
  addXP(userId: string, xp: number): void {
    // For now, just log the XP gain - future versions will track XP
    console.log(`[Evolution] User ${userId} gained ${xp} XP`);
    // TODO: Implement XP tracking in user data
  }

  /**
   * Mark celebration as shown
   */
  markCelebrationShown(userId: string): void {
    const userData = this.getUserData(userId);
    userData.celebrationShown = true;
    this.userData.set(userId, userData);
  }

  /**
   * Clear user data (GDPR compliance)
   */
  clearUserData(userId: string): void {
    this.userData.delete(userId);
  }

  /**
   * Export user data (GDPR compliance)
   */
  exportUserData(userId: string): IUserEvolutionData | null {
    return this.userData.get(userId) || null;
  }

  /**
   * Import user data (for persistence)
   */
  importUserData(data: IUserEvolutionData): void {
    this.userData.set(data.userId, data);
  }
}

// Singleton instance
export const sonyaEvolutionService = new SonyaEvolutionService();

// Export stages for external use
export { EVOLUTION_STAGES };
