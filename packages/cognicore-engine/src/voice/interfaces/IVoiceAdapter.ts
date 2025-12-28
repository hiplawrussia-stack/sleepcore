/**
 * 🎤 VOICE INPUT ADAPTER INTERFACES
 * ==================================
 * Acoustic Feature Extraction & Multimodal Fusion
 *
 * Scientific Foundation (2025 Research):
 * - JMIR Mental Health 2025: "Speech Emotion Recognition in Mental Health: Systematic Review"
 * - Wav2Vec2 + NCDEs: 74% accuracy in emotion recognition
 * - Voice biomarkers: F0, jitter, shimmer for depression detection
 * - Prosody analysis: Pitch contour, speech rate, pauses
 *
 * Key Features:
 * - Acoustic feature extraction (F0, jitter, shimmer, HNR, MFCCs)
 * - Prosody → Emotional state mapping (VAD)
 * - Multimodal fusion (text + voice)
 * - Whisper API integration for transcription
 * - Real-time and offline processing
 *
 * © БФ "Другой путь", 2025
 */

/**
 * Voice Input Configuration
 */
export interface IVoiceAdapterConfig {
  /** Sample rate for audio processing (Hz) */
  sampleRate: number;

  /** Frame size for feature extraction (ms) */
  frameSizeMs: number;

  /** Hop size for overlapping frames (ms) */
  hopSizeMs: number;

  /** Number of MFCC coefficients */
  numMfcc: number;

  /** Minimum F0 for pitch detection (Hz) */
  minF0: number;

  /** Maximum F0 for pitch detection (Hz) */
  maxF0: number;

  /** Enable Whisper API for transcription */
  enableWhisper: boolean;

  /** Whisper API endpoint */
  whisperEndpoint?: string;

  /** Whisper API key */
  whisperApiKey?: string;

  /** Text-voice fusion strategy */
  fusionStrategy: 'early' | 'late' | 'hybrid';

  /** Fusion weights [text, voice] */
  fusionWeights: [number, number];

  /** Enable real-time processing */
  realtime: boolean;

  /** Buffer size for real-time (frames) */
  realtimeBufferSize: number;

  /** Language for speech recognition */
  language: string;
}

/**
 * Default Voice Adapter Configuration
 */
export const DEFAULT_VOICE_CONFIG: IVoiceAdapterConfig = {
  sampleRate: 16000,
  frameSizeMs: 25,
  hopSizeMs: 10,
  numMfcc: 13,
  minF0: 75, // Human voice range
  maxF0: 500,
  enableWhisper: true,
  fusionStrategy: 'late',
  fusionWeights: [0.6, 0.4], // Text slightly more important
  realtime: false,
  realtimeBufferSize: 100,
  language: 'ru',
};

/**
 * Acoustic Features extracted from voice
 */
export interface IAcousticFeatures {
  /** Fundamental frequency (pitch) statistics */
  pitch: {
    /** Mean F0 in Hz */
    meanF0: number;
    /** Standard deviation of F0 */
    stdF0: number;
    /** Minimum F0 */
    minF0: number;
    /** Maximum F0 */
    maxF0: number;
    /** F0 range */
    rangeF0: number;
    /** Pitch contour (F0 values per frame) */
    contour: number[];
    /** Voiced frames ratio */
    voicedRatio: number;
  };

  /** Voice quality measures */
  voiceQuality: {
    /** Jitter (pitch perturbation) - % */
    jitterLocal: number;
    /** Shimmer (amplitude perturbation) - % */
    shimmerLocal: number;
    /** Harmonics-to-Noise Ratio (dB) */
    hnr: number;
    /** Noise-to-Harmonics Ratio */
    nhr: number;
  };

  /** Temporal features */
  temporal: {
    /** Speech rate (syllables per second) */
    speechRate: number;
    /** Articulation rate */
    articulationRate: number;
    /** Total duration (seconds) */
    duration: number;
    /** Speaking time (excluding pauses) */
    speakingTime: number;
    /** Pause duration total */
    pauseDuration: number;
    /** Number of pauses */
    pauseCount: number;
    /** Mean pause duration */
    meanPauseDuration: number;
  };

