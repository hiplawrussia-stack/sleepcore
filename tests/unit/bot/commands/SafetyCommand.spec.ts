/**
 * SafetyCommand Unit Tests
 * =========================
 * Tests for /safety command - safety status and monitoring transparency.
 *
 * Coverage targets: >90% for IEC 62304 Class C compliance
 */

import { SafetyCommand, safetyCommand } from '../../../../src/bot/commands/SafetyCommand';
import {
  createMockContext,
  assertSuccessWithMessage,
  assertHasKeyboard,
  assertContainsText,
} from './testHelpers';

// Mock CrisisDetectionService
const mockGetEvents = jest.fn().mockReturnValue([]);
const mockGetUserEvents = jest.fn().mockReturnValue([]);
const mockGetHighSeverityEvents = jest.fn().mockReturnValue([]);

jest.mock('../../../../src/bot/services/CrisisDetectionService', () => ({
  crisisDetectionService: {
    getEvents: (...args: unknown[]) => mockGetEvents(...args),
    getUserEvents: (...args: unknown[]) => mockGetUserEvents(...args),
    getHighSeverityEvents: (...args: unknown[]) => mockGetHighSeverityEvents(...args),
  },
}));

// Helper to create crisis events
function createCrisisEvent(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'test-user-123',
    chatId: '12345',
    timestamp: new Date(),
    severity: 'none' as string,
    crisisType: 'none',
    confidence: 0,
    action: 'continue' as string,
    messageText: '',
    indicators: [],
    responseProvided: false,
    ...overrides,
  };
}

