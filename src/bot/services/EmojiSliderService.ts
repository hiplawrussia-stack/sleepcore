/**
 * EmojiSliderService - Wysa-Style Mood & Sleep Assessment
 * ========================================================
 *
 * Research-validated emoji-based mood tracking for mental health apps.
 *
 * Evidence base (35+ sources):
 * - Emoji scales correlate with PHQ-9 (r=0.61) and HAM-A (r=0.60-0.74)
 * - 5-6 levels optimal (Wong-Baker, Daylio industry standard)
 * - Cross-cultural universality of emoji confirmed
 * - Wysa pattern: emoji selection → contributing factors → personalized response
 *
 * Implementation:
 * - 5-point emoji scale (validated by research)
 * - Inline keyboard (Telegram limitation - no native slider)
 * - Contributing factors for context
 * - Sleep-specific scale variant
 * - Mood history tracking
 *
 * References:
 * - TandFOnline 2022: Emoji Current Mood Scale
 * - ScienceDirect 2023: Emoji validation for affect assessment
 * - PMC 2024: GMoji for youth mental health
 * - Daylio: Industry-standard 5-point scale
 *
 * @packageDocumentation
 * @module @sleepcore/bot/services/EmojiSliderService
 */

import { InlineKeyboard } from 'grammy';

// ==================== Types ====================

/**
 * Mood level (1-5 scale)
 */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Sleep quality level (1-5 scale)
 */
export type SleepQualityLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Mood scale item configuration
 */
export interface IMoodScaleItem {
  level: MoodLevel;
  emoji: string;
  label: string;
  labelEn: string;
  color: string;
  valence: number; // -1 to 1
}

/**
 * Sleep quality scale item
 */
export interface ISleepScaleItem {
  level: SleepQualityLevel;
  emoji: string;
  label: string;
  hoursRange: string;
  qualityLabel: string;
}

/**
 * Contributing factor for mood
 */
export interface IMoodFactor {
  id: string;
  emoji: string;
  label: string;
  category: 'lifestyle' | 'social' | 'health' | 'environment';
}

/**
 * Single mood entry
 */
export interface IMoodEntry {
  timestamp: number;
  moodLevel: MoodLevel;
  factors: string[];
  context: 'morning' | 'evening' | 'check-in' | 'manual';
  note?: string;
}

/**
 * Sleep entry
 */
export interface ISleepEntry {
  timestamp: number;
  date: string; // YYYY-MM-DD
  qualityLevel: SleepQualityLevel;
  factors: string[];
  hoursSlept?: number;
}

/**
 * User mood history
 */
export interface IMoodHistory {
  entries: IMoodEntry[];
  sleepEntries: ISleepEntry[];
  lastMoodCheck: number | null;
  lastSleepCheck: number | null;
  averageMood7Days: number | null;
  averageSleep7Days: number | null;
  moodTrend: 'improving' | 'stable' | 'declining' | 'unknown';
}

/**
 * Mood analysis result
 */
export interface IMoodAnalysis {
  averageMood: number;
  averageSleep: number;
  dominantFactors: string[];
  moodTrend: 'improving' | 'stable' | 'declining' | 'unknown';
  correlations: {
    sleepMoodCorrelation: number;
    topPositiveFactors: string[];
    topNegativeFactors: string[];
  };
  insights: string[];
}

// ==================== Scale Configurations ====================

/**
 * 5-Point Mood Scale (Daylio/Wong-Baker validated)
 */
const MOOD_SCALE: IMoodScaleItem[] = [
  {
    level: 1,
    emoji: '😢',
    label: 'Ужасно',
    labelEn: 'Awful',
    color: '#E74C3C',
    valence: -1.0,
  },
  {
    level: 2,
    emoji: '😕',
    label: 'Плохо',
    labelEn: 'Bad',
    color: '#E67E22',
    valence: -0.5,
  },
  {
    level: 3,
    emoji: '😐',
    label: 'Нормально',
    labelEn: 'Okay',
    color: '#F1C40F',
    valence: 0,
  },
  {
    level: 4,
    emoji: '🙂',
    label: 'Хорошо',
    labelEn: 'Good',
    color: '#2ECC71',
    valence: 0.5,
  },
  {
    level: 5,
    emoji: '😊',
    label: 'Отлично',
    labelEn: 'Great',
    color: '#27AE60',
    valence: 1.0,
  },
];