  /** Spectral features */
  spectral: {
    /** MFCC coefficients (mean per coefficient) */
    mfccMean: number[];
    /** MFCC standard deviation */
    mfccStd: number[];
    /** Spectral centroid mean */
    spectralCentroid: number;
    /** Spectral flux (change rate) */
    spectralFlux: number;
    /** Spectral rolloff frequency */
    spectralRolloff: number;
  };

  /** Energy features */
  energy: {
    /** Mean energy (dB) */
    meanEnergy: number;
    /** Energy standard deviation */
    stdEnergy: number;
    /** Energy range */
    rangeEnergy: number;
    /** Energy contour */
    contour: number[];
  };

  /** Quality metrics */
  quality: {
    /** Overall signal quality (0-1) */
    signalQuality: number;
    /** Background noise level (dB) */
    noiseLevel: number;
    /** Clipping ratio */
    clippingRatio: number;
    /** Silence ratio */
    silenceRatio: number;
  };
}

/**
 * Prosody features (suprasegmental)
 */
export interface IProsodyFeatures {
  /** Pitch pattern type */
  pitchPattern: 'monotone' | 'varied' | 'rising' | 'falling' | 'irregular';

  /** Speech rhythm pattern */
  rhythmPattern: 'regular' | 'irregular' | 'hesitant' | 'rushed';

  /** Stress patterns (emphatic words) */
  stressPatterns: Array<{
    word: string;
    position: number;
    strength: number;
  }>;

  /** Intonation contour type */
  intonationType: 'declarative' | 'interrogative' | 'exclamatory' | 'neutral';

  /** Emotional prosody indicators */
  emotionalIndicators: {
    /** Higher pitch = more arousal */
    arousalLevel: number;
    /** Pitch variability = emotional expressiveness */
    expressiveness: number;
    /** Slow/fast rate = depressed/anxious */
    energyLevel: number;
    /** Voice tremor indicator */
    tremorIndicator: number;
  };

  /** Pause patterns */
  pausePatterns: {
    /** Long pauses before words (hesitation) */
    hesitationMarkers: number;
    /** Filled pauses (um, uh) count */
    filledPauses: number;
    /** Pause pattern suggests cognitive load */
    cognitiveLoadIndicator: number;
  };
}

/**
 * Voice-based emotional state estimate
 */
export interface IVoiceEmotionEstimate {
  /** Primary emotion detected */
  primaryEmotion: string;

  /** Emotion probabilities */
  emotionProbabilities: Map<string, number>;

  /** VAD (Valence-Arousal-Dominance) estimate */
  vad: {
    valence: number; // -1 to 1
    arousal: number; // -1 to 1
    dominance: number; // 0 to 1
    confidence: number;
  };

  /** Depression indicators */
  depressionIndicators: {
    /** Flat affect (low pitch variation) */
    flatAffect: number;
    /** Psychomotor retardation (slow speech) */
    psychomotorRetardation: number;
    /** Low energy voice */
    lowEnergy: number;
    /** Overall depression score (0-1) */
    score: number;
    /** Confidence in assessment */
    confidence: number;
  };

  /** Anxiety indicators */
  anxietyIndicators: {
    /** High pitch */
    highPitch: number;
    /** Fast speech rate */
    fastSpeech: number;
    /** Voice tremor */
    tremor: number;
    /** Hesitation frequency */
    hesitation: number;
    /** Overall anxiety score (0-1) */
    score: number;
    /** Confidence */
    confidence: number;
  };

  /** Stress indicators */
  stressIndicators: {
    /** Increased jitter/shimmer */
    voiceInstability: number;
    /** Reduced HNR */
    reducedClarity: number;
    /** Irregular breathing patterns */
    breathingIrregularity: number;
    /** Overall stress score (0-1) */
    score: number;
    /** Confidence */
    confidence: number;
  };
}

/**
 * Text analysis result (from transcription)
 */
export interface ITextAnalysis {
  /** Transcribed text */
  text: string;

  /** Language detected */
  language: string;

  /** Word count */
  wordCount: number;

  /** Sentiment score (-1 to 1) */
  sentiment: number;

  /** Key phrases extracted */
  keyPhrases: string[];

  /** Detected emotions from text */
  textEmotions: Map<string, number>;

  /** Cognitive distortions detected */
  cognitiveDistortions: Array<{
    type: string;
    phrase: string;
    confidence: number;
  }>;

  /** Risk keywords detected */
  riskKeywords: Array<{
    keyword: string;
    category: string;
    severity: number;
  }>;

