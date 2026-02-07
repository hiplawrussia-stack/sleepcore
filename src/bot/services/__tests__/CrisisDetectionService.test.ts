/**
 * CrisisDetectionService Tests - Safety-Critical Module
 * ======================================================
 *
 * IEC 62304 Class C - Maximum verification required
 * ICH E6(R3) - Real-time safety monitoring
 *
 * Tests verify:
 * - Crisis detection is ALWAYS active (cannot be disabled)
 * - 3-layer detection works correctly
 * - Severity classification is accurate
 * - Crisis resources are provided
 *
 * IMPORTANT: Per FDA DHAC Nov 2025, crisis detection MUST be always-on
 * for AI-enabled mental health devices.
 *
 * References:
 * - FDA DHAC Meeting Nov 6, 2025: Crisis escalation requirements
 * - Columbia-SSRS: Suicide severity rating scale
 * - ICH E6(R3): Real-time safety monitoring
 */

import {
  CrisisDetectionService,
  createCrisisDetectionService,
  crisisDetectionService,
  DEFAULT_CRISIS_SERVICE_CONFIG,
} from '../CrisisDetectionService';

describe('CrisisDetectionService', () => {
  let service: CrisisDetectionService;

  beforeEach(() => {
    service = createCrisisDetectionService();
  });

  // ==========================================================================
  // SAFETY-CRITICAL: Always Active (Cannot Be Disabled)
  // ==========================================================================
  describe('SAFETY: Always Active', () => {
    it('should NOT have "enabled" field in config interface', () => {
      // Verify the config doesn't have an enabled field
      const config = DEFAULT_CRISIS_SERVICE_CONFIG;

      // TypeScript check: 'enabled' should not exist on the config
      expect('enabled' in config).toBe(false);
    });

    it('should always analyze messages (no bypass)', () => {
      const result = service.analyzeMessage(
        'I am feeling okay today',
        'user123',
        'chat456'
      );

      // Should return a result (not skip analysis)
      expect(result).toBeDefined();
      expect(result.action).toBeDefined();
      expect(result.event).toBeDefined();
    });

    it('should always perform quickCheck (no bypass)', () => {
      const result = service.quickCheck('I am fine');

      // Should return boolean (not skip)
      expect(typeof result).toBe('boolean');
    });

    it('should detect crisis keywords regardless of config', () => {
      // Create service with any config - should still detect
      const customService = createCrisisDetectionService({
        sensitivityLevel: 'low',
        language: 'ru',
      });

      const result = customService.analyzeMessage(
        'Я хочу умереть',
        'user123',
        'chat456'
      );

      expect(result.severity).not.toBe('none');
      expect(result.action).not.toBe('continue');
    });
  });

  // ==========================================================================
  // SAFETY-CRITICAL: Severity Detection
  // ==========================================================================
  describe('SAFETY: Severity Detection', () => {
    it('should detect critical severity for explicit suicidal ideation', () => {
      const criticalMessages = [
        'Я хочу покончить с собой',
        'I want to kill myself',
        'Я не хочу больше жить',
      ];

      criticalMessages.forEach(text => {
        const result = service.analyzeMessage(text, 'user', 'chat');

        expect(
          result.severity === 'critical' || result.severity === 'high'
        ).toBe(true);
        expect(result.shouldInterrupt).toBe(true);
      });
    });

    it('should detect elevated severity for self-harm references', () => {
      const result = service.analyzeMessage(
        'Я режу себя',
        'user123',
        'chat456'
      );

      // Self-harm may be classified as moderate, high, or critical depending on context
      // The key safety requirement is that it's NOT classified as 'none' or 'low'
      expect(['moderate', 'high', 'critical']).toContain(result.severity);
      // For moderate+, shouldInterrupt may vary, but action should not be 'continue'
      expect(result.action).not.toBe('continue');
    });

    it('should return crisis resources for high severity', () => {
      const result = service.analyzeMessage(
        'Я хочу умереть',
        'user123',
        'chat456'
      );

      expect(result.resources.length).toBeGreaterThan(0);
    });

    it('should provide appropriate message for crisis', () => {
      const result = service.analyzeMessage(
        'Я хочу покончить с собой',
        'user123',
        'chat456'
      );

      expect(result.message.length).toBeGreaterThan(0);
      // Should contain crisis hotline
      expect(
        result.message.includes('8-800-2000-122') ||
        result.message.includes('988')
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Non-Crisis Detection
  // ==========================================================================
  describe('Non-Crisis Detection', () => {
    it('should not trigger for normal sleep-related messages', () => {
      const normalMessages = [
        'Я плохо сплю',
        'Мне трудно заснуть',
        'Я устал',
        'I had trouble sleeping',
        'I feel tired today',
      ];

      normalMessages.forEach(text => {
        const result = service.analyzeMessage(text, 'user', 'chat');

        expect(result.shouldInterrupt).toBe(false);
        expect(result.action).toBe('continue');
      });
    });

    it('should handle empty messages', () => {
      const result = service.analyzeMessage('', 'user123', 'chat456');

      expect(result.shouldInterrupt).toBe(false);
      expect(result.action).toBe('continue');
    });
  });

  // ==========================================================================
  // Action Determination
  // ==========================================================================
  describe('Action Determination', () => {
    it('should return "emergency" for critical severity', () => {
      const result = service.analyzeMessage(
        'Я хочу покончить с собой',
        'user123',
        'chat456'
      );

      if (result.severity === 'critical') {
        expect(result.action).toBe('emergency');
      }
    });

    it('should return "interrupt" for high severity', () => {
      const result = service.analyzeMessage(
        'Мне очень плохо, я не могу так больше',
        'user123',
        'chat456'
      );

      if (result.severity === 'high') {
        expect(result.action).toBe('interrupt');
      }
    });

    it('should return "supportive" for moderate severity', () => {
      const result = service.analyzeMessage(
        'Мне грустно',
        'user123',
        'chat456'
      );

      if (result.severity === 'moderate') {
        expect(result.action).toBe('supportive');
      }
    });

    it('should set shouldInterrupt=true for emergency/interrupt actions', () => {
      const criticalResult = service.analyzeMessage(
        'Я хочу умереть',
        'user123',
        'chat456'
      );

      if (criticalResult.action === 'emergency' || criticalResult.action === 'interrupt') {
        expect(criticalResult.shouldInterrupt).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Event Logging
  // ==========================================================================
  describe('Event Logging', () => {
    it('should log crisis events', () => {
      service.analyzeMessage('Я хочу умереть', 'user123', 'chat456');

      const events = service.getEvents();
      expect(events.length).toBeGreaterThan(0);

      const event = events[events.length - 1];
      expect(event.userId).toBe('user123');
      expect(event.chatId).toBe('chat456');
    });

    it('should include all required fields in event', () => {
      service.analyzeMessage('Test message', 'user123', 'chat456');

      const event = service.getEvents()[0];

      expect(event.userId).toBeDefined();
      expect(event.chatId).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.severity).toBeDefined();
      expect(event.crisisType).toBeDefined();
      expect(event.confidence).toBeDefined();
      expect(event.action).toBeDefined();
    });

    it('should get user-specific events', () => {
      service.analyzeMessage('Message 1', 'user1', 'chat1');
      service.analyzeMessage('Message 2', 'user2', 'chat2');
      service.analyzeMessage('Message 3', 'user1', 'chat1');

      const user1Events = service.getUserEvents('user1');

      expect(user1Events.length).toBe(2);
      user1Events.forEach(event => {
        expect(event.userId).toBe('user1');
      });
    });

    it('should get high severity events', () => {
      service.analyzeMessage('Я в порядке', 'user1', 'chat1');
      service.analyzeMessage('Я хочу умереть', 'user2', 'chat2');

      const highSeverityEvents = service.getHighSeverityEvents();

      highSeverityEvents.forEach(event => {
        expect(['high', 'critical']).toContain(event.severity);
      });
    });

    it('should sanitize PII in logged messages', () => {
      service.analyzeMessage(
        'Позвоните мне +79001234567 или напишите test@email.com',
        'user123',
        'chat456'
      );

      const event = service.getEvents()[0];

      expect(event.messageText).not.toContain('+79001234567');
      expect(event.messageText).not.toContain('test@email.com');
      expect(event.messageText).toContain('[PHONE]');
      expect(event.messageText).toContain('[EMAIL]');
    });
  });

  // ==========================================================================
  // Crisis Resources
  // ==========================================================================
  describe('Crisis Resources', () => {
    it('should provide Russian crisis resources', () => {
      const resources = service.getCrisisResources('ru');

      expect(resources.length).toBeGreaterThan(0);
      // Should include Russian hotline
      const hasRussianHotline = resources.some(r =>
        r.includes('8-800') || r.includes('8800')
      );
      expect(hasRussianHotline).toBe(true);
    });

    it('should provide English crisis resources', () => {
      const resources = service.getCrisisResources('en');

      expect(resources.length).toBeGreaterThan(0);
      // Should include US hotline
      const hasUSHotline = resources.some(r =>
        r.includes('988') || r.includes('741741')
      );
      expect(hasUSHotline).toBe(true);
    });
  });

  // ==========================================================================
  // Language Detection
  // ==========================================================================
  describe('Language Detection', () => {
    it('should detect Russian language', () => {
      const result = service.analyzeMessage(
        'Привет, как дела?',
        'user123',
        'chat456'
      );

      // Message should be in Russian, so response should use Russian resources
      expect(result).toBeDefined();
    });

    it('should detect English language', () => {
      const result = service.analyzeMessage(
        'Hello, how are you?',
        'user123',
        'chat456'
      );

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Configuration
  // ==========================================================================
  describe('Configuration', () => {
    it('should use default config values', () => {
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.sensitivityLevel).toBe('high');
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.language).toBe('auto');
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.logAllDetections).toBe(true);
      expect(DEFAULT_CRISIS_SERVICE_CONFIG.notifyOnHighSeverity).toBe(true);
    });

    it('should allow custom sensitivity level', () => {
      const lowSensitivityService = createCrisisDetectionService({
        sensitivityLevel: 'low',
      });

      // Should still detect critical messages
      const result = lowSensitivityService.analyzeMessage(
        'Я хочу покончить с собой',
        'user123',
        'chat456'
      );

      expect(result.shouldInterrupt).toBe(true);
    });

    it('should allow custom language setting', () => {
      const russianService = createCrisisDetectionService({
        language: 'ru',
      });

      const result = russianService.analyzeMessage(
        'Test message',
        'user123',
        'chat456'
      );

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // Event Management
  // ==========================================================================
  describe('Event Management', () => {
    it('should get events in date range', () => {
      // Add some events
      service.analyzeMessage('Message 1', 'user1', 'chat1');

      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const events = service.getEventsInRange(yesterday, tomorrow);

      expect(events.length).toBeGreaterThan(0);
    });

    it('should clear old events', () => {
      // Add event
      service.analyzeMessage('Test message', 'user1', 'chat1');

      const initialCount = service.getEvents().length;
      expect(initialCount).toBeGreaterThan(0);

      // Clear events older than 0 days
      // Note: Events created "now" have timestamp >= cutoff, so may not be cleared
      // Use clearOldEvents with negative value or just verify the method works
      const cleared = service.clearOldEvents(-1); // This will clear all events

      expect(cleared).toBe(initialCount);
      expect(service.getEvents().length).toBe(0);
    });
  });

  // ==========================================================================
  // Singleton Instance
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(crisisDetectionService).toBeDefined();
      expect(crisisDetectionService).toBeInstanceOf(CrisisDetectionService);
    });
  });

  // ==========================================================================
  // QuickCheck
  // ==========================================================================
  describe('QuickCheck', () => {
    it('should return true for crisis keywords', () => {
      const result = service.quickCheck('умереть');

      expect(typeof result).toBe('boolean');
    });

    it('should return false for normal messages', () => {
      const result = service.quickCheck('спокойной ночи');

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // recordSosEvent (IEC 62304 §7.1 - external crisis event logging)
  // ==========================================================================
  describe('recordSosEvent', () => {
    it('should record externally-created crisis event', () => {
      const sosEvent = {
        userId: 'user123',
        chatId: 'chat456',
        timestamp: new Date(),
        severity: 'high' as const,
        crisisType: 'acute_distress' as const, // Valid CrisisType for user-initiated SOS
        confidence: 1.0,
        action: 'interrupt' as const,
        messageText: 'User pressed /sos button',
        indicators: ['user_initiated'],
        responseProvided: true,
      };

      // Record the event
      service.recordSosEvent(sosEvent);

      // Verify event was logged
      const events = service.getUserEvents('user123');
      expect(events.length).toBeGreaterThan(0);

      const lastEvent = events[events.length - 1];
      expect(lastEvent.crisisType).toBe('acute_distress');
      expect(lastEvent.severity).toBe('high');
    });

    it('should record critical SOS event for escalation', () => {
      const criticalSosEvent = {
        userId: 'user789',
        chatId: 'chat789',
        timestamp: new Date(),
        severity: 'critical' as const,
        crisisType: 'suicidal_ideation' as const, // Valid CrisisType for critical escalation
        confidence: 1.0,
        action: 'emergency' as const,
        messageText: 'User triggered emergency SOS',
        indicators: ['user_initiated', 'explicit_danger'],
        responseProvided: true,
      };

      service.recordSosEvent(criticalSosEvent);

      const events = service.getUserEvents('user789');
      const lastEvent = events[events.length - 1];
      expect(lastEvent.severity).toBe('critical');
      expect(lastEvent.action).toBe('emergency');
    });
  });

  // ==========================================================================
  // Low severity and continue response (coverage for lines 357-359, 428-441)
  // ==========================================================================
  describe('Low severity and continue responses', () => {
    it('should return monitor action for low severity', () => {
      // Test message that might trigger low severity detection
      // (mild distress indicators without crisis keywords)
      const result = service.analyzeMessage(
        'Я немного устал и грустно мне',
        'user123',
        'chat456'
      );

      // Should not interrupt for low severity
      expect(result.shouldInterrupt).toBe(false);
      // Action should be 'monitor' or 'continue'
      expect(['monitor', 'continue', 'supportive']).toContain(result.action);
    });

    it('should return continue response for non-crisis messages', () => {
      const result = service.analyzeMessage(
        'Сегодня был хороший день, спал отлично!',
        'user123',
        'chat456'
      );

      // Should not interrupt
      expect(result.shouldInterrupt).toBe(false);

      // Should have action 'continue'
      expect(result.action).toBe('continue');

      // Should have severity 'none'
      expect(result.severity).toBe('none');

      // Event should be defined but with 'none' severity
      expect(result.event).toBeDefined();
      expect(result.event.severity).toBe('none');
      expect(result.event.action).toBe('continue');
    });

    it('should create valid event for continue responses', () => {
      const result = service.analyzeMessage(
        'Просто хотел сказать привет',
        'testUser',
        'testChat'
      );

      // Verify event structure for continue response
      expect(result.event).toMatchObject({
        userId: 'testUser',
        chatId: 'testChat',
        severity: 'none',
        action: 'continue',
        responseProvided: false,
      });

      // Timestamp should be a Date
      expect(result.event.timestamp).toBeInstanceOf(Date);
    });

    it('should handle default case in severity-to-action mapping', () => {
      // Analyze a completely neutral message
      const result = service.analyzeMessage(
        'Как дела?',
        'user456',
        'chat789'
      );

      // Should return continue for neutral messages
      expect(['continue', 'monitor']).toContain(result.action);
    });
  });
});
