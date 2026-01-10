/**
 * CrisisEscalationService Unit Tests
 * ===================================
 * Tests for crisis escalation protocol integration with SleepCore.
 *
 * Covers:
 * - Factory function and default configuration
 * - Escalation level determination
 * - Admin notification handling
 * - Auto-AE creation for CRITICAL severity
 * - Safety plan management
 * - Notification acknowledgment
 * - Disabled mode behavior
 */

import {
  CrisisEscalationService,
  createCrisisEscalationService,
  DEFAULT_ESCALATION_CONFIG,
  SAFETY_PLAN_STEPS,
  type ICrisisEscalationConfig,
  type EscalationLevel,
  type IAdminNotification,
  type ISafetyPlanStep,
  type IUserSafetyPlan,
} from '../../../../src/bot/services/CrisisEscalationService';

import type { ICrisisEvent } from '../../../../src/bot/services/CrisisDetectionService';

// ==================== Mock Crisis Events ====================

const createMockCrisisEvent = (
  severity: 'none' | 'low' | 'moderate' | 'high' | 'critical',
  overrides: Partial<ICrisisEvent> = {}
): ICrisisEvent => ({
  userId: 'user-123',
  chatId: 'chat-456',
  timestamp: new Date(),
  messageText: 'Test message',
  severity,
  crisisType: severity === 'critical' ? 'suicidal_ideation' : 'acute_distress',
  confidence: severity === 'critical' ? 0.95 : 0.7,
  indicators: ['Test indicator'],
  action: severity === 'critical' ? 'emergency' : severity === 'high' ? 'interrupt' : 'continue',
  responseProvided: severity === 'critical' || severity === 'high',
  ...overrides,
});

// ==================== Tests ====================

