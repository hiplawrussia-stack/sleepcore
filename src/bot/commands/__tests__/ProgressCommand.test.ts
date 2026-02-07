/**
 * ProgressCommand Tests
 * =====================
 *
 * Weekly progress report with visualizations.
 *
 * Research basis:
 * - Weekly progress reports reduce dropout to 12-20% (Sleepio study)
 * - Visual feedback increases engagement (JMIR 2025)
 * - Traffic light indicators (KANOPEE pattern)
 *
 * Tests verify:
 * - Progress report display with ISI/SE metrics
 * - PLRNN-based predictions
 * - Pattern alerts from ProactiveIntelligence
 * - Cognitive progress (DBAS-16 inspired)
 * - Detailed stats and export for doctor
 * - Response status indicators
 *
 * @packageDocumentation
 */

import { ProgressCommand, progressCommand } from '../ProgressCommand';
import type { ISleepCoreContext } from '../interfaces/ICommand';

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    encourageByWeek: (week: number) => ({
      emoji: '🎉',
      text: `Отлично, неделя ${week}!`,
    }),
    respondToEmotion: (emotion: string) => ({
      emoji: emotion === 'positive' ? '😊' : emotion === 'hopeful' ? '🤗' : '💪',
      text: emotion === 'positive' ? 'Вы молодец!' : 'Я рядом!',
    }),
  },
}));

// Mock formatter
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
    info: (text: string) => `ℹ️ ${text}`,
    warning: (text: string) => `⚠️ ${text}`,
    isiScore: (score: number) => `ISI: ${score}/28`,
    sleepEfficiency: (se: number) => `SE: ${se.toFixed(1)}%`,
    adherence: (adherence: number) => `Приверженность: ${(adherence * 100).toFixed(0)}%`,
    treatmentWeek: (week: number) => `Неделя терапии: ${week}`,
    bulletList: (items: string[]) => items.map(item => `• ${item}`).join('\n'),
  },
}));