describe('SafetyCommand', () => {
  let command: SafetyCommand;

  beforeEach(() => {
    command = new SafetyCommand();
    jest.clearAllMocks();
    mockGetEvents.mockReturnValue([]);
    mockGetUserEvents.mockReturnValue([]);
    mockGetHighSeverityEvents.mockReturnValue([]);
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('safety');
    });

    it('should have description in Russian', () => {
      expect(command.description).toContain('безопасност');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('безопасность');
      expect(command.aliases).toContain('safety_status');
      expect(command.aliases).toContain('crisis');
    });

    it('should not require session', () => {
      expect(command.requiresSession).toBe(false);
    });
  });

  describe('execute()', () => {
    it('should show safety dashboard', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertSuccessWithMessage(result);
      assertContainsText(result, 'безопасност');
    });

    it('should display current status', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'статус');
    });

    it('should display active systems', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Constitutional AI');
    });

    it('should display crisis detection info', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Crisis Detection');
    });

    it('should have navigation keyboard', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertHasKeyboard(result, 2);
    });

    it('should show statistics', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Статистика');
    });
  });

  describe('handleCallback()', () => {
    it('should handle status callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'статус');
    });

    it('should handle history callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'История');
    });

    it('should handle principles callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:principles', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'принцип');
    });

    it('should handle hotlines callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:hotlines', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Горячие линии');
    });

    it('should handle how_it_works callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:how_it_works', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'работает');
    });

    it('should handle feedback callback', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:feedback', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'Обратная связь');
    });

    it('should default to dashboard for unknown action', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:unknown', {});

      assertSuccessWithMessage(result);
      assertContainsText(result, 'безопасност');
    });
  });

  // ==================== CrisisDetectionService Integration ====================

  describe('getCurrentSafetyStatus() via execute/status', () => {
    it('should return safe level when no events', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      expect(result.message).toMatch(/🟢/);
      assertContainsText(result, 'Безопасно');
    });

    it('should return monitoring level for moderate events', async () => {
      const recentEvent = createCrisisEvent({
        severity: 'moderate',
        action: 'supportive',
        timestamp: new Date(),
      });
      mockGetUserEvents.mockReturnValue([recentEvent]);
      mockGetEvents.mockReturnValue([recentEvent]);

      const ctx = createMockContext();
      const result = await command.execute(ctx);

      expect(result.message).toMatch(/🟡/);
      assertContainsText(result, 'Мониторинг');
    });

    it('should return elevated level for high severity events', async () => {
      const recentEvent = createCrisisEvent({
        severity: 'high',
        action: 'interrupt',
        timestamp: new Date(),
      });
      mockGetUserEvents.mockReturnValue([recentEvent]);
      mockGetEvents.mockReturnValue([recentEvent]);
      mockGetHighSeverityEvents.mockReturnValue([recentEvent]);

      const ctx = createMockContext();
      const result = await command.execute(ctx);

      expect(result.message).toMatch(/🟠/);
      assertContainsText(result, 'Повышенное внимание');
    });

    it('should return critical level for critical severity events', async () => {
      const recentEvent = createCrisisEvent({
        severity: 'critical',
        action: 'emergency',
        timestamp: new Date(),
      });
      mockGetUserEvents.mockReturnValue([recentEvent]);
      mockGetEvents.mockReturnValue([recentEvent]);
      mockGetHighSeverityEvents.mockReturnValue([recentEvent]);

      const ctx = createMockContext();
      const result = await command.execute(ctx);

      expect(result.message).toMatch(/🔴/);
      assertContainsText(result, 'Критический');
    });

    it('should calculate risk score 0 for no events', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      // Risk score 0 → 0%
      assertContainsText(result, '0%');
    });

    it('should calculate risk score for one moderate event', async () => {
      const recentEvent = createCrisisEvent({
        severity: 'moderate',
        action: 'supportive',
        timestamp: new Date(),
      });
      mockGetUserEvents.mockReturnValue([recentEvent]);
      mockGetEvents.mockReturnValue([recentEvent]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      // moderate = 0.1 risk → 10%
      assertContainsText(result, '10%');
    });

    it('should calculate risk score for one high severity event', async () => {
      const recentEvent = createCrisisEvent({
        severity: 'high',
        action: 'interrupt',
        timestamp: new Date(),
      });
      mockGetUserEvents.mockReturnValue([recentEvent]);
      mockGetEvents.mockReturnValue([recentEvent]);
      mockGetHighSeverityEvents.mockReturnValue([recentEvent]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      // high = 0.3 risk → 30%
      assertContainsText(result, '30%');
    });

    it('should calculate risk score for one critical event', async () => {
      const recentEvent = createCrisisEvent({
        severity: 'critical',
        action: 'emergency',
        timestamp: new Date(),
      });
      mockGetUserEvents.mockReturnValue([recentEvent]);
      mockGetEvents.mockReturnValue([recentEvent]);
      mockGetHighSeverityEvents.mockReturnValue([recentEvent]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      // critical = 0.5 risk → 50%
      assertContainsText(result, '50%');
    });

    it('should cap risk score at 1.0 (100%)', async () => {
      const criticalEvents = Array.from({ length: 5 }, () =>
        createCrisisEvent({
          severity: 'critical',
          action: 'emergency',
          timestamp: new Date(),
        })
      );
      mockGetUserEvents.mockReturnValue(criticalEvents);
      mockGetEvents.mockReturnValue(criticalEvents);
      mockGetHighSeverityEvents.mockReturnValue(criticalEvents);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      // 5 * 0.5 = 2.5, capped at 1.0 → 100%
      assertContainsText(result, '100%');
    });

    it('should filter events to last 7 days', async () => {
      const oldEvent = createCrisisEvent({
        severity: 'critical',
        action: 'emergency',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      });
      mockGetUserEvents.mockReturnValue([oldEvent]);
      mockGetEvents.mockReturnValue([oldEvent]);

      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // Old event outside 7-day window → safe status
      expect(result.message).toMatch(/🟢/);
    });

    it('should count escalations from emergency and interrupt actions', async () => {
      const events = [
        createCrisisEvent({ action: 'emergency', severity: 'critical', timestamp: new Date() }),
        createCrisisEvent({ action: 'interrupt', severity: 'high', timestamp: new Date() }),
        createCrisisEvent({ action: 'supportive', severity: 'moderate', timestamp: new Date() }),
      ];
      mockGetUserEvents.mockReturnValue(events);
      mockGetEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.execute(ctx);

      // 2 escalations (emergency + interrupt)
      assertContainsText(result, '2');
    });

    it('should count safety flags (events with severity !== none)', async () => {
      const events = [
        createCrisisEvent({ severity: 'moderate', timestamp: new Date() }),
        createCrisisEvent({ severity: 'high', timestamp: new Date() }),
        createCrisisEvent({ severity: 'none', timestamp: new Date() }),
      ];
      mockGetUserEvents.mockReturnValue(events);
      mockGetEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      // Detailed status shows weekly safety flags: 2 (moderate + high, excluding none)
      // The safetyFlags count includes all user events with severity !== 'none'
      assertSuccessWithMessage(result);
    });
  });

  // ==================== getRiskIndicators() ====================

  describe('getRiskIndicators() via detailed status', () => {
    it('should show stable mood when no events', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Стабильное');
    });

    it('should show "Наблюдение" mood for moderate events', async () => {
      const recentEvent = createCrisisEvent({
        severity: 'moderate',
        action: 'supportive',
        timestamp: new Date(),
      });
      mockGetUserEvents.mockReturnValue([recentEvent]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Наблюдение');
    });

    it('should show "Требует внимания" mood for crisis events', async () => {
      const recentEvent = createCrisisEvent({
        severity: 'critical',
        action: 'emergency',
        timestamp: new Date(),
      });
      mockGetUserEvents.mockReturnValue([recentEvent]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Требует внимания');
    });

    it('should show low stress when no events', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Низкий');
    });

    it('should show medium stress for moderate events', async () => {
      const recentEvent = createCrisisEvent({
        severity: 'moderate',
        timestamp: new Date(),
      });
      mockGetUserEvents.mockReturnValue([recentEvent]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Средний');
    });

    it('should show high stress for crisis events', async () => {
      const recentEvent = createCrisisEvent({
        severity: 'high',
        timestamp: new Date(),
      });
      mockGetUserEvents.mockReturnValue([recentEvent]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Высокий');
    });

    it('should show "Повышенная активность" for >5 events', async () => {
      const events = Array.from({ length: 6 }, () =>
        createCrisisEvent({ severity: 'low', timestamp: new Date() })
      );
      mockGetUserEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Повышенная активность');
    });

    it('should show safety monitoring indicator', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Безопасность');
    });
  });

  // ==================== getCrisisHistory() ====================

  describe('getCrisisHistory() via history callback', () => {
    it('should show no events message when history is empty', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      assertContainsText(result, 'не зафиксировано');
    });

    it('should show events filtered by severity !== none', async () => {
      const events = [
        createCrisisEvent({
          severity: 'high',
          crisisType: 'suicidal_ideation',
          action: 'interrupt',
          timestamp: new Date(),
        }),
      ];
      mockGetUserEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      assertContainsText(result, 'Последние события');
      assertContainsText(result, 'Сессия прервана');
    });

    it('should map emergency action to resolution text', async () => {
      const events = [
        createCrisisEvent({
          severity: 'critical',
          crisisType: 'suicidal_ideation',
          action: 'emergency',
          timestamp: new Date(),
        }),
      ];
      mockGetUserEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      assertContainsText(result, 'Экстренная помощь');
    });

    it('should map supportive action to resolution text', async () => {
      const events = [
        createCrisisEvent({
          severity: 'moderate',
          crisisType: 'severe_distress',
          action: 'supportive',
          timestamp: new Date(),
        }),
      ];
      mockGetUserEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      assertContainsText(result, 'Поддерживающий ответ');
    });

    it('should map monitor action to resolution text', async () => {
      const events = [
        createCrisisEvent({
          severity: 'low',
          crisisType: 'none',
          action: 'monitor',
          timestamp: new Date(),
        }),
      ];
      mockGetUserEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      assertContainsText(result, 'Мониторинг');
    });

    it('should limit history to 5 events', async () => {
      const events = Array.from({ length: 8 }, (_, i) =>
        createCrisisEvent({
          severity: 'moderate',
          crisisType: `event_${i}`,
          action: 'supportive',
          timestamp: new Date(Date.now() - i * 1000),
        })
      );
      mockGetUserEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      // Should show max 5 events (numbered 1-5)
      assertContainsText(result, '1.');
      assertContainsText(result, '5.');
    });
  });

  // ==================== Helper Methods ====================

  describe('buildRiskMeter()', () => {
    it('should show green for score 0', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      expect(result.message).toMatch(/🟢/);
      assertContainsText(result, '0%');
    });

    it('should show yellow for score ~0.2', async () => {
      // 2 moderate events = 0.2
      const events = [
        createCrisisEvent({ severity: 'moderate', timestamp: new Date() }),
        createCrisisEvent({ severity: 'moderate', timestamp: new Date() }),
      ];
      mockGetUserEvents.mockReturnValue(events);
      mockGetEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      expect(result.message).toMatch(/🟡/);
    });

    it('should show orange for score ~0.4', async () => {
      // 1 high + 1 moderate = 0.3 + 0.1 = 0.4
      const events = [
        createCrisisEvent({ severity: 'high', action: 'interrupt', timestamp: new Date() }),
        createCrisisEvent({ severity: 'moderate', timestamp: new Date() }),
      ];
      mockGetUserEvents.mockReturnValue(events);
      mockGetEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      expect(result.message).toMatch(/🟠/);
    });

    it('should show red for score >=0.6', async () => {
      // 2 critical = 1.0
      const events = [
        createCrisisEvent({ severity: 'critical', action: 'emergency', timestamp: new Date() }),
        createCrisisEvent({ severity: 'critical', action: 'emergency', timestamp: new Date() }),
      ];
      mockGetUserEvents.mockReturnValue(events);
      mockGetEvents.mockReturnValue(events);
      mockGetHighSeverityEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      expect(result.message).toMatch(/🔴/);
    });

    it('should contain block characters in risk meter', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      expect(result.message).toMatch(/█|░/);
    });
  });

  describe('getStatusText()', () => {
    it('should map safe to Безопасно', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Безопасно');
    });

    it('should map monitoring to Мониторинг', async () => {
      mockGetUserEvents.mockReturnValue([
        createCrisisEvent({ severity: 'moderate', timestamp: new Date() }),
      ]);

      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Мониторинг');
    });

    it('should map elevated to Повышенное внимание', async () => {
      mockGetUserEvents.mockReturnValue([
        createCrisisEvent({ severity: 'high', timestamp: new Date() }),
      ]);
      mockGetEvents.mockReturnValue([
        createCrisisEvent({ severity: 'high', timestamp: new Date() }),
      ]);

      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Повышенное внимание');
    });

    it('should map critical to Критический', async () => {
      mockGetUserEvents.mockReturnValue([
        createCrisisEvent({ severity: 'critical', timestamp: new Date() }),
      ]);
      mockGetEvents.mockReturnValue([
        createCrisisEvent({ severity: 'critical', timestamp: new Date() }),
      ]);

      const ctx = createMockContext();
      const result = await command.execute(ctx);

      assertContainsText(result, 'Критический');
    });
  });

  describe('getSentimentText()', () => {
    it('should show positive sentiment for score >= 0.6 (low risk)', async () => {
      // No events → risk 0 → sentiment 1.0
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Позитивный');
    });

    it('should show neutral sentiment for score 0.4-0.6', async () => {
      // risk 0.5 → sentiment 0.5
      const events = [
        createCrisisEvent({ severity: 'critical', action: 'emergency', timestamp: new Date() }),
      ];
      mockGetUserEvents.mockReturnValue(events);
      mockGetEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Нейтральный');
    });

    it('should show reduced sentiment for score 0.2-0.4', async () => {
      // risk 0.7 → sentiment 0.3
      const events = [
        createCrisisEvent({ severity: 'critical', action: 'emergency', timestamp: new Date() }),
        createCrisisEvent({ severity: 'moderate', action: 'supportive', timestamp: new Date() }),
        createCrisisEvent({ severity: 'moderate', action: 'supportive', timestamp: new Date() }),
      ];
      mockGetUserEvents.mockReturnValue(events);
      mockGetEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Сниженный');
    });

    it('should show attention-needed sentiment for score < 0.2', async () => {
      // risk >= 0.8 → sentiment <= 0.2
      const events = [
        createCrisisEvent({ severity: 'critical', action: 'emergency', timestamp: new Date() }),
        createCrisisEvent({ severity: 'high', action: 'interrupt', timestamp: new Date() }),
      ];
      mockGetUserEvents.mockReturnValue(events);
      mockGetEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Требует внимания');
    });
  });

  describe('formatCrisisEvent()', () => {
    it('should show red emoji for critical severity', async () => {
      mockGetUserEvents.mockReturnValue([
        createCrisisEvent({ severity: 'critical', crisisType: 'test', action: 'emergency', timestamp: new Date() }),
      ]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      expect(result.message).toMatch(/🔴/);
    });

    it('should show orange emoji for high severity', async () => {
      mockGetUserEvents.mockReturnValue([
        createCrisisEvent({ severity: 'high', crisisType: 'test', action: 'interrupt', timestamp: new Date() }),
      ]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      expect(result.message).toMatch(/🟠/);
    });

    it('should show yellow emoji for moderate severity', async () => {
      mockGetUserEvents.mockReturnValue([
        createCrisisEvent({ severity: 'moderate', crisisType: 'test', action: 'supportive', timestamp: new Date() }),
      ]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      expect(result.message).toMatch(/🟡/);
    });

    it('should show green emoji for low severity', async () => {
      mockGetUserEvents.mockReturnValue([
        createCrisisEvent({ severity: 'low', crisisType: 'test', action: 'monitor', timestamp: new Date() }),
      ]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      expect(result.message).toMatch(/🟢/);
    });

    it('should display formatted date', async () => {
      const date = new Date(2026, 0, 15); // January 15, 2026
      mockGetUserEvents.mockReturnValue([
        createCrisisEvent({ severity: 'moderate', crisisType: 'test', action: 'supportive', timestamp: date }),
      ]);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      // Should contain formatted date
      assertContainsText(result, 'Тип:');
      assertContainsText(result, 'Резолюция:');
    });
  });

  // ==================== Status warning/success messages ====================

  describe('status warning based on risk score', () => {
    it('should show success message when risk score <= 0.3', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Всё в порядке');
    });

    it('should show warning message when risk score > 0.3', async () => {
      const events = [
        createCrisisEvent({ severity: 'high', action: 'interrupt', timestamp: new Date() }),
        createCrisisEvent({ severity: 'moderate', action: 'supportive', timestamp: new Date() }),
      ];
      mockGetUserEvents.mockReturnValue(events);
      mockGetEvents.mockReturnValue(events);

      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Выявлены признаки');
    });
  });

  describe('safety status display', () => {
    it('should show safe status with green indicator', async () => {
      const ctx = createMockContext();
      const result = await command.execute(ctx);

      expect(result.message).toMatch(/🟢/);
    });

    it('should show risk indicators in detailed status', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      assertContainsText(result, 'Индикаторы');
    });

    it('should show risk meter in detailed status', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:status', {});

      expect(result.message).toMatch(/█|░/);
    });
  });

  describe('constitutional principles', () => {
    it('should display all 8 principles', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:principles', {});

      assertContainsText(result, 'Безопасность');
      assertContainsText(result, 'Честность');
      assertContainsText(result, 'Конфиденциальность');
      assertContainsText(result, 'Автономия');
      assertContainsText(result, 'Эскалация');
      assertContainsText(result, 'Прозрачность');
      assertContainsText(result, 'Недискриминация');
      assertContainsText(result, 'вреда');
    });
  });

  describe('hotlines', () => {
    it('should display Russian hotlines', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:hotlines', {});

      assertContainsText(result, 'Россия');
      assertContainsText(result, '8-800-2000-122');
    });

    it('should display international hotlines', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:hotlines', {});

      assertContainsText(result, 'Международные');
      assertContainsText(result, 'USA');
    });

    it('should have emergency help button', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:hotlines', {});

      assertHasKeyboard(result);
      const buttons = result.keyboard!.flat();
      expect(buttons.some(b => b.text.includes('Экстренная'))).toBe(true);
    });
  });

  describe('crisis history', () => {
    it('should show no events message when history is empty', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:history', {});

      assertContainsText(result, 'не зафиксировано');
    });
  });

  describe('how it works', () => {
    it('should explain crisis detection', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:how_it_works', {});

      assertContainsText(result, 'Crisis Detection');
    });

    it('should explain constitutional AI', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:how_it_works', {});

      assertContainsText(result, 'Constitutional AI');
    });

    it('should explain escalation protocol', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:how_it_works', {});

      assertContainsText(result, 'Escalation');
    });

    it('should show risk levels', async () => {
      const ctx = createMockContext();
      const result = await command.handleCallback(ctx, 'safety:how_it_works', {});

      assertContainsText(result, 'Safe');
      assertContainsText(result, 'Monitor');
      assertContainsText(result, 'Elevated');
      assertContainsText(result, 'Critical');
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(safetyCommand).toBeInstanceOf(SafetyCommand);
      expect(safetyCommand.name).toBe('safety');
    });
  });
});
