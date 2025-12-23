/**
 * Year in Pixels Service
 * =======================
 * Daylio-style mood visualization for Telegram.
 *
 * Research basis (2025):
 * - Created by Camille de Passion Carnets for Bullet Journals
 * - Users value calendar visualizations for trend identification (JMIR 2021)
 * - Color coding described as "valuable and engaging" (JMIR 2022)
 * - 5-level color scale based on color psychology research
 *
 * Color Psychology:
 * - Green: positive, growth, health (Level 5)
 * - Blue: calm, stable, content (Level 4)
 * - Yellow: alert, moderate, neutral (Level 3)
 * - Orange: warning, concern (Level 2)
 * - Red: high arousal, negative state (Level 1)
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services
 */

import { InlineKeyboard } from 'grammy';
import type { IMoodHistory, IMoodEntry, MoodLevel } from './EmojiSliderService';

// ==================== Types ====================

/**
 * Pixel display options
 */
export type PixelStyle = 'circles' | 'squares' | 'blocks';

/**
 * View mode
 */
export type ViewMode = 'month' | 'quarter' | 'year';

/**
 * Pixel data for a single day
 */
export interface IPixelData {
  date: Date;
  moodLevel: MoodLevel | null;
  hasMultipleEntries: boolean;
}

/**
 * Monthly pixel statistics
 */
export interface IMonthStats {
  month: number;
  year: number;
  totalDays: number;
  trackedDays: number;
  averageMood: number | null;
  moodDistribution: Record<MoodLevel, number>;
  dominantMood: MoodLevel | null;
}

/**
 * Year pixel statistics
 */
export interface IYearStats {
  year: number;
  totalDays: number;
  trackedDays: number;
  trackingRate: number;
  averageMood: number | null;
  moodDistribution: Record<MoodLevel, number>;
  bestMonth: number | null;
  worstMonth: number | null;
  currentStreak: number;
  longestStreak: number;
}

// ==================== Constants ====================

/**
 * Mood level to emoji mapping (circles - Daylio style)
 */
const MOOD_CIRCLES: Record<MoodLevel | 0, string> = {
  5: '🟢', // Great - Green
  4: '🔵', // Good - Blue
  3: '🟡', // Neutral - Yellow
  2: '🟠', // Bad - Orange
  1: '🔴', // Awful - Red
  0: '⚪', // No data - White
};

/**
 * Alternative: Square emojis
 */
const MOOD_SQUARES: Record<MoodLevel | 0, string> = {
  5: '🟩', // Great - Green
  4: '🟦', // Good - Blue
  3: '🟨', // Neutral - Yellow
  2: '🟧', // Bad - Orange
  1: '🟥', // Awful - Red
  0: '⬜', // No data - White
};

/**
 * Invalid day (month has < 31 days)
 */
const INVALID_DAY = '⬛';

/**
 * Mood level labels (Russian)
 */
const MOOD_LABELS: Record<MoodLevel, string> = {
  5: 'Отлично',
  4: 'Хорошо',
  3: 'Нормально',
  2: 'Плохо',
  1: 'Ужасно',
};

/**
 * Month names (Russian, abbreviated)
 */
const MONTH_NAMES_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

/**
 * Month names (Russian, full)
 */
const MONTH_NAMES_FULL = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/**
 * Weekday names (Russian, abbreviated)
 */
const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ==================== Helper Functions ====================

/**
 * Get days in month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get day of week (0 = Monday, 6 = Sunday)
 */
function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse date from timestamp
 */
function getDateFromTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return formatDateKey(date);
}

// ==================== Service Implementation ====================

/**
 * Year in Pixels Service
 *
 * Generates Daylio-style mood visualizations using emoji grids.
 *
 * @example
 * ```typescript
 * const visualization = yearInPixels.generateMonthView(moodHistory, 2025, 0);
 * await ctx.reply(visualization.message, { reply_markup: visualization.keyboard });
 * ```
 */
export class YearInPixelsService {
  private pixelStyle: PixelStyle = 'circles';

  /**
   * Set pixel style
   */
  setPixelStyle(style: PixelStyle): void {
    this.pixelStyle = style;
  }

  /**
   * Get mood emoji for level
   */
  getMoodEmoji(level: MoodLevel | null): string {
    if (level === null) return this.getEmojis()[0];
    return this.getEmojis()[level];
  }

  /**
   * Get emoji set based on style
   */
  private getEmojis(): Record<MoodLevel | 0, string> {
    return this.pixelStyle === 'squares' ? MOOD_SQUARES : MOOD_CIRCLES;
  }

