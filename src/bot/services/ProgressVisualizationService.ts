/**
 * ProgressVisualizationService - Text-Based Progress Visualization
 * ================================================================
 *
 * Creates Unicode/Emoji progress bars and visual summaries for Telegram.
 * Designed for mental health context - encouraging, not anxiety-inducing.
 *
 * Features:
 * - Progress bars (block elements, circles)
 * - Weekly calendar view
 * - Therapy week progress
 * - Streak display with milestone preview
 *
 * Research base:
 * - Unicode Progress Bars (changaco.oy.lc)
 * - Progress indicators improve completion by 20-30% (UX research)
 * - Steps-based progress > percentage (cognitive clarity)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services/ProgressVisualizationService
 */

import { IStreakData, IStreakMilestone, streakService } from './StreakService';

/**
 * Progress bar style options
 */
export type ProgressBarStyle = 'blocks' | 'circles' | 'squares' | 'minimal';

/**
 * Progress bar configuration
 */
export interface IProgressBarConfig {
  style: ProgressBarStyle;
  width: number; // Number of segments
  showPercentage: boolean;
  filledChar?: string;
  emptyChar?: string;
}

/**
 * Therapy progress data
 */
export interface ITherapyProgress {
  currentWeek: number;
  totalWeeks: number;
  completedModules: string[];
  currentModule?: string;
}

/**
 * Complete progress summary
 */
export interface IProgressSummary {
  streakLine: string;
  weeklyCalendar: string;
  therapyProgress: string;
  nextMilestone: string;
  freezeStatus: string;
}

/**
 * Style configurations for progress bars
 */
const PROGRESS_STYLES: Record<ProgressBarStyle, { filled: string; empty: string }> = {
  blocks: { filled: '█', empty: '░' },
  circles: { filled: '●', empty: '○' },
  squares: { filled: '■', empty: '□' },
  minimal: { filled: '▓', empty: '░' },
};

/**
 * ProgressVisualizationService
 */
export class ProgressVisualizationService {
  /**
   * Create a text-based progress bar
   */
  createProgressBar(
    progress: number, // 0-100
    config: Partial<IProgressBarConfig> = {}
  ): string {
    const {
      style = 'blocks',
      width = 10,
      showPercentage = true,
    } = config;

    const { filled, empty } = PROGRESS_STYLES[style];
    const clampedProgress = Math.max(0, Math.min(100, progress));
    const filledCount = Math.round((clampedProgress / 100) * width);
    const emptyCount = width - filledCount;

    const bar = filled.repeat(filledCount) + empty.repeat(emptyCount);

    if (showPercentage) {
      return `${bar} ${clampedProgress}%`;
    }
    return bar;
  }

  /**
   * Create streak display line
   */
  createStreakLine(streakData: IStreakData): string {
    const { currentStreak, longestStreak } = streakData;

    if (currentStreak === 0) {
      return '🔥 Streak: начни сегодня!';
    }

    const pluralized = this.pluralizeDays(currentStreak);

    // Add flame intensity based on streak
    let flames = '🔥';
    if (currentStreak >= 7) flames = '🔥';
    if (currentStreak >= 14) flames = '🔥🔥';
    if (currentStreak >= 30) flames = '🔥🔥🔥';

    let line = `${flames} Streak: *${currentStreak}* ${pluralized}`;

    // Show personal best if relevant
    if (longestStreak > currentStreak && longestStreak > 7) {
      line += ` (рекорд: ${longestStreak})`;
    }

    return line;
  }

  /**
   * Create weekly calendar view
   * Shows last 7 days with activity status
   */
  createWeeklyCalendar(streakData: IStreakData): string {
    const days = streakService.getWeeklyActivitySummary(streakData);
    const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    // Get current day of week (0 = Sunday)
    const today = new Date();
    const currentDayIndex = today.getDay();
    // Convert to Monday-based index (0 = Monday)
    const mondayBasedIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;

    // Build the calendar starting from the day 6 days ago
    const startDayIndex = (mondayBasedIndex - 6 + 7) % 7;

    let labels = '';
    let marks = '';

    for (let i = 0; i < 7; i++) {
      const dayIndex = (startDayIndex + i) % 7;
      labels += dayLabels[dayIndex].padStart(2, ' ') + ' ';
      marks += ' ' + days[i] + ' ';
    }

    return `📅 Последние 7 дней:\n\`${labels.trim()}\`\n\`${marks.trim()}\``;
  }

  /**
   * Create simple weekly dots view (compact)
   */
  createWeeklyDots(streakData: IStreakData): string {
    const days = streakService.getWeeklyActivitySummary(streakData);
    return `📓 Неделя: ${days.join(' ')}`;
  }

  /**
   * Create therapy week progress
   */
  createTherapyProgress(therapy: ITherapyProgress): string {
    const { currentWeek, totalWeeks } = therapy;
    const progress = Math.round((currentWeek / totalWeeks) * 100);
    const bar = this.createProgressBar(progress, { width: 15, style: 'blocks' });

    return `📚 Неделя ${currentWeek} из ${totalWeeks}\n${bar}`;
  }

