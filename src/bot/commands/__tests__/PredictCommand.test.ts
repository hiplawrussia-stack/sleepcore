/**
 * PredictCommand Tests
 * ====================
 *
 * PLRNN-based 7-day sleep prediction with early warning signals.
 *
 * Research basis (2025-2026):
 * - npj Digital Medicine 2025: PLRNN outperforms linear models
 * - Harvard COMPASS: Conversational interface for predictions
 * - JITAI-Twins Framework: Digital Twin for adaptive interventions
 *
 * @packageDocumentation
 */

import { PredictCommand, predictCommand } from '../PredictCommand';
import type { ISleepCoreContext } from '../interfaces/ICommand';

// Mock persona
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    tip: (text: string) => `💡 ${text}`,
    say: (text: string) => `_${text}_`,
  },
}));

// Mock formatter
jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
    warning: (text: string) => `⚠️ ${text}`,
    success: (text: string) => `✅ ${text}`,
    progressBar: (percent: number, _total: number) => `[${'█'.repeat(Math.floor(percent / 10))}${'░'.repeat(10 - Math.floor(percent / 10))}]`,
  },
}));

// Mock sleepCore singleton
const mockPredict = jest.fn();
const mockGetHistory = jest.fn();
const mockCreateTwin = jest.fn();
const mockDetectTippingPoints = jest.fn();

jest.mock('../../../SleepCoreAPI', () => ({
  sleepCore: {
    getSleepPrediction: () => ({
      predict: mockPredict,
      getHistory: mockGetHistory,
    }),
  },
}));

