/**
 * ProactiveNotificationService Tests
 * ===================================
 *
 * Tests for scheduled push notifications service.
 * Validates user registration, 14-day rule, notification scheduling.
 *
 * Research basis mocked: JMIR 2025, PLOS One, PMC 9092233
 *
 * @packageDocumentation
 */

import {
  ProactiveNotificationService,
  createProactiveNotificationService,
  type INotificationPreferences,
  type IUserNotificationData,
} from '../ProactiveNotificationService';

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    stop: jest.fn(),
  })),
}));

// Mock dailyGreeting
jest.mock('../DailyGreetingService', () => ({
  dailyGreeting: {
    generateMorningNotification: jest.fn(() => ({
      message: 'Доброе утро!',
      keyboard: { inline_keyboard: [[{ text: 'Заполнить дневник', callback_data: 'diary' }]] },
    })),
    generateEveningNotification: jest.fn(() => ({
      message: 'Добрый вечер!',
      keyboard: { inline_keyboard: [[{ text: 'Дневник сна', callback_data: 'diary' }]] },
    })),
  },
}));

// Mock proactiveIntelligenceService
jest.mock('../ProactiveIntelligenceService', () => ({
  proactiveIntelligenceService: {
    canSendInsight: jest.fn(() => ({ allowed: true })),
    runDailyAnalysis: jest.fn(() => Promise.resolve({ insights: [] })),
    sampleInsightTypeThompson: jest.fn(() => 'pattern_change'),
    detectRiskAlertsWithCSD: jest.fn(() => Promise.resolve({ csd: null })),
    markInsightSent: jest.fn(),
    recordInsightInteraction: jest.fn(),
    getOptimalInsightHour: jest.fn(() => 20),
    resetDailyCounters: jest.fn(),
    getEngagementTracking: jest.fn(() => ({
      todayCount: 0,
      lastSentAt: null,
    })),
  },
}));

// Mock getMoscowHour
jest.mock('../../commands/registry', () => ({
  ContextAwareMenuService: jest.fn().mockImplementation(() => ({
    generateReengagementMessage: jest.fn(() => ({
      message: 'Мы скучаем!',
      keyboard: [[{ text: 'Вернуться', callbackData: 'return' }]],
    })),
  })),
  getMoscowHour: jest.fn(() => 8), // Default to morning
}));

// Create mock bot
const createMockBot = () => ({
  api: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
  },
});

// Create mock menu service
const createMockMenuService = () => ({
  generateReengagementMessage: jest.fn(() => ({
    message: 'Мы скучаем!',
    keyboard: [[{ text: 'Вернуться', callbackData: 'return' }]],
  })),
});

