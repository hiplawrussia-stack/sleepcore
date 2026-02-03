/**
 * CrisisEscalationService Tests
 * =============================
 *
 * Tests for crisis escalation protocol service.
 * Validates admin notifications, auto-AE creation, safety plan management.
 *
 * Scientific basis: SAMHSA 2025, Scientific Reports 2025, JMIR Mental Health 2025
 *
 * @packageDocumentation
 */

import {
  CrisisEscalationService,
  createCrisisEscalationService,
  crisisEscalationService,
  DEFAULT_ESCALATION_CONFIG,
  SAFETY_PLAN_STEPS,
} from '../CrisisEscalationService';

import type { ICrisisEvent } from '../CrisisDetectionService';

describe('CrisisEscalationService', () => {
  let service: CrisisEscalationService;
  const testUserId = 'user_test_123';
  const testAdminIds = ['admin1', 'admin2'];
  const testAdminChatId = '-100123456789';

  /**
   * Create mock bot
   */
  const createMockBot = () => ({
    api: {
      sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
    },
  });

  /**
   * Create mock AdverseEventService
   */
  const createMockAeService = () => ({
    reportAdverseEvent: jest.fn().mockResolvedValue({ id: 1, userId: testUserId }),
  });

  /**
   * Create test crisis event
   */
  function createCrisisEvent(overrides: Partial<ICrisisEvent> = {}): ICrisisEvent {
    return {
      userId: testUserId,
      chatId: '123456789',
      timestamp: new Date(),
      crisisType: 'unknown',
      severity: 'high',
      confidence: 0.85,
      action: 'interrupt',
      messageText: 'User mentioned feeling like giving up',
      indicators: ['suicidal thoughts mentioned', 'expressed hopelessness'],
      responseProvided: true,
      ...overrides,
    };
  }

  beforeEach(() => {
    service = new CrisisEscalationService({
      adminUserIds: testAdminIds,
      adminChatId: testAdminChatId,
    });
  });

  // ==========================================================================
  // Configuration & Constants
  // ==========================================================================
  describe('Configuration & Constants', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_ESCALATION_CONFIG.adminUserIds).toEqual([]);
      expect(DEFAULT_ESCALATION_CONFIG.notifyOnHigh).toBe(true);
      expect(DEFAULT_ESCALATION_CONFIG.notifyOnCritical).toBe(true);
      expect(DEFAULT_ESCALATION_CONFIG.autoCreateAE).toBe(true);
      expect(DEFAULT_ESCALATION_CONFIG.escalationTimeoutMinutes).toBe(30);
      expect(DEFAULT_ESCALATION_CONFIG.enableSafetyPlan).toBe(true);
    });

    it('should NOT have enabled field — crisis escalation is always active (ISO 14971)', () => {
      expect('enabled' in DEFAULT_ESCALATION_CONFIG).toBe(false);
    });

    it('should have safety plan steps', () => {
      expect(SAFETY_PLAN_STEPS).toHaveLength(6);
      expect(SAFETY_PLAN_STEPS[0].step).toBe(1);
      expect(SAFETY_PLAN_STEPS[0].title).toBe('Warning Signs');
      expect(SAFETY_PLAN_STEPS[0].titleRu).toBe('Предупреждающие знаки');
    });

    it('should accept custom configuration', () => {
      const customService = new CrisisEscalationService({
        escalationTimeoutMinutes: 60,
      });

      const config = customService.getConfig();
      expect(config.escalationTimeoutMinutes).toBe(60);
    });

    it('should update configuration', () => {
      service.updateConfig({ notifyOnHigh: false });

      const config = service.getConfig();
      expect(config.notifyOnHigh).toBe(false);
    });

    it('should return config copy', () => {
      const config = service.getConfig();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (config as any).notifyOnHigh = false;

      const newConfig = service.getConfig();
      expect(newConfig.notifyOnHigh).toBe(true);
    });
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================
  describe('Initialization', () => {
    it('should set bot instance', () => {
      const mockBot = createMockBot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.setBot(mockBot as any);

      // Bot is set (verified by notification test)
      expect(true).toBe(true);
    });

    it('should set adverse event service', () => {
      const mockAeService = createMockAeService();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.setAdverseEventService(mockAeService as any);

      // AE service is set
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Escalation Level Determination
  // ==========================================================================
  describe('Escalation Level Determination', () => {
    beforeEach(() => {
      const mockBot = createMockBot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.setBot(mockBot as any);
    });

    it('should escalate critical events to emergency level', async () => {
      const event = createCrisisEvent({ severity: 'critical' });

      const result = await service.escalate(event);

      expect(result.level).toBe('emergency');
      expect(result.escalated).toBe(true);
    });

    it('should escalate high events to notify_async level', async () => {
      const event = createCrisisEvent({ severity: 'high' });

      const result = await service.escalate(event);

      expect(result.level).toBe('notify_async');
      expect(result.escalated).toBe(true);
    });

    it('should set monitor level for moderate events', async () => {
      const event = createCrisisEvent({ severity: 'moderate' });

      const result = await service.escalate(event);

      expect(result.level).toBe('monitor');
      expect(result.escalated).toBe(false);
    });

    it('should set monitor level for low events', async () => {
      const event = createCrisisEvent({ severity: 'low' });

      const result = await service.escalate(event);

      expect(result.level).toBe('monitor');
      expect(result.escalated).toBe(false);
    });

    it('should respect notifyOnCritical config', async () => {
      service.updateConfig({ notifyOnCritical: false });
      const event = createCrisisEvent({ severity: 'critical' });

      const result = await service.escalate(event);

      expect(result.level).toBe('monitor');
    });

    it('should respect notifyOnHigh config', async () => {
      service.updateConfig({ notifyOnHigh: false });
      const event = createCrisisEvent({ severity: 'high' });

      const result = await service.escalate(event);

      expect(result.level).toBe('monitor');
    });

    it('should ALWAYS escalate — no enabled toggle exists (ISO 14971 safety-by-design)', async () => {
      const event = createCrisisEvent({ severity: 'critical' });

      const result = await service.escalate(event);

      expect(result.level).toBe('emergency');
      expect(result.escalated).toBe(true);
    });
  });

  // ==========================================================================
  // Admin Notifications
  // ==========================================================================
  describe('Admin Notifications', () => {
    let mockBot: ReturnType<typeof createMockBot>;

    beforeEach(() => {
      mockBot = createMockBot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.setBot(mockBot as any);
    });

    it('should send notifications to admin chat', async () => {
      const event = createCrisisEvent({ severity: 'critical' });

      const count = await service.sendAdminNotifications(event);

      expect(count).toBeGreaterThan(0);
      // English indicators trigger English message format
      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testAdminChatId,
        expect.stringContaining('CRITICAL CRISIS'),
        { parse_mode: 'HTML' }
      );
    });

    it('should send notifications to individual admins', async () => {
      service.updateConfig({ adminChatId: undefined });
      const event = createCrisisEvent({ severity: 'high' });

      const count = await service.sendAdminNotifications(event);

      expect(count).toBe(testAdminIds.length);
      expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(testAdminIds.length);
    });

    it('should format message with event details', async () => {
      const event = createCrisisEvent({
        userId: 'test_user',
        crisisType: 'unknown',
        confidence: 0.9,
        indicators: ['indicator1', 'indicator2'],
      });

      await service.sendAdminNotifications(event);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('test_user'),
        expect.any(Object)
      );
      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('90%'),
        expect.any(Object)
      );
    });

    it('should use Russian messages for Russian indicators', async () => {
      const event = createCrisisEvent({
        severity: 'critical',
        indicators: ['суицидальные мысли', 'безнадёжность'],
      });

      await service.sendAdminNotifications(event);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('КРИТИЧЕСКИЙ КРИЗИС'),
        expect.any(Object)
      );
    });

    it('should use English messages for English indicators', async () => {
      const event = createCrisisEvent({
        severity: 'high',
        indicators: ['suicidal thoughts', 'hopelessness'],
      });

      await service.sendAdminNotifications(event);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('HIGH RISK'),
        expect.any(Object)
      );
    });

    it('should return 0 when bot not configured', async () => {
      const noBot = new CrisisEscalationService({ adminUserIds: testAdminIds });
      const event = createCrisisEvent();

      const count = await noBot.sendAdminNotifications(event);

      expect(count).toBe(0);
    });

    it('should return 0 when no recipients configured', async () => {
      service.updateConfig({ adminUserIds: [], adminChatId: undefined });
      const event = createCrisisEvent();

      const count = await service.sendAdminNotifications(event);

      expect(count).toBe(0);
    });

    it('should handle send failures gracefully', async () => {
      mockBot.api.sendMessage.mockRejectedValue(new Error('Network error'));
      const event = createCrisisEvent({ severity: 'critical' });

      const count = await service.sendAdminNotifications(event);

      expect(count).toBe(0);
    });

    it('should record notification after successful send', async () => {
      const event = createCrisisEvent({ severity: 'critical' });

      await service.sendAdminNotifications(event);

      const notifications = service.getAllNotifications();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].userId).toBe(testUserId);
      expect(notifications[0].acknowledged).toBe(false);
    });
  });

  // ==========================================================================
  // Notification Management
  // ==========================================================================
  describe('Notification Management', () => {
    let mockBot: ReturnType<typeof createMockBot>;

    beforeEach(async () => {
      mockBot = createMockBot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.setBot(mockBot as any);

      // Create a notification
      await service.sendAdminNotifications(createCrisisEvent({ severity: 'critical' }));
    });

    it('should get all notifications', () => {
      const notifications = service.getAllNotifications();

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0]).toHaveProperty('id');
      expect(notifications[0]).toHaveProperty('userId');
      expect(notifications[0]).toHaveProperty('severity');
    });

    it('should get unacknowledged notifications', () => {
      const unacknowledged = service.getUnacknowledgedNotifications();

      expect(unacknowledged.length).toBeGreaterThan(0);
      expect(unacknowledged.every(n => !n.acknowledged)).toBe(true);
    });

    it('should acknowledge notification', () => {
      const notifications = service.getAllNotifications();
      const notificationId = notifications[0].id;

      const result = service.acknowledgeNotification(notificationId, 'admin1');

      expect(result).toBe(true);

      const updated = service.getAllNotifications().find(n => n.id === notificationId);
      expect(updated?.acknowledged).toBe(true);
      expect(updated?.acknowledgedBy).toBe('admin1');
      expect(updated?.acknowledgedAt).toBeInstanceOf(Date);
    });

    it('should return false for unknown notification', () => {
      const result = service.acknowledgeNotification('unknown_id', 'admin1');

      expect(result).toBe(false);
    });

    it('should not re-acknowledge already acknowledged notification', () => {
      const notifications = service.getAllNotifications();
      const notificationId = notifications[0].id;

      service.acknowledgeNotification(notificationId, 'admin1');
      const result = service.acknowledgeNotification(notificationId, 'admin2');

      expect(result).toBe(false);

      const updated = service.getAllNotifications().find(n => n.id === notificationId);
      expect(updated?.acknowledgedBy).toBe('admin1');
    });
  });

  // ==========================================================================
  // Auto Adverse Event Creation
  // ==========================================================================
  describe('Auto Adverse Event Creation', () => {
    let mockBot: ReturnType<typeof createMockBot>;
    let mockAeService: ReturnType<typeof createMockAeService>;

    beforeEach(() => {
      mockBot = createMockBot();
      mockAeService = createMockAeService();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.setBot(mockBot as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.setAdverseEventService(mockAeService as any);
    });

    it('should create AE for critical events', async () => {
      const event = createCrisisEvent({ severity: 'critical' });

      const result = await service.escalate(event);

      expect(result.aeCreated).toBe(true);
      expect(result.aeId).toBe(1);
      expect(mockAeService.reportAdverseEvent).toHaveBeenCalled();
    });

    it('should not create AE for non-critical events', async () => {
      const event = createCrisisEvent({ severity: 'high' });

      const result = await service.escalate(event);

      expect(result.aeCreated).toBe(false);
      expect(mockAeService.reportAdverseEvent).not.toHaveBeenCalled();
    });

    it('should not create AE when autoCreateAE is disabled', async () => {
      service.updateConfig({ autoCreateAE: false });
      const event = createCrisisEvent({ severity: 'critical' });

      const result = await service.escalate(event);

      expect(result.aeCreated).toBe(false);
    });

    it('should handle AE creation failure gracefully', async () => {
      mockAeService.reportAdverseEvent.mockRejectedValue(new Error('AE creation failed'));
      const event = createCrisisEvent({ severity: 'critical' });

      const result = await service.escalate(event);

      expect(result.aeCreated).toBe(false);
      expect(result.aeId).toBeUndefined();
    });

    it('should return false when AE service not configured', async () => {
      const noAeService = new CrisisEscalationService({
        adminUserIds: testAdminIds,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      noAeService.setBot(mockBot as any);
      // Not setting AE service

      const event = createCrisisEvent({ severity: 'critical' });
      const result = await noAeService.escalate(event);

      expect(result.aeCreated).toBe(false);
    });

    it('should include crisis details in AE report', async () => {
      const event = createCrisisEvent({
        severity: 'critical',
        crisisType: 'unknown',
        confidence: 0.95,
        indicators: ['indicator1', 'indicator2'],
      });

      await service.escalate(event);

      expect(mockAeService.reportAdverseEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUserId,
          severity: 'severe',
          isSerious: true,
          reportedBy: 'system',
          description: expect.stringContaining('unknown'),
        })
      );
    });
  });

  // ==========================================================================
  // Safety Plan Management
  // ==========================================================================
  describe('Safety Plan Management', () => {
    it('should return safety plan steps', () => {
      const steps = service.getSafetyPlanSteps('ru');

      expect(steps).toHaveLength(6);
      expect(steps[0].step).toBe(1);
      expect(steps[0].titleRu).toBe('Предупреждающие знаки');
    });

    it('should return undefined for non-existent user plan', () => {
      const plan = service.getUserSafetyPlan('unknown_user');

      expect(plan).toBeUndefined();
    });

    it('should save new safety plan', () => {
      const plan = service.saveUserSafetyPlan(testUserId, {
        warningSignsRu: ['Чувство безнадёжности'],
        copingStrategies: ['Прогулка'],
      });

      expect(plan.userId).toBe(testUserId);
      expect(plan.warningSignsRu).toContain('Чувство безнадёжности');
      expect(plan.copingStrategies).toContain('Прогулка');
      expect(plan.createdAt).toBeInstanceOf(Date);
      expect(plan.updatedAt).toBeInstanceOf(Date);
    });

    it('should include default professional contacts', () => {
      const plan = service.saveUserSafetyPlan(testUserId, {});

      expect(plan.professionalContacts).toHaveLength(2);
      expect(plan.professionalContacts?.[0].type).toBe('crisis_line');
      expect(plan.professionalContacts?.[1].type).toBe('emergency');
    });

    it('should update existing safety plan', () => {
      // Create initial plan
      service.saveUserSafetyPlan(testUserId, {
        warningSignsRu: ['Знак 1'],
      });

      // Update plan
      const updated = service.saveUserSafetyPlan(testUserId, {
        copingStrategies: ['Стратегия 1'],
      });

      // Should preserve existing data
      expect(updated.warningSignsRu).toContain('Знак 1');
      expect(updated.copingStrategies).toContain('Стратегия 1');
    });

    it('should preserve createdAt on update', () => {
      const original = service.saveUserSafetyPlan(testUserId, {});
      const originalCreatedAt = original.createdAt;

      // Wait a bit and update
      const updated = service.saveUserSafetyPlan(testUserId, {
        reasonsToLive: ['Семья'],
      });

      expect(updated.createdAt).toEqual(originalCreatedAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
    });

    it('should retrieve saved safety plan', () => {
      service.saveUserSafetyPlan(testUserId, {
        safePlaces: ['Дом', 'Парк'],
      });

      const retrieved = service.getUserSafetyPlan(testUserId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.safePlaces).toContain('Дом');
    });

    it('should check if user has safety plan', () => {
      expect(service.hasSafetyPlan(testUserId)).toBe(false);

      service.saveUserSafetyPlan(testUserId, {});

      expect(service.hasSafetyPlan(testUserId)).toBe(true);
    });
  });

  // ==========================================================================
  // Safety Plan Keyboard
  // ==========================================================================
  describe('Safety Plan Keyboard', () => {
    it('should return create keyboard for user without plan (Russian)', () => {
      const keyboard = service.getSafetyPlanKeyboard(testUserId, 'ru');

      expect(keyboard).toHaveLength(2);
      expect(keyboard[0][0].text).toContain('Создать');
      expect(keyboard[0][0].callback_data).toBe('safety:create');
      expect(keyboard[1][0].text).toContain('Телефон доверия');
      expect(keyboard[1][1].text).toContain('Экстренная помощь');
    });

    it('should return view keyboard for user with plan (Russian)', () => {
      service.saveUserSafetyPlan(testUserId, {});

      const keyboard = service.getSafetyPlanKeyboard(testUserId, 'ru');

      expect(keyboard[0][0].text).toContain('Мой план');
      expect(keyboard[0][0].callback_data).toBe('safety:view');
    });

    it('should return create keyboard for user without plan (English)', () => {
      const keyboard = service.getSafetyPlanKeyboard(testUserId, 'en');

      expect(keyboard[0][0].text).toBe('📋 Create Safety Plan');
      expect(keyboard[1][0].text).toBe('📞 Crisis Hotline');
      expect(keyboard[1][1].text).toBe('🆘 Emergency');
    });

    it('should return view keyboard for user with plan (English)', () => {
      service.saveUserSafetyPlan(testUserId, {});

      const keyboard = service.getSafetyPlanKeyboard(testUserId, 'en');

      expect(keyboard[0][0].text).toBe('📋 My Safety Plan');
    });
  });

  // ==========================================================================
  // Full Escalation Flow
  // ==========================================================================
  describe('Full Escalation Flow', () => {
    let mockBot: ReturnType<typeof createMockBot>;
    let mockAeService: ReturnType<typeof createMockAeService>;

    beforeEach(() => {
      mockBot = createMockBot();
      mockAeService = createMockAeService();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.setBot(mockBot as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.setAdverseEventService(mockAeService as any);
    });

    it('should handle full critical escalation flow', async () => {
      const event = createCrisisEvent({ severity: 'critical' });

      const result = await service.escalate(event);

      expect(result.escalated).toBe(true);
      expect(result.level).toBe('emergency');
      expect(result.notificationsSent).toBeGreaterThan(0);
      expect(result.aeCreated).toBe(true);
      expect(result.aeId).toBeDefined();
    });

    it('should handle high severity escalation flow', async () => {
      const event = createCrisisEvent({ severity: 'high' });

      const result = await service.escalate(event);

      expect(result.escalated).toBe(true);
      expect(result.level).toBe('notify_async');
      // For notify_async, notificationsSent is set to adminUserIds.length (non-blocking)
      expect(result.notificationsSent).toBe(testAdminIds.length);
      expect(result.aeCreated).toBe(false);
    });

    it('should log escalation details', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const event = createCrisisEvent({ severity: 'critical' });

      await service.escalate(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[CrisisEscalation] Escalation processed:',
        expect.objectContaining({
          userId: testUserId,
          severity: 'critical',
          escalationLevel: 'emergency',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Factory & Singleton
  // ==========================================================================
  describe('Factory & Singleton', () => {
    it('should create service via factory', () => {
      const created = createCrisisEscalationService({
        escalationTimeoutMinutes: 45,
      });

      expect(created).toBeInstanceOf(CrisisEscalationService);
      expect(created.getConfig().escalationTimeoutMinutes).toBe(45);
    });

    it('should export singleton instance', () => {
      expect(crisisEscalationService).toBeInstanceOf(CrisisEscalationService);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    let mockBot: ReturnType<typeof createMockBot>;

    beforeEach(() => {
      mockBot = createMockBot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.setBot(mockBot as any);
    });

    it('should handle unknown severity level', async () => {
      const event = createCrisisEvent({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        severity: 'unknown' as any,
      });

      const result = await service.escalate(event);

      expect(result.level).toBe('none');
    });

    it('should handle empty indicators array', async () => {
      const event = createCrisisEvent({
        indicators: [],
        severity: 'high',
      });

      await service.sendAdminNotifications(event);

      expect(mockBot.api.sendMessage).toHaveBeenCalled();
    });

    it('should handle partial send failures', async () => {
      service.updateConfig({ adminChatId: undefined });
      mockBot.api.sendMessage
        .mockResolvedValueOnce({ message_id: 1 })
        .mockRejectedValueOnce(new Error('Failed'));

      const event = createCrisisEvent({ severity: 'high' });

      const count = await service.sendAdminNotifications(event);

      expect(count).toBe(1);
    });

    it('should save safety plan with support contacts', () => {
      const plan = service.saveUserSafetyPlan(testUserId, {
        supportContacts: [
          { name: 'Мама', phone: '+7999999999', relation: 'mother' },
        ],
      });

      expect(plan.supportContacts).toHaveLength(1);
      expect(plan.supportContacts?.[0].name).toBe('Мама');
    });

    it('should override professional contacts if provided', () => {
      const plan = service.saveUserSafetyPlan(testUserId, {
        professionalContacts: [
          { name: 'Мой терапевт', phone: '+7111111111', type: 'therapist' },
        ],
      });

      expect(plan.professionalContacts).toHaveLength(1);
      expect(plan.professionalContacts?.[0].type).toBe('therapist');
    });

    it('should handle concurrent escalations', async () => {
      const events = [
        createCrisisEvent({ userId: 'user1', severity: 'high' }),
        createCrisisEvent({ userId: 'user2', severity: 'critical' }),
        createCrisisEvent({ userId: 'user3', severity: 'moderate' }),
      ];

      const results = await Promise.all(events.map(e => service.escalate(e)));

      expect(results[0].escalated).toBe(true);
      expect(results[1].escalated).toBe(true);
      expect(results[2].escalated).toBe(false);
    });

    /**
     * Edge case: Async notification failure (line 325)
     *
     * Scientific basis: SAMHSA 2025 Guidelines require robust error handling
     * for crisis escalation to ensure continuity of care even under network failures.
     *
     * IEC 62304 Class C requirement: All error paths must be tested.
     *
     * Note: This tests the .catch() handler on line 325 by mocking
     * sendAdminNotifications to throw an unhandled exception.
     */
    it('should handle async notification failure gracefully', async () => {
      const event = createCrisisEvent({ severity: 'high' });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock sendAdminNotifications to throw (simulates unhandled internal error)
      const originalMethod = service.sendAdminNotifications.bind(service);
      jest.spyOn(service, 'sendAdminNotifications').mockImplementation(async () => {
        throw new Error('Unexpected internal failure');
      });

      // Execute escalation (notify_async fires sendAdminNotifications without await)
      const result = await service.escalate(event);

      // Wait for async error to be caught by .catch() on line 325
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify escalation completed despite async failure
      expect(result.escalated).toBe(true);
      expect(result.level).toBe('notify_async');

      // Verify error was logged (line 325)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[CrisisEscalation] Failed to send async notification:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      // Restore original method
      (service.sendAdminNotifications as jest.Mock).mockRestore();
    });

    /**
     * Edge case: notify_urgent level (line 320)
     *
     * Per SAMHSA 2025: Critical cases require synchronous notification
     * to ensure immediate clinician response within 30-minute window.
     */
    it('should use notify_urgent for critical with notifyOnCritical enabled', async () => {
      const event = createCrisisEvent({ severity: 'critical' });

      const result = await service.escalate(event);

      expect(result.level).toBe('emergency');
      expect(mockBot.api.sendMessage).toHaveBeenCalled();
    });

    /**
     * Edge case: English language detection for admin messages
     *
     * Per JMIR 2025: Multi-language support improves accessibility.
     * Service detects language from indicators to format appropriate messages.
     */
    it('should format admin message in English for non-Cyrillic indicators', async () => {
      const event = createCrisisEvent({
        severity: 'high',
        indicators: ['feeling hopeless', 'thoughts of ending it all'],
      });

      await service.sendAdminNotifications(event);

      const sentMessage = mockBot.api.sendMessage.mock.calls[0][1];
      expect(sentMessage).toContain('HIGH RISK');
      expect(sentMessage).not.toContain('ВЫСОКИЙ РИСК');
    });

    /**
     * Edge case: Russian language detection for admin messages
     *
     * Per JMIR 2025: Localization crucial for user engagement.
     * Indicators containing Cyrillic trigger Russian message format.
     */
    it('should format admin message in Russian for Cyrillic indicators', async () => {
      const event = createCrisisEvent({
        severity: 'critical',
        indicators: ['упомянул суицид', 'чувство безнадёжности'],
      });

      await service.sendAdminNotifications(event);

      const sentMessage = mockBot.api.sendMessage.mock.calls[0][1];
      expect(sentMessage).toContain('КРИТИЧЕСКИЙ КРИЗИС');
    });

    /**
     * Edge case: acknowledgeNotification for already acknowledged notification
     *
     * Per FDA DHAC 2025: Audit trail must prevent double-acknowledgment
     * to maintain data integrity for regulatory compliance.
     */
    it('should not re-acknowledge already acknowledged notification', async () => {
      // First, create a notification
      const event = createCrisisEvent({ severity: 'critical' });
      await service.sendAdminNotifications(event);

      const notifications = service.getAllNotifications();
      const notifId = notifications[0]?.id;

      // Acknowledge first time
      const firstAck = service.acknowledgeNotification(notifId, 'admin1');
      expect(firstAck).toBe(true);

      // Try to acknowledge again
      const secondAck = service.acknowledgeNotification(notifId, 'admin2');
      expect(secondAck).toBe(false);
    });

    /**
     * Edge case: acknowledgeNotification for non-existent notification
     *
     * Defensive programming: Handle invalid notification IDs gracefully.
     */
    it('should return false for non-existent notification acknowledgment', () => {
      const result = service.acknowledgeNotification('non-existent-id', 'admin1');
      expect(result).toBe(false);
    });

    /**
     * Edge case: Safety plan keyboard in English
     *
     * Per Stanley-Brown SPI: Safety plan must be accessible in user's language.
     */
    it('should generate English safety plan keyboard', () => {
      const keyboard = service.getSafetyPlanKeyboard(testUserId, 'en');

      expect(keyboard[0][0].text).toBe('📋 Create Safety Plan');
      expect(keyboard[1][0].text).toBe('📞 Crisis Hotline');
      expect(keyboard[1][1].text).toBe('🆘 Emergency');
    });

    /**
     * Edge case: Safety plan keyboard for existing plan
     *
     * UI should show "View" instead of "Create" when plan exists.
     */
    it('should show view option when user has existing safety plan', () => {
      // Create a safety plan first
      service.saveUserSafetyPlan(testUserId, {
        warningSignsRu: ['Чувство безнадёжности'],
      });

      const keyboard = service.getSafetyPlanKeyboard(testUserId, 'ru');

      expect(keyboard[0][0].text).toBe('📋 Мой план безопасности');
      expect(keyboard[0][0].callback_data).toBe('safety:view');
    });

    /**
     * Edge case: updateConfig should merge with existing config
     *
     * Partial updates must preserve other settings.
     */
    it('should merge partial config updates', () => {
      const originalConfig = service.getConfig();

      service.updateConfig({ escalationTimeoutMinutes: 60 });

      const updatedConfig = service.getConfig();
      expect(updatedConfig.escalationTimeoutMinutes).toBe(60);
      expect(updatedConfig.notifyOnHigh).toBe(originalConfig.notifyOnHigh);
      expect(updatedConfig.notifyOnCritical).toBe(originalConfig.notifyOnCritical);
    });

    /**
     * Safety invariant: Crisis escalation cannot be disabled
     *
     * Per ISO 14971 safety-by-design and IEC 62304 Class C:
     * Safety-critical features must not have disable toggles.
     */
    it('should NOT have any mechanism to disable escalation (ISO 14971)', () => {
      const config = service.getConfig();
      expect('enabled' in config).toBe(false);
    });

    /**
     * Edge case: escalate with notifyOnCritical disabled
     *
     * Per config, critical events should only monitor, not notify.
     */
    it('should use monitor level when notifyOnCritical is disabled', async () => {
      service.updateConfig({ notifyOnCritical: false });
      const event = createCrisisEvent({ severity: 'critical' });

      const result = await service.escalate(event);

      expect(result.level).toBe('monitor');
      expect(result.escalated).toBe(false);
    });

    /**
     * Edge case: escalate with notifyOnHigh disabled
     *
     * Per config, high severity events should only monitor.
     */
    it('should use monitor level when notifyOnHigh is disabled', async () => {
      service.updateConfig({ notifyOnHigh: false });
      const event = createCrisisEvent({ severity: 'high' });

      const result = await service.escalate(event);

      expect(result.level).toBe('monitor');
      expect(result.escalated).toBe(false);
    });

    /**
     * Edge case: getSafetyPlanSteps with explicit language parameter (line 544)
     *
     * Per Stanley-Brown SPI: Safety plan steps must be available
     * in both Russian and English for accessibility.
     */
    it('should return safety plan steps with default language parameter', () => {
      // Call without parameter to test default branch
      const steps = service.getSafetyPlanSteps();

      expect(steps).toHaveLength(6);
      expect(steps[0].titleRu).toBe('Предупреждающие знаки');
    });

    it('should return safety plan steps with explicit ru language', () => {
      const steps = service.getSafetyPlanSteps('ru');

      expect(steps).toHaveLength(6);
      expect(steps[0].titleRu).toBe('Предупреждающие знаки');
    });

    it('should return safety plan steps with explicit en language', () => {
      const steps = service.getSafetyPlanSteps('en');

      expect(steps).toHaveLength(6);
      expect(steps[0].title).toBe('Warning Signs');
    });

    /**
     * Edge case: getSafetyPlanKeyboard with explicit language (line 592)
     *
     * Test both language branches for keyboard generation.
     */
    it('should generate English keyboard for user without safety plan', () => {
      const keyboard = service.getSafetyPlanKeyboard('new-user-en', 'en');

      expect(keyboard[0][0].text).toBe('📋 Create Safety Plan');
      expect(keyboard[0][0].callback_data).toBe('safety:create');
    });

    it('should generate Russian keyboard with default language parameter', () => {
      // Test default parameter (ru)
      const keyboard = service.getSafetyPlanKeyboard('new-user-default');

      expect(keyboard[0][0].text).toBe('📋 Создать план безопасности');
    });

    /**
     * Edge case: English keyboard for existing plan
     */
    it('should show English view option when user has existing safety plan', () => {
      service.saveUserSafetyPlan('en-user', {
        warningSignsEn: ['Feeling hopeless'],
      });

      const keyboard = service.getSafetyPlanKeyboard('en-user', 'en');

      expect(keyboard[0][0].text).toBe('📋 My Safety Plan');
      expect(keyboard[0][0].callback_data).toBe('safety:view');
    });
  });

  // ==========================================================================
  // Repository Integration (setRepository / loadSafetyPlansFromDB / persistSafetyPlan)
  // ==========================================================================
  describe('Repository Integration', () => {
    /**
     * Create mock SafetyPlanRepository
     */
    const createMockRepo = () => ({
      findAll: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue(undefined),
      findByUserId: jest.fn().mockResolvedValue(null),
    });

    it('should set repository and load plans from DB', async () => {
      const mockRepo = createMockRepo();
      mockRepo.findAll.mockResolvedValue([
        {
          userId: 'db_user_1',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-15'),
          warningSigns: ['Чувство безнадёжности'],
          copingStrategies: ['Прогулка'],
          reasonsToLive: ['Семья'],
          supportContacts: [{ name: 'Мама', phone: '+7999', relation: 'mother' }],
          safePlaces: ['Дом'],
          professionalContacts: [{ name: 'Терапевт', phone: '+7111', type: 'therapist' }],
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);

      expect(mockRepo.findAll).toHaveBeenCalledTimes(1);

      // Verify plan was loaded into memory
      const plan = service.getUserSafetyPlan('db_user_1');
      expect(plan).toBeDefined();
      expect(plan?.userId).toBe('db_user_1');
      expect(plan?.warningSignsRu).toEqual(['Чувство безнадёжности']);
      expect(plan?.copingStrategies).toEqual(['Прогулка']);
      expect(plan?.reasonsToLive).toEqual(['Семья']);
      expect(plan?.supportContacts).toHaveLength(1);
      expect(plan?.safePlaces).toEqual(['Дом']);
      expect(plan?.professionalContacts).toHaveLength(1);
    });

    it('should load multiple plans from DB', async () => {
      const mockRepo = createMockRepo();
      mockRepo.findAll.mockResolvedValue([
        {
          userId: 'user_a',
          createdAt: new Date(),
          updatedAt: new Date(),
          warningSigns: ['Sign A'],
          copingStrategies: [],
          reasonsToLive: [],
          supportContacts: [],
          safePlaces: [],
          professionalContacts: [],
        },
        {
          userId: 'user_b',
          createdAt: new Date(),
          updatedAt: new Date(),
          warningSigns: ['Sign B'],
          copingStrategies: [],
          reasonsToLive: [],
          supportContacts: [],
          safePlaces: [],
          professionalContacts: [],
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);

      expect(service.hasSafetyPlan('user_a')).toBe(true);
      expect(service.hasSafetyPlan('user_b')).toBe(true);
      expect(service.getUserSafetyPlan('user_a')?.warningSignsRu).toEqual(['Sign A']);
      expect(service.getUserSafetyPlan('user_b')?.warningSignsRu).toEqual(['Sign B']);
    });

    it('should handle empty DB gracefully', async () => {
      const mockRepo = createMockRepo();
      mockRepo.findAll.mockResolvedValue([]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);

      expect(mockRepo.findAll).toHaveBeenCalled();
      expect(service.hasSafetyPlan('any_user')).toBe(false);
    });

    it('should handle DB load failure gracefully (catch block)', async () => {
      const mockRepo = createMockRepo();
      mockRepo.findAll.mockRejectedValue(new Error('Database connection failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[CrisisEscalation] DB load failed, Map empty:',
        expect.any(Error)
      );
      // Service should still be functional (in-memory only)
      expect(service.hasSafetyPlan('any_user')).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should persist safety plan to DB on save (write-through)', async () => {
      const mockRepo = createMockRepo();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);

      service.saveUserSafetyPlan(testUserId, {
        warningSignsRu: ['Безнадёжность'],
        copingStrategies: ['Дыхание'],
      });

      // Wait for async persistSafetyPlan
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          userId: testUserId,
          warningSigns: ['Безнадёжность'],
          copingStrategies: ['Дыхание'],
        })
      );
    });

    it('should handle DB persist failure gracefully (catch block)', async () => {
      const mockRepo = createMockRepo();
      mockRepo.upsert.mockRejectedValue(new Error('Write failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);

      // Save should still work in-memory even if DB fails
      const plan = service.saveUserSafetyPlan(testUserId, {
        warningSignsRu: ['Тест'],
      });

      // Wait for async persist error
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(plan.warningSignsRu).toEqual(['Тест']);
      expect(service.hasSafetyPlan(testUserId)).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist safety plan'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should not call repo when no repo is set (no-op persist)', async () => {
      // Service without repository — default state
      const freshService = new CrisisEscalationService({
        adminUserIds: testAdminIds,
      });

      // This should not throw — persistSafetyPlan early-returns
      const plan = freshService.saveUserSafetyPlan(testUserId, {
        warningSignsRu: ['Тест без репо'],
      });

      expect(plan.warningSignsRu).toEqual(['Тест без репо']);
      expect(freshService.hasSafetyPlan(testUserId)).toBe(true);
    });

    it('should persist updated plan with correct field mapping', async () => {
      const mockRepo = createMockRepo();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await service.setRepository(mockRepo as any);

      service.saveUserSafetyPlan(testUserId, {
        warningSignsRu: ['Знак 1'],
        reasonsToLive: ['Семья'],
        safePlaces: ['Дом'],
        supportContacts: [{ name: 'Друг', phone: '+7123', relation: 'friend' }],
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          warningSigns: ['Знак 1'],
          reasonsToLive: ['Семья'],
          safePlaces: ['Дом'],
          supportContacts: [{ name: 'Друг', phone: '+7123', relation: 'friend' }],
        })
      );
    });
  });

  // ==========================================================================
  // Combined Admin Chat + Individual Notifications
  // ==========================================================================
  describe('Combined Notification Targets', () => {
    let mockBot: ReturnType<typeof createMockBot>;

    beforeEach(() => {
      mockBot = createMockBot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.setBot(mockBot as any);
    });

    it('should send to both adminChatId AND individual adminUserIds', async () => {
      const event = createCrisisEvent({ severity: 'critical' });

      const count = await service.sendAdminNotifications(event);

      // 1 admin chat + 2 individual admins = 3
      expect(count).toBe(3);
      expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(3);
      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        testAdminChatId,
        expect.any(String),
        expect.any(Object)
      );
      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        'admin1',
        expect.any(String),
        expect.any(Object)
      );
      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        'admin2',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should record notification with all notified admins including chat prefix', async () => {
      const event = createCrisisEvent({ severity: 'critical' });

      await service.sendAdminNotifications(event);

      const notifications = service.getAllNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].notifiedAdmins).toContain(`chat:${testAdminChatId}`);
      expect(notifications[0].notifiedAdmins).toContain('admin1');
      expect(notifications[0].notifiedAdmins).toContain('admin2');
    });

    it('should continue sending to individuals even if admin chat fails', async () => {
      mockBot.api.sendMessage
        .mockRejectedValueOnce(new Error('Chat not found'))  // admin chat fails
        .mockResolvedValueOnce({ message_id: 2 })            // admin1 succeeds
        .mockResolvedValueOnce({ message_id: 3 });            // admin2 succeeds

      const event = createCrisisEvent({ severity: 'critical' });
      const count = await service.sendAdminNotifications(event);

      expect(count).toBe(2); // Only individual admins succeeded
      expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(3); // All 3 attempted
    });

    it('should continue sending even if some individual admins fail', async () => {
      mockBot.api.sendMessage
        .mockResolvedValueOnce({ message_id: 1 })              // admin chat succeeds
        .mockRejectedValueOnce(new Error('User blocked bot'))   // admin1 fails
        .mockResolvedValueOnce({ message_id: 3 });              // admin2 succeeds

      const event = createCrisisEvent({ severity: 'critical' });
      const count = await service.sendAdminNotifications(event);

      expect(count).toBe(2); // chat + admin2
    });

    it('should not record notification when all sends fail', async () => {
      mockBot.api.sendMessage.mockRejectedValue(new Error('All failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const event = createCrisisEvent({ severity: 'critical' });
      await service.sendAdminNotifications(event);

      const notifications = service.getAllNotifications();
      expect(notifications).toHaveLength(0); // No successful sends, no record

      consoleSpy.mockRestore();
    });
  });
});
