/**
 * Activity Proxy Engine
 * =====================
 * Engine for estimating sleep timing from activity data when wearable
 * sleep tracking is unavailable.
 *
 * Clinical basis:
 * - Activity gaps correlate with sleep periods (r=0.3-0.5)
 * - Last activity time is proxy for bedtime
 * - First activity time is proxy for wake time
 * - Phone-based activity can supplement missing wearable data
 *
 * Algorithm:
 * 1. Identify the longest nighttime gap in activity
 * 2. Cross-validate with last/first activity times
 * 3. Apply confidence scoring based on data quality
 *
 * Limitations:
 * - Cannot detect sleep quality metrics (WASO, awakenings)
 * - Accuracy depends on user carrying device
 * - Daytime naps may be missed or misidentified
 *
 * @packageDocumentation
 * @module @sleepcore/activity
 */

import type {
  IActivityProxyEngine,
  ActivityData,
  ActivityGap,
  EstimatedSleep,
  ActivityPattern,
  ActivityConfidence,
  EstimationMethod,
  ActivityProxyConfig,
} from './types';

/**
 * Default configuration for activity-based estimation
 */
const DEFAULT_CONFIG: ActivityProxyConfig = {
  minSleepGapMinutes: 240, // 4 hours minimum sleep
  maxSleepGapMinutes: 720, // 12 hours maximum sleep gap
  minActiveSteps: 10, // Steps to count as "active"
  nightStartHour: 20, // 8 PM
  nightEndHour: 10, // 10 AM
  minDataPoints: 10, // Minimum data points for estimation
};

/**
 * ActivityProxyEngine - Estimates sleep from activity patterns
 */
export class ActivityProxyEngine implements IActivityProxyEngine {
  private readonly config: ActivityProxyConfig;

  constructor(config: Partial<ActivityProxyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Estimate sleep timing from activity data
   *
   * @param data - Activity data for a day
   * @returns Estimated sleep parameters
   */
  estimateSleepFromActivity(data: ActivityData): EstimatedSleep {
    const dataQuality = this.assessDataQuality(data);

    // If data quality is too poor, return low-confidence estimate
    if (dataQuality === 'poor') {
      return this.createLowConfidenceEstimate(data);
    }

    // Find potential sleep gaps
    const gaps = this.calculateActivityGaps(data);
    const nighttimeGaps = gaps.filter((g) => g.isNighttime);

    // Get first/last activity times
    const lastActive = this.getLastActivityTime(data);
    const firstActive = this.getFirstActivityTime(data);

    // Determine best estimation method
    if (nighttimeGaps.length > 0) {
      // Use the longest nighttime gap
      const sleepGap = nighttimeGaps.reduce((longest, gap) =>
        gap.durationMinutes > longest.durationMinutes ? gap : longest
      );

      return this.createGapBasedEstimate(data, sleepGap, dataQuality);
    }

    // Fallback to activity time-based estimation
    if (lastActive && firstActive) {
      return this.createActivityTimeEstimate(
        data,
        lastActive,
        firstActive,
        dataQuality
      );
    }

    return this.createLowConfidenceEstimate(data);
  }

  /**
   * Get the last active time from activity data
   *
   * @param data - Activity data
   * @returns Last activity timestamp or null
   */
  getLastActivityTime(data: ActivityData): Date | null {
    if (data.lastActiveTime) {
      return data.lastActiveTime;
    }

    const activePoints = data.dataPoints.filter(
      (p) => p.steps >= this.config.minActiveSteps
    );

    if (activePoints.length === 0) {
      return null;
    }

    return activePoints.reduce((latest, point) =>
      point.timestamp > latest.timestamp ? point : latest
    ).timestamp;
  }

  /**
   * Get the first active time from activity data
   *
   * @param data - Activity data
   * @returns First activity timestamp or null
   */
  getFirstActivityTime(data: ActivityData): Date | null {
    if (data.firstActiveTime) {
      return data.firstActiveTime;
    }

    const activePoints = data.dataPoints.filter(
      (p) => p.steps >= this.config.minActiveSteps
    );

    if (activePoints.length === 0) {
      return null;
    }

    return activePoints.reduce((earliest, point) =>
      point.timestamp < earliest.timestamp ? point : earliest
    ).timestamp;
  }

  /**
   * Find gaps in activity that could indicate sleep
   *
   * @param data - Activity data
   * @returns Array of activity gaps
   */
  calculateActivityGaps(data: ActivityData): ActivityGap[] {
    const sortedPoints = [...data.dataPoints]
      .filter((p) => p.steps >= this.config.minActiveSteps)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (sortedPoints.length < 2) {
      return [];
    }

    const gaps: ActivityGap[] = [];

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const current = sortedPoints[i];
      const next = sortedPoints[i + 1];

      const gapMs = next.timestamp.getTime() - current.timestamp.getTime();
      const gapMinutes = gapMs / (1000 * 60);

      // Only consider gaps within sleep range
      if (
        gapMinutes >= this.config.minSleepGapMinutes &&
        gapMinutes <= this.config.maxSleepGapMinutes
      ) {
        gaps.push({
          start: current.timestamp,
          end: next.timestamp,
          durationMinutes: Math.round(gapMinutes),
          isNighttime: this.isNighttimeGap(current.timestamp, next.timestamp),
        });
      }
    }

    return gaps;
  }