  /** Transcription confidence */
  confidence: number;
}

/**
 * Multimodal fusion result
 */
export interface IMultimodalFusion {
  /** Fused VAD estimate */
  vad: {
    valence: number;
    arousal: number;
    dominance: number;
    confidence: number;
  };

  /** Fused emotion probabilities */
  emotionProbabilities: Map<string, number>;

  /** Primary emotion after fusion */
  primaryEmotion: string;

  /** Component contributions */
  contributions: {
    text: number;
    voice: number;
  };

  /** Agreement between modalities */
  modalityAgreement: number;

  /** Discrepancy analysis (when text and voice disagree) */
  discrepancy?: {
    type: 'suppression' | 'masking' | 'amplification' | 'none';
    textEmotion: string;
    voiceEmotion: string;
    interpretation: string;
  };

  /** Overall confidence after fusion */
  confidence: number;

  /** Recommendations based on analysis */
  recommendations: string[];
}

/**
 * Voice processing result
 */
export interface IVoiceProcessingResult {
  /** Processing ID */
  id: string;

  /** Timestamp */
  timestamp: Date;

  /** Audio duration (seconds) */
  duration: number;

  /** Acoustic features */
  acousticFeatures: IAcousticFeatures;

  /** Prosody features */
  prosodyFeatures: IProsodyFeatures;

  /** Voice-based emotion estimate */
  voiceEmotion: IVoiceEmotionEstimate;

  /** Text analysis (if transcription enabled) */
  textAnalysis?: ITextAnalysis;

  /** Multimodal fusion result */
  fusion?: IMultimodalFusion;

  /** Processing quality metrics */
  quality: {
    audioQuality: number;
    featureReliability: number;
    overallConfidence: number;
  };
}

/**
 * Voice Input Adapter Interface
 */
export interface IVoiceInputAdapter {
  /**
   * Initialize adapter
   */
  initialize(config?: Partial<IVoiceAdapterConfig>): Promise<void>;

  /**
   * Process audio buffer
   */
  processAudio(
    audioBuffer: Float32Array,
    sampleRate?: number
  ): Promise<IVoiceProcessingResult>;

  /**
   * Process audio file
   */
  processFile(
    filePath: string
  ): Promise<IVoiceProcessingResult>;

  /**
   * Process with transcription
   */
  processWithTranscription(
    audioBuffer: Float32Array,
    existingTranscript?: string
  ): Promise<IVoiceProcessingResult>;

  /**
   * Extract acoustic features only
   */
  extractAcousticFeatures(
    audioBuffer: Float32Array
  ): IAcousticFeatures;

  /**
   * Extract prosody features
   */
  extractProsodyFeatures(
    audioBuffer: Float32Array,
    acousticFeatures?: IAcousticFeatures
  ): IProsodyFeatures;

  /**
   * Map acoustic features to emotional state
   */
  mapToEmotion(
    acoustic: IAcousticFeatures,
    prosody: IProsodyFeatures
  ): IVoiceEmotionEstimate;

  /**
   * Fuse text and voice modalities
   */
  fuseModalities(
    voiceEmotion: IVoiceEmotionEstimate,
    textAnalysis: ITextAnalysis
  ): IMultimodalFusion;

  /**
   * Transcribe audio using Whisper API
   */
  transcribe(
    audioBuffer: Float32Array
  ): Promise<ITextAnalysis>;

  /**
   * Analyze text for emotions and risk
   */
  analyzeText(text: string): ITextAnalysis;

  /**
   * Real-time processing: add audio chunk
   */
  addRealtimeChunk(chunk: Float32Array): void;

  /**
   * Real-time processing: get current estimate
   */
  getRealtimeEstimate(): IVoiceEmotionEstimate | null;

  /**
   * Convert to state vector observation
   */
  toStateObservation(result: IVoiceProcessingResult): number[];

  /**
   * Get configuration
   */
  getConfig(): IVoiceAdapterConfig;

  /**
   * Update fusion weights based on historical accuracy
   */
  adaptFusionWeights(
    predictions: IMultimodalFusion[],
    actuals: IVoiceEmotionEstimate[]
  ): void;
}

/**
 * Factory type
 */
export type VoiceInputAdapterFactory = (
  config?: Partial<IVoiceAdapterConfig>
) => IVoiceInputAdapter;
