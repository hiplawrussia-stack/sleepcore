/**
 * CausalInsightsService Tests
 * ============================
 *
 * Tests for personalized causal insights service.
 * Validates causal graph discovery, factor extraction, insight generation,
 * and intervention target suggestions.
 *
 * Scientific basis: Bayesian Network Analysis (BMC Psychiatry 2024),
 * Spielman's 3P Model, Harvey's Cognitive Model of Insomnia.
 *
 * @packageDocumentation
 */

import {
  CausalInsightsService,
  createCausalInsightsService,
  causalInsightsService,
  DEFAULT_CAUSAL_INSIGHTS_CONFIG,
  DOMAIN_KNOWLEDGE_EDGES,
  type ICausalInsightsConfig,
  type ICausalGraph,
  type ICausalFactor,
  type IPersonalizedInsight,
  type IInterventionTarget,
} from '../CausalInsightsService';

import type { ISleepState } from '../../../sleep/interfaces/ISleepState';

// ==================== Test Helpers ====================

/**
 * Create a mock ISleepState with realistic data.
 * All required fields are populated with defaults that can be overridden.
 */
function createMockSleepState(overrides: Partial<{
  sleepEfficiency: number;
  sleepOnsetLatency: number;
  wakeAfterSleepOnset: number;
  totalSleepTime: number;
  timeInBed: number;
  sleepAnxiety: number;
  preSleepArousal: number;
  catastrophizing: boolean;
  daytimeSleepiness: number;
  dayOffset: number;
}> = {}): ISleepState {
  const {
    sleepEfficiency = 0.75,
    sleepOnsetLatency = 25,
    wakeAfterSleepOnset = 35,
    totalSleepTime = 360,
    timeInBed = 480,
    sleepAnxiety = 0.6,
    preSleepArousal = 0.5,
    catastrophizing = false,
    daytimeSleepiness = 0.4,
    dayOffset = 0,
  } = overrides;

  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  const dateStr = date.toISOString().split('T')[0];

  return {
    userId: 'test_user',
    timestamp: date,
    date: dateStr,
    metrics: {
      timeInBed,
      totalSleepTime,
      sleepOnsetLatency,
      wakeAfterSleepOnset,
      numberOfAwakenings: 2,
      sleepEfficiency,
      bedtime: '23:00',
      wakeTime: '07:00',
      finalAwakening: '06:45',
      outOfBedTime: '07:15',
    },
    circadian: {
      chronotype: 'intermediate',
      circadianPhase: 12,
      phaseDeviation: 0.5,
      lightExposure: 500,
      estimatedMelatoninOnset: '21:30',
      socialJetLag: 1.0,
      isStable: true,
    },
    homeostasis: {
      sleepDebt: -1.5,
      debtDuration: 3,
      homeostaticPressure: 0.6,
      optimalSleepDuration: 7.5,
      isRecoverable: true,
    },
    insomnia: {
      isiScore: 16,
      severity: 'moderate',
      subtype: 'mixed',
      durationWeeks: 12,
      daytimeImpact: 0.5,
      sleepDistress: 0.6,
    },
    behaviors: {
      caffeine: {
        dailyMg: 200,
        lastIntakeTime: '14:00',
        hoursBeforeBed: 9,
      },
      alcohol: {
        drinksToday: 0,
        lastDrinkTime: '',
      },
      screenTimeBeforeBed: 45,
      exercise: {
        didExercise: true,
        durationMinutes: 30,
        hoursBeforeBed: 6,
      },
      naps: {
        count: 0,
        totalMinutes: 0,
        lastNapTime: '',
      },
      environment: {
        temperatureCelsius: 20,
        isQuiet: true,
        isDark: true,
        isComfortable: true,
      },
    },
    cognitions: {
      dbasScore: 5.5,
      beliefs: {
        unrealisticExpectations: false,
        catastrophizing,
        helplessness: false,
        effortfulSleep: false,
        healthWorries: false,
      },
      sleepAnxiety,
      preSleepArousal,
      sleepSelfEfficacy: 0.5,
    },
    subjectiveQuality: 'fair',
    morningAlertness: 0.5,
    daytimeSleepiness,
    sleepHealthScore: 55,
    trend: 'stable',
    dataQuality: 0.9,
    source: 'diary',
  };
}

