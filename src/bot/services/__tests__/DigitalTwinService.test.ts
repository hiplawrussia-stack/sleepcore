/**
 * DigitalTwinService Tests
 * ========================
 *
 * Tests for patient digital twin simulation service.
 * Validates twin lifecycle, trajectory prediction, tipping points.
 *
 * Research basis: NASEM Digital Twin, PNAS Critical Slowing Down
 *
 * @packageDocumentation
 */

import {
  DigitalTwinService,
  createDigitalTwinService,
  digitalTwinService,
  type IDigitalTwin,
  type IScenario,
} from '../DigitalTwinService';

// Mock sleepPredictionService
const mockPrediction = {
  trend: 'stable' as const,
  deteriorationRisk: 0.2,
  predictedSleepEfficiency: { value: 78, confidence: 0.7 },
  sleepEfficiencyTrajectory: [
    { date: new Date(), predicted: 78 },
    { date: new Date(Date.now() + 86400000), predicted: 79 },
    { date: new Date(Date.now() + 86400000 * 2), predicted: 80 },
    { date: new Date(Date.now() + 86400000 * 3), predicted: 81 },
    { date: new Date(Date.now() + 86400000 * 4), predicted: 82 },
    { date: new Date(Date.now() + 86400000 * 5), predicted: 83 },
    { date: new Date(Date.now() + 86400000 * 6), predicted: 84 },
  ],
  earlyWarnings: [],
};

/**
 * Create full ISleepMetrics object
 */
function createMetrics(se: number, sol: number, waso: number, tst: number) {
  return {
    sleepEfficiency: se,
    sleepOnsetLatency: sol,
    wakeAfterSleepOnset: waso,
    totalSleepTime: tst,
    timeInBed: Math.round(tst / (se / 100)),
    numberOfAwakenings: 2,
    bedtime: '23:00',
    wakeTime: '07:00',
    finalAwakening: '06:45',
    outOfBedTime: '07:00',
  };
}

const mockHistory = [
  {
    userId: 'test_user',
    date: new Date(Date.now() - 86400000 * 7),
    metrics: createMetrics(72, 25, 30, 360),
    subjectiveQuality: 0.5,
  },
  {
    userId: 'test_user',
    date: new Date(Date.now() - 86400000 * 6),
    metrics: createMetrics(74, 22, 28, 370),
    subjectiveQuality: 0.5,
  },
  {
    userId: 'test_user',
    date: new Date(Date.now() - 86400000 * 5),
    metrics: createMetrics(76, 20, 25, 380),
    subjectiveQuality: 0.6,
  },
  {
    userId: 'test_user',
    date: new Date(Date.now() - 86400000 * 4),
    metrics: createMetrics(75, 21, 27, 375),
    subjectiveQuality: 0.55,
  },
  {
    userId: 'test_user',
    date: new Date(Date.now() - 86400000 * 3),
    metrics: createMetrics(77, 19, 24, 385),
    subjectiveQuality: 0.6,
  },
  {
    userId: 'test_user',
    date: new Date(Date.now() - 86400000 * 2),
    metrics: createMetrics(78, 18, 22, 390),
    subjectiveQuality: 0.65,
  },
  {
    userId: 'test_user',
    date: new Date(Date.now() - 86400000),
    metrics: createMetrics(79, 17, 20, 400),
    subjectiveQuality: 0.7,
  },
];

jest.mock('../SleepPredictionService', () => ({
  sleepPredictionService: {
    getHistory: jest.fn(() => mockHistory),
    getCurrentState: jest.fn(() => null),
    predict: jest.fn(() => mockPrediction),
    addSleepEntry: jest.fn(),
    simulateIntervention: jest.fn(() => null),
  },
}));