describe('PredictCommand', () => {
  let command: PredictCommand;
  let mockContext: ISleepCoreContext;
  let mockGetSession: jest.Mock;

  // Sample prediction data
  const mockPrediction = {
    trend: 'improving',
    deteriorationRisk: 0.2,
    predictedSleepEfficiency: {
      value: 82,
      lower95: 75,
      upper95: 89,
      confidence: 0.85,
    },
    predictedMetrics: {
      sleepOnsetLatency: 15,
      wakeAfterSleepOnset: 20,
      totalSleepTime: 7.2,
      sleepQuality: 0.75,
    },
    sleepEfficiencyTrajectory: [
      { date: new Date(), predicted: 78, lower95: 70, upper95: 86 },
      { date: new Date(), predicted: 80, lower95: 72, upper95: 88 },
      { date: new Date(), predicted: 82, lower95: 75, upper95: 89 },
    ],
    earlyWarnings: [],
    recommendations: ['Соблюдайте режим сна', 'Ограничьте кофеин'],
  };

  beforeEach(() => {
    command = new PredictCommand();
    jest.clearAllMocks();

    mockGetSession = jest.fn().mockReturnValue({ startDate: new Date() });
    mockGetHistory.mockReturnValue([{}, {}, {}, {}, {}, {}, {}]); // 7 days
    mockPredict.mockResolvedValue(mockPrediction);
    mockCreateTwin.mockResolvedValue({});
    mockDetectTippingPoints.mockResolvedValue([]);

    mockContext = {
      userId: 'user123',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getSession: mockGetSession,
        getSleepPrediction: () => ({
          predict: mockPredict,
          getHistory: mockGetHistory,
        }),
        getDigitalTwin: () => ({
          createTwin: mockCreateTwin,
          detectTippingPoints: mockDetectTippingPoints,
        }),
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('predict');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('Прогноз');
      expect(command.description).toContain('7 дней');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('прогноз');
      expect(command.aliases).toContain('forecast');
      expect(command.aliases).toContain('prediction');
    });

    it('should require session', () => {
      expect(command.requiresSession).toBe(true);
    });
  });

  // ==========================================================================
  // NO SESSION
  // ==========================================================================
  describe('No Session', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue(null);
    });

    it('should show no session message', async () => {
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
      expect(buttons.find(b => b.callbackData === 'start:begin')).toBeDefined();
    });
  });

  // ==========================================================================
  // INSUFFICIENT DATA (0-2 days)
  // ==========================================================================
  describe('Insufficient Data', () => {
    beforeEach(() => {
      mockGetHistory.mockReturnValue([{}]); // Only 1 day
    });

    it('should show insufficient data message', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Недостаточно данных');
    });

    it('should show progress bar', async () => {
      mockGetHistory.mockReturnValue([{}, {}]); // 2 days

      const result = await command.execute(mockContext);

      expect(result.message).toContain('2/7 дней');
    });

    it('should show days remaining', async () => {
      mockGetHistory.mockReturnValue([{}, {}, {}]); // 3 days - will go to cold-start

      const result = await command.execute(mockContext);

      // 3 days triggers cold-start, not insufficient
      expect(result.message).toContain('Предварительная оценка');
    });

    it('should explain minimum requirement', async () => {
      mockGetHistory.mockReturnValue([{}]);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('7 дней');
      expect(result.message).toContain('минимум');
    });

    it('should have diary button', async () => {
      mockGetHistory.mockReturnValue([{}]);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'diary:start')).toBeDefined();
    });

    it('should explain PLRNN learning', async () => {
      mockGetHistory.mockReturnValue([{}, {}]);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('PLRNN');
    });
  });

  // ==========================================================================
  // COLD-START (3-6 days)
  // ==========================================================================
  describe('Cold-Start Prediction (3-6 days)', () => {
    beforeEach(() => {
      mockGetHistory.mockReturnValue([{}, {}, {}, {}, {}]); // 5 days
    });

    it('should show cold-start prediction', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Предварительная оценка');
    });

    it('should show progress bar', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('5/7 дней');
    });

    it('should show predicted SE value', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('82%');
    });

    it('should show confidence interval', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('75%');
      expect(result.message).toContain('89%');
    });

    it('should emphasize uncertainty (nocebo-safe)', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('предварительная оценка');
      expect(result.message).toContain('значительно вырастет');
    });

    it('should show days remaining for full prediction', async () => {
      mockGetHistory.mockReturnValue([{}, {}, {}, {}]); // 4 days

      const result = await command.execute(mockContext);

      expect(result.message).toContain('3'); // 7-4 = 3 days remaining
    });

    it('should have diary button as primary CTA', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons[0]?.callbackData).toBe('diary:start');
    });

    it('should have about button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'predict:about')).toBeDefined();
    });
  });

  // ==========================================================================
  // FULL PREDICTION DASHBOARD (7+ days)
  // ==========================================================================
  describe('Full Prediction Dashboard', () => {
    it('should show full dashboard with 7+ days', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Прогноз сна на 7 дней');
    });

    it('should show trend', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Тренд');
      expect(result.message).toContain('Улучшение');
    });

    it('should show trajectory visualization', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Прогноз эффективности');
      expect(result.message).toContain('█');
    });

    it('should show predicted SE with confidence', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('82%');
      expect(result.message).toContain('Уверенность');
    });

    it('should show deterioration risk', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Риск ухудшения');
      expect(result.message).toContain('20%');
    });

    it('should show warnings summary (none)', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Тревожных сигналов не обнаружено');
    });

    it('should have all action buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'predict:trajectory')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'predict:warnings')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'predict:recommendations')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'predict:tipping')).toBeDefined();
    });

    it('should have horizon selection buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'predict:short')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'predict:medium')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'predict:long')).toBeDefined();
    });
  });

  // ==========================================================================
  // TREND DISPLAY
  // ==========================================================================
  describe('Trend Display', () => {
    it('should show improving trend with emoji', async () => {
      mockPredict.mockResolvedValue({ ...mockPrediction, trend: 'improving' });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('📈');
      expect(result.message).toContain('Улучшение');
    });

    it('should show stable trend', async () => {
      mockPredict.mockResolvedValue({ ...mockPrediction, trend: 'stable' });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('➡️');
      expect(result.message).toContain('Стабильно');
    });

    it('should show declining trend', async () => {
      mockPredict.mockResolvedValue({ ...mockPrediction, trend: 'declining' });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('📉');
      expect(result.message).toContain('Снижение');
    });

    it('should show critical trend', async () => {
      mockPredict.mockResolvedValue({ ...mockPrediction, trend: 'critical' });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🚨');
      expect(result.message).toContain('Критический');
    });
  });

  // ==========================================================================
  // RISK COLOR CODING
  // ==========================================================================
  describe('Risk Color Coding', () => {
    it('should show green for low risk', async () => {
      mockPredict.mockResolvedValue({ ...mockPrediction, deteriorationRisk: 0.2 });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟢');
    });

    it('should show yellow for moderate risk', async () => {
      mockPredict.mockResolvedValue({ ...mockPrediction, deteriorationRisk: 0.4 });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟡');
    });

    it('should show orange for high risk', async () => {
      mockPredict.mockResolvedValue({ ...mockPrediction, deteriorationRisk: 0.6 });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟠');
    });

    it('should show red for critical risk', async () => {
      mockPredict.mockResolvedValue({ ...mockPrediction, deteriorationRisk: 0.8 });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🔴');
    });
  });

  // ==========================================================================
  // HORIZON SELECTION CALLBACKS
  // ==========================================================================
  describe('Horizon Selection', () => {
    it('should show short-term prediction (1 day)', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:short',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Прогноз на 1 день');
    });

    it('should show medium-term prediction (3 days)', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:medium',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Прогноз на 3 дня');
    });

    it('should show long-term prediction (7 days)', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:long',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Прогноз на 7 дней');
    });

    it('should show detailed metrics', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:short',
        {}
      );

      expect(result.message).toContain('Эффективность сна');
      expect(result.message).toContain('Время засыпания');
      expect(result.message).toContain('Пробуждения');
      expect(result.message).toContain('Общее время сна');
      expect(result.message).toContain('Качество');
    });

    it('should show confidence interval', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:medium',
        {}
      );

      expect(result.message).toContain('95% интервал');
    });
  });

  // ==========================================================================
  // EARLY WARNINGS
  // ==========================================================================
  describe('Early Warnings', () => {
    it('should show no warnings message', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:warnings',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Тревожных сигналов не обнаружено');
    });

    it('should show positive message when no warnings', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:warnings',
        {}
      );

      expect(result.message).toContain('стабилен');
      expect(result.message).toContain('Хорошие новости');
    });

    it('should display warnings when present', async () => {
      mockPredict.mockResolvedValue({
        ...mockPrediction,
        earlyWarnings: [
          {
            severity: 'high',
            messageRu: 'Увеличение времени засыпания',
            strength: 0.8,
            confidence: 0.9,
            estimatedDaysToCritical: 5,
            recommendation: 'Проверьте вечернюю рутину',
          },
          {
            severity: 'moderate',
            messageRu: 'Снижение качества сна',
            strength: 0.5,
            confidence: 0.7,
            estimatedDaysToCritical: null,
            recommendation: 'Уменьшите стресс',
          },
        ],
      });

      const result = await command.handleCallback(
        mockContext,
        'predict:warnings',
        {}
      );

      expect(result.message).toContain('Ранние предупреждения');
      expect(result.message).toContain('2'); // 2 warnings
      expect(result.message).toContain('Увеличение времени засыпания');
      expect(result.message).toContain('Снижение качества сна');
    });

    it('should show severity colors', async () => {
      mockPredict.mockResolvedValue({
        ...mockPrediction,
        earlyWarnings: [
          { severity: 'critical', messageRu: 'Критическое', strength: 0.9, confidence: 0.95, estimatedDaysToCritical: 2, recommendation: 'Срочно' },
          { severity: 'high', messageRu: 'Высокое', strength: 0.7, confidence: 0.8, estimatedDaysToCritical: 5, recommendation: 'Важно' },
          { severity: 'moderate', messageRu: 'Среднее', strength: 0.5, confidence: 0.7, estimatedDaysToCritical: null, recommendation: 'Внимание' },
          { severity: 'low', messageRu: 'Низкое', strength: 0.3, confidence: 0.6, estimatedDaysToCritical: null, recommendation: 'Следите' },
        ],
      });

      const result = await command.handleCallback(
        mockContext,
        'predict:warnings',
        {}
      );

      expect(result.message).toContain('🔴'); // critical
      expect(result.message).toContain('🟠'); // high
      expect(result.message).toContain('🟡'); // moderate
      expect(result.message).toContain('🟢'); // low
    });

    it('should show days to critical when available', async () => {
      mockPredict.mockResolvedValue({
        ...mockPrediction,
        earlyWarnings: [
          { severity: 'high', messageRu: 'Тест', strength: 0.8, confidence: 0.9, estimatedDaysToCritical: 3, recommendation: 'Рекомендация' },
        ],
      });

      const result = await command.handleCallback(
        mockContext,
        'predict:warnings',
        {}
      );

      expect(result.message).toContain('До критического');
      expect(result.message).toContain('3 дней');
    });

    it('should have recommendations button', async () => {
      mockPredict.mockResolvedValue({
        ...mockPrediction,
        earlyWarnings: [
          { severity: 'moderate', messageRu: 'Тест', strength: 0.5, confidence: 0.7, estimatedDaysToCritical: null, recommendation: 'Рекомендация' },
        ],
      });

      const result = await command.handleCallback(
        mockContext,
        'predict:warnings',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'predict:recommendations')).toBeDefined();
    });
  });

  // ==========================================================================
  // TRAJECTORY CHART
  // ==========================================================================
  describe('Trajectory Chart', () => {
    it('should show trajectory chart', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:trajectory',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Траектория эффективности');
    });

    it('should show legend', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:trajectory',
        {}
      );

      expect(result.message).toContain('Легенда');
      expect(result.message).toContain('прогнозируемое');
      expect(result.message).toContain('доверительный интервал');
      expect(result.message).toContain('целевой');
    });

    it('should show horizon info', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:trajectory',
        {}
      );

      expect(result.message).toContain('7 дней');
      expect(result.message).toContain('1 день'); // step
    });

    it('should have whatif button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:trajectory',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'whatif:menu')).toBeDefined();
    });
  });

  // ==========================================================================
  // RECOMMENDATIONS
  // ==========================================================================
  describe('Recommendations', () => {
    it('should show recommendations', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:recommendations',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Рекомендации');
    });

    it('should list personalized recommendations', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:recommendations',
        {}
      );

      expect(result.message).toContain('Соблюдайте режим сна');
      expect(result.message).toContain('Ограничьте кофеин');
    });

    it('should show analysis summary', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:recommendations',
        {}
      );

      expect(result.message).toContain('На основе анализа');
      expect(result.message).toContain('Тренд');
      expect(result.message).toContain('Риск');
      expect(result.message).toContain('Предупреждений');
    });

    it('should show urgency emoji based on risk', async () => {
      mockPredict.mockResolvedValue({
        ...mockPrediction,
        deteriorationRisk: 0.7, // High risk
      });

      const result = await command.handleCallback(
        mockContext,
        'predict:recommendations',
        {}
      );

      expect(result.message).toContain('🚨'); // High urgency
    });

    it('should have whatif button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:recommendations',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'whatif:menu')).toBeDefined();
    });
  });

  // ==========================================================================
  // TIPPING POINTS
  // ==========================================================================
  describe('Tipping Points', () => {
    it('should show no tipping points message', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:tipping',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Критических точек не обнаружено');
    });

    it('should explain tipping points concept', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:tipping',
        {}
      );

      expect(result.message).toContain('Точки перелома');
      expect(result.message).toContain('Бифуркационный');
    });

    it('should show tipping points when detected', async () => {
      mockDetectTippingPoints.mockResolvedValue([
        { type: 'improvement', probability: 0.8, estimatedDays: 3, recommendationRu: 'Продолжайте практику' },
        { type: 'deterioration', probability: 0.6, estimatedDays: 5, recommendationRu: 'Избегайте стресса' },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'predict:tipping',
        {}
      );

      expect(result.message).toContain('Продолжайте практику');
      expect(result.message).toContain('Избегайте стресса');
    });

    it('should show color-coded types', async () => {
      mockDetectTippingPoints.mockResolvedValue([
        { type: 'improvement', probability: 0.8, estimatedDays: 3, recommendationRu: 'Позитивное' },
        { type: 'deterioration', probability: 0.6, estimatedDays: 5, recommendationRu: 'Негативное' },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'predict:tipping',
        {}
      );

      expect(result.message).toContain('🟢'); // positive/improvement
      expect(result.message).toContain('🔴'); // negative/deterioration
    });

    it('should show usage instructions', async () => {
      mockDetectTippingPoints.mockResolvedValue([
        { type: 'improvement', probability: 0.8, estimatedDays: 3, recommendationRu: 'Тест' },
      ]);

      const result = await command.handleCallback(
        mockContext,
        'predict:tipping',
        {}
      );

      expect(result.message).toContain('Как использовать');
      expect(result.message).toContain('Позитивные');
      expect(result.message).toContain('Негативные');
    });
  });

  // ==========================================================================
  // ABOUT PREDICTION
  // ==========================================================================
  describe('About Prediction', () => {
    it('should show about info', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:about',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('О прогнозировании');
    });

    it('should explain cold-start model', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:about',
        {}
      );

      expect(result.message).toContain('3-6 дней');
      expect(result.message).toContain('Echo State Network');
    });

    it('should explain full PLRNN model', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:about',
        {}
      );

      expect(result.message).toContain('7+ дней');
      expect(result.message).toContain('PLRNN');
    });

    it('should explain accuracy growth', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:about',
        {}
      );

      expect(result.message).toContain('точность растёт');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should show error when prediction fails', async () => {
      mockPredict.mockResolvedValue(null);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Ошибка прогнозирования');
    });

    it('should suggest possible causes', async () => {
      mockPredict.mockResolvedValue(null);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Недостаточно данных');
      expect(result.message).toContain('техническая проблема');
    });

    it('should have diary button on error', async () => {
      mockPredict.mockResolvedValue(null);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      expect(buttons.find(b => b.callbackData === 'diary:start')).toBeDefined();
    });

    it('should handle callback error', async () => {
      mockPredict.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'predict:short',
        {}
      );

      expect(result.message).toContain('Ошибка');
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    it('should route to dashboard for unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:unknown',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Прогноз сна');
    });

    it('should handle dashboard callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'predict:dashboard',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Прогноз сна');
    });
  });

  // ==========================================================================
  // PLURALIZATION
  // ==========================================================================
  describe('Pluralization', () => {
    it('should pluralize days correctly', async () => {
      mockGetHistory.mockReturnValue([{}]); // 1 day

      const result = await command.execute(mockContext);

      expect(result.message).toContain('1/7'); // Should say "день" not "дней"
    });

    it('should pluralize warnings correctly', async () => {
      mockPredict.mockResolvedValue({
        ...mockPrediction,
        earlyWarnings: [
          { severity: 'moderate', messageRu: 'Тест', strength: 0.5, confidence: 0.7, estimatedDaysToCritical: null, recommendation: 'Рек' },
        ],
      });

      const result = await command.handleCallback(
        mockContext,
        'predict:warnings',
        {}
      );

      expect(result.message).toContain('1 предупреждение');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(predictCommand).toBeInstanceOf(PredictCommand);
    });

    it('should have correct name', () => {
      expect(predictCommand.name).toBe('predict');
    });
  });
});
