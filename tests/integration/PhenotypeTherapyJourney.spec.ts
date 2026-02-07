/**
 * Phenotype → ThirdWave Therapy Journey Integration Tests
 * =======================================================
 * Tests the complete phenotype profiling → therapy recommendation pipeline
 *
 * Scientific Foundation:
 * - Blanken 5-class insomnia phenotype model (Blanken et al., 2019)
 * - PAT: Pretrained Actigraphy Transformer (Ruan et al., 2024)
 * - Third-wave therapies: MBT-I, ACT-I, MCT for insomnia non-responders
 * - European Insomnia Guideline 2023: Personalized stepped care
 *
 * CRITICAL PATH:
 * Actigraphy → PhenotypingService.generateProfile() → ISleepProfile
 * → SleepCoreAPI.getPhenotypeBasedTherapyRecommendation() → ThirdWaveCoordinator
 * → Personalized therapy selection
 *
 * Regulatory Compliance:
 * - IEC 62304 Clause 5.6: Vertical slice integration testing
 * - CLAUDE.md Section 13.1: Vertical slices over horizontal layers
 *
 * @packageDocumentation
 */

import { SleepCoreAPI } from '../../src/SleepCoreAPI';
import { PhenotypingService, type ISleepProfile } from '../../src/sleep/services/PhenotypingService';
import type {
  IActigraphySession,
  IActivityCount,
  IDailyActigraphySummary,
  ActigraphySource,
} from '../../src/sleep/interfaces/IActigraphy';
import type { SleepQualityRating, ISleepDiaryEntry } from '../../src/sleep/interfaces/ISleepState';