describe('DigitalTwinService', () => {
  let service: DigitalTwinService;
  const testUserId = 'user_test_123';

  beforeEach(() => {
    service = new DigitalTwinService();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Twin Lifecycle
  // ==========================================================================
  describe('Twin Lifecycle', () => {
    it('should create twin for user', async () => {
      const twin = await service.createTwin(testUserId);

      expect(twin).toBeDefined();
      expect(twin.userId).toBe(testUserId);
      expect(twin.createdAt).toBeInstanceOf(Date);
      expect(twin.lastUpdatedAt).toBeInstanceOf(Date);
    });

    it('should return existing twin if already created', async () => {
      const twin1 = await service.createTwin(testUserId);
      const twin2 = await service.createTwin(testUserId);

      expect(twin1).toBe(twin2); // Same reference
    });

    it('should mark twin as ready when enough data', async () => {
      const twin = await service.createTwin(testUserId);

      // With 7 entries in mock history, twin should be ready (>= 3)
      expect(twin.isReady).toBe(true);
      expect(twin.observationCount).toBe(7);
    });

    it('should calculate state quality based on history length', async () => {
      const twin = await service.createTwin(testUserId);

      // 7 entries = quality 0.5 (< 14)
      expect(twin.stateQuality).toBeGreaterThanOrEqual(0.5);
    });

    it('should get existing twin', async () => {
      await service.createTwin(testUserId);

      const twin = service.getTwin(testUserId);

      expect(twin).not.toBeNull();
      expect(twin?.userId).toBe(testUserId);
    });

    it('should return null for non-existent twin', () => {
      const twin = service.getTwin('non_existent');

      expect(twin).toBeNull();
    });
  });

  // ==========================================================================
  // Twin Properties
  // ==========================================================================
  describe('Twin Properties', () => {
    it('should have current metrics from history', async () => {
      const twin = await service.createTwin(testUserId);

      expect(twin.currentMetrics).not.toBeNull();
      expect(twin.currentMetrics?.sleepEfficiency).toBe(79); // Last entry
    });

    it('should have trend from prediction', async () => {
      const twin = await service.createTwin(testUserId);

      expect(['improving', 'stable', 'declining', 'critical']).toContain(twin.trend);
    });

    it('should have risk level', async () => {
      const twin = await service.createTwin(testUserId);

      expect(['low', 'moderate', 'high', 'critical']).toContain(twin.riskLevel);
    });
  });

  // ==========================================================================
  // Twin Update
  // ==========================================================================
  describe('Twin Update', () => {
    it('should update twin with new observation', async () => {
      await service.createTwin(testUserId);

      const newMetrics = createMetrics(82, 15, 18, 420);

      const updatedTwin = await service.updateTwin(testUserId, newMetrics, 0.75);

      expect(updatedTwin).toBeDefined();
      expect(updatedTwin.userId).toBe(testUserId);
    });
  });

  // ==========================================================================
  // Trajectory Prediction
  // ==========================================================================
  describe('Trajectory Prediction', () => {
    it('should predict trajectory for ready twin', async () => {
      await service.createTwin(testUserId);

      const trajectory = await service.predictTrajectory(testUserId, 7);

      expect(trajectory).not.toBeNull();
      expect(trajectory?.userId).toBe(testUserId);
      expect(trajectory?.horizonDays).toBe(7);
    });

    it('should include daily predictions', async () => {
      await service.createTwin(testUserId);

      const trajectory = await service.predictTrajectory(testUserId, 7);

      expect(trajectory?.dailyPredictions.length).toBe(7);
      trajectory?.dailyPredictions.forEach(pred => {
        expect(pred.date).toBeInstanceOf(Date);
        expect(typeof pred.sleepEfficiency).toBe('number');
        expect(typeof pred.confidence).toBe('number');
        expect(['up', 'down', 'stable']).toContain(pred.trend);
      });
    });

    it('should have overall trend', async () => {
      await service.createTwin(testUserId);

      const trajectory = await service.predictTrajectory(testUserId, 7);

      expect(['improving', 'stable', 'declining', 'critical']).toContain(trajectory?.overallTrend);
    });

    it('should return null for unready twin', async () => {
      // Mock empty history
      const { sleepPredictionService } = require('../SleepPredictionService');
      sleepPredictionService.getHistory.mockReturnValueOnce([]);

      const trajectory = await service.predictTrajectory('new_user', 7);

      expect(trajectory).toBeNull();
    });
  });

  // ==========================================================================
  // Tipping Point Detection
  // ==========================================================================
  describe('Tipping Point Detection', () => {
    it('should detect tipping points for ready twin', async () => {
      await service.createTwin(testUserId);

      const tippingPoints = await service.detectTippingPoints(testUserId);

      expect(Array.isArray(tippingPoints)).toBe(true);
    });

    it('should return empty array for unready twin', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');
      sleepPredictionService.getHistory.mockReturnValueOnce([]);

      const tippingPoints = await service.detectTippingPoints('new_user');

      expect(tippingPoints).toEqual([]);
    });

    it('should detect improvement tipping point when SE high', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');

      // Need to set mock before twin creation (which calls predict)
      const improvingPrediction = {
        ...mockPrediction,
        trend: 'improving' as const,
        predictedSleepEfficiency: { value: 88, confidence: 0.8 },
      };
      sleepPredictionService.predict.mockReturnValue(improvingPrediction);

      // Create fresh service to get twin with mocked prediction
      const freshService = new DigitalTwinService();
      const tippingPoints = await freshService.detectTippingPoints(testUserId);

      const improvementPoint = tippingPoints.find(tp => tp.type === 'improvement');
      expect(improvementPoint).toBeDefined();

      // Restore default mock
      sleepPredictionService.predict.mockReturnValue(mockPrediction);
    });
  });

  // ==========================================================================
  // Scenario Simulation
  // ==========================================================================
  describe('Scenario Simulation', () => {
    it('should simulate intervention', async () => {
      await service.createTwin(testUserId);

      const result = await service.simulateIntervention(testUserId, 'bed_restriction', 7);

      expect(result).not.toBeNull();
      expect(result?.scenario.intervention).toBe('bed_restriction');
    });

    it('should simulate custom scenario', async () => {
      await service.createTwin(testUserId);

      const scenario: IScenario = {
        name: 'Test Scenario',
        description: 'Testing scenario simulation',
        intervention: 'relaxation_pmr',
        durationDays: 14,
        adherenceLevel: 0.9,
      };

      const result = await service.simulateScenario(testUserId, scenario);

      expect(result).not.toBeNull();
      expect(result?.scenario.name).toBe('Test Scenario');
    });

    it('should include predicted outcome', async () => {
      await service.createTwin(testUserId);

      const result = await service.simulateIntervention(testUserId, 'adjust_sleep_window', 7);

      expect(result?.predictedOutcome).toBeDefined();
      expect(typeof result?.predictedOutcome.sleepEfficiency).toBe('number');
      expect(typeof result?.predictedOutcome.sleepEfficiencyChange).toBe('number');
      expect(['improving', 'stable', 'declining']).toContain(result?.predictedOutcome.trend);
    });

    it('should include confidence', async () => {
      await service.createTwin(testUserId);

      const result = await service.simulateIntervention(testUserId, 'caffeine_education', 7);

      expect(typeof result?.confidence).toBe('number');
      expect(result?.confidence).toBeGreaterThanOrEqual(0);
      expect(result?.confidence).toBeLessThanOrEqual(1);
    });

    it('should return null for unready twin', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');
      sleepPredictionService.getHistory.mockReturnValueOnce([]);

      const result = await service.simulateIntervention('new_user', 'bed_restriction', 7);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Scenario Comparison
  // ==========================================================================
  describe('Scenario Comparison', () => {
    it('should compare multiple scenarios', async () => {
      await service.createTwin(testUserId);

      const scenarios: IScenario[] = [
        {
          name: 'Scenario A',
          description: 'First scenario',
          intervention: 'bed_restriction',
          durationDays: 7,
          adherenceLevel: 0.8,
        },
        {
          name: 'Scenario B',
          description: 'Second scenario',
          intervention: 'relaxation_breathing',
          durationDays: 7,
          adherenceLevel: 0.9,
        },
      ];

      const comparison = await service.compareScenarios(testUserId, scenarios);

      expect(comparison).not.toBeNull();
      expect(comparison?.scenarios.length).toBe(2);
      expect(comparison?.results.length).toBe(2);
    });

    it('should identify best scenario', async () => {
      await service.createTwin(testUserId);

      const scenarios: IScenario[] = [
        {
          name: 'Less Effective',
          description: 'Lower adherence',
          intervention: 'no_intervention',
          durationDays: 7,
          adherenceLevel: 0.5,
        },
        {
          name: 'More Effective',
          description: 'Higher impact',
          intervention: 'bed_restriction',
          durationDays: 7,
          adherenceLevel: 0.9,
        },
      ];

      const comparison = await service.compareScenarios(testUserId, scenarios);

      expect(comparison?.bestScenario).toBeDefined();
      expect(comparison?.bestScenario.name).toBe('More Effective');
    });

    it('should include explanation', async () => {
      await service.createTwin(testUserId);

      const scenarios: IScenario[] = [
        {
          name: 'Test',
          description: 'Test scenario',
          intervention: 'adjust_sleep_window',
          durationDays: 7,
          adherenceLevel: 0.8,
        },
      ];

      const comparison = await service.compareScenarios(testUserId, scenarios);

      expect(comparison?.explanation).toBeDefined();
      expect(comparison?.explanationRu).toBeDefined();
    });

    it('should return null for empty scenarios', async () => {
      const comparison = await service.compareScenarios(testUserId, []);

      expect(comparison).toBeNull();
    });
  });

  // ==========================================================================
  // Statistics
  // ==========================================================================
  describe('Statistics', () => {
    it('should return service statistics', async () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('activeTwins');
      expect(stats).toHaveProperty('averageObservations');
      expect(stats).toHaveProperty('readyTwins');
    });

    it('should count active twins', async () => {
      await service.createTwin('user1');
      await service.createTwin('user2');

      const stats = service.getStats();

      expect(stats.activeTwins).toBe(2);
    });

    it('should calculate average observations', async () => {
      await service.createTwin('user1');
      await service.createTwin('user2');

      const stats = service.getStats();

      expect(stats.averageObservations).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Factory and Singleton
  // ==========================================================================
  describe('Factory and Singleton', () => {
    it('should create service via factory', () => {
      const created = createDigitalTwinService();

      expect(created).toBeInstanceOf(DigitalTwinService);
    });

    it('should export singleton instance', () => {
      expect(digitalTwinService).toBeInstanceOf(DigitalTwinService);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle prediction returning null', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');

      // First call for createTwin returns default, second call for trajectory returns null
      sleepPredictionService.predict
        .mockReturnValueOnce(mockPrediction) // For createTwin
        .mockReturnValueOnce(null); // For predictTrajectory

      const freshService = new DigitalTwinService();
      await freshService.createTwin(testUserId);
      const trajectory = await freshService.predictTrajectory(testUserId, 7);

      expect(trajectory).toBeNull();
    });

    it('should handle all intervention types', async () => {
      await service.createTwin(testUserId);

      const interventions = [
        'adjust_sleep_window',
        'enforce_wake_time',
        'leave_bed_reminder',
        'bed_restriction',
        'challenge_belief',
        'behavioral_experiment',
        'caffeine_education',
        'environment_advice',
        'relaxation_pmr',
        'relaxation_breathing',
        'relaxation_imagery',
        'no_intervention',
      ] as const;

      for (const intervention of interventions) {
        const result = await service.simulateIntervention(testUserId, intervention, 7);
        expect(result).not.toBeNull();
      }
    });

    it('should handle short trajectory horizon', async () => {
      await service.createTwin(testUserId);

      const trajectory = await service.predictTrajectory(testUserId, 3);

      expect(trajectory?.horizonDays).toBe(3);
      expect(trajectory?.dailyPredictions.length).toBe(3);
    });

    it('should handle different adherence levels', async () => {
      await service.createTwin(testUserId);

      const lowAdherence: IScenario = {
        name: 'Low',
        description: 'Low adherence',
        intervention: 'bed_restriction',
        durationDays: 7,
        adherenceLevel: 0.3,
      };

      const highAdherence: IScenario = {
        name: 'High',
        description: 'High adherence',
        intervention: 'bed_restriction',
        durationDays: 7,
        adherenceLevel: 0.95,
      };

      const lowResult = await service.simulateScenario(testUserId, lowAdherence);
      const highResult = await service.simulateScenario(testUserId, highAdherence);

      expect(highResult?.predictedOutcome.sleepEfficiencyChange).toBeGreaterThan(
        lowResult?.predictedOutcome.sleepEfficiencyChange ?? 0
      );
    });
  });

  // ==========================================================================
  // Repository Integration
  // ==========================================================================
  describe('Repository Integration', () => {
    let mockRepo: {
      findAll: jest.Mock;
      upsert: jest.Mock;
    };

    beforeEach(() => {
      mockRepo = {
        findAll: jest.fn(),
        upsert: jest.fn().mockResolvedValue(undefined),
      };
    });

    it('should load twins from database on setRepository', async () => {
      mockRepo.findAll.mockResolvedValue([
        {
          userId: 'db_user_1',
          twinCreatedAt: new Date(),
          lastUpdatedAt: new Date(),
          observationCount: 10,
          stateQuality: 0.7,
          isReady: true,
          currentMetricsJson: JSON.stringify(createMetrics(80, 15, 20, 400)),
          trend: 'stable',
          riskLevel: 'low',
        },
        {
          userId: 'db_user_2',
          twinCreatedAt: new Date(),
          lastUpdatedAt: new Date(),
          observationCount: 5,
          stateQuality: 0.5,
          isReady: true,
          currentMetricsJson: null,
          trend: 'improving',
          riskLevel: 'moderate',
        },
      ]);

      const freshService = new DigitalTwinService();
      await freshService.setRepository(mockRepo as any);

      expect(mockRepo.findAll).toHaveBeenCalled();
      expect(freshService.getTwin('db_user_1')).not.toBeNull();
      expect(freshService.getTwin('db_user_2')).not.toBeNull();
    });

    it('should handle empty database', async () => {
      mockRepo.findAll.mockResolvedValue([]);

      const freshService = new DigitalTwinService();
      await freshService.setRepository(mockRepo as any);

      expect(mockRepo.findAll).toHaveBeenCalled();
      expect(freshService.getStats().activeTwins).toBe(0);
    });

    it('should handle database load error gracefully', async () => {
      mockRepo.findAll.mockRejectedValue(new Error('DB connection failed'));

      const freshService = new DigitalTwinService();

      // Should not throw
      await expect(freshService.setRepository(mockRepo as any)).resolves.not.toThrow();
    });

    it('should persist twin to database on create', async () => {
      mockRepo.findAll.mockResolvedValue([]);

      const freshService = new DigitalTwinService();
      await freshService.setRepository(mockRepo as any);
      await freshService.createTwin(testUserId);

      // Wait for async persist
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRepo.upsert).toHaveBeenCalled();
    });

    it('should persist twin to database on update', async () => {
      mockRepo.findAll.mockResolvedValue([]);

      const freshService = new DigitalTwinService();
      await freshService.setRepository(mockRepo as any);
      await freshService.createTwin(testUserId);
      mockRepo.upsert.mockClear();

      await freshService.updateTwin(testUserId, createMetrics(85, 12, 15, 420), 0.8);

      // Wait for async persist
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRepo.upsert).toHaveBeenCalled();
    });

    it('should handle persistence error gracefully', async () => {
      mockRepo.findAll.mockResolvedValue([]);
      mockRepo.upsert.mockRejectedValue(new Error('Write failed'));

      const freshService = new DigitalTwinService();
      await freshService.setRepository(mockRepo as any);

      // Should not throw
      await expect(freshService.createTwin(testUserId)).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Tipping Points - Advanced Cases
  // ==========================================================================
  describe('Tipping Points - Advanced Cases', () => {
    it('should return empty array when prediction is null', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');

      sleepPredictionService.predict
        .mockReturnValueOnce(mockPrediction) // For createTwin
        .mockReturnValueOnce(null); // For detectTippingPoints

      const freshService = new DigitalTwinService();
      await freshService.createTwin(testUserId);
      const tippingPoints = await freshService.detectTippingPoints(testUserId);

      expect(tippingPoints).toEqual([]);
    });

    it('should detect deterioration from high-strength warnings', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');

      const warningPrediction = {
        ...mockPrediction,
        earlyWarnings: [
          {
            metric: 'sleepEfficiency',
            severity: 'high' as const,
            strength: 0.7,
            estimatedDaysToCritical: 5,
            recommendation: 'Increase adherence',
            messageRu: 'Увеличьте приверженность',
          },
        ],
      };
      sleepPredictionService.predict.mockReturnValue(warningPrediction);

      const freshService = new DigitalTwinService();
      const tippingPoints = await freshService.detectTippingPoints(testUserId);

      const deteriorationPoint = tippingPoints.find(tp => tp.type === 'deterioration');
      expect(deteriorationPoint).toBeDefined();
      expect(deteriorationPoint?.probability).toBe(0.7);
      expect(deteriorationPoint?.estimatedDays).toBe(5);

      // Restore default mock
      sleepPredictionService.predict.mockReturnValue(mockPrediction);
    });

    it('should detect relapse risk from high variance', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');

      // Create 14+ days of history with high variance in recent 7 days
      const stableHistory = Array.from({ length: 7 }, (_, i) => ({
        userId: testUserId,
        date: new Date(Date.now() - 86400000 * (14 - i)),
        metrics: createMetrics(75, 20, 25, 380), // Stable SE
        subjectiveQuality: 0.6,
      }));

      const volatileHistory = Array.from({ length: 7 }, (_, i) => ({
        userId: testUserId,
        date: new Date(Date.now() - 86400000 * (7 - i)),
        metrics: createMetrics(50 + i * 10, 20, 25, 380), // High variance: 50, 60, 70, 80, 90, 100, 110
        subjectiveQuality: 0.5,
      }));

      const fullHistory = [...stableHistory, ...volatileHistory];
      sleepPredictionService.getHistory.mockReturnValue(fullHistory);

      const freshService = new DigitalTwinService();
      const tippingPoints = await freshService.detectTippingPoints(testUserId);

      const relapsePoint = tippingPoints.find(tp => tp.type === 'relapse');
      expect(relapsePoint).toBeDefined();
      expect(relapsePoint?.severity).toMatch(/moderate|high/);

      // Restore default mock
      sleepPredictionService.getHistory.mockReturnValue(mockHistory);
    });
  });

  // ==========================================================================
  // State Quality Calculation
  // ==========================================================================
  describe('State Quality Calculation', () => {
    it('should return quality 0.7 for 7-13 day history', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');

      // Create exactly 10 days of history
      const history10Days = Array.from({ length: 10 }, (_, i) => ({
        userId: testUserId,
        date: new Date(Date.now() - 86400000 * (10 - i)),
        metrics: createMetrics(75 + i, 20, 25, 380),
        subjectiveQuality: 0.6,
      }));

      sleepPredictionService.getHistory.mockReturnValue(history10Days);

      const freshService = new DigitalTwinService();
      const twin = await freshService.createTwin(testUserId);

      expect(twin.stateQuality).toBe(0.7);

      sleepPredictionService.getHistory.mockReturnValue(mockHistory);
    });

    it('should return quality 0.85 for 14-29 day history', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');

      // Create exactly 20 days of history
      const history20Days = Array.from({ length: 20 }, (_, i) => ({
        userId: testUserId,
        date: new Date(Date.now() - 86400000 * (20 - i)),
        metrics: createMetrics(75 + (i % 10), 20, 25, 380),
        subjectiveQuality: 0.6,
      }));

      sleepPredictionService.getHistory.mockReturnValue(history20Days);

      const freshService = new DigitalTwinService();
      const twin = await freshService.createTwin(testUserId);

      expect(twin.stateQuality).toBe(0.85);

      sleepPredictionService.getHistory.mockReturnValue(mockHistory);
    });

    it('should return quality 0.95 for 30+ day history', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');

      // Create exactly 35 days of history
      const history35Days = Array.from({ length: 35 }, (_, i) => ({
        userId: testUserId,
        date: new Date(Date.now() - 86400000 * (35 - i)),
        metrics: createMetrics(75 + (i % 10), 20, 25, 380),
        subjectiveQuality: 0.6,
      }));

      sleepPredictionService.getHistory.mockReturnValue(history35Days);

      const freshService = new DigitalTwinService();
      const twin = await freshService.createTwin(testUserId);

      expect(twin.stateQuality).toBe(0.95);

      sleepPredictionService.getHistory.mockReturnValue(mockHistory);
    });
  });

  // ==========================================================================
  // Scenario Comparison - Edge Cases
  // ==========================================================================
  describe('Scenario Comparison - Edge Cases', () => {
    it('should return null when all simulations fail', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');

      // Make getHistory return empty to cause simulation failures
      sleepPredictionService.getHistory.mockReturnValue([]);

      const scenarios: IScenario[] = [
        {
          name: 'Scenario A',
          description: 'First scenario',
          intervention: 'bed_restriction',
          durationDays: 7,
          adherenceLevel: 0.8,
        },
      ];

      const comparison = await service.compareScenarios('new_user', scenarios);

      expect(comparison).toBeNull();

      sleepPredictionService.getHistory.mockReturnValue(mockHistory);
    });
  });

  // ==========================================================================
  // PLRNN Simulation Fallback
  // ==========================================================================
  describe('PLRNN Simulation Fallback', () => {
    it('should use heuristic simulation when PLRNN returns result', async () => {
      const { sleepPredictionService } = require('../SleepPredictionService');

      // Mock PLRNN simulation to return a result
      sleepPredictionService.simulateIntervention.mockReturnValue({
        trajectory: [{ date: new Date(), predicted: 82 }],
        confidence: 0.8,
      });

      await service.createTwin(testUserId);
      const result = await service.simulateIntervention(testUserId, 'bed_restriction', 7);

      // Should have boosted confidence from PLRNN success
      expect(result).not.toBeNull();
      expect(result?.confidence).toBeGreaterThanOrEqual(0.5);

      sleepPredictionService.simulateIntervention.mockReturnValue(null);
    });
  });
});
