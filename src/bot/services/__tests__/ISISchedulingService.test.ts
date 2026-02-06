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

  // ==========================================================================
  // Repository Integration
  // ==========================================================================
  describe('Repository Integration', () => {
    let mockRepo: {
      findAll: jest.Mock;
      upsert: jest.Mock;
      deleteByUserId: jest.Mock;
    };

    beforeEach(() => {
      mockRepo = {
        findAll: jest.fn(),
        upsert: jest.fn(),
        deleteByUserId: jest.fn(),
      };
    });

    it('should load users from repository on setRepository', async () => {
      const existingUsers = [
        {
          userId: 'user_db_1',
          chatId: 111,
          userName: 'DBUser1',
          enrollmentDate: new Date('2026-01-01'),
          lastAssessmentDate: new Date('2026-01-15'),
          lastAssessmentWeek: 2,
          nextAssessmentWeek: 4,
          reminderSent: false,
          isiHistory: [{ week: 0, score: 15, date: new Date('2026-01-01') }],
        },
        {
          userId: 'user_db_2',
          chatId: 222,
          userName: 'DBUser2',
          enrollmentDate: new Date('2026-01-10'),
          lastAssessmentDate: undefined,
          lastAssessmentWeek: undefined,
          nextAssessmentWeek: 0,
          reminderSent: true,
          isiHistory: [],
        },
      ];
      mockRepo.findAll.mockResolvedValue(existingUsers);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);

      expect(mockRepo.findAll).toHaveBeenCalled();
      expect(service.getEnrolledCount()).toBe(2);
      expect(service.getUserData('user_db_1')).toBeDefined();
      expect(service.getUserData('user_db_2')).toBeDefined();
    });

    it('should handle repository load failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRepo.findAll.mockRejectedValue(new Error('DB connection failed'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DB load failed'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should persist user on enrollment when repository is set', async () => {
      mockRepo.findAll.mockResolvedValue([]);
      mockRepo.upsert.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);
      service.enrollUser(testUserId, testChatId, 'Тест', 12);

      // Wait for async persistence
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          userId: testUserId,
          chatId: testChatId,
          userName: 'Тест',
        })
      );
    });

    it('should persist user on assessment when repository is set', async () => {
      mockRepo.findAll.mockResolvedValue([]);
      mockRepo.upsert.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);
      service.enrollUser(testUserId, testChatId);
      service.recordAssessment(testUserId, 15);

      // Wait for async persistence
      await new Promise(resolve => setTimeout(resolve, 10));

      // Called twice: once for enrollment, once for assessment
      expect(mockRepo.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle persistence failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRepo.findAll.mockResolvedValue([]);
      mockRepo.upsert.mockRejectedValue(new Error('Write failed'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);
      service.enrollUser(testUserId, testChatId, 'Тест');

      // Wait for async error
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist user'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should delete user from repository on unenroll', async () => {
      mockRepo.findAll.mockResolvedValue([]);
      mockRepo.upsert.mockResolvedValue(undefined);
      mockRepo.deleteByUserId.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);
      service.enrollUser(testUserId, testChatId);
      service.unenrollUser(testUserId);

      // Wait for async deletion
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRepo.deleteByUserId).toHaveBeenCalledWith(testUserId);
    });

    it('should handle delete failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRepo.findAll.mockResolvedValue([]);
      mockRepo.upsert.mockResolvedValue(undefined);
      mockRepo.deleteByUserId.mockRejectedValue(new Error('Delete failed'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);
      service.enrollUser(testUserId, testChatId);
      service.unenrollUser(testUserId);

      // Wait for async error
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete user'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Check and Send Assessments
  // ==========================================================================
  describe('checkAndSendAssessments', () => {
    beforeEach(() => {
      // Enroll user with past enrollment date so they're due for assessment
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 14); // 14 days ago = week 2

      service.enrollUser(testUserId, testChatId, 'Тест', 15);
      const userData = service.getUserData(testUserId);
      if (userData) {
        // Manipulate enrollment date to simulate time passage
        (userData as { enrollmentDate: Date }).enrollmentDate = pastDate;
      }
    });

    it('should send assessment notification when due', async () => {
      // Trigger the check (access private method via any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).checkAndSendAssessments();

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('Время оценки сна'),
        expect.objectContaining({
          parse_mode: 'Markdown',
          reply_markup: expect.any(Object),
        })
      );
    });

    it('should skip users with completed study', async () => {
      const userData = service.getUserData(testUserId);
      if (userData) {
        (userData as { nextAssessmentWeek: number }).nextAssessmentWeek = -1;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).checkAndSendAssessments();

      expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    });

    it('should set reminderSent flag after sending', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).checkAndSendAssessments();

      const userData = service.getUserData(testUserId);
      expect(userData?.reminderSent).toBe(true);
    });

    it('should send follow-up reminder if assessment not completed', async () => {
      // First send marks reminderSent = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).checkAndSendAssessments();
      mockBot.api.sendMessage.mockClear();

      // Set last assessment date to > 24 hours ago
      const userData = service.getUserData(testUserId);
      if (userData) {
        const oldDate = new Date();
        oldDate.setHours(oldDate.getHours() - 25); // 25 hours ago
        (userData as { lastAssessmentDate: Date }).lastAssessmentDate = oldDate;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).checkAndSendAssessments();

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('напоминаю об оценке сна'),
        expect.any(Object)
      );
    });

    it('should not send follow-up if within reminder window', async () => {
      // First send marks reminderSent = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).checkAndSendAssessments();
      mockBot.api.sendMessage.mockClear();

      // Set last assessment date to < 24 hours ago
      const userData = service.getUserData(testUserId);
      if (userData) {
        const recentDate = new Date();
        recentDate.setHours(recentDate.getHours() - 12); // 12 hours ago
        (userData as { lastAssessmentDate: Date }).lastAssessmentDate = recentDate;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).checkAndSendAssessments();

      expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle send errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockBot.api.sendMessage.mockRejectedValue(new Error('Network error'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).checkAndSendAssessments();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing user'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Assessment Notifications
  // ==========================================================================
  describe('sendAssessmentNotification', () => {
    it('should include week 0 description for baseline', async () => {
      service.enrollUser(testUserId, testChatId, 'Тест');
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendAssessmentNotification(userData, 0);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('начальная оценка'),
        expect.any(Object)
      );
    });

    it('should include week 8 description for end of treatment', async () => {
      service.enrollUser(testUserId, testChatId, 'Тест');
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendAssessmentNotification(userData, 8);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('завершение основной программы'),
        expect.any(Object)
      );
    });

    it('should include week 12 description for follow-up', async () => {
      service.enrollUser(testUserId, testChatId, 'Тест');
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendAssessmentNotification(userData, 12);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('контрольная оценка'),
        expect.any(Object)
      );
    });

    it('should include generic week description for middle weeks', async () => {
      service.enrollUser(testUserId, testChatId, 'Тест');
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendAssessmentNotification(userData, 4);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('неделя 4'),
        expect.any(Object)
      );
    });

    it('should use default name when userName is not set', async () => {
      service.enrollUser(testUserId, testChatId); // No userName
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendAssessmentNotification(userData, 0);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('друг'),
        expect.any(Object)
      );
    });

    it('should include proper keyboard buttons', async () => {
      service.enrollUser(testUserId, testChatId, 'Тест');
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendAssessmentNotification(userData, 0);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ callback_data: 'isi_schedule:start_assessment' }),
              ]),
              expect.arrayContaining([
                expect.objectContaining({ callback_data: 'isi_schedule:remind_later' }),
              ]),
            ]),
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Follow-up Reminder
  // ==========================================================================
  describe('sendFollowUpReminder', () => {
    it('should send follow-up reminder message', async () => {
      service.enrollUser(testUserId, testChatId, 'Анна');
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendFollowUpReminder(userData);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('напоминаю об оценке сна'),
        expect.any(Object)
      );
    });

    it('should use default name when userName is not set', async () => {
      service.enrollUser(testUserId, testChatId); // No userName
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendFollowUpReminder(userData);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('друг'),
        expect.any(Object)
      );
    });

    it('should include start assessment button', async () => {
      service.enrollUser(testUserId, testChatId, 'Тест');
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendFollowUpReminder(userData);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ callback_data: 'isi_schedule:start_assessment' }),
              ]),
            ]),
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Progress Messages
  // ==========================================================================
  describe('getProgressMessage', () => {
    it('should return baseline message for first assessment', () => {
      service.enrollUser(testUserId, testChatId);
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (service as any).getProgressMessage(userData);

      expect(message).toContain('базовую линию');
    });

    it('should return excellent progress for 7+ point reduction', () => {
      service.enrollUser(testUserId, testChatId, 'Тест', 20);
      service.recordAssessment(testUserId, 12); // 8 point reduction
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (service as any).getProgressMessage(userData);

      expect(message).toContain('Отличный прогресс');
      expect(message).toContain('8 баллов');
    });

    it('should return good progress for 4-6 point reduction', () => {
      service.enrollUser(testUserId, testChatId, 'Тест', 18);
      service.recordAssessment(testUserId, 13); // 5 point reduction
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (service as any).getProgressMessage(userData);

      expect(message).toContain('Хороший прогресс');
      expect(message).toContain('5 балла');
    });

    it('should return positive message for small reduction (1-3 points)', () => {
      service.enrollUser(testUserId, testChatId, 'Тест', 15);
      service.recordAssessment(testUserId, 13); // 2 point reduction
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (service as any).getProgressMessage(userData);

      expect(message).toContain('2 балла');
      expect(message).toContain('Каждый шаг важен');
    });

    it('should return stable message for no change', () => {
      service.enrollUser(testUserId, testChatId, 'Тест', 15);
      service.recordAssessment(testUserId, 15); // Same score
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (service as any).getProgressMessage(userData);

      expect(message).toContain('на том же уровне');
    });

    it('should return adjustment message for worsening', () => {
      service.enrollUser(testUserId, testChatId, 'Тест', 12);
      service.recordAssessment(testUserId, 18); // Worsened
      const userData = service.getUserData(testUserId)!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (service as any).getProgressMessage(userData);

      expect(message).toContain('скорректируем программу');
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  describe('handleSendError', () => {
    it('should remove user when bot is blocked (403 error)', async () => {
      service.enrollUser(testUserId, testChatId, 'Тест');
      const userData = service.getUserData(testUserId)!;

      const error = new Error('Forbidden') as Error & { error_code: number };
      error.error_code = 403;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).handleSendError(error, userData);

      expect(service.getUserData(testUserId)).toBeUndefined();
      expect(service.getEnrolledCount()).toBe(0);
    });

    it('should re-throw non-403 errors', () => {
      service.enrollUser(testUserId, testChatId, 'Тест');
      const userData = service.getUserData(testUserId)!;

      const error = new Error('Network error') as Error & { error_code: number };
      error.error_code = 500;

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).handleSendError(error, userData);
      }).toThrow('Network error');
    });

    it('should re-throw errors without error_code', () => {
      service.enrollUser(testUserId, testChatId, 'Тест');
      const userData = service.getUserData(testUserId)!;

      const error = new Error('Generic error');

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).handleSendError(error, userData);
      }).toThrow('Generic error');
    });

    it('should re-throw non-Error types', () => {
      service.enrollUser(testUserId, testChatId, 'Тест');
      const userData = service.getUserData(testUserId)!;

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).handleSendError('string error', userData);
      }).toThrow('string error');
    });
  });

  // ==========================================================================
  // Study Completion
  // ==========================================================================
  describe('Study Completion', () => {
    it('should mark study as complete after week 12', () => {
      const userData = {
        chatId: testChatId,
        odlikerId: testUserId,
        userName: 'Тест',
        enrollmentDate: new Date(),
        lastAssessmentDate: undefined as Date | undefined,
        lastAssessmentWeek: undefined as number | undefined,
        nextAssessmentWeek: 0,
        reminderSent: false,
        isiHistory: [] as Array<{ week: number; score: number; date: Date }>,
      };

      // Simulate progression through all assessment weeks by manipulating enrollment date
      // Set enrollment to 85 days ago (week 12+)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 85);
      userData.enrollmentDate = pastDate;

      // Add baseline
      userData.isiHistory.push({ week: 0, score: 15, date: pastDate });
      userData.nextAssessmentWeek = 2;

      // Simulate all assessments up to week 12
      userData.isiHistory.push({ week: 2, score: 14, date: new Date() });
      userData.isiHistory.push({ week: 4, score: 12, date: new Date() });
      userData.isiHistory.push({ week: 6, score: 10, date: new Date() });
      userData.isiHistory.push({ week: 8, score: 9, date: new Date() });

      // After week 12 assessment (last in schedule), nextAssessmentWeek should be -1
      // The service uses assessmentWeeks: [0, 2, 4, 6, 8, 12]
      // So when currentWeek >= 12 and we look for next week > 12, findIndex returns -1
      service.enrollUser(testUserId, testChatId, 'Тест', 15);
      const actualUserData = service.getUserData(testUserId)!;

      // Set enrollment to past so currentWeek = 12+
      (actualUserData as { enrollmentDate: Date }).enrollmentDate = pastDate;
      actualUserData.isiHistory.push(...userData.isiHistory.slice(1)); // Add history

      // Record final week 12 assessment
      service.recordAssessment(testUserId, 7);

      // After week 12, nextAssessmentWeek should be -1 (study complete)
      expect(actualUserData.nextAssessmentWeek).toBe(-1);
    });

    it('should return null for next assessment after study completion', () => {
      service.enrollUser(testUserId, testChatId, 'Тест', 15);
      const userData = service.getUserData(testUserId)!;
      (userData as { nextAssessmentWeek: number }).nextAssessmentWeek = -1;

      const nextInfo = service.getNextAssessmentInfo(testUserId);
      expect(nextInfo).toBeNull();
    });
  });

  // ==========================================================================
  // Week Calculation
  // ==========================================================================
  describe('getCurrentWeek', () => {
    it('should calculate week 0 for same-day enrollment', () => {
      service.enrollUser(testUserId, testChatId);
      const isDue = service.isAssessmentDue(testUserId);
      expect(isDue).toBe(true); // Week 0 assessment is due
    });

    it('should calculate week 2 after 14 days', () => {
      service.enrollUser(testUserId, testChatId, 'Тест', 15);
      const userData = service.getUserData(testUserId)!;

      // Set enrollment to 14 days ago
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 14);
      (userData as { enrollmentDate: Date }).enrollmentDate = pastDate;

      const nextInfo = service.getNextAssessmentInfo(testUserId);
      expect(nextInfo?.week).toBe(2);
      expect(nextInfo?.daysUntil).toBe(0); // Already at week 2
    });

    it('should calculate correct days until next assessment', () => {
      service.enrollUser(testUserId, testChatId, 'Тест', 15);
      const userData = service.getUserData(testUserId)!;

      // Set enrollment to 7 days ago (week 1)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      (userData as { enrollmentDate: Date }).enrollmentDate = pastDate;

      const nextInfo = service.getNextAssessmentInfo(testUserId);
      expect(nextInfo?.week).toBe(2);
      expect(nextInfo?.daysUntil).toBe(7); // 1 week until week 2
    });
  });

  // ==========================================================================
  // Follow-up Reminder Timing
  // ==========================================================================
  describe('Follow-up Reminder Timing', () => {
    it('should send follow-up after 24 hours with no lastAssessmentDate', async () => {
      service.enrollUser(testUserId, testChatId, 'Тест');
      const userData = service.getUserData(testUserId)!;

      // No lastAssessmentDate = Infinity hours since last assessment
      userData.reminderSent = true;
      (userData as { lastAssessmentDate: Date | undefined }).lastAssessmentDate = undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).checkAndSendAssessments();

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('напоминаю об оценке сна'),
        expect.any(Object)
      );
    });
  });
});