  /**
   * Build mood map from history
   */
  buildMoodMap(history: IMoodHistory): Map<string, MoodLevel> {
    const moodMap = new Map<string, MoodLevel>();

    for (const entry of history.entries) {
      const dateKey = getDateFromTimestamp(entry.timestamp);
      // If multiple entries per day, take the latest
      moodMap.set(dateKey, entry.moodLevel);
    }

    return moodMap;
  }

  /**
   * Generate monthly calendar view
   */
  generateMonthView(
    history: IMoodHistory,
    year: number,
    month: number
  ): { message: string; keyboard: InlineKeyboard; stats: IMonthStats } {
    const moodMap = this.buildMoodMap(history);
    const emojis = this.getEmojis();
    const daysInMonth = getDaysInMonth(year, month);

    // Get first day of month (0 = Monday)
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = getDayOfWeek(firstDay);

    // Build grid
    let grid = '';
    grid += `📅 *${MONTH_NAMES_FULL[month]} ${year}*\n\n`;

    // Header row (weekdays)
    grid += `\`${WEEKDAY_NAMES.join(' ')}\`\n`;

    // Build calendar grid
    let dayCounter = 1;
    const stats: IMonthStats = {
      month,
      year,
      totalDays: daysInMonth,
      trackedDays: 0,
      averageMood: null,
      moodDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      dominantMood: null,
    };

    let moodSum = 0;

    for (let week = 0; week < 6; week++) {
      let row = '';

      for (let day = 0; day < 7; day++) {
        const cellIndex = week * 7 + day;

        if (cellIndex < startDayOfWeek || dayCounter > daysInMonth) {
          // Empty cell
          row += '  ';
        } else {
          // Get mood for this day
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
          const mood = moodMap.get(dateKey) || null;

          if (mood !== null) {
            stats.trackedDays++;
            stats.moodDistribution[mood]++;
            moodSum += mood;
          }

          row += mood !== null ? emojis[mood] : emojis[0];
          dayCounter++;
        }
      }

      grid += row.trim() + '\n';

      if (dayCounter > daysInMonth) break;
    }

    // Calculate stats
    if (stats.trackedDays > 0) {
      stats.averageMood = Math.round((moodSum / stats.trackedDays) * 10) / 10;

      // Find dominant mood
      let maxCount = 0;
      for (const [level, count] of Object.entries(stats.moodDistribution)) {
        if (count > maxCount) {
          maxCount = count;
          stats.dominantMood = parseInt(level) as MoodLevel;
        }
      }
    }

    // Add legend
    grid += '\n' + this.generateLegend();

    // Add stats
    grid += '\n' + this.formatMonthStats(stats);

    // Build keyboard
    const keyboard = this.buildMonthNavigationKeyboard(year, month);

    return { message: grid, keyboard, stats };
  }

  /**
   * Generate compact year grid (12 columns × 31 rows)
   */
  generateYearGrid(
    history: IMoodHistory,
    year: number
  ): { message: string; keyboard: InlineKeyboard; stats: IYearStats } {
    const moodMap = this.buildMoodMap(history);
    const emojis = this.getEmojis();

    let grid = `📊 *Год в пикселях ${year}*\n\n`;

    // Month headers (abbreviated)
    grid += '`   ';
    for (let m = 0; m < 12; m++) {
      grid += MONTH_NAMES_SHORT[m].charAt(0) + ' ';
    }
    grid += '`\n';

    // Stats initialization
    const stats: IYearStats = {
      year,
      totalDays: 0,
      trackedDays: 0,
      trackingRate: 0,
      averageMood: null,
      moodDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      bestMonth: null,
      worstMonth: null,
      currentStreak: 0,
      longestStreak: 0,
    };

    const monthMoods: number[] = new Array(12).fill(0);
    const monthCounts: number[] = new Array(12).fill(0);
    let moodSum = 0;

    // Build grid (31 rows × 12 columns)
    for (let day = 1; day <= 31; day++) {
      let row = `\`${String(day).padStart(2, ' ')} \``;

      for (let month = 0; month < 12; month++) {
        const daysInMonth = getDaysInMonth(year, month);

        if (day > daysInMonth) {
          // Invalid day for this month
          row += INVALID_DAY;
        } else {
          stats.totalDays++;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const mood = moodMap.get(dateKey) || null;

          if (mood !== null) {
            stats.trackedDays++;
            stats.moodDistribution[mood]++;
            moodSum += mood;
            monthMoods[month] += mood;
            monthCounts[month]++;
          }

          row += mood !== null ? emojis[mood] : emojis[0];
        }
      }

      grid += row + '\n';
    }

    // Calculate year stats
    if (stats.trackedDays > 0) {
      stats.averageMood = Math.round((moodSum / stats.trackedDays) * 10) / 10;
      stats.trackingRate = Math.round((stats.trackedDays / stats.totalDays) * 100);

      // Find best and worst months
      let bestAvg = 0;
      let worstAvg = 6;

      for (let m = 0; m < 12; m++) {
        if (monthCounts[m] > 0) {
          const avg = monthMoods[m] / monthCounts[m];
          if (avg > bestAvg) {
            bestAvg = avg;
            stats.bestMonth = m;
          }
          if (avg < worstAvg) {
            worstAvg = avg;
            stats.worstMonth = m;
          }
        }
      }
    }

    // Calculate streaks
    const { current, longest } = this.calculateStreaks(moodMap, year);
    stats.currentStreak = current;
    stats.longestStreak = longest;

    // Add legend and stats
    grid += '\n' + this.generateLegend();
    grid += '\n' + this.formatYearStats(stats);

    // Build keyboard
    const keyboard = this.buildYearNavigationKeyboard(year);

    return { message: grid, keyboard, stats };
  }