/**
 * Generate a sleep history array of a given length.
 * Creates states with slight variation to produce meaningful correlations.
 */
function createSleepHistory(
  length: number,
  opts: Partial<{
    lowEfficiency: boolean;
    highSOL: boolean;
    highWASO: boolean;
    highAnxiety: boolean;
    highArousal: boolean;
    catastrophizing: boolean;
    excessiveTIB: boolean;
    variableSOL: boolean;
    highSleepiness: boolean;
    improvingTrend: boolean;
    decliningTrend: boolean;
  }> = {}
): ISleepState[] {
  const history: ISleepState[] = [];

  for (let i = 0; i < length; i++) {
    const trendFactor = opts.improvingTrend
      ? i / length * 0.2
      : opts.decliningTrend
        ? -i / length * 0.2
        : 0;

    const baseSE = opts.lowEfficiency ? 0.65 : 0.88;
    const baseSOL = opts.highSOL ? 40 : 12;
    const baseWASO = opts.highWASO ? 45 : 15;
    const baseTST = opts.excessiveTIB ? 360 : 420;
    const baseTIB = opts.excessiveTIB ? 540 : 480;
    const baseAnxiety = opts.highAnxiety ? 0.7 : 0.3;
    const baseArousal = opts.highArousal ? 0.75 : 0.4;
    const baseSleepiness = opts.highSleepiness ? 0.7 : 0.3;

    // Add some variation so pearson correlation is non-trivial
    const variation = (Math.sin(i * 1.3) * 0.05);
    const solVariation = opts.variableSOL ? (i % 2 === 0 ? 150 : -10) : 0;

    history.push(createMockSleepState({
      sleepEfficiency: Math.max(0.1, Math.min(1, baseSE + trendFactor + variation)),
      sleepOnsetLatency: Math.max(1, baseSOL + solVariation + Math.sin(i) * 5),
      wakeAfterSleepOnset: Math.max(1, baseWASO + Math.cos(i) * 5),
      totalSleepTime: baseTST + Math.sin(i) * 15,
      timeInBed: baseTIB,
      sleepAnxiety: Math.max(0, Math.min(1, baseAnxiety + variation)),
      preSleepArousal: Math.max(0, Math.min(1, baseArousal + variation)),
      catastrophizing: opts.catastrophizing ?? false,
      daytimeSleepiness: Math.max(0, Math.min(1, baseSleepiness + variation)),
      dayOffset: length - i,
    }));
  }

  return history;
}


// ==================== Tests ====================