/**
 * Sleep Quality Scale (PSQI-inspired)
 */
const SLEEP_QUALITY_SCALE: ISleepScaleItem[] = [
  {
    level: 1,
    emoji: '😵',
    label: 'Не спал(а)',
    hoursRange: '0-2',
    qualityLabel: 'Terrible',
  },
  {
    level: 2,
    emoji: '😫',
    label: 'Плохо',
    hoursRange: '2-4',
    qualityLabel: 'Poor',
  },
  {
    level: 3,
    emoji: '😐',
    label: 'Так себе',
    hoursRange: '4-6',
    qualityLabel: 'Fair',
  },
  {
    level: 4,
    emoji: '😌',
    label: 'Нормально',
    hoursRange: '6-7',
    qualityLabel: 'Good',
  },
  {
    level: 5,
    emoji: '😴',
    label: 'Отлично',
    hoursRange: '7-9',
    qualityLabel: 'Excellent',
  },
];

/**
 * Contributing Factors (Wysa-inspired)
 */
const MOOD_FACTORS: IMoodFactor[] = [
  { id: 'sleep', emoji: '😴', label: 'Сон', category: 'health' },
  { id: 'work', emoji: '💼', label: 'Работа', category: 'lifestyle' },
  { id: 'health', emoji: '💪', label: 'Здоровье', category: 'health' },
  { id: 'people', emoji: '👥', label: 'Люди', category: 'social' },
  { id: 'stress', emoji: '😰', label: 'Стресс', category: 'health' },
  { id: 'food', emoji: '🍽️', label: 'Еда', category: 'lifestyle' },
  { id: 'exercise', emoji: '🏃', label: 'Спорт', category: 'lifestyle' },
  { id: 'weather', emoji: '🌤️', label: 'Погода', category: 'environment' },
  { id: 'family', emoji: '👨‍👩‍👧', label: 'Семья', category: 'social' },
  { id: 'hobbies', emoji: '🎮', label: 'Хобби', category: 'lifestyle' },
  { id: 'money', emoji: '💰', label: 'Финансы', category: 'lifestyle' },
  { id: 'news', emoji: '📰', label: 'Новости', category: 'environment' },
];

/**
 * Sleep-specific factors
 */
const SLEEP_FACTORS: IMoodFactor[] = [
  { id: 'caffeine', emoji: '☕', label: 'Кофеин', category: 'lifestyle' },
  { id: 'screen', emoji: '📱', label: 'Экраны', category: 'lifestyle' },
  { id: 'noise', emoji: '🔊', label: 'Шум', category: 'environment' },
  { id: 'temperature', emoji: '🌡️', label: 'Температура', category: 'environment' },
  { id: 'stress', emoji: '😰', label: 'Стресс', category: 'health' },
  { id: 'late_meal', emoji: '🍕', label: 'Поздний ужин', category: 'lifestyle' },
  { id: 'exercise', emoji: '🏃', label: 'Спорт вечером', category: 'lifestyle' },
  { id: 'alcohol', emoji: '🍷', label: 'Алкоголь', category: 'lifestyle' },
];

// ==================== EmojiSliderService ====================

/**
 * EmojiSliderService - Mood and sleep tracking with emoji scales
 */
export class EmojiSliderService {
  private maxHistoryEntries = 100;

  /**
   * Get mood scale configuration
   */
  getMoodScale(): IMoodScaleItem[] {
    return [...MOOD_SCALE];
  }

  /**
   * Get sleep quality scale configuration
   */
  getSleepScale(): ISleepScaleItem[] {
    return [...SLEEP_QUALITY_SCALE];
  }

  /**
   * Get mood factors
   */
  getMoodFactors(): IMoodFactor[] {
    return [...MOOD_FACTORS];
  }

  /**
   * Get sleep factors
   */
  getSleepFactors(): IMoodFactor[] {
    return [...SLEEP_FACTORS];
  }

  /**
   * Create inline keyboard for mood selection
   */
  createMoodKeyboard(callbackPrefix = 'mood'): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Add all 5 mood options in a single row
    for (const item of MOOD_SCALE) {
      keyboard.text(item.emoji, `${callbackPrefix}:${item.level}`);
    }

