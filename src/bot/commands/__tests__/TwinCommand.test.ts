/**
 * TwinCommand Tests
 * =================
 *
 * IEC 62304 compliance tests for Digital Twin management.
 * Research: Harvard COMPASS, JITAI-Twins Framework
 *
 * Tests verify:
 * - Session requirement enforcement
 * - Twin creation flow (insufficient data, ready, error)
 * - Dashboard display with model metrics
 * - Trajectory prediction visualization
 * - Simulation menu
 * - Calibration display
 * - Tipping points and insights
 * - Health metrics calculation
 * - Helper methods (formatTimeAgo, buildUncertaintyViz, etc.)
 *
 * @packageDocumentation
 */

import { TwinCommand, twinCommand } from '../TwinCommand';
import type { ISleepCoreContext, ICommandResult } from '../interfaces/ICommand';

// Mock dependencies
jest.mock('../../persona', () => ({
  sonya: {
    name: 'Соня',
    emoji: '🦉',
    tip: (text: string) => `💡 ${text}`,
    say: (text: string) => `_${text}_`,
  },
}));

jest.mock('../utils/MessageFormatter', () => ({
  formatter: {
    header: (text: string) => `**${text}**`,
    divider: () => '---',
    tip: (text: string) => `💡 ${text}`,
    info: (text: string) => `ℹ️ ${text}`,
    success: (text: string) => `✅ ${text}`,
    warning: (text: string) => `⚠️ ${text}`,
    progressBar: (percent: number, width: number) => {
      const filled = Math.round((percent / 100) * width);
      return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, width - filled));
    },
  },
}));

