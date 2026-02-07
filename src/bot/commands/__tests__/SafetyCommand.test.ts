/**
 * SafetyCommand Tests - Safety-Critical Module
 * =============================================
 *
 * IEC 62304 Class C - Maximum verification required
 * Constitutional AI Principles - Anthropic 2023
 *
 * Tests verify:
 * - Safety dashboard display
 * - Crisis history retrieval
 * - Constitutional principles display
 * - Hotlines display (Russian + international)
 * - Safety system explanation
 * - Real-time status from CrisisDetectionService
 *
 * CRITICAL: Safety status must accurately reflect crisis events.
 *
 * @packageDocumentation
 */

import { SafetyCommand, safetyCommand } from '../SafetyCommand';
import type { ISleepCoreContext } from '../interfaces/ICommand';

// Mock dependencies
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    say: (text: string) => `_${text}_`,
    tip: (text: string) => `💡 ${text}`,
  },
}));

jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
    warning: (text: string) => `⚠️ ${text}`,
    success: (text: string) => `✅ ${text}`,
  },
}));

// Mock SleepCoreAPI
const mockGetEvents = jest.fn();
const mockGetUserEvents = jest.fn();
const mockGetHighSeverityEvents = jest.fn();

jest.mock('../../../SleepCoreAPI', () => ({
  sleepCore: {
    getCrisisDetection: () => ({
      getEvents: mockGetEvents,
      getUserEvents: mockGetUserEvents,
      getHighSeverityEvents: mockGetHighSeverityEvents,
    }),
  },
}));