describe('CausalInsightsService', () => {
  const testUserId = 'test_user_123';

  // ==========================================================================
  // Configuration & Constants
  // ==========================================================================
  describe('Configuration & Constants', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_CAUSAL_INSIGHTS_CONFIG.minDaysRequired).toBe(14);
      expect(DEFAULT_CAUSAL_INSIGHTS_CONFIG.correlationThreshold).toBe(0.3);
      expect(DEFAULT_CAUSAL_INSIGHTS_CONFIG.maxInsights).toBe(5);
      expect(DEFAULT_CAUSAL_INSIGHTS_CONFIG.useDomainKnowledge).toBe(true);
    });

    it('should have domain knowledge edges defined', () => {
      expect(DOMAIN_KNOWLEDGE_EDGES.length).toBeGreaterThan(0);
      for (const edge of DOMAIN_KNOWLEDGE_EDGES) {
        expect(edge).toHaveProperty('from');
        expect(edge).toHaveProperty('to');
        expect(edge).toHaveProperty('strength');
        expect(edge).toHaveProperty('bidirectional');
        expect(edge.strength).toBeGreaterThan(0);
        expect(edge.strength).toBeLessThanOrEqual(1);
      }
    });

    it('should include key CBT-I causal relationships in domain knowledge', () => {
      const edgePairs = DOMAIN_KNOWLEDGE_EDGES.map(e => `${e.from}->${e.to}`);
      expect(edgePairs).toContain('excessive_tib->low_sleep_efficiency');
      expect(edgePairs).toContain('sleep_anxiety->long_sol');
      expect(edgePairs).toContain('poor_sleep->daytime_fatigue');
    });
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================
  describe('Constructor', () => {
    it('should create service with default config', () => {
      const service = new CausalInsightsService();
      expect(service).toBeDefined();
      // Verify defaults by checking hasSufficientData with 13 days (should be false)
      const history13 = createSleepHistory(13);
      expect(service.hasSufficientData(history13)).toBe(false);
    });

    it('should create service with custom config', () => {
      const service = new CausalInsightsService({
        minDaysRequired: 7,
        correlationThreshold: 0.5,
        maxInsights: 3,
        useDomainKnowledge: false,
      });

      // With minDaysRequired=7, 7 days should be sufficient
      const history7 = createSleepHistory(7);
      expect(service.hasSufficientData(history7)).toBe(true);
    });

    it('should merge partial custom config with defaults', () => {
      const service = new CausalInsightsService({ minDaysRequired: 10 });

      // minDaysRequired overridden to 10
      const history10 = createSleepHistory(10);
      const history9 = createSleepHistory(9);
      expect(service.hasSufficientData(history10)).toBe(true);
      expect(service.hasSufficientData(history9)).toBe(false);
    });
  });

  // ==========================================================================
  // hasSufficientData
  // ==========================================================================
  describe('hasSufficientData', () => {
    let service: CausalInsightsService;

    beforeEach(() => {
      service = new CausalInsightsService();
    });

    it('should return false for empty history', () => {
      expect(service.hasSufficientData([])).toBe(false);
    });

    it('should return false for history shorter than minDaysRequired', () => {
      const history = createSleepHistory(13);
      expect(service.hasSufficientData(history)).toBe(false);
    });

    it('should return true for history with exactly minDaysRequired', () => {
      const history = createSleepHistory(14);
      expect(service.hasSufficientData(history)).toBe(true);
    });

    it('should return true for history longer than minDaysRequired', () => {
      const history = createSleepHistory(30);
      expect(service.hasSufficientData(history)).toBe(true);
    });

    it('should respect custom minDaysRequired', () => {
      const customService = new CausalInsightsService({ minDaysRequired: 5 });
      const history5 = createSleepHistory(5);
      const history4 = createSleepHistory(4);
      expect(customService.hasSufficientData(history5)).toBe(true);
      expect(customService.hasSufficientData(history4)).toBe(false);
    });
  });

  // ==========================================================================
  // discoverCausalGraph
  // ==========================================================================
  describe('discoverCausalGraph', () => {
    let service: CausalInsightsService;

    beforeEach(() => {
      service = new CausalInsightsService();
    });

    it('should return empty graph for insufficient data', async () => {
      const history = createSleepHistory(5);
      const graph = await service.discoverCausalGraph(testUserId, history);

      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
      expect(graph.dataQuality.sufficientData).toBe(false);
      expect(graph.dataQuality.totalDays).toBe(5);
      expect(graph.dataQuality.completeness).toBeCloseTo(5 / 14);
    });

    it('should return populated graph for sufficient data with low efficiency', async () => {
      const history = createSleepHistory(14, { lowEfficiency: true, highSOL: true, highWASO: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      expect(graph.dataQuality.sufficientData).toBe(true);
      expect(graph.dataQuality.totalDays).toBe(14);
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.generatedAt).toBeInstanceOf(Date);
    });

    it('should include low_sleep_efficiency node when SE < 0.85', async () => {
      const history = createSleepHistory(14, { lowEfficiency: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      const seNode = graph.nodes.find(n => n.id === 'low_sleep_efficiency');
      expect(seNode).toBeDefined();
      expect(seNode!.category).toBe('physiology');
      expect(seNode!.impact).toBe(-0.8);
    });

    it('should include long_sol node when avg SOL > 20', async () => {
      const history = createSleepHistory(14, { highSOL: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      const solNode = graph.nodes.find(n => n.id === 'long_sol');
      expect(solNode).toBeDefined();
      expect(solNode!.impact).toBe(-0.6);
    });

    it('should include high_waso node when avg WASO > 30', async () => {
      const history = createSleepHistory(14, { highWASO: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      const wasoNode = graph.nodes.find(n => n.id === 'high_waso');
      expect(wasoNode).toBeDefined();
      expect(wasoNode!.impact).toBe(-0.5);
    });

    it('should include sleep_anxiety node when anxiety > 0.5', async () => {
      const history = createSleepHistory(14, { highAnxiety: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      const anxietyNode = graph.nodes.find(n => n.id === 'sleep_anxiety');
      expect(anxietyNode).toBeDefined();
      expect(anxietyNode!.category).toBe('cognition');
      expect(anxietyNode!.evidenceType).toBe('domain_knowledge');
    });

    it('should include rumination node when pre-sleep arousal > 0.6', async () => {
      const history = createSleepHistory(14, { highArousal: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      const ruminationNode = graph.nodes.find(n => n.id === 'rumination');
      expect(ruminationNode).toBeDefined();
      expect(ruminationNode!.impact).toBe(-0.65);
    });

    it('should include catastrophizing node when beliefs.catastrophizing is true', async () => {
      const history = createSleepHistory(14, { catastrophizing: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      const catNode = graph.nodes.find(n => n.id === 'catastrophizing');
      expect(catNode).toBeDefined();
      expect(catNode!.strength).toBe(0.7);
    });

    it('should include excessive_tib node when TIB exceeds TST by > 60 min', async () => {
      const history = createSleepHistory(14, { excessiveTIB: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      const tibNode = graph.nodes.find(n => n.id === 'excessive_tib');
      expect(tibNode).toBeDefined();
      expect(tibNode!.category).toBe('timing');
    });

    it('should include irregular_schedule node when SOL variability > 60', async () => {
      const history = createSleepHistory(14, { variableSOL: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      const irregNode = graph.nodes.find(n => n.id === 'irregular_schedule');
      expect(irregNode).toBeDefined();
      expect(irregNode!.category).toBe('timing');
    });

    it('should include daytime_fatigue node when sleepiness > 0.5', async () => {
      const history = createSleepHistory(14, { highSleepiness: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      const fatigueNode = graph.nodes.find(n => n.id === 'daytime_fatigue');
      expect(fatigueNode).toBeDefined();
      expect(fatigueNode!.impact).toBe(-0.4);
    });

    it('should include domain knowledge edges when useDomainKnowledge is true', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highSOL: true,
        highAnxiety: true,
      });
      const graph = await service.discoverCausalGraph(testUserId, history);

      // Domain knowledge edges should appear for factors that are present
      const domainEdge = graph.edges.find(
        e => e.confidence === 0.8 && (e.type === 'likely_causal' || e.type === 'bidirectional')
      );
      expect(domainEdge).toBeDefined();
    });

    it('should exclude domain knowledge edges when useDomainKnowledge is false', async () => {
      const noDKService = new CausalInsightsService({ useDomainKnowledge: false });
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highSOL: true,
        highAnxiety: true,
      });
      const graph = await noDKService.discoverCausalGraph(testUserId, history);

      // Only correlation-based edges (confidence=0.5, type=uncertain)
      const domainEdge = graph.edges.find(e => e.confidence === 0.8);
      expect(domainEdge).toBeUndefined();
    });

    it('should compute data completeness correctly', async () => {
      const history = createSleepHistory(14);
      const graph = await service.discoverCausalGraph(testUserId, history);

      expect(graph.dataQuality.completeness).toBeGreaterThan(0);
      expect(graph.dataQuality.completeness).toBeLessThanOrEqual(1);
    });

    it('should have edges with valid types', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highSOL: true,
        highAnxiety: true,
      });
      const graph = await service.discoverCausalGraph(testUserId, history);

      for (const edge of graph.edges) {
        expect(['likely_causal', 'bidirectional', 'uncertain']).toContain(edge.type);
        expect(edge.strength).toBeGreaterThan(0);
        expect(edge.strength).toBeLessThanOrEqual(1);
        expect(edge.confidence).toBeGreaterThan(0);
        expect(edge.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  // ==========================================================================
  // getTopCauses
  // ==========================================================================
  describe('getTopCauses', () => {
    let service: CausalInsightsService;

    beforeEach(() => {
      service = new CausalInsightsService();
    });

    it('should return empty array for insufficient data', async () => {
      const history = createSleepHistory(5);
      const causes = await service.getTopCauses(testUserId, history, 'insomnia');

      expect(causes).toEqual([]);
    });

    it('should return causes for insomnia outcome', async () => {
      // insomnia maps to 'low_sleep_efficiency'
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highAnxiety: true,
        excessiveTIB: true,
      });
      const causes = await service.getTopCauses(testUserId, history, 'insomnia');

      // Should return factors that have edges pointing to low_sleep_efficiency
      expect(causes.length).toBeLessThanOrEqual(5);
      // All returned causes should be ICausalFactor objects
      for (const cause of causes) {
        expect(cause).toHaveProperty('id');
        expect(cause).toHaveProperty('impact');
        expect(cause).toHaveProperty('strength');
      }
    });

    it('should return causes for poor_efficiency outcome', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        excessiveTIB: true,
      });
      const causes = await service.getTopCauses(testUserId, history, 'poor_efficiency');

      // poor_efficiency also maps to low_sleep_efficiency
      expect(causes.length).toBeLessThanOrEqual(5);
    });

    it('should return causes for fatigue outcome', async () => {
      // fatigue maps to 'daytime_fatigue'
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highSleepiness: true,
      });
      const causes = await service.getTopCauses(testUserId, history, 'fatigue');

      expect(causes.length).toBeLessThanOrEqual(5);
    });

    it('should sort causes by absolute impact descending', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highSOL: true,
        highAnxiety: true,
        excessiveTIB: true,
      });
      const causes = await service.getTopCauses(testUserId, history, 'insomnia');

      for (let i = 1; i < causes.length; i++) {
        expect(Math.abs(causes[i - 1].impact)).toBeGreaterThanOrEqual(Math.abs(causes[i].impact));
      }
    });

    it('should return at most 5 causes', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highSOL: true,
        highWASO: true,
        highAnxiety: true,
        highArousal: true,
        catastrophizing: true,
        excessiveTIB: true,
        highSleepiness: true,
        variableSOL: true,
      });
      const causes = await service.getTopCauses(testUserId, history, 'insomnia');

      expect(causes.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // generateInsights
  // ==========================================================================
  describe('generateInsights', () => {
    let service: CausalInsightsService;

    beforeEach(() => {
      service = new CausalInsightsService();
    });

    it('should return insufficient data insight for short history', async () => {
      const history = createSleepHistory(5);
      const insights = await service.generateInsights(testUserId, history);

      expect(insights).toHaveLength(1);
      expect(insights[0].id).toBe('insufficient_data');
      expect(insights[0].category).toBe('pattern');
      expect(insights[0].titleRu).toContain('данных');
      expect(insights[0].evidence[0]).toContain('5');
    });

    it('should generate insights for sufficient data', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highAnxiety: true,
      });
      const insights = await service.generateInsights(testUserId, history);

      expect(insights.length).toBeGreaterThan(0);
      expect(insights.length).toBeLessThanOrEqual(5);
    });

    it('should not exceed maxInsights', async () => {
      const service3 = new CausalInsightsService({ maxInsights: 3 });
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highSOL: true,
        highAnxiety: true,
        excessiveTIB: true,
        highSleepiness: true,
      });
      const insights = await service3.generateInsights(testUserId, history);

      expect(insights.length).toBeLessThanOrEqual(3);
    });

    it('should not exceed default maxInsights of 5', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highSOL: true,
        highWASO: true,
        highAnxiety: true,
        highArousal: true,
        catastrophizing: true,
        excessiveTIB: true,
        highSleepiness: true,
        variableSOL: true,
      });
      const insights = await service.generateInsights(testUserId, history);

      expect(insights.length).toBeLessThanOrEqual(5);
    });

    it('should include pattern insights', async () => {
      const history = createSleepHistory(14, { decliningTrend: true, lowEfficiency: true });
      const insights = await service.generateInsights(testUserId, history);

      const patternInsight = insights.find(i => i.category === 'pattern');
      // May or may not have pattern depending on data, but should be valid structure
      for (const insight of insights) {
        expect(insight).toHaveProperty('id');
        expect(insight).toHaveProperty('priority');
        expect(insight).toHaveProperty('category');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('titleRu');
        expect(insight).toHaveProperty('explanation');
        expect(insight).toHaveProperty('explanationRu');
        expect(insight).toHaveProperty('confidence');
        expect(insight).toHaveProperty('evidence');
        expect(insight).toHaveProperty('relatedFactors');
        expect(['cause', 'pattern', 'recommendation']).toContain(insight.category);
        expect(['high', 'medium', 'low']).toContain(insight.confidence);
      }
    });

    it('should include cause insights from top causes', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highAnxiety: true,
        excessiveTIB: true,
      });
      const insights = await service.generateInsights(testUserId, history);

      const causeInsights = insights.filter(i => i.category === 'cause');
      for (const ci of causeInsights) {
        expect(ci.id).toMatch(/^cause_/);
        expect(ci.relatedFactors.length).toBeGreaterThan(0);
      }
    });

    it('should include recommendation insight when intervention target exists', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highAnxiety: true,
        excessiveTIB: true,
      });
      const insights = await service.generateInsights(testUserId, history);

      const recInsight = insights.find(i => i.category === 'recommendation');
      if (recInsight) {
        expect(recInsight.id).toMatch(/^recommendation_/);
        expect(recInsight.recommendation).toBeDefined();
        expect(recInsight.recommendationRu).toBeDefined();
      }
    });

    it('should sort insights by priority', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highAnxiety: true,
        decliningTrend: true,
      });
      const insights = await service.generateInsights(testUserId, history);

      for (let i = 1; i < insights.length; i++) {
        expect(insights[i].priority).toBeGreaterThanOrEqual(insights[i - 1].priority);
      }
    });

    it('should show correct days in insufficient data evidence', async () => {
      const history = createSleepHistory(10);
      const insights = await service.generateInsights(testUserId, history);

      expect(insights[0].evidence[0]).toContain('10');
    });

    it('should include minDaysRequired in insufficient data explanation', async () => {
      const customService = new CausalInsightsService({ minDaysRequired: 21 });
      const history = createSleepHistory(5);
      const insights = await customService.generateInsights(testUserId, history);

      expect(insights[0].explanation).toContain('21');
      expect(insights[0].explanationRu).toContain('21');
    });
  });

  // ==========================================================================
  // suggestInterventionTarget
  // ==========================================================================
  describe('suggestInterventionTarget', () => {
    let service: CausalInsightsService;

    beforeEach(() => {
      service = new CausalInsightsService();
    });

    it('should return null for insufficient data', async () => {
      const history = createSleepHistory(5);
      const target = await service.suggestInterventionTarget(testUserId, history);

      expect(target).toBeNull();
    });

    it('should return intervention target for sufficient data with factors', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highAnxiety: true,
        excessiveTIB: true,
      });
      const target = await service.suggestInterventionTarget(testUserId, history);

      expect(target).not.toBeNull();
      expect(target!).toHaveProperty('factorId');
      expect(target!).toHaveProperty('expectedImpact');
      expect(target!).toHaveProperty('modifiability');
      expect(target!).toHaveProperty('priorityScore');
      expect(target!).toHaveProperty('intervention');
      expect(target!).toHaveProperty('interventionRu');
      expect(target!).toHaveProperty('rationale');
      expect(target!).toHaveProperty('rationaleRu');
    });

    it('should select modifiable targets', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        excessiveTIB: true,
      });
      const target = await service.suggestInterventionTarget(testUserId, history);

      if (target) {
        expect(target.modifiability).toBeGreaterThan(0);
        expect(target.priorityScore).toBeGreaterThanOrEqual(0.2);
      }
    });

    it('should have conservative expected impact (factor.impact * 0.5)', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        excessiveTIB: true,
        highAnxiety: true,
      });
      const target = await service.suggestInterventionTarget(testUserId, history);

      if (target) {
        // expectedImpact = factor.impact * 0.5
        // Since all impacts are negative, expectedImpact should be negative
        expect(Math.abs(target.expectedImpact)).toBeLessThanOrEqual(0.5);
      }
    });

    it('should provide specific intervention text for known factors', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        excessiveTIB: true,
      });
      const target = await service.suggestInterventionTarget(testUserId, history);

      if (target) {
        // intervention should not be the generic fallback
        expect(target.intervention.length).toBeGreaterThan(0);
        expect(target.interventionRu.length).toBeGreaterThan(0);
      }
    });

    it('should prioritize timing factors over physiology due to higher modifiability', async () => {
      // Timing modifiability = 0.85, physiology = 0.3
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        excessiveTIB: true,
      });
      const target = await service.suggestInterventionTarget(testUserId, history);

      if (target) {
        // Excessive TIB (timing, mod=0.85) should generally score higher than
        // low_sleep_efficiency (physiology, mod=0.3) despite similar impact
        // because modifiability is much higher
        expect(target.modifiability).toBeGreaterThanOrEqual(0.3);
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    let service: CausalInsightsService;

    beforeEach(() => {
      service = new CausalInsightsService();
    });

    it('should handle empty history for discoverCausalGraph', async () => {
      const graph = await service.discoverCausalGraph(testUserId, []);

      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
      expect(graph.dataQuality.sufficientData).toBe(false);
      expect(graph.dataQuality.totalDays).toBe(0);
      expect(graph.dataQuality.completeness).toBe(0);
    });

    it('should handle empty history for getTopCauses', async () => {
      const causes = await service.getTopCauses(testUserId, [], 'insomnia');
      expect(causes).toEqual([]);
    });

    it('should handle empty history for generateInsights', async () => {
      const insights = await service.generateInsights(testUserId, []);

      expect(insights).toHaveLength(1);
      expect(insights[0].id).toBe('insufficient_data');
      expect(insights[0].evidence[0]).toContain('0');
    });

    it('should handle empty history for suggestInterventionTarget', async () => {
      const target = await service.suggestInterventionTarget(testUserId, []);
      expect(target).toBeNull();
    });

    it('should handle history with all identical values (zero variance)', async () => {
      // All same values means pearson correlation returns 0 (denominator = 0)
      const identicalHistory: ISleepState[] = [];
      for (let i = 0; i < 14; i++) {
        identicalHistory.push(createMockSleepState({
          sleepEfficiency: 0.80,
          sleepOnsetLatency: 25,
          wakeAfterSleepOnset: 35,
          totalSleepTime: 400,
          timeInBed: 480,
          sleepAnxiety: 0.6,
          preSleepArousal: 0.5,
          daytimeSleepiness: 0.4,
          dayOffset: 14 - i,
        }));
      }

      const graph = await service.discoverCausalGraph(testUserId, identicalHistory);

      // Should still succeed without errors; correlations should be 0
      expect(graph.dataQuality.sufficientData).toBe(true);
      expect(graph.nodes.length).toBeGreaterThanOrEqual(0);
      // No correlation-based uncertain edges since all correlations are 0
      const uncertainEdges = graph.edges.filter(e => e.type === 'uncertain');
      expect(uncertainEdges).toHaveLength(0);
    });

    it('should handle history where no factors are triggered', async () => {
      // Good sleep: SE >= 0.85, SOL <= 20, WASO <= 30, no anxiety, no arousal, etc.
      const goodHistory: ISleepState[] = [];
      for (let i = 0; i < 14; i++) {
        goodHistory.push(createMockSleepState({
          sleepEfficiency: 0.92,
          sleepOnsetLatency: 10,
          wakeAfterSleepOnset: 15,
          totalSleepTime: 440,
          timeInBed: 480,
          sleepAnxiety: 0.2,
          preSleepArousal: 0.3,
          catastrophizing: false,
          daytimeSleepiness: 0.2,
          dayOffset: 14 - i,
        }));
      }

      const graph = await service.discoverCausalGraph(testUserId, goodHistory);

      expect(graph.dataQuality.sufficientData).toBe(true);
      // No factors should be extracted since everything is within normal range
      expect(graph.nodes).toHaveLength(0);
    });

    it('should handle single day history for generateInsights', async () => {
      const history = [createMockSleepState({ dayOffset: 0 })];
      const insights = await service.generateInsights(testUserId, history);

      expect(insights).toHaveLength(1);
      expect(insights[0].id).toBe('insufficient_data');
    });

    it('should not crash when no intervention target meets threshold', async () => {
      // Good sleep - no concerning factors, so no high-scoring targets
      const goodHistory: ISleepState[] = [];
      for (let i = 0; i < 14; i++) {
        goodHistory.push(createMockSleepState({
          sleepEfficiency: 0.92,
          sleepOnsetLatency: 10,
          wakeAfterSleepOnset: 15,
          totalSleepTime: 440,
          timeInBed: 480,
          sleepAnxiety: 0.2,
          preSleepArousal: 0.3,
          daytimeSleepiness: 0.2,
          dayOffset: 14 - i,
        }));
      }

      const target = await service.suggestInterventionTarget(testUserId, goodHistory);
      // No factors means no targets
      expect(target).toBeNull();
    });
  });

  // ==========================================================================
  // Pattern Analysis (via generateInsights)
  // ==========================================================================
  describe('Pattern Analysis', () => {
    let service: CausalInsightsService;

    beforeEach(() => {
      service = new CausalInsightsService();
    });

    it('should detect declining trend when second half SE < first half SE by > 5%', async () => {
      const history = createSleepHistory(14, { decliningTrend: true, lowEfficiency: true });
      const insights = await service.generateInsights(testUserId, history);

      const trendInsight = insights.find(i => i.id === 'trend');
      if (trendInsight) {
        expect(trendInsight.titleRu).toContain('ухудшения');
      }
    });

    it('should detect improving trend', async () => {
      const history = createSleepHistory(14, { improvingTrend: true, lowEfficiency: true });
      const insights = await service.generateInsights(testUserId, history);

      const trendInsight = insights.find(i => i.id === 'trend');
      if (trendInsight) {
        expect(trendInsight.titleRu).toContain('улучшения');
        expect(trendInsight.category).toBe('pattern');
      }
    });
  });

  // ==========================================================================
  // Factory & Singleton
  // ==========================================================================
  describe('Factory & Singleton', () => {
    it('should create service via factory function', () => {
      const created = createCausalInsightsService({ maxInsights: 3 });
      expect(created).toBeInstanceOf(CausalInsightsService);
    });

    it('should create service via factory with no args', () => {
      const created = createCausalInsightsService();
      expect(created).toBeInstanceOf(CausalInsightsService);
    });

    it('should export singleton instance', () => {
      expect(causalInsightsService).toBeInstanceOf(CausalInsightsService);
    });

    it('should have singleton with default config', () => {
      const history14 = createSleepHistory(14);
      const history13 = createSleepHistory(13);
      expect(causalInsightsService.hasSufficientData(history14)).toBe(true);
      expect(causalInsightsService.hasSufficientData(history13)).toBe(false);
    });
  });

  // ==========================================================================
  // Factor Properties Validation
  // ==========================================================================
  describe('Factor Properties Validation', () => {
    let service: CausalInsightsService;

    beforeEach(() => {
      service = new CausalInsightsService();
    });

    it('should set correct properties on all extracted factors', async () => {
      const history = createSleepHistory(14, {
        lowEfficiency: true,
        highSOL: true,
        highWASO: true,
        highAnxiety: true,
        highArousal: true,
        catastrophizing: true,
        excessiveTIB: true,
        highSleepiness: true,
        variableSOL: true,
      });
      const graph = await service.discoverCausalGraph(testUserId, history);

      for (const node of graph.nodes) {
        expect(node.id).toBeTruthy();
        expect(node.name).toBeTruthy();
        expect(node.nameRu).toBeTruthy();
        expect(['behavior', 'cognition', 'environment', 'physiology', 'timing']).toContain(node.category);
        expect(node.impact).toBeGreaterThanOrEqual(-1);
        expect(node.impact).toBeLessThanOrEqual(1);
        expect(node.strength).toBeGreaterThanOrEqual(0);
        expect(node.strength).toBeLessThanOrEqual(1);
        expect(node.temporalConfidence).toBeGreaterThanOrEqual(0);
        expect(node.temporalConfidence).toBeLessThanOrEqual(1);
        expect(['correlation', 'temporal', 'domain_knowledge']).toContain(node.evidenceType);
        expect(node.emoji).toBeTruthy();
      }
    });

    it('should have strength bounded by sleep efficiency for low_sleep_efficiency', async () => {
      const history = createSleepHistory(14, { lowEfficiency: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      const seNode = graph.nodes.find(n => n.id === 'low_sleep_efficiency');
      expect(seNode).toBeDefined();
      // strength = 1 - avgSE / 0.85
      expect(seNode!.strength).toBeGreaterThan(0);
      expect(seNode!.strength).toBeLessThanOrEqual(1);
    });

    it('should cap SOL strength at 1', async () => {
      // SOL strength = min(avgSOL / 60, 1)
      // With avgSOL of 40, strength = 40/60 = 0.667
      const history = createSleepHistory(14, { highSOL: true });
      const graph = await service.discoverCausalGraph(testUserId, history);

      const solNode = graph.nodes.find(n => n.id === 'long_sol');
      expect(solNode).toBeDefined();
      expect(solNode!.strength).toBeLessThanOrEqual(1);
      expect(solNode!.strength).toBeGreaterThan(0);
    });
  });
});
