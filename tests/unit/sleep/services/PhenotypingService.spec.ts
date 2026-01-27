/**
 * PhenotypingService Tests
 * ========================
 * Tests for the sleep phenotyping service (PAT + PLRNN ensemble).
 *
 * @packageDocumentation
 */

import {
  PhenotypingService,
  createPhenotypingService,
  DEFAULT_PHENOTYPING_CONFIG,
  type IPhenotypingConfig,
  type ISleepProfile,
} from '../../../../src/sleep/services/PhenotypingService';

import type {
  IActigraphySession,
  IActivityCount,
  IDailyActigraphySummary,
} from '../../../../src/sleep/interfaces/IActigraphy';

describe('PhenotypingService', () => {
  let service: PhenotypingService;

  beforeEach(() => {
    service = new PhenotypingService();
  });

  // ==========================================================================
  // Factory
  // ==========================================================================
  describe('Factory', () => {
    it('should create service with default config', () => {
      const created = createPhenotypingService();
      expect(created).toBeInstanceOf(PhenotypingService);
    });

    it('should create service with custom config', () => {
      const customConfig: Partial<IPhenotypingConfig> = {
        ensembleWeights: { pat: 0.5, plrnn: 0.5 },
        minPhenotypeConfidence: 0.6,
      };
      const created = createPhenotypingService(customConfig);
      expect(created.getConfig().ensembleWeights.pat).toBe(0.5);
    });
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================
  describe('Initialization', () => {
    it('should not be ready before initialization', () => {
      expect(service.isReady()).toBe(false);
    });

    it('should be ready after initialization', async () => {
      await service.initialize();
      expect(service.isReady()).toBe(true);
    });

    it('should initialize PAT adapter', async () => {
      await service.initialize();
      const patInfo = service.getPATInfo();
      expect(patInfo.isReady).toBe(true);
    });
  });

  // ==========================================================================
  // Configuration
  // ==========================================================================
  describe('Configuration', () => {
    it('should have correct default ensemble weights', () => {
      const config = service.getConfig();
      expect(config.ensembleWeights.pat).toBe(0.4);
      expect(config.ensembleWeights.plrnn).toBe(0.6);
    });

    it('should have correct default thresholds', () => {
      expect(DEFAULT_PHENOTYPING_CONFIG.minPhenotypeConfidence).toBe(0.5);
      expect(DEFAULT_PHENOTYPING_CONFIG.cacheTTL).toBe(3600);
    });

    it('should enable therapy recommendations by default', () => {
      expect(DEFAULT_PHENOTYPING_CONFIG.enableTherapyRecommendations).toBe(true);
    });
  });

  // ==========================================================================
  // Profile Generation
  // ==========================================================================
  describe('Profile Generation', () => {
    const createTestSession = (days: number = 7): IActigraphySession => {
      const epochs: IActivityCount[] = [];
      const startTime = new Date('2025-01-20T00:00:00Z');

      for (let i = 0; i < days * 1440; i++) {
        const hour = Math.floor(i / 60) % 24;
        const isNight = hour >= 23 || hour < 7;
        const count = isNight ? 20 : 400;

        epochs.push({
          timestamp: startTime.getTime() + i * 60000,
          epochSeconds: 60,
          count: Math.round(count + Math.random() * 50),
          vectorMagnitude: count / 1000,
          steps: Math.round(count / 100),
          isWorn: true,
        });
      }

      const dailySummaries: IDailyActigraphySummary[] = [];
      for (let d = 0; d < days; d++) {
        dailySummaries.push({
          date: new Date(startTime.getTime() + d * 86400000).toISOString().split('T')[0],
          totalActivityCounts: 50000,
          totalSteps: 8000,
          sedentaryMinutes: 480,
          lightActivityMinutes: 360,
          moderateActivityMinutes: 45,
          vigorousActivityMinutes: 15,
          mvpaMinutes: 60,
          nonWearMinutes: 60,
          validWearHours: 16,
        });
      }

      return {
        userId: 'test-user',
        sessionId: 'test-session',
        source: 'apple_watch',
        startTime,
        endTime: new Date(startTime.getTime() + days * 86400000),
        epochLength: 60,
        epochs,
        dailySummaries,
        dataQuality: 0.95,
      };
    };

    it('should generate complete sleep profile', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(profile).toBeDefined();
      expect(profile.userId).toBe('test-user');
      expect(profile.timestamp).toBeInstanceOf(Date);
      expect(profile.phenotype).toBeDefined();
      expect(profile.therapyRecommendations).toBeDefined();
      expect(profile.riskAssessment).toBeDefined();
      expect(profile.circadianProfile).toBeDefined();
      expect(profile.behavioralPatterns).toBeDefined();
    });

    it('should include phenotype classification', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(profile.phenotype.primaryPhenotype).toBeDefined();
      expect(profile.phenotype.probabilities).toBeDefined();
      expect(profile.phenotype.confidence).toBeGreaterThan(0);
      expect(profile.phenotype.stability).toBeDefined();
    });

    it('should auto-initialize on profile generation', async () => {
      const session = createTestSession(5);
      const profile = await service.generateProfile('test-user', session);

      expect(service.isReady()).toBe(true);
      expect(profile).toBeDefined();
    });

    it('should assess data quality', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(profile.dataQuality).toBeDefined();
      expect(['excellent', 'good', 'fair', 'poor']).toContain(profile.dataQuality);
    });

    it('should set next assessment date', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(profile.nextAssessmentDate).toBeInstanceOf(Date);
      expect(profile.nextAssessmentDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ==========================================================================
  // Therapy Recommendations
  // ==========================================================================
  describe('Therapy Recommendations', () => {
    it('should generate therapy recommendations', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(profile.therapyRecommendations.length).toBeGreaterThan(0);
      expect(profile.therapyRecommendations.length).toBeLessThanOrEqual(5);
    });

    it('should prioritize recommendations', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      // Should be sorted by priority
      for (let i = 1; i < profile.therapyRecommendations.length; i++) {
        const current = profile.therapyRecommendations[i];
        const previous = profile.therapyRecommendations[i - 1];
        if (current && previous) {
          expect(current.priority).toBeGreaterThanOrEqual(previous.priority);
        }
      }
    });

    it('should include evidence-based effect sizes', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      for (const rec of profile.therapyRecommendations) {
        expect(rec.expectedEffectSize).toBeGreaterThanOrEqual(0);
        expect(rec.expectedEffectSize).toBeLessThanOrEqual(2);
      }
    });

    it('should include rationale and contraindications', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      for (const rec of profile.therapyRecommendations) {
        expect(rec.rationale).toBeDefined();
        expect(rec.rationale.length).toBeGreaterThan(0);
        expect(Array.isArray(rec.contraindications)).toBe(true);
      }
    });

    it('should skip recommendations when disabled', async () => {
      const noRecService = new PhenotypingService({
        enableTherapyRecommendations: false,
      });
      await noRecService.initialize();
      const session = createTestSession(7);
      const profile = await noRecService.generateProfile('test-user', session);

      expect(profile.therapyRecommendations.length).toBe(0);
    });

    it('should consider ISI score in recommendations', async () => {
      await service.initialize();
      const session = createTestSession(7);

      // Profile with high ISI
      const profileHighISI = await service.generateProfile(
        'test-user-high',
        session,
        { isiScore: 22 }
      );
      service.clearCache('test-user-high');

      // Profile with low ISI
      const profileLowISI = await service.generateProfile(
        'test-user-low',
        session,
        { isiScore: 8 }
      );

      // High ISI should have different recommendations
      expect(profileHighISI.riskAssessment.overallRisk).not.toBe(
        profileLowISI.riskAssessment.overallRisk
      );
    });
  });

  // ==========================================================================
  // Risk Assessment
  // ==========================================================================
  describe('Risk Assessment', () => {
    it('should assess multiple risk factors', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(profile.riskAssessment.scores.insomniaRisk).toBeDefined();
      expect(profile.riskAssessment.scores.sleepApneaRisk).toBeDefined();
      expect(profile.riskAssessment.scores.circadianDisruptionRisk).toBeDefined();
      expect(profile.riskAssessment.scores.sleepDeprivationRisk).toBeDefined();
      expect(profile.riskAssessment.scores.depressionRisk).toBeDefined();
      expect(profile.riskAssessment.scores.anxietyRisk).toBeDefined();
    });

    it('should normalize risk scores to 0-1', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      for (const score of Object.values(profile.riskAssessment.scores)) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });

    it('should classify overall risk level', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(['low', 'moderate', 'high', 'critical']).toContain(
        profile.riskAssessment.overallRisk
      );
    });

    it('should flag clinical concerns', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(Array.isArray(profile.riskAssessment.clinicalFlags)).toBe(true);
      expect(Array.isArray(profile.riskAssessment.recommendedActions)).toBe(true);
    });
  });

  // ==========================================================================
  // Circadian Profile
  // ==========================================================================
  describe('Circadian Profile', () => {
    it('should estimate chronotype', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(['morning', 'intermediate', 'evening']).toContain(
        profile.circadianProfile.chronotype
      );
      expect(profile.circadianProfile.chronotypeStrength).toBeGreaterThan(0);
      expect(profile.circadianProfile.chronotypeStrength).toBeLessThanOrEqual(1);
    });

    it('should estimate DLMO', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(profile.circadianProfile.estimatedDLMO).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should recommend optimal sleep window', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(profile.circadianProfile.optimalSleepWindow.bedtime).toMatch(/^\d{2}:\d{2}$/);
      expect(profile.circadianProfile.optimalSleepWindow.wakeTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should estimate social jet lag', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(profile.circadianProfile.socialJetLag).toBeGreaterThanOrEqual(0);
    });

    it('should assess circadian stability', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(profile.circadianProfile.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(profile.circadianProfile.stabilityScore).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Behavioral Patterns
  // ==========================================================================
  describe('Behavioral Patterns', () => {
    it('should classify activity level', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(['sedentary', 'low', 'moderate', 'high', 'very_high']).toContain(
        profile.behavioralPatterns.activityLevel
      );
    });

    it('should assess timing consistency', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(profile.behavioralPatterns.timingConsistency).toBeGreaterThanOrEqual(0);
      expect(profile.behavioralPatterns.timingConsistency).toBeLessThanOrEqual(1);
    });

    it('should detect evening activity trend', async () => {
      await service.initialize();
      const session = createTestSession(7);
      const profile = await service.generateProfile('test-user', session);

      expect(['increasing', 'stable', 'decreasing']).toContain(
        profile.behavioralPatterns.eveningActivityTrend
      );
    });
  });

  // ==========================================================================
  // Ensemble Prediction
  // ==========================================================================
  describe('Ensemble Prediction', () => {
    it('should create ensemble from PAT only', async () => {
      await service.initialize();

      const patPrediction = {
        userId: 'test-user',
        timestamp: new Date(),
        phenotype: {
          primaryPhenotype: 'healthy_sleeper' as const,
          probabilities: { healthy_sleeper: 0.7 } as Record<string, number>,
          confidence: 0.75,
          stability: 'stable' as const,
        },
        predictedMetrics: {
          sleepDuration: 420,
          sleepEfficiency: 88,
          sleepOnset: '23:00',
          wakeTime: '07:00',
          fragmentation: 0.1,
        },
        riskScores: {
          insomniaRisk: 0.2,
          sleepApneaRisk: 0.1,
          circadianDisruptionRisk: 0.15,
          sleepDeprivationRisk: 0.1,
        },
        confidence: 0.75,
        modelVersion: '1.0.0-simulated',
      };

      const ensemble = await service.createEnsemblePrediction(
        'test-user',
        patPrediction,
        null
      );

      expect(ensemble.weights.pat).toBe(1);
      expect(ensemble.weights.plrnn).toBe(0);
      expect(ensemble.ensemble.sleepEfficiency).toBe(88);
    });

    it('should create ensemble from PLRNN only', async () => {
      await service.initialize();

      const plrnnPrediction = {
        sleepEfficiency: 85,
        trend: 'stable' as const,
        confidence: 0.8,
      };

      const ensemble = await service.createEnsemblePrediction(
        'test-user',
        null,
        plrnnPrediction
      );

      expect(ensemble.weights.pat).toBe(0);
      expect(ensemble.weights.plrnn).toBe(1);
      expect(ensemble.ensemble.sleepEfficiency).toBe(85);
    });

    it('should combine PAT and PLRNN predictions', async () => {
      await service.initialize();

      const patPrediction = {
        userId: 'test-user',
        timestamp: new Date(),
        phenotype: {
          primaryPhenotype: 'healthy_sleeper' as const,
          probabilities: { healthy_sleeper: 0.7 } as Record<string, number>,
          confidence: 0.75,
          stability: 'stable' as const,
        },
        predictedMetrics: {
          sleepDuration: 420,
          sleepEfficiency: 90,
          sleepOnset: '23:00',
          wakeTime: '07:00',
          fragmentation: 0.1,
        },
        riskScores: {
          insomniaRisk: 0.2,
          sleepApneaRisk: 0.1,
          circadianDisruptionRisk: 0.15,
          sleepDeprivationRisk: 0.1,
        },
        confidence: 0.75,
        modelVersion: '1.0.0-simulated',
      };

      const plrnnPrediction = {
        sleepEfficiency: 80,
        trend: 'stable' as const,
        confidence: 0.8,
      };

      const ensemble = await service.createEnsemblePrediction(
        'test-user',
        patPrediction,
        plrnnPrediction
      );

      // Should be weighted average (0.4 * 90 + 0.6 * 80 = 84)
      expect(ensemble.ensemble.sleepEfficiency).toBe(84);
      expect(ensemble.weights.pat).toBeCloseTo(0.4);
      expect(ensemble.weights.plrnn).toBeCloseTo(0.6);
    });
  });

  // ==========================================================================
  // Caching
  // ==========================================================================
  describe('Caching', () => {
    it('should cache profile results', async () => {
      await service.initialize();
      const session = createTestSession(5);

      // First call - generates profile
      const profile1 = await service.generateProfile('test-user', session);

      // Second call - should return cached
      const profile2 = await service.generateProfile('test-user', session);

      // Should be the same object (cached)
      expect(profile1.timestamp.getTime()).toBe(profile2.timestamp.getTime());
    });

    it('should clear cache for specific user', async () => {
      await service.initialize();
      const session = createTestSession(5);

      await service.generateProfile('test-user', session);
      service.clearCache('test-user');

      // Should generate new profile
      const newProfile = await service.generateProfile('test-user', session);
      expect(newProfile).toBeDefined();
    });

    it('should clear all cache', async () => {
      await service.initialize();
      const session1 = createTestSession(5);
      const session2 = createTestSession(5);

      await service.generateProfile('user1', session1);
      await service.generateProfile('user2', session2);

      service.clearCache();

      // Both should generate new profiles
      const newProfile1 = await service.generateProfile('user1', session1);
      const newProfile2 = await service.generateProfile('user2', session2);

      expect(newProfile1).toBeDefined();
      expect(newProfile2).toBeDefined();
    });
  });
});

