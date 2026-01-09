/**
 * 🎤 VOICE INPUT ADAPTER IMPLEMENTATION
 * =====================================
 * Acoustic Feature Extraction & Multimodal Fusion
 *
 * Scientific Foundation (2025 Research):
 * - Wav2Vec2.0 + NCDEs: 74.18% accuracy (PLOS ONE 2025)
 * - F0, jitter, shimmer: Key biomarkers for depression
 * - Parselmouth/Praat algorithms for voice quality
 * - Late fusion for text + voice (best performance)
 *
 * Features:
 * - Frame-based acoustic analysis
 * - Pitch detection (autocorrelation method)
 * - MFCC extraction (Mel-frequency cepstral coefficients)
 * - Voice quality metrics (jitter, shimmer, HNR)
 * - Prosody-to-emotion mapping
 * - Text-voice multimodal fusion
 *
 * © БФ "Другой путь", 2025
 */

import {
  type IVoiceInputAdapter,
  type IVoiceAdapterConfig,
  type IVoiceProcessingResult,
  type IAcousticFeatures,
  type IProsodyFeatures,
  type IVoiceEmotionEstimate,
  type ITextAnalysis,
  type IMultimodalFusion,
  DEFAULT_VOICE_CONFIG,
} from './interfaces/IVoiceAdapter';

// Future: Emotion mappings for prosody features
// Based on research: Scherer (2003), Russell circumplex model
// Reserved for future emotion-to-prosody pattern matching
// const EMOTION_PROSODY_MAPPINGS = {
//   // High arousal emotions
//   anger: { pitchHigh: true, pitchVar: 'high', rateHigh: true, energyHigh: true },
//   fear: { pitchHigh: true, pitchVar: 'high', rateHigh: true, energyMid: true },
//   joy: { pitchHigh: true, pitchVar: 'high', rateMid: true, energyHigh: true },
//   surprise: { pitchHigh: true, pitchVar: 'very_high', rateHigh: true },
//   // Low arousal emotions
//   sadness: { pitchLow: true, pitchVar: 'low', rateLow: true, energyLow: true },
//   depression: { pitchLow: true, pitchVar: 'very_low', rateLow: true, energyLow: true, monotone: true },
//   fatigue: { pitchLow: true, pitchVar: 'low', rateLow: true, energyLow: true },
//   // Mixed
//   anxiety: { pitchHigh: true, pitchVar: 'irregular', rateHigh: true, hesitation: true, tremor: true },
//   stress: { pitchMid: true, pitchVar: 'irregular', jitterHigh: true, shimmerHigh: true },
//   neutral: { pitchMid: true, pitchVar: 'mid', rateMid: true, energyMid: true },
// };

/**
 * Risk keywords for text analysis
 */
const RISK_KEYWORDS = {
  suicidal: ['суицид', 'покончить', 'убить себя', 'не хочу жить', 'конец', 'уйти навсегда'],
  self_harm: ['порезы', 'порезать', 'причинить боль', 'навредить себе'],
  crisis: ['не могу больше', 'невыносимо', 'нет сил', 'безнадежно', 'отчаяние'],
  substance: ['выпить', 'напиться', 'употребить', 'доза', 'таблетки'],
};

/**
 * Cognitive distortion patterns
 */
const DISTORTION_PATTERNS = [
  { type: 'catastrophizing', patterns: ['ужасно', 'кошмар', 'конец света', 'все пропало'] },
  { type: 'black_and_white', patterns: ['всегда', 'никогда', 'все', 'никто', 'полностью'] },
  { type: 'mind_reading', patterns: ['они думают', 'все считают', 'наверняка думает'] },
  { type: 'fortune_telling', patterns: ['точно будет', 'никогда не получится', 'обязательно провалюсь'] },
  { type: 'should_statements', patterns: ['должен', 'обязан', 'надо было'] },
];

/**
 * Voice Input Adapter Implementation
 */
export class VoiceInputAdapter implements IVoiceInputAdapter {
  private config: IVoiceAdapterConfig;
  private initialized = false;

  // Real-time processing state
  private realtimeBuffer: Float32Array[] = [];
  private realtimeEstimate: IVoiceEmotionEstimate | null = null;

  // Processing counter
  private processingCounter = 0;

  constructor(config?: Partial<IVoiceAdapterConfig>) {
    this.config = { ...DEFAULT_VOICE_CONFIG, ...config };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(config?: Partial<IVoiceAdapterConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Validate configuration
    if (this.config.sampleRate < 8000 || this.config.sampleRate > 48000) {
      throw new Error('Sample rate must be between 8000 and 48000 Hz');
    }

    this.initialized = true;
  }

  // ============================================================================
  // MAIN PROCESSING
  // ============================================================================

  async processAudio(
    audioBuffer: Float32Array,
    sampleRate?: number
  ): Promise<IVoiceProcessingResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const sr = sampleRate || this.config.sampleRate;
    const processingId = `voice_${Date.now()}_${++this.processingCounter}`;

    // Resample if necessary
    const resampled = sr !== this.config.sampleRate
      ? this.resample(audioBuffer, sr, this.config.sampleRate)
      : audioBuffer;

    // Extract features
    const acousticFeatures = this.extractAcousticFeatures(resampled);
    const prosodyFeatures = this.extractProsodyFeatures(resampled, acousticFeatures);

    // Map to emotion
    const voiceEmotion = this.mapToEmotion(acousticFeatures, prosodyFeatures);

    // Calculate quality metrics
    const quality = {
      audioQuality: acousticFeatures.quality.signalQuality,
      featureReliability: this.calculateFeatureReliability(acousticFeatures),
      overallConfidence: voiceEmotion.vad.confidence,
    };

    return {
      id: processingId,
      timestamp: new Date(),
      duration: resampled.length / this.config.sampleRate,
      acousticFeatures,
      prosodyFeatures,
      voiceEmotion,
      quality,
    };
  }

  async processFile(_filePath: string): Promise<IVoiceProcessingResult> {
    // In a real implementation, this would read the file
    // For now, throw an error as we can't access files directly
    throw new Error('File processing not implemented. Use processAudio with audio buffer.');
  }