  /**
   * Create next milestone preview
   */
  createNextMilestonePreview(streakData: IStreakData): string {
    const nextMilestone = streakService.getNextMilestone(streakData.currentStreak);

    if (!nextMilestone) {
      return '🏆 Все milestones достигнуты!';
    }

    const { progress, current, target } = streakService.getMilestoneProgress(streakData.currentStreak);
    const bar = this.createProgressBar(progress, { width: 10, style: 'circles', showPercentage: false });

    return `${nextMilestone.badge} До "${nextMilestone.title}": ${bar} (${current}/${target})`;
  }

  /**
   * Create freeze status display
   */
  createFreezeStatus(streakData: IStreakData): string {
    const { freezesAvailable } = streakData;

    if (freezesAvailable === 0) {
      return '❄️ Freeze: нет (новый в понедельник)';
    }

    const snowflakes = '❄️'.repeat(freezesAvailable);
    return `${snowflakes} Streak Freeze: ${freezesAvailable} шт.`;
  }

  /**
   * Create full progress summary for /progress command
   */
  createFullProgressSummary(
    streakData: IStreakData,
    therapyProgress?: ITherapyProgress,
    userName?: string
  ): string {
    const lines: string[] = [];

    // Header
    if (userName) {
      lines.push(`📊 *Прогресс: ${userName}*`);
    } else {
      lines.push('📊 *Твой прогресс*');
    }
    lines.push('');

    // Streak
    lines.push(this.createStreakLine(streakData));
    lines.push('');

    // Next milestone
    lines.push(this.createNextMilestonePreview(streakData));
    lines.push('');

    // Weekly calendar
    lines.push(this.createWeeklyDots(streakData));
    lines.push('');

    // Therapy progress if available
    if (therapyProgress) {
      lines.push(this.createTherapyProgress(therapyProgress));
      lines.push('');
    }

    // Freeze status
    lines.push(this.createFreezeStatus(streakData));

    // Motivational footer
    lines.push('');
    lines.push(this.getMotivationalFooter(streakData.currentStreak));

    return lines.join('\n');
  }

  /**
   * Create compact progress for welcome message
   */
  createCompactProgress(streakData: IStreakData): string {
    const lines: string[] = [];

    // Streak
    lines.push(this.createStreakLine(streakData));

    // Weekly dots
    lines.push(this.createWeeklyDots(streakData));

    return lines.join('\n');
  }

  /**
   * Create greeting with progress embedded
   */
  createGreetingWithProgress(
    userName: string,
    streakData: IStreakData,
    timeOfDay: 'morning' | 'day' | 'evening' | 'night'
  ): string {
    const greetings = {
      morning: '🌅 Доброе утро',
      day: '☀️ Добрый день',
      evening: '🌆 Добрый вечер',
      night: '🌙 Доброй ночи',
    };

    const lines: string[] = [];
    lines.push(`${greetings[timeOfDay]}, *${userName}*!`);
    lines.push('');
    lines.push(this.createCompactProgress(streakData));

    return lines.join('\n');
  }

  /**
   * Get motivational footer based on streak
   */
  private getMotivationalFooter(streak: number): string {
    if (streak === 0) {
      return '💡 _Начни сегодня — каждый день важен!_';
    } else if (streak < 7) {
      return '💡 _Продолжай — до первого milestone осталось немного!_';
    } else if (streak < 14) {
      return '💡 _Отличный ритм! Привычка формируется._';
    } else if (streak < 30) {
      return '💡 _Ты на верном пути к здоровому сну!_';
    } else if (streak < 66) {
      return '💡 _Впечатляющая стабильность!_';
    } else {
      return '💡 _Мастер сна! Привычка стала частью жизни._';
    }
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
   * Create milestone celebration message
   */
  createMilestoneCelebration(milestone: IStreakMilestone): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('🎉 *MILESTONE ДОСТИГНУТ!* 🎉');
    lines.push('');
    lines.push(`${milestone.badge} *${milestone.title}*`);
    lines.push('');
    lines.push(milestone.message);

    if (milestone.isHabitFormed) {
      lines.push('');
      lines.push('🏆 _По науке (UCL Study), 66 дней — порог автоматизма._');
      lines.push('_Твоя привычка здорового сна теперь часть тебя!_');
    }

    return lines.join('\n');
  }

  /**
   * Create streak recovery message (after broken streak)
   */
  createRecoveryMessage(previousStreak: number): string {
    const lines: string[] = [];

    lines.push('🌱 *Новое начало*');
    lines.push('');

    if (previousStreak > 7) {
      lines.push(`Ты достигал ${previousStreak} ${this.pluralizeDays(previousStreak)} — это было здорово!`);
    }

    lines.push('');
    lines.push('💪 Пропуски — часть пути. Исследования показывают,');
    lines.push('что один пропуск НЕ разрушает привычку.');
    lines.push('');
    lines.push('_Продолжим вместе!_');

    return lines.join('\n');
  }
}

// Singleton instance
export const progressVisualization = new ProgressVisualizationService();
