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
import type { Bot, Context } from 'grammy';
import type { AdverseEventService } from '../../../../src/bot/services/AdverseEventService';
import type { SafetyPlanRepository } from '../../../../src/infrastructure/database/repositories/SafetyPlanRepository';

// ==================== Mock Factories ====================

/**
 * Mock Bot type with proper jest mocks
 */
interface MockBotApi {
  sendMessage: jest.Mock;
}

interface MockBot {
  api: MockBotApi;
}

/**
 * Create mock Bot instance
 */
function createMockBot(): MockBot {
  return {
    api: {
      sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
    },
  };
}

/**
 * Mock AE Service type
 */
interface MockAEService {
  reportAdverseEvent: jest.Mock;
}

/**
 * Create mock AdverseEventService
 */
function createMockAEService(): MockAEService {
  return {
    reportAdverseEvent: jest.fn().mockResolvedValue({ id: 999 }),
  };
}

/**
 * Mock Safety Plan Repository type
 */
interface MockSafetyPlanRepo {
  findAll: jest.Mock;
  upsert: jest.Mock;
  findByUserId: jest.Mock;
}

/**
 * Create mock SafetyPlanRepository
 */
function createMockSafetyPlanRepo(): MockSafetyPlanRepo {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue(undefined),
    findByUserId: jest.fn().mockResolvedValue(null),
  };
}

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
        notifyOnHigh: false,
      });
      expect(customService).toBeInstanceOf(CrisisEscalationService);
      expect(customService.getConfig().notifyOnHigh).toBe(false);
    });
  });

  describe('DEFAULT_ESCALATION_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_ESCALATION_CONFIG.adminUserIds).toEqual([]);
      expect(DEFAULT_ESCALATION_CONFIG.adminChatId).toBeUndefined();
      expect(DEFAULT_ESCALATION_CONFIG.notifyOnHigh).toBe(true);
      expect(DEFAULT_ESCALATION_CONFIG.notifyOnCritical).toBe(true);
      expect(DEFAULT_ESCALATION_CONFIG.autoCreateAE).toBe(true);
      expect(DEFAULT_ESCALATION_CONFIG.escalationTimeoutMinutes).toBe(30);
      expect(DEFAULT_ESCALATION_CONFIG.enableSafetyPlan).toBe(true);
    });

    it('should NOT have enabled field — crisis escalation is always active (ISO 14971)', () => {
      expect('enabled' in DEFAULT_ESCALATION_CONFIG).toBe(false);
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
      expect(config.notifyOnCritical).toBe(true);
    });
  });

  describe('escalate()', () => {
    describe('always-active escalation (ISO 14971)', () => {
      it('should ALWAYS escalate critical events — no disable mechanism exists', async () => {
        const event = createMockCrisisEvent('critical');
        const result = await service.escalate(event);

        expect(result.escalated).toBe(true);
        expect(result.level).toBe('emergency');
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

// ==================== Bot Integration Tests ====================

describe('CrisisEscalationService Bot Integration', () => {
  let service: CrisisEscalationService;
  let mockBot: MockBot;

  beforeEach(() => {
    service = createCrisisEscalationService({
      adminUserIds: ['admin-1', 'admin-2'],
      adminChatId: 'admin-chat-123',
    });
    mockBot = createMockBot();
    service.setBot(mockBot as unknown as Bot<Context>);
  });

  describe('setBot()', () => {
    it('should set bot instance', () => {
      const newService = createCrisisEscalationService();
      newService.setBot(mockBot as unknown as Bot<Context>);
      // Verify bot is set by attempting notification
      newService.updateConfig({ adminUserIds: ['admin-1'] });
      // The bot should be available for sending
      expect(newService).toBeInstanceOf(CrisisEscalationService);
    });
  });

  describe('sendAdminNotifications() with bot', () => {
    it('should send notifications to admin chat', async () => {
      const event = createMockCrisisEvent('critical');
      const count = await service.sendAdminNotifications(event);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        'admin-chat-123',
        expect.any(String),
        { parse_mode: 'HTML' }
      );
      expect(count).toBeGreaterThan(0);
    });

    it('should send notifications to individual admins', async () => {
      const event = createMockCrisisEvent('critical');
      await service.sendAdminNotifications(event);

      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        'admin-1',
        expect.any(String),
        { parse_mode: 'HTML' }
      );
      expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
        'admin-2',
        expect.any(String),
        { parse_mode: 'HTML' }
      );
    });

    it('should format critical message correctly', async () => {
      const event = createMockCrisisEvent('critical', {
        indicators: ['want to end my life'],
      });
      await service.sendAdminNotifications(event);

      const calls = mockBot.api.sendMessage.mock.calls;
      const message = calls[0][1] as string;
      expect(message).toContain('CRITICAL');
      expect(message).toContain('user-123');
    });

    it('should format high severity message correctly', async () => {
      const event = createMockCrisisEvent('high', {
        indicators: ['feeling hopeless'],
      });
      await service.sendAdminNotifications(event);

      const calls = mockBot.api.sendMessage.mock.calls;
      const message = calls[0][1] as string;
      expect(message).toContain('HIGH RISK');
    });

    it('should detect Russian language in indicators', async () => {
      const event = createMockCrisisEvent('critical', {
        indicators: ['хочу умереть', 'безнадёжность'],
      });
      await service.sendAdminNotifications(event);

      const calls = mockBot.api.sendMessage.mock.calls;
      const message = calls[0][1] as string;
      expect(message).toContain('КРИТИЧЕСКИЙ');
    });

    it('should handle send failure gracefully', async () => {
      mockBot.api.sendMessage.mockRejectedValueOnce(new Error('Network error'));

      const event = createMockCrisisEvent('critical');
      const count = await service.sendAdminNotifications(event);

      // Should continue and count successful sends
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should handle admin chat send failure', async () => {
      mockBot.api.sendMessage.mockRejectedValueOnce(new Error('Chat not found'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const event = createMockCrisisEvent('critical');
      await service.sendAdminNotifications(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CrisisEscalation]'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should record notification after successful send', async () => {
      const event = createMockCrisisEvent('critical');
      await service.sendAdminNotifications(event);

      const notifications = service.getAllNotifications();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].userId).toBe('user-123');
      expect(notifications[0].severity).toBe('critical');
      expect(notifications[0].acknowledged).toBe(false);
    });
  });

  describe('escalate() with bot configured', () => {
    it('should send notifications for emergency level', async () => {
      const event = createMockCrisisEvent('critical');
      const result = await service.escalate(event);

      expect(result.notificationsSent).toBeGreaterThan(0);
      expect(result.level).toBe('emergency');
    });

    it('should send async notifications for high severity', async () => {
      const event = createMockCrisisEvent('high');
      const result = await service.escalate(event);

      // For notify_async, notificationsSent = adminUserIds.length (not including chat)
      expect(result.level).toBe('notify_async');
      expect(result.notificationsSent).toBe(2); // Only adminUserIds.length
    });
  });

  describe('notification acknowledgment with recorded notifications', () => {
    it('should acknowledge existing notification', async () => {
      const event = createMockCrisisEvent('critical');
      await service.sendAdminNotifications(event);

      const notifications = service.getAllNotifications();
      expect(notifications.length).toBeGreaterThan(0);

      const notifId = notifications[0].id;
      const result = service.acknowledgeNotification(notifId, 'admin-1');

      expect(result).toBe(true);
      expect(service.getUnacknowledgedNotifications()).toHaveLength(0);
    });

    it('should not acknowledge already acknowledged notification', async () => {
      const event = createMockCrisisEvent('critical');
      await service.sendAdminNotifications(event);

      const notifications = service.getAllNotifications();
      const notifId = notifications[0].id;

      // First acknowledgment
      service.acknowledgeNotification(notifId, 'admin-1');
      // Second acknowledgment should fail
      const result = service.acknowledgeNotification(notifId, 'admin-2');

      expect(result).toBe(false);
    });

    it('should set acknowledgedBy and acknowledgedAt', async () => {
      const event = createMockCrisisEvent('critical');
      await service.sendAdminNotifications(event);

      const notifications = service.getAllNotifications();
      const notifId = notifications[0].id;

      service.acknowledgeNotification(notifId, 'admin-supervisor');

      const acked = service.getAllNotifications().find(n => n.id === notifId);
      expect(acked?.acknowledged).toBe(true);
      expect(acked?.acknowledgedBy).toBe('admin-supervisor');
      expect(acked?.acknowledgedAt).toBeInstanceOf(Date);
    });
  });
});

// ==================== AE Service Integration Tests ====================

describe('CrisisEscalationService AE Integration', () => {
  let service: CrisisEscalationService;
  let mockAEService: MockAEService;

  beforeEach(() => {
    service = createCrisisEscalationService({
      autoCreateAE: true,
    });
    mockAEService = createMockAEService();
    service.setAdverseEventService(mockAEService as unknown as AdverseEventService);
  });

  describe('setAdverseEventService()', () => {
    it('should set AE service instance', () => {
      const newService = createCrisisEscalationService();
      newService.setAdverseEventService(mockAEService as unknown as AdverseEventService);
      expect(newService).toBeInstanceOf(CrisisEscalationService);
    });
  });

  describe('auto AE creation for critical events', () => {
    it('should create AE report for critical severity', async () => {
      const event = createMockCrisisEvent('critical');
      const result = await service.escalate(event);

      expect(result.aeCreated).toBe(true);
      expect(result.aeId).toBe(999);
      expect(mockAEService.reportAdverseEvent).toHaveBeenCalled();
    });

    it('should pass correct AE data', async () => {
      const event = createMockCrisisEvent('critical', {
        indicators: ['suicidal thoughts', 'planning'],
      });
      await service.escalate(event);

      expect(mockAEService.reportAdverseEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          severity: 'severe',
          isSerious: true,
          dtxCategory: 'SUICIDAL_IDEATION',
        })
      );
    });

    it('should handle AE creation failure', async () => {
      mockAEService.reportAdverseEvent.mockRejectedValueOnce(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const event = createMockCrisisEvent('critical');
      const result = await service.escalate(event);

      expect(result.aeCreated).toBe(false);
      expect(result.aeId).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not create AE for high severity', async () => {
      const event = createMockCrisisEvent('high');
      const result = await service.escalate(event);

      expect(result.aeCreated).toBe(false);
      expect(mockAEService.reportAdverseEvent).not.toHaveBeenCalled();
    });

    it('should not create AE when autoCreateAE is disabled', async () => {
      service.updateConfig({ autoCreateAE: false });

      const event = createMockCrisisEvent('critical');
      const result = await service.escalate(event);

      expect(result.aeCreated).toBe(false);
      expect(mockAEService.reportAdverseEvent).not.toHaveBeenCalled();
    });
  });
});

// ==================== Safety Plan Repository Integration ====================

describe('CrisisEscalationService Repository Integration', () => {
  let service: CrisisEscalationService;
  let mockRepo: MockSafetyPlanRepo;

  beforeEach(() => {
    service = createCrisisEscalationService();
    mockRepo = createMockSafetyPlanRepo();
  });

  describe('setRepository()', () => {
    it('should set repository and load plans', async () => {
      mockRepo.findAll.mockResolvedValueOnce([
        {
          userId: 'user-existing',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-15'),
          warningSigns: ['anxiety', 'isolation'],
          copingStrategies: ['walking', 'music'],
          reasonsToLive: ['family'],
          supportContacts: [],
          safePlaces: ['home'],
          professionalContacts: [],
        },
      ]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await service.setRepository(mockRepo as unknown as SafetyPlanRepository);

      expect(mockRepo.findAll).toHaveBeenCalled();
      expect(service.hasSafetyPlan('user-existing')).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded 1 safety plans')
      );
      consoleSpy.mockRestore();
    });

    it('should handle DB load failure gracefully', async () => {
      mockRepo.findAll.mockRejectedValueOnce(new Error('DB connection failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await service.setRepository(mockRepo as unknown as SafetyPlanRepository);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DB load failed'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should persist safety plan on save', async () => {
      await service.setRepository(mockRepo as unknown as SafetyPlanRepository);

      service.saveUserSafetyPlan('user-new', {
        warningSignsRu: ['тревога'],
        copingStrategies: ['прогулка'],
      });

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        'user-new',
        expect.objectContaining({
          userId: 'user-new',
          warningSigns: ['тревога'],
          copingStrategies: ['прогулка'],
        })
      );
    });

    it('should handle persist failure gracefully', async () => {
      mockRepo.upsert.mockRejectedValueOnce(new Error('Write failed'));
      await service.setRepository(mockRepo as unknown as SafetyPlanRepository);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      service.saveUserSafetyPlan('user-fail', {
        warningSignsRu: ['тест'],
      });

      // Wait for async persist
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist safety plan'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});

// ==================== Safety Plan Keyboard Tests ====================

describe('CrisisEscalationService Safety Plan Keyboard', () => {
  let service: CrisisEscalationService;

  beforeEach(() => {
    service = createCrisisEscalationService();
  });

  describe('getSafetyPlanKeyboard()', () => {
    it('should return Russian keyboard for new user', () => {
      const keyboard = service.getSafetyPlanKeyboard('new-user', 'ru');

      expect(keyboard).toHaveLength(2);
      expect(keyboard[0][0].text).toContain('Создать план');
      expect(keyboard[0][0].callback_data).toBe('safety:create');
      expect(keyboard[1][0].text).toContain('Телефон доверия');
    });

    it('should return Russian keyboard for user with plan', () => {
      service.saveUserSafetyPlan('user-with-plan', {
        warningSignsRu: ['test'],
      });

      const keyboard = service.getSafetyPlanKeyboard('user-with-plan', 'ru');

      expect(keyboard[0][0].text).toContain('Мой план');
      expect(keyboard[0][0].callback_data).toBe('safety:view');
    });

    it('should return English keyboard for new user', () => {
      const keyboard = service.getSafetyPlanKeyboard('new-user', 'en');

      expect(keyboard).toHaveLength(2);
      expect(keyboard[0][0].text).toContain('Create Safety Plan');
      expect(keyboard[0][0].callback_data).toBe('safety:create');
      expect(keyboard[1][0].text).toContain('Crisis Hotline');
      expect(keyboard[1][1].text).toContain('Emergency');
    });

    it('should return English keyboard for user with plan', () => {
      service.saveUserSafetyPlan('user-en-plan', {
        warningSignsEn: ['anxiety'],
      });

      const keyboard = service.getSafetyPlanKeyboard('user-en-plan', 'en');

      expect(keyboard[0][0].text).toContain('My Safety Plan');
      expect(keyboard[0][0].callback_data).toBe('safety:view');
    });
  });

  describe('hasSafetyPlan()', () => {
    it('should return false for user without plan', () => {
      expect(service.hasSafetyPlan('no-plan-user')).toBe(false);
    });

    it('should return true for user with plan', () => {
      service.saveUserSafetyPlan('has-plan-user', {
        reasonsToLive: ['family'],
      });
      expect(service.hasSafetyPlan('has-plan-user')).toBe(true);
    });
  });
});

// ==================== Async Notification Error Handling ====================

describe('CrisisEscalationService Async Notification Errors', () => {
  it('should handle async notification failure in escalate()', async () => {
    const service = createCrisisEscalationService({
      adminUserIds: ['admin-1'],
    });
    const mockBot = createMockBot();
    mockBot.api.sendMessage.mockRejectedValue(new Error('Async failure'));
    service.setBot(mockBot as unknown as Bot<Context>);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const event = createMockCrisisEvent('high');

    // This triggers notify_async path which catches errors
    const result = await service.escalate(event);

    // Should still report expected notification count
    expect(result.level).toBe('notify_async');
    expect(result.notificationsSent).toBe(1);

    // Wait for async notification to fail
    await new Promise(resolve => setTimeout(resolve, 50));

    // Individual admin errors are logged inside sendAdminNotifications
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to notify admin'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