    return keyboard;
  }

  /**
   * Create inline keyboard for sleep quality selection
   */
  createSleepKeyboard(callbackPrefix = 'sleep'): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Add all 5 sleep options in a single row
    for (const item of SLEEP_QUALITY_SCALE) {
      keyboard.text(item.emoji, `${callbackPrefix}:${item.level}`);
    }

    return keyboard;
  }

  /**
   * Create inline keyboard for factor selection (multi-select)
   * Returns 2-row layout with 3-4 factors per row
   */
  createFactorKeyboard(
    type: 'mood' | 'sleep',
    selectedFactors: string[] = [],
    callbackPrefix = 'factor'
  ): InlineKeyboard {
    const factors = type === 'mood' ? MOOD_FACTORS : SLEEP_FACTORS;
    const keyboard = new InlineKeyboard();

    // 3 factors per row
    const itemsPerRow = 3;
    let currentRow = 0;

    for (let i = 0; i < factors.length; i++) {
      const factor = factors[i];
      const isSelected = selectedFactors.includes(factor.id);
      const displayText = isSelected
        ? `✓ ${factor.emoji}`
        : factor.emoji;

      keyboard.text(displayText, `${callbackPrefix}:${factor.id}`);

      // Add row break
      if ((i + 1) % itemsPerRow === 0 && i < factors.length - 1) {
        keyboard.row();
        currentRow++;
      }
    }

    // Add done button on new row
    keyboard.row();
    keyboard.text('✅ Готово', `${callbackPrefix}:done`);

    return keyboard;
  }

  /**
   * Create compact factor keyboard (most common 6 factors)
   */
  createCompactFactorKeyboard(
    type: 'mood' | 'sleep',
    selectedFactors: string[] = [],
    callbackPrefix = 'factor'
  ): InlineKeyboard {
    const allFactors = type === 'mood' ? MOOD_FACTORS : SLEEP_FACTORS;
    const factors = allFactors.slice(0, 6); // Top 6

    const keyboard = new InlineKeyboard();

    // First row: 3 factors
    for (let i = 0; i < 3; i++) {
      const factor = factors[i];
      const isSelected = selectedFactors.includes(factor.id);
      const displayText = isSelected
        ? `✓ ${factor.emoji}`
        : `${factor.emoji} ${factor.label}`;
      keyboard.text(displayText, `${callbackPrefix}:${factor.id}`);
    }

    keyboard.row();

    // Second row: 3 factors
    for (let i = 3; i < 6; i++) {
      const factor = factors[i];
      const isSelected = selectedFactors.includes(factor.id);
      const displayText = isSelected
        ? `✓ ${factor.emoji}`
        : `${factor.emoji} ${factor.label}`;
      keyboard.text(displayText, `${callbackPrefix}:${factor.id}`);
    }

    // Done button
    keyboard.row();
    keyboard.text('✅ Готово', `${callbackPrefix}:done`);

    return keyboard;
  }

  /**
   * Get mood item by level
   */
  getMoodItem(level: MoodLevel): IMoodScaleItem {
    return MOOD_SCALE.find((item) => item.level === level) || MOOD_SCALE[2];
  }

  /**
   * Get sleep item by level
   */
  getSleepItem(level: SleepQualityLevel): ISleepScaleItem {
    return SLEEP_QUALITY_SCALE.find((item) => item.level === level) || SLEEP_QUALITY_SCALE[2];
  }

  /**
   * Get factor by id
   */
  getFactor(id: string, type: 'mood' | 'sleep' = 'mood'): IMoodFactor | undefined {
    const factors = type === 'mood' ? MOOD_FACTORS : SLEEP_FACTORS;
    return factors.find((f) => f.id === id);
  }

  /**
   * Create initial mood history
   */
  createInitialHistory(): IMoodHistory {
    return {
      entries: [],
      sleepEntries: [],
      lastMoodCheck: null,
      lastSleepCheck: null,
      averageMood7Days: null,
      averageSleep7Days: null,
      moodTrend: 'unknown',
    };
  }

  /**
   * Record mood entry
   */
  recordMood(
    history: IMoodHistory,
    level: MoodLevel,
    factors: string[],
    context: IMoodEntry['context'] = 'manual',
    note?: string
  ): IMoodEntry {
    const entry: IMoodEntry = {
      timestamp: Date.now(),
      moodLevel: level,
      factors,
      context,
      note,
    };

    history.entries.push(entry);
    history.lastMoodCheck = Date.now();

    // Trim history
    if (history.entries.length > this.maxHistoryEntries) {
      history.entries = history.entries.slice(-this.maxHistoryEntries);
    }

    // Update averages
    this.updateAverages(history);

    return entry;
  }

  /**
   * Record sleep entry
   */
  recordSleep(
    history: IMoodHistory,
    level: SleepQualityLevel,
    factors: string[],
    hoursSlept?: number
  ): ISleepEntry {
    const now = new Date();
    // Sleep is recorded for previous night
    const sleepDate = new Date(now);
    sleepDate.setDate(sleepDate.getDate() - 1);

    const entry: ISleepEntry = {
      timestamp: Date.now(),
      date: sleepDate.toISOString().split('T')[0],
      qualityLevel: level,
      factors,
      hoursSlept,
    };

    history.sleepEntries.push(entry);
    history.lastSleepCheck = Date.now();

    // Trim history
    if (history.sleepEntries.length > this.maxHistoryEntries) {
      history.sleepEntries = history.sleepEntries.slice(-this.maxHistoryEntries);
    }

    // Update averages
    this.updateAverages(history);

    return entry;
  }

  /**
   * Update rolling averages
   */
  private updateAverages(history: IMoodHistory): void {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Mood average
    const recentMood = history.entries.filter((e) => e.timestamp >= sevenDaysAgo);
    if (recentMood.length > 0) {
      const sum = recentMood.reduce((acc, e) => acc + e.moodLevel, 0);
      history.averageMood7Days = Math.round((sum / recentMood.length) * 10) / 10;

      // Calculate trend
      if (recentMood.length >= 3) {
        const firstHalf = recentMood.slice(0, Math.floor(recentMood.length / 2));
        const secondHalf = recentMood.slice(Math.floor(recentMood.length / 2));

        const firstAvg = firstHalf.reduce((acc, e) => acc + e.moodLevel, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((acc, e) => acc + e.moodLevel, 0) / secondHalf.length;

        const diff = secondAvg - firstAvg;
        if (diff > 0.3) {
          history.moodTrend = 'improving';
        } else if (diff < -0.3) {
          history.moodTrend = 'declining';
        } else {
          history.moodTrend = 'stable';
        }
      }
    }

    // Sleep average
    const recentSleep = history.sleepEntries.filter((e) => e.timestamp >= sevenDaysAgo);
    if (recentSleep.length > 0) {
      const sum = recentSleep.reduce((acc, e) => acc + e.qualityLevel, 0);
      history.averageSleep7Days = Math.round((sum / recentSleep.length) * 10) / 10;
    }
  }

  /**
   * Analyze mood history
   */
  analyzeMoodHistory(history: IMoodHistory, days = 7): IMoodAnalysis {
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    const recentMood = history.entries.filter((e) => e.timestamp >= cutoff);
    const recentSleep = history.sleepEntries.filter((e) => e.timestamp >= cutoff);

    // Calculate averages
    const avgMood = recentMood.length > 0
      ? recentMood.reduce((acc, e) => acc + e.moodLevel, 0) / recentMood.length
      : 3;

    const avgSleep = recentSleep.length > 0
      ? recentSleep.reduce((acc, e) => acc + e.qualityLevel, 0) / recentSleep.length
      : 3;

    // Count factors
    const factorCounts: Record<string, { good: number; bad: number }> = {};
    for (const entry of recentMood) {
      for (const factorId of entry.factors) {
        if (!factorCounts[factorId]) {
          factorCounts[factorId] = { good: 0, bad: 0 };
        }
        if (entry.moodLevel >= 4) {
          factorCounts[factorId].good++;
        } else if (entry.moodLevel <= 2) {
          factorCounts[factorId].bad++;
        }
      }
    }

    // Find dominant factors
    const allFactors = Object.entries(factorCounts);
    const dominantFactors = allFactors
      .sort((a, b) => (b[1].good + b[1].bad) - (a[1].good + a[1].bad))
      .slice(0, 3)
      .map(([id]) => id);

    // Find positive and negative correlations
    const topPositiveFactors = allFactors
      .filter(([, counts]) => counts.good > counts.bad)
      .sort((a, b) => b[1].good - a[1].good)
      .slice(0, 2)
      .map(([id]) => id);

    const topNegativeFactors = allFactors
      .filter(([, counts]) => counts.bad > counts.good)
      .sort((a, b) => b[1].bad - a[1].bad)
      .slice(0, 2)
      .map(([id]) => id);

    // Calculate sleep-mood correlation
    let sleepMoodCorrelation = 0;
    if (recentMood.length >= 3 && recentSleep.length >= 3) {
      // Simplified correlation: compare days with good/bad sleep to mood
      const goodSleepDays = recentSleep.filter((s) => s.qualityLevel >= 4);
      const badSleepDays = recentSleep.filter((s) => s.qualityLevel <= 2);

      const goodSleepMoodAvg = goodSleepDays.length > 0
        ? this.getMoodForSleepDays(history, goodSleepDays)
        : avgMood;

      const badSleepMoodAvg = badSleepDays.length > 0
        ? this.getMoodForSleepDays(history, badSleepDays)
        : avgMood;

      sleepMoodCorrelation = Math.min(Math.max((goodSleepMoodAvg - badSleepMoodAvg) / 2, -1), 1);
    }

    // Generate insights
    const insights = this.generateInsights(
      avgMood,
      avgSleep,
      history.moodTrend,
      topPositiveFactors,
      topNegativeFactors,
      sleepMoodCorrelation
    );

    return {
      averageMood: Math.round(avgMood * 10) / 10,
      averageSleep: Math.round(avgSleep * 10) / 10,
      dominantFactors,
      moodTrend: history.moodTrend,
      correlations: {
        sleepMoodCorrelation: Math.round(sleepMoodCorrelation * 100) / 100,
        topPositiveFactors,
        topNegativeFactors,
      },
      insights,
    };
  }

  /**
   * Get average mood for days with specific sleep entries
   */
  private getMoodForSleepDays(history: IMoodHistory, sleepEntries: ISleepEntry[]): number {
    const sleepDates = new Set(sleepEntries.map((s) => s.date));
    const moodOnThoseDays = history.entries.filter((m) => {
      const moodDate = new Date(m.timestamp).toISOString().split('T')[0];
      return sleepDates.has(moodDate);
    });

    if (moodOnThoseDays.length === 0) return 3;
    return moodOnThoseDays.reduce((acc, e) => acc + e.moodLevel, 0) / moodOnThoseDays.length;
  }

  /**
   * Generate personalized insights
   */
  private generateInsights(
    avgMood: number,
    avgSleep: number,
    trend: IMoodHistory['moodTrend'],
    positiveFactors: string[],
    negativeFactors: string[],
    sleepCorrelation: number
  ): string[] {
    const insights: string[] = [];

    // Sleep-mood correlation insight
    if (sleepCorrelation > 0.3) {
      insights.push('💡 Замечаю связь: хороший сон → хорошее настроение!');
    } else if (sleepCorrelation < -0.2) {
      insights.push('🤔 Интересно: качество сна не сильно влияет на настроение.');
    }

    // Trend insights
    if (trend === 'improving') {
      insights.push('📈 Твоё настроение улучшается! Продолжай в том же духе.');
    } else if (trend === 'declining') {
      insights.push('📉 Заметила небольшой спад. Давай разберёмся вместе?');
    }

    // Factor insights
    if (positiveFactors.length > 0) {
      const factor = this.getFactor(positiveFactors[0]);
      if (factor) {
        insights.push(`${factor.emoji} ${factor.label} часто улучшает настроение!`);
      }
    }

    if (negativeFactors.length > 0) {
      const factor = this.getFactor(negativeFactors[0]);
      if (factor) {
        insights.push(`⚠️ ${factor.label} может влиять на настроение негативно.`);
      }
    }

    // Sleep quality insight
    if (avgSleep < 3) {
      insights.push('😴 Качество сна ниже нормы. Попробуем улучшить?');
    } else if (avgSleep >= 4) {
      insights.push('✨ Отличное качество сна! Так держать.');
    }

    return insights.slice(0, 3); // Max 3 insights
  }

  /**
   * Format mood response message
   */
  formatMoodResponse(level: MoodLevel, factors: string[]): string {
    const moodItem = this.getMoodItem(level);
    const factorNames = factors
      .map((id) => this.getFactor(id))
      .filter(Boolean)
      .map((f) => f!.label);

    let message = `${moodItem.emoji} *${moodItem.label}*\n\n`;

    if (factorNames.length > 0) {
      message += `Факторы: ${factorNames.join(', ')}\n\n`;
    }

    // Add personalized comment based on mood
    if (level <= 2) {
      message += '_Понимаю, бывают тяжёлые дни. Я рядом, если хочешь поговорить._';
    } else if (level === 3) {
      message += '_Нормальный день — тоже хорошо! Что могло бы улучшить настроение?_';
    } else {
      message += '_Рада, что у тебя хорошее настроение! Что помогло сегодня?_';
    }

    return message;
  }

  /**
   * Format sleep response message
   */
  formatSleepResponse(level: SleepQualityLevel, factors: string[]): string {
    const sleepItem = this.getSleepItem(level);
    const factorNames = factors
      .map((id) => this.getFactor(id, 'sleep'))
      .filter(Boolean)
      .map((f) => f!.label);

    let message = `${sleepItem.emoji} *${sleepItem.label}* (${sleepItem.hoursRange} часов)\n\n`;

    if (factorNames.length > 0) {
      message += `Что повлияло: ${factorNames.join(', ')}\n\n`;
    }

    // Add personalized comment
    if (level <= 2) {
      message += '_Плохой сон влияет на всё. Давай разберёмся, что можно улучшить._';
    } else if (level === 3) {
      message += '_Сон так себе. Есть идеи, что можно изменить?_';
    } else {
      message += '_Отличный сон — отличный день! Запомним, что помогло._';
    }

    return message;
  }

  /**
   * Create mood check prompt
   */
  getMoodCheckPrompt(context: 'morning' | 'evening' | 'check-in' = 'check-in'): string {
    switch (context) {
      case 'morning':
        return '🌅 Доброе утро! Как ты себя чувствуешь?';
      case 'evening':
        return '🌙 Добрый вечер! Как прошёл день?';
      default:
        return '💭 Как ты себя чувствуешь сейчас?';
    }
  }

  /**
   * Create sleep check prompt
   */
  getSleepCheckPrompt(): string {
    return '😴 Как ты спал(а) сегодня ночью?';
  }

  /**
   * Create factor selection prompt
   */
  getFactorPrompt(type: 'mood' | 'sleep'): string {
    if (type === 'mood') {
      return '🔍 Что повлияло на настроение? (можно выбрать несколько)';
    }
    return '🔍 Что повлияло на сон? (можно выбрать несколько)';
  }

  /**
   * Get visualization of mood over last 7 days
   */
  getMoodWeekVisualization(history: IMoodHistory): string {
    const now = new Date();
    const result: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Find mood entry for this day
      const entry = history.entries.find((e) => {
        const entryDate = new Date(e.timestamp).toISOString().split('T')[0];
        return entryDate === dateStr;
      });

      if (entry) {
        result.push(this.getMoodItem(entry.moodLevel).emoji);
      } else if (i === 0) {
        result.push('·'); // Today, not recorded
      } else {
        result.push('·'); // Not recorded
      }
    }

    return result.join(' ');
  }

  /**
   * Check if mood check is due
   */
  isMoodCheckDue(history: IMoodHistory, hoursThreshold = 12): boolean {
    if (!history.lastMoodCheck) return true;

    const hoursSinceLastCheck = (Date.now() - history.lastMoodCheck) / (1000 * 60 * 60);
    return hoursSinceLastCheck >= hoursThreshold;
  }

  /**
   * Check if sleep check is due (morning only)
   */
  isSleepCheckDue(history: IMoodHistory): boolean {
    const now = new Date();
    const hours = now.getHours();

    // Only prompt for sleep check between 6 AM and 12 PM
    if (hours < 6 || hours > 12) return false;

    if (!history.lastSleepCheck) return true;

    const lastCheckDate = new Date(history.lastSleepCheck).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    return lastCheckDate !== today;
  }
}

// ==================== Singleton Export ====================

export const emojiSlider = new EmojiSliderService();

export default emojiSlider;