  /**
   * Generate quarter view (3 months)
   */
  generateQuarterView(
    history: IMoodHistory,
    year: number,
    quarter: number // 0-3
  ): { message: string; keyboard: InlineKeyboard } {
    const startMonth = quarter * 3;
    const months = [startMonth, startMonth + 1, startMonth + 2];
    const quarterNames = ['Q1 (Янв-Мар)', 'Q2 (Апр-Июн)', 'Q3 (Июл-Сен)', 'Q4 (Окт-Дек)'];

    let message = `📊 *${quarterNames[quarter]} ${year}*\n\n`;

    // Generate mini view for each month
    for (const month of months) {
      const { stats } = this.generateMonthView(history, year, month);
      const emoji = stats.dominantMood ? this.getMoodEmoji(stats.dominantMood) : '⚪';
      const avgStr = stats.averageMood ? stats.averageMood.toFixed(1) : '-';

      message += `${emoji} *${MONTH_NAMES_SHORT[month]}*: ${stats.trackedDays} дн., avg: ${avgStr}\n`;
    }

    message += '\n' + this.generateLegend();

    // Keyboard for navigation
    const keyboard = new InlineKeyboard();

    if (quarter > 0) {
      keyboard.text('◀️ Пред', `pixels:quarter:${year}:${quarter - 1}`);
    }
    keyboard.text('📅 Год', `pixels:year:${year}`);
    if (quarter < 3) {
      keyboard.text('След ▶️', `pixels:quarter:${year}:${quarter + 1}`);
    }

    keyboard.row().text('📱 Меню', 'hub:back');

    return { message, keyboard };
  }

  /**
   * Generate statistics summary
   */
  generateStatsSummary(history: IMoodHistory): string {
    const now = new Date();
    const year = now.getFullYear();
    const moodMap = this.buildMoodMap(history);

    // Last 30 days stats
    let tracked30 = 0;
    let sum30 = 0;
    const dist30: Record<MoodLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = formatDateKey(date);
      const mood = moodMap.get(dateKey);

      if (mood) {
        tracked30++;
        sum30 += mood;
        dist30[mood]++;
      }
    }

    let summary = '📈 *Статистика настроения*\n\n';

    // 30-day summary
    summary += '*Последние 30 дней:*\n';
    if (tracked30 > 0) {
      const avg30 = (sum30 / tracked30).toFixed(1);
      summary += `• Отслежено: ${tracked30}/30 дней\n`;
      summary += `• Средний балл: ${avg30}/5\n`;
      summary += `• Распределение:\n`;

      for (let level = 5; level >= 1; level--) {
        const count = dist30[level as MoodLevel];
        const bar = this.createMiniBar(count, tracked30);
        summary += `  ${this.getMoodEmoji(level as MoodLevel)} ${bar} ${count}\n`;
      }
    } else {
      summary += '• Нет данных\n';
    }

    // Streaks
    const { current, longest } = this.calculateStreaks(moodMap, year);
    summary += `\n*Серии:*\n`;
    summary += `• Текущая: ${current} дн.\n`;
    summary += `• Лучшая: ${longest} дн.\n`;

