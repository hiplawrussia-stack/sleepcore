/**
 * WhisperService - OpenAI Whisper API Integration for Voice Transcription
 * ========================================================================
 *
 * Transcribes voice messages to text using OpenAI's Whisper API.
 * Optimized for Russian language with research-based best practices.
 *
 * Research basis:
 * - Whisper large-v3 achieves 9.84% WER for Russian
 * - Fine-tuned models achieve 6.39% WER (Common Voice 17.0)
 * - Prompting with punctuation improves accuracy
 * - Response format 'verbose_json' provides confidence scores
 *
 * @packageDocumentation
 * @module @sleepcore/modules/voice
 */

import { createReadStream } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Transcription result from Whisper API
 */
export interface ITranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence: number;
  segments?: ITranscriptionSegment[];
}

/**
 * Transcription segment with timing info
 */
export interface ITranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  avgLogprob: number;
}

/**
 * Whisper API configuration
 */
export interface IWhisperConfig {
  apiKey: string;
  model?: string;
  language?: string;
  prompt?: string;
  temperature?: number;
}

/**
 * Default Russian prompt for better accuracy
 */
const DEFAULT_RUSSIAN_PROMPT = 'Привет. Сегодня я хочу рассказать о своём сне и настроении...';

/**
 * WhisperService - Handles voice transcription via OpenAI API
 */
export class WhisperService {
  private apiKey: string;
  private model: string;
  private language: string;
  private defaultPrompt: string;
  private tempDir: string;

  constructor(config: IWhisperConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'whisper-1';
    this.language = config.language || 'ru';
    this.defaultPrompt = config.prompt || DEFAULT_RUSSIAN_PROMPT;
    this.tempDir = tmpdir();
  }

  /**
   * Transcribe audio buffer to text
   *
   * @param audioBuffer - Audio data as Buffer
   * @param options - Optional transcription options
   * @returns Transcription result with text and metadata
   */
  async transcribe(
    audioBuffer: Buffer,
    options?: {
      prompt?: string;
      temperature?: number;
    }
  ): Promise<ITranscriptionResult> {
    const tempFile = join(this.tempDir, `whisper_${Date.now()}_${Math.random().toString(36).slice(2)}.ogg`);

    try {
      // Write buffer to temp file
      await writeFile(tempFile, audioBuffer);

      // Prepare form data
      const formData = new FormData();
      const fileBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
      formData.append('file', fileBlob, 'audio.ogg');
      formData.append('model', this.model);
      formData.append('language', this.language);
      formData.append('response_format', 'verbose_json');
      formData.append('prompt', options?.prompt || this.defaultPrompt);

      if (options?.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return this.parseResponse(data);
    } finally {
      // Clean up temp file
      await unlink(tempFile).catch(() => {});
    }
  }

  /**
   * Transcribe audio from URL (e.g., Telegram file URL)
   *
   * @param url - URL to audio file
   * @param options - Optional transcription options
   * @returns Transcription result
   */
  async transcribeFromUrl(
    url: string,
    options?: {
      prompt?: string;
      temperature?: number;
    }
  ): Promise<ITranscriptionResult> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return this.transcribe(buffer, options);
  }

  /**
   * Parse Whisper API response into standardized result
   */
  private parseResponse(data: any): ITranscriptionResult {
    const segments: ITranscriptionSegment[] = (data.segments || []).map((seg: any) => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text,
      avgLogprob: seg.avg_logprob || 0,
    }));

    // Calculate confidence from avg_logprob
    const confidence = this.calculateConfidence(segments);

    return {
      text: data.text || '',
      language: data.language || this.language,
      duration: data.duration || 0,
      confidence,
      segments,
    };
  }

  /**
   * Calculate confidence score from segment log probabilities
   * Converts log probability to 0-1 scale
   */
  private calculateConfidence(segments: ITranscriptionSegment[]): number {
    if (segments.length === 0) {
      return 0.8; // Default confidence when no segments
    }

    const avgLogprob = segments.reduce(
      (sum, seg) => sum + seg.avgLogprob,
      0
    ) / segments.length;

    // Convert log probability to confidence (exp)
    // Typical avgLogprob ranges from -1.0 (good) to -2.0 (poor)
    return Math.min(1, Math.max(0, Math.exp(avgLogprob)));
  }

  /**
   * Validate transcription for potential hallucinations
   *
   * Research: Whisper may hallucinate text not in audio
   * Check if text length is reasonable for audio duration
   */
  validateTranscription(result: ITranscriptionResult): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check minimum duration (too short = unreliable)
    if (result.duration < 1) {
      issues.push('Audio too short (< 1 second)');
    }

    // Check text length vs duration
    // Average Russian speech: ~120 words/minute = ~2 words/second
    // ~6 characters per word = ~12 chars/second
    const expectedMaxChars = result.duration * 20; // Allow some buffer
    const expectedMinChars = result.duration * 3;

    if (result.text.length > expectedMaxChars) {
      issues.push('Text longer than expected (possible hallucination)');
    }

    if (result.text.length < expectedMinChars && result.duration > 2) {
      issues.push('Text shorter than expected (possible partial transcription)');
    }

    // Check confidence threshold
    if (result.confidence < 0.3) {
      issues.push('Low confidence score');
    }

    // Check for empty text
    if (result.text.trim().length === 0) {
      issues.push('Empty transcription');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get service configuration info (for debugging)
   */
  getConfig(): { model: string; language: string } {
    return {
      model: this.model,
      language: this.language,
    };
  }
}

// Factory function for dependency injection
export function createWhisperService(apiKey: string): WhisperService {
  return new WhisperService({ apiKey });
}
