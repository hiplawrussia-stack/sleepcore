/**
 * ActivityProxyEngine Tests
 * =========================
 * Tests for indirect sleep estimation from activity data.
 *
 * @packageDocumentation
 * @module @sleepcore/activity
 */

import { ActivityProxyEngine } from '../ActivityProxyEngine';
import type { ActivityData, ActivityDataPoint } from '../types';

describe('ActivityProxyEngine', () => {
  let engine: ActivityProxyEngine;

  beforeEach(() => {
    engine = new ActivityProxyEngine();
  });

  describe('estimateSleepFromActivity', () => {
    it('estimates sleep from activity gap', () => {
      const data = createActivityDataWithGap({
        date: new Date('2025-01-15'),
        gapStart: new Date('2025-01-15T23:30:00'),
        gapEnd: new Date('2025-01-16T07:00:00'),
      });

      const estimate = engine.estimateSleepFromActivity(data);

      expect(estimate.confidence).not.toBe('low');
      expect(estimate.method).toBe('activity_gap');
      expect(estimate.estimatedTST).toBeGreaterThanOrEqual(400);
      expect(estimate.estimatedTST).toBeLessThanOrEqual(500);
    });

    it('uses combined method when no clear gap', () => {
      const data = createActivityDataWithoutGap(new Date('2025-01-15'));

      const estimate = engine.estimateSleepFromActivity(data);

      expect(['combined', 'steps_pattern']).toContain(estimate.method);
    });

    it('returns low confidence for poor data quality', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [
          { timestamp: new Date('2025-01-15T12:00:00'), steps: 100 },
        ],
        totalSteps: 100,
        dataSource: 'phone',
      };

      const estimate = engine.estimateSleepFromActivity(data);

      expect(estimate.confidence).toBe('low');
      expect(estimate.dataQuality).toBe('poor');
    });

    it('returns reasonable TST within bounds', () => {
      const data = createActivityDataWithGap({
        date: new Date('2025-01-15'),
        gapStart: new Date('2025-01-15T23:00:00'),
        gapEnd: new Date('2025-01-16T08:00:00'),
      });

      const estimate = engine.estimateSleepFromActivity(data);

      // TST should be between 4-12 hours (240-720 minutes)
      expect(estimate.estimatedTST).toBeGreaterThanOrEqual(240);
      expect(estimate.estimatedTST).toBeLessThanOrEqual(720);
    });
  });

  describe('getLastActivityTime', () => {
    it('returns last active timestamp', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [
          { timestamp: new Date('2025-01-15T08:00:00'), steps: 100 },
          { timestamp: new Date('2025-01-15T22:30:00'), steps: 50 },
          { timestamp: new Date('2025-01-15T15:00:00'), steps: 200 },
        ],
        totalSteps: 350,
        dataSource: 'phone',
      };

      const lastActive = engine.getLastActivityTime(data);

      expect(lastActive).toEqual(new Date('2025-01-15T22:30:00'));
    });

    it('returns null for empty data', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [],
        totalSteps: 0,
        dataSource: 'phone',
      };

      const lastActive = engine.getLastActivityTime(data);

      expect(lastActive).toBeNull();
    });

    it('ignores low-step entries', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [
          { timestamp: new Date('2025-01-15T20:00:00'), steps: 100 },
          { timestamp: new Date('2025-01-15T23:00:00'), steps: 5 }, // Below threshold
        ],
        totalSteps: 105,
        dataSource: 'phone',
      };

      const lastActive = engine.getLastActivityTime(data);

      expect(lastActive).toEqual(new Date('2025-01-15T20:00:00'));
    });

    it('uses lastActiveTime if provided', () => {
      const explicitTime = new Date('2025-01-15T22:45:00');
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [
          { timestamp: new Date('2025-01-15T08:00:00'), steps: 100 },
        ],
        totalSteps: 100,
        lastActiveTime: explicitTime,
        dataSource: 'phone',
      };

      const lastActive = engine.getLastActivityTime(data);

      expect(lastActive).toEqual(explicitTime);
    });
  });

  describe('getFirstActivityTime', () => {
    it('returns first active timestamp', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [
          { timestamp: new Date('2025-01-15T22:30:00'), steps: 50 },
          { timestamp: new Date('2025-01-15T07:15:00'), steps: 100 },
          { timestamp: new Date('2025-01-15T15:00:00'), steps: 200 },
        ],
        totalSteps: 350,
        dataSource: 'phone',
      };

      const firstActive = engine.getFirstActivityTime(data);

      expect(firstActive).toEqual(new Date('2025-01-15T07:15:00'));
    });

    it('returns null for empty data', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [],
        totalSteps: 0,
        dataSource: 'phone',
      };

      const firstActive = engine.getFirstActivityTime(data);

      expect(firstActive).toBeNull();
    });
  });

  describe('calculateActivityGaps', () => {
    it('identifies sleep-length gaps', () => {
      const data = createActivityDataWithGap({
        date: new Date('2025-01-15'),
        gapStart: new Date('2025-01-15T23:00:00'),
        gapEnd: new Date('2025-01-16T07:00:00'),
      });

      const gaps = engine.calculateActivityGaps(data);

      expect(gaps.length).toBeGreaterThanOrEqual(1);

      const sleepGap = gaps.find((g) => g.durationMinutes >= 400);
      expect(sleepGap).toBeDefined();
      expect(sleepGap?.isNighttime).toBe(true);
    });

    it('ignores short gaps', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [
          { timestamp: new Date('2025-01-15T08:00:00'), steps: 100 },
          { timestamp: new Date('2025-01-15T09:00:00'), steps: 100 }, // 1 hour gap
          { timestamp: new Date('2025-01-15T12:00:00'), steps: 100 }, // 3 hour gap
        ],
        totalSteps: 300,
        dataSource: 'phone',
      };

      const gaps = engine.calculateActivityGaps(data);

      // Should not include 1-hour or 3-hour gaps (min is 4 hours)
      expect(gaps.every((g) => g.durationMinutes >= 240)).toBe(true);
    });

    it('ignores very long gaps', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [
          { timestamp: new Date('2025-01-14T20:00:00'), steps: 100 },
          { timestamp: new Date('2025-01-16T10:00:00'), steps: 100 }, // 38 hours!
        ],
        totalSteps: 200,
        dataSource: 'phone',
      };

      const gaps = engine.calculateActivityGaps(data);

      // Should not include 38-hour gap (max is 12 hours)
      expect(gaps.every((g) => g.durationMinutes <= 720)).toBe(true);
    });

    it('marks nighttime gaps correctly', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [
          { timestamp: new Date('2025-01-15T22:00:00'), steps: 100 },
          { timestamp: new Date('2025-01-16T06:00:00'), steps: 100 },
        ],
        totalSteps: 200,
        dataSource: 'phone',
      };

      const gaps = engine.calculateActivityGaps(data);

      expect(gaps.length).toBe(1);
      expect(gaps[0].isNighttime).toBe(true);
    });
  });

  describe('calculateActivityPattern', () => {
    it('calculates average first/last activity times', () => {
      const multiDayData = [
        createActivityDataWithTimes(
          new Date('2025-01-15'),
          '07:00',
          '23:00'
        ),
        createActivityDataWithTimes(
          new Date('2025-01-16'),
          '07:30',
          '22:30'
        ),
        createActivityDataWithTimes(
          new Date('2025-01-17'),
          '06:30',
          '23:30'
        ),
      ];

      const pattern = engine.calculateActivityPattern(multiDayData);

      expect(pattern.sampleDays).toBe(3);
      // Average of 07:00, 07:30, 06:30 = ~07:00
      expect(pattern.typicalFirstActive).toMatch(/^0[67]:\d{2}$/);
      // Average of 23:00, 22:30, 23:30 = ~23:00
      expect(pattern.typicalLastActive).toMatch(/^2[23]:\d{2}$/);
    });

    it('calculates average daily steps', () => {
      const multiDayData = [
        createActivityDataWithSteps(new Date('2025-01-15'), 5000),
        createActivityDataWithSteps(new Date('2025-01-16'), 8000),
        createActivityDataWithSteps(new Date('2025-01-17'), 6000),
      ];

      const pattern = engine.calculateActivityPattern(multiDayData);

      // Average: (5000 + 8000 + 6000) / 3 = 6333
      expect(pattern.averageDailySteps).toBeGreaterThanOrEqual(6000);
      expect(pattern.averageDailySteps).toBeLessThanOrEqual(6500);
    });

    it('returns defaults for empty data', () => {
      const pattern = engine.calculateActivityPattern([]);

      expect(pattern.sampleDays).toBe(0);
      expect(pattern.averageDailySteps).toBe(0);
      expect(pattern.variabilityScore).toBe(1);
    });

    it('calculates variability score', () => {
      // Consistent times
      const consistentData = [
        createActivityDataWithTimes(new Date('2025-01-15'), '07:00', '23:00'),
        createActivityDataWithTimes(new Date('2025-01-16'), '07:00', '23:00'),
        createActivityDataWithTimes(new Date('2025-01-17'), '07:00', '23:00'),
      ];

      // Variable times
      const variableData = [
        createActivityDataWithTimes(new Date('2025-01-15'), '06:00', '21:00'),
        createActivityDataWithTimes(new Date('2025-01-16'), '09:00', '01:00'),
        createActivityDataWithTimes(new Date('2025-01-17'), '05:00', '23:00'),
      ];

      const consistentPattern = engine.calculateActivityPattern(consistentData);
      const variablePattern = engine.calculateActivityPattern(variableData);

      expect(consistentPattern.variabilityScore).toBeLessThan(
        variablePattern.variabilityScore
      );
    });
  });

  describe('assessDataQuality', () => {
    it('returns poor for insufficient data points', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [
          { timestamp: new Date('2025-01-15T12:00:00'), steps: 100 },
        ],
        totalSteps: 100,
        dataSource: 'phone',
      };

      expect(engine.assessDataQuality(data)).toBe('poor');
    });

    it('returns poor for zero steps', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(`2025-01-15T${(8 + i).toString().padStart(2, '0')}:00:00`),
          steps: 0,
        })),
        totalSteps: 0,
        dataSource: 'phone',
      };

      expect(engine.assessDataQuality(data)).toBe('poor');
    });

    it('returns fair for moderate data', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: Array.from({ length: 15 }, (_, i) => ({
          timestamp: new Date(`2025-01-15T${(10 + i).toString().padStart(2, '0')}:00:00`),
          steps: 100,
        })),
        totalSteps: 1500,
        dataSource: 'phone',
      };

      const quality = engine.assessDataQuality(data);
      expect(['fair', 'good']).toContain(quality);
    });

    it('returns good for comprehensive data', () => {
      // Create 25 data points spread from 6:00 to 22:00 (16 hours span)
      // All with > 10 steps (threshold for "active")
      const dataPoints = [];
      for (let h = 6; h <= 22; h++) {
        dataPoints.push({
          timestamp: new Date(`2025-01-15T${h.toString().padStart(2, '0')}:00:00`),
          steps: 150, // Deterministic value > minActiveSteps (10)
        });
        if (h < 22) {
          dataPoints.push({
            timestamp: new Date(`2025-01-15T${h.toString().padStart(2, '0')}:30:00`),
            steps: 150,
          });
        }
      }

      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints,
        totalSteps: 5000,
        dataSource: 'wearable',
      };

      expect(engine.assessDataQuality(data)).toBe('good');
    });
  });

  describe('calculateConfidence', () => {
    it('returns low for poor quality data', () => {
      const data: ActivityData = {
        date: new Date('2025-01-15'),
        dataPoints: [],
        totalSteps: 0,
        dataSource: 'phone',
      };

      expect(engine.calculateConfidence(data, 'activity_gap')).toBe('low');
    });

    it('returns higher confidence for gap method with good data', () => {
      const data = createActivityDataWithGap({
        date: new Date('2025-01-15'),
        gapStart: new Date('2025-01-15T23:00:00'),
        gapEnd: new Date('2025-01-16T07:00:00'),
      });

      const confidence = engine.calculateConfidence(data, 'activity_gap');
      expect(['medium', 'high']).toContain(confidence);
    });
  });

  describe('CALIBRATED UNCERTAINTY: Confidence levels', () => {
    it('marks phone-only data with appropriate confidence', () => {
      const data = createActivityDataWithGap({
        date: new Date('2025-01-15'),
        gapStart: new Date('2025-01-15T23:00:00'),
        gapEnd: new Date('2025-01-16T07:00:00'),
        source: 'phone',
      });

      const estimate = engine.estimateSleepFromActivity(data);

      // Phone data should have confidence and data quality defined
      expect(estimate.confidence).toBeDefined();
      expect(estimate.dataQuality).toBeDefined();
      // Reason should provide context about the estimation
      expect(estimate.reason.length).toBeGreaterThan(10);
    });

    it('includes uncertainty acknowledgment in reason', () => {
      const data = createActivityDataWithoutGap(new Date('2025-01-15'));

      const estimate = engine.estimateSleepFromActivity(data);

      // Should acknowledge uncertainty in some way
      expect(
        estimate.reason.includes('оценка') ||
        estimate.reason.includes('Оценка') ||
        estimate.reason.includes('точность') ||
        estimate.reason.includes('Недостаточно')
      ).toBe(true);
    });
  });
});

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create activity data with a clear gap (sleep period)
 */
