/**
 * SleepDiaryService - Sleep Diary Management
 * ===========================================
 * Handles sleep diary entries, calculations, and analysis.
 *
 * @packageDocumentation
 * @module @sleepcore/diary
 */

import type {
  ISleepState,
  ISleepMetrics,
  ISleepDiaryEntry,
  SleepQualityRating,
  InsomniaSubtype,
  Chronotype,
} from '../sleep/interfaces/ISleepState';

/**
 * Sleep diary configuration
 */
export interface ISleepDiaryConfig {
  readonly minimumEntriesForAnalysis: number;
  readonly sleepEfficiencyTarget: number;
  readonly optimalSleepHoursMin: number;
  readonly optimalSleepHoursMax: number;
}

/**
 * Default diary configuration
 */
export const DEFAULT_DIARY_CONFIG: ISleepDiaryConfig = {
  minimumEntriesForAnalysis: 7,
  sleepEfficiencyTarget: 85,
  optimalSleepHoursMin: 7,
  optimalSleepHoursMax: 9,
};

/**
 * Weekly sleep summary
 */
export interface IWeeklySleepSummary {
  readonly weekStartDate: string;
  readonly weekEndDate: string;
  readonly entriesCount: number;
  readonly averages: {
    readonly timeInBed: number;
    readonly totalSleepTime: number;
    readonly sleepOnsetLatency: number;
    readonly wakeAfterSleepOnset: number;
    readonly sleepEfficiency: number;
    readonly numberOfAwakenings: number;
  };
  readonly trends: {
    readonly sleepEfficiency: 'improving' | 'stable' | 'declining';
    readonly totalSleepTime: 'improving' | 'stable' | 'declining';
  };
  readonly qualityDistribution: Record<SleepQualityRating, number>;
  readonly recommendations: string[];
}

/**
 * Sleep pattern analysis
 */
export interface ISleepPatternAnalysis {
  readonly userId: string;
  readonly analysisDate: string;
  readonly dataRange: { start: string; end: string };
  readonly entriesAnalyzed: number;

  readonly patterns: {
    readonly averageBedtime: string;
    readonly averageWakeTime: string;
    readonly bedtimeVariability: number;  // minutes SD
    readonly wakeTimeVariability: number;  // minutes SD
    readonly weekendShift: number;  // minutes difference
    readonly estimatedChronotype: Chronotype;
  };

  readonly insomnia: {
    readonly subtype: InsomniaSubtype;
    readonly severity: 'none' | 'mild' | 'moderate' | 'severe';
    readonly avgSOL: number;
    readonly avgWASO: number;
    readonly avgSE: number;
  };

  readonly issues: {
    readonly id: string;
    readonly description: string;
    readonly frequency: number;  // percentage of nights
    readonly severity: 'low' | 'medium' | 'high';
  }[];
}

/**
 * Sleep Diary Service
 */
export class SleepDiaryService {
  private entries: Map<string, ISleepDiaryEntry[]> = new Map();
  private config: ISleepDiaryConfig;

  constructor(config: Partial<ISleepDiaryConfig> = {}) {
    this.config = { ...DEFAULT_DIARY_CONFIG, ...config };
  }

  /**
   * Add a new diary entry
   */
  addEntry(entry: ISleepDiaryEntry): ISleepMetrics {
    const userEntries = this.entries.get(entry.userId) || [];
    userEntries.push(entry);
    this.entries.set(entry.userId, userEntries);

    return this.calculateMetrics(entry);
  }

  /**
   * Calculate sleep metrics from diary entry
   */
  calculateMetrics(entry: ISleepDiaryEntry): ISleepMetrics {
    // Calculate Time In Bed (TIB)
    const bedtimeMinutes = this.timeToMinutes(entry.bedtime);
    const outOfBedMinutes = this.timeToMinutes(entry.outOfBedTime);
    let timeInBed = outOfBedMinutes - bedtimeMinutes;
    if (timeInBed < 0) timeInBed += 24 * 60; // Crossed midnight

    // Calculate Total Sleep Time (TST)
    const totalSleepTime = timeInBed -
      entry.sleepOnsetLatency -
      entry.wakeAfterSleepOnset;

    // Calculate Sleep Efficiency (SE)
    const sleepEfficiency = timeInBed > 0
      ? Math.round((totalSleepTime / timeInBed) * 100)
      : 0;

    return {
      timeInBed,
      totalSleepTime: Math.max(0, totalSleepTime),
      sleepOnsetLatency: entry.sleepOnsetLatency,
      wakeAfterSleepOnset: entry.wakeAfterSleepOnset,
      numberOfAwakenings: entry.numberOfAwakenings,
      sleepEfficiency: Math.max(0, Math.min(100, sleepEfficiency)),
      bedtime: entry.bedtime,
      wakeTime: entry.finalAwakening,
      finalAwakening: entry.finalAwakening,
      outOfBedTime: entry.outOfBedTime,
    };
  }