  /**
   * Calculate typical activity pattern from multiple days
   *
   * @param multiDayData - Activity data for multiple days
   * @returns Activity pattern summary
   */
  calculateActivityPattern(multiDayData: ActivityData[]): ActivityPattern {
    if (multiDayData.length === 0) {
      return {
        typicalFirstActive: '07:00',
        typicalLastActive: '23:00',
        averageDailySteps: 0,
        sampleDays: 0,
        variabilityScore: 1,
      };
    }

    const firstActiveTimes: number[] = []; // Minutes from midnight
    const lastActiveTimes: number[] = [];
    const dailySteps: number[] = [];

    for (const dayData of multiDayData) {
      const first = this.getFirstActivityTime(dayData);
      const last = this.getLastActivityTime(dayData);

      if (first) {
        firstActiveTimes.push(this.getMinutesFromMidnight(first));
      }
      if (last) {
        lastActiveTimes.push(this.getMinutesFromMidnight(last));
      }

      dailySteps.push(dayData.totalSteps);
    }

    // Calculate averages
    const avgFirstActive =
      firstActiveTimes.length > 0
        ? firstActiveTimes.reduce((a, b) => a + b) / firstActiveTimes.length
        : 7 * 60;
    const avgLastActive =
      lastActiveTimes.length > 0
        ? lastActiveTimes.reduce((a, b) => a + b) / lastActiveTimes.length
        : 23 * 60;
    const avgSteps =
      dailySteps.length > 0
        ? dailySteps.reduce((a, b) => a + b) / dailySteps.length
        : 0;

    // Calculate variability (coefficient of variation)
    const variability = this.calculateVariability(firstActiveTimes);

    return {
      typicalFirstActive: this.formatMinutesAsTime(avgFirstActive),
      typicalLastActive: this.formatMinutesAsTime(avgLastActive),
      averageDailySteps: Math.round(avgSteps),
      sampleDays: multiDayData.length,
      variabilityScore: variability,
    };
  }

  /**
   * Check if activity data quality is sufficient for estimation
   *
   * @param data - Activity data
   * @returns Data quality assessment
   */
  assessDataQuality(data: ActivityData): 'poor' | 'fair' | 'good' {
    const { dataPoints, totalSteps } = data;

    // Check number of data points
    if (dataPoints.length < this.config.minDataPoints) {
      return 'poor';
    }

    // Check if there's any activity recorded
    if (totalSteps === 0) {
      return 'poor';
    }

    // Check time coverage
    const activePoints = dataPoints.filter(
      (p) => p.steps >= this.config.minActiveSteps
    );
    if (activePoints.length < 3) {
      return 'poor';
    }

    // Check for reasonable distribution across the day
    const timestamps = activePoints.map((p) => p.timestamp.getTime());
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
    const hoursCovered = timeSpan / (1000 * 60 * 60);

    if (hoursCovered < 8) {
      return 'fair';
    }

    // Good quality: many points, spread across the day
    if (activePoints.length >= 20 && hoursCovered >= 12) {
      return 'good';
    }

    return 'fair';
  }

