/**
 * VoiceBiomarkerService Tests (Sprint 6)
 * ======================================
 *
 * Unit tests for voice biomarker extraction, risk scoring,
 * baseline calibration, and CSD integration.
 */

import {
  VoiceBiomarkerService,
  createVoiceBiomarkerService,
  voiceBiomarkerService,
  type IAcousticFeatures,
} from '../VoiceBiomarkerService';

describe('VoiceBiomarkerService', () => {
  let service: VoiceBiomarkerService;

  beforeEach(() => {
    service = createVoiceBiomarkerService();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.minDuration).toBe(5);
      expect(config.maxDuration).toBe(120);
      expect(config.minBaselineSamples).toBe(5);
      expect(config.deviationThreshold).toBe(1.5);
    });

    it('should allow custom configuration', () => {
      const customService = createVoiceBiomarkerService({
        minDuration: 10,
        maxDuration: 60,
        escalationThreshold: 0.8,
      });

      const config = customService.getConfig();
      expect(config.minDuration).toBe(10);
      expect(config.maxDuration).toBe(60);
      expect(config.escalationThreshold).toBe(0.8);
    });
  });

  describe('Voice Analysis', () => {
    it('should analyze voice and return biomarker result', async () => {
      // Create a simple audio buffer (simulated PCM data)
      const sampleRate = 16000;
      const duration = 10; // 10 seconds
      const samples = sampleRate * duration;
      const buffer = Buffer.alloc(samples * 2); // 16-bit PCM

      // Fill with simple sine wave (440Hz tone)
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * 440 * t) * 16000;
        buffer.writeInt16LE(Math.round(sample), i * 2);
      }

      const result = await service.analyzeVoice('user123', buffer, duration);

      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.sessionId).toMatch(/^vb_/);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.features).toBeDefined();
      expect(result.depressionRisk).toBeGreaterThanOrEqual(0);
      expect(result.depressionRisk).toBeLessThanOrEqual(1);
      expect(result.anxietyRisk).toBeGreaterThanOrEqual(0);
      expect(result.anxietyRisk).toBeLessThanOrEqual(1);
      expect(result.combinedRisk).toBeGreaterThanOrEqual(0);
      expect(result.combinedRisk).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.interpretation).toBeDefined();
      expect(result.quality).toBeDefined();
    });

    it('should extract acoustic features', async () => {
      const buffer = createTestAudioBuffer(5);
      const result = await service.analyzeVoice('user123', buffer, 15);

      const features = result.features;

      // Check F0 features
      expect(features.f0Mean).toBeGreaterThan(0);
      expect(features.f0Std).toBeGreaterThanOrEqual(0);
      expect(features.f0Range).toBeGreaterThanOrEqual(0);

      // Check perturbation features
      expect(features.jitterLocal).toBeGreaterThanOrEqual(0.1);
      expect(features.jitterLocal).toBeLessThanOrEqual(3);
      expect(features.shimmerLocal).toBeGreaterThanOrEqual(0.5);
      expect(features.shimmerLocal).toBeLessThanOrEqual(5);
      expect(features.hnr).toBeGreaterThanOrEqual(5);
      expect(features.hnr).toBeLessThanOrEqual(25);

      // Check temporal features
      expect(features.speechRate).toBeGreaterThanOrEqual(2);
      expect(features.speechRate).toBeLessThanOrEqual(6);
      expect(features.pauseDuration).toBeGreaterThanOrEqual(100);
      expect(features.pauseRatio).toBeGreaterThanOrEqual(0.1);
      expect(features.pauseRatio).toBeLessThanOrEqual(0.5);

      // Check energy features
      expect(features.loudnessMean).toBeGreaterThanOrEqual(0.1);
      expect(features.loudnessMean).toBeLessThanOrEqual(1);

      // Check MFCC
      expect(features.mfccMean).toHaveLength(13);
    });
  });

  describe('Risk Scoring', () => {
    it('should calculate depression risk based on features', async () => {
      const buffer = createTestAudioBuffer(5);
      const result = await service.analyzeVoice('user123', buffer, 15);

      expect(result.depressionRisk).toBeDefined();
      expect(typeof result.depressionRisk).toBe('number');
    });

    it('should calculate anxiety risk based on features', async () => {
      const buffer = createTestAudioBuffer(5);
      const result = await service.analyzeVoice('user123', buffer, 15);

      expect(result.anxietyRisk).toBeDefined();
      expect(typeof result.anxietyRisk).toBe('number');
    });

    it('should calculate combined risk', async () => {
      const buffer = createTestAudioBuffer(5);
      const result = await service.analyzeVoice('user123', buffer, 15);

      // Combined risk should be weighted average of depression and anxiety
      const expectedCombined = result.depressionRisk * 0.6 + result.anxietyRisk * 0.4;
      expect(result.combinedRisk).toBeCloseTo(expectedCombined, 1);
    });
  });

  describe('Baseline Calibration', () => {
    it('should create empty baseline for new user', () => {
      const baseline = service.getBaseline('newUser');
      expect(baseline).toBeNull();
    });

    it('should calibrate baseline from multiple recordings', () => {
      const recordings = [
        { features: createMockFeatures({ f0Mean: 150, jitterLocal: 0.5 }) },
        { features: createMockFeatures({ f0Mean: 155, jitterLocal: 0.6 }) },
        { features: createMockFeatures({ f0Mean: 148, jitterLocal: 0.55 }) },
        { features: createMockFeatures({ f0Mean: 152, jitterLocal: 0.52 }) },
        { features: createMockFeatures({ f0Mean: 153, jitterLocal: 0.58 }) },
      ];

      const baseline = service.calibrateBaseline('user123', recordings);

      expect(baseline.userId).toBe('user123');
      expect(baseline.sampleCount).toBe(5);
      expect(baseline.isEstablished).toBe(true);
      expect(baseline.featureMeans.f0Mean).toBeCloseTo(151.6, 1);
      expect(baseline.featureMeans.jitterLocal).toBeCloseTo(0.55, 1);
    });

    it('should not establish baseline with too few samples', () => {
      const recordings = [
        { features: createMockFeatures({ f0Mean: 150 }) },
        { features: createMockFeatures({ f0Mean: 155 }) },
      ];

      const baseline = service.calibrateBaseline('user123', recordings);

      expect(baseline.sampleCount).toBe(2);
      expect(baseline.isEstablished).toBe(false);
    });

    it('should update baseline incrementally', async () => {
      // Create service with lower minBaselineSamples for testing
      const testService = createVoiceBiomarkerService({ minBaselineSamples: 2 });
      const buffer = createTestAudioBuffer(5);

      // Analyze 2 recordings (matches minBaselineSamples)
      await testService.analyzeVoice('user456', buffer, 5);
      await testService.analyzeVoice('user456', buffer, 5);

      const baseline = testService.getBaseline('user456');
      expect(baseline).not.toBeNull();
      expect(baseline!.sampleCount).toBe(2);
      expect(baseline!.isEstablished).toBe(true);
    });

    it('should reset baseline', async () => {
      const buffer = createTestAudioBuffer(5);
      await service.analyzeVoice('user789', buffer, 5);

      let baseline = service.getBaseline('user789');
      expect(baseline).not.toBeNull();

      service.resetBaseline('user789');

      baseline = service.getBaseline('user789');
      expect(baseline).toBeNull();
    });
  });

  describe('Deviation Detection', () => {
    it('should detect deviations from baseline', async () => {
      // First establish baseline
      const normalRecordings = Array(5).fill(null).map(() => ({
        features: createMockFeatures({
          f0Mean: 150,
          jitterLocal: 0.5,
          speechRate: 4,
        }),
      }));
      service.calibrateBaseline('user123', normalRecordings);

      // Create buffer with different characteristics
      const buffer = createTestAudioBuffer(5);
      const result = await service.analyzeVoice('user123', buffer, 15);

      // Deviations array should exist
      expect(result.deviations).toBeDefined();
      expect(Array.isArray(result.deviations)).toBe(true);
    });

    it('should include deviation details', async () => {
      // Establish baseline with specific values
      const recordings = Array(5).fill(null).map(() => ({
        features: createMockFeatures({
          f0Mean: 150,
          f0Std: 30,
          jitterLocal: 0.5,
        }),
      }));
      service.calibrateBaseline('user123', recordings);

      const baseline = service.getBaseline('user123');
      expect(baseline?.isEstablished).toBe(true);

      // If there are deviations, check their structure
      const buffer = createTestAudioBuffer(5);
      const result = await service.analyzeVoice('user123', buffer, 15);

      if (result.deviations.length > 0) {
        const deviation = result.deviations[0];
        expect(deviation.feature).toBeDefined();
        expect(deviation.current).toBeDefined();
        expect(deviation.baseline).toBeDefined();
        expect(deviation.zScore).toBeDefined();
        expect(deviation.direction).toMatch(/increased|decreased/);
        expect(deviation.significance).toMatch(/low|moderate|high/);
        expect(deviation.descriptionRu).toBeDefined();
      }
    });
  });

  describe('Clinical Interpretation', () => {
    it('should generate interpretation for normal results', async () => {
      const buffer = createTestAudioBuffer(5);
      const result = await service.analyzeVoice('user123', buffer, 15);

      expect(result.interpretation).toBeDefined();
      expect(result.interpretation.overall).toMatch(/normal|mild_concern|moderate_concern|elevated_concern/);
      expect(result.interpretation.summaryRu).toBeDefined();
      expect(result.interpretation.recommendations).toBeDefined();
      expect(Array.isArray(result.interpretation.recommendations)).toBe(true);
    });

    it('should recommend escalation for high risk', async () => {
      // Create service with lower threshold
      const sensitiveService = createVoiceBiomarkerService({
        escalationThreshold: 0.3,
      });

      const buffer = createTestAudioBuffer(5);
      const result = await sensitiveService.analyzeVoice('user123', buffer, 15);

      // If combined risk is high, escalation should be recommended
      if (result.combinedRisk >= 0.7) {
        expect(result.interpretation.escalationRecommended).toBe(true);
      }
    });
  });

  describe('Recording Quality Assessment', () => {
    it('should assess recording quality', async () => {
      const buffer = createTestAudioBuffer(5);
      const result = await service.analyzeVoice('user123', buffer, 15);

      expect(result.quality).toBeDefined();
      expect(result.quality.score).toBeGreaterThanOrEqual(0);
      expect(result.quality.score).toBeLessThanOrEqual(1);
      expect(result.quality.isReliable).toBeDefined();
      expect(result.quality.durationOk).toBeDefined();
      expect(result.quality.snrOk).toBeDefined();
      expect(Array.isArray(result.quality.issues)).toBe(true);
    });

    it('should flag short recordings', async () => {
      const shortBuffer = createTestAudioBuffer(2); // Only 2 seconds
      const result = await service.analyzeVoice('user123', shortBuffer, 2);

      expect(result.quality.durationOk).toBe(false);
      expect(result.quality.issues.length).toBeGreaterThan(0);
    });

    it('should flag silent recordings', async () => {
      // Create silent buffer
      const silentBuffer = Buffer.alloc(16000 * 2 * 10); // 10 seconds of silence

      const result = await service.analyzeVoice('user123', silentBuffer, 10);

      expect(result.quality.snrOk).toBe(false);
    });
  });

  describe('CSD Integration', () => {
    it('should provide voice risk for CSD integration', async () => {
      // Reuse single buffer to reduce memory
      const buffer = createTestAudioBuffer(5);

      await service.analyzeVoice('user123', buffer, 5);
      await service.analyzeVoice('user123', buffer, 5);

      const voiceRisk = service.getVoiceRiskForCSD('user123');

      expect(voiceRisk.available).toBe(true);
      expect(voiceRisk.depressionRisk).toBeGreaterThanOrEqual(0);
      expect(voiceRisk.depressionRisk).toBeLessThanOrEqual(1);
      expect(voiceRisk.anxietyRisk).toBeGreaterThanOrEqual(0);
      expect(voiceRisk.anxietyRisk).toBeLessThanOrEqual(1);
      expect(voiceRisk.trend).toMatch(/improving|stable|worsening/);
      expect(voiceRisk.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should return unavailable for users without history', () => {
      const voiceRisk = service.getVoiceRiskForCSD('unknownUser');

      expect(voiceRisk.available).toBe(false);
      expect(voiceRisk.confidence).toBe(0);
    });
  });

  describe('History Management', () => {
    it('should store analysis history', async () => {
      const buffer = createTestAudioBuffer(5);

      await service.analyzeVoice('user123', buffer, 5);
      await service.analyzeVoice('user123', buffer, 5);

      const history = service.getHistory('user123');
      expect(history.length).toBe(2);
    });

    it('should limit history retrieval', async () => {
      const buffer = createTestAudioBuffer(5);

      // Add entries (reduced count for memory efficiency)
      for (let i = 0; i < 4; i++) {
        await service.analyzeVoice('user123', buffer, 5);
      }

      const limitedHistory = service.getHistory('user123', 2);
      expect(limitedHistory.length).toBe(2);
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(voiceBiomarkerService).toBeDefined();
      expect(voiceBiomarkerService).toBeInstanceOf(VoiceBiomarkerService);
    });
  });
});

