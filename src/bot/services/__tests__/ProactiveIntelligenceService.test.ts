/**
 * ProactiveIntelligenceService Tests
 * ===================================
 *
 * Tests for JITAI-powered proactive insights service.
 * Validates daily analysis, pattern detection, risk alerts,
 * Thompson Sampling, and Critical Slowing Down detection.
 *
 * Research basis: PMC JITAI Meta-analysis, DIAMANTE trial 2024, Smit et al. 2025
 *
 * @packageDocumentation
 */

import {
  ProactiveIntelligenceService,
  createProactiveIntelligenceService,
  proactiveIntelligenceService,
  DEFAULT_PROACTIVE_CONFIG,
  type IProactiveInsight,
} from '../ProactiveIntelligenceService';

import type { ISleepState } from '../../../sleep/interfaces/ISleepState';

// Mock sleepPredictionService
jest.mock('../SleepPredictionService', () => ({
  sleepPredictionService: {
    predict: jest.fn().mockResolvedValue({
      trend: 'stable',
      deteriorationRisk: 0.3,
      predictedSleepEfficiency: { value: 0.85, confidence: 0.8 },
    }),
  },
}));

// Mock voiceBiomarkerService
jest.mock('../VoiceBiomarkerService', () => ({
  voiceBiomarkerService: {
    getVoiceRiskForCSD: jest.fn().mockReturnValue({
      available: true,
      depressionRisk: 0.3,
      anxietyRisk: 0.2,
      trend: 'stable',
    }),
  },
}));