  /**
   * Calculate confidence for sleep estimation
   *
   * @param data - Activity data
   * @param method - Estimation method used
   * @returns Confidence level
   */
  calculateConfidence(
    data: ActivityData,
    method: EstimationMethod
  ): ActivityConfidence {
    const quality = this.assessDataQuality(data);

    if (quality === 'poor') {
      return 'low';
    }

    // Gap-based method is more reliable
    if (method === 'activity_gap' && quality === 'good') {
      return 'high';
    }

    // After quality === 'poor' check above, quality is 'good' or 'fair'
    if (method === 'combined') {
      return 'medium';
    }

    // Time-based methods are less reliable
    if (method === 'last_active' || method === 'first_active') {
      return quality === 'good' ? 'medium' : 'low';
    }

    return quality === 'good' ? 'medium' : 'low';
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  /**
   * Check if a gap falls within nighttime hours
   */
  private isNighttimeGap(start: Date, end: Date): boolean {
    const startHour = start.getHours();
    const endHour = end.getHours();

    // Nighttime is either late evening or early morning
    const isStartNight =
      startHour >= this.config.nightStartHour || startHour < this.config.nightEndHour;
    const isEndNight =
      endHour >= this.config.nightStartHour || endHour < this.config.nightEndHour;

    return isStartNight || isEndNight;
  }

  /**
   * Create an estimate based on activity gap
   */
  private createGapBasedEstimate(
    data: ActivityData,
    gap: ActivityGap,
    dataQuality: 'poor' | 'fair' | 'good'
  ): EstimatedSleep {
    const confidence = this.calculateConfidence(data, 'activity_gap');

    return {
      date: data.date,
      estimatedBedtime: gap.start,
      estimatedWakeTime: gap.end,
      estimatedTST: gap.durationMinutes,
      confidence,
      method: 'activity_gap',
      reason: `Обнаружен перерыв в активности ${gap.durationMinutes} минут в ночное время.`,
      dataQuality,
    };
  }

  /**
   * Create an estimate based on first/last activity times
   */
  private createActivityTimeEstimate(
    data: ActivityData,
    lastActive: Date,
    firstActive: Date,
    dataQuality: 'poor' | 'fair' | 'good'
  ): EstimatedSleep {
    // Estimate bedtime as 30 min after last activity
    const estimatedBedtime = new Date(lastActive.getTime() + 30 * 60 * 1000);

    // Estimate wake time as 15 min before first activity
    const estimatedWakeTime = new Date(firstActive.getTime() - 15 * 60 * 1000);

    // Calculate estimated TST (handle crossing midnight)
    let tstMs = estimatedWakeTime.getTime() - estimatedBedtime.getTime();
    if (tstMs < 0) {
      tstMs += 24 * 60 * 60 * 1000; // Add 24 hours if crossing midnight
    }
    const estimatedTST = Math.round(tstMs / (1000 * 60));

    const confidence = this.calculateConfidence(data, 'combined');

    return {
      date: data.date,
      estimatedBedtime,
      estimatedWakeTime,
      estimatedTST: Math.min(estimatedTST, this.config.maxSleepGapMinutes),
      confidence,
      method: 'combined',
      reason:
        'Оценка на основе времени последней и первой активности. Точность ±30 минут.',
      dataQuality,
    };
  }

  /**
   * Create a low-confidence estimate when data is insufficient
   */
  private createLowConfidenceEstimate(data: ActivityData): EstimatedSleep {
    // Use default sleep window: 23:00 - 07:00
    const date = data.date;
    const estimatedBedtime = new Date(date);
    estimatedBedtime.setHours(23, 0, 0, 0);

    const estimatedWakeTime = new Date(date);
    estimatedWakeTime.setDate(estimatedWakeTime.getDate() + 1);
    estimatedWakeTime.setHours(7, 0, 0, 0);

    return {
      date,
      estimatedBedtime,
      estimatedWakeTime,
      estimatedTST: 480, // 8 hours default
      confidence: 'low',
      method: 'steps_pattern',
      reason:
        'Недостаточно данных об активности для точной оценки. Используются средние значения.',
      dataQuality: 'poor',
    };
  }

  /**
   * Get minutes from midnight for a date
   */
  private getMinutesFromMidnight(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }

  /**
   * Format minutes as "HH:mm" time string
   */
  private formatMinutesAsTime(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.round(minutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate coefficient of variation for variability score
   */
  private calculateVariability(values: number[]): number {
    if (values.length < 2) {
      return 1; // Maximum variability when insufficient data
    }

    const mean = values.reduce((a, b) => a + b) / values.length;
    if (mean === 0) {
      return 1;
    }

    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to 0-1 range (assuming max CV of 0.5 = very variable)
    const cv = stdDev / mean;
    return Math.min(1, cv * 2);
  }
}

/**
 * Singleton instance for convenience
 */
export const activityProxyEngine = new ActivityProxyEngine();
