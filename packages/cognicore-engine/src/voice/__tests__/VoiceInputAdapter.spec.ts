/**
 * VoiceInputAdapter Unit Tests
 * Phase 1 CogniCore Engine 2.0
 */

import {
  VoiceInputAdapter,
  createVoiceInputAdapter,
  DEFAULT_VOICE_CONFIG,
} from '../VoiceInputAdapter';
import type { IVoiceAdapterConfig } from '../interfaces/IVoiceAdapter';

// Helper to create synthetic audio buffer
function createTestAudio(durationSec: number = 1, frequency: number = 440): Float32Array {
  const sampleRate = DEFAULT_VOICE_CONFIG.sampleRate;
  const numSamples = Math.floor(sampleRate * durationSec);
  const audioBuffer = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    audioBuffer[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
  }

  return audioBuffer;
}

describe('VoiceInputAdapter', () => {
  let adapter: VoiceInputAdapter;

  beforeEach(async () => {
    adapter = createVoiceInputAdapter();
    await adapter.initialize();
  });

  describe('Factory Function', () => {
    it('should create adapter with default config', () => {
      const adp = createVoiceInputAdapter();
      expect(adp).toBeInstanceOf(VoiceInputAdapter);
    });

    it('should create adapter with custom config', () => {
      const customConfig: Partial<IVoiceAdapterConfig> = {
        sampleRate: 44100,
        enableWhisper: false,
        fusionStrategy: 'early',
      };
      const adp = createVoiceInputAdapter(customConfig);
      expect(adp).toBeInstanceOf(VoiceInputAdapter);
    });
  });

  describe('Audio Processing', () => {
    it('should process audio buffer', async () => {
      const audioBuffer = createTestAudio(1, 440);
      const result = await adapter.processAudio(audioBuffer);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.acousticFeatures).toBeDefined();
      expect(result.prosodyFeatures).toBeDefined();
      expect(result.voiceEmotion).toBeDefined();
    });

    it('should extract acoustic features', async () => {
      const audioBuffer = createTestAudio(2, 300);
      const result = await adapter.processAudio(audioBuffer);

      expect(result.acousticFeatures.pitch).toBeDefined();
      expect(result.acousticFeatures.pitch.meanF0).toBeGreaterThanOrEqual(0);
      expect(result.acousticFeatures.voiceQuality).toBeDefined();
      expect(result.acousticFeatures.temporal).toBeDefined();
      expect(result.acousticFeatures.spectral).toBeDefined();
      expect(result.acousticFeatures.energy).toBeDefined();
    });

    it('should handle silent audio', async () => {
      const audioBuffer = new Float32Array(16000); // All zeros
      const result = await adapter.processAudio(audioBuffer);

      expect(result).toBeDefined();
      expect(result.quality).toBeDefined();
    });

    it('should handle very short audio', async () => {
      const audioBuffer = createTestAudio(0.1, 200);
      const result = await adapter.processAudio(audioBuffer);

      expect(result).toBeDefined();
    });

    it('should return processing quality metrics', async () => {
      const audioBuffer = createTestAudio(1, 350);
      const result = await adapter.processAudio(audioBuffer);

      expect(result.quality).toBeDefined();
      expect(result.quality.audioQuality).toBeGreaterThanOrEqual(0);
      expect(result.quality.audioQuality).toBeLessThanOrEqual(1);
      expect(result.quality.overallConfidence).toBeDefined();
    });
  });

  describe('Prosody Analysis', () => {
    it('should analyze pitch patterns', async () => {
      const audioBuffer = createTestAudio(2, 200);
      const result = await adapter.processAudio(audioBuffer);

      expect(result.prosodyFeatures.pitchPattern).toBeDefined();
      expect(['monotone', 'varied', 'rising', 'falling', 'irregular']).toContain(
        result.prosodyFeatures.pitchPattern
      );
    });

    it('should detect emotional prosody indicators', async () => {
      const audioBuffer = createTestAudio(2, 300);
      const result = await adapter.processAudio(audioBuffer);

      expect(result.prosodyFeatures.emotionalIndicators).toBeDefined();
      expect(result.prosodyFeatures.emotionalIndicators.arousalLevel).toBeGreaterThanOrEqual(0);
      expect(result.prosodyFeatures.emotionalIndicators.arousalLevel).toBeLessThanOrEqual(1);
    });

    it('should analyze rhythm patterns', async () => {
      const audioBuffer = createTestAudio(2, 250);
      const result = await adapter.processAudio(audioBuffer);

      expect(result.prosodyFeatures.rhythmPattern).toBeDefined();
      expect(['regular', 'irregular', 'hesitant', 'rushed']).toContain(
        result.prosodyFeatures.rhythmPattern
      );
    });

    it('should detect intonation type', async () => {
      const audioBuffer = createTestAudio(2, 280);
      const result = await adapter.processAudio(audioBuffer);

      expect(result.prosodyFeatures.intonationType).toBeDefined();
      expect(['declarative', 'interrogative', 'exclamatory', 'neutral']).toContain(
        result.prosodyFeatures.intonationType
      );
    });
  });

  describe('Voice Emotion Estimation', () => {
    it('should estimate VAD from voice', async () => {
      const audioBuffer = createTestAudio(2, 250);
      const result = await adapter.processAudio(audioBuffer);

      expect(result.voiceEmotion.vad).toBeDefined();
      expect(result.voiceEmotion.vad.valence).toBeGreaterThanOrEqual(-1);
      expect(result.voiceEmotion.vad.valence).toBeLessThanOrEqual(1);
      expect(result.voiceEmotion.vad.arousal).toBeGreaterThanOrEqual(-1);
      expect(result.voiceEmotion.vad.arousal).toBeLessThanOrEqual(1);
      expect(result.voiceEmotion.vad.dominance).toBeGreaterThanOrEqual(0);
      expect(result.voiceEmotion.vad.dominance).toBeLessThanOrEqual(1);
    });

    it('should calculate depression indicators', async () => {
      const audioBuffer = createTestAudio(2, 150);
      const result = await adapter.processAudio(audioBuffer);

      expect(result.voiceEmotion.depressionIndicators).toBeDefined();
      expect(result.voiceEmotion.depressionIndicators.score).toBeGreaterThanOrEqual(0);
      expect(result.voiceEmotion.depressionIndicators.score).toBeLessThanOrEqual(1);
    });

    it('should calculate anxiety indicators', async () => {
      const audioBuffer = createTestAudio(2, 400);
      const result = await adapter.processAudio(audioBuffer);

      expect(result.voiceEmotion.anxietyIndicators).toBeDefined();
      expect(result.voiceEmotion.anxietyIndicators.score).toBeGreaterThanOrEqual(0);
      expect(result.voiceEmotion.anxietyIndicators.score).toBeLessThanOrEqual(1);
    });

    it('should calculate stress indicators', async () => {
      const audioBuffer = createTestAudio(2, 300);
      const result = await adapter.processAudio(audioBuffer);

      expect(result.voiceEmotion.stressIndicators).toBeDefined();
      expect(result.voiceEmotion.stressIndicators.score).toBeGreaterThanOrEqual(0);
    });

    it('should provide primary emotion', async () => {
      const audioBuffer = createTestAudio(2, 250);
      const result = await adapter.processAudio(audioBuffer);

      expect(result.voiceEmotion.primaryEmotion).toBeDefined();
      expect(typeof result.voiceEmotion.primaryEmotion).toBe('string');
    });
  });

  describe('Text Analysis', () => {
    it('should analyze text content', () => {
      const text = 'Мне сегодня очень грустно и тревожно';
      const analysis = adapter.analyzeText(text);

      expect(analysis).toBeDefined();
      expect(analysis.text).toBe(text);
      expect(analysis.sentiment).toBeDefined();
    });

    it('should detect risk keywords', () => {
      const text = 'Не хочу больше жить, все бессмысленно';
      const analysis = adapter.analyzeText(text);

      expect(analysis.riskKeywords).toBeDefined();
      expect(Array.isArray(analysis.riskKeywords)).toBe(true);
    });

    it('should detect cognitive distortions', () => {
      const text = 'Всегда все плохо, никогда ничего не получается';
      const analysis = adapter.analyzeText(text);

      expect(analysis.cognitiveDistortions).toBeDefined();
      expect(Array.isArray(analysis.cognitiveDistortions)).toBe(true);
    });

    it('should handle empty text', () => {
      const analysis = adapter.analyzeText('');

      expect(analysis).toBeDefined();
      expect(analysis.confidence).toBeLessThan(1);
    });

    it('should calculate sentiment', () => {
      const positiveText = 'Сегодня прекрасный день, я очень счастлив!';
      const negativeText = 'Все ужасно и плохо';

      const positiveAnalysis = adapter.analyzeText(positiveText);
      const negativeAnalysis = adapter.analyzeText(negativeText);

      expect(positiveAnalysis.sentiment).toBeGreaterThan(negativeAnalysis.sentiment);
    });
  });

  describe('Multimodal Fusion', () => {
    it('should fuse text and voice analysis', async () => {
      const audioBuffer = createTestAudio(2, 250);
      const text = 'Мне грустно сегодня';

      const result = await adapter.processWithTranscription(audioBuffer, text);

      expect(result.fusion).toBeDefined();
      expect(result.fusion?.vad).toBeDefined();
      expect(result.fusion?.modalityAgreement).toBeDefined();
    });

    it('should provide recommendations', async () => {
      const audioBuffer = createTestAudio(2, 200);
      const text = 'Чувствую себя подавленным';

      const result = await adapter.processWithTranscription(audioBuffer, text);

      expect(result.fusion?.recommendations).toBeDefined();
      expect(Array.isArray(result.fusion?.recommendations)).toBe(true);
    });

    it('should calculate modality agreement', async () => {
      const audioBuffer = createTestAudio(1.5, 300);
      const text = 'Тестовый текст для анализа';

      const result = await adapter.processWithTranscription(audioBuffer, text);

      expect(result.fusion?.modalityAgreement).toBeDefined();
      expect(result.fusion?.modalityAgreement).toBeGreaterThanOrEqual(0);
      expect(result.fusion?.modalityAgreement).toBeLessThanOrEqual(1);
    });

    it('should use configured fusion weights', async () => {
      const customAdapter = createVoiceInputAdapter({
        fusionWeights: [0.8, 0.2],
      });
      await customAdapter.initialize();

      const audioBuffer = createTestAudio(1, 250);
      const result = await customAdapter.processWithTranscription(
        audioBuffer,
        'Очень счастлив!'
      );

      expect(result.fusion).toBeDefined();
      expect(result.fusion?.contributions.text).toBeGreaterThan(result.fusion?.contributions.voice!);
    });
  });

  describe('State Observation Conversion', () => {
    it('should convert result to state observation', async () => {
      const audioBuffer = createTestAudio(2, 250);
      const result = await adapter.processAudio(audioBuffer);

      const observation = adapter.toStateObservation(result);

      expect(observation).toBeDefined();
      expect(observation.length).toBe(5); // VAD + risk + resources
      expect(observation.every(v => typeof v === 'number')).toBe(true);
    });

    it('should convert fusion result to state observation', async () => {
      const audioBuffer = createTestAudio(2, 250);
      const result = await adapter.processWithTranscription(
        audioBuffer,
        'Тестовый текст'
      );

      const observation = adapter.toStateObservation(result);

      expect(observation).toBeDefined();
      expect(observation.length).toBe(5);
    });

    it('should return valid range values', async () => {
      const audioBuffer = createTestAudio(2, 300);
      const result = await adapter.processAudio(audioBuffer);

      const observation = adapter.toStateObservation(result);

      // VAD should be in reasonable range
      for (const value of observation) {
        expect(Math.abs(value)).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Configuration', () => {
    it('should respect MFCC count', async () => {
      const customAdapter = createVoiceInputAdapter({
        numMfcc: 20,
      });
      await customAdapter.initialize();

      expect(customAdapter).toBeInstanceOf(VoiceInputAdapter);
    });

    it('should respect F0 range', async () => {
      const customAdapter = createVoiceInputAdapter({
        minF0: 50,
        maxF0: 600,
      });
      await customAdapter.initialize();

      expect(customAdapter).toBeInstanceOf(VoiceInputAdapter);
    });

    it('should respect fusion strategy', async () => {
      const earlyAdapter = createVoiceInputAdapter({
        fusionStrategy: 'early',
      });
      await earlyAdapter.initialize();

      const lateAdapter = createVoiceInputAdapter({
        fusionStrategy: 'late',
      });
      await lateAdapter.initialize();

      expect(earlyAdapter).toBeInstanceOf(VoiceInputAdapter);
      expect(lateAdapter).toBeInstanceOf(VoiceInputAdapter);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very low frequency audio', async () => {
      const audioBuffer = createTestAudio(1, 80);
      const result = await adapter.processAudio(audioBuffer);

      expect(result).toBeDefined();
    });

    it('should handle high frequency audio', async () => {
      const audioBuffer = createTestAudio(1, 3000);
      const result = await adapter.processAudio(audioBuffer);

      expect(result).toBeDefined();
    });

    it('should handle noisy audio', async () => {
      const numSamples = 16000;
      const audioBuffer = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        // Signal with noise
        audioBuffer[i] =
          Math.sin(2 * Math.PI * 250 * i / 16000) * 0.3 +
          (Math.random() - 0.5) * 0.5;
      }

      const result = await adapter.processAudio(audioBuffer);

      expect(result).toBeDefined();
    });

    it('should handle unicode text', () => {
      const text = '😢 Мне грустно 😞 всё плохо';
      const analysis = adapter.analyzeText(text);

      expect(analysis).toBeDefined();
    });

    it('should handle mixed language text', () => {
      const text = 'I feel sad, мне грустно';
      const analysis = adapter.analyzeText(text);

      expect(analysis).toBeDefined();
    });
  });
});
