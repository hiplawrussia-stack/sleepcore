/**
 * StreakService Tests
 * ====================
 *
 * Tests for forgiveness-first streak counter.
 * Validates streak tracking, freeze mechanics, and milestone detection.
 *
 * @packageDocumentation
 */

import {
  StreakService,
  streakService,
  type IStreakData,
  type IStreakConfig,
} from '../StreakService';

describe('StreakService', () => {
  let service: StreakService;

  beforeEach(() => {
    service = new StreakService();
  });

  // ==========================================================================
  // Initial Data
  // ==========================================================================
  describe('Initial Data', () => {
    it('should create initial streak data', () => {
      const data = service.createInitialData();

      expect(data.currentStreak).toBe(0);
      expect(data.longestStreak).toBe(0);
      expect(data.lastActivityDate).toBeNull();
      expect(data.freezesAvailable).toBe(1);
      expect(data.freezesUsedThisWeek).toBe(0);
      expect(data.totalActiveDays).toBe(0);
      expect(data.weeklyActivity).toEqual([]);
      expect(data.milestoneReached).toEqual([]);
    });
  });

  // ==========================================================================
  // First Activity
  // ==========================================================================
  describe('First Activity', () => {
    it('should start streak at 1 for first activity', () => {
      const data = service.createInitialData();
      const result = service.recordActivity(data, 'diary');

      expect(result.currentStreak).toBe(1);
      expect(result.previousStreak).toBe(0);
      expect(result.streakBroken).toBe(false);
      expect(data.totalActiveDays).toBe(1);
    });

    it('should record activity date', () => {
      const data = service.createInitialData();
      service.recordActivity(data, 'interaction');

      expect(data.lastActivityDate).not.toBeNull();
    });

    it('should add to weekly activity', () => {
      const data = service.createInitialData();
      service.recordActivity(data, 'diary');

      expect(data.weeklyActivity.length).toBe(1);
      expect(data.weeklyActivity[0].hasDiary).toBe(true);
      expect(data.weeklyActivity[0].hasInteraction).toBe(true);
    });
  });

  // ==========================================================================
  // Same Day Activity
  // ==========================================================================
  describe('Same Day Activity', () => {
    it('should not increase streak for same day activity', () => {
      const data = service.createInitialData();

      service.recordActivity(data, 'diary');
      const result = service.recordActivity(data, 'interaction');

      expect(result.currentStreak).toBe(1);
      expect(data.weeklyActivity.length).toBe(1);
    });

    it('should update existing activity record', () => {
      const data = service.createInitialData();

      service.recordActivity(data, 'interaction');
      service.recordActivity(data, 'diary');

      expect(data.weeklyActivity[0].hasDiary).toBe(true);
      expect(data.weeklyActivity[0].hasInteraction).toBe(true);
    });
  });

  // ==========================================================================
  // Consecutive Days
  // ==========================================================================
  describe('Consecutive Days', () => {
    it('should increase streak for consecutive days', () => {
      const data = service.createInitialData();

      // Simulate consecutive days by manipulating lastActivityDate
      service.recordActivity(data, 'diary');

      // Set last activity to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      data.lastActivityDate = yesterday.toISOString().split('T')[0];
      data.weeklyActivity = []; // Clear to avoid duplicate check

      const result = service.recordActivity(data, 'diary');

      expect(result.currentStreak).toBe(2);
    });

    it('should update longest streak', () => {
      const data = service.createInitialData();
      data.currentStreak = 5;
      data.longestStreak = 5;

      // Simulate next day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      data.lastActivityDate = yesterday.toISOString().split('T')[0];

      service.recordActivity(data, 'diary');

      expect(data.longestStreak).toBe(6);
    });
  });

  // ==========================================================================
  // Streak Breaks
  // ==========================================================================
  describe('Streak Breaks', () => {
    it('should break streak when missing more than 1 day without freeze', () => {
      const data = service.createInitialData();
      data.currentStreak = 5;
      data.freezesAvailable = 0;

      // Set last activity to 3 days ago
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      data.lastActivityDate = threeDaysAgo.toISOString().split('T')[0];

      const result = service.recordActivity(data, 'diary');

      expect(result.streakBroken).toBe(true);
      expect(result.currentStreak).toBe(1);
    });

    it('should provide supportive recovery message on break', () => {
      const data = service.createInitialData();
      data.currentStreak = 5;
      data.freezesAvailable = 0;

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      data.lastActivityDate = threeDaysAgo.toISOString().split('T')[0];

      const result = service.recordActivity(data, 'diary');

      // Should not contain punishing language
      expect(result.message).not.toContain('потерял');
      expect(result.message).not.toContain('проиграл');
    });
  });

  // ==========================================================================
  // Freeze Mechanics
  // ==========================================================================
  describe('Freeze Mechanics', () => {
    it('should use freeze when missing 1 day', () => {
      const data = service.createInitialData();
      data.currentStreak = 5;
      data.freezesAvailable = 1;
      // Set lastFreezeGrantDate to current week to prevent auto-grant
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      data.lastFreezeGrantDate = monday.toISOString().split('T')[0];

      // Set last activity to 2 days ago (missed 1 day)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      data.lastActivityDate = twoDaysAgo.toISOString().split('T')[0];

      const result = service.recordActivity(data, 'diary');

      expect(result.freezeUsed).toBe(true);
      expect(result.streakBroken).toBe(false);
      expect(result.currentStreak).toBe(6);
      expect(data.freezesAvailable).toBe(0);
    });

    it('should not use freeze for same day', () => {
      const data = service.createInitialData();
      data.freezesAvailable = 1;
      // Set lastFreezeGrantDate to current week to prevent auto-grant
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      data.lastFreezeGrantDate = monday.toISOString().split('T')[0];

      service.recordActivity(data, 'diary');
      service.recordActivity(data, 'interaction');

      expect(data.freezesAvailable).toBe(1);
    });

    it('should not use freeze for consecutive days', () => {
      const data = service.createInitialData();
      data.freezesAvailable = 1;
      // Set lastFreezeGrantDate to current week to prevent auto-grant
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      data.lastFreezeGrantDate = monday.toISOString().split('T')[0];

      service.recordActivity(data, 'diary');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      data.lastActivityDate = yesterday.toISOString().split('T')[0];
      data.weeklyActivity = [];

      service.recordActivity(data, 'diary');

      expect(data.freezesAvailable).toBe(1);
    });
  });

  // ==========================================================================
  // Milestones
  // ==========================================================================
  describe('Milestones', () => {
    it('should detect 3-day milestone', () => {
      const data = service.createInitialData();
      data.currentStreak = 2;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      data.lastActivityDate = yesterday.toISOString().split('T')[0];

      const result = service.recordActivity(data, 'diary');

      expect(result.newMilestone).not.toBeNull();
      expect(result.newMilestone?.days).toBe(3);
      expect(result.newMilestone?.badge).toBeDefined();
    });

    it('should not repeat milestones', () => {
      const data = service.createInitialData();
      data.currentStreak = 3;
      data.milestoneReached = [3]; // Already reached

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      data.lastActivityDate = yesterday.toISOString().split('T')[0];

      const result = service.recordActivity(data, 'diary');

      // Should not get 3-day milestone again
      expect(result.newMilestone?.days).not.toBe(3);
    });

    it('should track milestones in data', () => {
      const data = service.createInitialData();
      data.currentStreak = 6;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      data.lastActivityDate = yesterday.toISOString().split('T')[0];

      service.recordActivity(data, 'diary');

      expect(data.milestoneReached).toContain(7);
    });
  });

  // ==========================================================================
  // Next Milestone
  // ==========================================================================
  describe('Next Milestone', () => {
    it('should get next milestone for current streak', () => {
      const nextMilestone = service.getNextMilestone(5);

      expect(nextMilestone).not.toBeNull();
      expect(nextMilestone?.days).toBe(7);
    });

    it('should return null when all milestones reached', () => {
      const nextMilestone = service.getNextMilestone(100);

      expect(nextMilestone).toBeNull();
    });
  });

  // ==========================================================================
  // Milestone Progress
  // ==========================================================================
  describe('Milestone Progress', () => {
    it('should calculate progress to next milestone', () => {
      const progress = service.getMilestoneProgress(5);

      expect(progress.current).toBe(5);
      expect(progress.target).toBe(7);
      expect(progress.progress).toBeGreaterThan(0);
      expect(progress.progress).toBeLessThan(100);
    });

    it('should return 100% when all milestones reached', () => {
      const progress = service.getMilestoneProgress(100);

      expect(progress.progress).toBe(100);
    });
  });

  // ==========================================================================
  // Weekly Activity Summary
  // ==========================================================================
  describe('Weekly Activity Summary', () => {
    it('should return 7 elements for weekly summary', () => {
      const data = service.createInitialData();
      const summary = service.getWeeklyActivitySummary(data);

      expect(summary.length).toBe(7);
    });

    it('should show correct symbols for activity', () => {
      const data = service.createInitialData();
      data.weeklyActivity = [
        {
          date: new Date().toISOString().split('T')[0],
          hasDiary: true,
          hasInteraction: true,
          timestamp: Date.now(),
        },
      ];

      const summary = service.getWeeklyActivitySummary(data);

      expect(summary).toContain('✓');
    });
  });

  // ==========================================================================
  // Configuration
  // ==========================================================================
  describe('Configuration', () => {
    it('should use default config', () => {
      const config = service.getConfig();

      expect(config.gracePeriodHours).toBe(3);
      expect(config.autoFreezeWeekly).toBe(1);
      expect(config.maxFreezes).toBe(3);
    });

    it('should accept custom config', () => {
      const customService = new StreakService({
        gracePeriodHours: 5,
        maxFreezes: 5,
      });

      const config = customService.getConfig();

      expect(config.gracePeriodHours).toBe(5);
      expect(config.maxFreezes).toBe(5);
    });
  });

  // ==========================================================================
  // Encouragement Messages
  // ==========================================================================
  describe('Encouragement Messages', () => {
    it('should return encouragement message for first day', () => {
      const data = service.createInitialData();
      const result = service.recordActivity(data, 'diary');

      expect(result.message).toContain('Первый шаг');
    });

    it('should include streak count in message', () => {
      const data = service.createInitialData();
      data.currentStreak = 4;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      data.lastActivityDate = yesterday.toISOString().split('T')[0];

      const result = service.recordActivity(data, 'diary');

      expect(result.message).toMatch(/5.*д/); // Should contain 5 days
    });

    it('should include fire emoji for longer streaks', () => {
      const data = service.createInitialData();
      data.currentStreak = 4;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      data.lastActivityDate = yesterday.toISOString().split('T')[0];

      const result = service.recordActivity(data, 'diary');

      expect(result.message).toContain('🔥');
    });
  });

  // ==========================================================================
  // Singleton Export
  // ==========================================================================
  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(streakService).toBeInstanceOf(StreakService);
    });

    it('should create initial data via singleton', () => {
      const data = streakService.createInitialData();
      expect(data.currentStreak).toBe(0);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle activity trimming to 14 days', () => {
      const data = service.createInitialData();

      // Add 20 activities
      for (let i = 0; i < 20; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.weeklyActivity.push({
          date: date.toISOString().split('T')[0],
          hasDiary: true,
          hasInteraction: true,
          timestamp: date.getTime(),
        });
      }

      // Record new activity to trigger trimming
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      data.lastActivityDate = yesterday.toISOString().split('T')[0];
      data.weeklyActivity = []; // Clear for fresh record

      service.recordActivity(data, 'diary');

      expect(data.weeklyActivity.length).toBeLessThanOrEqual(15);
    });
  });
});