// ==========================================================================
// Helper Functions
// ==========================================================================

function createTestSession(days: number): IActigraphySession {
  const epochs: IActivityCount[] = [];
  const startTime = new Date('2025-01-20T00:00:00Z');

  for (let i = 0; i < days * 1440; i++) {
    const hour = Math.floor(i / 60) % 24;
    const isNight = hour >= 23 || hour < 7;
    const count = isNight ? 20 : 400;

    epochs.push({
      timestamp: startTime.getTime() + i * 60000,
      epochSeconds: 60,
      count: Math.round(count + Math.random() * 50),
      vectorMagnitude: count / 1000,
      steps: Math.round(count / 100),
      isWorn: true,
    });
  }

  const dailySummaries: IDailyActigraphySummary[] = [];
  for (let d = 0; d < days; d++) {
    dailySummaries.push({
      date: new Date(startTime.getTime() + d * 86400000).toISOString().split('T')[0],
      totalActivityCounts: 50000,
      totalSteps: 8000,
      sedentaryMinutes: 480,
      lightActivityMinutes: 360,
      moderateActivityMinutes: 45,
      vigorousActivityMinutes: 15,
      mvpaMinutes: 60,
      nonWearMinutes: 60,
      validWearHours: 16,
    });
  }

  return {
    userId: 'test-user',
    sessionId: 'test-session',
    source: 'apple_watch',
    startTime,
    endTime: new Date(startTime.getTime() + days * 86400000),
    epochLength: 60,
    epochs,
    dailySummaries,
    dataQuality: 0.95,
  };
}