function createActivityDataWithGap(params: {
  date: Date;
  gapStart: Date;
  gapEnd: Date;
  source?: 'phone' | 'wearable';
}): ActivityData {
  const { date, gapStart, gapEnd, source = 'phone' } = params;

  const dataPoints: ActivityDataPoint[] = [];

  // Add activity before gap
  for (let h = 6; h < gapStart.getHours(); h++) {
    dataPoints.push({
      timestamp: new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0),
      steps: 100 + Math.floor(Math.random() * 100),
      source,
    });
  }

  // Add activity at gap start
  dataPoints.push({
    timestamp: gapStart,
    steps: 50,
    source,
  });

  // Add activity at gap end
  dataPoints.push({
    timestamp: gapEnd,
    steps: 100,
    source,
  });

  // Add activity after gap
  for (let h = gapEnd.getHours() + 1; h < 22; h++) {
    dataPoints.push({
      timestamp: new Date(gapEnd.getFullYear(), gapEnd.getMonth(), gapEnd.getDate(), h, 0),
      steps: 100 + Math.floor(Math.random() * 100),
      source,
    });
  }

  return {
    date,
    dataPoints,
    totalSteps: dataPoints.reduce((sum, p) => sum + p.steps, 0),
    dataSource: source,
  };
}

/**
 * Create activity data without a clear gap
 */