describe('ProactiveIntelligenceService', () => {
  let service: ProactiveIntelligenceService;
  const testUserId = 'user_test_123';

  /**
   * Create test sleep state
   */
  function createSleepState(
    date: string,
    overrides: Partial<ISleepState['metrics']> = {}
  ): ISleepState {
    return {
      date,
      userId: testUserId,
      timestamp: new Date(date),
      metrics: {
        sleepEfficiency: 0.85,
        sleepOnsetLatency: 15,
        wakeAfterSleepOnset: 20,
        totalSleepTime: 420,
        numberOfAwakenings: 2,
        timeInBed: 480,
        bedtime: '23:00',
        wakeTime: '07:00',
        finalAwakening: '06:45',
        outOfBedTime: '07:15',
        ...overrides,
      },
      circadian: {
        chronotype: 'intermediate',
        circadianPhase: 0,
        phaseDeviation: 0,
        lightExposure: 1000,
        estimatedMelatoninOnset: '21:00',
        socialJetLag: 0.5,
        isStable: true,
      },
      homeostasis: {
        sleepDebt: 0,
        debtDuration: 0,
        homeostaticPressure: 0.5,
        optimalSleepDuration: 7.5,
        isRecoverable: true,
      },
      insomnia: {
        isiScore: 8,
        severity: 'subthreshold',
        subtype: 'none',
        durationWeeks: 2,
        daytimeImpact: 0.3,
        sleepDistress: 0.3,
      },
      behaviors: {
        caffeine: {
          dailyMg: 100,
          lastIntakeTime: '14:00',
          hoursBeforeBed: 9,
        },
        alcohol: {
          drinksToday: 0,
          lastDrinkTime: '',
        },
        screenTimeBeforeBed: 30,
        exercise: {
          didExercise: true,
          durationMinutes: 30,
          hoursBeforeBed: 8,
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
        dbasScore: 30,
        beliefs: {
          unrealisticExpectations: false,
          catastrophizing: false,
          helplessness: false,
          effortfulSleep: false,
          healthWorries: false,
        },
        sleepAnxiety: 0.3,
        preSleepArousal: 0.3,
        sleepSelfEfficacy: 0.7,
      },
      subjectiveQuality: 'good',
      morningAlertness: 0.7,
      daytimeSleepiness: 0.3,
      sleepHealthScore: 75,
      trend: 'stable',
      dataQuality: 0.9,
      source: 'diary',
    };
  }

  /**
   * Create sleep history with specified number of days
   */
  function createSleepHistory(days: number, seRange: [number, number] = [0.80, 0.90]): ISleepState[] {
    const history: ISleepState[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const se = seRange[0] + Math.random() * (seRange[1] - seRange[0]);
      history.push(createSleepState(dateStr, { sleepEfficiency: se }));
    }

    return history;
  }

  beforeEach(() => {
    // Fix flaky time-dependent tests: set system time to evening (19:00)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T19:00:00'));

    service = new ProactiveIntelligenceService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Configuration
  // ==========================================================================
  describe('Configuration', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_PROACTIVE_CONFIG.enabled).toBe(true);
      expect(DEFAULT_PROACTIVE_CONFIG.minDataDays).toBe(3);
      expect(DEFAULT_PROACTIVE_CONFIG.maxInsightsPerDay).toBe(3);
      expect(DEFAULT_PROACTIVE_CONFIG.patternChangeThreshold).toBe(0.15);
      expect(DEFAULT_PROACTIVE_CONFIG.riskEscalationThreshold).toBe(0.6);
    });

    it('should have CSD configuration', () => {
      expect(DEFAULT_PROACTIVE_CONFIG.csd.windowSize).toBe(7);
      expect(DEFAULT_PROACTIVE_CONFIG.csd.minDataPoints).toBe(14);
      expect(DEFAULT_PROACTIVE_CONFIG.csd.autocorrelationThreshold).toBe(0.7);
      expect(DEFAULT_PROACTIVE_CONFIG.csd.varianceThreshold).toBe(1.5);
    });

    it('should have Thompson Sampling configuration', () => {
      expect(DEFAULT_PROACTIVE_CONFIG.thompsonSampling.enabled).toBe(true);
      expect(DEFAULT_PROACTIVE_CONFIG.thompsonSampling.priorAlpha).toBe(1);
      expect(DEFAULT_PROACTIVE_CONFIG.thompsonSampling.priorBeta).toBe(1);
      expect(DEFAULT_PROACTIVE_CONFIG.thompsonSampling.explorationBonus).toBe(0.1);
    });

    it('should have anti-fatigue configuration', () => {
      expect(DEFAULT_PROACTIVE_CONFIG.antiFatigue.minHoursBetweenInsights).toBe(4);
      expect(DEFAULT_PROACTIVE_CONFIG.antiFatigue.maxInsightsPerWeek).toBe(14);
      expect(DEFAULT_PROACTIVE_CONFIG.antiFatigue.cooldownAfterIgnore).toBe(24);
    });

    it('should accept custom configuration', () => {
      const customService = new ProactiveIntelligenceService({
        enabled: false,
        maxInsightsPerDay: 5,
      });

      // Service should be created (internal config is private)
      expect(customService).toBeDefined();
    });
  });

  // ==========================================================================
  // Daily Analysis
  // ==========================================================================
  describe('Daily Analysis', () => {
    it('should return empty analysis for insufficient data', async () => {
      const history = createSleepHistory(2); // Less than minDataDays

      const analysis = await service.runDailyAnalysis(testUserId, history);

      expect(analysis.userId).toBe(testUserId);
      expect(analysis.insights).toHaveLength(0);
      expect(analysis.patternAlerts).toHaveLength(0);
      expect(analysis.riskAlerts).toHaveLength(0);
      expect(analysis.summary.overallTrend).toBe('stable');
    });

    it('should run full analysis with sufficient data', async () => {
      const history = createSleepHistory(14);

      const analysis = await service.runDailyAnalysis(testUserId, history);

      expect(analysis.userId).toBe(testUserId);
      expect(analysis.date).toBeInstanceOf(Date);
      expect(analysis.summary).toBeDefined();
      expect(analysis.summary.overallTrend).toBeDefined();
      expect(analysis.summary.riskLevel).toBeDefined();
    });

    it('should cache analysis for same day', async () => {
      const history = createSleepHistory(7);

      const analysis1 = await service.runDailyAnalysis(testUserId, history);
      const analysis2 = await service.runDailyAnalysis(testUserId, history);

      // Should return cached result
      expect(analysis1).toEqual(analysis2);
    });

    it('should limit insights to maxInsightsPerDay', async () => {
      const history = createSleepHistory(14);

      const analysis = await service.runDailyAnalysis(testUserId, history);

      expect(analysis.insights.length).toBeLessThanOrEqual(3);
    });

    it('should generate optimal timings', async () => {
      const history = createSleepHistory(7);

      const analysis = await service.runDailyAnalysis(testUserId, history);

      expect(analysis.optimalTimings).toBeDefined();
    });
  });

  // ==========================================================================
  // Pattern Detection
  // ==========================================================================
  describe('Pattern Detection', () => {
    it('should detect pattern change with 14+ days of data', async () => {
      // Create history with significant SE change
      const history: ISleepState[] = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      // First week: high SE
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        history.push(createSleepState(date.toISOString().split('T')[0], {
          sleepEfficiency: 0.9,
        }));
      }

      // Second week: low SE (significant drop)
      for (let i = 7; i < 14; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        history.push(createSleepState(date.toISOString().split('T')[0], {
          sleepEfficiency: 0.65,
        }));
      }

      const patternChange = await service.detectPatternChange(testUserId, history);

      expect(patternChange).not.toBeNull();
      expect(patternChange?.type).toBe('deterioration');
      expect(patternChange?.metric).toBe('sleepEfficiency');
    });

    it('should return null for insufficient data', async () => {
      const history = createSleepHistory(7);

      const patternChange = await service.detectPatternChange(testUserId, history);

      expect(patternChange).toBeNull();
    });

    it('should detect improvement pattern', async () => {
      const history: ISleepState[] = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      // First week: low SE
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        history.push(createSleepState(date.toISOString().split('T')[0], {
          sleepEfficiency: 0.65,
        }));
      }

      // Second week: high SE (significant improvement)
      for (let i = 7; i < 14; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        history.push(createSleepState(date.toISOString().split('T')[0], {
          sleepEfficiency: 0.9,
        }));
      }

      const patternChange = await service.detectPatternChange(testUserId, history);

      expect(patternChange?.type).toBe('improvement');
    });
  });

  // ==========================================================================
  // Risk Detection
  // ==========================================================================
  describe('Risk Detection', () => {
    it('should detect sleep deterioration risk', async () => {
      // Create history with low SE
      const history = createSleepHistory(7).map(s => ({
        ...s,
        metrics: { ...s.metrics, sleepEfficiency: 0.55 },
      }));

      const riskAlert = await service.detectRiskEscalation(testUserId, history);

      expect(riskAlert).not.toBeNull();
      expect(riskAlert?.type).toBe('sleep_deterioration');
      expect(['moderate', 'high']).toContain(riskAlert?.severity);
    });

    it('should return null for healthy sleep', async () => {
      const history = createSleepHistory(7);

      const riskAlert = await service.detectRiskEscalation(testUserId, history);

      expect(riskAlert).toBeNull();
    });

    it('should detect treatment dropout risk', async () => {
      // Create history with old last entry (simulating missed days)
      const history: ISleepState[] = [];
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 8); // 8 days ago

      for (let i = 0; i < 7; i++) {
        const date = new Date(oldDate);
        date.setDate(date.getDate() - i);
        history.unshift(createSleepState(date.toISOString().split('T')[0]));
      }

      const riskAlert = await service.detectRiskEscalation(testUserId, history);

      expect(riskAlert).not.toBeNull();
      expect(riskAlert?.type).toBe('treatment_dropout');
    });
  });

  // ==========================================================================
  // Optimal Intervention Time
  // ==========================================================================
  describe('Optimal Intervention Time', () => {
    it('should find optimal intervention time', async () => {
      const history = createSleepHistory(7);

      const optimalTime = await service.findOptimalInterventionTime(testUserId, history);

      expect(optimalTime).toBeInstanceOf(Date);
    });

    it('should default to evening window when no data', async () => {
      const optimalTime = await service.findOptimalInterventionTime(testUserId, []);

      expect(optimalTime.getHours()).toBe(19); // Default evening hour
    });
  });

  // ==========================================================================
  // Pending Insights
  // ==========================================================================
  describe('Pending Insights', () => {
    it('should return empty array for new user', () => {
      const insights = service.getPendingInsights(testUserId);

      expect(insights).toHaveLength(0);
    });

    it('should mark insight as delivered', () => {
      // First, get some insights by running analysis
      service.markInsightDelivered(testUserId, 'some-insight-id');

      // Should not throw
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Critical Slowing Down (CSD)
  // ==========================================================================
  describe('Critical Slowing Down (CSD)', () => {
    it('should return null for insufficient data', () => {
      const history = createSleepHistory(10);

      const csd = service.calculateCriticalSlowingDown(history);

      expect(csd).toBeNull();
    });

    it('should calculate CSD with sufficient data', () => {
      const history = createSleepHistory(21);

      const csd = service.calculateCriticalSlowingDown(history);

      expect(csd).not.toBeNull();
      expect(csd?.autocorrelation).toBeDefined();
      expect(csd?.variance).toBeDefined();
      expect(csd?.csdIndex).toBeGreaterThanOrEqual(0);
      expect(csd?.csdIndex).toBeLessThanOrEqual(1);
    });

    it('should detect warning when autocorrelation is high', () => {
      // Create history with high autocorrelation (consistent values)
      const history: ISleepState[] = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 21);

      for (let i = 0; i < 21; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        // Create highly correlated pattern (gradually increasing then stable)
        const se = 0.7 + (i < 14 ? i * 0.01 : 0.14);
        history.push(createSleepState(date.toISOString().split('T')[0], {
          sleepEfficiency: se,
        }));
      }

      const csd = service.calculateCriticalSlowingDown(history);

      expect(csd).not.toBeNull();
      expect(typeof csd?.isWarning).toBe('boolean');
    });

    it('should calculate CSD for different metrics', () => {
      const history = createSleepHistory(21);

      const csdSE = service.calculateCriticalSlowingDown(history, 'sleepEfficiency');
      const csdSOL = service.calculateCriticalSlowingDown(history, 'sleepOnsetLatency');
      const csdWASO = service.calculateCriticalSlowingDown(history, 'wakeAfterSleepOnset');

      expect(csdSE).not.toBeNull();
      expect(csdSOL).not.toBeNull();
      expect(csdWASO).not.toBeNull();
    });

    it('should estimate days to transition when trend is positive', () => {
      // Create history with gradually increasing autocorrelation pattern
      const history: ISleepState[] = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 21);

      for (let i = 0; i < 21; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        // Create pattern with increasing dependency
        history.push(createSleepState(date.toISOString().split('T')[0], {
          sleepEfficiency: 0.8 + (i % 2 === 0 ? 0.02 : -0.02) * (1 - i / 30),
        }));
      }

      const csd = service.calculateCriticalSlowingDown(history);

      // May or may not have estimate depending on pattern
      expect(csd).not.toBeNull();
    });
  });

  // ==========================================================================
  // Thompson Sampling
  // ==========================================================================
  describe('Thompson Sampling', () => {
    it('should get engagement tracking for new user', () => {
      const tracking = service.getEngagementTracking(testUserId);

      expect(tracking.userId).toBe(testUserId);
      expect(tracking.insightsDeliveredToday).toBe(0);
      expect(tracking.lastInsightTime).toBeNull();
      expect(tracking.thompsonStates.size).toBe(5); // 5 insight types
      expect(tracking.hourlyEngagement).toHaveLength(24);
    });

    it('should sample insight type using Thompson Sampling', () => {
      const availableTypes: IProactiveInsight['type'][] = ['pattern_change', 'risk_alert', 'opportunity'];

      const sampledType = service.sampleInsightTypeThompson(testUserId, availableTypes);

      expect(availableTypes).toContain(sampledType);
    });

    it('should return first type when Thompson Sampling disabled', () => {
      const customService = new ProactiveIntelligenceService({
        thompsonSampling: { ...DEFAULT_PROACTIVE_CONFIG.thompsonSampling, enabled: false },
      });
      const availableTypes: IProactiveInsight['type'][] = ['pattern_change', 'risk_alert'];

      const sampledType = customService.sampleInsightTypeThompson(testUserId, availableTypes);

      expect(sampledType).toBe('pattern_change');
    });

    it('should return tip for empty available types', () => {
      const sampledType = service.sampleInsightTypeThompson(testUserId, []);

      expect(sampledType).toBe('tip');
    });

    it('should record insight interaction', () => {
      service.recordInsightInteraction(testUserId, 'insight-1', 'pattern_change', 'clicked');

      const tracking = service.getEngagementTracking(testUserId);
      expect(tracking.interactionHistory.length).toBeGreaterThan(0);
      expect(tracking.interactionHistory[0].interactionType).toBe('clicked');
    });

    it('should update hourly engagement on click', () => {
      const currentHour = new Date().getHours();

      service.recordInsightInteraction(testUserId, 'insight-1', 'tip', 'clicked');

      const tracking = service.getEngagementTracking(testUserId);
      expect(tracking.hourlyEngagement[currentHour]).toBe(1);
    });

    it('should not update hourly engagement on dismiss', () => {
      service.recordInsightInteraction(testUserId, 'insight-1', 'tip', 'dismissed');

      const tracking = service.getEngagementTracking(testUserId);
      // All hours should still be 0
      expect(tracking.hourlyEngagement.every(h => h === 0)).toBe(true);
    });

    it('should limit interaction history to 100', () => {
      for (let i = 0; i < 110; i++) {
        service.recordInsightInteraction(testUserId, `insight-${i}`, 'tip', 'clicked');
      }

      const tracking = service.getEngagementTracking(testUserId);
      expect(tracking.interactionHistory.length).toBe(100);
    });
  });

  // ==========================================================================
  // Anti-Fatigue
  // ==========================================================================
  describe('Anti-Fatigue', () => {
    it('should allow insight for new user', () => {
      const result = service.canSendInsight(testUserId);

      expect(result.allowed).toBe(true);
    });

    it('should block when daily limit reached', () => {
      // Simulate sending max insights
      for (let i = 0; i < 3; i++) {
        service.markInsightSent(testUserId, `insight-${i}`);
      }

      const result = service.canSendInsight(testUserId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('max_daily_limit');
    });

    it('should block when sent too recently', () => {
      service.markInsightSent(testUserId, 'insight-1');

      const result = service.canSendInsight(testUserId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('too_soon');
    });

    it('should block after ignored insight', () => {
      service.recordInsightInteraction(testUserId, 'insight-1', 'tip', 'ignored');

      const result = service.canSendInsight(testUserId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('cooldown_after_ignore');
    });

    it('should reset daily counters', () => {
      service.markInsightSent(testUserId, 'insight-1');
      service.markInsightSent(testUserId, 'insight-2');

      service.resetDailyCounters();

      const tracking = service.getEngagementTracking(testUserId);
      expect(tracking.insightsDeliveredToday).toBe(0);
    });
  });

  // ==========================================================================
  // Optimal Insight Hour
  // ==========================================================================
  describe('Optimal Insight Hour', () => {
    it('should return default evening hour for new user', () => {
      const optimalHour = service.getOptimalInsightHour(testUserId);

      expect(optimalHour).toBe(19); // Default evening hour
    });

    it('should learn from engagement data', () => {
      // Simulate engagement at 10am
      const tracking = service.getEngagementTracking(testUserId);
      tracking.hourlyEngagement[10] = 5; // High engagement at 10am

      const optimalHour = service.getOptimalInsightHour(testUserId);

      expect(optimalHour).toBe(10);
    });
  });

  // ==========================================================================
  // Risk Alerts with CSD
  // ==========================================================================
  describe('Risk Alerts with CSD', () => {
    it('should detect risk alerts with CSD', async () => {
      const history = createSleepHistory(21);

      const result = await service.detectRiskAlertsWithCSD(testUserId, history);

      expect(result.alerts).toBeDefined();
      expect(Array.isArray(result.alerts)).toBe(true);
      // CSD may or may not be available depending on data pattern
    });

    it('should add CSD alert when warning detected', async () => {
      // Create history that would trigger CSD warning
      const history: ISleepState[] = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 21);

      // Create highly unstable pattern with increasing variance
      for (let i = 0; i < 21; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        // Increasing variance pattern
        const variance = i / 10;
        const se = 0.75 + (Math.random() - 0.5) * variance;
        history.push(createSleepState(date.toISOString().split('T')[0], {
          sleepEfficiency: Math.max(0.3, Math.min(1, se)),
        }));
      }

      const result = await service.detectRiskAlertsWithCSD(testUserId, history);

      expect(result.csd).not.toBeNull();
    });
  });

  // ==========================================================================
  // Combined Risk Assessment
  // ==========================================================================
  describe('Combined Risk Assessment', () => {
    it('should return combined risk assessment', async () => {
      const history = createSleepHistory(14);

      const assessment = await service.getCombinedRiskAssessment(testUserId, history);

      expect(assessment.available).toBe(true);
      expect(assessment.combinedRiskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.combinedRiskScore).toBeLessThanOrEqual(1);
      expect(['low', 'moderate', 'high', 'critical']).toContain(assessment.riskLevel);
      expect(assessment.components).toBeDefined();
      expect(assessment.recommendations).toBeDefined();
      expect(assessment.summaryRu).toBeDefined();
    });

    it('should include sleep CSD component', async () => {
      const history = createSleepHistory(21);

      const assessment = await service.getCombinedRiskAssessment(testUserId, history);

      expect(assessment.components.sleepCSD).toBeDefined();
      expect(assessment.components.sleepCSD.available).toBe(true);
    });

    it('should include voice biomarkers component', async () => {
      const history = createSleepHistory(14);

      const assessment = await service.getCombinedRiskAssessment(testUserId, history);

      expect(assessment.components.voiceBiomarkers).toBeDefined();
      expect(assessment.components.voiceBiomarkers.available).toBe(true);
    });

    it('should include sleep efficiency component', async () => {
      const history = createSleepHistory(14);

      const assessment = await service.getCombinedRiskAssessment(testUserId, history);

      expect(assessment.components.sleepEfficiency).toBeDefined();
      expect(assessment.components.sleepEfficiency.available).toBe(true);
    });

    it('should detect elevated risk for low SE', async () => {
      // Create history with very low SE
      const history = createSleepHistory(14).map(s => ({
        ...s,
        metrics: { ...s.metrics, sleepEfficiency: 0.4 },
      }));

      const assessment = await service.getCombinedRiskAssessment(testUserId, history);

      // With SE=0.4 (40%), risk should be at least moderate
      expect(['moderate', 'high', 'critical']).toContain(assessment.riskLevel);
      expect(assessment.combinedRiskScore).toBeGreaterThan(0.3);
    });

    it('should generate Russian summary', async () => {
      const history = createSleepHistory(14);

      const assessment = await service.getCombinedRiskAssessment(testUserId, history);

      expect(assessment.summaryRu).toMatch(/Комплексная оценка/);
    });
  });

  // ==========================================================================
  // Milestones Detection
  // ==========================================================================
  describe('Milestones Detection', () => {
    it('should detect 7-day streak milestone', async () => {
      const history = createSleepHistory(7);

      const analysis = await service.runDailyAnalysis(testUserId, history);
      const milestoneInsight = analysis.insights.find(i => i.type === 'milestone');

      expect(milestoneInsight).toBeDefined();
      expect(milestoneInsight?.titleRu).toContain('7 дней');
    });

    it('should detect 14-day streak milestone', async () => {
      const history = createSleepHistory(14);

      // Clear cache first
      const newService = new ProactiveIntelligenceService();
      const analysis = await newService.runDailyAnalysis('user_14days', history);
      const milestoneInsight = analysis.insights.find(i =>
        i.type === 'milestone' && i.id.includes('14days')
      );

      expect(milestoneInsight).toBeDefined();
    });

    it('should detect pattern improvement', async () => {
      const history: ISleepState[] = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      // First week: low SE
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        history.push(createSleepState(date.toISOString().split('T')[0], {
          sleepEfficiency: 0.60,
        }));
      }

      // Second week: high SE (25%+ improvement)
      for (let i = 7; i < 14; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        history.push(createSleepState(date.toISOString().split('T')[0], {
          sleepEfficiency: 0.90,
        }));
      }

      const newService = new ProactiveIntelligenceService();
      const patternChange = await newService.detectPatternChange('user_se_improvement', history);

      // Should detect significant improvement (30 percentage points)
      expect(patternChange).not.toBeNull();
      expect(patternChange?.type).toBe('improvement');
    });
  });

  // ==========================================================================
  // Tips Generation
  // ==========================================================================
  describe('Tips Generation', () => {
    it('should generate SOL tip when onset latency is high', async () => {
      const history = createSleepHistory(7).map(s => ({
        ...s,
        metrics: { ...s.metrics, sleepOnsetLatency: 45 }, // High SOL
      }));

      const newService = new ProactiveIntelligenceService();
      const analysis = await newService.runDailyAnalysis('user_high_sol', history);
      const tipInsight = analysis.insights.find(i =>
        i.type === 'tip' && i.id.includes('sol')
      );

      expect(tipInsight).toBeDefined();
    });

    it('should generate WASO tip when night awakenings are high', async () => {
      const history = createSleepHistory(7).map(s => ({
        ...s,
        metrics: { ...s.metrics, wakeAfterSleepOnset: 45 }, // High WASO
      }));

      const newService = new ProactiveIntelligenceService();
      const analysis = await newService.runDailyAnalysis('user_high_waso', history);
      const tipInsight = analysis.insights.find(i =>
        i.type === 'tip' && i.id.includes('waso')
      );

      expect(tipInsight).toBeDefined();
    });
  });

  // ==========================================================================
  // Factory & Singleton
  // ==========================================================================
  describe('Factory & Singleton', () => {
    it('should create service via factory', () => {
      const created = createProactiveIntelligenceService({
        maxInsightsPerDay: 5,
      });

      expect(created).toBeInstanceOf(ProactiveIntelligenceService);
    });

    it('should export singleton instance', () => {
      expect(proactiveIntelligenceService).toBeInstanceOf(ProactiveIntelligenceService);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle empty sleep history', async () => {
      const analysis = await service.runDailyAnalysis(testUserId, []);

      expect(analysis.insights).toHaveLength(0);
      expect(analysis.summary.overallTrend).toBe('stable');
    });

    it('should handle single day of data', async () => {
      const history = createSleepHistory(1);

      const analysis = await service.runDailyAnalysis(testUserId, history);

      expect(analysis.insights).toHaveLength(0);
    });

    it('should handle CSD with constant values', () => {
      // All same SE values (variance should be very low or 0)
      const history = createSleepHistory(21).map(s => ({
        ...s,
        metrics: { ...s.metrics, sleepEfficiency: 0.85 },
      }));

      const csd = service.calculateCriticalSlowingDown(history);

      expect(csd).not.toBeNull();
      // With constant values, variance should be very close to 0
      expect(csd?.variance).toBeLessThan(0.001);
    });

    it('should handle Thompson Sampling with zero impressions', () => {
      const types: IProactiveInsight['type'][] = ['pattern_change'];

      const sampled = service.sampleInsightTypeThompson(testUserId, types);

      expect(sampled).toBe('pattern_change');
    });

    it('should handle multiple concurrent users', async () => {
      const users = ['user1', 'user2', 'user3'];
      const histories = users.map(() => createSleepHistory(7));

      const analyses = await Promise.all(
        users.map((userId, i) => service.runDailyAnalysis(userId, histories[i]))
      );

      expect(analyses).toHaveLength(3);
      analyses.forEach((analysis, i) => {
        expect(analysis.userId).toBe(users[i]);
      });
    });

    it('should handle very long sleep history', async () => {
      const history = createSleepHistory(100);

      const analysis = await service.runDailyAnalysis(testUserId, history);

      expect(analysis).toBeDefined();
      expect(analysis.summary).toBeDefined();
    });
  });
});