describe('SafetyCommand', () => {
  let command: SafetyCommand;
  let mockContext: ISleepCoreContext;

  beforeEach(() => {
    command = new SafetyCommand();

    // Reset mocks
    mockGetEvents.mockReset();
    mockGetUserEvents.mockReset();
    mockGetHighSeverityEvents.mockReset();

    // Default: no events (safe state)
    mockGetEvents.mockReturnValue([]);
    mockGetUserEvents.mockReturnValue([]);
    mockGetHighSeverityEvents.mockReturnValue([]);

    // Create mock context
    mockContext = {
      userId: 'user123',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {},
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('safety');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('безопасност');
    });

    it('should have safety-related aliases', () => {
      expect(command.aliases).toContain('безопасность');
      expect(command.aliases).toContain('safety_status');
      expect(command.aliases).toContain('crisis');
    });

    it('should NOT require session (accessible always)', () => {
      expect(command.requiresSession).toBe(false);
    });
  });

  // ==========================================================================
  // SAFETY DASHBOARD
  // ==========================================================================
  describe('Safety Dashboard', () => {
    it('should show safety dashboard on execute', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Статус безопасности');
    });

    it('should show active protection systems', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Constitutional AI');
      expect(result.message).toContain('Crisis Detection');
      expect(result.message).toContain('Human Escalation');
      expect(result.message).toContain('Adverse Event');
    });

    it('should show safe status when no events', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟢');
      expect(result.message).toContain('Безопасно');
    });

    it('should show navigation buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'safety:status')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'safety:history')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'safety:principles')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'safety:hotlines')).toBeDefined();
    });

    it('should show statistics', async () => {
      mockGetEvents.mockReturnValue([{}, {}, {}]);
      mockGetHighSeverityEvents.mockReturnValue([{}]);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Проверено сообщений');
      expect(result.message).toContain('Выявлено рисков');
    });
  });

  // ==========================================================================
  // SAFETY STATUS LEVELS
  // ==========================================================================
  describe('Safety Status Levels', () => {
    it('should show monitoring status when moderate events exist', async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 3);

      mockGetUserEvents.mockReturnValue([
        { timestamp: weekAgo, severity: 'moderate', crisisType: 'sleep_related' },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'safety:status',
        {}
      );

      expect(result.message).toContain('Мониторинг');
    });

    it('should show elevated status when high severity events exist', async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 2);

      mockGetUserEvents.mockReturnValue([
        { timestamp: weekAgo, severity: 'high', crisisType: 'acute_distress' },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'safety:status',
        {}
      );

      // High severity events show elevated risk indicators
      expect(result.message).toContain('Требует внимания');
      expect(result.message).toContain('Активный мониторинг');
    });

    it('should show critical status when critical events exist', async () => {
      const recent = new Date();

      mockGetUserEvents.mockReturnValue([
        { timestamp: recent, severity: 'critical', crisisType: 'suicidal_ideation' },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'safety:status',
        {}
      );

      // Critical status should show high risk indicators
      expect(result.message).toContain('Требует внимания');
      expect(result.message).toContain('Высокий'); // Stress level
    });
  });

  // ==========================================================================
  // CRISIS HISTORY
  // ==========================================================================
  describe('Crisis History', () => {
    it('should show empty history when no events', async () => {
      mockGetUserEvents.mockReturnValue([]);

      const result = await command.handleCallback(
        mockContext,
        'safety:history',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Событий не зафиксировано');
    });

    it('should show crisis events when they exist', async () => {
      const eventDate = new Date('2026-01-15');

      mockGetUserEvents.mockReturnValue([
        {
          timestamp: eventDate,
          severity: 'high',
          crisisType: 'acute_distress',
          action: 'interrupt',
        },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'safety:history',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('История событий');
      expect(result.message).toContain('acute_distress');
    });

    it('should limit history to 5 events', async () => {
      const events = Array(10).fill(null).map((_, i) => ({
        timestamp: new Date(2026, 0, i + 1),
        severity: 'moderate' as const,
        crisisType: `event_${i}`,
        action: 'monitor' as const,
      }));

      mockGetUserEvents.mockReturnValue(events);

      const result = await command.handleCallback(
        mockContext,
        'safety:history',
        {}
      );

      // Should only show 5 events (slice(0, 5))
      expect(result.message).toContain('event_0');
      expect(result.message).toContain('event_4');
      expect(result.message).not.toContain('event_5');
    });

    it('should show resolution for each event type', async () => {
      mockGetUserEvents.mockReturnValue([
        {
          timestamp: new Date(),
          severity: 'critical',
          crisisType: 'suicidal_ideation',
          action: 'emergency',
        },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'safety:history',
        {}
      );

      expect(result.message).toContain('Экстренная помощь');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:history',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'safety:dashboard')).toBeDefined();
    });
  });

  // ==========================================================================
  // CONSTITUTIONAL PRINCIPLES
  // ==========================================================================
  describe('Constitutional Principles', () => {
    it('should show all 8 constitutional principles', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:principles',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Конституционные принципы');
      expect(result.message).toContain('Безопасность прежде всего');
      expect(result.message).toContain('Честность');
      expect(result.message).toContain('Конфиденциальность');
      expect(result.message).toContain('Автономия');
      expect(result.message).toContain('Эскалация');
      expect(result.message).toContain('Прозрачность');
      expect(result.message).toContain('Недискриминация');
      expect(result.message).toContain('Минимизация вреда');
    });

    it('should mention that principles are immutable', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:principles',
        {}
      );

      expect(result.message).toContain('никогда');
    });

    it('should have navigation buttons', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:principles',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'safety:how_it_works')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'safety:dashboard')).toBeDefined();
    });
  });

  // ==========================================================================
  // HOTLINES
  // ==========================================================================
  describe('Hotlines Display', () => {
    it('should show Russian hotlines', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:hotlines',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('8-800-2000-122');
      expect(result.message).toContain('8-499-216-50-50');
      expect(result.message).toContain('Телефон доверия');
      expect(result.message).toContain('МЧС');
    });

    it('should show international hotlines', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:hotlines',
        {}
      );

      expect(result.message).toContain('USA');
      expect(result.message).toContain('988');
      expect(result.message).toContain('UK');
      expect(result.message).toContain('116 123');
    });

    it('should show online resources', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:hotlines',
        {}
      );

      expect(result.message).toContain('pomoschryadom.ru');
      expect(result.message).toContain('telefon-doveria.ru');
    });

    it('should have emergency button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:hotlines',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const emergencyButton = buttons.find(b => b.callbackData?.includes('sos'));

      expect(emergencyButton).toBeDefined();
      expect(emergencyButton?.text).toContain('Экстренная');
    });

    it('should include urgent call-to-action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:hotlines',
        {}
      );

      expect(result.message).toContain('СЕЙЧАС');
    });
  });

  // ==========================================================================
  // HOW SAFETY WORKS
  // ==========================================================================
  describe('How Safety Works', () => {
    it('should explain crisis detection flow', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:how_it_works',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Crisis Detection');
      expect(result.message).toContain('Анализ ключевых слов');
      expect(result.message).toContain('Оценка риска');
    });

    it('should explain Constitutional AI middleware', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:how_it_works',
        {}
      );

      expect(result.message).toContain('Constitutional AI');
      expect(result.message).toContain('Проверка на соответствие');
    });

    it('should explain escalation protocol', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:how_it_works',
        {}
      );

      expect(result.message).toContain('Escalation Protocol');
      expect(result.message).toContain('Уведомление администратора');
      expect(result.message).toContain('Adverse Event');
    });

    it('should explain risk levels', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:how_it_works',
        {}
      );

      expect(result.message).toContain('🟢 Safe');
      expect(result.message).toContain('🟡 Monitor');
      expect(result.message).toContain('🟠 Elevated');
      expect(result.message).toContain('🔴 Critical');
    });
  });

  // ==========================================================================
  // FEEDBACK FORM
  // ==========================================================================
  describe('Feedback Form', () => {
    it('should show feedback instructions', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:feedback',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Обратная связь');
      expect(result.message).toContain('Email');
      expect(result.message).toContain('Telegram');
    });

    it('should mention 24-hour response time', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:feedback',
        {}
      );

      expect(result.message).toContain('24 часов');
    });
  });

  // ==========================================================================
  // DETAILED STATUS
  // ==========================================================================
  describe('Detailed Status', () => {
    it('should show risk meter', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:status',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Уровень риска');
      expect(result.message).toMatch(/[█░]/); // Risk meter characters
    });

    it('should show risk indicators', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:status',
        {}
      );

      expect(result.message).toContain('Настроение');
      expect(result.message).toContain('Коммуникация');
      expect(result.message).toContain('Стресс');
      expect(result.message).toContain('Безопасность');
    });

    it('should show weekly statistics', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:status',
        {}
      );

      expect(result.message).toContain('Последние 7 дней');
      expect(result.message).toContain('Сообщений проанализировано');
    });

    it('should show success message when risk is low', async () => {
      mockGetUserEvents.mockReturnValue([]);

      const result = await command.handleCallback(
        mockContext,
        'safety:status',
        {}
      );

      expect(result.message).toContain('Всё в порядке');
    });

    it('should have help button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:status',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'safety:hotlines')).toBeDefined();
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    it('should handle status callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:status',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Детальный статус');
    });

    it('should handle history callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:history',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('История');
    });

    it('should handle principles callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:principles',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Конституционные');
    });

    it('should handle hotlines callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:hotlines',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Горячие линии');
    });

    it('should handle how_it_works callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:how_it_works',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Как работает');
    });

    it('should handle feedback callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:feedback',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Обратная связь');
    });

    it('should return to dashboard on unknown callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'safety:unknown_action',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Статус безопасности');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(safetyCommand).toBeInstanceOf(SafetyCommand);
    });

    it('should have correct name', () => {
      expect(safetyCommand.name).toBe('safety');
    });
  });
});