  async processWithTranscription(
    audioBuffer: Float32Array,
    existingTranscript?: string
  ): Promise<IVoiceProcessingResult> {
    // Process audio
    const result = await this.processAudio(audioBuffer);

    // Get or create transcription
    let textAnalysis: ITextAnalysis;

    if (existingTranscript) {
      textAnalysis = this.analyzeText(existingTranscript);
    } else if (this.config.enableWhisper) {
      textAnalysis = await this.transcribe(audioBuffer);
    } else {
      // No transcription available
      return result;
    }

    // Fuse modalities
    const fusion = this.fuseModalities(result.voiceEmotion, textAnalysis);

    return {
      ...result,
      textAnalysis,
      fusion,
    };
  }

  // ============================================================================
  // ACOUSTIC FEATURE EXTRACTION
  // ============================================================================

  extractAcousticFeatures(audioBuffer: Float32Array): IAcousticFeatures {
    const sr = this.config.sampleRate;
    const frameSamples = Math.floor(this.config.frameSizeMs * sr / 1000);
    const hopSamples = Math.floor(this.config.hopSizeMs * sr / 1000);

    // Pre-emphasis
    const preemphasized = this.preEmphasis(audioBuffer, 0.97);

    // Frame the signal
    const frames = this.frameSignal(preemphasized, frameSamples, hopSamples);

    // Apply Hamming window
    const windowedFrames = frames.map(frame => this.hammingWindow(frame));

    // Extract pitch (F0) using autocorrelation
    const pitchContour = this.extractPitch(windowedFrames, sr);
    const pitchStats = this.calculatePitchStats(pitchContour);

    // Calculate energy per frame
    const energyContour = windowedFrames.map(frame =>
      10 * Math.log10(frame.reduce((sum, s) => sum + s * s, 0) / frame.length + 1e-10)
    );
    const energyStats = this.calculateStats(energyContour);

    // Extract MFCCs
    const mfccs = this.extractMFCCs(windowedFrames, sr);
    const firstFrame = mfccs[0];
    const mfccMean = firstFrame
      ? firstFrame.map((_, i) =>
          mfccs.reduce((sum, frame) => sum + (frame[i] ?? 0), 0) / mfccs.length
        )
      : [];
    const mfccStd = firstFrame
      ? firstFrame.map((_, i) => {
          const mean = mfccMean[i] ?? 0;
          return Math.sqrt(
            mfccs.reduce((sum, frame) => sum + Math.pow((frame[i] ?? 0) - mean, 2), 0) / mfccs.length
          );
        })
      : [];

    // Voice quality measures
    const voiceQuality = this.calculateVoiceQuality(windowedFrames, pitchContour, sr);

    // Temporal features
    const temporal = this.calculateTemporalFeatures(audioBuffer, frames, pitchContour, sr);

    // Spectral features
    const spectral = this.calculateSpectralFeatures(windowedFrames, sr, mfccMean, mfccStd);

    // Quality assessment
    const quality = this.assessAudioQuality(audioBuffer, energyContour);

    return {
      pitch: {
        ...pitchStats,
        contour: pitchContour,
      },
      voiceQuality,
      temporal,
      spectral,
      energy: {
        ...energyStats,
        contour: energyContour,
      },
      quality,
    };
  }

  // ============================================================================
  // PROSODY EXTRACTION
  // ============================================================================

  extractProsodyFeatures(
    audioBuffer: Float32Array,
    acousticFeatures?: IAcousticFeatures
  ): IProsodyFeatures {
    const features = acousticFeatures || this.extractAcousticFeatures(audioBuffer);

    // Analyze pitch pattern
    const pitchPattern = this.analyzePitchPattern(features.pitch);

    // Analyze rhythm
    const rhythmPattern = this.analyzeRhythmPattern(features);

    // Detect stress patterns (simplified)
    const stressPatterns: IProsodyFeatures['stressPatterns'] = [];

    // Determine intonation type
    const intonationType = this.determineIntonationType(features.pitch);

    // Calculate emotional prosody indicators
    const emotionalIndicators = {
      arousalLevel: this.calculateArousalFromProsody(features),
      expressiveness: features.pitch.stdF0 / (features.pitch.meanF0 || 1),
      energyLevel: (features.energy.meanEnergy + 60) / 60, // Normalize dB
      tremorIndicator: features.voiceQuality.jitterLocal / 5, // Normalize
    };

    // Analyze pause patterns
    const pausePatterns = {
      hesitationMarkers: this.countHesitationMarkers(features),
      filledPauses: 0, // Would need transcription
      cognitiveLoadIndicator: features.temporal.meanPauseDuration / 0.5,
    };

    return {
      pitchPattern,
      rhythmPattern,
      stressPatterns,
      intonationType,
      emotionalIndicators,
      pausePatterns,
    };
  }

  // ============================================================================
  // EMOTION MAPPING
  // ============================================================================

  mapToEmotion(
    acoustic: IAcousticFeatures,
    prosody: IProsodyFeatures
  ): IVoiceEmotionEstimate {
    // Calculate emotion probabilities based on prosodic features
    const emotionProbabilities = this.calculateEmotionProbabilities(acoustic, prosody);

    // Find primary emotion
    let primaryEmotion = 'neutral';
    let maxProb = 0;
    emotionProbabilities.forEach((prob, emotion) => {
      if (prob > maxProb) {
        maxProb = prob;
        primaryEmotion = emotion;
      }
    });

    // Calculate VAD from acoustic features
    const vad = this.calculateVAD(acoustic, prosody);

    // Calculate clinical indicators
    const depressionIndicators = this.calculateDepressionIndicators(acoustic, prosody);
    const anxietyIndicators = this.calculateAnxietyIndicators(acoustic, prosody);
    const stressIndicators = this.calculateStressIndicators(acoustic, prosody);

    return {
      primaryEmotion,
      emotionProbabilities,
      vad,
      depressionIndicators,
      anxietyIndicators,
      stressIndicators,
    };
  }

  // ============================================================================
  // MULTIMODAL FUSION
  // ============================================================================

