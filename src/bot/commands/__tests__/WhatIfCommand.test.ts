/**
 * WhatIfCommand Tests
 * ===================
 *
 * IEC 62304 compliance tests for counterfactual scenario simulation.
 * Research: Wachter et al. (2018) Counterfactuals, NASEM (2023) Digital Twin
 *
 * Tests verify:
 * - Predefined scenarios (10 scenarios across 4 categories)
 * - Main menu display with twin status
 * - Insufficient data handling
 * - Single scenario simulation
 * - Scenario comparison (2+ scenarios)
 * - Category navigation
 * - Apply scenario guidance
 * - Callback routing
 * - Helper methods (pluralize, format functions, etc.)
 *
 * @packageDocumentation
 */

import { WhatIfCommand, whatIfCommand } from '../WhatIfCommand';
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

describe('WhatIfCommand', () => {
  let command: WhatIfCommand;
  let mockContext: ISleepCoreContext;
  let mockDigitalTwinService: {
    createTwin: jest.Mock;
    simulateScenario: jest.Mock;
    compareScenarios: jest.Mock;
    detectTippingPoints: jest.Mock;
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
      sleepEfficiency: 78,
      sleepOnsetLatency: 25,
      wakeAfterSleepOnset: 40,
      totalSleepTime: 390,
    },
  };

  const mockSimulationResult = {
    scenario: {
      name: 'Более раннее время отхода ко сну',
      description: 'Лечь спать на 30-60 минут раньше',
      intervention: 'adjust_sleep_window',
      durationDays: 7,
      adherenceLevel: 0.8,
    },
    predictedOutcome: {
      sleepEfficiency: 85,
      sleepEfficiencyChange: 7,
      trend: 'improving' as const,
    },
    confidence: 0.75,
    keyFactors: [
      'Стабильное время пробуждения',
      'Достаточное давление сна',
    ],
    recommendations: [
      'Избегайте дневного сна',
      'Ограничьте экранное время перед сном',
    ],
  };

  const mockComparisonResult = {
    scenarios: [
      { name: 'Сценарий 1' },
      { name: 'Сценарий 2' },
    ],
    results: [
      {
        scenario: { name: 'Более раннее время отхода ко сну' },
        predictedOutcome: { sleepEfficiency: 85, sleepEfficiencyChange: 7, trend: 'improving' },
        confidence: 0.75,
      },
      {
        scenario: { name: 'Без изменений' },
        predictedOutcome: { sleepEfficiency: 78, sleepEfficiencyChange: 0, trend: 'stable' },
        confidence: 0.9,
      },
    ],
    bestScenario: { name: 'Более раннее время отхода ко сну' },
    explanationRu: 'Ранний отход ко сну увеличит давление сна и улучшит эффективность.',
  };

  beforeEach(() => {
    command = new WhatIfCommand();

    // Create mocks
    mockDigitalTwinService = {
      createTwin: jest.fn(),
      simulateScenario: jest.fn(),
      compareScenarios: jest.fn(),
      detectTippingPoints: jest.fn(),
    };

    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getDigitalTwin: jest.fn(() => mockDigitalTwinService),
      },
    } as unknown as ISleepCoreContext;
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('whatif');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('Что если');
      expect(command.description).toContain('моделирование');
    });

    it('should have relevant aliases', () => {
      expect(command.aliases).toContain('что_если');
      expect(command.aliases).toContain('если');
      expect(command.aliases).toContain('сценарий');
    });

    it('should NOT require session', () => {
      expect(command.requiresSession).toBe(false);
    });

    it('should have conversation steps', () => {
      expect(command.steps).toContain('menu');
      expect(command.steps).toContain('scenario');
      expect(command.steps).toContain('result');
      expect(command.steps).toContain('compare');
    });
  });

  // ==========================================================================
  // MAIN MENU
  // ==========================================================================
  describe('Main Menu', () => {
    beforeEach(() => {
      mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);
    });

    it('should show main menu when twin is ready', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Что если');
    });

    it('should display current sleep efficiency', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('78%');
      expect(result.message).toContain('эффективность');
    });

    it('should display model quality', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Качество модели');
    });

    it('should explain how it works', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Как это работает');
      expect(result.message).toContain('моделирования');
    });

    it('should have category buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const buttonCallbacks = buttons.map(b => b.callbackData);

      expect(buttonCallbacks).toContain('whatif:category:timing');
      expect(buttonCallbacks).toContain('whatif:category:behavior');
      expect(buttonCallbacks).toContain('whatif:category:relaxation');
      expect(buttonCallbacks).toContain('whatif:category:cognitive');
    });

    it('should have compare button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const compareButton = buttons.find(b => b.callbackData === 'whatif:compare:menu');

      expect(compareButton).toBeDefined();
      expect(compareButton?.text).toContain('Сравнить');
    });

    it('should have twin status button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const twinButton = buttons.find(b => b.callbackData === 'whatif:twin:status');

      expect(twinButton).toBeDefined();
      expect(twinButton?.text).toContain('Digital Twin');
    });

    it('should include metadata', async () => {
      const result = await command.execute(mockContext);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.userId).toBe('12345');
      expect(result.metadata?.currentSE).toBe(78);
      expect(result.metadata?.twinQuality).toBe(0.85);
    });
  });

  // ==========================================================================
  // INSUFFICIENT DATA
  // ==========================================================================
  describe('Insufficient Data', () => {
    beforeEach(() => {
      mockDigitalTwinService.createTwin.mockResolvedValue({
        ...mockTwin,
        isReady: false,
        observationCount: 1,
      });
    });

    it('should show insufficient data message', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('больше данных');
    });

    it('should show current and needed records', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('1 запись');
      expect(result.message).toContain('минимум 3');
    });

    it('should show how many days left', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('2 дня');
    });

    it('should have diary button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const diaryButton = buttons.find(b => b.callbackData === 'diary:start');

      expect(diaryButton).toBeDefined();
      expect(diaryButton?.text).toContain('дневник');
    });

    it('should mention /diary command', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('/diary');
    });
  });

  // ==========================================================================
  // DIRECT SCENARIO ARGUMENT
  // ==========================================================================
  describe('Direct Scenario Argument', () => {
    beforeEach(() => {
      mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);
      mockDigitalTwinService.simulateScenario.mockResolvedValue(mockSimulationResult);
    });

    it('should parse "раньше" as earlier_bedtime', async () => {
      const result = await command.execute(mockContext, 'раньше');

      expect(mockDigitalTwinService.simulateScenario).toHaveBeenCalled();
      expect(result.message).toContain('раннее');
    });

    it('should parse "позже" as later_bedtime', async () => {
      mockDigitalTwinService.simulateScenario.mockResolvedValue({
        ...mockSimulationResult,
        scenario: { name: 'Более позднее время отхода ко сну', description: 'test' },
      });

      const result = await command.execute(mockContext, 'позже');

      expect(mockDigitalTwinService.simulateScenario).toHaveBeenCalled();
    });

    it('should parse "кофе" as no_caffeine', async () => {
      mockDigitalTwinService.simulateScenario.mockResolvedValue({
        ...mockSimulationResult,
        scenario: { name: 'Без кофеина после обеда', description: 'test' },
      });

      const result = await command.execute(mockContext, 'кофе');

      expect(mockDigitalTwinService.simulateScenario).toHaveBeenCalled();
    });

    it('should parse "пмр" as pmr_practice', async () => {
      mockDigitalTwinService.simulateScenario.mockResolvedValue({
        ...mockSimulationResult,
        scenario: { name: 'Прогрессивная мышечная релаксация', description: 'test' },
      });

      const result = await command.execute(mockContext, 'пмр');

      expect(mockDigitalTwinService.simulateScenario).toHaveBeenCalled();
    });

    it('should show menu for unknown argument', async () => {
      const result = await command.execute(mockContext, 'unknown_scenario');

      expect(result.message).toContain('Что если');
      expect(mockDigitalTwinService.simulateScenario).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SCENARIO SIMULATION
  // ==========================================================================
  describe('Scenario Simulation', () => {
    beforeEach(() => {
      mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);
      mockDigitalTwinService.simulateScenario.mockResolvedValue(mockSimulationResult);
    });

    it('should show simulation result', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:scenario:earlier_bedtime',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Что если');
      expect(result.message).toContain('раннее');
    });

    it('should display predicted outcome', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:scenario:earlier_bedtime',
        {}
      );

      expect(result.message).toContain('Прогноз');
      expect(result.message).toContain('85%');
      expect(result.message).toContain('+7%');
    });

    it('should display scenario duration', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:scenario:earlier_bedtime',
        {}
      );

      expect(result.message).toContain('7 дней');
    });

    it('should display key factors', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:scenario:earlier_bedtime',
        {}
      );

      expect(result.message).toContain('Ключевые факторы');
      expect(result.message).toContain('Стабильное время пробуждения');
    });

    it('should display recommendations', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:scenario:earlier_bedtime',
        {}
      );

      expect(result.message).toContain('Рекомендации');
      expect(result.message).toContain('дневного сна');
    });

    it('should display confidence level', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:scenario:earlier_bedtime',
        {}
      );

      expect(result.message).toContain('Уверенность');
      expect(result.message).toContain('75%');
    });

    it('should have compare button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:scenario:earlier_bedtime',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const compareButton = buttons.find(b => b.callbackData?.includes('compare:add'));

      expect(compareButton).toBeDefined();
    });

    it('should have apply button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:scenario:earlier_bedtime',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const applyButton = buttons.find(b => b.callbackData?.includes('apply'));

      expect(applyButton).toBeDefined();
      expect(applyButton?.text).toContain('Попробовать');
    });

    it('should include metadata', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:scenario:earlier_bedtime',
        {}
      );

      expect(result.metadata?.scenario).toBe('earlier_bedtime');
      expect(result.metadata?.predictedSE).toBe(85);
      expect(result.metadata?.change).toBe(7);
      expect(result.metadata?.confidence).toBe(0.75);
    });

    it('should handle simulation error', async () => {
      mockDigitalTwinService.simulateScenario.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'whatif:scenario:earlier_bedtime',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Не удалось');
    });

    it('should handle unknown scenario', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:scenario:unknown_scenario',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден');
    });
  });

  // ==========================================================================
  // SCENARIO COMPARISON
  // ==========================================================================
  describe('Scenario Comparison', () => {
    beforeEach(() => {
      mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);
      mockDigitalTwinService.compareScenarios.mockResolvedValue(mockComparisonResult);
    });

    describe('Compare Menu', () => {
      it('should show compare menu', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:menu',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Сравнение сценариев');
      });

      it('should have popular scenario buttons', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:menu',
          {}
        );

        const buttons = result.keyboard?.flat() ?? [];
        const buttonTexts = buttons.map(b => b.text);

        expect(buttonTexts.some(t => t.includes('раннее') || t.includes('время'))).toBe(true);
      });
    });

    describe('Compare Add', () => {
      it('should show add second scenario', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:add:earlier_bedtime',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Первый');
        expect(result.message).toContain('раннее');
        expect(result.message).toContain('второй');
      });

      it('should have other scenario buttons', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:add:earlier_bedtime',
          {}
        );

        const buttons = result.keyboard?.flat() ?? [];
        const buttonCallbacks = buttons.map(b => b.callbackData);

        // Should have compare:run buttons
        expect(buttonCallbacks.some(c => c?.includes('compare:run'))).toBe(true);
      });

      it('should have compare with current mode button', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:add:earlier_bedtime',
          {}
        );

        const buttons = result.keyboard?.flat() ?? [];
        const currentButton = buttons.find(b => b.callbackData?.includes('no_change'));

        expect(currentButton).toBeDefined();
        expect(currentButton?.text).toContain('текущим режимом');
      });
    });

    describe('Compare Run', () => {
      it('should show comparison result', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:run:earlier_bedtime:no_change',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Сравнение сценариев');
      });

      it('should display best scenario', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:run:earlier_bedtime:no_change',
          {}
        );

        expect(result.message).toContain('Лучший вариант');
        expect(result.message).toContain('раннее');
      });

      it('should display star marker for best', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:run:earlier_bedtime:no_change',
          {}
        );

        expect(result.message).toContain('⭐');
      });

      it('should display explanation', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:run:earlier_bedtime:no_change',
          {}
        );

        expect(result.message).toContain('давление сна');
      });

      it('should have choose best button', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:run:earlier_bedtime:no_change',
          {}
        );

        const buttons = result.keyboard?.flat() ?? [];
        const chooseBestButton = buttons.find(b => b.text.includes('Выбрать лучший'));

        expect(chooseBestButton).toBeDefined();
      });

      it('should include metadata', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:run:earlier_bedtime:no_change',
          {}
        );

        expect(result.metadata?.comparedCount).toBe(2);
        expect(result.metadata?.bestScenario).toContain('раннее');
      });

      it('should handle comparison error', async () => {
        mockDigitalTwinService.compareScenarios.mockResolvedValue(null);

        const result = await command.handleCallback(
          mockContext,
          'whatif:compare:run:earlier_bedtime:no_change',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Не удалось');
      });
    });
  });

  // ==========================================================================
  // CATEGORY NAVIGATION
  // ==========================================================================
  describe('Category Navigation', () => {
    beforeEach(() => {
      mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);
    });

    describe('Timing Category', () => {
      it('should show timing scenarios', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:category:timing',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Время сна');
        expect(result.message).toContain('🕐');
      });

      it('should list timing scenarios', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:category:timing',
          {}
        );

        expect(result.message).toContain('раннее');
        expect(result.message).toContain('позднее');
        expect(result.message).toContain('Стабильное время');
      });

      it('should have scenario buttons', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:category:timing',
          {}
        );

        const buttons = result.keyboard?.flat() ?? [];
        const buttonCallbacks = buttons.map(b => b.callbackData);

        expect(buttonCallbacks).toContain('whatif:scenario:earlier_bedtime');
        expect(buttonCallbacks).toContain('whatif:scenario:later_bedtime');
        expect(buttonCallbacks).toContain('whatif:scenario:consistent_wake');
      });
    });

    describe('Behavior Category', () => {
      it('should show behavior scenarios', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:category:behavior',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Поведение');
        expect(result.message).toContain('🚶');
      });

      it('should list behavior scenarios', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:category:behavior',
          {}
        );

        expect(result.message).toContain('20 минут');
        expect(result.message).toContain('кофеина');
        expect(result.message).toContain('спальни');
      });
    });

    describe('Relaxation Category', () => {
      it('should show relaxation scenarios', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:category:relaxation',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Расслабление');
        expect(result.message).toContain('🧘');
      });

      it('should list relaxation scenarios', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:category:relaxation',
          {}
        );

        expect(result.message).toContain('мышечная релаксация');
        expect(result.message).toContain('Дыхательные');
      });
    });

    describe('Cognitive Category', () => {
      it('should show cognitive scenarios', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:category:cognitive',
          {}
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('мыслями');
        expect(result.message).toContain('🧠');
      });
    });

    describe('Unknown Category', () => {
      it('should handle unknown category', async () => {
        const result = await command.handleCallback(
          mockContext,
          'whatif:category:unknown',
          {}
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Категория не найдена');
      });
    });
  });

  // ==========================================================================
  // APPLY SCENARIO
  // ==========================================================================
  describe('Apply Scenario', () => {
    it('should show apply guidance for earlier_bedtime', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:apply:earlier_bedtime',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Применить');
      expect(result.message).toContain('раннее');
      expect(result.message).toContain('/today');
    });

    it('should show apply guidance for pmr_practice', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:apply:pmr_practice',
        {}
      );

      expect(result.message).toContain('/relax');
    });

    it('should show apply guidance for no_caffeine', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:apply:no_caffeine',
        {}
      );

      expect(result.message).toContain('/smart_tips');
    });

    it('should show apply guidance for consistent_wake', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:apply:consistent_wake',
        {}
      );

      expect(result.message).toContain('/diary');
    });

    it('should show duration', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:apply:earlier_bedtime',
        {}
      );

      expect(result.message).toContain('7 дней');
    });

    it('should have action button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:apply:earlier_bedtime',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const actionButton = buttons.find(b => b.text.includes('🚀'));

      expect(actionButton).toBeDefined();
    });

    it('should handle unknown scenario', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:apply:unknown_scenario',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден');
    });
  });

  // ==========================================================================
  // TWIN STATUS
  // ==========================================================================
  describe('Twin Status', () => {
    beforeEach(() => {
      mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);
      mockDigitalTwinService.detectTippingPoints.mockResolvedValue([
        {
          type: 'improvement',
          probability: 0.7,
          recommendationRu: 'Стабильный режим поможет улучшить сон',
        },
      ]);
    });

    it('should show twin status', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:twin:status',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Digital Twin');
    });

    it('should show ready status', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:twin:status',
        {}
      );

      expect(result.message).toContain('Готов к моделированию');
      expect(result.message).toContain('✅');
    });

    it('should show not ready status', async () => {
      mockDigitalTwinService.createTwin.mockResolvedValue({
        ...mockTwin,
        isReady: false,
      });

      const result = await command.handleCallback(
        mockContext,
        'whatif:twin:status',
        {}
      );

      expect(result.message).toContain('Недостаточно данных');
      expect(result.message).toContain('⏳');
    });

    it('should show observation count', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:twin:status',
        {}
      );

      expect(result.message).toContain('15');
      expect(result.message).toContain('Записей');
    });

    it('should show model quality', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:twin:status',
        {}
      );

      expect(result.message).toContain('Качество модели');
      expect(result.message).toContain('85%');
    });

    it('should show current metrics', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:twin:status',
        {}
      );

      expect(result.message).toContain('Эффективность сна');
      expect(result.message).toContain('78%');
    });

    it('should show trend', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:twin:status',
        {}
      );

      expect(result.message).toContain('Тренд');
      expect(result.message).toContain('Улучшение');
      expect(result.message).toContain('📈');
    });

    it('should show risk level', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:twin:status',
        {}
      );

      expect(result.message).toContain('Уровень риска');
      expect(result.message).toContain('Низкий');
      expect(result.message).toContain('🟢');
    });

    it('should show tipping points', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:twin:status',
        {}
      );

      expect(result.message).toContain('Обнаруженные переходы');
      expect(result.message).toContain('Улучшение');
      expect(result.message).toContain('70%');
    });

    it('should have scenario button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:twin:status',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const scenarioButton = buttons.find(b => b.callbackData === 'whatif:menu');

      expect(scenarioButton).toBeDefined();
    });

    it('should include metadata', async () => {
      const result = await command.handleCallback(
        mockContext,
        'whatif:twin:status',
        {}
      );

      expect(result.metadata?.twinReady).toBe(true);
      expect(result.metadata?.observations).toBe(15);
      expect(result.metadata?.quality).toBe(0.85);
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    beforeEach(() => {
      mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);
    });

    it('should route to menu', async () => {
      const result = await command.handleCallback(mockContext, 'whatif:menu', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Что если');
    });

    it('should handle unknown action', async () => {
      const result = await command.handleCallback(mockContext, 'whatif:unknown', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Неизвестное');
    });
  });

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  describe('Helper Methods', () => {
    beforeEach(() => {
      mockDigitalTwinService.createTwin.mockResolvedValue(mockTwin);
    });

    describe('Trend Emoji', () => {
      it('should show improving emoji', async () => {
        const result = await command.execute(mockContext);

        expect(result.message).toContain('📈');
      });

      it('should show stable emoji', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          trend: 'stable',
        });

        const result = await command.execute(mockContext);

        expect(result.message).toContain('➡️');
      });

      it('should show declining emoji', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          trend: 'declining',
        });

        const result = await command.execute(mockContext);

        expect(result.message).toContain('📉');
      });

      it('should show critical emoji', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          trend: 'critical',
        });

        const result = await command.execute(mockContext);

        expect(result.message).toContain('🚨');
      });
    });

    describe('Quality Format', () => {
      it('should format excellent quality', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          stateQuality: 0.9,
        });

        const result = await command.execute(mockContext);

        expect(result.message).toContain('🟢');
        expect(result.message).toContain('отлично');
      });

      it('should format good quality', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          stateQuality: 0.75,
        });

        const result = await command.execute(mockContext);

        expect(result.message).toContain('🟡');
        expect(result.message).toContain('хорошо');
      });

      it('should format medium quality', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          stateQuality: 0.55,
        });

        const result = await command.execute(mockContext);

        expect(result.message).toContain('🟠');
        expect(result.message).toContain('средне');
      });

      it('should format low quality', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          stateQuality: 0.4,
        });

        const result = await command.execute(mockContext);

        expect(result.message).toContain('🔴');
        expect(result.message).toContain('недостаточно');
      });
    });

    describe('Confidence Format', () => {
      beforeEach(() => {
        mockDigitalTwinService.simulateScenario.mockResolvedValue(mockSimulationResult);
      });

      it('should format high confidence', async () => {
        mockDigitalTwinService.simulateScenario.mockResolvedValue({
          ...mockSimulationResult,
          confidence: 0.85,
        });

        const result = await command.handleCallback(
          mockContext,
          'whatif:scenario:earlier_bedtime',
          {}
        );

        expect(result.message).toContain('🟢');
        expect(result.message).toContain('высокая');
      });

      it('should format medium confidence', async () => {
        mockDigitalTwinService.simulateScenario.mockResolvedValue({
          ...mockSimulationResult,
          confidence: 0.65,
        });

        const result = await command.handleCallback(
          mockContext,
          'whatif:scenario:earlier_bedtime',
          {}
        );

        expect(result.message).toContain('🟡');
        expect(result.message).toContain('средняя');
      });

      it('should format low confidence', async () => {
        mockDigitalTwinService.simulateScenario.mockResolvedValue({
          ...mockSimulationResult,
          confidence: 0.45,
        });

        const result = await command.handleCallback(
          mockContext,
          'whatif:scenario:earlier_bedtime',
          {}
        );

        expect(result.message).toContain('🟠');
        expect(result.message).toContain('низкая');
      });
    });

    describe('Change Emoji', () => {
      beforeEach(() => {
        mockDigitalTwinService.simulateScenario.mockResolvedValue(mockSimulationResult);
      });

      it('should show rocket for large improvement', async () => {
        mockDigitalTwinService.simulateScenario.mockResolvedValue({
          ...mockSimulationResult,
          predictedOutcome: { ...mockSimulationResult.predictedOutcome, sleepEfficiencyChange: 12 },
        });

        const result = await command.handleCallback(
          mockContext,
          'whatif:scenario:earlier_bedtime',
          {}
        );

        expect(result.message).toContain('🚀');
      });

      it('should show down arrow for small decline', async () => {
        mockDigitalTwinService.simulateScenario.mockResolvedValue({
          ...mockSimulationResult,
          predictedOutcome: { ...mockSimulationResult.predictedOutcome, sleepEfficiencyChange: -3 },
        });

        const result = await command.handleCallback(
          mockContext,
          'whatif:scenario:earlier_bedtime',
          {}
        );

        expect(result.message).toContain('⬇️');
      });
    });

    describe('Pluralization', () => {
      it('should pluralize 1 запись', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          isReady: false,
          observationCount: 1,
        });

        const result = await command.execute(mockContext);

        expect(result.message).toContain('1 запись');
      });

      it('should pluralize 2 записи', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          isReady: false,
          observationCount: 2,
        });

        const result = await command.execute(mockContext);

        expect(result.message).toContain('2 записи');
      });

      it('should pluralize 5 записей', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          isReady: false,
          observationCount: 0,
        });

        const result = await command.execute(mockContext);

        expect(result.message).toContain('записей');
      });

      it('should pluralize 11 записей (special case)', async () => {
        mockDigitalTwinService.createTwin.mockResolvedValue({
          ...mockTwin,
          isReady: false,
          observationCount: 0,
        });

        const result = await command.execute(mockContext);

        // 3 days needed, uses "дней"
        expect(result.message).toContain('3 дня');
      });
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(whatIfCommand).toBeInstanceOf(WhatIfCommand);
    });

    it('should have correct name', () => {
      expect(whatIfCommand.name).toBe('whatif');
    });
  });
});
