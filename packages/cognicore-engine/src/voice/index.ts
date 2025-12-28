/**
 * 🎤 VOICE MODULE
 * ===============
 * Phase 1 CogniCore Engine 2.0
 *
 * Voice biomarker analysis and multimodal fusion:
 * - Acoustic feature extraction (F0, jitter, shimmer, MFCCs)
 * - Prosody-to-emotion mapping
 * - Text-voice multimodal fusion
 * - Depression/anxiety/stress indicators
 *
 * © БФ "Другой путь", 2025
 */

export {
  VoiceInputAdapter,
  createVoiceInputAdapter,
  DEFAULT_VOICE_CONFIG,
} from './VoiceInputAdapter';

export type {
  IVoiceInputAdapter,
  IVoiceAdapterConfig,
  IVoiceProcessingResult,
  IAcousticFeatures,
  IProsodyFeatures,
  IVoiceEmotionEstimate,
  ITextAnalysis,
  IMultimodalFusion,
  VoiceInputAdapterFactory,
} from './interfaces/IVoiceAdapter';