describe('TwinCommand', () => {
  let command: TwinCommand;
  let mockContext: ISleepCoreContext;
  let mockGetSession: jest.Mock;
  let mockDigitalTwinService: {
    createTwin: jest.Mock;
    predictTrajectory: jest.Mock;
    detectTippingPoints: jest.Mock;
  };
  let mockSleepPrediction: {
    getHistory: jest.Mock;
  };

  const mockTwin = {
    userId: '12345',
    stateQuality: 0.85,
    observationCount: 15,
    lastUpdatedAt: new Date('2026-02-05T10:00:00'),
    trend: 'improving' as const,
    isReady: true,
    riskLevel: 'low',
    currentMetrics: {
      sleepEfficiency: 82,
      sleepOnsetLatency: 22,
      wakeAfterSleepOnset: 45,
      totalSleepTime: 420,
    },
  };

  const mockTrajectory = {
    dailyPredictions: [
      { date: new Date('2026-02-06'), sleepEfficiency: 83, confidence: 0.8, trend: 'up' as const },
      { date: new Date('2026-02-07'), sleepEfficiency: 84, confidence: 0.75, trend: 'up' as const },
      { date: new Date('2026-02-08'), sleepEfficiency: 85, confidence: 0.7, trend: 'stable' as const },
      { date: new Date('2026-02-09'), sleepEfficiency: 85, confidence: 0.65, trend: 'stable' as const },
      { date: new Date('2026-02-10'), sleepEfficiency: 86, confidence: 0.6, trend: 'up' as const },
      { date: new Date('2026-02-11'), sleepEfficiency: 86, confidence: 0.55, trend: 'stable' as const },
      { date: new Date('2026-02-12'), sleepEfficiency: 87, confidence: 0.5, trend: 'up' as const },
    ],
    overallTrend: 'improving' as const,
    confidence: 0.72,
  };

  beforeEach(() => {
    command = new TwinCommand();

    // Create mocks
    mockGetSession = jest.fn();
    mockDigitalTwinService = {
      createTwin: jest.fn(),
      predictTrajectory: jest.fn(),
      detectTippingPoints: jest.fn(),
    };
    mockSleepPrediction = {
      getHistory: jest.fn(),
    };

    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getSession: mockGetSession,
        getDigitalTwin: jest.fn(() => mockDigitalTwinService),
        getSleepPrediction: jest.fn(() => mockSleepPrediction),
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('twin');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('двойник');
    });

    it('should have relevant aliases', () => {
      expect(command.aliases).toContain('двойник');
      expect(command.aliases).toContain('digital_twin');
      expect(command.aliases).toContain('avatar');
    });

    it('should require session', () => {
      expect(command.requiresSession).toBe(true);
    });
  });

  // ==========================================================================
  // NO SESSION HANDLING
  // ==========================================================================
  describe('No Session Handling', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue(null);
    });

    it('should show no session message when session missing', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Сессия не найдена');
    });

    it('should suggest /start command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/start');
    });

    it('should have start program button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const startButton = buttons.find(b => b.callbackData === 'start:begin');

      expect(startButton).toBeDefined();
      expect(startButton?.text).toContain('Начать');
    });
  });

  // ==========================================================================
  // TWIN CREATION FLOW
  // ==========================================================================
  describe('Twin Creation Flow', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue({ userId: '12345' });
    });

    describe('Insufficient Data', () => {
      beforeEach(() => {
        mockDigitalTwinService.createTwin.mockRejectedValue(new Error('Not enough data'));
        mockSleepPrediction.getHistory.mockReturnValue([1, 2, 3]); // Only 3 days
      });

      it('should show insufficient data message', async () => {
        const result = await command.execute(mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Недостаточно данных');
      });

      it('should show progress bar', async () => {
        const result = await command.execute(mockContext);

        expect(result.message).toContain('3/7 дней');
      });

      it('should explain what digital twin is', async () => {
        const result = await command.execute(mockContext);

        expect(result.message).toContain('Что такое цифровой двойник');
        expect(result.message).toContain('Симулирует');
        expect(result.message).toContain('Предсказывает');
      });

      it('should have diary button', async () => {
        const result = await command.execute(mockContext);

        const buttons = result.keyboard?.flat() ?? [];
        const diaryButton = buttons.find(b => b.callbackData === 'diary:start');

        expect(diaryButton).toBeDefined();
        expect(diaryButton?.text).toContain('Записать сон');
      });
    });

    describe('Ready to Create', () => {
      beforeEach(() => {
        mockDigitalTwinService.createTwin.mockRejectedValue(new Error('Twin not created yet'));
        mockSleepPrediction.getHistory.mockReturnValue([1, 2, 3, 4, 5, 6, 7, 8]); // 8 days
      });

      it('should show ready message', async () => {
        const result = await command.execute(mockContext);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Достаточно данных');
      });

      it('should list what will be created', async () => {
        const result = await command.execute(mockContext);

        expect(result.message).toContain('Что будет создано');
        expect(result.message).toContain('Профиль сна');
        expect(result.message).toContain('Модель для прогнозирования');
      });

      it('should have create twin button', async () => {
        const result = await command.execute(mockContext);

        const buttons = result.keyboard?.flat() ?? [];
        const createButton = buttons.find(b => b.callbackData === 'twin:create');

        expect(createButton).toBeDefined();
        expect(createButton?.text).toContain('Создать');
      });

      it('should have view data option', async () => {
        const result = await command.execute(mockContext);

        const buttons = result.keyboard?.flat() ?? [];
        const dataButton = buttons.find(b => b.callbackData === 'progress:dashboard');

        expect(dataButton).toBeDefined();
      });
    });

    describe('Create Twin Action', () => {
      it('should create twin successfully', async () => {
        mockGetSession.mockReturnValue({ userId: '12345' });
        mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);

        const result = await command.handleCallback(mockContext, 'twin:create', {});

        expect(result.success).toBe(true);
        // Should show dashboard after creation
        expect(result.message).toContain('Твой цифровой двойник');
      });

      it('should handle creation error', async () => {
        mockGetSession.mockReturnValue({ userId: '12345' });
        mockDigitalTwinService.createTwin.mockRejectedValue(new Error('Creation failed'));
        mockSleepPrediction.getHistory.mockReturnValue([1, 2, 3, 4, 5, 6, 7]); // Enough data

        const result = await command.handleCallback(mockContext, 'twin:create', {});

        expect(result.success).toBe(true);
        expect(result.message).toContain('Ошибка создания');
      });
    });
  });

  // ==========================================================================
  // TWIN DASHBOARD
  // ==========================================================================
  describe('Twin Dashboard', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue({ userId: '12345' });
      mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);
    });

    it('should show dashboard when twin exists', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Твой цифровой двойник');
    });

    it('should show active status', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Статус');
      expect(result.message).toContain('Активен');
    });

    it('should display model accuracy', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Точность');
      expect(result.message).toContain('85%');
    });

    it('should display data points', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('15 наблюдений');
    });

    it('should show capabilities', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Прогнозирование');
      expect(result.message).toContain('Симуляция');
      expect(result.message).toContain('Детекция');
      expect(result.message).toContain('Инсайты');
    });

    it('should have action buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const buttonCallbacks = buttons.map(b => b.callbackData);

      expect(buttonCallbacks).toContain('twin:trajectory');
      expect(buttonCallbacks).toContain('twin:simulate');
      expect(buttonCallbacks).toContain('twin:insights');
      expect(buttonCallbacks).toContain('twin:calibrate');
      expect(buttonCallbacks).toContain('twin:health');
    });

    it('should show green health emoji for high accuracy', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟢');
    });

    it('should show yellow emoji for medium accuracy', async () => {
      mockDigitalTwinService.createTwin.mockResolvedValue({
        ...mockTwin,
        stateQuality: 0.7,
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟡');
    });

    it('should show orange emoji for low accuracy', async () => {
      mockDigitalTwinService.createTwin.mockResolvedValue({
        ...mockTwin,
        stateQuality: 0.5,
      });

      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟠');
    });
  });

  // ==========================================================================
  // CALLBACK HANDLERS
  // ==========================================================================
  describe('Callback Handlers', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue({ userId: '12345' });
      mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);
    });

    describe('Status Action', () => {
      it('should show twin status', async () => {
        const result = await command.handleCallback(mockContext, 'twin:status', {});

        expect(result.success).toBe(true);
        expect(result.message).toContain('Статус цифрового двойника');
      });

      it('should show current state metrics', async () => {
        const result = await command.handleCallback(mockContext, 'twin:status', {});

        expect(result.message).toContain('Эффективность сна');
        expect(result.message).toContain('82%');
        expect(result.message).toContain('Время засыпания');
        expect(result.message).toContain('22 мин');
      });

      it('should show WASO', async () => {
        const result = await command.handleCallback(mockContext, 'twin:status', {});

        expect(result.message).toContain('WASO');
        expect(result.message).toContain('45 мин');
      });

      it('should show trend', async () => {
        const result = await command.handleCallback(mockContext, 'twin:status', {});

        expect(result.message).toContain('Тренд');
        expect(result.message).toContain('improving');
      });

      it('should show uncertainty visualization', async () => {
        const result = await command.handleCallback(mockContext, 'twin:status', {});

        expect(result.message).toContain('Неопределённость');
      });

      it('should have back button', async () => {
        const result = await command.handleCallback(mockContext, 'twin:status', {});

        const buttons = result.keyboard?.flat() ?? [];
        const backButton = buttons.find(b => b.callbackData === 'twin:dashboard');

        expect(backButton).toBeDefined();
        expect(backButton?.text).toContain('Назад');
      });

      it('should handle missing twin', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue(null);
        mockSleepPrediction.getHistory.mockReturnValue([]);

        const result = await command.handleCallback(mockContext, 'twin:status', {});

        expect(result.success).toBe(true);
        // Should redirect to creation
        expect(result.message).toContain('Недостаточно данных');
      });
    });

    describe('Trajectory Action', () => {
      beforeEach(() => {
        mockDigitalTwinService.predictTrajectory.mockResolvedValue(mockTrajectory);
      });

      it('should show trajectory', async () => {
        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.success).toBe(true);
        expect(result.message).toContain('Прогнозируемая траектория');
      });

      it('should show 7-day predictions', async () => {
        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.message).toContain('7 дней');
      });

      it('should display legend', async () => {
        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.message).toContain('Легенда');
        expect(result.message).toContain('прогноз');
        expect(result.message).toContain('доверительный интервал');
      });

      it('should show trend and confidence', async () => {
        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.message).toContain('Тренд');
        expect(result.message).toContain('Уверенность');
        expect(result.message).toContain('72%');
      });

      it('should have what-if button', async () => {
        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        const buttons = result.keyboard?.flat() ?? [];
        const whatifButton = buttons.find(b => b.callbackData === 'whatif:menu');

        expect(whatifButton).toBeDefined();
      });

      it('should handle empty predictions', async () => {
        mockDigitalTwinService.predictTrajectory.mockResolvedValue({
          dailyPredictions: [],
          overallTrend: 'stable',
          confidence: 0,
        });

        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.success).toBe(true);
        expect(result.message).toContain('Траектория недоступна');
      });

      it('should handle trajectory error', async () => {
        mockDigitalTwinService.predictTrajectory.mockRejectedValue(new Error('Prediction failed'));

        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.success).toBe(false);
        expect(result.message).toContain('Ошибка');
      });

      it('should show encouraging message for improving trend', async () => {
        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.message).toContain('Отличный прогноз');
      });

      it('should show neutral message for stable trend', async () => {
        mockDigitalTwinService.predictTrajectory.mockResolvedValue({
          ...mockTrajectory,
          overallTrend: 'stable',
        });

        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.message).toContain('Стабильность');
      });

      it('should show concerned message for declining trend', async () => {
        mockDigitalTwinService.predictTrajectory.mockResolvedValue({
          ...mockTrajectory,
          overallTrend: 'declining',
        });

        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.message).toContain('снижение');
      });
    });

    describe('Simulate Action', () => {
      it('should show simulation menu', async () => {
        const result = await command.handleCallback(mockContext, 'twin:simulate', {});

        expect(result.success).toBe(true);
        expect(result.message).toContain('Симуляция сценариев');
      });

      it('should list scenario categories', async () => {
        const result = await command.handleCallback(mockContext, 'twin:simulate', {});

        expect(result.message).toContain('Время');
        expect(result.message).toContain('Поведение');
        expect(result.message).toContain('Практики');
        expect(result.message).toContain('Когнитивные');
      });

      it('should have scenario buttons', async () => {
        const result = await command.handleCallback(mockContext, 'twin:simulate', {});

        const buttons = result.keyboard?.flat() ?? [];
        const buttonCallbacks = buttons.map(b => b.callbackData);

        expect(buttonCallbacks).toContain('whatif:scenario:earlier_bedtime');
        expect(buttonCallbacks).toContain('whatif:scenario:later_bedtime');
        expect(buttonCallbacks).toContain('whatif:scenario:leave_bed_rule');
        expect(buttonCallbacks).toContain('whatif:scenario:consistent_wake');
        expect(buttonCallbacks).toContain('whatif:scenario:pmr_practice');
        expect(buttonCallbacks).toContain('whatif:scenario:no_caffeine');
      });
    });

    describe('Calibrate Action', () => {
      it('should show calibration info', async () => {
        const result = await command.handleCallback(mockContext, 'twin:calibrate', {});

        expect(result.success).toBe(true);
        expect(result.message).toContain('Калибровка модели');
      });

      it('should show current quality', async () => {
        const result = await command.handleCallback(mockContext, 'twin:calibrate', {});

        expect(result.message).toContain('Текущее качество');
        expect(result.message).toContain('85%');
      });

      it('should show RMSE metric', async () => {
        const result = await command.handleCallback(mockContext, 'twin:calibrate', {});

        expect(result.message).toContain('RMSE');
      });

      it('should show data points count', async () => {
        const result = await command.handleCallback(mockContext, 'twin:calibrate', {});

        expect(result.message).toContain('Точек данных');
        expect(result.message).toContain('15');
      });

      it('should explain how to improve accuracy', async () => {
        const result = await command.handleCallback(mockContext, 'twin:calibrate', {});

        expect(result.message).toContain('Как улучшить точность');
        expect(result.message).toContain('дневник');
      });

      it('should mention auto-calibration', async () => {
        const result = await command.handleCallback(mockContext, 'twin:calibrate', {});

        expect(result.message).toContain('Автокалибровка');
        expect(result.message).toContain('Kalman Filter');
      });

      it('should have add data button', async () => {
        const result = await command.handleCallback(mockContext, 'twin:calibrate', {});

        const buttons = result.keyboard?.flat() ?? [];
        const addDataButton = buttons.find(b => b.callbackData === 'diary:start');

        expect(addDataButton).toBeDefined();
        expect(addDataButton?.text).toContain('Добавить данные');
      });
    });

    describe('Insights Action', () => {
      beforeEach(() => {
        mockDigitalTwinService.detectTippingPoints.mockResolvedValue([
          {
            type: 'improvement',
            recommendationRu: 'Стабильный подъём улучшит консолидацию сна',
            probability: 0.75,
          },
          {
            type: 'deterioration',
            recommendationRu: 'Нерегулярный режим может ухудшить сон',
            probability: 0.65,
          },
        ]);
      });

      it('should show insights', async () => {
        const result = await command.handleCallback(mockContext, 'twin:insights', {});

        expect(result.success).toBe(true);
        expect(result.message).toContain('Инсайты цифрового двойника');
      });

      it('should show tipping points', async () => {
        const result = await command.handleCallback(mockContext, 'twin:insights', {});

        expect(result.message).toContain('Точки перелома');
        expect(result.message).toContain('Tipping Points');
      });

      it('should display tipping point recommendations', async () => {
        const result = await command.handleCallback(mockContext, 'twin:insights', {});

        expect(result.message).toContain('Стабильный подъём');
        expect(result.message).toContain('75%');
      });

      it('should show improvement emoji for positive tipping points', async () => {
        const result = await command.handleCallback(mockContext, 'twin:insights', {});

        expect(result.message).toContain('🟢');
      });

      it('should show deterioration emoji for negative tipping points', async () => {
        const result = await command.handleCallback(mockContext, 'twin:insights', {});

        expect(result.message).toContain('🔴');
      });

      it('should show current state', async () => {
        const result = await command.handleCallback(mockContext, 'twin:insights', {});

        expect(result.message).toContain('Текущее состояние');
        expect(result.message).toContain('Тренд');
        expect(result.message).toContain('Улучшение');
      });

      it('should show risk level', async () => {
        const result = await command.handleCallback(mockContext, 'twin:insights', {});

        expect(result.message).toContain('Уровень риска');
        expect(result.message).toContain('low');
      });

      it('should handle no tipping points', async () => {
        mockDigitalTwinService.detectTippingPoints.mockResolvedValue([]);

        const result = await command.handleCallback(mockContext, 'twin:insights', {});

        expect(result.message).toContain('Критических точек перелома не обнаружено');
      });

      it('should have detailed analysis button', async () => {
        const result = await command.handleCallback(mockContext, 'twin:insights', {});

        const buttons = result.keyboard?.flat() ?? [];
        const analysisButton = buttons.find(b => b.callbackData === 'insights:dashboard');

        expect(analysisButton).toBeDefined();
      });
    });

    describe('Health Action', () => {
      it('should show health metrics', async () => {
        const result = await command.handleCallback(mockContext, 'twin:health', {});

        expect(result.success).toBe(true);
        expect(result.message).toContain('Здоровье цифрового двойника');
      });

      it('should show overall health percentage', async () => {
        const result = await command.handleCallback(mockContext, 'twin:health', {});

        expect(result.message).toContain('Общее здоровье');
      });

      it('should show model accuracy component', async () => {
        const result = await command.handleCallback(mockContext, 'twin:health', {});

        expect(result.message).toContain('Точность модели');
        expect(result.message).toContain('85%');
      });

      it('should show data freshness component', async () => {
        const result = await command.handleCallback(mockContext, 'twin:health', {});

        expect(result.message).toContain('Свежесть данных');
      });

      it('should show data completeness component', async () => {
        const result = await command.handleCallback(mockContext, 'twin:health', {});

        expect(result.message).toContain('Полнота данных');
      });

      it('should show health emoji based on overall health', async () => {
        const result = await command.handleCallback(mockContext, 'twin:health', {});

        // With high stateQuality (0.85), should show green heart
        expect(result.message).toMatch(/💚|💛|🧡/);
      });

      it('should show recommendations for low health', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          stateQuality: 0.4,
          isReady: false,
          observationCount: 3,
          lastUpdatedAt: new Date('2026-01-01'), // Old data
        });

        const result = await command.handleCallback(mockContext, 'twin:health', {});

        expect(result.message).toContain('Ведите дневник ежедневно');
      });

      it('should have update data button', async () => {
        const result = await command.handleCallback(mockContext, 'twin:health', {});

        const buttons = result.keyboard?.flat() ?? [];
        const updateButton = buttons.find(b => b.callbackData === 'diary:start');

        expect(updateButton).toBeDefined();
        expect(updateButton?.text).toContain('Обновить данные');
      });
    });

    describe('Default Action', () => {
      it('should return to dashboard on unknown action', async () => {
        const result = await command.handleCallback(mockContext, 'twin:unknown', {});

        expect(result.success).toBe(true);
        expect(result.message).toContain('Твой цифровой двойник');
      });

      it('should handle callback without prefix', async () => {
        const result = await command.handleCallback(mockContext, 'status', {});

        expect(result.success).toBe(true);
        // 'status' action is recognized
        expect(result.message).toContain('Статус');
      });
    });
  });

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  describe('Helper Methods', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue({ userId: '12345' });
      mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);
    });

    describe('formatTimeAgo', () => {
      it('should format just now', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          lastUpdatedAt: new Date(),
        });

        const result = await command.execute(mockContext);

        expect(result.message).toContain('только что');
      });

      it('should format minutes ago', async () => {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          lastUpdatedAt: tenMinutesAgo,
        });

        const result = await command.execute(mockContext);

        expect(result.message).toMatch(/\d+ мин назад/);
      });

      it('should format hours ago', async () => {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          lastUpdatedAt: threeHoursAgo,
        });

        const result = await command.execute(mockContext);

        expect(result.message).toMatch(/\d+ ч назад/);
      });

      it('should format days ago', async () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          lastUpdatedAt: twoDaysAgo,
        });

        const result = await command.execute(mockContext);

        expect(result.message).toMatch(/\d+ дн назад/);
      });

      it('should format date for old entries', async () => {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          lastUpdatedAt: twoWeeksAgo,
        });

        const result = await command.execute(mockContext);

        // Should show formatted date
        expect(result.message).toMatch(/\d{2}\.\d{2}\.\d{4}/);
      });
    });

    describe('buildUncertaintyViz', () => {
      it('should show low uncertainty visualization', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          stateQuality: 0.9, // Low uncertainty (high quality)
        });

        const result = await command.handleCallback(mockContext, 'twin:status', {});

        expect(result.message).toContain('Низкая');
      });

      it('should show medium uncertainty visualization', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          stateQuality: 0.65, // Medium uncertainty
        });

        const result = await command.handleCallback(mockContext, 'twin:status', {});

        expect(result.message).toContain('Средняя');
      });

      it('should show high uncertainty visualization', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          stateQuality: 0.4, // High uncertainty
        });

        const result = await command.handleCallback(mockContext, 'twin:status', {});

        expect(result.message).toContain('Высокая');
      });
    });

    describe('getTrendText', () => {
      it('should translate improving trend', async () => {
        mockDigitalTwinService.predictTrajectory.mockResolvedValue(mockTrajectory);

        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.message).toContain('📈 Улучшение');
      });

      it('should translate stable trend', async () => {
        mockDigitalTwinService.predictTrajectory.mockResolvedValue({
          ...mockTrajectory,
          overallTrend: 'stable',
        });

        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.message).toContain('➡️ Стабильно');
      });

      it('should translate declining trend', async () => {
        mockDigitalTwinService.predictTrajectory.mockResolvedValue({
          ...mockTrajectory,
          overallTrend: 'declining',
        });

        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.message).toContain('📉 Снижение');
      });

      it('should translate critical trend', async () => {
        mockDigitalTwinService.predictTrajectory.mockResolvedValue({
          ...mockTrajectory,
          overallTrend: 'critical',
        });

        const result = await command.handleCallback(mockContext, 'twin:trajectory', {});

        expect(result.message).toContain('🚨 Критический');
      });
    });

    describe('calculateDataFreshness', () => {
      it('should return 1.0 for recent data (< 24h)', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          lastUpdatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        });

        const result = await command.handleCallback(mockContext, 'twin:health', {});

        expect(result.message).toContain('Свежесть данных');
        expect(result.message).toContain('100%');
      });

      it('should return 0.8 for data 24-48h old', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          lastUpdatedAt: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36 hours ago
        });

        const result = await command.handleCallback(mockContext, 'twin:health', {});

        expect(result.message).toContain('Свежесть данных');
        expect(result.message).toContain('80%');
      });

      it('should return 0.2 for very old data (> 1 week)', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          lastUpdatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        });

        const result = await command.handleCallback(mockContext, 'twin:health', {});

        expect(result.message).toContain('Свежесть данных');
        expect(result.message).toContain('20%');
      });
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetSession.mockReturnValue({ userId: '12345' });
    });

    it('should handle null twin gracefully', async () => {
      mockDigitalTwinService.createTwin.mockResolvedValue(null);
      mockSleepPrediction.getHistory.mockReturnValue([]);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Недостаточно данных');
    });

    it('should handle service errors gracefully', async () => {
      mockDigitalTwinService.createTwin.mockRejectedValue(new Error('Service unavailable'));
      mockSleepPrediction.getHistory.mockReturnValue([1, 2, 3, 4, 5]);

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      // Should show creation screen with progress
      expect(result.message).toBeDefined();
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(twinCommand).toBeInstanceOf(TwinCommand);
    });

    it('should have correct name', () => {
      expect(twinCommand.name).toBe('twin');
    });
  });
});