  /**
   * Get entries for user
   */
  getEntries(userId: string, days?: number): ISleepDiaryEntry[] {
    const userEntries = this.entries.get(userId) || [];
    if (!days) return userEntries;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return userEntries.filter(e => new Date(e.date) >= cutoffDate);
  }

  /**
   * Calculate weekly summary
   */
  calculateWeeklySummary(userId: string, weekStart: string): IWeeklySleepSummary {
    const weekEntries = this.getEntriesForWeek(userId, weekStart);
    const metrics = weekEntries.map(e => this.calculateMetrics(e));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Calculate averages
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const averages = {
      timeInBed: Math.round(avg(metrics.map(m => m.timeInBed))),
      totalSleepTime: Math.round(avg(metrics.map(m => m.totalSleepTime))),
      sleepOnsetLatency: Math.round(avg(metrics.map(m => m.sleepOnsetLatency))),
      wakeAfterSleepOnset: Math.round(avg(metrics.map(m => m.wakeAfterSleepOnset))),
      sleepEfficiency: Math.round(avg(metrics.map(m => m.sleepEfficiency))),
      numberOfAwakenings: Math.round(avg(metrics.map(m => m.numberOfAwakenings)) * 10) / 10,
    };

    // Quality distribution
    const qualityDistribution: Record<SleepQualityRating, number> = {
      very_poor: 0,
      poor: 0,
      fair: 0,
      good: 0,
      excellent: 0,
    };
    weekEntries.forEach(e => {
      qualityDistribution[e.subjectiveQuality]++;
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(averages);

    return {
      weekStartDate: weekStart,
      weekEndDate: weekEnd.toISOString().split('T')[0],
      entriesCount: weekEntries.length,
      averages,
      trends: {
        sleepEfficiency: this.calculateTrend(metrics.map(m => m.sleepEfficiency)),
        totalSleepTime: this.calculateTrend(metrics.map(m => m.totalSleepTime)),
      },
      qualityDistribution,
      recommendations,
    };
  }

  /**
   * Analyze sleep patterns
   */
  analyzePatterns(userId: string): ISleepPatternAnalysis {
    const entries = this.getEntries(userId, 14);
    const metrics = entries.map(e => this.calculateMetrics(e));

    if (entries.length < this.config.minimumEntriesForAnalysis) {
      throw new Error(`Need at least ${this.config.minimumEntriesForAnalysis} entries for analysis`);
    }

    // Calculate bedtime/waketime patterns
    const bedtimes = entries.map(e => this.timeToMinutes(e.bedtime));
    const waketimes = entries.map(e => this.timeToMinutes(e.finalAwakening));

    const avgBedtime = this.minutesToTime(this.average(bedtimes));
    const avgWakeTime = this.minutesToTime(this.average(waketimes));
    const bedtimeSD = this.standardDeviation(bedtimes);
    const waketimeSD = this.standardDeviation(waketimes);

    // Estimate chronotype from average bedtime
    const estimatedChronotype = this.estimateChronotype(this.average(bedtimes));

    // Analyze insomnia subtype
    const avgSOL = this.average(metrics.map(m => m.sleepOnsetLatency));
    const avgWASO = this.average(metrics.map(m => m.wakeAfterSleepOnset));
    const avgSE = this.average(metrics.map(m => m.sleepEfficiency));

    const insomnia = {
      subtype: this.determineInsomniaSubtype(avgSOL, avgWASO),
      severity: this.determineInsomniaSeverity(avgSE, avgSOL, avgWASO),
      avgSOL: Math.round(avgSOL),
      avgWASO: Math.round(avgWASO),
      avgSE: Math.round(avgSE),
    };

    // Identify issues
    const issues = this.identifyIssues(entries, metrics);

    return {
      userId,
      analysisDate: new Date().toISOString().split('T')[0],
      dataRange: {
        start: entries[0].date,
        end: entries[entries.length - 1].date,
      },
      entriesAnalyzed: entries.length,
      patterns: {
        averageBedtime: avgBedtime,
        averageWakeTime: avgWakeTime,
        bedtimeVariability: Math.round(bedtimeSD),
        wakeTimeVariability: Math.round(waketimeSD),
        weekendShift: 0, // Would need weekday/weekend separation
        estimatedChronotype,
      },
      insomnia,
      issues,
    };
  }

  /**
   * Calculate Insomnia Severity Index (ISI) from diary data
   */
  estimateISI(userId: string): number {
    const entries = this.getEntries(userId, 14);
    if (entries.length < 7) return -1; // Not enough data

    const metrics = entries.map(e => this.calculateMetrics(e));

    // ISI components estimation (0-4 scale each, total 0-28)
    const avgSE = this.average(metrics.map(m => m.sleepEfficiency));
    const avgSOL = this.average(metrics.map(m => m.sleepOnsetLatency));
    const avgWASO = this.average(metrics.map(m => m.wakeAfterSleepOnset));

    // Difficulty falling asleep (based on SOL)
    const q1 = avgSOL < 15 ? 0 : avgSOL < 30 ? 1 : avgSOL < 45 ? 2 : avgSOL < 60 ? 3 : 4;

    // Difficulty staying asleep (based on WASO)
    const q2 = avgWASO < 15 ? 0 : avgWASO < 30 ? 1 : avgWASO < 45 ? 2 : avgWASO < 60 ? 3 : 4;

    // Early morning awakening (estimate based on overall)
    const q3 = avgSE > 90 ? 0 : avgSE > 85 ? 1 : avgSE > 75 ? 2 : avgSE > 65 ? 3 : 4;

    // Satisfaction (from quality ratings)
    const qualityAvg = this.average(entries.map(e =>
      e.subjectiveQuality === 'excellent' ? 5 :
      e.subjectiveQuality === 'good' ? 4 :
      e.subjectiveQuality === 'fair' ? 3 :
      e.subjectiveQuality === 'poor' ? 2 : 1
    ));
    const q4 = qualityAvg >= 4 ? 0 : qualityAvg >= 3 ? 1 : qualityAvg >= 2.5 ? 2 : qualityAvg >= 2 ? 3 : 4;

    // Noticeable impact (estimate from alertness)
    const alertnessAvg = this.average(entries.map(e => e.morningAlertness));
    const q5 = alertnessAvg >= 4 ? 0 : alertnessAvg >= 3 ? 1 : alertnessAvg >= 2.5 ? 2 : alertnessAvg >= 2 ? 3 : 4;

    // Worried about sleep (estimate based on consistency issues)
    const q6 = avgSE > 85 ? 0 : avgSE > 75 ? 1 : avgSE > 65 ? 2 : avgSE > 55 ? 3 : 4;

    // Interfering with daily functioning (estimate)
    const q7 = q5; // Use same as impact

    return q1 + q2 + q3 + q4 + q5 + q6 + q7;
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const normalizedMinutes = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hours = Math.floor(normalizedMinutes / 60);
    const mins = Math.round(normalizedMinutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private average(arr: number[]): number {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  private standardDeviation(arr: number[]): number {
    if (arr.length === 0) return 0;
    const avg = this.average(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 3) return 'stable';
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const diff = this.average(secondHalf) - this.average(firstHalf);
    if (Math.abs(diff) < 5) return 'stable';
    return diff > 0 ? 'improving' : 'declining';
  }

  private estimateChronotype(avgBedtimeMinutes: number): Chronotype {
    // Bedtime in minutes from midnight (can be negative for late night)
    const normalizedBedtime = avgBedtimeMinutes > 720 ? avgBedtimeMinutes - 1440 : avgBedtimeMinutes;

    if (normalizedBedtime < -60) return 'definite_evening';  // After 1am
    if (normalizedBedtime < 0) return 'moderate_evening';    // 12-1am
    if (normalizedBedtime < 60) return 'intermediate';       // 11pm-12am
    if (normalizedBedtime < 120) return 'moderate_morning';  // 10-11pm
    return 'definite_morning';                               // Before 10pm
  }

  private determineInsomniaSubtype(avgSOL: number, avgWASO: number): InsomniaSubtype {
    const hasOnset = avgSOL > 30;
    const hasMaintenance = avgWASO > 30;

    if (hasOnset && hasMaintenance) return 'mixed';
    if (hasOnset) return 'sleep_onset';
    if (hasMaintenance) return 'sleep_maintenance';
    return 'none';
  }

  private determineInsomniaSeverity(
    avgSE: number,
    avgSOL: number,
    avgWASO: number
  ): 'none' | 'mild' | 'moderate' | 'severe' {
    if (avgSE >= 85 && avgSOL < 20 && avgWASO < 20) return 'none';
    if (avgSE >= 75 && avgSOL < 40 && avgWASO < 40) return 'mild';
    if (avgSE >= 65) return 'moderate';
    return 'severe';
  }

  private getEntriesForWeek(userId: string, weekStart: string): ISleepDiaryEntry[] {
    const entries = this.entries.get(userId) || [];
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);

    return entries.filter(e => {
      const date = new Date(e.date);
      return date >= start && date < end;
    });
  }

  private generateRecommendations(averages: IWeeklySleepSummary['averages']): string[] {
    const recommendations: string[] = [];

    if (averages.sleepEfficiency < 85) {
      recommendations.push('Рассмотрите сокращение времени в постели для повышения эффективности сна');
    }

    if (averages.sleepOnsetLatency > 30) {
      recommendations.push('Ложитесь спать только когда чувствуете сонливость');
    }

    if (averages.wakeAfterSleepOnset > 30) {
      recommendations.push('Если не можете уснуть в течение 20 минут, встаньте с кровати');
    }

    if (averages.numberOfAwakenings > 3) {
      recommendations.push('Проверьте условия сна: температуру, шум, свет');
    }

    if (averages.totalSleepTime < 360) { // Less than 6 hours
      recommendations.push('Обсудите со специалистом ваш режим сна');
    }

    return recommendations;
  }

  private identifyIssues(
    entries: ISleepDiaryEntry[],
    metrics: ISleepMetrics[]
  ): ISleepPatternAnalysis['issues'] {
    const issues: ISleepPatternAnalysis['issues'] = [];

    // Check for long sleep onset
    const longSOLNights = metrics.filter(m => m.sleepOnsetLatency > 30).length;
    if (longSOLNights > entries.length * 0.5) {
      issues.push({
        id: 'long_sol',
        description: 'Трудности с засыпанием (SOL > 30 мин)',
        frequency: Math.round((longSOLNights / entries.length) * 100),
        severity: longSOLNights > entries.length * 0.7 ? 'high' : 'medium',
      });
    }

    // Check for high WASO
    const highWASONights = metrics.filter(m => m.wakeAfterSleepOnset > 30).length;
    if (highWASONights > entries.length * 0.5) {
      issues.push({
        id: 'high_waso',
        description: 'Частые пробуждения ночью (WASO > 30 мин)',
        frequency: Math.round((highWASONights / entries.length) * 100),
        severity: highWASONights > entries.length * 0.7 ? 'high' : 'medium',
      });
    }

    // Check for low efficiency
    const lowEfficiencyNights = metrics.filter(m => m.sleepEfficiency < 85).length;
    if (lowEfficiencyNights > entries.length * 0.5) {
      issues.push({
        id: 'low_efficiency',
        description: 'Низкая эффективность сна (SE < 85%)',
        frequency: Math.round((lowEfficiencyNights / entries.length) * 100),
        severity: lowEfficiencyNights > entries.length * 0.7 ? 'high' : 'medium',
      });
    }

    // Check for irregular schedule
    const bedtimes = entries.map(e => this.timeToMinutes(e.bedtime));
    const bedtimeSD = this.standardDeviation(bedtimes);
    if (bedtimeSD > 60) { // More than 1 hour variability
      issues.push({
        id: 'irregular_schedule',
        description: 'Нерегулярный график сна (разброс > 1 часа)',
        frequency: 100,
        severity: bedtimeSD > 90 ? 'high' : 'medium',
      });
    }

    return issues;
  }
}

/**
 * Factory function
 */
export function createSleepDiaryService(
  config?: Partial<ISleepDiaryConfig>
): SleepDiaryService {
  return new SleepDiaryService(config);
}
