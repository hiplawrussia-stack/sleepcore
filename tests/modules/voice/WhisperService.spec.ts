/**
 * WhisperService Unit Tests
 * =========================
 *
 * Tests for OpenAI Whisper API integration service.
 */

import { WhisperService, ITranscriptionResult } from '../../../src/modules/voice/WhisperService';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('WhisperService', () => {
  let service: WhisperService;
  const testApiKey = 'test-api-key';

  beforeEach(() => {
    service = new WhisperService({ apiKey: testApiKey });
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should create service with default config', () => {
      const config = service.getConfig();
      expect(config.model).toBe('whisper-1');
      expect(config.language).toBe('ru');
    });

    it('should accept custom config', () => {
      const customService = new WhisperService({
        apiKey: testApiKey,
        model: 'custom-model',
        language: 'en',
      });
      const config = customService.getConfig();
      expect(config.model).toBe('custom-model');
      expect(config.language).toBe('en');
    });
  });

  describe('transcribe', () => {
    it('should transcribe audio buffer successfully', async () => {
      const mockResponse = {
        text: 'Привет, это тестовая запись',
        language: 'ru',
        duration: 5.5,
        segments: [
          {
            id: 0,
            start: 0,
            end: 5.5,
            text: 'Привет, это тестовая запись',
            avg_logprob: -0.3,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const audioBuffer = Buffer.from('test audio data');
      const result = await service.transcribe(audioBuffer);

      expect(result.text).toBe('Привет, это тестовая запись');
      expect(result.language).toBe('ru');
      expect(result.duration).toBe(5.5);
      expect(result.segments).toHaveLength(1);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const audioBuffer = Buffer.from('test audio data');
      await expect(service.transcribe(audioBuffer)).rejects.toThrow('Whisper API error');
    });

    it('should handle empty segments', async () => {
      const mockResponse = {
        text: 'Тест',
        language: 'ru',
        duration: 1,
        segments: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const audioBuffer = Buffer.from('test');
      const result = await service.transcribe(audioBuffer);

      expect(result.confidence).toBe(0.8); // Default confidence
    });
  });

  describe('transcribeFromUrl', () => {
    it('should download and transcribe from URL', async () => {
      // Mock audio download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      });

      // Mock Whisper API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Голосовая запись',
          language: 'ru',
          duration: 3,
          segments: [],
        }),
      });

      const result = await service.transcribeFromUrl('https://example.com/audio.ogg');

      expect(result.text).toBe('Голосовая запись');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error on download failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        service.transcribeFromUrl('https://example.com/notfound.ogg')
      ).rejects.toThrow('Failed to download audio');
    });
  });

  describe('validateTranscription', () => {
    it('should validate good transcription', () => {
      const result: ITranscriptionResult = {
        text: 'Это нормальная транскрипция текста',
        language: 'ru',
        duration: 5,
        confidence: 0.85,
        segments: [],
      };

      const validation = service.validateTranscription(result);
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect too short audio', () => {
      const result: ITranscriptionResult = {
        text: 'Текст',
        language: 'ru',
        duration: 0.5,
        confidence: 0.8,
        segments: [],
      };

      const validation = service.validateTranscription(result);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Audio too short (< 1 second)');
    });

    it('should detect possible hallucination (text too long)', () => {
      const result: ITranscriptionResult = {
        text: 'А'.repeat(150), // Very long text for short duration
        language: 'ru',
        duration: 2,
        confidence: 0.8,
        segments: [],
      };

      const validation = service.validateTranscription(result);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Text longer than expected (possible hallucination)');
    });

    it('should detect partial transcription', () => {
      const result: ITranscriptionResult = {
        text: 'Да',
        language: 'ru',
        duration: 10,
        confidence: 0.8,
        segments: [],
      };

      const validation = service.validateTranscription(result);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Text shorter than expected (possible partial transcription)');
    });

    it('should detect low confidence', () => {
      const result: ITranscriptionResult = {
        text: 'Тестовый текст средней длины',
        language: 'ru',
        duration: 3,
        confidence: 0.2,
        segments: [],
      };

      const validation = service.validateTranscription(result);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Low confidence score');
    });

    it('should detect empty transcription', () => {
      const result: ITranscriptionResult = {
        text: '   ',
        language: 'ru',
        duration: 5,
        confidence: 0.8,
        segments: [],
      };

      const validation = service.validateTranscription(result);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Empty transcription');
    });
  });
});
