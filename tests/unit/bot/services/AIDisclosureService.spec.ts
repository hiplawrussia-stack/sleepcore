/**
 * AIDisclosureService Unit Tests
 * ==============================
 * Tests for mandatory AI disclosure per NY Law / CA SB-243.
 *
 * Covers:
 * - Factory function and default configuration
 * - Disclosure timing (3-hour interval)
 * - Initial vs periodic disclosures
 * - Language support (Russian/English)
 * - Event logging and audit trail
 */

import {
  AIDisclosureService,
  createAIDisclosureService,
  DEFAULT_AI_DISCLOSURE_CONFIG,
  DISCLOSURE_INTERVAL_MS,
  DISCLOSURE_INTERVAL_HOURS,
  type IAIDisclosureConfig,
  type IDisclosureCheckResult,
} from '../../../../src/bot/services/AIDisclosureService';

describe('AIDisclosureService', () => {
  let service: AIDisclosureService;

  beforeEach(() => {
    service = createAIDisclosureService();
  });

  describe('factory function', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(AIDisclosureService);
    });

    it('should accept custom configuration', () => {
      const customService = createAIDisclosureService({
        intervalMs: 1000 * 60 * 60, // 1 hour
        defaultLanguage: 'en',
      });
      expect(customService).toBeInstanceOf(AIDisclosureService);
    });
  });

  describe('DEFAULT_AI_DISCLOSURE_CONFIG', () => {
    it('should have correct defaults', () => {
      expect(DEFAULT_AI_DISCLOSURE_CONFIG.intervalMs).toBe(DISCLOSURE_INTERVAL_MS);
      expect(DEFAULT_AI_DISCLOSURE_CONFIG.logAllEvents).toBe(true);
      expect(DEFAULT_AI_DISCLOSURE_CONFIG.defaultLanguage).toBe('ru');
    });
  });

  describe('DISCLOSURE_INTERVAL constants', () => {
    it('should be 3 hours in milliseconds', () => {
      expect(DISCLOSURE_INTERVAL_MS).toBe(3 * 60 * 60 * 1000);
    });

    it('should be 3 hours', () => {
      expect(DISCLOSURE_INTERVAL_HOURS).toBe(3);
    });
  });

  describe('checkDisclosure()', () => {
    it('should require initial disclosure when never disclosed', () => {
      const result = service.checkDisclosure(null, 'ru');

      expect(result.shouldDisclose).toBe(true);
      expect(result.reason).toBe('initial');
      expect(result.message).toBeTruthy();
      expect(result.timeSinceLastMs).toBeNull();
    });

    it('should require initial disclosure when undefined', () => {
      const result = service.checkDisclosure(undefined as unknown as Date, 'ru');

      expect(result.shouldDisclose).toBe(true);
      expect(result.reason).toBe('initial');
    });

    it('should require periodic disclosure after 3 hours', () => {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const result = service.checkDisclosure(fourHoursAgo, 'ru');

      expect(result.shouldDisclose).toBe(true);
      expect(result.reason).toBe('periodic');
      expect(result.message).toBeTruthy();
      expect(result.timeSinceLastMs).toBeGreaterThan(DISCLOSURE_INTERVAL_MS);
    });

    it('should NOT require disclosure within 3 hours', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const result = service.checkDisclosure(oneHourAgo, 'ru');

      expect(result.shouldDisclose).toBe(false);
      expect(result.reason).toBe('not_needed');
      expect(result.message).toBeNull();
      expect(result.timeSinceLastMs).toBeLessThan(DISCLOSURE_INTERVAL_MS);
    });

    it('should NOT require disclosure at exactly 3 hours minus 1 second', () => {
      const justUnder3Hours = new Date(Date.now() - (DISCLOSURE_INTERVAL_MS - 1000));
      const result = service.checkDisclosure(justUnder3Hours, 'ru');

      expect(result.shouldDisclose).toBe(false);
    });

    it('should require disclosure at exactly 3 hours', () => {
      const exactly3Hours = new Date(Date.now() - DISCLOSURE_INTERVAL_MS);
      const result = service.checkDisclosure(exactly3Hours, 'ru');

      expect(result.shouldDisclose).toBe(true);
      expect(result.reason).toBe('periodic');
    });
  });

  describe('language support', () => {
    it('should return Russian message for ru language', () => {
      const result = service.checkDisclosure(null, 'ru');

      expect(result.message).toContain('Вы общаетесь');
      expect(result.message).toContain('8-800-2000-122');
    });

    it('should return English message for en language', () => {
      const result = service.checkDisclosure(null, 'en');

      expect(result.message).toContain('You are interacting');
      expect(result.message).toContain('988');
    });

    it('should use default language when not specified', () => {
      const result = service.checkDisclosure(null);

      expect(result.message).toContain('8-800-2000-122'); // Russian default
    });

    it('should use configured default language', () => {
      const enService = createAIDisclosureService({ defaultLanguage: 'en' });
      const result = enService.checkDisclosure(null);

      expect(result.message).toContain('988'); // English
    });
  });

  describe('getDisclosureMessage()', () => {
    it('should return initial message', () => {
      const message = service.getDisclosureMessage('initial', 'ru');

      expect(message).toContain('искусственный интеллект');
      expect(message).toContain('не живой человек');
    });

    it('should return periodic message', () => {
      const message = service.getDisclosureMessage('periodic', 'ru');

      expect(message).toContain('Напоминание');
      expect(message).toContain('AI-ассистент');
    });

    it('should support English messages', () => {
      const initial = service.getDisclosureMessage('initial', 'en');
      const periodic = service.getDisclosureMessage('periodic', 'en');

      expect(initial).toContain('artificial intelligence');
      expect(periodic).toContain('Reminder');
    });
  });

  describe('recordDisclosure()', () => {
    it('should create disclosure event', () => {
      const event = service.recordDisclosure('user-123', 'chat-456', 'initial', 'ru');

      expect(event.userId).toBe('user-123');
      expect(event.chatId).toBe('chat-456');
      expect(event.disclosureType).toBe('initial');
      expect(event.language).toBe('ru');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.reason).toContain('NY Law');
    });

    it('should record periodic disclosure reason', () => {
      const event = service.recordDisclosure('user-123', 'chat-456', 'periodic', 'ru');

      expect(event.reason).toContain('3-hour interval');
    });

    it('should record manual disclosure reason', () => {
      const event = service.recordDisclosure('user-123', 'chat-456', 'manual', 'ru');

      expect(event.reason).toContain('User-requested');
    });
  });

  describe('event logging', () => {
    it('should log events when logAllEvents is true', () => {
      service.recordDisclosure('user-123', 'chat-456', 'initial', 'ru');

      const events = service.getEvents();
      expect(events.length).toBe(1);
    });

    it('should NOT log events when logAllEvents is false', () => {
      const noLogService = createAIDisclosureService({ logAllEvents: false });
      noLogService.recordDisclosure('user-123', 'chat-456', 'initial', 'ru');

      const events = noLogService.getEvents();
      expect(events.length).toBe(0);
    });

    it('should track user-specific events', () => {
      service.recordDisclosure('user-A', 'chat-1', 'initial', 'ru');
      service.recordDisclosure('user-B', 'chat-2', 'initial', 'ru');
      service.recordDisclosure('user-A', 'chat-1', 'periodic', 'ru');

      const userAEvents = service.getUserEvents('user-A');
      const userBEvents = service.getUserEvents('user-B');

      expect(userAEvents.length).toBe(2);
      expect(userBEvents.length).toBe(1);
    });
  });

  describe('getTimeUntilNextDisclosure()', () => {
    it('should return 0 when never disclosed', () => {
      const time = service.getTimeUntilNextDisclosure(null);
      expect(time).toBe(0);
    });

    it('should return 0 when past 3 hours', () => {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const time = service.getTimeUntilNextDisclosure(fourHoursAgo);
      expect(time).toBe(0);
    });

    it('should return remaining time when within 3 hours', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const time = service.getTimeUntilNextDisclosure(oneHourAgo);

      // Should be approximately 2 hours remaining
      const twoHoursMs = 2 * 60 * 60 * 1000;
      expect(time).toBeGreaterThan(twoHoursMs - 1000); // Allow 1 sec tolerance
      expect(time).toBeLessThanOrEqual(twoHoursMs);
    });
  });

  describe('formatTimeUntilNext()', () => {
    it('should format "now" when due immediately (Russian)', () => {
      const text = service.formatTimeUntilNext(null, 'ru');
      expect(text).toBe('сейчас');
    });

    it('should format "now" when due immediately (English)', () => {
      const text = service.formatTimeUntilNext(null, 'en');
      expect(text).toBe('now');
    });

    it('should format hours and minutes (Russian)', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const text = service.formatTimeUntilNext(oneHourAgo, 'ru');

      expect(text).toContain('ч');
      expect(text).toContain('мин');
    });

    it('should format hours and minutes (English)', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const text = service.formatTimeUntilNext(oneHourAgo, 'en');

      expect(text).toContain('h');
      expect(text).toContain('m');
    });
  });

  describe('getDisclosureCount()', () => {
    it('should count disclosure types', () => {
      service.recordDisclosure('user-1', 'chat-1', 'initial', 'ru');
      service.recordDisclosure('user-2', 'chat-2', 'initial', 'ru');
      service.recordDisclosure('user-1', 'chat-1', 'periodic', 'ru');
      service.recordDisclosure('user-3', 'chat-3', 'manual', 'ru');

      const counts = service.getDisclosureCount();

      expect(counts.total).toBe(4);
      expect(counts.initial).toBe(2);
      expect(counts.periodic).toBe(1);
      expect(counts.manual).toBe(1);
    });
  });

  describe('clearOldEvents()', () => {
    it('should clear old events', () => {
      service.recordDisclosure('user-123', 'chat-456', 'initial', 'ru');
      expect(service.getEvents().length).toBe(1);

      // Clear events older than 0 days (all events)
      const cleared = service.clearOldEvents(0);
      expect(cleared).toBe(1);
      expect(service.getEvents().length).toBe(0);
    });

    it('should keep recent events', () => {
      service.recordDisclosure('user-123', 'chat-456', 'initial', 'ru');
      const initialCount = service.getEvents().length;

      // Clear events older than 30 days - recent events should remain
      service.clearOldEvents(30);
      expect(service.getEvents().length).toBe(initialCount);
    });
  });

  describe('getEventsInRange()', () => {
    it('should filter events by date range', () => {
      service.recordDisclosure('user-123', 'chat-456', 'initial', 'ru');

      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // 1 day ago
      const futureDate = new Date(now.getTime() + 86400000); // 1 day ahead

      const eventsInRange = service.getEventsInRange(pastDate, futureDate);
      expect(eventsInRange.length).toBe(1);

      // Events outside range should not be included
      const oldDate = new Date('2020-01-01');
      const oldEndDate = new Date('2020-12-31');
      const oldEvents = service.getEventsInRange(oldDate, oldEndDate);
      expect(oldEvents.length).toBe(0);
    });
  });

  describe('NY Law compliance', () => {
    it('should mention NY Law in event reason', () => {
      const event = service.recordDisclosure('user-123', 'chat-456', 'initial', 'ru');
      expect(event.reason).toContain('NY Law § 899-aa');
    });

    it('should include crisis resources in all messages', () => {
      const initial = service.getDisclosureMessage('initial', 'ru');
      const periodic = service.getDisclosureMessage('periodic', 'ru');

      expect(initial).toContain('8-800-2000-122');
      expect(periodic).toContain('8-800-2000-122');
    });

    it('should include US crisis resources for English', () => {
      const initial = service.getDisclosureMessage('initial', 'en');
      const periodic = service.getDisclosureMessage('periodic', 'en');

      expect(initial).toContain('988');
      expect(periodic).toContain('988');
    });
  });
});