  fuseModalities(
    voiceEmotion: IVoiceEmotionEstimate,
    textAnalysis: ITextAnalysis
  ): IMultimodalFusion {
    const [textWeight, voiceWeight] = this.config.fusionWeights;

    // Fuse VAD
    const textVAD = this.textSentimentToVAD(textAnalysis.sentiment, textAnalysis.textEmotions);
    const voiceVAD = voiceEmotion.vad;

    const fusedVAD = {
      valence: textWeight * textVAD.valence + voiceWeight * voiceVAD.valence,
      arousal: textWeight * textVAD.arousal + voiceWeight * voiceVAD.arousal,
      dominance: textWeight * textVAD.dominance + voiceWeight * voiceVAD.dominance,
      confidence: Math.min(textAnalysis.confidence, voiceVAD.confidence),
    };

    // Fuse emotion probabilities
    const fusedEmotions = new Map<string, number>();
    const allEmotions = new Set([
      ...voiceEmotion.emotionProbabilities.keys(),
      ...textAnalysis.textEmotions.keys(),
    ]);

    allEmotions.forEach(emotion => {
      const voiceProb = voiceEmotion.emotionProbabilities.get(emotion) || 0;
      const textProb = textAnalysis.textEmotions.get(emotion) || 0;
      fusedEmotions.set(emotion, textWeight * textProb + voiceWeight * voiceProb);
    });

    // Primary emotion after fusion
    let primaryEmotion = 'neutral';
    let maxProb = 0;
    fusedEmotions.forEach((prob, emotion) => {
      if (prob > maxProb) {
        maxProb = prob;
        primaryEmotion = emotion;
      }
    });

    // Check for modality discrepancy
    const voicePrimary = voiceEmotion.primaryEmotion;
    const textPrimary = this.getTextPrimaryEmotion(textAnalysis);
    const agreement = this.calculateModalityAgreement(voiceEmotion, textAnalysis);

    let discrepancy: IMultimodalFusion['discrepancy'];
    if (agreement < 0.5 && voicePrimary !== textPrimary) {
      discrepancy = this.analyzeDiscrepancy(voicePrimary, textPrimary, voiceEmotion, textAnalysis);
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      fusedVAD,
      voiceEmotion,
      textAnalysis,
      discrepancy
    );

    return {
      vad: fusedVAD,
      emotionProbabilities: fusedEmotions,
      primaryEmotion,
      contributions: { text: textWeight, voice: voiceWeight },
      modalityAgreement: agreement,
      discrepancy,
      confidence: fusedVAD.confidence,
      recommendations,
    };
  }

  // ============================================================================
  // TRANSCRIPTION
  // ============================================================================

  async transcribe(_audioBuffer: Float32Array): Promise<ITextAnalysis> {
    if (!this.config.enableWhisper) {
      throw new Error('Whisper transcription not enabled');
    }

    // In production, this would call the Whisper API with _audioBuffer
    // For now, return a placeholder that indicates transcription is needed
    console.warn('Whisper API integration requires external service. Returning placeholder.');

    return {
      text: '[Transcription requires Whisper API integration]',
      language: this.config.language,
      wordCount: 0,
      sentiment: 0,
      keyPhrases: [],
      textEmotions: new Map([['neutral', 1.0]]),
      cognitiveDistortions: [],
      riskKeywords: [],
      confidence: 0.1,
    };
  }

  analyzeText(text: string): ITextAnalysis {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);

    // Simple sentiment analysis
    const sentiment = this.calculateSimpleSentiment(text);

    // Detect emotions from text
    const textEmotions = this.detectTextEmotions(text);

    // Detect cognitive distortions
    const cognitiveDistortions = this.detectCognitiveDistortions(text);

    // Detect risk keywords
    const riskKeywords = this.detectRiskKeywords(text);

    // Extract key phrases (simplified: just return longer words)
    const keyPhrases = words.filter(w => w.length > 6).slice(0, 5);