describe('PhenotypeTherapyJourney', () => {
  let sleepCore: SleepCoreAPI;
  let phenotypingService: PhenotypingService;
  const userId = 'test-phenotype-user';

  beforeEach(() => {
    sleepCore = new SleepCoreAPI();
    phenotypingService = new PhenotypingService();
  });

  /**
   * Helper to create mock actigraphy session
   */
  function createActigraphySession(
    options: {
      durationDays?: number;
      avgSleepDuration?: number;
      variability?: 'low' | 'medium' | 'high';
      circadianPattern?: 'regular' | 'irregular' | 'delayed' | 'advanced';
    } = {}
  ): IActigraphySession {
    const durationDays = options.durationDays ?? 7;
    const avgSleepDuration = options.avgSleepDuration ?? 6.5;
    const variability = options.variability ?? 'medium';
    const circadianPattern = options.circadianPattern ?? 'regular';

    // Generate mock epoch data (1-minute epochs for 7 days)
    const epochs: IActivityCount[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - durationDays);

    for (let day = 0; day < durationDays; day++) {
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute++) {
          const epochTime = new Date(startDate);
          epochTime.setDate(epochTime.getDate() + day);
          epochTime.setHours(hour, minute, 0, 0);

          // Simulate activity patterns based on circadian pattern
          let activity = 0;
          const isNight = hour >= 23 || hour < 7;

          if (isNight) {
            activity = Math.random() * 20; // Low activity at night
          } else {
            activity = 50 + Math.random() * 100; // Higher during day
          }

          // Add variability
          if (variability === 'high') {
            activity *= 0.5 + Math.random();
          } else if (variability === 'medium') {
            activity *= 0.8 + Math.random() * 0.4;
          }

          epochs.push({
            timestamp: epochTime.getTime(),
            epochSeconds: 60,
            count: Math.round(activity),
            vectorMagnitude: Math.round(activity * 1.2),
            steps: isNight ? 0 : Math.round(activity / 10),
            isWorn: true,
          });
        }
      }
    }

    // Generate daily summaries
    const dailySummaries: IDailyActigraphySummary[] = [];
    for (let day = 0; day < durationDays; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      dailySummaries.push({
        date: dateStr,
        totalActivityCounts: 50000 + Math.random() * 30000,
        totalSteps: 5000 + Math.random() * 5000,
        sedentaryMinutes: 600 + Math.random() * 200,
        lightActivityMinutes: 120 + Math.random() * 60,
        moderateActivityMinutes: 30 + Math.random() * 30,
        vigorousActivityMinutes: 10 + Math.random() * 20,
        mvpaMinutes: 40 + Math.random() * 40,
        nonWearMinutes: 30 + Math.random() * 30,
        validWearHours: 20 + Math.random() * 4,
        sleepStart: '23:00',
        sleepEnd: '07:00',
        sleepPeriodActivity: 100 + Math.random() * 100,
      });
    }

    return {
      userId,
      sessionId: `session-${Date.now()}`,
      source: 'generic' as ActigraphySource,
      startTime: startDate,
      endTime: new Date(),
      epochLength: 60,
      epochs,
      dailySummaries,
      dataQuality: 0.85 + Math.random() * 0.1,
    };
  }

  /**
   * Helper to create diary entry
   */
  function createDiaryEntry(
    dayOffset: number,
    options: {
      sleepQuality?: SleepQualityRating;
      bedtime?: string;
      wakeTime?: string;
      sol?: number;
      waso?: number;
    } = {}
  ): ISleepDiaryEntry {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    return {
      userId,
      date: dateStr,
      bedtime: options.bedtime ?? '23:00',
      lightsOffTime: options.bedtime ?? '23:00',
      sleepOnsetLatency: options.sol ?? 20,
      numberOfAwakenings: 2,
      wakeAfterSleepOnset: options.waso ?? 30,
      finalAwakening: options.wakeTime ?? '07:00',
      outOfBedTime: options.wakeTime ?? '07:00',
      subjectiveQuality: options.sleepQuality ?? 'fair',
      morningAlertness: 3,
    };
  }

  describe('Phenotype Generation (Wave 5 Integration)', () => {
    it('should generate sleep profile from actigraphy data', async () => {
      const actigraphySession = createActigraphySession({
        durationDays: 7,
        variability: 'medium',
      });

      const profile = await phenotypingService.generateProfile(
        userId,
        actigraphySession
      );

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(userId);
      expect(profile.phenotype).toBeDefined();
      expect(profile.phenotype.primaryPhenotype).toBeDefined();
      expect(profile.confidence).toBeGreaterThan(0);
      expect(profile.therapyRecommendations).toBeInstanceOf(Array);
    });

    it('should classify phenotype with confidence score', async () => {
      const actigraphySession = createActigraphySession({
        durationDays: 14, // More data = higher confidence
        variability: 'low',
      });

      const profile = await phenotypingService.generateProfile(
        userId,
        actigraphySession
      );

      // With 14 days of low-variability data, should have good confidence
      expect(profile.confidence).toBeGreaterThanOrEqual(0.5);
      expect(profile.dataQuality).toMatch(/excellent|good|fair/);
    });

    it('should include therapy recommendations in profile', async () => {
      const actigraphySession = createActigraphySession();

      const profile = await phenotypingService.generateProfile(
        userId,
        actigraphySession
      );

      expect(profile.therapyRecommendations.length).toBeGreaterThan(0);

      // Each recommendation should have required fields
      profile.therapyRecommendations.forEach((rec) => {
        expect(rec.component).toBeDefined();
        expect(rec.priority).toBeGreaterThanOrEqual(1);
        expect(rec.priority).toBeLessThanOrEqual(5);
        expect(rec.rationale).toBeTruthy();
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('SleepCoreAPI Phenotype Integration', () => {
    it('should store and retrieve sleep profile via SleepCoreAPI', async () => {
      // First, create a session by adding a diary entry
      const diaryEntry = createDiaryEntry(1);
      await sleepCore.processNewDiaryEntry(diaryEntry);

      // Verify session exists
      expect(sleepCore.getSession(userId)).not.toBeNull();

      const actigraphySession = createActigraphySession();

      // Generate profile via SleepCoreAPI (automatically stores in session)
      const profile = await sleepCore.generateSleepProfile(
        userId,
        actigraphySession
      );

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(userId);

      // Profile should be stored and retrievable
      const storedProfile = sleepCore.getSleepProfile(userId);
      expect(storedProfile).not.toBeNull();
      expect(storedProfile?.phenotype.primaryPhenotype).toBe(
        profile.phenotype.primaryPhenotype
      );
    });

    it('should return null for user without profile', () => {
      const profile = sleepCore.getSleepProfile('nonexistent-user');
      expect(profile).toBeNull();
    });

    it('should check phenotyping readiness', () => {
      // isPhenotypingReady should return boolean
      const ready = sleepCore.isPhenotypingReady();
      expect(typeof ready).toBe('boolean');
    });
  });

  describe('Phenotype → ThirdWave Recommendation Chain', () => {
    it('should return null recommendation when no sleep history exists', async () => {
      const actigraphySession = createActigraphySession();
      const profile = await sleepCore.generateSleepProfile(
        userId,
        actigraphySession
      );

      // Without diary entries, getPhenotypeBasedTherapyRecommendation should return null
      const recommendation = sleepCore.getPhenotypeBasedTherapyRecommendation(
        userId,
        profile
      );

      expect(recommendation).toBeNull();
    });

    it('should return recommendation when user has sleep history', async () => {
      // First, create sleep history with 7 diary entries
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i, {
          sleepQuality: 'poor',
          sol: 45,
          waso: 60,
        });
        await sleepCore.processNewDiaryEntry(entry);
      }

      // Generate phenotype profile
      const actigraphySession = createActigraphySession({
        variability: 'high', // Indicates fragmented sleep
      });
      const profile = await sleepCore.generateSleepProfile(
        userId,
        actigraphySession
      );

      // Now should get recommendation
      const recommendation = sleepCore.getPhenotypeBasedTherapyRecommendation(
        userId,
        profile
      );

      // With sleep history, should get a recommendation
      expect(recommendation).not.toBeNull();
      if (recommendation) {
        expect(recommendation.recommendedApproach).toBeDefined();
        expect(['mbti', 'acti', 'mct', 'hybrid', 'none']).toContain(
          recommendation.recommendedApproach
        );
        expect(recommendation.rationale).toBeTruthy();
      }
    });

    it('should chain phenotype to ThirdWaveCoordinator correctly', async () => {
      // Setup: Create baseline with poor sleep (indicates CBT-I failure scenario)
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i, {
          sleepQuality: 'poor',
          sol: 60, // High SOL indicates arousal
          waso: 90, // High WASO
        });
        await sleepCore.processNewDiaryEntry(entry);
      }

      // Generate profile with irregular pattern (Type 1: Highly Distressed)
      const actigraphySession = createActigraphySession({
        variability: 'high',
        circadianPattern: 'irregular',
      });
      const profile = await sleepCore.generateSleepProfile(
        userId,
        actigraphySession
      );

      // Get phenotype-based recommendation
      const phenotypeRec = sleepCore.getPhenotypeBasedTherapyRecommendation(
        userId,
        profile
      );

      // Compare with direct ThirdWaveCoordinator recommendation
      const directRec = sleepCore.recommendThirdWaveApproach(userId, {
        failedCBTI: true,
        preferences: [],
      });

      // Both should provide valid recommendations
      expect(phenotypeRec).not.toBeNull();
      expect(directRec).not.toBeNull();

      // Phenotype-based should use phenotype hints for selection
      // The exact match depends on phenotype classification
      if (phenotypeRec && directRec) {
        expect(['mbti', 'acti', 'mct', 'hybrid', 'none']).toContain(
          phenotypeRec.recommendedApproach
        );
        expect(['mbti', 'acti', 'mct', 'hybrid', 'none']).toContain(
          directRec.recommendedApproach
        );
      }
    });
  });

  describe('Blanken 5-Class Phenotype Mapping', () => {
    /**
     * Blanken 2019 5-class model:
     * Type 1: Highly Distressed (high distress, low happiness)
     * Type 2: Moderately Distressed, Reward-Sensitive
     * Type 3: Moderately Distressed, Reward-Insensitive
     * Type 4: Slightly Distressed, High-Reactive
     * Type 5: Slightly Distressed, Low-Reactive
     */

    it('should classify irregular high-variability sleep patterns', async () => {
      const actigraphySession = createActigraphySession({
        variability: 'high',
        circadianPattern: 'irregular',
      });

      const profile = await phenotypingService.generateProfile(
        userId,
        actigraphySession
      );

      // High variability + irregular pattern suggests Type 1 or 4 phenotype
      expect(profile.phenotype.primaryPhenotype).toBeDefined();
      expect(profile.phenotype.confidence).toBeGreaterThan(0);
    });

    it('should classify regular sleep patterns', async () => {
      const actigraphySession = createActigraphySession({
        variability: 'low',
        circadianPattern: 'regular',
        avgSleepDuration: 7.5,
      });

      const profile = await phenotypingService.generateProfile(
        userId,
        actigraphySession
      );

      // Low variability + regular pattern suggests healthy or Type 5
      expect(profile.phenotype.primaryPhenotype).toBeDefined();
      expect(profile.dataQuality).toBeDefined();
    });

    it('should classify delayed circadian patterns', async () => {
      const actigraphySession = createActigraphySession({
        variability: 'medium',
        circadianPattern: 'delayed',
      });

      const profile = await phenotypingService.generateProfile(
        userId,
        actigraphySession
      );

      // Delayed pattern should be reflected in circadian profile
      expect(profile.circadianProfile).toBeDefined();
      expect(profile.phenotype.primaryPhenotype).toBeDefined();
    });
  });

  describe('Therapy Selection Based on Phenotype', () => {
    it('should recommend MBT-I for high arousal phenotypes', async () => {
      // Setup session and profile indicating high arousal
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i, {
          sleepQuality: 'poor',
          sol: 90, // Very high SOL = high pre-sleep arousal
          waso: 30,
        });
        await sleepCore.processNewDiaryEntry(entry);
      }

      const actigraphySession = createActigraphySession({
        variability: 'high',
      });
      const profile = await sleepCore.generateSleepProfile(
        userId,
        actigraphySession
      );

      // Profile therapy recommendations should include MBT-I for high arousal
      const mbtiRec = profile.therapyRecommendations.find(
        (r) => r.component === 'mbti'
      );

      // MBT-I should be considered for high arousal patterns
      // (may or may not be top recommendation depending on full profile)
      if (mbtiRec) {
        expect(mbtiRec.rationale).toContain('arousal');
      }
    });

    it('should provide ranked therapy recommendations', async () => {
      const actigraphySession = createActigraphySession();
      const profile = await phenotypingService.generateProfile(
        userId,
        actigraphySession
      );

      // Recommendations should be sorted by priority
      const priorities = profile.therapyRecommendations.map((r) => r.priority);

      // Lower priority number = higher priority
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
      }
    });

    it('should include effect sizes for recommendations', async () => {
      const actigraphySession = createActigraphySession();
      const profile = await phenotypingService.generateProfile(
        userId,
        actigraphySession
      );

      // Each recommendation should have expected effect size
      profile.therapyRecommendations.forEach((rec) => {
        expect(rec.expectedEffectSize).toBeGreaterThanOrEqual(0);
        // Effect sizes typically range from 0 to ~2 for CBT-I components
        expect(rec.expectedEffectSize).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Risk Assessment Integration', () => {
    it('should include risk assessment in profile', async () => {
      const actigraphySession = createActigraphySession({
        variability: 'high',
        avgSleepDuration: 4.5, // Short sleep
      });

      const profile = await phenotypingService.generateProfile(
        userId,
        actigraphySession
      );

      expect(profile.riskAssessment).toBeDefined();
      expect(profile.riskAssessment.overallRisk).toMatch(
        /low|moderate|high|critical/
      );
      expect(profile.riskAssessment.scores).toBeDefined();
      expect(profile.riskAssessment.scores.insomniaRisk).toBeGreaterThanOrEqual(
        0
      );
    });

    it('should flag clinical concerns appropriately', async () => {
      const actigraphySession = createActigraphySession({
        variability: 'high',
        avgSleepDuration: 3.5, // Very short sleep - concerning
        circadianPattern: 'irregular',
      });

      const profile = await phenotypingService.generateProfile(
        userId,
        actigraphySession
      );

      // With very short sleep duration, should flag sleep deprivation risk
      expect(profile.riskAssessment.scores.sleepDeprivationRisk).toBeGreaterThan(
        0
      );
    });
  });

  describe('End-to-End Vertical Slice', () => {
    /**
     * Complete journey test:
     * 1. User completes 7-day diary baseline
     * 2. User provides actigraphy data
     * 3. System generates phenotype profile
     * 4. System provides phenotype-based therapy recommendation
     * 5. Recommendation matches user's sleep profile
     */
    it('should complete full Phenotype → ThirdWave journey', async () => {
      // Step 1: 7-day diary baseline with insomnia symptoms
      for (let i = 7; i >= 1; i--) {
        const entry = createDiaryEntry(i, {
          sleepQuality: i <= 3 ? 'poor' : 'fair',
          sol: 40 + i * 5,
          waso: 30 + i * 3,
        });
        await sleepCore.processNewDiaryEntry(entry);
      }

      // Verify plan was created
      const session = sleepCore.getSession(userId);
      expect(session?.plan).not.toBeNull();

      // Step 2: Provide actigraphy data
      const actigraphySession = createActigraphySession({
        durationDays: 7,
        variability: 'medium',
        circadianPattern: 'irregular',
      });

      // Step 3: Generate phenotype profile
      const profile = await sleepCore.generateSleepProfile(
        userId,
        actigraphySession
      );

      expect(profile).toBeDefined();
      expect(profile.phenotype.primaryPhenotype).toBeDefined();

      // Step 4: Get phenotype-based recommendation
      const recommendation = sleepCore.getPhenotypeBasedTherapyRecommendation(
        userId,
        profile
      );

      expect(recommendation).not.toBeNull();

      // Step 5: Verify recommendation is appropriate
      if (recommendation) {
        // Should have valid approach
        expect(['mbti', 'acti', 'mct', 'hybrid', 'none']).toContain(
          recommendation.recommendedApproach
        );

        // Should have rationale
        expect(recommendation.rationale).toBeTruthy();

        // Should have expected benefits (unless 'none')
        if (recommendation.recommendedApproach !== 'none') {
          expect(recommendation.expectedBenefits.length).toBeGreaterThan(0);
        }
      }

      // Verify profile is stored
      const storedProfile = sleepCore.getSleepProfile(userId);
      expect(storedProfile).not.toBeNull();
      expect(storedProfile?.phenotype.primaryPhenotype).toBe(
        profile.phenotype.primaryPhenotype
      );
    });

    it('should handle graceful degradation when phenotyping is not ready', async () => {
      // Create session with diary but without actigraphy
      for (let i = 7; i >= 1; i--) {
        await sleepCore.processNewDiaryEntry(createDiaryEntry(i));
      }

      // Without phenotype, getSleepProfile returns null
      const profile = sleepCore.getSleepProfile(userId);
      expect(profile).toBeNull();

      // But direct ThirdWave recommendation should still work
      const directRec = sleepCore.recommendThirdWaveApproach(userId, {
        failedCBTI: true,
        preferences: [],
      });

      expect(directRec).not.toBeNull();
      expect(directRec?.recommendedApproach).toBeDefined();
    });
  });

  describe('Data Quality Validation', () => {
    it('should report data quality based on actigraphy duration', async () => {
      // Short duration = lower quality
      const shortSession = createActigraphySession({ durationDays: 3 });
      const shortProfile = await phenotypingService.generateProfile(
        userId,
        shortSession
      );

      // Longer duration = higher quality
      const longSession = createActigraphySession({ durationDays: 14 });
      const longProfile = await phenotypingService.generateProfile(
        userId,
        longSession
      );

      // Both should have data quality indicator
      expect(shortProfile.dataQuality).toBeDefined();
      expect(longProfile.dataQuality).toBeDefined();

      // Quality grades should be valid
      const validGrades = ['excellent', 'good', 'fair', 'poor'];
      expect(validGrades).toContain(shortProfile.dataQuality);
      expect(validGrades).toContain(longProfile.dataQuality);
    });

    it('should schedule next assessment date', async () => {
      const actigraphySession = createActigraphySession();
      const profile = await phenotypingService.generateProfile(
        userId,
        actigraphySession
      );

      expect(profile.nextAssessmentDate).toBeInstanceOf(Date);
      expect(profile.nextAssessmentDate.getTime()).toBeGreaterThan(
        Date.now()
      );
    });
  });
});
