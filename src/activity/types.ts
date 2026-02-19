/**
 * Activity Proxy Types
 * ====================
 * Type definitions for indirect sleep estimation from activity data.
 *
 * Clinical basis: Activity patterns can serve as proxy for sleep timing
 * when wearable sleep tracking is unavailable. Correlation r=0.3-0.5.
 *
 * @packageDocumentation
 * @module @sleepcore/activity
 */

/**
 * Confidence level for activity-based estimates
 */
export type ActivityConfidence = 'low' | 'medium' | 'high';

/**
 * Method used for sleep estimation
 */
export type EstimationMethod =
  | 'activity_gap'      // Longest gap in activity
  | 'last_active'       // Time of last activity
  | 'first_active'      // Time of first activity
  | 'steps_pattern'     // Step count pattern analysis
  | 'combined';         // Multiple methods combined

/**
 * Raw activity data point
 */
export interface ActivityDataPoint {
  readonly timestamp: Date;
  readonly steps: number;
  readonly source?: string; // 'phone' | 'watch' | 'fitness_tracker'
}

/**
 * Aggregated activity data for a time period
 */
export interface ActivityData {
  readonly date: Date;
  readonly dataPoints: readonly ActivityDataPoint[];
  readonly totalSteps: number;
  readonly firstActiveTime?: Date;
  readonly lastActiveTime?: Date;
  readonly dataSource: 'phone' | 'wearable' | 'mixed';
}

/**
 * Detected gap in activity (potential sleep period)
 */
export interface ActivityGap {
  readonly start: Date;
  readonly end: Date;
  readonly durationMinutes: number;
  readonly isNighttime: boolean;
}

/**
 * Estimated sleep parameters from activity data
 */
export interface EstimatedSleep {
  readonly date: Date;
  readonly estimatedBedtime: Date;
  readonly estimatedWakeTime: Date;
  readonly estimatedTST: number; // Total Sleep Time in minutes
  readonly confidence: ActivityConfidence;
  readonly method: EstimationMethod;
  readonly reason: string;
  readonly dataQuality: 'poor' | 'fair' | 'good';
}

/**
 * Activity pattern summary for a user
 */
export interface ActivityPattern {
  readonly typicalFirstActive: string; // "HH:mm"
  readonly typicalLastActive: string;  // "HH:mm"
  readonly averageDailySteps: number;
  readonly sampleDays: number;
  readonly variabilityScore: number; // 0-1, lower is more consistent
}

/**
 * Interface for ActivityProxyEngine
 */
export interface IActivityProxyEngine {
  /**
   * Estimate sleep timing from activity data
   */
  estimateSleepFromActivity(data: ActivityData): EstimatedSleep;

  /**
   * Get the last active time from activity data
   */
  getLastActivityTime(data: ActivityData): Date | null;

  /**
   * Get the first active time from activity data
   */
  getFirstActivityTime(data: ActivityData): Date | null;

  /**
   * Find gaps in activity that could indicate sleep
   */
  calculateActivityGaps(data: ActivityData): ActivityGap[];

  /**
   * Calculate typical activity pattern from multiple days
   */
  calculateActivityPattern(multiDayData: ActivityData[]): ActivityPattern;

  /**
   * Check if activity data quality is sufficient for estimation
   */
  assessDataQuality(data: ActivityData): 'poor' | 'fair' | 'good';

  /**
   * Calculate confidence for sleep estimation
   */
  calculateConfidence(
    data: ActivityData,
    method: EstimationMethod
  ): ActivityConfidence;
}

/**
 * Configuration for activity-based estimation
 */
export interface ActivityProxyConfig {
  /** Minimum gap duration to consider as sleep (minutes) */
  readonly minSleepGapMinutes: number;

  /** Maximum gap duration to consider as sleep (minutes) */
  readonly maxSleepGapMinutes: number;

  /** Minimum steps to consider as "active" */
  readonly minActiveSteps: number;

  /** Night start hour (0-23) */
  readonly nightStartHour: number;

  /** Night end hour (0-23) */
  readonly nightEndHour: number;

  /** Minimum data points required for estimation */
  readonly minDataPoints: number;
}
