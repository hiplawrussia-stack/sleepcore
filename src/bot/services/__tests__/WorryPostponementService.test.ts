/**
 * WorryPostponementService Tests
 * ==============================
 *
 * Tests for MCT Worry Postponement protocol implementation.
 * Validates worry time setup, worry recording, session management,
 * and statistics calculation.
 *
 * @packageDocumentation
 */

import {
  WorryPostponementService,
  worryPostponementService,
  createWorryPostponementService,
  DEFAULT_WORRY_CONFIG,
  type IWorryPostponementConfig,
} from '../WorryPostponementService';

describe('WorryPostponementService', () => {
  let service: WorryPostponementService;
  const testUserId = 'user_test_123';

  beforeEach(() => {
    service = new WorryPostponementService();
  });

  afterEach(() => {
    service.resetUserData(testUserId);
  });

  // ==========================================================================
  // Configuration
  // ==========================================================================
  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.defaultWorryTime).toBe('18:30');
      expect(config.defaultDuration).toBe(20);
      expect(config.minHoursBeforeBed).toBe(3);
      expect(config.maxHoursBeforeBed).toBe(6);
      expect(config.maxDailyWorries).toBe(10);
      expect(config.reminderMinutesBefore).toBe(15);
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<IWorryPostponementConfig> = {
        defaultWorryTime: '17:00',
        defaultDuration: 30,
        maxDailyWorries: 5,
      };

      const customService = new WorryPostponementService(customConfig);
      const config = customService.getConfig();

      expect(config.defaultWorryTime).toBe('17:00');
      expect(config.defaultDuration).toBe(30);
      expect(config.maxDailyWorries).toBe(5);
      // Default values still apply
      expect(config.enabled).toBe(true);
    });

    it('should export DEFAULT_WORRY_CONFIG', () => {
      expect(DEFAULT_WORRY_CONFIG).toBeDefined();
      expect(DEFAULT_WORRY_CONFIG.enabled).toBe(true);
    });
  });

  // ==========================================================================
  // Worry Time Setup
  // ==========================================================================
  describe('Worry Time Setup', () => {
    it('should set up worry time for user', () => {
      const settings = service.setupWorryTime(testUserId, '18:00', 25);

      expect(settings.userId).toBe(testUserId);
      expect(settings.scheduledTime).toBe('18:00');
      expect(settings.duration).toBe(25);
      expect(settings.enabledDays).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(settings.createdAt).toBeInstanceOf(Date);
    });

    it('should clamp duration to 15-30 minutes', () => {
      const short = service.setupWorryTime(testUserId, '18:00', 5);
      expect(short.duration).toBe(15);

      service.resetUserData(testUserId);

      const long = service.setupWorryTime(testUserId, '18:00', 60);
      expect(long.duration).toBe(30);
    });

    it('should get worry time settings', () => {
      service.setupWorryTime(testUserId, '19:00');
      const settings = service.getWorryTimeSettings(testUserId);

      expect(settings).not.toBeNull();
      expect(settings?.scheduledTime).toBe('19:00');
    });

    it('should return null for unknown user settings', () => {
      const settings = service.getWorryTimeSettings('unknown_user');
      expect(settings).toBeNull();
    });

    it('should update worry time settings', () => {
      service.setupWorryTime(testUserId, '18:00', 20);

      const updated = service.updateWorryTimeSettings(testUserId, {
        scheduledTime: '17:30',
        duration: 25,
        enabledDays: [1, 2, 3, 4, 5], // Weekdays only
      });

      expect(updated).not.toBeNull();
      expect(updated?.scheduledTime).toBe('17:30');
      expect(updated?.duration).toBe(25);
      expect(updated?.enabledDays).toEqual([1, 2, 3, 4, 5]);
    });

    it('should return null when updating unknown user', () => {
      const updated = service.updateWorryTimeSettings('unknown_user', {
        scheduledTime: '17:00',
      });
      expect(updated).toBeNull();
    });

    it('should suggest worry times based on bedtime', () => {
      const suggestions = service.suggestWorryTime(23); // 11 PM bedtime

      expect(suggestions.length).toBe(4);
      expect(suggestions).toContain('19:00');
      expect(suggestions).toContain('19:30');
      expect(suggestions).toContain('18:00');
      expect(suggestions).toContain('18:30');
    });

    it('should handle early bedtime (wrap around midnight)', () => {
      const suggestions = service.suggestWorryTime(2); // 2 AM bedtime

      expect(suggestions.length).toBe(4);
      expect(suggestions).toContain('22:00');
      expect(suggestions).toContain('21:00');
    });
  });

  // ==========================================================================
  // Worry Recording
  // ==========================================================================
  describe('Worry Recording', () => {
    it('should record a worry entry', () => {
      const worry = service.recordWorry(
        testUserId,
        'Worried about work deadline',
        'daytime',
        7
      );

      expect(worry.id).toMatch(/^worry_\d+_/);
      expect(worry.userId).toBe(testUserId);
      expect(worry.content).toBe('Worried about work deadline');
      expect(worry.context).toBe('daytime');
      expect(worry.distressLevel).toBe(7);
      expect(worry.processed).toBe(false);
      expect(worry.timestamp).toBeInstanceOf(Date);
    });

    it('should use default values for optional params', () => {
      const worry = service.recordWorry(testUserId, 'General worry');

      expect(worry.context).toBe('daytime');
      expect(worry.distressLevel).toBe(5);
    });

    it('should clamp distress level to 0-10', () => {
      const lowWorry = service.recordWorry(testUserId, 'Low', 'daytime', -5);
      expect(lowWorry.distressLevel).toBe(0);

      const highWorry = service.recordWorry(testUserId, 'High', 'daytime', 15);
      expect(highWorry.distressLevel).toBe(10);
    });

    it('should trim worry content', () => {
      const worry = service.recordWorry(testUserId, '  Worry with spaces  ');
      expect(worry.content).toBe('Worry with spaces');
    });

    it('should get today\'s unprocessed worries', () => {
      service.recordWorry(testUserId, 'Worry 1');
      service.recordWorry(testUserId, 'Worry 2');

      const worries = service.getTodaysWorries(testUserId);

      expect(worries.length).toBe(2);
      expect(worries[0].content).toBe('Worry 1');
      expect(worries[1].content).toBe('Worry 2');
    });

    it('should get all unprocessed worries', () => {
      service.recordWorry(testUserId, 'Worry 1');
      service.recordWorry(testUserId, 'Worry 2');

      const worries = service.getUnprocessedWorries(testUserId);

      expect(worries.length).toBe(2);
    });

    it('should check daily limit', () => {
      const limitService = new WorryPostponementService({ maxDailyWorries: 2 });

      expect(limitService.hasReachedDailyLimit(testUserId)).toBe(false);

      limitService.recordWorry(testUserId, 'Worry 1');
      limitService.recordWorry(testUserId, 'Worry 2');

      expect(limitService.hasReachedDailyLimit(testUserId)).toBe(true);
    });

    it('should handle different contexts', () => {
      const contexts = ['daytime', 'pre_sleep', 'during_night', 'morning'] as const;

      for (const context of contexts) {
        const worry = service.recordWorry(testUserId, `Worry ${context}`, context);
        expect(worry.context).toBe(context);
      }
    });
  });

  // ==========================================================================
  // Worry Time Session
  // ==========================================================================
  describe('Worry Time Session', () => {
    beforeEach(() => {
      service.setupWorryTime(testUserId, '18:00', 20);
    });

    it('should start a worry time session', () => {
      const session = service.startWorrySession(testUserId);

      expect(session.id).toMatch(/^ws_\d+_/);
      expect(session.userId).toBe(testUserId);
      expect(session.completed).toBe(false);
      expect(session.processedWorries).toEqual([]);
      expect(session.actualStartTime).toBeInstanceOf(Date);
    });

    it('should process a worry during session', () => {
      service.recordWorry(testUserId, 'Test worry');
      const worries = service.getTodaysWorries(testUserId);
      const worryId = worries[0].id;

      service.startWorrySession(testUserId);
      const processed = service.processWorry(
        testUserId,
        worryId,
        'solvable',
        'Schedule a meeting',
        3
      );

      expect(processed).not.toBeNull();
      expect(processed?.processed).toBe(true);
      expect(processed?.category).toBe('solvable');
      expect(processed?.actionPlan).toBe('Schedule a meeting');
      expect(processed?.distressAfter).toBe(3);
    });

    it('should mark worry as unsolvable', () => {
      service.recordWorry(testUserId, 'World problems');
      const worries = service.getTodaysWorries(testUserId);
      const worryId = worries[0].id;

      service.startWorrySession(testUserId);
      const processed = service.processWorry(
        testUserId,
        worryId,
        'unsolvable',
        undefined,
        4
      );

      expect(processed?.category).toBe('unsolvable');
      expect(processed?.actionPlan).toBeUndefined();
    });

    it('should mark worry as already resolved', () => {
      service.recordWorry(testUserId, 'Minor issue');
      const worries = service.getTodaysWorries(testUserId);
      const worryId = worries[0].id;

      service.startWorrySession(testUserId);
      const processed = service.processWorry(
        testUserId,
        worryId,
        'already_resolved'
      );

      expect(processed?.category).toBe('already_resolved');
    });

    it('should return null for unknown worry', () => {
      service.startWorrySession(testUserId);
      const processed = service.processWorry(
        testUserId,
        'nonexistent_worry',
        'solvable'
      );

      expect(processed).toBeNull();
    });

    it('should complete worry session', () => {
      service.recordWorry(testUserId, 'Test worry');
      service.startWorrySession(testUserId);

      const session = service.completeWorrySession(
        testUserId,
        7,  // distress before
        3,  // distress after
        'Felt better after processing'
      );

      expect(session).not.toBeNull();
      expect(session?.completed).toBe(true);
      expect(session?.distressBefore).toBe(7);
      expect(session?.distressAfter).toBe(3);
      expect(session?.notes).toBe('Felt better after processing');
      expect(session?.endTime).toBeInstanceOf(Date);
    });

    it('should skip worry session', () => {
      service.startWorrySession(testUserId);

      const session = service.skipWorrySession(testUserId, 'Feeling too tired');

      expect(session).not.toBeNull();
      expect(session?.completed).toBe(true);
      expect(session?.skipReason).toBe('Feeling too tired');
    });

    it('should return null when completing without active session', () => {
      const session = service.completeWorrySession(testUserId, 5, 3);
      expect(session).toBeNull();
    });

    it('should return null when skipping without active session', () => {
      const session = service.skipWorrySession(testUserId, 'No reason');
      expect(session).toBeNull();
    });
  });

  // ==========================================================================
  // Instructions and Guidance
  // ==========================================================================
  describe('Instructions and Guidance', () => {
    it('should return postponement instructions', () => {
      const instructions = service.getPostponementInstructions();

      expect(instructions.length).toBe(5);
      expect(instructions[0]).toContain('Заметьте беспокойство');
      expect(instructions[2]).toContain('время для беспокойства');
    });

    it('should return worry time instructions', () => {
      const instructions = service.getWorryTimeInstructions();

      expect(instructions.length).toBe(6);
      expect(instructions[0]).toContain('Просмотрите записанные');
      expect(instructions[2]).toContain('решаемых');
    });

    it('should return night protocol instructions', () => {
      const instructions = service.getNightProtocolInstructions();

      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0]).toContain('проснулись');
      expect(instructions.join('\n')).toContain('полусне');
    });

    it('should return solvable problem guidance', () => {
      const guidance = service.getSolvableProblemGuidance();

      expect(guidance.length).toBeGreaterThan(0);
      expect(guidance[0]).toContain('РЕШАЕМАЯ');
      expect(guidance.join('\n')).toContain('план действий');
    });

    it('should return unsolvable problem guidance', () => {
      const guidance = service.getUnsolvableProblemGuidance();

      expect(guidance.length).toBeGreaterThan(0);
      expect(guidance[0]).toContain('НЕРЕШАЕМАЯ');
      expect(guidance.join('\n')).toContain('принятие');
    });
  });

  // ==========================================================================
  // Response Generation
  // ==========================================================================
  describe('Response Generation', () => {
    it('should generate daytime worry recorded response', () => {
      const worry = service.recordWorry(testUserId, 'Test');
      const response = service.generateWorryRecordedResponse(worry, false);

      expect(response).toContain('Записала беспокойство');
      expect(response).toContain('позже');
    });

    it('should generate night worry recorded response', () => {
      const worry = service.recordWorry(testUserId, 'Night worry', 'during_night');
      const response = service.generateWorryRecordedResponse(worry, true);

      expect(response).toContain('Записала беспокойство');
      expect(response).toContain('ночь');
      expect(response).toContain('отдохнуть');
    });

    it('should include scheduled time in response when set', () => {
      service.setupWorryTime(testUserId, '19:00');
      const worry = service.recordWorry(testUserId, 'Test');
      const response = service.generateWorryRecordedResponse(worry, false);

      expect(response).toContain('19:00');
      expect(response).toContain('времени для беспокойства');
    });

    it('should generate reminder message with worries', () => {
      service.setupWorryTime(testUserId, '18:00');
      service.recordWorry(testUserId, 'Worry 1');
      service.recordWorry(testUserId, 'Worry 2');
      service.recordWorry(testUserId, 'Worry 3');

      const message = service.generateReminderMessage(testUserId);

      expect(message).toContain('Время для беспокойства');
      expect(message).toContain('3');
      expect(message).toContain('беспокойства');
    });

    it('should generate reminder message with no worries', () => {
      const message = service.generateReminderMessage(testUserId);

      expect(message).toContain('Время для беспокойства');
      expect(message).toContain('отличный результат');
    });

    it('should use correct Russian plural forms', () => {
      // 1 worry
      service.recordWorry(testUserId, 'Single');
      let message = service.generateReminderMessage(testUserId);
      expect(message).toContain('1 беспокойство');

      // 3 worries
      service.recordWorry(testUserId, 'Second');
      service.recordWorry(testUserId, 'Third');
      message = service.generateReminderMessage(testUserId);
      expect(message).toContain('3 беспокойства');

      // 5+ worries
      service.recordWorry(testUserId, 'Fourth');
      service.recordWorry(testUserId, 'Fifth');
      message = service.generateReminderMessage(testUserId);
      expect(message).toContain('5 беспокойств');
    });
  });

  // ==========================================================================
  // Statistics
  // ==========================================================================
  describe('Statistics', () => {
    it('should calculate basic statistics', () => {
      service.recordWorry(testUserId, 'Worry 1', 'daytime', 7);
      service.recordWorry(testUserId, 'Worry 2', 'daytime', 8);

      const stats = service.getStatistics(testUserId);

      expect(stats.totalWorries).toBe(2);
      expect(stats.processedWorries).toBe(0);
      expect(stats.sessionsCompleted).toBe(0);
      expect(stats.sessionsSkipped).toBe(0);
    });

    it('should calculate distress reduction', () => {
      service.setupWorryTime(testUserId, '18:00');

      // Record and process worries
      service.recordWorry(testUserId, 'Worry 1', 'daytime', 8);
      const worries = service.getUnprocessedWorries(testUserId);

      service.startWorrySession(testUserId);
      service.processWorry(testUserId, worries[0].id, 'solvable', 'Plan', 3);
      service.completeWorrySession(testUserId, 7, 3);

      const stats = service.getStatistics(testUserId);

      expect(stats.processedWorries).toBe(1);
      expect(stats.avgDistressReduction).toBe(5); // 8 - 3
      expect(stats.sessionsCompleted).toBe(1);
    });

    it('should calculate solvable percentage', () => {
      service.setupWorryTime(testUserId, '18:00');

      service.recordWorry(testUserId, 'Solvable 1', 'daytime', 5);
      service.recordWorry(testUserId, 'Solvable 2', 'daytime', 5);
      service.recordWorry(testUserId, 'Unsolvable', 'daytime', 5);

      const worries = service.getUnprocessedWorries(testUserId);

      service.startWorrySession(testUserId);
      service.processWorry(testUserId, worries[0].id, 'solvable');
      service.processWorry(testUserId, worries[1].id, 'solvable');
      service.processWorry(testUserId, worries[2].id, 'unsolvable');

      const stats = service.getStatistics(testUserId);

      expect(stats.solvablePercentage).toBeCloseTo(66.67, 1);
    });

    it('should track auto-resolved worries', () => {
      service.setupWorryTime(testUserId, '18:00');

      service.recordWorry(testUserId, 'Resolved itself', 'daytime', 5);
      const worries = service.getUnprocessedWorries(testUserId);

      service.startWorrySession(testUserId);
      service.processWorry(testUserId, worries[0].id, 'already_resolved');

      const stats = service.getStatistics(testUserId);

      expect(stats.autoResolvedCount).toBe(1);
    });

    it('should track skipped sessions', () => {
      service.setupWorryTime(testUserId, '18:00');

      service.startWorrySession(testUserId);
      service.skipWorrySession(testUserId, 'Too busy');

      const stats = service.getStatistics(testUserId);

      expect(stats.sessionsSkipped).toBe(1);
      expect(stats.sessionsCompleted).toBe(0);
    });

    it('should calculate weekly trend', () => {
      const stats = service.getStatistics(testUserId);

      expect(stats.weeklyTrend).toHaveLength(4);
      expect(stats.weeklyTrend.every(n => typeof n === 'number')).toBe(true);
    });
  });

  // ==========================================================================
  // Effectiveness Summary
  // ==========================================================================
  describe('Effectiveness Summary', () => {
    it('should report insufficient data', () => {
      const summary = service.getEffectivenessSummary(testUserId);

      expect(summary.isEffective).toBe(false);
      expect(summary.summary).toContain('Недостаточно данных');
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });

    it('should evaluate effectiveness with enough data', () => {
      service.setupWorryTime(testUserId, '18:00');

      // Simulate 7+ completed sessions with good distress reduction
      for (let i = 0; i < 8; i++) {
        service.recordWorry(testUserId, `Worry ${i}`, 'daytime', 7);
        const worries = service.getUnprocessedWorries(testUserId);
        const lastWorry = worries[worries.length - 1];

        service.startWorrySession(testUserId);
        service.processWorry(testUserId, lastWorry.id, 'solvable', 'Plan', 4);
        service.completeWorrySession(testUserId, 7, 4);
      }

      const summary = service.getEffectivenessSummary(testUserId);

      expect(summary.isEffective).toBe(true);
      expect(summary.summary).toContain('снижение дистресса');
    });
  });

  // ==========================================================================
  // Helper Methods
  // ==========================================================================
  describe('Helper Methods', () => {
    it('should check if currently worry time', () => {
      // Setup worry time for current hour
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      service.setupWorryTime(testUserId, currentTime, 30);

      const isWorryTime = service.isWorryTime(testUserId);
      expect(isWorryTime).toBe(true);
    });

    it('should return false for worry time without settings', () => {
      const isWorryTime = service.isWorryTime(testUserId);
      expect(isWorryTime).toBe(false);
    });

    it('should check reminder timing', () => {
      const shouldSend = service.shouldSendReminder(testUserId);
      // Without settings, should return false
      expect(shouldSend).toBe(false);
    });

    it('should get CSD integration data', () => {
      // Without enough data
      let csdData = service.getCSDIntegrationData(testUserId);
      expect(csdData.available).toBe(false);

      // Add enough worries
      for (let i = 0; i < 10; i++) {
        service.recordWorry(testUserId, `Worry ${i}`, 'daytime', 5 + (i % 3));
      }

      csdData = service.getCSDIntegrationData(testUserId);
      expect(csdData.available).toBe(true);
      expect(csdData.worryFrequency).toBeGreaterThan(0);
      expect(csdData.avgDistress).toBeGreaterThan(0);
      expect(['improving', 'stable', 'worsening']).toContain(csdData.trend);
    });

    it('should reset user data', () => {
      service.setupWorryTime(testUserId, '18:00');
      service.recordWorry(testUserId, 'Test worry');

      service.resetUserData(testUserId);

      expect(service.getWorryTimeSettings(testUserId)).toBeNull();
      expect(service.getTodaysWorries(testUserId)).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Factory and Singleton
  // ==========================================================================
  describe('Factory and Singleton', () => {
    it('should create service via factory', () => {
      const created = createWorryPostponementService({ defaultDuration: 25 });

      expect(created).toBeInstanceOf(WorryPostponementService);
      expect(created.getConfig().defaultDuration).toBe(25);
    });

    it('should export singleton instance', () => {
      expect(worryPostponementService).toBeInstanceOf(WorryPostponementService);
    });

    it('should record worry via singleton', () => {
      const worry = worryPostponementService.recordWorry(
        'singleton_user',
        'Test'
      );

      expect(worry.content).toBe('Test');
      worryPostponementService.resetUserData('singleton_user');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty user id gracefully', () => {
      const worry = service.recordWorry('', 'Empty user');
      expect(worry.userId).toBe('');
    });

    it('should handle empty worry content', () => {
      const worry = service.recordWorry(testUserId, '');
      expect(worry.content).toBe('');
    });

    it('should handle concurrent worry recording', () => {
      const promises = Array(5).fill(null).map((_, i) =>
        Promise.resolve(service.recordWorry(testUserId, `Worry ${i}`))
      );

      Promise.all(promises).then(results => {
        expect(results.length).toBe(5);
        expect(new Set(results.map(r => r.id)).size).toBe(5); // All unique IDs
      });
    });

    it('should handle very long worry content', () => {
      const longContent = 'A'.repeat(10000);
      const worry = service.recordWorry(testUserId, longContent);
      expect(worry.content.length).toBe(10000);
    });

    it('should handle statistics for user with no data', () => {
      const stats = service.getStatistics('nonexistent_user');

      expect(stats.totalWorries).toBe(0);
      expect(stats.processedWorries).toBe(0);
      expect(stats.avgDistressReduction).toBe(0);
      expect(stats.solvablePercentage).toBe(0);
    });
  });
});