describe('ProgressCommand', () => {
  let command: ProgressCommand;
  let mockContext: ISleepCoreContext;
  let mockGetSession: jest.Mock;
  let mockGetProgressReport: jest.Mock;
  let mockGetSleepEfficiencyTrend: jest.Mock;
  let mockGetWeeklySummary: jest.Mock;
  let mockGetSleepPrediction: jest.Mock;
  let mockRunProactiveAnalysis: jest.Mock;
  let mockGetSleepStates: jest.Mock;
  let mockGenerateCognitiveProgressReport: jest.Mock;

  const mockReport = {
    currentISI: 12,
    isiChange: 4,
    currentSleepEfficiency: 82.5,
    sleepEfficiencyChange: 8.3,
    currentWeek: 3,
    overallAdherence: 0.85,
    achievements: ['7 дней подряд', 'SE > 80%'],
    improvements: ['Соблюдайте время подъёма'],
    responseStatus: 'responding' as const,
  };

  const mockWeeklySummary = {
    averages: {
      sleepOnsetLatency: 22,
      wakeAfterSleepOnset: 35,
      totalSleepTime: 390,
      timeInBed: 480,
    },
    recommendations: ['Сократите время в постели'],
  };

  const mockPrediction = {
    trend: 'improving' as const,
    sleepEfficiencyTrajectory: [
      { predicted: 83, lower: 78, upper: 88 },
      { predicted: 84, lower: 79, upper: 89 },
      { predicted: 85, lower: 80, upper: 90 },
      { predicted: 86, lower: 81, upper: 91 },
      { predicted: 86, lower: 81, upper: 91 },
      { predicted: 87, lower: 82, upper: 92 },
      { predicted: 88, lower: 83, upper: 93 },
    ],
    deteriorationRisk: 0.15,
    earlyWarnings: [],
    recommendations: ['Продолжайте соблюдать режим'],
  };

  beforeEach(() => {
    command = new ProgressCommand();

    mockGetSession = jest.fn();
    mockGetProgressReport = jest.fn();
    mockGetSleepEfficiencyTrend = jest.fn();
    mockGetWeeklySummary = jest.fn();
    mockGetSleepPrediction = jest.fn();
    mockRunProactiveAnalysis = jest.fn();
    mockGetSleepStates = jest.fn();
    mockGenerateCognitiveProgressReport = jest.fn();

    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getSession: mockGetSession,
        getProgressReport: mockGetProgressReport,
        getSleepEfficiencyTrend: mockGetSleepEfficiencyTrend,
        getWeeklySummary: mockGetWeeklySummary,
        getSleepPrediction: mockGetSleepPrediction,
        runProactiveAnalysis: mockRunProactiveAnalysis,
        getSleepStates: mockGetSleepStates,
        generateCognitiveProgressReport: mockGenerateCognitiveProgressReport,
      },
    } as unknown as ISleepCoreContext;

    // Default mocks
    mockGetSession.mockReturnValue({ userId: '12345' });
    mockGetProgressReport.mockReturnValue(mockReport);
    mockGetSleepEfficiencyTrend.mockReturnValue([75, 78, 80, 82, 81, 84, 83]);
    mockGetWeeklySummary.mockReturnValue(mockWeeklySummary);
    mockGetSleepPrediction.mockReturnValue({ predict: () => mockPrediction });
    mockRunProactiveAnalysis.mockResolvedValue({ patternAlerts: [], summary: { riskLevel: 'low' } });
    mockGetSleepStates.mockReturnValue([]);
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('progress');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('прогресс');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('stats');
      expect(command.aliases).toContain('report');
      expect(command.aliases).toContain('прогресс');
    });

    it('should require session', () => {
      expect(command.requiresSession).toBe(true);
    });

    it('should have initial step', () => {
      expect(command.steps).toContain('initial');
    });
  });

  // ==========================================================================
  // NO SESSION HANDLING
  // ==========================================================================
  describe('No Session Handling', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue(null);
    });

    it('should show warning when no session', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сессия не найдена');
    });

    it('should suggest starting program', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/start');
    });

    it('should have start button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const startButton = buttons.find(b => b.callbackData === 'start:begin');

      expect(startButton).toBeDefined();
      expect(startButton?.text).toContain('Начать');
    });
  });

  // ==========================================================================
  // INSUFFICIENT DATA HANDLING
  // ==========================================================================
  describe('Insufficient Data Handling', () => {
    beforeEach(() => {
      mockGetProgressReport.mockReturnValue(null);
    });

    it('should show info when insufficient data', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Недостаточно данных');
    });

    it('should mention 7 days requirement', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('7 дней');
    });

    it('should have diary button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const diaryButton = buttons.find(b => b.callbackData === 'diary:start');

      expect(diaryButton).toBeDefined();
      expect(diaryButton?.text).toContain('Записать');
    });
  });

  // ==========================================================================
  // MAIN REPORT DISPLAY
  // ==========================================================================
  describe('Main Report Display', () => {
    it('should show weekly report', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Еженедельный отчёт');
    });

    it('should include Sonya persona', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🦉');
      expect(result.message).toContain('Соня');
    });

    it('should show treatment week', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Неделя терапии');
      expect(result.message).toContain('3');
    });

    it('should show ISI score', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('ISI');
      expect(result.message).toContain('12');
    });

    it('should show ISI change with direction', async () => {
      const result = await command.execute(mockContext);

      // ISI change of 4 means improvement (decrease)
      expect(result.message).toContain('↓');
    });

    it('should show sleep efficiency', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('SE');
    });

    it('should show SE change with direction', async () => {
      const result = await command.execute(mockContext);

      // SE change of +8.3% means improvement (increase)
      expect(result.message).toContain('↑');
    });

    it('should show adherence', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Приверженность');
    });

    it('should show achievements', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Достижения');
      expect(result.message).toContain('7 дней подряд');
    });

    it('should show improvements focus', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Фокус на следующую неделю');
    });

    it('should include recommendations from weekly summary', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Сократите время в постели');
    });

    it('should show response status', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟢');
      expect(result.message).toContain('Отличный ответ на терапию');
    });
  });

  // ==========================================================================
  // RESPONSE STATUS INDICATORS
  // ==========================================================================
  describe('Response Status Indicators', () => {
    it('should show green for responding status', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟢');
      expect(result.message).toContain('Отличный ответ');
    });

    it('should show yellow for partial status', async () => {
      mockGetProgressReport.mockReturnValue({
        ...mockReport,
        responseStatus: 'partial',
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟡');
      expect(result.message).toContain('Частичный ответ');
    });

    it('should show orange for non-responding status', async () => {
      mockGetProgressReport.mockReturnValue({
        ...mockReport,
        responseStatus: 'non-responding',
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟠');
      expect(result.message).toContain('Требуется корректировка');
    });

    it('should mention third-wave therapies for non-responders', async () => {
      mockGetProgressReport.mockReturnValue({
        ...mockReport,
        responseStatus: 'non-responding',
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('MBT-I');
      expect(result.message).toContain('ACT-I');
    });
  });

  // ==========================================================================
  // TREND CHART VISUALIZATION
  // ==========================================================================
  describe('Trend Chart Visualization', () => {
    it('should show 7-day SE trend', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Эффективность сна (7 дней)');
    });

    it('should show day labels', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Пн');
      expect(result.message).toContain('Вт');
    });

    it('should show percentage values', async () => {
      const result = await command.execute(mockContext);

      // Check for percentage signs
      expect(result.message).toMatch(/\d+%/);
    });

    it('should handle empty trend data', async () => {
      mockGetSleepEfficiencyTrend.mockReturnValue([]);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Нет данных');
    });
  });

  // ==========================================================================
  // PLRNN PREDICTION SECTION
  // ==========================================================================
  describe('PLRNN Prediction Section', () => {
    it('should show prediction section', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Прогноз на 7 дней');
    });

    it('should show trend indicator', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Тренд');
      expect(result.message).toContain('Улучшение');
    });

    it('should show improving trend with green icon', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟢📈');
    });

    it('should show stable trend with yellow icon', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({ ...mockPrediction, trend: 'stable' }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟡➡️');
      expect(result.message).toContain('Стабильно');
    });

    it('should show declining trend with orange icon', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({ ...mockPrediction, trend: 'declining' }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟠📉');
      expect(result.message).toContain('Снижение');
    });

    it('should show critical trend with red icon', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({ ...mockPrediction, trend: 'critical' }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🔴⚠️');
      expect(result.message).toContain('Требует внимания');
    });

    it('should show prediction recommendations', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Продолжайте соблюдать режим');
    });

    it('should show deterioration risk when high', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({ ...mockPrediction, deteriorationRisk: 0.75 }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🔴');
      expect(result.message).toContain('Высокий риск');
    });

    it('should show moderate risk warning', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({ ...mockPrediction, deteriorationRisk: 0.55 }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟠');
      expect(result.message).toContain('Умеренный риск');
    });

    it('should not show risk when low', async () => {
      const result = await command.execute(mockContext);

      // Risk is 0.15, below 0.3 threshold
      expect(result.message).not.toContain('риск ухудшения');
    });

    it('should handle null prediction gracefully', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => null,
      });

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      // Should still show report, just without prediction section
    });
  });

  // ==========================================================================
  // EARLY WARNINGS
  // ==========================================================================
  describe('Early Warnings', () => {
    it('should show high severity warnings', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({
          ...mockPrediction,
          earlyWarnings: [
            {
              severity: 'high',
              strength: 0.8,
              messageRu: 'Нарастающая нестабильность сна',
            },
          ],
        }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('На что обратить внимание');
      expect(result.message).toContain('🟠');
      expect(result.message).toContain('Нарастающая нестабильность');
    });

    it('should show critical warnings with red icon', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({
          ...mockPrediction,
          earlyWarnings: [
            {
              severity: 'critical',
              strength: 0.9,
              messageRu: 'Критическое замедление восстановления',
            },
          ],
        }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🔴');
      expect(result.message).toContain('Критическое замедление');
    });

    it('should limit warnings to top 2', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({
          ...mockPrediction,
          earlyWarnings: [
            { severity: 'high', strength: 0.9, messageRu: 'Warning 1' },
            { severity: 'high', strength: 0.8, messageRu: 'Warning 2' },
            { severity: 'high', strength: 0.7, messageRu: 'Warning 3' },
          ],
        }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Warning 1');
      expect(result.message).toContain('Warning 2');
      expect(result.message).not.toContain('Warning 3');
    });

    it('should filter out low severity warnings', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({
          ...mockPrediction,
          earlyWarnings: [
            { severity: 'low', strength: 0.3, messageRu: 'Minor fluctuation' },
          ],
        }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).not.toContain('Minor fluctuation');
    });
  });

  // ==========================================================================
  // PATTERN ALERTS (PROACTIVE INTELLIGENCE)
  // ==========================================================================
  describe('Pattern Alerts Section', () => {
    it('should show pattern alerts when available', async () => {
      mockGetSleepStates.mockReturnValue(new Array(14).fill({ date: '2026-02-01' }));
      mockRunProactiveAnalysis.mockResolvedValue({
        patternAlerts: [
          {
            type: 'improvement',
            descriptionRu: 'Улучшение времени засыпания',
          },
        ],
        summary: { riskLevel: 'low' },
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Обнаруженные паттерны');
      expect(result.message).toContain('🟢');
      expect(result.message).toContain('Улучшение времени засыпания');
    });

    it('should show deterioration pattern with orange', async () => {
      mockGetSleepStates.mockReturnValue(new Array(14).fill({ date: '2026-02-01' }));
      mockRunProactiveAnalysis.mockResolvedValue({
        patternAlerts: [
          {
            type: 'deterioration',
            descriptionRu: 'Ухудшение эффективности сна',
          },
        ],
        summary: { riskLevel: 'medium' },
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟠');
      expect(result.message).toContain('Ухудшение эффективности');
    });

    it('should show instability pattern with yellow', async () => {
      mockGetSleepStates.mockReturnValue(new Array(14).fill({ date: '2026-02-01' }));
      mockRunProactiveAnalysis.mockResolvedValue({
        patternAlerts: [
          {
            type: 'instability',
            descriptionRu: 'Нестабильный режим сна',
          },
        ],
        summary: { riskLevel: 'medium' },
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟡');
      expect(result.message).toContain('Нестабильный режим');
    });

    it('should show high risk warning', async () => {
      mockGetSleepStates.mockReturnValue(new Array(14).fill({ date: '2026-02-01' }));
      mockRunProactiveAnalysis.mockResolvedValue({
        patternAlerts: [{ type: 'deterioration', descriptionRu: 'Test' }],
        summary: { riskLevel: 'high' },
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🔴');
      expect(result.message).toContain('Повышенный уровень риска');
      expect(result.message).toContain('терапевтом');
    });

    it('should limit alerts to top 2', async () => {
      mockGetSleepStates.mockReturnValue(new Array(14).fill({ date: '2026-02-01' }));
      mockRunProactiveAnalysis.mockResolvedValue({
        patternAlerts: [
          { type: 'improvement', descriptionRu: 'Alert 1' },
          { type: 'improvement', descriptionRu: 'Alert 2' },
          { type: 'improvement', descriptionRu: 'Alert 3' },
        ],
        summary: { riskLevel: 'low' },
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Alert 1');
      expect(result.message).toContain('Alert 2');
      expect(result.message).not.toContain('Alert 3');
    });

    it('should skip section when insufficient history', async () => {
      mockGetSleepStates.mockReturnValue([{ date: '2026-02-01' }]); // Only 1 day

      const result = await command.execute(mockContext);

      expect(result.message).not.toContain('Обнаруженные паттерны');
    });

    it('should handle analysis error gracefully', async () => {
      mockGetSleepStates.mockReturnValue(new Array(14).fill({ date: '2026-02-01' }));
      mockRunProactiveAnalysis.mockRejectedValue(new Error('Analysis failed'));

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      // Should still show report without pattern section
    });
  });

  // ==========================================================================
  // KEYBOARD BUTTONS
  // ==========================================================================
  describe('Keyboard Buttons', () => {
    it('should have detailed stats button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const detailedButton = buttons.find(b => b.callbackData === 'progress:detailed');

      expect(detailedButton).toBeDefined();
      expect(detailedButton?.text).toContain('Подробная статистика');
    });

    it('should have today task button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const todayButton = buttons.find(b => b.callbackData === 'today:show');

      expect(todayButton).toBeDefined();
      expect(todayButton?.text).toContain('Задание');
    });

    it('should have export button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const exportButton = buttons.find(b => b.callbackData === 'progress:export');

      expect(exportButton).toBeDefined();
      expect(exportButton?.text).toContain('Экспорт');
    });
  });

  // ==========================================================================
  // DETAILED STATS CALLBACK
  // ==========================================================================
  describe('Detailed Stats Callback', () => {
    it('should show detailed statistics', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Подробная статистика');
    });

    it('should show SOL with target', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('SOL');
      expect(result.message).toContain('время засыпания');
      expect(result.message).toContain('22'); // From mock
      expect(result.message).toContain('< 20 мин');
    });

    it('should show WASO with target', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('WASO');
      expect(result.message).toContain('пробуждения');
      expect(result.message).toContain('< 30 мин');
    });

    it('should show TST in minutes and hours', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('TST');
      expect(result.message).toContain('390');
      expect(result.message).toContain('6.5');
    });

    it('should show TIB in minutes and hours', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('TIB');
      expect(result.message).toContain('480');
      expect(result.message).toContain('8.0');
    });

    it('should show SE with target', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('SE');
      expect(result.message).toContain('≥ 85%');
    });

    it('should show ISI severity classification', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('ISI');
      expect(result.message).toContain('12');
    });

    it('should show traffic light indicators for metrics', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      // SOL 22 > 20 should be yellow
      expect(result.message).toContain('🟡');
    });

    it('should show back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'progress:show');

      expect(backButton).toBeDefined();
      expect(backButton?.text).toContain('Назад');
    });

    it('should handle insufficient data', async () => {
      mockGetProgressReport.mockReturnValue(null);

      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('Недостаточно данных');
    });
  });

  // ==========================================================================
  // EXPORT FOR DOCTOR CALLBACK
  // ==========================================================================
  describe('Export for Doctor Callback', () => {
    it('should show export format', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:export',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Отчёт для врача');
    });

    it('should include forwarding instruction', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:export',
        {}
      );

      expect(result.message).toContain('переслать');
      expect(result.message).toContain('врач');
    });

    it('should show formal report header', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:export',
        {}
      );

      expect(result.message).toContain('ОТЧЁТ О ПРОГРЕССЕ CBT-I');
      expect(result.message).toContain('SleepCore Digital Therapeutic');
    });

    it('should include date', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:export',
        {}
      );

      expect(result.message).toContain('Дата:');
    });

    it('should include therapy week', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:export',
        {}
      );

      expect(result.message).toContain('Неделя терапии');
      expect(result.message).toContain('3');
    });

    it('should show ISI score with max', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:export',
        {}
      );

      expect(result.message).toContain('ISI Score');
      expect(result.message).toContain('/28');
    });

    it('should show all key metrics', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:export',
        {}
      );

      expect(result.message).toContain('Sleep Efficiency');
      expect(result.message).toContain('Avg SOL');
      expect(result.message).toContain('Avg WASO');
      expect(result.message).toContain('Avg TST');
      expect(result.message).toContain('Adherence');
      expect(result.message).toContain('Response Status');
    });

    it('should cite scientific sources', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:export',
        {}
      );

      expect(result.message).toContain('Danilenko');
      expect(result.message).toContain('Spielman');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:export',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'progress:show');

      expect(backButton).toBeDefined();
    });

    it('should handle insufficient data', async () => {
      mockGetProgressReport.mockReturnValue(null);

      const result = await command.handleCallback(
        mockContext,
        'progress:export',
        {}
      );

      expect(result.message).toContain('Недостаточно данных');
    });
  });

  // ==========================================================================
  // HANDLE STEP
  // ==========================================================================
  describe('Handle Step', () => {
    it('should execute on initial step', async () => {
      const result = await command.handleStep(mockContext, 'initial', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Еженедельный отчёт');
    });

    it('should reject unknown step', async () => {
      const result = await command.handleStep(mockContext, 'unknown', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown step');
    });
  });

  // ==========================================================================
  // CALLBACK HANDLERS
  // ==========================================================================
  describe('Callback Handlers', () => {
    it('should handle show callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:show',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Еженедельный отчёт');
    });

    it('should reject invalid callback prefix', async () => {
      const result = await command.handleCallback(
        mockContext,
        'other:action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid callback');
    });

    it('should reject unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'progress:unknown',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  // ==========================================================================
  // METRIC TRAFFIC LIGHTS
  // ==========================================================================
  describe('Metric Traffic Lights', () => {
    it('should show green for good SOL', async () => {
      mockGetWeeklySummary.mockReturnValue({
        ...mockWeeklySummary,
        averages: { ...mockWeeklySummary.averages, sleepOnsetLatency: 15 },
      });

      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('15');
      expect(result.message).toContain('✅');
    });

    it('should show red for bad SOL', async () => {
      mockGetWeeklySummary.mockReturnValue({
        ...mockWeeklySummary,
        averages: { ...mockWeeklySummary.averages, sleepOnsetLatency: 45 },
      });

      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('45');
      expect(result.message).toContain('🔴');
    });

    it('should show green for good WASO', async () => {
      mockGetWeeklySummary.mockReturnValue({
        ...mockWeeklySummary,
        averages: { ...mockWeeklySummary.averages, wakeAfterSleepOnset: 20 },
      });

      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('20');
      expect(result.message).toContain('✅');
    });

    it('should show green for ISI remission', async () => {
      mockGetProgressReport.mockReturnValue({
        ...mockReport,
        currentISI: 5,
      });

      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('Ремиссия');
    });

    it('should show red for clinical ISI', async () => {
      mockGetProgressReport.mockReturnValue({
        ...mockReport,
        currentISI: 18,
      });

      const result = await command.handleCallback(
        mockContext,
        'progress:detailed',
        {}
      );

      expect(result.message).toContain('🔴');
      expect(result.message).toContain('Клиническая');
    });
  });

  // ==========================================================================
  // SE LEVEL EMOJI
  // ==========================================================================
  describe('SE Level Emoji', () => {
    it('should show green for SE >= 85%', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({
          ...mockPrediction,
          sleepEfficiencyTrajectory: [
            { predicted: 88, lower: 83, upper: 93 },
          ],
        }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟢');
    });

    it('should show yellow for SE 75-84%', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({
          ...mockPrediction,
          sleepEfficiencyTrajectory: [
            { predicted: 78, lower: 73, upper: 83 },
          ],
        }),
      });

      const result = await command.execute(mockContext);

      // Will have yellow in trajectory
      expect(result.message).toContain('🟡');
    });

    it('should show orange for SE 65-74%', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({
          ...mockPrediction,
          sleepEfficiencyTrajectory: [
            { predicted: 70, lower: 65, upper: 75 },
          ],
        }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟠');
    });

    it('should show red for SE < 65%', async () => {
      mockGetSleepPrediction.mockReturnValue({
        predict: () => ({
          ...mockPrediction,
          sleepEfficiencyTrajectory: [
            { predicted: 55, lower: 50, upper: 60 },
          ],
        }),
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🔴');
    });
  });

  // ==========================================================================
  // EMPTY ACHIEVEMENTS/IMPROVEMENTS
  // ==========================================================================
  describe('Empty Achievements and Improvements', () => {
    it('should show placeholder for no achievements', async () => {
      mockGetProgressReport.mockReturnValue({
        ...mockReport,
        achievements: [],
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Пока нет достижений');
    });

    it('should show positive message when no improvements needed', async () => {
      mockGetProgressReport.mockReturnValue({
        ...mockReport,
        improvements: [],
      });
      mockGetWeeklySummary.mockReturnValue({
        ...mockWeeklySummary,
        recommendations: [],
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Всё идёт хорошо');
    });

    it('should limit achievements to top 3', async () => {
      mockGetProgressReport.mockReturnValue({
        ...mockReport,
        achievements: ['A1', 'A2', 'A3', 'A4', 'A5'],
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('A1');
      expect(result.message).toContain('A2');
      expect(result.message).toContain('A3');
      expect(result.message).not.toContain('A4');
    });

    it('should limit improvements to top 4', async () => {
      mockGetProgressReport.mockReturnValue({
        ...mockReport,
        improvements: ['I1', 'I2', 'I3', 'I4', 'I5'],
      });
      mockGetWeeklySummary.mockReturnValue({
        ...mockWeeklySummary,
        recommendations: [],
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('I1');
      expect(result.message).toContain('I2');
      expect(result.message).toContain('I3');
      expect(result.message).toContain('I4');
      expect(result.message).not.toContain('I5');
    });

    it('should deduplicate improvements from multiple sources', async () => {
      mockGetProgressReport.mockReturnValue({
        ...mockReport,
        improvements: ['Same improvement'],
      });
      mockGetWeeklySummary.mockReturnValue({
        ...mockWeeklySummary,
        recommendations: ['Same improvement', 'Different one'],
      });

      const result = await command.execute(mockContext);

      // Should contain "Same improvement" only once
      const count = (result.message?.match(/Same improvement/g) || []).length;
      expect(count).toBe(1);
      expect(result.message).toContain('Different one');
    });
  });

  // ==========================================================================
  // REPORT METADATA
  // ==========================================================================
  describe('Report Metadata', () => {
    it('should include report in metadata', async () => {
      const result = await command.execute(mockContext);

      expect(result.metadata?.report).toBeDefined();
      const report = result.metadata?.report as { currentISI: number };
      expect(report.currentISI).toBe(12);
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(progressCommand).toBeInstanceOf(ProgressCommand);
    });

    it('should have correct name', () => {
      expect(progressCommand.name).toBe('progress');
    });
  });
});
