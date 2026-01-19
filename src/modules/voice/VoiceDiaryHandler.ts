/**
 * VoiceDiaryHandler - Processes Voice Messages for Sleep Diary
 * =============================================================
 *
 * Handles Telegram voice messages, transcribes them, analyzes emotions,
 * and creates diary entries with rich metadata.
 *
 * Research basis:
 * - Fabla App: "Speech carries information we don't always consciously recognize"
 * - Real-time voice notes outperform recall-based written entries
 * - Documenting reflections in real time rather than relying on memory
 *
 * @packageDocumentation
 * @module @sleepcore/modules/voice
 */

import { WhisperService, ITranscriptionResult } from './WhisperService';
import type {
  VoiceBiomarkerService,
  IVoiceBiomarkerResult,
} from '../../bot/services/VoiceBiomarkerService';

/**
 * Voice diary entry
 */
export interface IVoiceDiaryEntry {
  id: string;
  userId: string;
  text: string;
  voiceDuration: number;
  transcriptionConfidence: number;
  emotion?: string;
  emotionIntensity?: number;
  createdAt: Date;
  source: 'voice';
  metadata?: {
    fileId?: string;
    fileSize?: number;
    language?: string;
  };
  /** Voice biomarker analysis (Sprint 6) */
  biomarkers?: {
    depressionRisk: number;
    anxietyRisk: number;
    combinedRisk: number;
    confidence: number;
    interpretation: string;
    escalationRecommended: boolean;
  };
}

/**
 * Voice message info from Telegram
 */
export interface IVoiceMessage {
  fileId: string;
  fileUniqueId: string;
  duration: number;
  mimeType?: string;
  fileSize?: number;
}

/**
 * Processing result
 */
export interface IVoiceProcessingResult {
  success: boolean;
  entry?: IVoiceDiaryEntry;
  transcription?: ITranscriptionResult;
  error?: string;
  validationIssues?: string[];
  /** Voice biomarker analysis result (Sprint 6) */
  biomarkerResult?: IVoiceBiomarkerResult;
}

/**
 * Emotion analysis interface (for integration with EmotionalRecognitionService)
 */
export interface IEmotionAnalysis {
  primaryEmotion: string;
  emotionIntensity: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Emotion analyzer function type
 */
export type EmotionAnalyzer = (text: string, userId: string) => Promise<IEmotionAnalysis>;

/**
 * VoiceDiaryHandler - Processes voice messages into diary entries
 */
export class VoiceDiaryHandler {
  private whisperService: WhisperService;
  private emotionAnalyzer?: EmotionAnalyzer;
  private biomarkerService?: VoiceBiomarkerService;
  private minDuration: number = 2; // Minimum 2 seconds
  private maxDuration: number = 300; // Maximum 5 minutes

  constructor(
    whisperService: WhisperService,
    emotionAnalyzer?: EmotionAnalyzer,
    biomarkerService?: VoiceBiomarkerService
  ) {
    this.whisperService = whisperService;
    this.emotionAnalyzer = emotionAnalyzer;
    this.biomarkerService = biomarkerService;
  }

