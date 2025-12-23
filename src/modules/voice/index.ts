/**
 * Voice Module
 * ============
 *
 * Voice diary and speech-to-text functionality.
 * Uses OpenAI Whisper API for transcription.
 *
 * @packageDocumentation
 * @module @sleepcore/modules/voice
 */

export {
  WhisperService,
  createWhisperService,
  type ITranscriptionResult,
  type ITranscriptionSegment,
  type IWhisperConfig,
} from './WhisperService';

export {
  VoiceDiaryHandler,
  createVoiceDiaryHandler,
  type IVoiceDiaryEntry,
  type IVoiceMessage,
  type IVoiceProcessingResult,
  type IEmotionAnalysis,
  type EmotionAnalyzer,
} from './VoiceDiaryHandler';