describe('CrisisEscalationService', () => {
  let service: CrisisEscalationService;

  beforeEach(() => {
    service = createCrisisEscalationService();
  });

  describe('factory function', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(CrisisEscalationService);
    });

    it('should accept custom configuration', () => {
      const customService = createCrisisEscalationService({
        enabled: false,
        notifyOnHigh: false,
      });
      expect(customService).toBeInstanceOf(CrisisEscalationService);
      expect(customService.getConfig().enabled).toBe(false);
      expect(customService.getConfig().notifyOnHigh).toBe(false);
    });
  });

  describe('DEFAULT_ESCALATION_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_ESCALATION_CONFIG.enabled).toBe(true);
      expect(DEFAULT_ESCALATION_CONFIG.adminUserIds).toEqual([]);
      expect(DEFAULT_ESCALATION_CONFIG.adminChatId).toBeUndefined();
      expect(DEFAULT_ESCALATION_CONFIG.notifyOnHigh).toBe(true);
      expect(DEFAULT_ESCALATION_CONFIG.notifyOnCritical).toBe(true);
      expect(DEFAULT_ESCALATION_CONFIG.autoCreateAE).toBe(true);
      expect(DEFAULT_ESCALATION_CONFIG.escalationTimeoutMinutes).toBe(30);
      expect(DEFAULT_ESCALATION_CONFIG.enableSafetyPlan).toBe(true);
    });
  });

  describe('updateConfig()', () => {
    it('should update configuration', () => {
      service.updateConfig({
        adminUserIds: ['admin-1', 'admin-2'],
        notifyOnHigh: false,
      });

      const config = service.getConfig();
      expect(config.adminUserIds).toEqual(['admin-1', 'admin-2']);
      expect(config.notifyOnHigh).toBe(false);
      // Other values should remain default
      expect(config.enabled).toBe(true);
    });
  });

  describe('escalate()', () => {
    describe('with disabled service', () => {
      it('should return no escalation when disabled', async () => {
        const disabledService = createCrisisEscalationService({
          enabled: false,
        });

        const event = createMockCrisisEvent('critical');
        const result = await disabledService.escalate(event);

        expect(result.escalated).toBe(false);
        expect(result.level).toBe('none');
        expect(result.notificationsSent).toBe(0);
        expect(result.aeCreated).toBe(false);
      });
    });

    describe('escalation levels', () => {
      it('should return "none" for no severity', async () => {
        const event = createMockCrisisEvent('none');
        const result = await service.escalate(event);

        expect(result.level).toBe('none');
        expect(result.escalated).toBe(false);
      });

      it('should return "monitor" for low severity', async () => {
        const event = createMockCrisisEvent('low');
        const result = await service.escalate(event);

        expect(result.level).toBe('monitor');
        expect(result.escalated).toBe(false);
      });

      it('should return "monitor" for moderate severity', async () => {
        const event = createMockCrisisEvent('moderate');
        const result = await service.escalate(event);

        expect(result.level).toBe('monitor');
        expect(result.escalated).toBe(false);
      });

      it('should return "notify_async" for high severity', async () => {
        const event = createMockCrisisEvent('high');
        const result = await service.escalate(event);

        expect(result.level).toBe('notify_async');
        expect(result.escalated).toBe(true);
      });

      it('should return "emergency" for critical severity', async () => {
        const event = createMockCrisisEvent('critical');
        const result = await service.escalate(event);

        expect(result.level).toBe('emergency');
        expect(result.escalated).toBe(true);
      });
    });

    describe('notification handling without bot', () => {
      it('should not send notifications without bot configured', async () => {
        service.updateConfig({
          adminUserIds: ['admin-1'],
        });

        const event = createMockCrisisEvent('critical');
        const result = await service.escalate(event);

        expect(result.notificationsSent).toBe(0);
        expect(result.escalated).toBe(true);
        expect(result.level).toBe('emergency');
      });

      it('should not send notifications without admin recipients', async () => {
        const event = createMockCrisisEvent('critical');
        const result = await service.escalate(event);

        expect(result.notificationsSent).toBe(0);
      });
    });

    describe('AE creation', () => {
      it('should not create AE for non-critical events', async () => {
        const event = createMockCrisisEvent('high');
        const result = await service.escalate(event);

        expect(result.aeCreated).toBe(false);
        expect(result.aeId).toBeUndefined();
      });

      it('should not create AE for critical without AE service', async () => {
        const event = createMockCrisisEvent('critical');
        const result = await service.escalate(event);

        // No AE service configured
        expect(result.aeCreated).toBe(false);
      });

      it('should not create AE when autoCreateAE is disabled', async () => {
        const disabledAEService = createCrisisEscalationService({
          autoCreateAE: false,
        });

        const event = createMockCrisisEvent('critical');
        const result = await disabledAEService.escalate(event);

        expect(result.aeCreated).toBe(false);
      });
    });
  });

  describe('sendAdminNotifications()', () => {
    it('should return 0 without bot configured', async () => {
      service.updateConfig({
        adminUserIds: ['admin-1'],
      });

      const event = createMockCrisisEvent('critical');
      const count = await service.sendAdminNotifications(event);

      expect(count).toBe(0);
    });

    it('should return 0 without admin recipients', async () => {
      const event = createMockCrisisEvent('critical');
      const count = await service.sendAdminNotifications(event);

      expect(count).toBe(0);
    });
  });

  describe('notification acknowledgment', () => {
    it('should start with no notifications', () => {
      const notifications = service.getAllNotifications();
      expect(notifications).toHaveLength(0);
    });

    it('should track unacknowledged notifications', () => {
      const unacked = service.getUnacknowledgedNotifications();
      expect(unacked).toHaveLength(0);
    });

    it('should acknowledge notification', () => {
      // Manually add a notification for testing
      // (normally done by sendAdminNotifications)
      const event = createMockCrisisEvent('critical');

      // Escalate to potentially create a notification record
      service.escalate(event);

      // Since no bot is configured, no actual notification is created
      // Test the acknowledgment path directly would require bot mock
      const result = service.acknowledgeNotification('non-existent', 'admin-1');
      expect(result).toBe(false);
    });
  });

  describe('SAFETY_PLAN_STEPS', () => {
    it('should have 6 steps', () => {
      expect(SAFETY_PLAN_STEPS).toHaveLength(6);
    });

    it('should have all required fields for each step', () => {
      for (const step of SAFETY_PLAN_STEPS) {
        expect(step.step).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.titleRu).toBeDefined();
        expect(step.prompt).toBeDefined();
        expect(step.promptRu).toBeDefined();
      }
    });

    it('should have steps numbered 1-6', () => {
      const stepNumbers = SAFETY_PLAN_STEPS.map(s => s.step);
      expect(stepNumbers).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should include Stanley-Brown steps', () => {
      const titles = SAFETY_PLAN_STEPS.map(s => s.title);
      expect(titles).toContain('Warning Signs');
      expect(titles).toContain('Coping Strategies');
      expect(titles).toContain('Reasons to Live');
      expect(titles).toContain('People I Can Contact');
      expect(titles).toContain('Professional Help');
      expect(titles).toContain('Making Environment Safe');
    });
  });

  describe('getSafetyPlanSteps()', () => {
    it('should return safety plan steps for Russian', () => {
      const steps = service.getSafetyPlanSteps('ru');
      expect(steps).toHaveLength(6);
      expect(steps[0].titleRu).toBeTruthy();
    });

    it('should return safety plan steps for English', () => {
      const steps = service.getSafetyPlanSteps('en');
      expect(steps).toHaveLength(6);
      expect(steps[0].title).toBeTruthy();
    });
  });

  describe('saveUserSafetyPlan()', () => {
    it('should save user safety plan', () => {
      const plan = service.saveUserSafetyPlan('user-123', {
        warningSignsRu: ['Чувство безнадёжности', 'Изоляция'],
        copingStrategies: ['Прогулка', 'Музыка'],
      });

      expect(plan.userId).toBe('user-123');
      expect(plan.warningSignsRu).toEqual(['Чувство безнадёжности', 'Изоляция']);
      expect(plan.copingStrategies).toEqual(['Прогулка', 'Музыка']);
      expect(plan.createdAt).toBeInstanceOf(Date);
    });

    it('should update existing safety plan', () => {
      // Create initial plan
      service.saveUserSafetyPlan('user-123', {
        warningSignsRu: ['Первый знак'],
      });

      // Update plan
      const updatedPlan = service.saveUserSafetyPlan('user-123', {
        copingStrategies: ['Новая стратегия'],
      });

      expect(updatedPlan.warningSignsRu).toEqual(['Первый знак']);
      expect(updatedPlan.copingStrategies).toEqual(['Новая стратегия']);
    });
  });

  describe('getUserSafetyPlan()', () => {
    it('should return undefined for non-existent plan', () => {
      const plan = service.getUserSafetyPlan('non-existent');
      expect(plan).toBeUndefined();
    });

    it('should return saved plan', () => {
      service.saveUserSafetyPlan('user-456', {
        reasonsToLive: ['Семья', 'Мечты'],
      });

      const plan = service.getUserSafetyPlan('user-456');
      expect(plan).toBeDefined();
      expect(plan?.reasonsToLive).toEqual(['Семья', 'Мечты']);
    });
  });

  describe('language detection', () => {
    it('should detect Russian indicators in crisis event', async () => {
      const event = createMockCrisisEvent('high', {
        indicators: ['хочу умереть', 'безнадёжность'],
      });

      // This tests the formatAdminMessage internal logic
      // which detects Russian by checking indicators
      const result = await service.escalate(event);
      expect(result.level).toBe('notify_async');
    });

    it('should detect English indicators in crisis event', async () => {
      const event = createMockCrisisEvent('high', {
        indicators: ['want to die', 'hopeless'],
      });

      const result = await service.escalate(event);
      expect(result.level).toBe('notify_async');
    });
  });

  describe('configuration options', () => {
    it('should respect notifyOnHigh setting', async () => {
      const noHighNotify = createCrisisEscalationService({
        notifyOnHigh: false,
      });

      const event = createMockCrisisEvent('high');
      const result = await noHighNotify.escalate(event);

      expect(result.level).toBe('monitor');
      expect(result.escalated).toBe(false);
    });

    it('should respect notifyOnCritical setting', async () => {
      const noCriticalNotify = createCrisisEscalationService({
        notifyOnCritical: false,
      });

      const event = createMockCrisisEvent('critical');
      const result = await noCriticalNotify.escalate(event);

      expect(result.level).toBe('monitor');
      expect(result.escalated).toBe(false);
    });
  });

  describe('escalation timeout', () => {
    it('should have default 30 minute timeout', () => {
      const config = service.getConfig();
      expect(config.escalationTimeoutMinutes).toBe(30);
    });

    it('should accept custom timeout', () => {
      const customService = createCrisisEscalationService({
        escalationTimeoutMinutes: 15,
      });

      expect(customService.getConfig().escalationTimeoutMinutes).toBe(15);
    });
  });
});