    return summary;
  }

  /**
   * Generate legend
   */
  generateLegend(): string {
    const emojis = this.getEmojis();
    return `*Легенда:*\n` +
      `${emojis[5]} Отлично  ${emojis[4]} Хорошо  ${emojis[3]} Норма\n` +
      `${emojis[2]} Плохо  ${emojis[1]} Ужасно  ${emojis[0]} Нет данных`;
  }

  /**
   * Format month statistics
   */
  private formatMonthStats(stats: IMonthStats): string {
    if (stats.trackedDays === 0) {
      return '*Статистика:* Нет данных за этот месяц';
    }

    const trackingRate = Math.round((stats.trackedDays / stats.totalDays) * 100);

    return `*Статистика:*\n` +
      `• Отслежено: ${stats.trackedDays}/${stats.totalDays} дней (${trackingRate}%)\n` +
      `• Средний балл: ${stats.averageMood}/5\n` +
      `• Преобладает: ${this.getMoodEmoji(stats.dominantMood)} ${stats.dominantMood ? MOOD_LABELS[stats.dominantMood] : '-'}`;
  }

  /**
   * Format year statistics
   */
  private formatYearStats(stats: IYearStats): string {
    if (stats.trackedDays === 0) {
      return '*Статистика:* Нет данных за этот год';
    }

    let result = `*Статистика ${stats.year}:*\n`;
    result += `• Отслежено: ${stats.trackedDays} дней (${stats.trackingRate}%)\n`;
    result += `• Средний балл: ${stats.averageMood}/5\n`;

    if (stats.bestMonth !== null) {
      result += `• Лучший месяц: ${MONTH_NAMES_SHORT[stats.bestMonth]}\n`;
    }
    if (stats.worstMonth !== null) {
      result += `• Сложный месяц: ${MONTH_NAMES_SHORT[stats.worstMonth]}\n`;
    }

    result += `• Текущая серия: ${stats.currentStreak} дн.\n`;
    result += `• Лучшая серия: ${stats.longestStreak} дн.`;

    return result;
  }

  /**
   * Create mini progress bar
   */
  private createMiniBar(value: number, max: number): string {
    const width = 8;
    const filled = max > 0 ? Math.round((value / max) * width) : 0;
    return '█'.repeat(filled) + '░'.repeat(width - filled);
  }

  /**
   * Calculate tracking streaks
   */
  private calculateStreaks(
    moodMap: Map<string, MoodLevel>,
    year: number
  ): { current: number; longest: number } {
    const today = new Date();
    let current = 0;
    let longest = 0;
    let tempStreak = 0;

    // Check current streak (going backwards from today)
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = formatDateKey(date);

      if (moodMap.has(dateKey)) {
        if (i === 0 || current === i) {
          current++;
        }
        tempStreak++;
      } else {
        if (tempStreak > longest) {
          longest = tempStreak;
        }
        tempStreak = 0;
      }
    }

    if (tempStreak > longest) {
      longest = tempStreak;
    }

    return { current, longest };
  }

  /**
   * Build month navigation keyboard
   */
  private buildMonthNavigationKeyboard(year: number, month: number): InlineKeyboard {
    const kb = new InlineKeyboard();

    // Previous/Next month
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    kb.text('◀️', `pixels:month:${prevYear}:${prevMonth}`)
      .text(`📊 ${year}`, `pixels:year:${year}`)
      .text('▶️', `pixels:month:${nextYear}:${nextMonth}`)
      .row();

    kb.text('📈 Статистика', `pixels:stats`)
      .text('📱 Меню', 'hub:back');

    return kb;
  }

  /**
   * Build year navigation keyboard
   */
  private buildYearNavigationKeyboard(year: number): InlineKeyboard {
    const kb = new InlineKeyboard();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    kb.text('◀️', `pixels:year:${year - 1}`)
      .text(`📅 ${MONTH_NAMES_SHORT[currentMonth]}`, `pixels:month:${currentYear}:${currentMonth}`)
      .text('▶️', `pixels:year:${year + 1}`)
      .row();

    kb.text('📈 Статистика', `pixels:stats`)
      .text('📱 Меню', 'hub:back');

    return kb;
  }

  /**
   * Get current month view command result
   */
  generateCurrentMonthView(history: IMoodHistory): { message: string; keyboard: InlineKeyboard } {
    const now = new Date();
    const { message, keyboard } = this.generateMonthView(
      history,
      now.getFullYear(),
      now.getMonth()
    );
    return { message, keyboard };
  }

  /**
   * Get current year view command result
   */
  generateCurrentYearView(history: IMoodHistory): { message: string; keyboard: InlineKeyboard } {
    const now = new Date();
    const { message, keyboard } = this.generateYearGrid(history, now.getFullYear());
    return { message, keyboard };
  }
}

// ==================== Singleton Export ====================

/** Shared instance */
export const yearInPixels = new YearInPixelsService();

export default YearInPixelsService;
