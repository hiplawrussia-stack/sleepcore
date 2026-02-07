/**
 * InsightsCommand Tests
 * =====================
 *
 * Personalized causal insights: "Why am I sleeping poorly?"
 *
 * Research basis (2025-2026):
 * - Bayesian Network Analysis for insomnia (BMC Psychiatry 2024)
 * - Graph-Augmented LLMs for health insights (arXiv 2024)
 * - NarrativeGenerator for explainability (FDA XAI requirements 2025)
 *
 * Tests verify:
 * - Causal analysis with 14+ days data requirement
 * - Top causes display
 * - Causal graph visualization
 * - Pattern detection
 * - Intervention target suggestions
 * - Factor detail views
 *
 * @packageDocumentation
 */

import { InsightsCommand, insightsCommand } from '../InsightsCommand';
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
    info: (text: string) => `ℹ️ ${text}`,
    warning: (text: string) => `⚠️ ${text}`,
    success: (text: string) => `✅ ${text}`,
    progressBar: (percent: number) => `[${'█'.repeat(Math.floor(percent / 10))}${'░'.repeat(10 - Math.floor(percent / 10))}] ${Math.floor(percent)}%`,
  },
}));

describe('InsightsCommand', () => {
  let command: InsightsCommand;
  let mockContext: ISleepCoreContext;
  let mockGetSession: jest.Mock;
  let mockGetHistory: jest.Mock;
  let mockGenerateInsights: jest.Mock;
  let mockSuggestInterventionTarget: jest.Mock;
  let mockGetTopCauses: jest.Mock;
  let mockDiscoverCausalGraph: jest.Mock;
  let mockAnalyzePatterns: jest.Mock;

  const createMockHistoryEntry = (daysAgo: number) => ({
    userId: '12345',
    date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    metrics: {
      sleepEfficiency: 75 + Math.random() * 15,
      sleepOnsetLatency: 20 + Math.random() * 20,
      wakeAfterSleepOnset: 30 + Math.random() * 20,
      totalSleepTime: 360 + Math.random() * 60,
    },
  });

  const mockInsights = [
    {
      id: 'insight1',
      titleRu: 'Нерегулярный режим сна',
      explanationRu: 'Ваше время отхода ко сну варьируется на 2+ часа в течение недели.',
      recommendationRu: 'Установите фиксированное время пробуждения.',
      confidence: 'high' as const,
      category: 'pattern',
    },
    {
      id: 'insight2',
      titleRu: 'Высокий уровень стресса',
      explanationRu: 'Данные указывают на корреляцию между стрессом и качеством сна.',
      recommendationRu: 'Попробуйте техники релаксации перед сном.',
      confidence: 'medium' as const,
      category: 'cause',
    },
    {
      id: 'insight3',
      titleRu: 'Кофеин влияет на SOL',
      explanationRu: 'Время засыпания увеличивается после кофеина после 14:00.',
      confidence: 'high' as const,
      category: 'cause',
    },
  ];

  const mockTarget = {
    factorId: 'bedtime_variability',
    expectedImpact: 0.12,
    modifiability: 0.8,
    priorityScore: 0.85,
    interventionRu: 'Ложитесь спать в одно и то же время каждый день (±15 мин).',
  };

  const mockCauses = [
    {
      id: 'caffeine',
      nameRu: 'Кофеин',
      emoji: '☕',
      impact: -0.25,
      strength: 0.72,
      temporalConfidence: 0.85,
      category: 'behavior',
      evidenceType: 'temporal',
    },
    {
      id: 'screen_time',
      nameRu: 'Экранное время',
      emoji: '📱',
      impact: -0.18,
      strength: 0.65,
      temporalConfidence: 0.78,
      category: 'behavior',
      evidenceType: 'correlation',
    },
  ];

  const mockGraph = {
    nodes: [
      {
        id: 'caffeine',
        nameRu: 'Кофеин',
        emoji: '☕',
        impact: -0.25,
        strength: 0.72,
        temporalConfidence: 0.85,
        category: 'behavior',
        evidenceType: 'temporal',
      },
      {
        id: 'sleep_efficiency',
        nameRu: 'Эффективность сна',
        emoji: '😴',
        impact: 0,
        strength: 1,
        temporalConfidence: 1,
        category: 'outcome',
        evidenceType: 'domain_knowledge',
      },
    ],
    edges: [
      {
        from: 'caffeine',
        to: 'sleep_efficiency',
        strength: 0.72,
        type: 'causal',
      },
    ],
    dataQuality: {
      totalDays: 21,
      completeness: 0.9,
      sufficientData: true,
    },
  };

  beforeEach(() => {
    command = new InsightsCommand();

    mockGetSession = jest.fn();
    mockGetHistory = jest.fn();
    mockGenerateInsights = jest.fn();
    mockSuggestInterventionTarget = jest.fn();
    mockGetTopCauses = jest.fn();
    mockDiscoverCausalGraph = jest.fn();
    mockAnalyzePatterns = jest.fn();

    mockContext = {
      userId: '12345',
      chatId: 456789,
      displayName: 'Test User',
      languageCode: 'ru',
      sleepCore: {
        getSession: mockGetSession,
        getSleepPrediction: () => ({
          getHistory: mockGetHistory,
        }),
        getCausalInsights: () => ({
          generateInsights: mockGenerateInsights,
          suggestInterventionTarget: mockSuggestInterventionTarget,
          getTopCauses: mockGetTopCauses,
          discoverCausalGraph: mockDiscoverCausalGraph,
        }),
        analyzePatterns: mockAnalyzePatterns,
      },
    } as unknown as ISleepCoreContext;

    // Default mocks
    mockGetSession.mockReturnValue({ userId: '12345' });
    mockGetHistory.mockReturnValue(
      Array.from({ length: 21 }, (_, i) => createMockHistoryEntry(i))
    );
    mockGenerateInsights.mockResolvedValue(mockInsights);
    mockSuggestInterventionTarget.mockResolvedValue(mockTarget);
    mockGetTopCauses.mockResolvedValue(mockCauses);
    mockDiscoverCausalGraph.mockResolvedValue(mockGraph);
    mockAnalyzePatterns.mockReturnValue(null);
  });

  // ==========================================================================
  // COMMAND METADATA
  // ==========================================================================
  describe('Command Metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('insights');
    });

    it('should have Russian description', () => {
      expect(command.description).toContain('анализ');
    });

    it('should have aliases', () => {
      expect(command.aliases).toContain('why');
      expect(command.aliases).toContain('почему');
      expect(command.aliases).toContain('причины');
      expect(command.aliases).toContain('анализ');
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
    });
  });

  // ==========================================================================
  // INSUFFICIENT DATA HANDLING
  // ==========================================================================
  describe('Insufficient Data Handling', () => {
    it('should show warning when less than 14 days', async () => {
      mockGetHistory.mockReturnValue(
        Array.from({ length: 7 }, (_, i) => createMockHistoryEntry(i))
      );

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Недостаточно данных');
    });

    it('should mention 14 days requirement', async () => {
      mockGetHistory.mockReturnValue(
        Array.from({ length: 10 }, (_, i) => createMockHistoryEntry(i))
      );

      const result = await command.execute(mockContext);

      expect(result.message).toContain('14 дней');
    });

    it('should show progress bar', async () => {
      mockGetHistory.mockReturnValue(
        Array.from({ length: 7 }, (_, i) => createMockHistoryEntry(i))
      );

      const result = await command.execute(mockContext);

      expect(result.message).toContain('7/14');
    });

    it('should show remaining days', async () => {
      mockGetHistory.mockReturnValue(
        Array.from({ length: 10 }, (_, i) => createMockHistoryEntry(i))
      );

      const result = await command.execute(mockContext);

      expect(result.message).toContain('4');
    });

    it('should explain why 14 days needed', async () => {
      mockGetHistory.mockReturnValue(
        Array.from({ length: 5 }, (_, i) => createMockHistoryEntry(i))
      );

      const result = await command.execute(mockContext);

      expect(result.message).toContain('паттерны');
      expect(result.message).toContain('статистик');
    });

    it('should have diary button', async () => {
      mockGetHistory.mockReturnValue([]);

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const diaryButton = buttons.find(b => b.callbackData === 'diary:start');

      expect(diaryButton).toBeDefined();
    });

    it('should handle null history', async () => {
      mockGetHistory.mockReturnValue(null);

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Недостаточно данных');
    });
  });

  // ==========================================================================
  // INSIGHTS DASHBOARD
  // ==========================================================================
  describe('Insights Dashboard', () => {
    it('should show dashboard with sufficient data', async () => {
      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Почему я плохо сплю');
    });

    it('should show data days count', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('21');
      expect(result.message).toContain('дней');
    });

    it('should show key findings section', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Ключевые находки');
    });

    it('should show top 3 insights', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Нерегулярный режим сна');
      expect(result.message).toContain('Высокий уровень стресса');
      expect(result.message).toContain('Кофеин');
    });

    it('should show confidence indicators', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('🟢'); // high confidence
      expect(result.message).toContain('🟡'); // medium confidence
    });

    it('should show intervention target', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('Главная точка воздействия');
      expect(result.message).toContain('Нерегулярное время сна');
    });

    it('should show expected impact', async () => {
      const result = await command.execute(mockContext);

      expect(result.message).toContain('+12%');
    });

    it('should have navigation buttons', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];

      expect(buttons.find(b => b.callbackData === 'insights:causes')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'insights:graph')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'insights:patterns')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'insights:target')).toBeDefined();
    });

    it('should have whatif button', async () => {
      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const whatifButton = buttons.find(b => b.callbackData === 'whatif:menu');

      expect(whatifButton).toBeDefined();
      expect(whatifButton?.text).toContain('Что если');
    });

    it('should handle insights generation error', async () => {
      mockGenerateInsights.mockRejectedValue(new Error('Analysis failed'));

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Ошибка анализа');
    });
  });

  // ==========================================================================
  // TOP CAUSES VIEW
  // ==========================================================================
  describe('Top Causes View', () => {
    it('should show causes on callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:causes',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Топ причин');
    });

    it('should show cause names', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:causes',
        {}
      );

      expect(result.message).toContain('Кофеин');
      expect(result.message).toContain('Экранное время');
    });

    it('should show cause emojis', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:causes',
        {}
      );

      expect(result.message).toContain('☕');
      expect(result.message).toContain('📱');
    });

    it('should show impact direction', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:causes',
        {}
      );

      expect(result.message).toContain('📉'); // negative impact
    });

    it('should show strength percentage', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:causes',
        {}
      );

      expect(result.message).toContain('72%');
    });

    it('should show confidence percentage', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:causes',
        {}
      );

      expect(result.message).toContain('85%');
    });

    it('should explain how to read', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:causes',
        {}
      );

      expect(result.message).toContain('Как читать');
      expect(result.message).toContain('Сила влияния');
    });

    it('should have factor detail buttons', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:causes',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const caffeineButton = buttons.find(b => b.callbackData?.includes('factor:caffeine'));

      expect(caffeineButton).toBeDefined();
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:causes',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'insights:dashboard');

      expect(backButton).toBeDefined();
    });

    it('should show success when no causes found', async () => {
      mockGetTopCauses.mockResolvedValue([]);

      const result = await command.handleCallback(
        mockContext,
        'insights:causes',
        {}
      );

      expect(result.message).toContain('Явных причин не выявлено');
      expect(result.message).toContain('хороший знак');
    });

    it('should handle error gracefully', async () => {
      mockGetTopCauses.mockRejectedValue(new Error('Failed'));

      const result = await command.handleCallback(
        mockContext,
        'insights:causes',
        {}
      );

      expect(result.message).toContain('Ошибка анализа');
    });
  });

  // ==========================================================================
  // CAUSAL GRAPH VIEW
  // ==========================================================================
  describe('Causal Graph View', () => {
    it('should show graph on callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:graph',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Граф причинно-следственных связей');
    });

    it('should show legend', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:graph',
        {}
      );

      expect(result.message).toContain('Легенда');
      expect(result.message).toContain('влияет на');
    });

    it('should show data quality info', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:graph',
        {}
      );

      expect(result.message).toContain('Качество данных');
      expect(result.message).toContain('21'); // totalDays
      expect(result.message).toContain('90%'); // completeness
    });

    it('should show sufficient data indicator', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:graph',
        {}
      );

      expect(result.message).toContain('✅'); // sufficientData = true
    });

    it('should show warning when insufficient', async () => {
      mockDiscoverCausalGraph.mockResolvedValue({
        ...mockGraph,
        dataQuality: { ...mockGraph.dataQuality, sufficientData: false },
      });

      const result = await command.handleCallback(
        mockContext,
        'insights:graph',
        {}
      );

      expect(result.message).toContain('⚠️');
    });

    it('should have back and causes buttons', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:graph',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];

      expect(buttons.find(b => b.callbackData === 'insights:causes')).toBeDefined();
      expect(buttons.find(b => b.callbackData === 'insights:dashboard')).toBeDefined();
    });

    it('should handle null graph', async () => {
      mockDiscoverCausalGraph.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'insights:graph',
        {}
      );

      expect(result.message).toContain('Ошибка анализа');
    });
  });

  // ==========================================================================
  // PATTERNS VIEW
  // ==========================================================================
  describe('Patterns View', () => {
    it('should show patterns on callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:patterns',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Выявленные паттерны');
    });

    it('should filter to pattern category', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:patterns',
        {}
      );

      // insight1 has category 'pattern'
      expect(result.message).toContain('Нерегулярный режим сна');
    });

    it('should show pattern recommendations', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:patterns',
        {}
      );

      expect(result.message).toContain('Установите фиксированное время пробуждения');
    });

    it('should explain what pattern is', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:patterns',
        {}
      );

      expect(result.message).toContain('Что такое паттерн');
      expect(result.message).toContain('закономерность');
    });

    it('should show diary patterns when available', async () => {
      mockAnalyzePatterns.mockReturnValue({
        patterns: {
          averageBedtime: '23:30',
          averageWakeTime: '07:15',
          bedtimeVariability: 45,
          wakeTimeVariability: 20,
          weekendShift: 90,
        },
        insomnia: {
          subtype: 'onset',
          severity: 'moderate',
          avgSOL: 35,
          avgWASO: 20,
          avgSE: 78,
        },
        issues: [
          { description: 'Высокая вариабельность времени сна', severity: 'medium' },
        ],
      });

      const result = await command.handleCallback(
        mockContext,
        'insights:patterns',
        {}
      );

      expect(result.message).toContain('Анализ расписания сна');
      expect(result.message).toContain('23:30');
      expect(result.message).toContain('07:15');
    });

    it('should show bedtime variability warning', async () => {
      mockAnalyzePatterns.mockReturnValue({
        patterns: {
          averageBedtime: '23:30',
          averageWakeTime: '07:15',
          bedtimeVariability: 45, // > 30
          wakeTimeVariability: 20,
          weekendShift: 30,
        },
        insomnia: { subtype: 'none', severity: 'none', avgSOL: 15, avgWASO: 10, avgSE: 90 },
        issues: [],
      });

      const result = await command.handleCallback(
        mockContext,
        'insights:patterns',
        {}
      );

      expect(result.message).toContain('⚠️');
      expect(result.message).toContain('Вариабельность');
      expect(result.message).toContain('45');
    });

    it('should show weekend shift warning', async () => {
      mockAnalyzePatterns.mockReturnValue({
        patterns: {
          averageBedtime: '23:30',
          averageWakeTime: '07:15',
          bedtimeVariability: 20,
          wakeTimeVariability: 20,
          weekendShift: 90, // > 60
        },
        insomnia: { subtype: 'none', severity: 'none', avgSOL: 15, avgWASO: 10, avgSE: 90 },
        issues: [],
      });

      const result = await command.handleCallback(
        mockContext,
        'insights:patterns',
        {}
      );

      expect(result.message).toContain('Сдвиг в выходные');
      expect(result.message).toContain('90');
    });

    it('should show issues with severity colors', async () => {
      mockAnalyzePatterns.mockReturnValue({
        patterns: {
          averageBedtime: '23:30',
          averageWakeTime: '07:15',
          bedtimeVariability: 20,
          wakeTimeVariability: 20,
          weekendShift: 30,
        },
        insomnia: { subtype: 'none', severity: 'none', avgSOL: 15, avgWASO: 10, avgSE: 90 },
        issues: [
          { description: 'High severity issue', severity: 'high' },
          { description: 'Medium severity issue', severity: 'medium' },
        ],
      });

      const result = await command.handleCallback(
        mockContext,
        'insights:patterns',
        {}
      );

      expect(result.message).toContain('Выявленные проблемы');
      expect(result.message).toContain('🔴'); // high
      expect(result.message).toContain('🟡'); // medium
    });

    it('should show info when no patterns', async () => {
      mockGenerateInsights.mockResolvedValue([
        { ...mockInsights[1], category: 'cause' }, // not a pattern
      ]);

      const result = await command.handleCallback(
        mockContext,
        'insights:patterns',
        {}
      );

      expect(result.message).toContain('Явных паттернов пока не выявлено');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:patterns',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'insights:dashboard');

      expect(backButton).toBeDefined();
    });
  });

  // ==========================================================================
  // INTERVENTION TARGET VIEW
  // ==========================================================================
  describe('Intervention Target View', () => {
    it('should show target on callback', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Главная точка воздействия');
    });

    it('should show factor name and emoji', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.message).toContain('🕐');
      expect(result.message).toContain('Нерегулярное время сна');
    });

    it('should show expected impact', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.message).toContain('+12%');
    });

    it('should show modifiability', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.message).toContain('80%');
      expect(result.message).toContain('насколько легко изменить');
    });

    it('should show difficulty level', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.message).toContain('🟢'); // easy (modifiability > 0.7)
      expect(result.message).toContain('Легко');
    });

    it('should show medium difficulty for moderate modifiability', async () => {
      mockSuggestInterventionTarget.mockResolvedValue({
        ...mockTarget,
        modifiability: 0.5,
      });

      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.message).toContain('🟡');
      expect(result.message).toContain('Средне');
    });

    it('should show hard difficulty for low modifiability', async () => {
      mockSuggestInterventionTarget.mockResolvedValue({
        ...mockTarget,
        modifiability: 0.3,
      });

      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.message).toContain('🔴');
      expect(result.message).toContain('Сложно');
    });

    it('should show priority score', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.message).toContain('85%');
    });

    it('should show intervention recommendation', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.message).toContain('Ложитесь спать в одно и то же время');
    });

    it('should have simulate button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const simButton = buttons.find(b => b.callbackData?.includes('whatif:scenario'));

      expect(simButton).toBeDefined();
      expect(simButton?.text).toContain('Смоделировать');
    });

    it('should have back button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'insights:dashboard');

      expect(backButton).toBeDefined();
    });

    it('should show info when no target found', async () => {
      mockSuggestInterventionTarget.mockResolvedValue(null);

      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.message).toContain('не удалось определить');
    });
  });

  // ==========================================================================
  // FACTOR DETAIL VIEW
  // ==========================================================================
  describe('Factor Detail View', () => {
    it('should show factor details', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:caffeine',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('☕');
      expect(result.message).toContain('Кофеин');
    });

    it('should show factor category', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:caffeine',
        {}
      );

      expect(result.message).toContain('Категория');
      expect(result.message).toContain('Поведение');
    });

    it('should show impact type', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:caffeine',
        {}
      );

      expect(result.message).toContain('Тип влияния');
      expect(result.message).toContain('📉');
      expect(result.message).toContain('Отрицательное');
    });

    it('should show statistics', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:caffeine',
        {}
      );

      expect(result.message).toContain('Статистика');
      expect(result.message).toContain('Сила влияния');
      expect(result.message).toContain('25%');
    });

    it('should show temporal confidence', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:caffeine',
        {}
      );

      expect(result.message).toContain('Временная уверенность');
      expect(result.message).toContain('85%');
    });

    it('should show evidence type', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:caffeine',
        {}
      );

      expect(result.message).toContain('Тип доказательства');
      expect(result.message).toContain('Временная связь');
    });

    it('should show connected factors', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:caffeine',
        {}
      );

      expect(result.message).toContain('Связи с другими факторами');
      expect(result.message).toContain('Эффективность сна');
    });

    it('should show direction of connection', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:caffeine',
        {}
      );

      expect(result.message).toContain('→'); // outgoing connection
    });

    it('should have simulate button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:caffeine',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const simButton = buttons.find(b => b.callbackData === 'whatif:scenario:caffeine');

      expect(simButton).toBeDefined();
    });

    it('should have back to causes button', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:caffeine',
        {}
      );

      const buttons = result.keyboard?.flat() ?? [];
      const backButton = buttons.find(b => b.callbackData === 'insights:causes');

      expect(backButton).toBeDefined();
    });

    it('should redirect to dashboard if factor not found', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:nonexistent',
        {}
      );

      expect(result.message).toContain('Почему я плохо сплю');
    });

    it('should redirect if no factor id', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:factor:',
        {}
      );

      expect(result.message).toContain('Почему я плохо сплю');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should show analysis error message', async () => {
      mockGenerateInsights.mockRejectedValue(new Error('Analysis failed'));

      const result = await command.execute(mockContext);

      expect(result.message).toContain('Ошибка анализа');
      expect(result.message).toContain('техническая проблема');
    });

    it('should have diary button on error', async () => {
      mockGenerateInsights.mockRejectedValue(new Error('Failed'));

      const result = await command.execute(mockContext);

      const buttons = result.keyboard?.flat() ?? [];
      const diaryButton = buttons.find(b => b.callbackData === 'diary:start');

      expect(diaryButton).toBeDefined();
    });
  });

  // ==========================================================================
  // FACTOR NAME/EMOJI MAPPING
  // ==========================================================================
  describe('Factor Name and Emoji Mapping', () => {
    it.each([
      ['bedtime_variability', '🕐', 'Нерегулярное время сна'],
      ['screen_time', '📱', 'Экранное время перед сном'],
      ['caffeine', '☕', 'Кофеин'],
      ['alcohol', '🍷', 'Алкоголь'],
      ['exercise', '🏃', 'Физическая активность'],
      ['stress', '😰', 'Стресс'],
      ['naps', '😴', 'Дневной сон'],
      ['sleep_environment', '🛏️', 'Окружение для сна'],
      ['sleep_anxiety', '😟', 'Тревога о сне'],
      ['rumination', '🔄', 'Руминация'],
    ])('should map %s to %s %s', async (factorId, expectedEmoji, expectedName) => {
      mockSuggestInterventionTarget.mockResolvedValue({
        ...mockTarget,
        factorId,
      });

      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.message).toContain(expectedEmoji);
      expect(result.message).toContain(expectedName);
    });

    it('should use default for unknown factor', async () => {
      mockSuggestInterventionTarget.mockResolvedValue({
        ...mockTarget,
        factorId: 'unknown_factor',
      });

      const result = await command.handleCallback(
        mockContext,
        'insights:target',
        {}
      );

      expect(result.message).toContain('📊');
      expect(result.message).toContain('Фактор сна');
    });
  });

  // ==========================================================================
  // PLURALIZATION
  // ==========================================================================
  describe('Russian Pluralization', () => {
    it('should pluralize remaining days correctly (1 день)', async () => {
      mockGetHistory.mockReturnValue(
        Array.from({ length: 13 }, (_, i) => createMockHistoryEntry(i))
      );

      const result = await command.execute(mockContext);

      expect(result.message).toContain('1 день');
    });

    it('should pluralize remaining days correctly (2 дня)', async () => {
      mockGetHistory.mockReturnValue(
        Array.from({ length: 12 }, (_, i) => createMockHistoryEntry(i))
      );

      const result = await command.execute(mockContext);

      expect(result.message).toContain('2 дня');
    });

    it('should pluralize remaining days correctly (5 дней)', async () => {
      mockGetHistory.mockReturnValue(
        Array.from({ length: 9 }, (_, i) => createMockHistoryEntry(i))
      );

      const result = await command.execute(mockContext);

      expect(result.message).toContain('5 дней');
    });

    it('should pluralize remaining days correctly (11 дней)', async () => {
      mockGetHistory.mockReturnValue(
        Array.from({ length: 3 }, (_, i) => createMockHistoryEntry(i))
      );

      const result = await command.execute(mockContext);

      expect(result.message).toContain('11 дней');
    });
  });

  // ==========================================================================
  // CALLBACK ROUTING
  // ==========================================================================
  describe('Callback Routing', () => {
    it('should route to dashboard on unknown action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights:unknown',
        {}
      );

      expect(result.message).toContain('Почему я плохо сплю');
    });

    it('should route to dashboard on empty action', async () => {
      const result = await command.handleCallback(
        mockContext,
        'insights',
        {}
      );

      expect(result.message).toContain('Почему я плохо сплю');
    });
  });

  // ==========================================================================
  // SINGLETON INSTANCE
  // ==========================================================================
  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(insightsCommand).toBeInstanceOf(InsightsCommand);
    });

    it('should have correct name', () => {
      expect(insightsCommand.name).toBe('insights');
    });
  });
});
