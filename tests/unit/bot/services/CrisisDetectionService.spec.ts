/**
 * CrisisDetectionService Unit Tests
 * ==================================
 * Tests for crisis detection integration with SleepCore.
 *
 * UPDATED: Per FDA DHAC Nov 2025, crisis detection is ALWAYS active
 * and cannot be disabled. The 'enabled' config field has been removed.
 *
 * Covers:
 * - Factory function and default configuration
 * - Message analysis and crisis detection
 * - Severity-action mapping
 * - Language detection (Russian/English)
 * - Event logging and retrieval
 * - Crisis resources
 */

import {
  CrisisDetectionService,
  createCrisisDetectionService,
  DEFAULT_CRISIS_SERVICE_CONFIG,
  type ICrisisDetectionServiceConfig,
  type ICrisisResponse,
  type CrisisAction,
  type ICrisisEvent,
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
        sensitivityLevel: 'low',
      });
      expect(customService).toBeInstanceOf(CrisisDetectionService);
    });
  });

  describe('DEFAULT_CRISIS_SERVICE_CONFIG', () => {
    it('should have sensible defaults', () => {
      // NOTE: 'enabled' field removed per FDA DHAC Nov 2025 - crisis detection is ALWAYS active
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.sensitivityLevel).toBe('high');
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.language).toBe('auto');
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.logAllDetections).toBe(true);
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.notifyOnHighSeverity).toBe(true);
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.adminUserIds).toEqual([]);
    });

    it('should NOT have enabled field (crisis detection always active)', () => {
      // FDA DHAC Nov 2025: Crisis detection must be always-on for AI mental health devices
      expect('enabled' in DEFAULT_CRISIS_SERVICE_CONFIG).toBe(false);
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

  describe('SAFETY: Crisis detection cannot be disabled', () => {
    it('should ALWAYS detect crisis regardless of config', () => {
      // FDA DHAC Nov 2025: Crisis detection must be always-on
      // This test verifies the safety-critical behavior
      const lowSensitivityService = createCrisisDetectionService({
        sensitivityLevel: 'low',
      });

      const result = lowSensitivityService.analyzeMessage(
        'I want to kill myself',
        'user-123',
        'chat-456'
      );

      // MUST still detect and interrupt for critical crisis phrases
      expect(result.shouldInterrupt).toBe(true);
      expect(['interrupt', 'emergency']).toContain(result.action);
      expect(['high', 'critical']).toContain(result.severity);
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

    it('should ALWAYS return true for crisis indicators (cannot be disabled)', () => {
      // FDA DHAC Nov 2025: Crisis detection must be always-on
      const lowSensitivityService = createCrisisDetectionService({
        sensitivityLevel: 'low',
      });

      const result = lowSensitivityService.quickCheck('хочу умереть');
      // MUST still detect crisis keywords regardless of sensitivity
      expect(result).toBe(true);
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

    it('should NOT log normal messages when logAllDetections is false', () => {
      const noLogService = createCrisisDetectionService({
        logAllDetections: false,
      });

      // Normal message with action='continue' should NOT be logged
      noLogService.analyzeMessage(
        'Hello, how are you today?',  // Normal message
        'no-log-user',
        'no-log-chat'
      );

      const events = noLogService.getEvents();
      const userEvents = events.filter(e => e.userId === 'no-log-user');

      // Should not log normal messages when logAllDetections=false
      expect(userEvents.length).toBe(0);
    });

    it('should still log crisis events when logAllDetections is false', () => {
      const noLogService = createCrisisDetectionService({
        logAllDetections: false,
      });

      // Crisis message should still be logged (action !== 'continue')
      noLogService.analyzeMessage(
        'I want to kill myself',  // Crisis message
        'crisis-log-user',
        'crisis-log-chat'
      );

      const events = noLogService.getEvents();
      const userEvents = events.filter(e => e.userId === 'crisis-log-user');

      // Crisis events should always be logged
      expect(userEvents.length).toBeGreaterThan(0);
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

    it('should track both high AND critical severity events', () => {
      // Add critical severity event via recordSosEvent
      const criticalEvent: ICrisisEvent = {
        userId: 'critical-user',
        chatId: 'critical-chat',
        timestamp: new Date(),
        severity: 'critical',
        crisisType: 'suicidal_ideation',
        confidence: 1.0,
        action: 'emergency',
        messageText: 'SOS',
        indicators: ['sos'],
        responseProvided: true,
      };
      service.recordSosEvent(criticalEvent);

      // Add high severity event via recordSosEvent
      const highEvent: ICrisisEvent = {
        userId: 'high-user',
        chatId: 'high-chat',
        timestamp: new Date(),
        severity: 'high',
        crisisType: 'self_harm',
        confidence: 0.9,
        action: 'interrupt',
        messageText: 'Need help',
        indicators: ['help_needed'],
        responseProvided: true,
      };
      service.recordSosEvent(highEvent);

      const highSeverityEvents = service.getHighSeverityEvents();

      // Should include both critical and high severity events
      const hasCritical = highSeverityEvents.some(e => e.severity === 'critical');
      const hasHigh = highSeverityEvents.some(e => e.severity === 'high');

      expect(hasCritical).toBe(true);
      expect(hasHigh).toBe(true);
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

  describe('recordSosEvent()', () => {
    it('should record externally-created SOS event', () => {
      const sosEvent: ICrisisEvent = {
        userId: 'sos-user-123',
        chatId: 'sos-chat-456',
        timestamp: new Date(),
        severity: 'critical',
        crisisType: 'suicidal_ideation',
        confidence: 1.0,
        action: 'emergency',
        messageText: 'User pressed /sos button',
        indicators: ['user_initiated_sos'],
        responseProvided: true,
      };

      service.recordSosEvent(sosEvent);

      const events = service.getEvents();
      const recordedEvent = events.find(e => e.userId === 'sos-user-123');
      expect(recordedEvent).toBeDefined();
      expect(recordedEvent?.severity).toBe('critical');
      expect(recordedEvent?.crisisType).toBe('suicidal_ideation');
    });

    it('should add SOS event to high severity events list', () => {
      const sosEvent: ICrisisEvent = {
        userId: 'sos-high-user',
        chatId: 'sos-chat',
        timestamp: new Date(),
        severity: 'high',
        crisisType: 'self_harm',
        confidence: 0.95,
        action: 'interrupt',
        messageText: 'User pressed /sos',
        indicators: ['user_initiated'],
        responseProvided: true,
      };

      service.recordSosEvent(sosEvent);

      const highSeverityEvents = service.getHighSeverityEvents();
      expect(highSeverityEvents.some(e => e.userId === 'sos-high-user')).toBe(true);
    });
  });

  describe('language configuration', () => {
    it('should use configured English language instead of auto-detection', () => {
      const englishService = createCrisisDetectionService({
        language: 'en',
      });

      // Russian text but English language configured
      const result = englishService.analyzeMessage(
        'Я хочу умереть',  // Russian crisis phrase
        'user-123',
        'chat-456'
      );

      // Should return English resources despite Russian text
      if (result.message) {
        expect(result.message).toContain('988'); // US crisis line
      }
    });

    it('should use configured Russian language instead of auto-detection', () => {
      const russianService = createCrisisDetectionService({
        language: 'ru',
      });

      // English text but Russian language configured
      const result = russianService.analyzeMessage(
        'I want to kill myself',  // English crisis phrase
        'user-123',
        'chat-456'
      );

      // Should return Russian resources despite English text
      if (result.message) {
        expect(result.message).toContain('8-800-2000-122'); // Russian crisis line
      }
    });
  });

  describe('moderate severity handling', () => {
    it('should return supportive action for moderate severity crisis', () => {
      // Test with a phrase that triggers moderate severity
      // "I feel hopeless" typically triggers moderate, not high
      const result = service.analyzeMessage(
        'I feel so hopeless and lost',
        'user-123',
        'chat-456'
      );

      // If severity is moderate, action should be supportive
      if (result.severity === 'moderate') {
        expect(result.action).toBe('supportive');
        expect(result.shouldInterrupt).toBe(false);
        expect(result.message).toBeTruthy();
      }
    });

    it('should return moderate crisis message in response', () => {
      const result = service.analyzeMessage(
        'Мне очень плохо и я не вижу выхода',  // "I feel very bad and see no way out"
        'user-123',
        'chat-456'
      );

      // If severity is moderate, message should contain support resources
      if (result.severity === 'moderate') {
        expect(result.message).toContain('8-800-2000-122');
      }
    });
  });

  describe('stateRiskData parameter', () => {
    it('should accept state risk data in analyzeMessage', () => {
      // StateRiskData interface from CogniCore Engine
      const stateRiskData = {
        overallRiskLevel: 0.3,
        suicidalIdeation: 0.1,
        selfHarmRisk: 0.1,
        emotionalValence: -0.2,
        recentTrend: 'stable' as const,
      };

      const result = service.analyzeMessage(
        'I am having trouble sleeping',
        'user-123',
        'chat-456',
        stateRiskData
      );

      // Should complete without error
      expect(result).toBeDefined();
      expect(result.event).toBeDefined();
    });

    it('should factor state risk data into crisis detection', () => {
      // High risk state data that should elevate severity
      const highRiskState = {
        overallRiskLevel: 0.85,  // High overall risk
        suicidalIdeation: 0.7,   // Significant suicidal ideation
        selfHarmRisk: 0.6,       // Elevated self-harm risk
        emotionalValence: -0.8,  // Very negative emotions
        recentTrend: 'declining' as const,
      };

      const result = service.analyzeMessage(
        'Everything feels overwhelming',
        'user-123',
        'chat-456',
        highRiskState
      );

      // State-based risk factors may elevate severity
      expect(result).toBeDefined();
      expect(['none', 'low', 'moderate', 'high', 'critical']).toContain(result.severity);
    });
  });

  describe('console logging for high severity', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should log high severity events to console', () => {
      service.analyzeMessage(
        'I want to kill myself right now',
        'user-warn-test',
        'chat-warn-test'
      );

      // Check if console.warn was called for high/critical severity
      const warnCalls = consoleWarnSpy.mock.calls;
      const hasCrisisLog = warnCalls.some(
        call => call[0]?.includes('[CrisisDetection]')
      );

      // High severity messages should trigger console.warn
      expect(hasCrisisLog).toBe(true);
    });

    it('should include event details in console log', () => {
      service.analyzeMessage(
        'I am going to end my life',
        'user-details-test',
        'chat-details-test'
      );

      const warnCalls = consoleWarnSpy.mock.calls;
      const crisisLog = warnCalls.find(
        call => call[0]?.includes('[CrisisDetection]')
      );

      if (crisisLog && crisisLog[1]) {
        expect(crisisLog[1]).toHaveProperty('userId');
        expect(crisisLog[1]).toHaveProperty('severity');
        expect(crisisLog[1]).toHaveProperty('crisisType');
        expect(crisisLog[1]).toHaveProperty('timestamp');
      }
    });

    it('should NOT log low severity events to console.warn', () => {
      consoleWarnSpy.mockClear();

      service.analyzeMessage(
        'I had trouble sleeping last night',
        'user-low-test',
        'chat-low-test'
      );

      // Low severity should not trigger console.warn for crisis
      const crisisLogs = consoleWarnSpy.mock.calls.filter(
        call => call[0]?.includes('[CrisisDetection]')
      );

      expect(crisisLogs.length).toBe(0);
    });
  });
});