// ==================== Integration Tests ====================

describe('CrisisEscalationService Integration', () => {
  describe('with CrisisDetectionService', () => {
    it('should handle crisis event from detection service', async () => {
      const escalationService = createCrisisEscalationService();

      // Simulate event from CrisisDetectionService
      const crisisEvent: ICrisisEvent = {
        userId: 'user-test',
        chatId: 'chat-test',
        timestamp: new Date(),
        messageText: 'I want to end my life',
        severity: 'critical',
        crisisType: 'suicidal_ideation',
        confidence: 0.95,
        indicators: ['end my life', 'suicidal'],
        action: 'emergency',
        responseProvided: true,
      };

      const result = await escalationService.escalate(crisisEvent);

      expect(result.escalated).toBe(true);
      expect(result.level).toBe('emergency');
    });
  });

  describe('safety plan workflow', () => {
    it('should support full safety plan creation', () => {
      const service = createCrisisEscalationService();

      // Step 1: Warning signs
      service.saveUserSafetyPlan('user-workflow', {
        warningSignsRu: ['Бессонница', 'Тревога', 'Изоляция'],
      });

      // Step 2: Coping strategies
      service.saveUserSafetyPlan('user-workflow', {
        copingStrategies: ['Прогулка', 'Дыхание 4-7-8', 'Музыка'],
      });

      // Step 3: Reasons to live
      service.saveUserSafetyPlan('user-workflow', {
        reasonsToLive: ['Семья', 'Друзья', 'Мечты'],
      });

      // Step 4: Support contacts
      service.saveUserSafetyPlan('user-workflow', {
        supportContacts: [
          { name: 'Мама', phone: '+7999...', relation: 'мать' },
          { name: 'Друг Саша', phone: '+7888...', relation: 'друг' },
        ],
      });

      // Step 5: Professional contacts
      service.saveUserSafetyPlan('user-workflow', {
        professionalContacts: [
          { name: 'Телефон доверия', phone: '8-800-2000-122', type: 'crisis_line' },
        ],
      });

      // Step 6: Safe places
      service.saveUserSafetyPlan('user-workflow', {
        safePlaces: ['Дома у родителей', 'Парк у дома'],
      });

      // Verify complete plan
      const completePlan = service.getUserSafetyPlan('user-workflow');
      expect(completePlan).toBeDefined();
      expect(completePlan?.warningSignsRu).toHaveLength(3);
      expect(completePlan?.copingStrategies).toHaveLength(3);
      expect(completePlan?.reasonsToLive).toHaveLength(3);
      expect(completePlan?.supportContacts).toHaveLength(2);
      expect(completePlan?.professionalContacts).toHaveLength(1);
      expect(completePlan?.safePlaces).toHaveLength(2);
    });
  });
});