    return {
      text,
      language: this.config.language,
      wordCount: words.length,
      sentiment,
      keyPhrases,
      textEmotions,
      cognitiveDistortions,
      riskKeywords,
      confidence: 0.7,
    };
  }

  // ============================================================================
  // REAL-TIME PROCESSING
  // ============================================================================

  addRealtimeChunk(chunk: Float32Array): void {
    this.realtimeBuffer.push(chunk);

    // Keep buffer size limited
    while (this.realtimeBuffer.length > this.config.realtimeBufferSize) {
      this.realtimeBuffer.shift();
    }

    // Update estimate if we have enough data
    if (this.realtimeBuffer.length >= 10) {
      const combined = this.combineBuffers(this.realtimeBuffer);
      const acoustic = this.extractAcousticFeatures(combined);
      const prosody = this.extractProsodyFeatures(combined, acoustic);
      this.realtimeEstimate = this.mapToEmotion(acoustic, prosody);
    }
  }

  getRealtimeEstimate(): IVoiceEmotionEstimate | null {
    return this.realtimeEstimate;
  }

  // ============================================================================
  // CONVERSION
  // ============================================================================

  toStateObservation(result: IVoiceProcessingResult): number[] {
    const fusion = result.fusion;
    const voice = result.voiceEmotion;

    // If fusion available, use it; otherwise use voice-only
    const vad = fusion?.vad || voice.vad;

    return [
      vad.valence, // -1 to 1
      vad.arousal, // -1 to 1
      vad.dominance, // 0 to 1
      1 - voice.depressionIndicators.score, // Invert for risk dimension
      1 - voice.stressIndicators.score, // Invert for resources dimension
    ];
  }

  getConfig(): IVoiceAdapterConfig {
    return { ...this.config };
  }

  adaptFusionWeights(
    predictions: IMultimodalFusion[],
    actuals: IVoiceEmotionEstimate[]
  ): void {
    if (predictions.length !== actuals.length || predictions.length < 5) {
      return;
    }

    // Calculate error for text-weighted and voice-weighted predictions
    let textError = 0;
    let voiceError = 0;

    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      const actual = actuals[i];

      // Skip if either is undefined
      if (!pred || !actual) continue;

      // Error based on VAD distance
      const vadError = Math.sqrt(
        Math.pow(pred.vad.valence - actual.vad.valence, 2) +
        Math.pow(pred.vad.arousal - actual.vad.arousal, 2) +
        Math.pow(pred.vad.dominance - actual.vad.dominance, 2)
      );

      textError += vadError * pred.contributions.text;
      voiceError += vadError * pred.contributions.voice;
    }

    // Adjust weights based on relative error
    const totalError = textError + voiceError;
    if (totalError > 0) {
      const textPerformance = 1 - textError / totalError;
      const voicePerformance = 1 - voiceError / totalError;

      // Smooth update
      const alpha = 0.1;
      const currentTextWeight = this.config.fusionWeights[0] ?? 0.5;
      const currentVoiceWeight = this.config.fusionWeights[1] ?? 0.5;
      this.config.fusionWeights[0] = currentTextWeight * (1 - alpha) + textPerformance * alpha;
      this.config.fusionWeights[1] = currentVoiceWeight * (1 - alpha) + voicePerformance * alpha;

      // Normalize
      const sum = (this.config.fusionWeights[0] ?? 0.5) + (this.config.fusionWeights[1] ?? 0.5);
      this.config.fusionWeights[0] = (this.config.fusionWeights[0] ?? 0.5) / sum;
      this.config.fusionWeights[1] = (this.config.fusionWeights[1] ?? 0.5) / sum;
    }
  }

  // ============================================================================
  // PRIVATE HELPERS: Signal Processing
  // ============================================================================

  private preEmphasis(signal: Float32Array, coef: number): Float32Array {
    const result = new Float32Array(signal.length);
    result[0] = signal[0] ?? 0;
    for (let i = 1; i < signal.length; i++) {
      result[i] = (signal[i] ?? 0) - coef * (signal[i - 1] ?? 0);
    }
    return result;
  }

  private frameSignal(
    signal: Float32Array,
    frameSize: number,
    hopSize: number
  ): Float32Array[] {
    const frames: Float32Array[] = [];
    for (let i = 0; i + frameSize <= signal.length; i += hopSize) {
      frames.push(signal.slice(i, i + frameSize));
    }
    return frames;
  }

  private hammingWindow(frame: Float32Array): Float32Array {
    const N = frame.length;
    const result = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1));
      result[i] = (frame[i] ?? 0) * window;
    }
    return result;
  }

  private extractPitch(frames: Float32Array[], sampleRate: number): number[] {
    const minLag = Math.floor(sampleRate / this.config.maxF0);
    const maxLag = Math.floor(sampleRate / this.config.minF0);

    return frames.map(frame => {
      // Autocorrelation method
      let maxCorr = 0;
      let bestLag = 0;

      for (let lag = minLag; lag <= maxLag && lag < frame.length; lag++) {
        let corr = 0;
        for (let i = 0; i < frame.length - lag; i++) {
          corr += (frame[i] ?? 0) * (frame[i + lag] ?? 0);
        }

        if (corr > maxCorr) {
          maxCorr = corr;
          bestLag = lag;
        }
      }

      // Calculate F0 if correlation is strong enough
      if (maxCorr > 0.3 * frame.reduce((sum, s) => sum + s * s, 0) && bestLag > 0) {
        return sampleRate / bestLag;
      }
      return 0; // Unvoiced
    });
  }

  private extractMFCCs(frames: Float32Array[], sampleRate: number): number[][] {
    const numFilters = 26;
    const numCoeffs = this.config.numMfcc;

    return frames.map(frame => {
      // Simplified MFCC: Use power spectrum
      const fft = this.simpleFFT(frame);
      const powerSpectrum = fft.map(c => c * c);

      // Mel filterbank (simplified)
      const melEnergies = this.melFilterbank(powerSpectrum, sampleRate, numFilters);

      // Log compression
      const logMelEnergies = melEnergies.map(e => Math.log(e + 1e-10));

      // DCT to get MFCCs
      const mfccs = this.dct(logMelEnergies, numCoeffs);

      return mfccs;
    });
  }

  private simpleFFT(frame: Float32Array): number[] {
    // Very simplified FFT magnitude (for demonstration)
    // In production, use a proper FFT library
    const N = frame.length;
    const result: number[] = [];

    for (let k = 0; k < N / 2; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = 2 * Math.PI * k * n / N;
        const sample = frame[n] ?? 0;
        real += sample * Math.cos(angle);
        imag -= sample * Math.sin(angle);
      }
      result.push(Math.sqrt(real * real + imag * imag));
    }

    return result;
  }

  private melFilterbank(spectrum: number[], sampleRate: number, numFilters: number): number[] {
    const melEnergies: number[] = [];
    const fMax = sampleRate / 2;
    const melMax = 2595 * Math.log10(1 + fMax / 700);

    for (let i = 0; i < numFilters; i++) {
      const melLow = melMax * i / (numFilters + 1);
      const melHigh = melMax * (i + 2) / (numFilters + 1);
      const melCenter = melMax * (i + 1) / (numFilters + 1);

      const fLow = 700 * (Math.pow(10, melLow / 2595) - 1);
      const fCenter = 700 * (Math.pow(10, melCenter / 2595) - 1);
      const fHigh = 700 * (Math.pow(10, melHigh / 2595) - 1);

      const binLow = Math.floor(fLow / fMax * spectrum.length);
      const binCenter = Math.floor(fCenter / fMax * spectrum.length);
      const binHigh = Math.floor(fHigh / fMax * spectrum.length);

      let energy = 0;
      for (let k = binLow; k < binHigh && k < spectrum.length; k++) {
        const weight = k < binCenter
          ? (k - binLow) / (binCenter - binLow)
          : (binHigh - k) / (binHigh - binCenter);
        energy += (spectrum[k] ?? 0) * Math.max(0, weight);
      }

      melEnergies.push(energy);
    }

    return melEnergies;
  }

  private dct(input: number[], numCoeffs: number): number[] {
    const N = input.length;
    const result: number[] = [];

    for (let k = 0; k < numCoeffs; k++) {
      let sum = 0;
      for (let n = 0; n < N; n++) {
        sum += (input[n] ?? 0) * Math.cos(Math.PI * k * (n + 0.5) / N);
      }
      result.push(sum * Math.sqrt(2 / N));
    }

    return result;
  }

  private resample(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return buffer;

    const ratio = toRate / fromRate;
    const newLength = Math.floor(buffer.length * ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i / ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const frac = srcIndex - srcIndexFloor;

      if (srcIndexFloor + 1 < buffer.length) {
        result[i] = (buffer[srcIndexFloor] ?? 0) * (1 - frac) + (buffer[srcIndexFloor + 1] ?? 0) * frac;
      } else {
        result[i] = buffer[srcIndexFloor] ?? 0;
      }
    }

    return result;
  }

  private combineBuffers(buffers: Float32Array[]): Float32Array {
    const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    return result;
  }

  // ============================================================================
  // PRIVATE HELPERS: Statistics & Analysis
  // ============================================================================

  private calculatePitchStats(pitchContour: number[]): {
    meanF0: number;
    stdF0: number;
    minF0: number;
    maxF0: number;
    rangeF0: number;
    voicedRatio: number;
  } {
    const voiced = pitchContour.filter(f => f > 0);

    if (voiced.length === 0) {
      return { meanF0: 0, stdF0: 0, minF0: 0, maxF0: 0, rangeF0: 0, voicedRatio: 0 };
    }

    const meanF0 = voiced.reduce((a, b) => a + b, 0) / voiced.length;
    const stdF0 = Math.sqrt(
      voiced.reduce((sum, f) => sum + Math.pow(f - meanF0, 2), 0) / voiced.length
    );
    const minF0 = Math.min(...voiced);
    const maxF0 = Math.max(...voiced);

    return {
      meanF0,
      stdF0,
      minF0,
      maxF0,
      rangeF0: maxF0 - minF0,
      voicedRatio: voiced.length / pitchContour.length,
    };
  }

  private calculateStats(values: number[]): {
    meanEnergy: number;
    stdEnergy: number;
    rangeEnergy: number;
  } {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );
    const range = Math.max(...values) - Math.min(...values);

    return { meanEnergy: mean, stdEnergy: std, rangeEnergy: range };
  }

  private calculateVoiceQuality(
    frames: Float32Array[],
    pitchContour: number[],
    _sampleRate: number
  ): IAcousticFeatures['voiceQuality'] {
    const voicedFrames = frames.filter((_, i) => (pitchContour[i] ?? 0) > 0);

    if (voicedFrames.length < 3) {
      return { jitterLocal: 0, shimmerLocal: 0, hnr: 0, nhr: 0 };
    }

    // Calculate jitter (pitch perturbation)
    const voicedPitches = pitchContour.filter(f => f > 0);
    let jitterSum = 0;
    for (let i = 1; i < voicedPitches.length; i++) {
      const curr = voicedPitches[i] ?? 0;
      const prev = voicedPitches[i - 1] ?? 0;
      jitterSum += Math.abs(curr - prev);
    }
    const jitterLocal = (jitterSum / (voicedPitches.length - 1)) / (
      voicedPitches.reduce((a, b) => a + b, 0) / voicedPitches.length
    ) * 100;

    // Calculate shimmer (amplitude perturbation)
    const amplitudes = voicedFrames.map(frame =>
      Math.sqrt(frame.reduce((sum, s) => sum + s * s, 0) / frame.length)
    );
    let shimmerSum = 0;
    for (let i = 1; i < amplitudes.length; i++) {
      const curr = amplitudes[i] ?? 0;
      const prev = amplitudes[i - 1] ?? 0;
      shimmerSum += Math.abs(curr - prev);
    }
    const shimmerLocal = (shimmerSum / (amplitudes.length - 1)) / (
      amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length
    ) * 100;

    // Calculate HNR (simplified)
    const hnr = 20 * Math.log10(1 / (jitterLocal / 100 + shimmerLocal / 100 + 0.01));
    const nhr = 1 / (Math.pow(10, hnr / 20) + 1);

    return {
      jitterLocal: Math.min(10, jitterLocal),
      shimmerLocal: Math.min(20, shimmerLocal),
      hnr: Math.max(-20, Math.min(30, hnr)),
      nhr,
    };
  }

  private calculateTemporalFeatures(
    audioBuffer: Float32Array,
    _frames: Float32Array[],
    pitchContour: number[],
    sampleRate: number
  ): IAcousticFeatures['temporal'] {
    const duration = audioBuffer.length / sampleRate;
    const voicedFrames = pitchContour.filter(f => f > 0).length;
    const totalFrames = pitchContour.length;

    // Estimate pauses (unvoiced segments)
    let pauseCount = 0;
    let pauseDuration = 0;
    let inPause = (pitchContour[0] ?? 0) === 0;

    for (let i = 1; i < pitchContour.length; i++) {
      const pitch = pitchContour[i] ?? 0;
      if (pitch === 0 && !inPause) {
        inPause = true;
        pauseCount++;
      } else if (pitch > 0 && inPause) {
        inPause = false;
      }

      if (pitch === 0) {
        pauseDuration += this.config.hopSizeMs / 1000;
      }
    }

    const speakingTime = (voicedFrames / totalFrames) * duration;
    const speechRate = 3; // syllables/sec (placeholder)
    const articulationRate = speechRate / (speakingTime / duration);

    return {
      speechRate,
      articulationRate,
      duration,
      speakingTime,
      pauseDuration,
      pauseCount,
      meanPauseDuration: pauseCount > 0 ? pauseDuration / pauseCount : 0,
    };
  }

  private calculateSpectralFeatures(
    frames: Float32Array[],
    sampleRate: number,
    mfccMean: number[],
    mfccStd: number[]
  ): IAcousticFeatures['spectral'] {
    // Calculate spectral centroid
    let totalCentroid = 0;
    let totalFlux = 0;
    let prevSpectrum: number[] | null = null;

    for (const frame of frames) {
      const spectrum = this.simpleFFT(frame);
      const total = spectrum.reduce((a, b) => a + b, 0) + 1e-10;

      // Centroid
      let centroid = 0;
      for (let i = 0; i < spectrum.length; i++) {
        const freq = i * sampleRate / (2 * spectrum.length);
        centroid += freq * (spectrum[i] ?? 0) / total;
      }
      totalCentroid += centroid;

      // Spectral flux
      if (prevSpectrum) {
        let flux = 0;
        for (let i = 0; i < spectrum.length; i++) {
          flux += Math.pow((spectrum[i] ?? 0) - (prevSpectrum[i] ?? 0), 2);
        }
        totalFlux += Math.sqrt(flux);
      }
      prevSpectrum = spectrum;
    }

    const spectralCentroid = totalCentroid / frames.length;
    const spectralFlux = totalFlux / (frames.length - 1);

    // Spectral rolloff (placeholder)
    const spectralRolloff = spectralCentroid * 2;

    return {
      mfccMean,
      mfccStd,
      spectralCentroid,
      spectralFlux,
      spectralRolloff,
    };
  }

  private assessAudioQuality(
    audioBuffer: Float32Array,
    energyContour: number[]
  ): IAcousticFeatures['quality'] {
    // Signal quality based on dynamic range
    const maxEnergy = Math.max(...energyContour);
    const minEnergy = Math.min(...energyContour);
    const dynamicRange = maxEnergy - minEnergy;

    // Clipping detection
    let clippedSamples = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      if (Math.abs(audioBuffer[i] ?? 0) > 0.99) {
        clippedSamples++;
      }
    }
    const clippingRatio = clippedSamples / audioBuffer.length;

    // Silence detection
    const silentFrames = energyContour.filter(e => e < -40).length;
    const silenceRatio = silentFrames / energyContour.length;

    // Overall signal quality
    const signalQuality = Math.max(0, Math.min(1,
      (dynamicRange / 60) * (1 - clippingRatio) * (1 - silenceRatio * 0.5)
    ));

    return {
      signalQuality,
      noiseLevel: minEnergy,
      clippingRatio,
      silenceRatio,
    };
  }

  private calculateFeatureReliability(features: IAcousticFeatures): number {
    // Combine multiple quality indicators
    const pitchReliability = features.pitch.voicedRatio;
    const signalQuality = features.quality.signalQuality;
    const energyRange = Math.min(1, features.energy.rangeEnergy / 30);

    return (pitchReliability + signalQuality + energyRange) / 3;
  }

  // ============================================================================
  // PRIVATE HELPERS: Prosody Analysis
  // ============================================================================

  private analyzePitchPattern(pitch: IAcousticFeatures['pitch']): IProsodyFeatures['pitchPattern'] {
    const cv = pitch.stdF0 / (pitch.meanF0 || 1);

    if (cv < 0.1) return 'monotone';
    if (cv > 0.3) return 'varied';

    // Check trend
    const contour = pitch.contour.filter(f => f > 0);
    if (contour.length < 5) return 'monotone'; // Not enough data for pattern detection

    const firstHalf = contour.slice(0, contour.length / 2);
    const secondHalf = contour.slice(contour.length / 2);

    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondMean > firstMean * 1.1) return 'rising';
    if (secondMean < firstMean * 0.9) return 'falling';

    return 'varied';
  }

  private analyzeRhythmPattern(features: IAcousticFeatures): IProsodyFeatures['rhythmPattern'] {
    const pauseVariability = features.temporal.meanPauseDuration > 0
      ? features.temporal.pauseDuration / features.temporal.pauseCount / features.temporal.meanPauseDuration
      : 1;

    if (pauseVariability > 1.5) return 'irregular';
    if (features.temporal.pauseCount / features.temporal.duration > 0.5) return 'hesitant';
    if (features.temporal.speechRate > 5) return 'rushed';

    return 'regular';
  }

  private determineIntonationType(pitch: IAcousticFeatures['pitch']): IProsodyFeatures['intonationType'] {
    const contour = pitch.contour.filter(f => f > 0);
    if (contour.length < 3) return 'neutral';

    const lastThird = contour.slice(-Math.floor(contour.length / 3));
    const lastMean = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
    const overallMean = pitch.meanF0;

    if (lastMean > overallMean * 1.2) return 'interrogative';
    if (lastMean < overallMean * 0.8) return 'declarative';
    if (pitch.rangeF0 > pitch.meanF0 * 0.5) return 'exclamatory';

    return 'neutral';
  }

  private calculateArousalFromProsody(features: IAcousticFeatures): number {
    // Arousal correlates with: high pitch, fast rate, high energy, high variability
    const pitchNorm = Math.min(1, features.pitch.meanF0 / 200);
    const rateNorm = Math.min(1, features.temporal.speechRate / 5);
    const energyNorm = Math.min(1, (features.energy.meanEnergy + 40) / 40);
    const variabilityNorm = Math.min(1, features.pitch.stdF0 / 50);

    return (pitchNorm * 0.3 + rateNorm * 0.3 + energyNorm * 0.2 + variabilityNorm * 0.2) * 2 - 1;
  }

  private countHesitationMarkers(features: IAcousticFeatures): number {
    // Count pauses before speech that could indicate hesitation
    return Math.min(10, features.temporal.pauseCount);
  }

  // ============================================================================
  // PRIVATE HELPERS: Emotion Mapping
  // ============================================================================

  private calculateEmotionProbabilities(
    acoustic: IAcousticFeatures,
    prosody: IProsodyFeatures
  ): Map<string, number> {
    const emotions = new Map<string, number>();
    const arousal = prosody.emotionalIndicators.arousalLevel;
    const valence = this.estimateValenceFromAcoustic(acoustic);

    // Map to basic emotions based on arousal-valence quadrant
    if (arousal > 0.3 && valence > 0.3) {
      emotions.set('joy', 0.6);
      emotions.set('excitement', 0.3);
    } else if (arousal > 0.3 && valence < -0.3) {
      emotions.set('anger', 0.4);
      emotions.set('anxiety', 0.4);
    } else if (arousal < -0.3 && valence < -0.3) {
      emotions.set('sadness', 0.6);
      emotions.set('depression', 0.3);
    } else if (arousal < -0.3 && valence > 0.3) {
      emotions.set('calm', 0.6);
      emotions.set('contentment', 0.3);
    } else {
      emotions.set('neutral', 0.8);
    }

    // Adjust based on voice quality (stress/anxiety indicators)
    if (acoustic.voiceQuality.jitterLocal > 2 || acoustic.voiceQuality.shimmerLocal > 5) {
      const stressProb = emotions.get('anxiety') || 0;
      emotions.set('stress', stressProb + 0.2);
    }

    // Normalize
    const total = Array.from(emotions.values()).reduce((a, b) => a + b, 0);
    emotions.forEach((v, k) => emotions.set(k, v / total));

    return emotions;
  }

  private estimateValenceFromAcoustic(acoustic: IAcousticFeatures): number {
    // Higher spectral centroid and HNR tend to indicate positive valence
    const hnrNorm = Math.min(1, Math.max(-1, acoustic.voiceQuality.hnr / 20));
    const centroidNorm = Math.min(1, acoustic.spectral.spectralCentroid / 2000);

    return (hnrNorm * 0.6 + centroidNorm * 0.4) * 2 - 1;
  }

  private calculateVAD(
    acoustic: IAcousticFeatures,
    prosody: IProsodyFeatures
  ): IVoiceEmotionEstimate['vad'] {
    const arousal = prosody.emotionalIndicators.arousalLevel;
    const valence = this.estimateValenceFromAcoustic(acoustic);
    const dominance = Math.min(1, Math.max(0,
      0.5 + (acoustic.energy.meanEnergy + 30) / 60 * 0.3 +
      prosody.emotionalIndicators.expressiveness * 0.2
    ));

    const confidence = acoustic.quality.signalQuality * acoustic.pitch.voicedRatio;

    return { valence, arousal, dominance, confidence };
  }

  private calculateDepressionIndicators(
    acoustic: IAcousticFeatures,
    _prosody: IProsodyFeatures
  ): IVoiceEmotionEstimate['depressionIndicators'] {
    // Flat affect: low pitch variation
    const pitchCV = acoustic.pitch.stdF0 / (acoustic.pitch.meanF0 || 1);
    const flatAffect = Math.max(0, 1 - pitchCV / 0.2);

    // Psychomotor retardation: slow speech
    const psychomotorRetardation = Math.max(0, 1 - acoustic.temporal.speechRate / 3);

    // Low energy
    const lowEnergy = Math.max(0, 1 - (acoustic.energy.meanEnergy + 40) / 40);

    const score = (flatAffect * 0.4 + psychomotorRetardation * 0.3 + lowEnergy * 0.3);
    const confidence = acoustic.quality.signalQuality * 0.8;

    return { flatAffect, psychomotorRetardation, lowEnergy, score, confidence };
  }

  private calculateAnxietyIndicators(
    acoustic: IAcousticFeatures,
    prosody: IProsodyFeatures
  ): IVoiceEmotionEstimate['anxietyIndicators'] {
    // High pitch
    const highPitch = Math.min(1, acoustic.pitch.meanF0 / 250);

    // Fast speech
    const fastSpeech = Math.min(1, acoustic.temporal.speechRate / 5);

    // Voice tremor (jitter)
    const tremor = Math.min(1, acoustic.voiceQuality.jitterLocal / 3);

    // Hesitation
    const hesitation = Math.min(1, prosody.pausePatterns.hesitationMarkers / 10);

    const score = (highPitch * 0.25 + fastSpeech * 0.25 + tremor * 0.25 + hesitation * 0.25);
    const confidence = acoustic.quality.signalQuality * 0.8;

    return { highPitch, fastSpeech, tremor, hesitation, score, confidence };
  }

  private calculateStressIndicators(
    acoustic: IAcousticFeatures,
    prosody: IProsodyFeatures
  ): IVoiceEmotionEstimate['stressIndicators'] {
    // Voice instability (jitter + shimmer)
    const voiceInstability = Math.min(1, (acoustic.voiceQuality.jitterLocal + acoustic.voiceQuality.shimmerLocal) / 10);

    // Reduced clarity (low HNR)
    const reducedClarity = Math.max(0, 1 - (acoustic.voiceQuality.hnr + 10) / 30);

    // Irregular breathing (pause patterns)
    const breathingIrregularity = Math.min(1, prosody.pausePatterns.cognitiveLoadIndicator);

    const score = (voiceInstability * 0.4 + reducedClarity * 0.3 + breathingIrregularity * 0.3);
    const confidence = acoustic.quality.signalQuality * 0.8;

    return { voiceInstability, reducedClarity, breathingIrregularity, score, confidence };
  }

  // ============================================================================
  // PRIVATE HELPERS: Text Analysis
  // ============================================================================

  private calculateSimpleSentiment(text: string): number {
    const positiveWords = ['хорошо', 'отлично', 'рад', 'счастлив', 'люблю', 'нравится', 'прекрасно', 'супер'];
    const negativeWords = ['плохо', 'ужасно', 'грустно', 'злой', 'ненавижу', 'страшно', 'больно', 'тяжело'];

    const lower = text.toLowerCase();
    let score = 0;

    positiveWords.forEach(w => {
      if (lower.includes(w)) score += 0.2;
    });

    negativeWords.forEach(w => {
      if (lower.includes(w)) score -= 0.2;
    });

    return Math.max(-1, Math.min(1, score));
  }

  private detectTextEmotions(text: string): Map<string, number> {
    const emotions = new Map<string, number>();
    const lower = text.toLowerCase();

    const emotionKeywords: Record<string, string[]> = {
      joy: ['рад', 'счастлив', 'весело', 'хорошо'],
      sadness: ['грустно', 'печально', 'тоска', 'одиноко'],
      anger: ['злость', 'бешенство', 'раздражен', 'ненавижу'],
      fear: ['страх', 'боюсь', 'тревога', 'паника'],
      anxiety: ['беспокойство', 'волнуюсь', 'нервничаю'],
      neutral: [],
    };

    let total = 0;
    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      let count = 0;
      keywords.forEach(kw => {
        if (lower.includes(kw)) count++;
      });
      if (count > 0) {
        emotions.set(emotion, count);
        total += count;
      }
    });

    // Normalize
    if (total > 0) {
      emotions.forEach((v, k) => emotions.set(k, v / total));
    } else {
      emotions.set('neutral', 1.0);
    }

    return emotions;
  }

  private detectCognitiveDistortions(text: string): ITextAnalysis['cognitiveDistortions'] {
    const lower = text.toLowerCase();
    const distortions: ITextAnalysis['cognitiveDistortions'] = [];

    DISTORTION_PATTERNS.forEach(({ type, patterns }) => {
      patterns.forEach(pattern => {
        if (lower.includes(pattern)) {
          distortions.push({
            type,
            phrase: pattern,
            confidence: 0.7,
          });
        }
      });
    });

    return distortions;
  }

  private detectRiskKeywords(text: string): ITextAnalysis['riskKeywords'] {
    const lower = text.toLowerCase();
    const risks: ITextAnalysis['riskKeywords'] = [];

    Object.entries(RISK_KEYWORDS).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (lower.includes(keyword)) {
          risks.push({
            keyword,
            category,
            severity: category === 'suicidal' ? 1.0 : category === 'self_harm' ? 0.8 : 0.5,
          });
        }
      });
    });

    return risks;
  }

  private textSentimentToVAD(
    sentiment: number,
    emotions: Map<string, number>
  ): { valence: number; arousal: number; dominance: number } {
    // Map sentiment to valence
    const valence = sentiment;

    // Estimate arousal from emotions
    let arousal = 0;
    if (emotions.has('anger')) arousal += emotions.get('anger')! * 0.8;
    if (emotions.has('fear')) arousal += emotions.get('fear')! * 0.6;
    if (emotions.has('joy')) arousal += emotions.get('joy')! * 0.4;
    if (emotions.has('sadness')) arousal -= emotions.get('sadness')! * 0.4;

    // Dominance from emotion type
    let dominance = 0.5;
    if (emotions.has('anger')) dominance += emotions.get('anger')! * 0.3;
    if (emotions.has('fear')) dominance -= emotions.get('fear')! * 0.3;

    return {
      valence: Math.max(-1, Math.min(1, valence)),
      arousal: Math.max(-1, Math.min(1, arousal)),
      dominance: Math.max(0, Math.min(1, dominance)),
    };
  }

  private getTextPrimaryEmotion(textAnalysis: ITextAnalysis): string {
    let primary = 'neutral';
    let maxProb = 0;
    textAnalysis.textEmotions.forEach((prob, emotion) => {
      if (prob > maxProb) {
        maxProb = prob;
        primary = emotion;
      }
    });
    return primary;
  }

  private calculateModalityAgreement(
    voice: IVoiceEmotionEstimate,
    text: ITextAnalysis
  ): number {
    const voicePrimary = voice.primaryEmotion;
    const textPrimary = this.getTextPrimaryEmotion(text);

    // Same emotion = high agreement
    if (voicePrimary === textPrimary) return 1.0;

    // Similar valence = medium agreement
    const voiceValence = voice.vad.valence;
    const textValence = text.sentiment;
    const valenceDiff = Math.abs(voiceValence - textValence);

    return Math.max(0, 1 - valenceDiff);
  }

  private analyzeDiscrepancy(
    voicePrimary: string,
    textPrimary: string,
    voice: IVoiceEmotionEstimate,
    text: ITextAnalysis
  ): IMultimodalFusion['discrepancy'] {
    const voiceValence = voice.vad.valence;
    const textValence = text.sentiment;

    // Positive text + negative voice = suppression
    if (textValence > 0 && voiceValence < -0.3) {
      return {
        type: 'suppression',
        textEmotion: textPrimary,
        voiceEmotion: voicePrimary,
        interpretation: 'Голос выражает негативные эмоции, скрываемые в словах. Возможно подавление эмоций.',
      };
    }

    // Negative text + positive voice = masking
    if (textValence < 0 && voiceValence > 0.3) {
      return {
        type: 'masking',
        textEmotion: textPrimary,
        voiceEmotion: voicePrimary,
        interpretation: 'Позитивный тон голоса маскирует негативное содержание. Рекомендуется уточнить состояние.',
      };
    }

    // Both negative but different intensity
    if (textValence < 0 && voiceValence < 0) {
      const voiceIntensity = Math.abs(voiceValence);
      const textIntensity = Math.abs(textValence);

      if (voiceIntensity > textIntensity * 1.5) {
        return {
          type: 'amplification',
          textEmotion: textPrimary,
          voiceEmotion: voicePrimary,
          interpretation: 'Голос передаёт более сильные негативные эмоции, чем слова.',
        };
      }
    }

    return {
      type: 'none',
      textEmotion: textPrimary,
      voiceEmotion: voicePrimary,
      interpretation: 'Модальности согласованы.',
    };
  }

  private generateRecommendations(
    vad: IMultimodalFusion['vad'],
    voice: IVoiceEmotionEstimate,
    text: ITextAnalysis,
    discrepancy?: IMultimodalFusion['discrepancy']
  ): string[] {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (text.riskKeywords.length > 0) {
      const severity = Math.max(...text.riskKeywords.map(r => r.severity));
      if (severity >= 0.8) {
        recommendations.push('ВНИМАНИЕ: Обнаружены индикаторы высокого риска. Рекомендуется немедленная оценка безопасности.');
      } else {
        recommendations.push('Обнаружены потенциальные индикаторы риска. Рекомендуется дополнительная проверка.');
      }
    }

    // Depression indicators
    if (voice.depressionIndicators.score > 0.6) {
      recommendations.push('Голосовые биомаркеры указывают на возможные симптомы депрессии. Рекомендуется оценка PHQ-9.');
    }

    // Anxiety indicators
    if (voice.anxietyIndicators.score > 0.6) {
      recommendations.push('Выявлены признаки повышенной тревожности в голосе. Рассмотрите техники релаксации.');
    }

    // Discrepancy recommendations
    if (discrepancy && discrepancy.type !== 'none') {
      recommendations.push(`Обнаружено расхождение между речью и голосом (${discrepancy.type}). ${discrepancy.interpretation}`);
    }

    // Cognitive distortions
    if (text.cognitiveDistortions.length > 0) {
      const types = [...new Set(text.cognitiveDistortions.map(d => d.type))];
      recommendations.push(`Обнаружены когнитивные искажения: ${types.join(', ')}. Рекомендуется работа с КПТ-техниками.`);
    }

    // General wellbeing
    if (vad.valence > 0.5 && voice.stressIndicators.score < 0.3) {
      recommendations.push('Общее эмоциональное состояние стабильное и позитивное.');
    }

    return recommendations;
  }
}

/**
 * Factory function
 */
export function createVoiceInputAdapter(
  config?: Partial<IVoiceAdapterConfig>
): IVoiceInputAdapter {
  return new VoiceInputAdapter(config);
}

export { DEFAULT_VOICE_CONFIG };