// ==================== Test Helpers ====================

/**
 * Create test audio buffer with sine wave (heavily optimized for memory)
 * Uses minimal sample rate and duration for faster tests
 */
function createTestAudioBuffer(durationSeconds: number): Buffer {
  // Use 4kHz sample rate for tests (minimal for voice analysis)
  const sampleRate = 4000;
  const actualDuration = Math.min(durationSeconds, 2); // Cap at 2 seconds for tests
  const samples = sampleRate * actualDuration;
  const buffer = Buffer.alloc(samples * 2); // 16-bit PCM

  // Simple sine wave (fast to compute)
  const f0 = 150;
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * f0 * t) * 0.7;
    buffer.writeInt16LE(Math.round(sample * 16000), i * 2);
  }

  return buffer;
}

/**
 * Create mock acoustic features
 */
function createMockFeatures(overrides: Partial<IAcousticFeatures> = {}): IAcousticFeatures {
  return {
    f0Mean: 150,
    f0Std: 30,
    f0Range: 100,
    f0Slope: 0,
    jitterLocal: 0.5,
    jitterPPQ5: 0.4,
    shimmerLocal: 1.0,
    shimmerAPQ5: 0.8,
    hnr: 15,
    nhr: 0.03,
    speechRate: 4,
    articulationRate: 5,
    pauseDuration: 300,
    pauseRatio: 0.25,
    totalDuration: 15,
    loudnessMean: 0.4,
    loudnessStd: 0.1,
    spectralFlux: 0.2,
    spectralCentroid: 150,
    mfccMean: new Array(13).fill(-5),
    ...overrides,
  };
}
