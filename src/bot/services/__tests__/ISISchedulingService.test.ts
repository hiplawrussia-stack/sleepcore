/**
 * ISISchedulingService Tests
 * ==========================
 *
 * Tests for ISI (Insomnia Severity Index) assessment scheduling service.
 * Validates enrollment, assessment tracking, and clinical change detection.
 *
 * Note: Bot API calls are mocked since we can't test actual Telegram messaging.
 *
 * @packageDocumentation
 */

import { ISISchedulingService, createISISchedulingService } from '../ISISchedulingService';

// Mock the entire module to avoid requiring actual bot instance
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    stop: jest.fn(),
  })),
}));

// Create a mock bot
const createMockBot = () => ({
  api: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
  },
});

describe('ISISchedulingService', () => {
  let service: ISISchedulingService;
  let mockBot: ReturnType<typeof createMockBot>;
  const testUserId = 'user_test_123';
  const testChatId = 12345;

  beforeEach(() => {
    mockBot = createMockBot();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new ISISchedulingService(mockBot as any);
  });

  afterEach(() => {
    service.stop();
  });

  // ==========================================================================
  // Service Lifecycle
  // ==========================================================================
  describe('Service Lifecycle', () => {
    it('should start the service', () => {
      service.start();

      // Service should be running (no error thrown)
      expect(() => service.start()).not.toThrow();
    });

    it('should not double-start', () => {
      service.start();
      service.start();

      // Second start should be no-op
      expect(service.getEnrolledCount()).toBe(0);
    });

    it('should stop the service', () => {
      service.start();
      service.stop();

      // Should be able to start again after stop
      service.start();
      expect(service.getEnrolledCount()).toBe(0);
    });
  });

  // ==========================================================================
  // User Enrollment
  // ==========================================================================
  describe('User Enrollment', () => {
    it('should enroll user without baseline ISI', () => {
      service.enrollUser(testUserId, testChatId, 'Иван');

      const userData = service.getUserData(testUserId);

      expect(userData).toBeDefined();
      expect(userData?.chatId).toBe(testChatId);
      expect(userData?.odlikerId).toBe(testUserId);
      expect(userData?.userName).toBe('Иван');
      expect(userData?.nextAssessmentWeek).toBe(0);
      expect(userData?.isiHistory).toHaveLength(0);
    });

    it('should enroll user with baseline ISI', () => {
      service.enrollUser(testUserId, testChatId, 'Анна', 15);

      const userData = service.getUserData(testUserId);

      expect(userData).toBeDefined();
      expect(userData?.nextAssessmentWeek).toBe(2); // Skip to week 2
      expect(userData?.isiHistory).toHaveLength(1);
      expect(userData?.isiHistory[0].score).toBe(15);
      expect(userData?.isiHistory[0].week).toBe(0);
    });

    it('should unenroll user', () => {
      service.enrollUser(testUserId, testChatId);
      service.unenrollUser(testUserId);

      const userData = service.getUserData(testUserId);
      expect(userData).toBeUndefined();
    });

    it('should track enrollment date', () => {
      const before = new Date();
      service.enrollUser(testUserId, testChatId);
      const after = new Date();

      const userData = service.getUserData(testUserId);

      expect(userData?.enrollmentDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(userData?.enrollmentDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ==========================================================================
  // Assessment Recording
  // ==========================================================================
  describe('Assessment Recording', () => {
    beforeEach(() => {
      service.enrollUser(testUserId, testChatId, 'Тест');
    });

    it('should record ISI assessment', () => {
      service.recordAssessment(testUserId, 12);

      const userData = service.getUserData(testUserId);

      expect(userData?.isiHistory).toHaveLength(1);
      expect(userData?.lastAssessmentDate).toBeInstanceOf(Date);
      expect(userData?.reminderSent).toBe(false);
    });

    it('should add assessment to history', () => {
      service.recordAssessment(testUserId, 15);
      service.recordAssessment(testUserId, 12);
      service.recordAssessment(testUserId, 8);

      const userData = service.getUserData(testUserId);

      expect(userData?.isiHistory).toHaveLength(3);
      expect(userData?.isiHistory[0].score).toBe(15);
      expect(userData?.isiHistory[2].score).toBe(8);
    });

    it('should calculate next assessment week', () => {
      // Enrolled with baseline at week 0
      service.enrollUser('user_new', 999, 'New', 14);

      const userData = service.getUserData('user_new');
      // After baseline (week 0), next is week 2
      expect(userData?.nextAssessmentWeek).toBe(2);
    });

    it('should warn for non-enrolled user', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      service.recordAssessment('unknown_user', 10);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not enrolled')
      );

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Assessment Status
  // ==========================================================================
  describe('Assessment Status', () => {
    it('should check if assessment is due', () => {
      service.enrollUser(testUserId, testChatId);

      // Newly enrolled user with no baseline should be due (week 0)
      const isDue = service.isAssessmentDue(testUserId);
      expect(isDue).toBe(true);
    });

    it('should return false for unknown user', () => {
      const isDue = service.isAssessmentDue('unknown_user');
      expect(isDue).toBe(false);
    });

    it('should get next assessment info', () => {
      service.enrollUser(testUserId, testChatId, 'Тест', 12);

      const info = service.getNextAssessmentInfo(testUserId);

      expect(info).not.toBeNull();
      expect(info?.week).toBe(2);
      expect(info?.daysUntil).toBeGreaterThanOrEqual(0);
    });

    it('should return null for unknown user', () => {
      const info = service.getNextAssessmentInfo('unknown_user');
      expect(info).toBeNull();
    });

    it('should return null when study completed', () => {
      service.enrollUser(testUserId, testChatId);

      // Simulate completion by manipulating internal state
      const userData = service.getUserData(testUserId);
      if (userData) {
        // Force next assessment week to -1 (completed)
        (userData as { nextAssessmentWeek: number }).nextAssessmentWeek = -1;
      }

      const info = service.getNextAssessmentInfo(testUserId);
      expect(info).toBeNull();
    });
  });

  // ==========================================================================
  // Service Configuration
  // ==========================================================================
  describe('Service Configuration', () => {
    it('should return ISI schedule configuration', () => {
      const config = service.getConfig();

      expect(config.intervalDays).toBe(14);
      expect(config.notificationHour).toBe(10);
      expect(config.reminderAfterHours).toBe(24);
      expect(config.assessmentWeeks).toEqual([0, 2, 4, 6, 8, 12]);
      expect(config.cronExpression).toBe('0 10 * * *');
    });
  });

  // ==========================================================================
  // Enrolled Count
  // ==========================================================================
  describe('Enrolled Count', () => {
    it('should return enrolled users count', () => {
      expect(service.getEnrolledCount()).toBe(0);

      service.enrollUser('user1', 111);
      expect(service.getEnrolledCount()).toBe(1);

      service.enrollUser('user2', 222);
      expect(service.getEnrolledCount()).toBe(2);

      service.unenrollUser('user1');
      expect(service.getEnrolledCount()).toBe(1);
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================
  describe('Factory Function', () => {
    it('should create service via factory', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = createISISchedulingService(mockBot as any);

      expect(created).toBeInstanceOf(ISISchedulingService);
    });
  });

  // ==========================================================================
  // Clinical Change Detection
  // ==========================================================================
  describe('Clinical Change Detection', () => {
    beforeEach(() => {
      service.enrollUser(testUserId, testChatId, 'Тест', 18);
    });

    it('should log MCID achievement (7+ point reduction)', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Record improvement of 8 points (baseline was 18)
      service.recordAssessment(testUserId, 10);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('achieved MCID')
      );

      consoleSpy.mockRestore();
    });

    it('should log remission (ISI < 8)', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Record remission-level score
      service.recordAssessment(testUserId, 7);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('achieved remission')
      );

      consoleSpy.mockRestore();
    });

    it('should warn on significant worsening', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Record worsening of 8 points (baseline was 18)
      service.recordAssessment(testUserId, 26);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SAFETY ALERT')
      );

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle enrollment without username', () => {
      service.enrollUser(testUserId, testChatId);

      const userData = service.getUserData(testUserId);
      expect(userData?.userName).toBeUndefined();
    });

    it('should handle multiple assessments same day', () => {
      service.enrollUser(testUserId, testChatId);

      service.recordAssessment(testUserId, 15);
      service.recordAssessment(testUserId, 14);
      service.recordAssessment(testUserId, 13);

      const userData = service.getUserData(testUserId);
      expect(userData?.isiHistory).toHaveLength(3);
    });

    it('should handle re-enrollment of same user', () => {
      service.enrollUser(testUserId, testChatId, 'First', 15);
      service.enrollUser(testUserId, testChatId + 1, 'Second', 12);

      const userData = service.getUserData(testUserId);

      // Second enrollment should overwrite
      expect(userData?.userName).toBe('Second');
      expect(userData?.chatId).toBe(testChatId + 1);
    });

    it('should handle ISI score of 0', () => {
      service.enrollUser(testUserId, testChatId);

      service.recordAssessment(testUserId, 0);

      const userData = service.getUserData(testUserId);
      expect(userData?.isiHistory[0].score).toBe(0);
    });

    it('should handle high ISI scores', () => {
      service.enrollUser(testUserId, testChatId);

      service.recordAssessment(testUserId, 28); // Max ISI score

      const userData = service.getUserData(testUserId);
      expect(userData?.isiHistory[0].score).toBe(28);
    });
  });
});