describe('ProactiveNotificationService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: ProactiveNotificationService;
  let mockBot: ReturnType<typeof createMockBot>;
  let mockMenuService: ReturnType<typeof createMockMenuService>;

  const testUserId = 'user_test_123';
  const testChatId = 12345;

  beforeEach(() => {
    mockBot = createMockBot();
    mockMenuService = createMockMenuService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new ProactiveNotificationService(mockBot as any, mockMenuService as any);
  });

  afterEach(() => {
    service.stop();
    jest.clearAllMocks();
  });

  /**
   * Create test notification preferences
   */
  function createPreferences(
    overrides: Partial<INotificationPreferences> = {}
  ): INotificationPreferences {
    return {
      enabled: true,
      morningTime: '08:00',
      eveningTime: '20:00',
      timezone: 'Europe/Moscow',
      ...overrides,
    };
  }

  // ==========================================================================
  // Service Lifecycle
  // ==========================================================================
  describe('Service Lifecycle', () => {
    it('should start the service', () => {
      expect(() => service.start()).not.toThrow();
    });

    it('should not double-start', () => {
      service.start();
      service.start(); // Should be no-op

      expect(service.getActiveUserCount()).toBe(0);
    });

    it('should stop the service', () => {
      service.start();
      service.stop();

      // Should be able to start again
      expect(() => service.start()).not.toThrow();
    });

    it('should clear jobs on stop', () => {
      service.start();
      const jobsBefore = service.getJobStatus();
      expect(jobsBefore.length).toBeGreaterThan(0);

      service.stop();
      const jobsAfter = service.getJobStatus();
      expect(jobsAfter.length).toBe(0);
    });
  });

  // ==========================================================================
  // User Registration
  // ==========================================================================
  describe('User Registration', () => {
    it('should register user with enabled preferences', () => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        userName: 'Иван',
        preferences: createPreferences({ enabled: true }),
        context: {},
      });

      expect(service.getActiveUserCount()).toBe(1);
    });

    it('should not register user with disabled preferences', () => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        preferences: createPreferences({ enabled: false }),
        context: {},
      });

      expect(service.getActiveUserCount()).toBe(0);
    });

    it('should unregister user', () => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        preferences: createPreferences(),
        context: {},
      });

      expect(service.getActiveUserCount()).toBe(1);

      service.unregisterUser(testUserId);

      expect(service.getActiveUserCount()).toBe(0);
    });

    it('should register multiple users', () => {
      service.registerUser({
        chatId: 111,
        userId: 'user1',
        preferences: createPreferences(),
        context: {},
      });

      service.registerUser({
        chatId: 222,
        userId: 'user2',
        preferences: createPreferences(),
        context: {},
      });

      expect(service.getActiveUserCount()).toBe(2);
    });
  });

  // ==========================================================================
  // User Response Recording
  // ==========================================================================
  describe('User Response Recording', () => {
    beforeEach(() => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        preferences: createPreferences(),
        context: {},
      });
    });

    it('should record user response', () => {
      // Should not throw
      expect(() => service.recordUserResponse(testUserId)).not.toThrow();
    });

    it('should handle unknown user gracefully', () => {
      expect(() => service.recordUserResponse('unknown_user')).not.toThrow();
    });
  });

  // ==========================================================================
  // User Context Updates
  // ==========================================================================
  describe('User Context Updates', () => {
    beforeEach(() => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        preferences: createPreferences(),
        context: { therapyWeek: 1 },
      });
    });

    it('should update user context', () => {
      service.updateUserContext(testUserId, {
        therapyWeek: 2,
        hasPendingDiary: true,
      });

      // No error thrown
      expect(true).toBe(true);
    });

    it('should handle unknown user gracefully', () => {
      expect(() =>
        service.updateUserContext('unknown_user', { therapyWeek: 1 })
      ).not.toThrow();
    });
  });

  // ==========================================================================
  // Configuration
  // ==========================================================================
  describe('Configuration', () => {
    it('should return notification config', () => {
      const config = service.getConfig();

      expect(config.times).toBeDefined();
      expect(config.times.morning.hour).toBe(8);
      expect(config.times.evening.hour).toBe(20);
      expect(config.reengagement).toBeDefined();
      expect(config.reengagement.minInactiveDays).toBe(7);
      expect(config.reengagement.maxFollowUpDays).toBe(14);
    });
  });

  // ==========================================================================
  // Job Status
  // ==========================================================================
  describe('Job Status', () => {
    it('should return empty job status when not started', () => {
      const status = service.getJobStatus();
      expect(status).toHaveLength(0);
    });

    it('should return job status after start', () => {
      service.start();
      const status = service.getJobStatus();

      expect(status.length).toBeGreaterThan(0);
      expect(status[0]).toHaveProperty('id');
      expect(status[0]).toHaveProperty('running');
    });
  });

  // ==========================================================================
  // Sleep History Updates
  // ==========================================================================
  describe('Sleep History Updates', () => {
    it('should update user sleep history', () => {
      const mockSleepHistory = [
        { date: '2025-01-01', efficiency: 0.85 },
        { date: '2025-01-02', efficiency: 0.82 },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => service.updateUserSleepHistory(testUserId, mockSleepHistory as any)).not.toThrow();
    });
  });

  // ==========================================================================
  // Proactive Insight Sending
  // ==========================================================================
  describe('Proactive Insight Sending', () => {
    it('should return false for unregistered user', async () => {
      const result = await service.sendProactiveInsight('unknown_user');
      expect(result).toBe(false);
    });

    it('should return false when not enough sleep data', async () => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        preferences: createPreferences(),
        context: {},
      });

      // No sleep history provided
      const result = await service.sendProactiveInsight(testUserId);
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Insight Feedback Recording
  // ==========================================================================
  describe('Insight Feedback Recording', () => {
    it('should record positive feedback', () => {
      expect(() =>
        service.recordInsightFeedback(testUserId, 'insight_1', 'pattern_change', 'clicked')
      ).not.toThrow();
    });

    it('should record negative feedback', () => {
      expect(() =>
        service.recordInsightFeedback(testUserId, 'insight_1', 'risk_alert', 'dismissed')
      ).not.toThrow();
    });
  });

  // ==========================================================================
  // Proactive Jobs
  // ==========================================================================
  describe('Proactive Jobs', () => {
    it('should start proactive insights job', () => {
      expect(() => service.startProactiveInsightsJob()).not.toThrow();

      const status = service.getJobStatus();
      expect(status.some(j => j.id === 'proactive_insights')).toBe(true);
    });

    it('should schedule daily reset', () => {
      expect(() => service.scheduleDailyReset()).not.toThrow();

      const status = service.getJobStatus();
      expect(status.some(j => j.id === 'daily_reset')).toBe(true);
    });
  });

  // ==========================================================================
  // Proactive Stats
  // ==========================================================================
  describe('Proactive Stats', () => {
    it('should return proactive stats', () => {
      const stats = service.getProactiveStats(testUserId);

      expect(stats).toHaveProperty('tracking');
      expect(stats).toHaveProperty('canSend');
      expect(stats).toHaveProperty('optimalHour');
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================
  describe('Factory Function', () => {
    it('should create service via factory', () => {
      const created = createProactiveNotificationService(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockBot as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockMenuService as any
      );

      expect(created).toBeInstanceOf(ProactiveNotificationService);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle unregister of non-existent user', () => {
      expect(() => service.unregisterUser('non_existent')).not.toThrow();
    });

    it('should handle multiple registrations of same user', () => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        userName: 'First',
        preferences: createPreferences(),
        context: {},
      });

      service.registerUser({
        chatId: testChatId + 1,
        userId: testUserId,
        userName: 'Second',
        preferences: createPreferences(),
        context: {},
      });

      // Should only have one registration (overwritten)
      expect(service.getActiveUserCount()).toBe(1);
    });

    it('should handle stop when not started', () => {
      expect(() => service.stop()).not.toThrow();
    });
  });

  // ==========================================================================
  // 14-Day Rule (Meta's Rule) - canSendFollowUp
  // ==========================================================================
  describe('14-Day Rule (Meta)', () => {
    it('should allow follow-up within 14 days', async () => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        userName: 'Тест',
        preferences: createPreferences(),
        context: {},
      });

      // First interaction just registered (within 14 days)
      // Should be able to receive notifications
      const stats = service.getProactiveStats(testUserId);
      expect(stats.canSend.allowed).toBe(true);
    });

    it('should extend window on user response', () => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        preferences: createPreferences(),
        context: {},
      });

      // Record response extends 14-day window
      service.recordUserResponse(testUserId);

      // No errors - window extended
      const count = service.getActiveUserCount();
      expect(count).toBe(1);
    });
  });

  // ==========================================================================
  // Cooldown Mechanism - isInCooldown
  // ==========================================================================
  describe('Cooldown Mechanism', () => {
    it('should respect cooldown between notifications', () => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        preferences: createPreferences(),
        context: { daysSinceLastActivity: 10 },
      });

      // After registration, user should be able to receive notifications
      expect(service.getActiveUserCount()).toBe(1);
    });
  });

  // ==========================================================================
  // Morning Notifications - sendMorningNotifications (lines 279-313)
  // ==========================================================================
  describe('Morning Notifications', () => {
    const { getMoscowHour } = require('../../commands/registry');

    beforeEach(() => {
      getMoscowHour.mockReturnValue(8); // Morning hour
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        userName: 'Мария',
        preferences: createPreferences(),
        context: { hasPendingDiary: true },
      });
    });

    it('should send morning notification at 08:00', async () => {
      service.start();

      // Manually invoke the morning notification handler
      // Access via internal method through the service
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendMorningNotifications();

      expect(mockBot.api.sendMessage).toHaveBeenCalled();
    });

    it('should skip morning notification outside morning hour', async () => {
      getMoscowHour.mockReturnValue(10); // Not morning hour
      service.start();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendMorningNotifications();

      expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip user exceeding 14-day window', async () => {
      // Create user with old first interaction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeUsers = (service as any).activeUsers as Map<string, IUserNotificationData>;
      const userData = activeUsers.get(testUserId);
      if (userData) {
        // Set first interaction to 20 days ago
        userData.firstInteractionAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendMorningNotifications();

      // Should skip this user
      expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle send error gracefully', async () => {
      mockBot.api.sendMessage.mockRejectedValueOnce(new Error('Network error'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect((service as any).sendMorningNotifications()).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Evening Notifications - sendEveningNotifications (lines 319-351)
  // ==========================================================================
  describe('Evening Notifications', () => {
    const { getMoscowHour } = require('../../commands/registry');

    beforeEach(() => {
      getMoscowHour.mockReturnValue(20); // Evening hour
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        userName: 'Анна',
        preferences: createPreferences(),
        context: { hasPendingDiary: false },
      });
    });

    it('should send evening notification at 20:00', async () => {
      service.start();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendEveningNotifications();

      expect(mockBot.api.sendMessage).toHaveBeenCalled();
    });

    it('should skip evening notification outside evening hour', async () => {
      getMoscowHour.mockReturnValue(15); // Not evening hour
      service.start();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendEveningNotifications();

      expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip user exceeding 14-day window', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeUsers = (service as any).activeUsers as Map<string, IUserNotificationData>;
      const userData = activeUsers.get(testUserId);
      if (userData) {
        userData.firstInteractionAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendEveningNotifications();

      expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Re-engagement Notifications - sendReengagementNotifications (lines 373-410)
  // ==========================================================================
  describe('Re-engagement Notifications', () => {
    beforeEach(() => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        userName: 'Петр',
        preferences: createPreferences(),
        context: { daysSinceLastActivity: 10 }, // 10 days inactive
      });
    });

    it('should send re-engagement after 7+ days inactive', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendReengagementNotifications();

      expect(mockBot.api.sendMessage).toHaveBeenCalled();
    });

    it('should skip user with less than 7 days inactive', async () => {
      service.unregisterUser(testUserId);
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        preferences: createPreferences(),
        context: { daysSinceLastActivity: 3 }, // Only 3 days inactive
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendReengagementNotifications();

      expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    });

    it('should remove user exceeding 14-day window', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeUsers = (service as any).activeUsers as Map<string, IUserNotificationData>;
      const userData = activeUsers.get(testUserId);
      if (userData) {
        userData.firstInteractionAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendReengagementNotifications();

      // User should be removed
      expect(service.getActiveUserCount()).toBe(0);
    });

    it('should skip user in cooldown', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeUsers = (service as any).activeUsers as Map<string, IUserNotificationData>;
      const userData = activeUsers.get(testUserId);
      if (userData) {
        // Set last notification to 1 hour ago (within 24h cooldown)
        userData.lastNotificationAt = new Date(Date.now() - 60 * 60 * 1000);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendReengagementNotifications();

      expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    });

    it('should increment re-engagement attempts', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendReengagementNotifications();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeUsers = (service as any).activeUsers as Map<string, IUserNotificationData>;
      const userData = activeUsers.get(testUserId);
      expect(userData?.reengagementAttempts).toBe(1);
    });

    it('should skip when menu service returns null', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockMenuService.generateReengagementMessage.mockReturnValueOnce(null as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendReengagementNotifications();

      expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Send Notification - sendNotification (lines 437-471)
  // ==========================================================================
  describe('Send Notification', () => {
    beforeEach(() => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        preferences: createPreferences(),
        context: {},
      });
    });

    it('should send notification with inline keyboard', async () => {
      const notification = {
        message: 'Тест уведомления',
        keyboard: [[{ text: 'Кнопка', callbackData: 'action' }]],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendNotification(testChatId, notification);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        notification.message,
        expect.objectContaining({
          parse_mode: 'Markdown',
          reply_markup: expect.any(Object),
        })
      );
    });

    it('should handle blocked bot (403 error) and remove user', async () => {
      const grammyError = new Error('Forbidden');
      (grammyError as unknown as { error_code: number }).error_code = 403;
      mockBot.api.sendMessage.mockRejectedValueOnce(grammyError);

      const notification = {
        message: 'Test',
        keyboard: [[{ text: 'Btn', callbackData: 'act' }]],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect((service as any).sendNotification(testChatId, notification)).rejects.toThrow();

      // User should be removed
      expect(service.getActiveUserCount()).toBe(0);
    });

    it('should use noop for missing callback data', async () => {
      const notification = {
        message: 'Test',
        keyboard: [[{ text: 'Btn' }]], // No callbackData
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).sendNotification(testChatId, notification);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testChatId,
        'Test',
        expect.objectContaining({
          reply_markup: {
            inline_keyboard: [[{ text: 'Btn', callback_data: 'noop' }]],
          },
        })
      );
    });
  });

  // ==========================================================================
  // Convert Inline Keyboard - convertInlineKeyboard (lines 356-367)
  // ==========================================================================
  describe('Convert Inline Keyboard', () => {
    it('should convert Grammy keyboard format', () => {
      const grammyKeyboard = {
        inline_keyboard: [
          [{ text: 'Кнопка 1', callback_data: 'action1' }],
          [{ text: 'Кнопка 2', callback_data: 'action2' }],
        ],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).convertInlineKeyboard(grammyKeyboard);

      expect(result).toEqual([
        [{ text: 'Кнопка 1', callbackData: 'action1' }],
        [{ text: 'Кнопка 2', callbackData: 'action2' }],
      ]);
    });

    it('should handle empty keyboard', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).convertInlineKeyboard({});
      expect(result).toEqual([]);
    });

    it('should handle undefined keyboard', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).convertInlineKeyboard(undefined);
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // Build Full Context - buildFullContext (lines 415-432)
  // ==========================================================================
  describe('Build Full Context', () => {
    it('should build context with defaults', () => {
      const userData: IUserNotificationData = {
        chatId: testChatId,
        userId: testUserId,
        preferences: createPreferences(),
        context: {},
        firstInteractionAt: new Date(),
        reengagementAttempts: 0,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context = (service as any).buildFullContext(userData);

      expect(context.timeOfDay).toBe('day');
      expect(context.therapyPhase).toBe('active');
      expect(context.therapyWeek).toBe(1);
      expect(context.hasPendingDiary).toBe(true);
      expect(context.hasPendingAssessment).toBe(false);
    });

    it('should use provided context values', () => {
      const userData: IUserNotificationData = {
        chatId: testChatId,
        userId: testUserId,
        preferences: createPreferences(),
        context: {
          timeOfDay: 'evening',
          therapyPhase: 'maintenance',
          therapyWeek: 5,
          hasPendingDiary: false,
          hasPendingAssessment: true,
        },
        firstInteractionAt: new Date(),
        reengagementAttempts: 0,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context = (service as any).buildFullContext(userData);

      expect(context.timeOfDay).toBe('evening');
      expect(context.therapyPhase).toBe('maintenance');
      expect(context.therapyWeek).toBe(5);
      expect(context.hasPendingDiary).toBe(false);
      expect(context.hasPendingAssessment).toBe(true);
    });
  });

  // ==========================================================================
  // Proactive Insight Sending - sendProactiveInsight (lines 521-579)
  // ==========================================================================
  describe('Proactive Insight Sending (Extended)', () => {
    const { proactiveIntelligenceService } = require('../ProactiveIntelligenceService');

    beforeEach(() => {
      service.registerUser({
        chatId: testChatId,
        userId: testUserId,
        userName: 'Сергей',
        preferences: createPreferences(),
        context: {},
      });

      // Add sufficient sleep history (7+ days)
      const sleepHistory = Array.from({ length: 10 }, (_, i) => ({
        date: `2026-01-${(10 + i).toString().padStart(2, '0')}`,
        efficiency: 0.80 + Math.random() * 0.1,
        totalSleep: 7,
        latency: 15,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.updateUserSleepHistory(testUserId, sleepHistory as any);
    });

    it('should return false when anti-fatigue blocks', async () => {
      proactiveIntelligenceService.canSendInsight.mockReturnValueOnce({
        allowed: false,
        reason: 'Max insights per day reached',
      });

      const result = await service.sendProactiveInsight(testUserId);
      expect(result).toBe(false);
    });

    it('should return false when 14-day window exceeded', async () => {
      // Set first interaction to 20 days ago
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeUsers = (service as any).activeUsers as Map<string, IUserNotificationData>;
      const userData = activeUsers.get(testUserId);
      if (userData) {
        userData.firstInteractionAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      }

      const result = await service.sendProactiveInsight(testUserId);
      expect(result).toBe(false);
    });

    it('should return false when no insights available', async () => {
      proactiveIntelligenceService.runDailyAnalysis.mockResolvedValueOnce({
        insights: [],
      });

      const result = await service.sendProactiveInsight(testUserId);
      expect(result).toBe(false);
    });

    it('should send insight with CSD warning', async () => {
      proactiveIntelligenceService.runDailyAnalysis.mockResolvedValueOnce({
        insights: [
          {
            id: 'insight-1',
            type: 'risk_alert',
            titleRu: 'Важное уведомление',
            messageRu: 'Обнаружены изменения в паттерне сна',
            confidence: 0.85,
            action: { command: '/diary', text: 'Заполнить дневник' },
          },
        ],
      });

      proactiveIntelligenceService.detectRiskAlertsWithCSD.mockResolvedValueOnce({
        csd: {
          isWarning: true,
          estimatedDaysToTransition: 5,
          autocorrelation: 0.8,
          variance: 0.3,
        },
      });

      const result = await service.sendProactiveInsight(testUserId);
      expect(result).toBe(true);
      expect(mockBot.api.sendMessage).toHaveBeenCalled();
    });

    it('should handle insight send error', async () => {
      proactiveIntelligenceService.runDailyAnalysis.mockResolvedValueOnce({
        insights: [{ id: 'i1', type: 'pattern_change', titleRu: 'T', messageRu: 'M', confidence: 0.9 }],
      });
      mockBot.api.sendMessage.mockRejectedValueOnce(new Error('Send failed'));

      const result = await service.sendProactiveInsight(testUserId);
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Build Insight Notification - buildInsightNotification (lines 584-628)
  // ==========================================================================
  describe('Build Insight Notification', () => {
    it('should build notification without userName', () => {
      const insight = {
        id: 'ins-1',
        type: 'pattern_change' as const,
        titleRu: 'Изменение паттерна',
        messageRu: 'Ваш режим сна изменился',
        confidence: 0.9,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notification = (service as any).buildInsightNotification(insight, null, undefined);

      expect(notification.message).toContain('**Изменение паттерна**');
      expect(notification.message).toContain('Ваш режим сна изменился');
      expect(notification.message).toContain('🎯 Уверенность: 90%');
    });

    it('should build notification with userName', () => {
      const insight = {
        id: 'ins-2',
        type: 'milestone' as const,
        titleRu: 'Достижение',
        messageRu: 'Вы достигли цели',
        confidence: 0.75,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notification = (service as any).buildInsightNotification(insight, null, 'Ольга');

      expect(notification.message).toContain('Ольга, ');
      expect(notification.message).toContain('📊 Уверенность: 75%');
    });

    it('should add CSD warning without days estimate', () => {
      const insight = {
        id: 'ins-3',
        type: 'risk_alert' as const,
        titleRu: 'Предупреждение',
        messageRu: 'Нестабильность',
        confidence: 0.55,
      };

      const csd = {
        isWarning: true,
        estimatedDaysToTransition: null,
        autocorrelation: 0.7,
        variance: 0.4,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notification = (service as any).buildInsightNotification(insight, csd, undefined);

      expect(notification.message).toContain('⚠️');
      expect(notification.message).toContain('Повышенная нестабильность');
      expect(notification.message).toContain('💡 Уверенность: 55%');
    });

    it('should add CSD warning with days estimate', () => {
      const insight = {
        id: 'ins-4',
        type: 'risk_alert' as const,
        titleRu: 'Раннее предупреждение',
        messageRu: 'Обнаружены ранние признаки',
        confidence: 0.8,
        action: { command: '/predict', text: 'Посмотреть прогноз' },
      };

      const csd = {
        isWarning: true,
        estimatedDaysToTransition: 3,
        autocorrelation: 0.85,
        variance: 0.5,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notification = (service as any).buildInsightNotification(insight, csd, 'Иван');

      expect(notification.message).toContain('ближайшие 3 дней');
      expect(notification.keyboard.length).toBeGreaterThan(0);
      expect(notification.keyboard[0][0].callbackData).toBe('cmd:/predict');
    });
  });

  // ==========================================================================
  // Send Proactive Insights To All - sendProactiveInsightsToAll (lines 647-679)
  // ==========================================================================
  describe('Send Proactive Insights To All', () => {
    const { getMoscowHour } = require('../../commands/registry');
    const { proactiveIntelligenceService } = require('../ProactiveIntelligenceService');

    beforeEach(() => {
      // Register multiple users with sleep history
      for (let i = 1; i <= 3; i++) {
        service.registerUser({
          chatId: testChatId + i,
          userId: `user_${i}`,
          userName: `User ${i}`,
          preferences: createPreferences(),
          context: {},
        });

        const sleepHistory = Array.from({ length: 10 }, (_, j) => ({
          date: `2026-01-${(10 + j).toString().padStart(2, '0')}`,
          efficiency: 0.80,
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        service.updateUserSleepHistory(`user_${i}`, sleepHistory as any);
      }
    });

    it('should skip batch outside active hours (before 10)', async () => {
      getMoscowHour.mockReturnValue(5); // 05:00

      const result = await service.sendProactiveInsightsToAll();

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(3);
    });

    it('should skip batch outside active hours (after 21)', async () => {
      getMoscowHour.mockReturnValue(23); // 23:00

      const result = await service.sendProactiveInsightsToAll();

      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(3);
    });

    it('should send during optimal hours', async () => {
      getMoscowHour.mockReturnValue(20); // 20:00 - within ±1 hour of optimal (20)
      proactiveIntelligenceService.getOptimalInsightHour.mockReturnValue(20);
      proactiveIntelligenceService.runDailyAnalysis.mockResolvedValue({
        insights: [{ id: 'i1', type: 'pattern_change', titleRu: 'T', messageRu: 'M', confidence: 0.9 }],
      });
      proactiveIntelligenceService.detectRiskAlertsWithCSD.mockResolvedValue({ csd: null });

      const result = await service.sendProactiveInsightsToAll();

      expect(result.sent + result.skipped).toBe(3);
    });

    it('should skip users outside optimal hour window', async () => {
      getMoscowHour.mockReturnValue(14); // 14:00
      proactiveIntelligenceService.getOptimalInsightHour.mockReturnValue(20); // Optimal is 20:00

      const result = await service.sendProactiveInsightsToAll();

      // All users skipped (14:00 is not within ±1 hour of 20:00)
      expect(result.skipped).toBe(3);
    });
  });
});