  /**
   * Process voice message and create diary entry
   *
   * @param userId - User's Telegram ID
   * @param voice - Voice message info
   * @param audioUrl - URL to download audio file
   * @returns Processing result with entry or error
   */
  async processVoiceMessage(
    userId: string,
    voice: IVoiceMessage,
    audioUrl: string
  ): Promise<IVoiceProcessingResult> {
    // Validate duration
    if (voice.duration < this.minDuration) {
      return {
        success: false,
        error: `Голосовое сообщение слишком короткое. Минимум ${this.minDuration} секунды.`,
      };
    }

    if (voice.duration > this.maxDuration) {
      return {
        success: false,
        error: `Голосовое сообщение слишком длинное. Максимум ${Math.floor(this.maxDuration / 60)} минут.`,
      };
    }

    try {
      // Transcribe voice message
      const transcription = await this.whisperService.transcribeFromUrl(audioUrl);

      // Validate transcription
      const validation = this.whisperService.validateTranscription(transcription);

      if (!validation.isValid) {
        // Still proceed but note issues
        console.warn(`Transcription validation issues for user ${userId}:`, validation.issues);
      }

      // Check if transcription is too short
      if (transcription.text.trim().length < 10) {
        return {
          success: false,
          error: 'Не удалось распознать речь. Попробуй говорить громче и чётче.',
          transcription,
          validationIssues: validation.issues,
        };
      }

      // Analyze emotions if analyzer is available
      let emotionAnalysis: IEmotionAnalysis | undefined;
      if (this.emotionAnalyzer) {
        try {
          emotionAnalysis = await this.emotionAnalyzer(transcription.text, userId);
        } catch (error) {
          console.warn('Emotion analysis failed:', error);
        }
      }

      // Analyze voice biomarkers if service is available (Sprint 6)
      let biomarkerResult: IVoiceBiomarkerResult | undefined;
      if (this.biomarkerService) {
        try {
          // Download audio buffer for biomarker analysis
          const audioResponse = await fetch(audioUrl);
          if (audioResponse.ok) {
            const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
            biomarkerResult = await this.biomarkerService.analyzeVoice(
              userId,
              audioBuffer,
              voice.duration
            );
          }
        } catch (error) {
          console.warn('Voice biomarker analysis failed:', error);
        }
      }

      // Create diary entry
      const entry: IVoiceDiaryEntry = {
        id: `voice_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId,
        text: transcription.text,
        voiceDuration: voice.duration,
        transcriptionConfidence: transcription.confidence,
        emotion: emotionAnalysis?.primaryEmotion,
        emotionIntensity: emotionAnalysis?.emotionIntensity,
        createdAt: new Date(),
        source: 'voice',
        metadata: {
          fileId: voice.fileId,
          fileSize: voice.fileSize,
          language: transcription.language,
        },
        // Add biomarker data if available
        biomarkers: biomarkerResult ? {
          depressionRisk: biomarkerResult.depressionRisk,
          anxietyRisk: biomarkerResult.anxietyRisk,
          combinedRisk: biomarkerResult.combinedRisk,
          confidence: biomarkerResult.confidence,
          interpretation: biomarkerResult.interpretation.summaryRu,
          escalationRecommended: biomarkerResult.interpretation.escalationRecommended,
        } : undefined,
      };

      return {
        success: true,
        entry,
        transcription,
        validationIssues: validation.isValid ? undefined : validation.issues,
        biomarkerResult,
      };
    } catch (error) {
      console.error('Voice processing error:', error);
      return {
        success: false,
        error: 'Не удалось обработать голосовое сообщение. Попробуй ещё раз.',
      };
    }
  }

  /**
   * Format response message for user
   */
  formatResponseMessage(result: IVoiceProcessingResult): string {
    if (!result.success || !result.entry) {
      return `😔 ${result.error || 'Произошла ошибка'}`;
    }

    const entry = result.entry;
    const emotionEmoji = this.getEmotionEmoji(entry.emotion);
    const truncatedText = this.truncateText(entry.text, 100);

    let message = `📔 *Запись в дневнике сохранена!*\n\n`;
    message += `🎤 _"${truncatedText}"_\n\n`;

    if (entry.emotion) {
      message += `${emotionEmoji} Настроение: *${this.translateEmotion(entry.emotion)}*\n`;
    }

    if (entry.emotionIntensity !== undefined) {
      message += `📊 Интенсивность: ${this.formatIntensityBar(entry.emotionIntensity)}\n`;
    }

    // Add supportive message based on emotion
    message += `\n${this.getSupportiveMessage(entry.emotion, entry.emotionIntensity)}`;

    // Add entry info
    const date = entry.createdAt.toLocaleDateString('ru-RU');
    message += `\n\n_Запись • ${date}_`;

    return message;
  }

  /**
   * Get emoji for emotion
   */
  private getEmotionEmoji(emotion?: string): string {
    const emojis: Record<string, string> = {
      joy: '😊',
      sadness: '😢',
      anger: '😠',
      fear: '😨',
      stress: '😰',
      anxiety: '😟',
      calm: '😌',
      hope: '🌟',
      neutral: '😐',
      tired: '😴',
      confused: '🤔',
      gratitude: '🙏',
      excitement: '🤩',
    };
    return emojis[emotion || ''] || '💭';
  }

  /**
   * Translate emotion to Russian
   */
  private translateEmotion(emotion: string): string {
    const translations: Record<string, string> = {
      joy: 'Радость',
      sadness: 'Грусть',
      anger: 'Злость',
      fear: 'Страх',
      stress: 'Стресс',
      anxiety: 'Тревога',
      calm: 'Спокойствие',
      hope: 'Надежда',
      neutral: 'Нейтральное',
      tired: 'Усталость',
      confused: 'Замешательство',
      gratitude: 'Благодарность',
      excitement: 'Волнение',
    };
    return translations[emotion] || emotion;
  }

  /**
   * Format intensity bar visualization
   */
  private formatIntensityBar(intensity: number): string {
    const filled = Math.round(intensity * 5);
    return '●'.repeat(filled) + '○'.repeat(5 - filled);
  }

  /**
   * Get supportive message based on emotion
   */
  private getSupportiveMessage(emotion?: string, intensity?: number): string {
    // High intensity negative emotions
    if (intensity && intensity > 0.7) {
      if (['sadness', 'anger', 'fear', 'stress', 'anxiety'].includes(emotion || '')) {
        return '💚 Соня заметила, что тебе непросто. Если нужна поддержка, используй /sos';
      }
    }

    const messages: Record<string, string> = {
      joy: '🌟 Как здорово! Соня рада за тебя!',
      sadness: '💙 Соня рядом. Всё пройдёт.',
      stress: '🧘 Попробуй /relax для расслабления.',
      anxiety: '🌿 Дыхательные упражнения могут помочь.',
      tired: '🌙 Отдых — это важно. Заботься о себе.',
      calm: '✨ Отличное состояние для здорового сна!',
      hope: '🌈 Прекрасный настрой! Так держать!',
      gratitude: '💝 Благодарность — путь к гармонии.',
    };

    return messages[emotion || ''] || '💭 Спасибо, что поделился своими мыслями.';
  }

  /**
   * Truncate text with ellipsis
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Set emotion analyzer (for dependency injection)
   */
  setEmotionAnalyzer(analyzer: EmotionAnalyzer): void {
    this.emotionAnalyzer = analyzer;
  }

  /**
   * Set voice biomarker service (Sprint 6)
   */
  setBiomarkerService(service: VoiceBiomarkerService): void {
    this.biomarkerService = service;
  }

  /**
   * Configure duration limits
   */
  setDurationLimits(min: number, max: number): void {
    this.minDuration = min;
    this.maxDuration = max;
  }
}

// Factory function
export function createVoiceDiaryHandler(
  whisperService: WhisperService,
  emotionAnalyzer?: EmotionAnalyzer,
  biomarkerService?: VoiceBiomarkerService
): VoiceDiaryHandler {
  return new VoiceDiaryHandler(whisperService, emotionAnalyzer, biomarkerService);
}
