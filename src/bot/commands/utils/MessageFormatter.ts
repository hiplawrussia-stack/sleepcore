/**
 * SleepCore Message Formatter
 * ===========================
 * Utility for formatting bot messages with consistent styling.
 *
 * Features:
 * - Progress bars with emoji
 * - Sleep efficiency indicators
 * - ISI score severity formatting
 * - Time/duration formatting
 * - HTML escaping for Telegram
 *
 * @packageDocumentation
 * @module @sleepcore/bot/commands/utils
 */

import type { IMessageFormatter } from '../interfaces/ICommand';

/**
 * ISI Severity levels based on European Insomnia Guideline 2023
 */
export type ISISeverity = 'none' | 'subthreshold' | 'moderate' | 'severe';

/**
 * Sleep efficiency status
 */
export type SEStatus = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Message Formatter implementation
 */
export class MessageFormatter implements IMessageFormatter {
  // ==================== Progress Visualization ====================

  /**
   * Create visual progress bar
   * @param value - Value 0-100
   * @param width - Bar width (default 10)
   * @returns Emoji progress bar string
   */
  progressBar(value: number, width: number = 10): string {
    const clamped = Math.max(0, Math.min(100, value));
    const filled = Math.round((clamped / 100) * width);
    const empty = width - filled;

    const filledChar = '▓';
    const emptyChar = '░';

    return filledChar.repeat(filled) + emptyChar.repeat(empty) + ` ${Math.round(clamped)}%`;
  }

  /**
   * Create circular progress indicator
   * @param value - Value 0-100
   * @returns Emoji circle indicator
   */
  circleProgress(value: number): string {
    if (value >= 90) return '🟢';
    if (value >= 75) return '🟡';
    if (value >= 50) return '🟠';
    return '🔴';
  }

  // ==================== Sleep Metrics ====================

  /**
   * Format sleep efficiency with visual indicator
   * Target: 85-95% (European Insomnia Guideline 2023)
   */
  sleepEfficiency(value: number): string {
    const status = this.getSEStatus(value);
    const icon = this.getSEIcon(status);
    const label = this.getSELabel(status);

    return `${icon} *${Math.round(value)}%* ${label}`;
  }

  /**
   * Get SE status based on value
   */
  getSEStatus(value: number): SEStatus {
    if (value >= 90) return 'excellent';
    if (value >= 85) return 'good';
    if (value >= 75) return 'fair';
    return 'poor';
  }

  private getSEIcon(status: SEStatus): string {
    const icons: Record<SEStatus, string> = {
      excellent: '🌟',
      good: '✅',
      fair: '⚠️',
      poor: '🔴',
    };
    return icons[status];
  }

  private getSELabel(status: SEStatus): string {
    const labels: Record<SEStatus, string> = {
      excellent: 'Отлично',
      good: 'Хорошо',
      fair: 'Требует внимания',
      poor: 'Низкая',
    };
    return labels[status];
  }

  // ==================== ISI Score ====================

  /**
   * Format ISI score with severity indicator
   * Based on: Morin et al. (2011) - ISI validation
   */
  isiScore(value: number): string {
    const severity = this.getISISeverity(value);
    const icon = this.getISIIcon(severity);
    const label = this.getISILabel(severity);

    return `${icon} ISI: *${value}*/28 — ${label}`;
  }

  /**
   * Get ISI severity based on score
   * 0-7: No insomnia
   * 8-14: Subthreshold
   * 15-21: Moderate
   * 22-28: Severe
   */
  getISISeverity(score: number): ISISeverity {
    if (score <= 7) return 'none';
    if (score <= 14) return 'subthreshold';
    if (score <= 21) return 'moderate';
    return 'severe';
  }

  private getISIIcon(severity: ISISeverity): string {
    const icons: Record<ISISeverity, string> = {
      none: '🟢',
      subthreshold: '🟡',
      moderate: '🟠',
      severe: '🔴',
    };
    return icons[severity];
  }

  private getISILabel(severity: ISISeverity): string {
    const labels: Record<ISISeverity, string> = {
      none: 'Нет клинической инсомнии',
      subthreshold: 'Субклиническая инсомния',
      moderate: 'Умеренная инсомния',
      severe: 'Тяжёлая инсомния',
    };
    return labels[severity];
  }

  // ==================== Time Formatting ====================

  /**
   * Format duration in minutes to human-readable string
   */
  duration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} мин`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
      return `${hours} ч`;
    }

    return `${hours} ч ${mins} мин`;
  }

  /**
   * Format time as HH:MM
   */
  formatTime(date: Date): string {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Format short date (DD.MM)
   */
  formatShortDate(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  /**
   * Format weekday name
   */
  formatWeekday(date: Date): string {
    return date.toLocaleDateString('ru-RU', { weekday: 'long' });
  }

  // ==================== Text Utilities ====================

  /**
   * Escape HTML special characters for Telegram
   */
  escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Truncate text with ellipsis
   */
  truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  /**
   * Format numbered list
   */
  numberedList(items: string[]): string {
    return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
  }

  /**
   * Format bulleted list
   */
  bulletList(items: string[]): string {
    return items.map((item) => `• ${item}`).join('\n');
  }

  // ==================== Therapy-Specific ====================

  /**
   * Format treatment week indicator
   */
  treatmentWeek(week: number, totalWeeks: number = 6): string {
    const progress = this.progressBar((week / totalWeeks) * 100, 6);
    return `📅 Неделя ${week}/${totalWeeks} ${progress}`;
  }

  /**
   * Format sleep window
   */
  sleepWindow(bedtime: string, wakeTime: string, duration: number): string {
    return `🛏 ${bedtime} → ⏰ ${wakeTime} (${this.duration(duration * 60)})`;
  }

  /**
   * Format streak badge
   */
  streakBadge(days: number): string {
    if (days === 0) return '';
    if (days < 7) return `🔥 ${days} дн подряд`;
    if (days < 30) return `🔥🔥 ${days} дн подряд`;
    return `🔥🔥🔥 ${days} дн подряд!`;
  }

  /**
   * Format adherence percentage
   */
  adherence(value: number): string {
    const icon = value >= 80 ? '⭐' : value >= 60 ? '✓' : '⚠️';
    return `${icon} Приверженность: ${Math.round(value)}%`;
  }

  // ==================== Response Templates ====================

  /**
   * Format success message
   */
  success(message: string): string {
    return `✅ ${message}`;
  }

  /**
   * Format error message
   */
  error(message: string): string {
    return `❌ ${message}`;
  }

  /**
   * Format warning message
   */
  warning(message: string): string {
    return `⚠️ ${message}`;
  }

  /**
   * Format info message
   */
  info(message: string): string {
    return `ℹ️ ${message}`;
  }

  /**
   * Format tip/hint
   */
  tip(message: string): string {
    return `💡 _${message}_`;
  }

  /**
   * Create section header
   */
  header(title: string): string {
    return `*━━━ ${title} ━━━*`;
  }

  /**
   * Create divider line
   */
  divider(): string {
    return '───────────────';
  }
}

// Export singleton instance
export const formatter = new MessageFormatter();
