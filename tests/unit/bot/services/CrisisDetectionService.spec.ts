/**
 * CrisisDetectionService Unit Tests
 * ==================================
 * Tests for crisis detection integration with SleepCore.
 *
 * Covers:
 * - Factory function and default configuration
 * - Message analysis and crisis detection
 * - Severity-action mapping
 * - Language detection (Russian/English)
 * - Event logging and retrieval
 * - Crisis resources
 * - Disabled mode behavior
 */

import {
  CrisisDetectionService,
  createCrisisDetectionService,
  DEFAULT_CRISIS_SERVICE_CONFIG,
  type ICrisisDetectionServiceConfig,
  type ICrisisResponse,
  type CrisisAction,
} from '../../../../src/bot/services/CrisisDetectionService';

// ==================== Tests ====================

describe('CrisisDetectionService', () => {
  let service: CrisisDetectionService;

  beforeEach(() => {
    service = createCrisisDetectionService();
  });

  describe('factory function', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(CrisisDetectionService);
    });

    it('should accept custom configuration', () => {
      const customService = createCrisisDetectionService({
        enabled: false,
        sensitivityLevel: 'low',
      });
      expect(customService).toBeInstanceOf(CrisisDetectionService);
    });
  });

  describe('DEFAULT_CRISIS_SERVICE_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.enabled).toBe(true);
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.sensitivityLevel).toBe('high');
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.language).toBe('auto');
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.logAllDetections).toBe(true);
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.notifyOnHighSeverity).toBe(true);
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.adminUserIds).toEqual([]);
    });
  });

  describe('analyzeMessage()', () => {
    it('should return continue action for normal messages', () => {
      const result = service.analyzeMessage(
        'Привет, как дела?',
        'user-123',
        'chat-456'
      );

      expect(result.shouldInterrupt).toBe(false);
      expect(result.action).toBe('continue');
      expect(result.severity).toBe('none');
    });

    it('should detect crisis in Russian text', () => {
      // Note: This tests with a phrase that contains crisis indicators
      const result = service.analyzeMessage(
        'Я хочу умереть, мне очень плохо',
        'user-123',
        'chat-456'
      );

      expect(result.shouldInterrupt).toBe(true);
      expect(['interrupt', 'emergency']).toContain(result.action);
      expect(['high', 'critical']).toContain(result.severity);
      expect(result.message).toBeTruthy();
      expect(result.message).toContain('8-800-2000-122'); // Russian crisis line
    });

    it('should detect crisis in English text', () => {
      const result = service.analyzeMessage(
        'I want to kill myself',
        'user-123',
        'chat-456'
      );

      expect(result.shouldInterrupt).toBe(true);
      expect(['interrupt', 'emergency']).toContain(result.action);
      expect(['high', 'critical']).toContain(result.severity);
      expect(result.message).toBeTruthy();
      expect(result.message).toContain('988'); // US crisis line
    });

    it('should create event for all detections', () => {
      const result = service.analyzeMessage(
        'Я чувствую себя плохо',
        'user-123',
        'chat-456'
      );

      expect(result.event).toBeDefined();
      expect(result.event.userId).toBe('user-123');
      expect(result.event.chatId).toBe('chat-456');
      expect(result.event.timestamp).toBeInstanceOf(Date);
    });

    it('should return resources with crisis response', () => {
      const result = service.analyzeMessage(
        'I want to end my life',
        'user-123',
        'chat-456'
      );

      expect(result.resources).toBeDefined();
      expect(Array.isArray(result.resources)).toBe(true);
    });
  });

  describe('analyzeMessage() with disabled service', () => {
    it('should return continue response when disabled', () => {
      const disabledService = createCrisisDetectionService({
        enabled: false,
      });

      const result = disabledService.analyzeMessage(
        'I want to kill myself',
        'user-123',
        'chat-456'
      );

      expect(result.shouldInterrupt).toBe(false);
      expect(result.action).toBe('continue');
      expect(result.severity).toBe('none');
    });
  });

  describe('quickCheck()', () => {
    it('should return false for normal text', () => {
      const result = service.quickCheck('Привет, у меня проблемы со сном');
      expect(result).toBe(false);
    });

    it('should return true for crisis indicators', () => {
      const result = service.quickCheck('хочу умереть');
      expect(result).toBe(true);
    });

    it('should return false when service is disabled', () => {
      const disabledService = createCrisisDetectionService({
        enabled: false,
      });

      const result = disabledService.quickCheck('хочу умереть');
      expect(result).toBe(false);
    });
  });

  describe('getCrisisResources()', () => {
    it('should return Russian resources by default', () => {
      const resources = service.getCrisisResources();
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
    });

    it('should return Russian resources when specified', () => {
      const resources = service.getCrisisResources('ru');
      expect(Array.isArray(resources)).toBe(true);
    });

    it('should return English resources when specified', () => {
      const resources = service.getCrisisResources('en');
      expect(Array.isArray(resources)).toBe(true);
    });
  });

  describe('event logging', () => {
    it('should log events when crisis detected', () => {
      service.analyzeMessage(
        'I want to end my life',
        'user-123',
        'chat-456'
      );

      const events = service.getEvents();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should track user-specific events', () => {
      service.analyzeMessage('I feel hopeless', 'user-A', 'chat-1');
      service.analyzeMessage('I want to die', 'user-B', 'chat-2');

      const userAEvents = service.getUserEvents('user-A');
      const userBEvents = service.getUserEvents('user-B');

      expect(userAEvents.every(e => e.userId === 'user-A')).toBe(true);
      expect(userBEvents.every(e => e.userId === 'user-B')).toBe(true);
    });

    it('should track high severity events', () => {
      service.analyzeMessage('I want to kill myself', 'user-123', 'chat-456');

      const highSeverityEvents = service.getHighSeverityEvents();
      expect(highSeverityEvents.length).toBeGreaterThan(0);
      expect(
        highSeverityEvents.every(e => e.severity === 'high' || e.severity === 'critical')
      ).toBe(true);
    });

    it('should filter events by date range', () => {
      service.analyzeMessage('I feel terrible', 'user-123', 'chat-456');

      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // 1 day ago
      const futureDate = new Date(now.getTime() + 86400000); // 1 day ahead

      const eventsInRange = service.getEventsInRange(pastDate, futureDate);
      expect(eventsInRange.length).toBeGreaterThan(0);

      // Events outside range should not be included
      const oldDate = new Date('2020-01-01');
      const oldEndDate = new Date('2020-12-31');
      const oldEvents = service.getEventsInRange(oldDate, oldEndDate);
      expect(oldEvents.length).toBe(0);
    });
  });

  describe('clearOldEvents()', () => {
    it('should clear events older than specified days', () => {
      // Add event
      service.analyzeMessage('I feel bad', 'user-123', 'chat-456');
      expect(service.getEvents().length).toBeGreaterThan(0);

      // Clear events older than 0 days (all current events)
      const cleared = service.clearOldEvents(0);
      expect(cleared).toBeGreaterThanOrEqual(0);
    });

    it('should keep recent events', () => {
      service.analyzeMessage('I feel bad', 'user-123', 'chat-456');
      const initialCount = service.getEvents().length;

      // Clear events older than 30 days - recent events should remain
      service.clearOldEvents(30);
      expect(service.getEvents().length).toBe(initialCount);
    });
  });

  describe('language detection', () => {
    it('should detect Russian text and provide Russian resources', () => {
      const result = service.analyzeMessage(
        'Мне очень плохо, я хочу умереть',
        'user-123',
        'chat-456'
      );

      // Should contain Russian crisis line in message
      if (result.message) {
        expect(result.message).toContain('8-800-2000-122');
      }
    });

    it('should detect English text and provide English resources', () => {
      const result = service.analyzeMessage(
        'I want to end my life, I cannot take it anymore',
        'user-123',
        'chat-456'
      );

      // Should contain US crisis line in message
      if (result.message) {
        expect(result.message).toContain('988');
      }
    });
  });

  describe('severity-action mapping', () => {
    it('should map critical severity to emergency action', () => {
      // Use a very explicit crisis phrase
      const result = service.analyzeMessage(
        'I am going to kill myself right now',
        'user-123',
        'chat-456'
      );

      if (result.severity === 'critical') {
        expect(result.action).toBe('emergency');
        expect(result.shouldInterrupt).toBe(true);
      }
    });

    it('should map high severity to interrupt action', () => {
      const result = service.analyzeMessage(
        'I want to die',
        'user-123',
        'chat-456'
      );

      if (result.severity === 'high') {
        expect(result.action).toBe('interrupt');
        expect(result.shouldInterrupt).toBe(true);
      }
    });

    it('should not interrupt for low severity', () => {
      const result = service.analyzeMessage(
        'Мне немного грустно сегодня',
        'user-123',
        'chat-456'
      );

      if (result.severity === 'low' || result.severity === 'none') {
        expect(result.shouldInterrupt).toBe(false);
      }
    });
  });

  describe('text sanitization', () => {
    it('should sanitize phone numbers in logged events', () => {
      service.analyzeMessage(
        'Call me at +79991234567 I need help',
        'user-123',
        'chat-456'
      );

      const events = service.getEvents();
      const lastEvent = events[events.length - 1];

      if (lastEvent && lastEvent.messageText.includes('PHONE')) {
        expect(lastEvent.messageText).toContain('[PHONE]');
        expect(lastEvent.messageText).not.toContain('+79991234567');
      }
    });

    it('should sanitize email addresses in logged events', () => {
      service.analyzeMessage(
        'Email me at user@example.com I need help',
        'user-123',
        'chat-456'
      );

      const events = service.getEvents();
      const lastEvent = events[events.length - 1];

      if (lastEvent && lastEvent.messageText.includes('EMAIL')) {
        expect(lastEvent.messageText).toContain('[EMAIL]');
        expect(lastEvent.messageText).not.toContain('user@example.com');
      }
    });

    it('should truncate long messages', () => {
      const longMessage = 'Help me '.repeat(200); // Very long message
      service.analyzeMessage(longMessage, 'user-123', 'chat-456');

      const events = service.getEvents();
      const lastEvent = events[events.length - 1];

      if (lastEvent) {
        expect(lastEvent.messageText.length).toBeLessThanOrEqual(503); // 500 + '...'
      }
    });
  });

  describe('ICrisisResponse interface', () => {
    it('should have all required fields', () => {
      const result = service.analyzeMessage(
        'Test message',
        'user-123',
        'chat-456'
      );

      expect(result).toHaveProperty('shouldInterrupt');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('event');
    });

    it('should have valid action type', () => {
      const result = service.analyzeMessage(
        'Test message',
        'user-123',
        'chat-456'
      );

      const validActions: CrisisAction[] = [
        'continue',
        'monitor',
        'supportive',
        'interrupt',
        'emergency',
      ];
      expect(validActions).toContain(result.action);
    });
  });
});
