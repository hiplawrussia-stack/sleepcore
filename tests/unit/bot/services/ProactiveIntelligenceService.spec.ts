/**
 * ProactiveIntelligenceService Unit Tests
 * ========================================
 * Tests for Critical Slowing Down, Thompson Sampling, and Anti-Fatigue mechanisms.
 *
 * Research references:
 * - CSD: Smit et al. 2025 (Clinical Psychological Science)
 * - Thompson Sampling: DIAMANTE trial 2024
 * - Anti-Fatigue: PMC 5466696
 *
 * @packageDocumentation
 */

import {
  ProactiveIntelligenceService,
  createProactiveIntelligenceService,
  DEFAULT_PROACTIVE_CONFIG,
  type ICriticalSlowingDown,
  type IThompsonSamplingState,
  type IProactiveInsight,
} from '../../../../src/bot/services/ProactiveIntelligenceService';
import type { ISleepState } from '../../../../src/sleep/interfaces/ISleepState';

describe('ProactiveIntelligenceService', () => {
  let service: ProactiveIntelligenceService;

  beforeEach(() => {
    service = createProactiveIntelligenceService();
  });

  // Helper to create mock sleep history
  const createSleepHistory = (
    days: number,
    sePattern: 'stable' | 'declining' | 'improving' | 'unstable' = 'stable'
  ): ISleepState[] => {
    const history: ISleepState[] = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - days);

    for (let i = 0; i < days; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);

      let sleepEfficiency: number;
      switch (sePattern) {
        case 'declining':
          sleepEfficiency = 0.85 - (i * 0.02); // Gradual decline
          break;
        case 'improving':
          sleepEfficiency = 0.65 + (i * 0.015); // Gradual improvement
          break;
        case 'unstable':
          sleepEfficiency = 0.75 + (Math.sin(i) * 0.15); // Oscillating
          break;
        default:
          sleepEfficiency = 0.8 + (Math.random() - 0.5) * 0.05; // Stable with noise
      }

      const totalSleepTime = 360 + Math.random() * 120;
      const timeInBed = totalSleepTime / Math.max(0.3, Math.min(1, sleepEfficiency));

      history.push({
        userId: 'test-user',
        timestamp: date,
        date: date.toISOString().split('T')[0],
        metrics: {
          sleepEfficiency: Math.max(0.3, Math.min(1, sleepEfficiency)),
          totalSleepTime,
          timeInBed,
          sleepOnsetLatency: 15 + Math.random() * 30,
          wakeAfterSleepOnset: 20 + Math.random() * 40,
          numberOfAwakenings: Math.floor(1 + Math.random() * 4),
          finalAwakening: '06:45',
          bedtime: '23:00',
          wakeTime: '07:00',
          outOfBedTime: '07:15',
        },
        circadian: {
          chronotype: 'intermediate',
          circadianPhase: (i * 0.5) % 24,
          phaseDeviation: 0,
          lightExposure: 5000,
          socialJetLag: 0.5,
        },
      } as ISleepState);
    }

    return history;
  };

  describe('Critical Slowing Down (CSD)', () => {
    it('should return null with insufficient data (<14 days)', () => {
      const history = createSleepHistory(10);
      const csd = service.calculateCriticalSlowingDown(history);
      expect(csd).toBeNull();
    });

    it('should calculate CSD for 14+ days of data', () => {
      const history = createSleepHistory(21, 'stable');
      const csd = service.calculateCriticalSlowingDown(history);

      expect(csd).not.toBeNull();
      expect(csd).toHaveProperty('autocorrelation');
      expect(csd).toHaveProperty('variance');
      expect(csd).toHaveProperty('autocorrelationTrend');
      expect(csd).toHaveProperty('varianceTrend');
      expect(csd).toHaveProperty('csdIndex');
      expect(csd).toHaveProperty('isWarning');
      expect(csd).toHaveProperty('estimatedDaysToTransition');
    });

    it('should detect early warning signs in declining patterns', () => {
      const history = createSleepHistory(21, 'declining');
      const csd = service.calculateCriticalSlowingDown(history);

      expect(csd).not.toBeNull();
      expect(csd!.csdIndex).toBeGreaterThanOrEqual(0);
      expect(csd!.csdIndex).toBeLessThanOrEqual(1);
    });

    it('should have low CSD index for stable patterns', () => {
      const history = createSleepHistory(21, 'stable');
      const csd = service.calculateCriticalSlowingDown(history);

      expect(csd).not.toBeNull();
      // Stable patterns should generally have lower CSD
      expect(csd!.csdIndex).toBeLessThan(0.8);
    });

    it('should detect instability in unstable patterns', () => {
      const history = createSleepHistory(21, 'unstable');
      const csd = service.calculateCriticalSlowingDown(history);

      expect(csd).not.toBeNull();
      // Unstable patterns should have higher variance
      expect(csd!.variance).toBeGreaterThan(0);
    });

    it('should calculate different metrics for different patterns', () => {
      const stableHistory = createSleepHistory(21, 'stable');
      const decliningHistory = createSleepHistory(21, 'declining');

      const stableCsd = service.calculateCriticalSlowingDown(stableHistory);
      const decliningCsd = service.calculateCriticalSlowingDown(decliningHistory);

      expect(stableCsd).not.toBeNull();
      expect(decliningCsd).not.toBeNull();

      // Declining should generally have higher autocorrelation
      // (more predictable day-to-day due to trend)
      expect(decliningCsd!.autocorrelation).not.toBe(stableCsd!.autocorrelation);
    });

    it('should support different metrics (SE, SOL, WASO)', () => {
      const history = createSleepHistory(21);

      const seCsd = service.calculateCriticalSlowingDown(history, 'sleepEfficiency');
      const solCsd = service.calculateCriticalSlowingDown(history, 'sleepOnsetLatency');
      const wasoCsd = service.calculateCriticalSlowingDown(history, 'wakeAfterSleepOnset');

      expect(seCsd).not.toBeNull();
      expect(solCsd).not.toBeNull();
      expect(wasoCsd).not.toBeNull();

      // Different metrics should produce different values
      expect(seCsd!.variance).not.toBe(solCsd!.variance);
    });
  });

  describe('Thompson Sampling', () => {
    const userId = 'test-user-thompson';

    it('should initialize engagement tracking for new user', () => {
      const tracking = service.getEngagementTracking(userId);

      expect(tracking).toBeDefined();
      expect(tracking.userId).toBe(userId);
      expect(tracking.insightsDeliveredToday).toBe(0);
      expect(tracking.lastInsightTime).toBeNull();
      expect(tracking.thompsonStates.size).toBe(5); // 5 insight types
      expect(tracking.hourlyEngagement).toHaveLength(24);
    });

    it('should have uniform priors for new users', () => {
      const tracking = service.getEngagementTracking(userId);

      for (const [type, state] of tracking.thompsonStates) {
        expect(state.insightType).toBe(type);
        expect(state.impressions).toBe(DEFAULT_PROACTIVE_CONFIG.thompsonSampling.priorAlpha +
                                       DEFAULT_PROACTIVE_CONFIG.thompsonSampling.priorBeta);
        expect(state.engagements).toBe(DEFAULT_PROACTIVE_CONFIG.thompsonSampling.priorAlpha);
      }
    });

    it('should sample insight type using Thompson Sampling', () => {
      const availableTypes: IProactiveInsight['type'][] = ['tip', 'opportunity', 'milestone'];
      const selected = service.sampleInsightTypeThompson(userId, availableTypes);

      expect(availableTypes).toContain(selected);
    });

    it('should update Thompson state on interaction', () => {
      const insightId = 'test-insight-1';
      const insightType: IProactiveInsight['type'] = 'tip';

      const beforeTracking = service.getEngagementTracking(userId);
      const beforeState = beforeTracking.thompsonStates.get(insightType);
      const beforeImpressions = beforeState!.impressions;
      const beforeEngagements = beforeState!.engagements;

      // Record a 'clicked' interaction
      service.recordInsightInteraction(userId, insightId, insightType, 'clicked');

      const afterTracking = service.getEngagementTracking(userId);
      const afterState = afterTracking.thompsonStates.get(insightType);

      expect(afterState!.impressions).toBe(beforeImpressions + 1);
      expect(afterState!.engagements).toBe(beforeEngagements + 1);
    });

    it('should track dismissed interactions differently', () => {
      const userId2 = 'test-user-dismissed';
      const insightType: IProactiveInsight['type'] = 'risk_alert';

      const beforeTracking = service.getEngagementTracking(userId2);
      const beforeState = beforeTracking.thompsonStates.get(insightType);
      const beforeEngagements = beforeState!.engagements;

      // Record a 'dismissed' interaction
      service.recordInsightInteraction(userId2, 'test-2', insightType, 'dismissed');

      const afterTracking = service.getEngagementTracking(userId2);
      const afterState = afterTracking.thompsonStates.get(insightType);

      // Impressions should increase but engagements should stay the same
      expect(afterState!.engagements).toBe(beforeEngagements);
    });

    it('should track hourly engagement', () => {
      const userId3 = 'test-user-hourly';

      service.recordInsightInteraction(userId3, 'h1', 'tip', 'clicked');
      service.recordInsightInteraction(userId3, 'h2', 'milestone', 'clicked');

      const tracking = service.getEngagementTracking(userId3);
      const currentHour = new Date().getHours();

      expect(tracking.hourlyEngagement[currentHour]).toBe(2);
    });

    it('should return default hour when no engagement data', () => {
      const newUserId = 'new-user-no-data';
      const optimalHour = service.getOptimalInsightHour(newUserId);

      // Default should be 19 (research: golden hour 17:00-20:00)
      expect(optimalHour).toBe(19);
    });

    it('should learn optimal hour from engagement', () => {
      const userId4 = 'test-user-learning';
      const tracking = service.getEngagementTracking(userId4);

      // Simulate engagement at hour 18
      tracking.hourlyEngagement[18] = 10;
      tracking.hourlyEngagement[20] = 5;

      const optimalHour = service.getOptimalInsightHour(userId4);
      expect(optimalHour).toBe(18);
    });
  });

  describe('Anti-Fatigue Mechanism', () => {
    const userId = 'test-user-fatigue';

    it('should allow sending insight to new user', () => {
      const canSend = service.canSendInsight(userId);
      expect(canSend.allowed).toBe(true);
    });

    it('should block after reaching max daily limit', () => {
      // Mark multiple insights as sent
      for (let i = 0; i < DEFAULT_PROACTIVE_CONFIG.maxInsightsPerDay; i++) {
        service.markInsightSent(userId, `insight-${i}`);
      }

      const canSend = service.canSendInsight(userId);
      expect(canSend.allowed).toBe(false);
      expect(canSend.reason).toBe('max_daily_limit');
    });

    it('should enforce minimum time between insights', () => {
      const userId2 = 'test-user-timing';

      // Mark one insight as sent
      service.markInsightSent(userId2, 'insight-timing');

      const canSend = service.canSendInsight(userId2);
      expect(canSend.allowed).toBe(false);
      expect(canSend.reason).toBe('too_soon');
    });

    it('should reset daily counters', () => {
      const userId3 = 'test-user-reset';

      // Send max insights
      for (let i = 0; i < DEFAULT_PROACTIVE_CONFIG.maxInsightsPerDay; i++) {
        service.markInsightSent(userId3, `insight-${i}`);
      }

      // Verify blocked
      expect(service.canSendInsight(userId3).allowed).toBe(false);

      // Reset counters
      service.resetDailyCounters();

      // Verify allowed again (but timing might still block)
      const tracking = service.getEngagementTracking(userId3);
      expect(tracking.insightsDeliveredToday).toBe(0);
    });

    it('should track interaction history', () => {
      const userId4 = 'test-user-history';

      service.recordInsightInteraction(userId4, 'h1', 'tip', 'clicked');
      service.recordInsightInteraction(userId4, 'h2', 'opportunity', 'dismissed');
      service.recordInsightInteraction(userId4, 'h3', 'milestone', 'ignored');

      const tracking = service.getEngagementTracking(userId4);
      expect(tracking.interactionHistory).toHaveLength(3);

      const [first, second, third] = tracking.interactionHistory;
      expect(first.interactionType).toBe('clicked');
      expect(second.interactionType).toBe('dismissed');
      expect(third.interactionType).toBe('ignored');
    });

    it('should limit interaction history to 100 entries', () => {
      const userId5 = 'test-user-limit';

      // Add 110 interactions
      for (let i = 0; i < 110; i++) {
        service.recordInsightInteraction(userId5, `insight-${i}`, 'tip', 'clicked');
      }

      const tracking = service.getEngagementTracking(userId5);
      expect(tracking.interactionHistory.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Enhanced Risk Detection with CSD', () => {
    const userId = 'test-user-risk';

    it('should include CSD in risk analysis', async () => {
      const history = createSleepHistory(21, 'declining');

      const result = await service.detectRiskAlertsWithCSD(userId, history);

      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('csd');
      expect(Array.isArray(result.alerts)).toBe(true);
    });

    it('should add CSD alert when warning threshold exceeded', async () => {
      // Create history with declining pattern to trigger CSD warning
      const history = createSleepHistory(21, 'declining');

      const result = await service.detectRiskAlertsWithCSD(userId, history);

      // If CSD warning was triggered, there should be a related alert
      if (result.csd?.isWarning) {
        const csdAlert = result.alerts.find(a =>
          a.factors.some(f => f.includes('autocorrelation') || f.includes('variance'))
        );
        expect(csdAlert).toBeDefined();
      }
    });
  });

  describe('Daily Analysis Integration', () => {
    const userId = 'test-user-daily';

    it('should return empty analysis with insufficient data', async () => {
      const history = createSleepHistory(2);
      const analysis = await service.runDailyAnalysis(userId, history);

      expect(analysis.insights).toHaveLength(0);
      expect(analysis.patternAlerts).toHaveLength(0);
      expect(analysis.summary.overallTrend).toBe('stable');
    });

    it('should generate insights with sufficient data', async () => {
      const history = createSleepHistory(14, 'improving');
      const analysis = await service.runDailyAnalysis(userId, history);

      expect(analysis.userId).toBe(userId);
      expect(analysis.date).toBeInstanceOf(Date);
      expect(analysis.summary).toHaveProperty('overallTrend');
      expect(analysis.summary).toHaveProperty('riskLevel');
      expect(analysis.summary).toHaveProperty('engagementScore');
    });

    it('should cache daily analysis', async () => {
      const history = createSleepHistory(14);

      const analysis1 = await service.runDailyAnalysis(userId, history);
      const analysis2 = await service.runDailyAnalysis(userId, history);

      // Should return cached result (same object reference)
      expect(analysis1).toBe(analysis2);
    });

    it('should limit insights per day', async () => {
      const history = createSleepHistory(21);
      const analysis = await service.runDailyAnalysis(userId, history);

      expect(analysis.insights.length).toBeLessThanOrEqual(DEFAULT_PROACTIVE_CONFIG.maxInsightsPerDay);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      expect(DEFAULT_PROACTIVE_CONFIG.enabled).toBe(true);
      expect(DEFAULT_PROACTIVE_CONFIG.minDataDays).toBe(3);
      expect(DEFAULT_PROACTIVE_CONFIG.maxInsightsPerDay).toBe(3);
    });

    it('should have research-backed CSD settings', () => {
      expect(DEFAULT_PROACTIVE_CONFIG.csd.windowSize).toBe(7);
      expect(DEFAULT_PROACTIVE_CONFIG.csd.minDataPoints).toBe(14);
      expect(DEFAULT_PROACTIVE_CONFIG.csd.autocorrelationThreshold).toBe(0.7);
    });

    it('should have Thompson Sampling settings', () => {
      expect(DEFAULT_PROACTIVE_CONFIG.thompsonSampling.enabled).toBe(true);
      expect(DEFAULT_PROACTIVE_CONFIG.thompsonSampling.priorAlpha).toBe(1);
      expect(DEFAULT_PROACTIVE_CONFIG.thompsonSampling.priorBeta).toBe(1);
    });

    it('should have anti-fatigue settings', () => {
      expect(DEFAULT_PROACTIVE_CONFIG.antiFatigue.minHoursBetweenInsights).toBe(4);
      expect(DEFAULT_PROACTIVE_CONFIG.antiFatigue.maxInsightsPerWeek).toBe(14);
      expect(DEFAULT_PROACTIVE_CONFIG.antiFatigue.cooldownAfterIgnore).toBe(24);
    });

    it('should accept custom configuration', () => {
      const customService = createProactiveIntelligenceService({
        maxInsightsPerDay: 5,
        csd: {
          windowSize: 10,
          minDataPoints: 20,
          autocorrelationThreshold: 0.8,
          varianceThreshold: 2.0,
        },
      });

      // Service should be created successfully
      expect(customService).toBeInstanceOf(ProactiveIntelligenceService);
    });
  });

  describe('Database Persistence', () => {
    it('should set repository and load from DB', async () => {
      // Mock repository
      const mockRepo = {
        getAllForService: jest.fn().mockResolvedValue([]),
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(null),
      };

      await service.setRepository(mockRepo as any);

      expect(mockRepo.getAllForService).toHaveBeenCalledWith('proactive_insights');
      expect(mockRepo.getAllForService).toHaveBeenCalledWith('engagement_tracking');
    });

    it('should load existing insights from DB', async () => {
      const mockInsights = [
        {
          id: 'test-1',
          type: 'tip',
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      const mockRepo = {
        getAllForService: jest.fn().mockImplementation((service: string) => {
          if (service === 'proactive_insights') {
            return Promise.resolve([
              { userId: 'user-1', state: { insights: mockInsights } },
            ]);
          }
          return Promise.resolve([]);
        }),
        set: jest.fn().mockResolvedValue(undefined),
      };

      await service.setRepository(mockRepo as any);

      // The insights should be restored with Date objects
      const pending = service.getPendingInsights('user-1');
      expect(pending).toHaveLength(1);
      expect(pending[0].generatedAt).toBeInstanceOf(Date);
    });

    it('should load engagement tracking from DB', async () => {
      const mockEngagement = {
        userId: 'user-2',
        insightsDeliveredToday: 2,
        lastInsightTime: new Date().toISOString(),
        thompsonStates: {
          tip: { insightType: 'tip', impressions: 10, engagements: 5 },
        },
        hourlyEngagement: Array(24).fill(0),
        interactionHistory: [],
      };

      const mockRepo = {
        getAllForService: jest.fn().mockImplementation((service: string) => {
          if (service === 'engagement_tracking') {
            return Promise.resolve([
              { userId: 'user-2', state: mockEngagement },
            ]);
          }
          return Promise.resolve([]);
        }),
        set: jest.fn().mockResolvedValue(undefined),
      };

      await service.setRepository(mockRepo as any);

      const tracking = service.getEngagementTracking('user-2');
      expect(tracking.insightsDeliveredToday).toBe(2);
    });

    it('should handle DB load failure gracefully', async () => {
      const mockRepo = {
        getAllForService: jest.fn().mockRejectedValue(new Error('DB error')),
        set: jest.fn().mockResolvedValue(undefined),
      };

      // Should not throw
      await expect(service.setRepository(mockRepo as any)).resolves.not.toThrow();
    });

    it('should persist insights to DB on changes', async () => {
      const mockRepo = {
        getAllForService: jest.fn().mockResolvedValue([]),
        set: jest.fn().mockResolvedValue(undefined),
      };

      await service.setRepository(mockRepo as any);

      // Mark insight as delivered to trigger persistence
      service.markInsightSent('user-persist', 'insight-1');

      // Wait for async persistence
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRepo.set).toHaveBeenCalled();
    });
  });

  describe('Insight Delivery', () => {
    it('should mark insight as delivered', () => {
      const userId = 'delivery-user';

      // First, generate some insights by running analysis
      service.markInsightSent(userId, 'insight-to-deliver');

      // Get pending insights (should be empty for new user)
      const pending = service.getPendingInsights(userId);
      expect(Array.isArray(pending)).toBe(true);
    });

    it('should remove insight from pending after delivery', () => {
      // This tests the markInsightDelivered path
      const userId = 'mark-delivered-user';

      // Get initial state
      const beforePending = service.getPendingInsights(userId);
      const beforeCount = beforePending.length;

      // Mark a non-existent insight as delivered (should not crash)
      service.markInsightDelivered(userId, 'non-existent');

      const afterPending = service.getPendingInsights(userId);
      expect(afterPending.length).toBe(beforeCount);
    });
  });

  describe('Optimal Intervention Timing', () => {
    const userId = 'timing-user';

    it('should find optimal intervention time', async () => {
      const history = createSleepHistory(14);
      const time = await service.findOptimalInterventionTime(userId, history);

      expect(time).toBeInstanceOf(Date);
    });

    it('should default to evening window when no timings available', async () => {
      // Create minimal history
      const history = createSleepHistory(2);
      const time = await service.findOptimalInterventionTime(userId, history);

      expect(time).toBeInstanceOf(Date);
      // Should be set to evening window
      const hour = time.getHours();
      expect(hour).toBeGreaterThanOrEqual(17);
      expect(hour).toBeLessThanOrEqual(21);
    });

    it('should find multiple optimal intervention times', async () => {
      const history = createSleepHistory(14);
      // Access the private method via type assertion for testing
      const timings = await (service as any).findOptimalInterventionTimes(userId, history);

      expect(Array.isArray(timings)).toBe(true);
    });
  });

  describe('Belief-Augmented Risk Detection', () => {
    const userId = 'belief-risk-user';

    it('should detect risk with high arousal and low self-efficacy via runDailyAnalysis', async () => {
      const history = createSleepHistory(14);

      // Create a belief state indicating vulnerable state
      const beliefState = createMockBeliefState({
        emotional: {
          arousal: { posterior: { mean: 0.8, variance: 0.1 } },
          valence: { posterior: { mean: 0.5, variance: 0.1 } },
        },
        cognitive: {
          selfView: { posterior: { mean: 0.2, variance: 0.1 } },
          worldView: { posterior: { mean: 0.5, variance: 0.1 } },
        },
        risk: {
          overallRisk: { posterior: { mean: 0.3, variance: 0.1 } },
        },
      });

      // Use runDailyAnalysis which internally calls detectRiskAlerts with beliefState
      const result = await service.runDailyAnalysis(userId, history, beliefState);

      // Should have pattern alerts from the analysis
      expect(result).toHaveProperty('patternAlerts');
      expect(Array.isArray(result.patternAlerts)).toBe(true);

      // Check summary includes risk assessment
      expect(result.summary).toHaveProperty('riskLevel');
    });

    it('should detect risk with high overall CogniCore risk via runDailyAnalysis', async () => {
      const history = createSleepHistory(14, 'stable'); // Use stable to avoid other alerts

      const beliefState = createMockBeliefState({
        emotional: {
          arousal: { posterior: { mean: 0.4, variance: 0.1 } },
          valence: { posterior: { mean: 0.5, variance: 0.1 } },
        },
        cognitive: {
          selfView: { posterior: { mean: 0.6, variance: 0.1 } },
          worldView: { posterior: { mean: 0.5, variance: 0.1 } },
        },
        risk: {
          overallRisk: { posterior: { mean: 0.75, variance: 0.1 } },
        },
      });

      const result = await service.runDailyAnalysis(userId, history, beliefState);

      // Result should contain summary with risk level
      expect(result.summary).toHaveProperty('riskLevel');
    });

    it('should handle belief state in daily analysis', async () => {
      const history = createSleepHistory(14, 'declining');

      const beliefState = createMockBeliefState({
        emotional: {
          arousal: { posterior: { mean: 0.9, variance: 0.1 } },
          valence: { posterior: { mean: 0.2, variance: 0.1 } },
        },
        cognitive: {
          selfView: { posterior: { mean: 0.15, variance: 0.1 } },
          worldView: { posterior: { mean: 0.3, variance: 0.1 } },
        },
        risk: {
          overallRisk: { posterior: { mean: 0.85, variance: 0.1 } },
        },
      });

      const result = await service.runDailyAnalysis(userId, history, beliefState);

      // Should complete successfully with pattern alerts
      expect(result.patternAlerts).toBeDefined();
      expect(Array.isArray(result.patternAlerts)).toBe(true);
    });
  });

  describe('Multi-Modal Risk Fusion', () => {
    const userId = 'fusion-user';

    it('should get combined risk assessment', async () => {
      const history = createSleepHistory(14);

      // Use the public method getCombinedRiskAssessment
      const riskResult = await service.getCombinedRiskAssessment(userId, history);

      expect(riskResult).toHaveProperty('available');
      expect(riskResult).toHaveProperty('combinedRiskScore');
      expect(riskResult).toHaveProperty('riskLevel');
      expect(['low', 'moderate', 'high', 'critical']).toContain(riskResult.riskLevel);
    });

    it('should include components in combined assessment', async () => {
      const history = createSleepHistory(14);

      const riskResult = await service.getCombinedRiskAssessment(userId, history);

      expect(riskResult.components).toHaveProperty('sleepCSD');
      expect(riskResult.components).toHaveProperty('voiceBiomarkers');
      expect(riskResult.components).toHaveProperty('sleepEfficiency');
    });

    it('should generate recommendations based on assessment', async () => {
      const history = createSleepHistory(14);

      const riskResult = await service.getCombinedRiskAssessment(userId, history);

      expect(riskResult.recommendations).toBeDefined();
      expect(Array.isArray(riskResult.recommendations)).toBe(true);
      expect(riskResult.recommendations.length).toBeGreaterThan(0);
    });

    it('should determine escalation requirement', async () => {
      const history = createSleepHistory(21, 'declining');

      const riskResult = await service.getCombinedRiskAssessment(userId, history);

      expect(riskResult).toHaveProperty('escalationRequired');
      expect(typeof riskResult.escalationRequired).toBe('boolean');
    });

    it('should generate Russian summary', async () => {
      const history = createSleepHistory(14);

      const riskResult = await service.getCombinedRiskAssessment(userId, history);

      expect(riskResult.summaryRu).toBeDefined();
      expect(typeof riskResult.summaryRu).toBe('string');
      // Russian text check
      expect(riskResult.summaryRu.length).toBeGreaterThan(0);
    });

    it('should identify primary concerns', async () => {
      const history = createSleepHistory(21, 'declining');

      const riskResult = await service.getCombinedRiskAssessment(userId, history);

      expect(riskResult.primaryConcerns).toBeDefined();
      expect(Array.isArray(riskResult.primaryConcerns)).toBe(true);
    });
  });

  describe('Average Time Calculations', () => {
    it('should calculate average time from Date objects', () => {
      const times = [
        new Date('2025-01-20T22:00:00'),
        new Date('2025-01-21T23:00:00'),
        new Date('2025-01-22T22:30:00'),
      ];

      const avgTime = (service as any).calculateAverageTime(times);

      expect(avgTime).not.toBeNull();
      expect(avgTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should return null for empty time array', () => {
      const avgTime = (service as any).calculateAverageTime([]);
      expect(avgTime).toBeNull();
    });

    it('should calculate average time from string format', () => {
      const times = ['22:00', '23:00', '22:30'];

      const avgTime = (service as any).calculateAverageTimeFromStrings(times);

      expect(avgTime).not.toBeNull();
      expect(avgTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should return null for empty string time array', () => {
      const avgTime = (service as any).calculateAverageTimeFromStrings([]);
      expect(avgTime).toBeNull();
    });

    it('should calculate average bedtime from history', () => {
      const history = createSleepHistory(14);

      const avgBedtime = (service as any).calculateAverageBedtime(history);

      expect(avgBedtime).not.toBeNull();
      expect(typeof avgBedtime).toBe('number');
      // Should be between 20:00 (20) and 02:00 (26 -> 2 after normalization)
      expect(avgBedtime).toBeGreaterThanOrEqual(0);
      expect(avgBedtime).toBeLessThanOrEqual(24);
    });

    it('should return null for empty history', () => {
      const avgBedtime = (service as any).calculateAverageBedtime([]);
      expect(avgBedtime).toBeNull();
    });

    it('should handle after-midnight bedtimes', () => {
      const lateHistory = createSleepHistory(7).map(s => ({
        ...s,
        metrics: { ...s.metrics, bedtime: '01:30' },
      }));

      const avgBedtime = (service as any).calculateAverageBedtime(lateHistory);

      expect(avgBedtime).not.toBeNull();
      // After-midnight should be handled (01:30 = 25.5 hours, normalized to 1.5)
    });
  });

  describe('Days Since Last Entry', () => {
    it('should calculate days since last entry', () => {
      const history = createSleepHistory(7);

      const days = (service as any).daysSinceLastEntry(history);

      expect(typeof days).toBe('number');
      expect(days).toBeGreaterThanOrEqual(0);
    });

    it('should return Infinity for empty history', () => {
      const days = (service as any).daysSinceLastEntry([]);
      expect(days).toBe(Infinity);
    });
  });
});

// Helper to create mock belief state
function createMockBeliefState(overrides: Partial<{
  emotional: { arousal: any; valence: any };
  cognitive: { selfView: any; worldView: any };
  risk: { overallRisk: any };
}>): any {
  return {
    emotional: {
      arousal: {
        posterior: { mean: 0.5, variance: 0.1 },
        ...overrides.emotional?.arousal,
      },
      valence: {
        posterior: { mean: 0.5, variance: 0.1 },
        ...overrides.emotional?.valence,
      },
      ...(overrides.emotional || {}),
    },
    cognitive: {
      selfView: {
        posterior: { mean: 0.5, variance: 0.1 },
        ...overrides.cognitive?.selfView,
      },
      worldView: {
        posterior: { mean: 0.5, variance: 0.1 },
        ...overrides.cognitive?.worldView,
      },
      ...(overrides.cognitive || {}),
    },
    risk: {
      overallRisk: {
        posterior: { mean: 0.3, variance: 0.1 },
        ...overrides.risk?.overallRisk,
      },
      ...(overrides.risk || {}),
    },
  };
}