function createActivityDataWithoutGap(date: Date): ActivityData {
  const dataPoints: ActivityDataPoint[] = [];

  // Spread activity throughout the day with small gaps
  for (let h = 7; h < 23; h++) {
    dataPoints.push({
      timestamp: new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0),
      steps: 100 + Math.floor(Math.random() * 200),
      source: 'phone',
    });
  }

  return {
    date,
    dataPoints,
    totalSteps: dataPoints.reduce((sum, p) => sum + p.steps, 0),
    dataSource: 'phone',
  };
}

/**
 * Create activity data with specific first/last times
 */
function createActivityDataWithTimes(
  date: Date,
  firstTime: string,
  lastTime: string
): ActivityData {
  const [firstH, firstM] = firstTime.split(':').map(Number);
  const [lastH, lastM] = lastTime.split(':').map(Number);

  const dataPoints: ActivityDataPoint[] = [];

  // First activity
  dataPoints.push({
    timestamp: new Date(date.getFullYear(), date.getMonth(), date.getDate(), firstH, firstM),
    steps: 100,
    source: 'phone',
  });

  // Middle activities
  const midStart = firstH + 1;
  const midEnd = lastH > firstH ? lastH : lastH + 24;
  for (let h = midStart; h < midEnd; h++) {
    const hour = h % 24;
    dataPoints.push({
      timestamp: new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + (h >= 24 ? 1 : 0),
        hour,
        0
      ),
      steps: 100,
      source: 'phone',
    });
  }

  // Last activity
  dataPoints.push({
    timestamp: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + (lastH < firstH ? 1 : 0),
      lastH,
      lastM
    ),
    steps: 100,
    source: 'phone',
  });

  return {
    date,
    dataPoints,
    totalSteps: dataPoints.reduce((sum, p) => sum + p.steps, 0),
    firstActiveTime: dataPoints[0].timestamp,
    lastActiveTime: dataPoints[dataPoints.length - 1].timestamp,
    dataSource: 'phone',
  };
}

/**
 * Create activity data with specific step count
 */
function createActivityDataWithSteps(date: Date, totalSteps: number): ActivityData {
  const dataPoints: ActivityDataPoint[] = [];
  const stepsPerHour = Math.round(totalSteps / 16);

  for (let h = 7; h < 23; h++) {
    dataPoints.push({
      timestamp: new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0),
      steps: stepsPerHour,
      source: 'phone',
    });
  }

  return {
    date,
    dataPoints,
    totalSteps,
    dataSource: 'phone',
  };
}
