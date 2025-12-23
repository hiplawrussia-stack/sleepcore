/**
 * VoiceDiaryHandler Unit Tests
 * ============================
 *
 * Tests for voice message processing and diary entry creation.
 */

import {
  VoiceDiaryHandler,
  IVoiceMessage,
  IEmotionAnalysis,
  EmotionAnalyzer,
} from '../../../src/modules/voice/VoiceDiaryHandler';
import { WhisperService, ITranscriptionResult } from '../../../src/modules/voice/WhisperService';

// Mock WhisperService
jest.mock('../../../src/modules/voice/WhisperService');

describe('VoiceDiaryHandler', () => {
  let handler: VoiceDiaryHandler;
  let mockWhisperService: jest.Mocked<WhisperService>;
  let mockEmotionAnalyzer: jest.MockedFunction<EmotionAnalyzer>;

  const testVoiceMessage: IVoiceMessage = {
    fileId: 'test-file-id',
    fileUniqueId: 'test-unique-id',
    duration: 10,
    mimeType: 'audio/ogg',
    fileSize: 5000,
  };

  const testTranscription: ITranscriptionResult = {
    text: 'Сегодня я чувствую себя хорошо, спал отлично',
    language: 'ru',
    duration: 10,
    confidence: 0.9,
    segments: [],
  };

  const testEmotionAnalysis: IEmotionAnalysis = {
    primaryEmotion: 'joy',
    emotionIntensity: 0.7,
    riskLevel: 'low',
  };

  beforeEach(() => {
    mockWhisperService = {
      transcribeFromUrl: jest.fn(),
      validateTranscription: jest.fn(),
      getConfig: jest.fn(),
    } as unknown as jest.Mocked<WhisperService>;

    mockEmotionAnalyzer = jest.fn();

    handler = new VoiceDiaryHandler(mockWhisperService, mockEmotionAnalyzer);
  });

  describe('processVoiceMessage', () => {
    it('should process voice message successfully', async () => {
      mockWhisperService.transcribeFromUrl.mockResolvedValue(testTranscription);
      mockWhisperService.validateTranscription.mockReturnValue({ isValid: true, issues: [] });
      mockEmotionAnalyzer.mockResolvedValue(testEmotionAnalysis);

      const result = await handler.processVoiceMessage(
        'user123',
        testVoiceMessage,
        'https://example.com/audio.ogg'
      );

      expect(result.success).toBe(true);
      expect(result.entry).toBeDefined();
      expect(result.entry!.text).toBe(testTranscription.text);
      expect(result.entry!.userId).toBe('user123');
      expect(result.entry!.voiceDuration).toBe(10);
      expect(result.entry!.emotion).toBe('joy');
      expect(result.entry!.emotionIntensity).toBe(0.7);
      expect(result.entry!.source).toBe('voice');
    });

    it('should reject too short voice messages', async () => {
      const shortVoice: IVoiceMessage = { ...testVoiceMessage, duration: 1 };

      const result = await handler.processVoiceMessage(
        'user123',
        shortVoice,
        'https://example.com/audio.ogg'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('слишком короткое');
      expect(mockWhisperService.transcribeFromUrl).not.toHaveBeenCalled();
    });

    it('should reject too long voice messages', async () => {
      const longVoice: IVoiceMessage = { ...testVoiceMessage, duration: 400 };

      const result = await handler.processVoiceMessage(
        'user123',
        longVoice,
        'https://example.com/audio.ogg'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('слишком длинное');
    });

    it('should handle transcription failure', async () => {
      mockWhisperService.transcribeFromUrl.mockRejectedValue(new Error('API Error'));

      const result = await handler.processVoiceMessage(
        'user123',
        testVoiceMessage,
        'https://example.com/audio.ogg'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось обработать');
    });

    it('should handle empty transcription', async () => {
      const emptyTranscription = { ...testTranscription, text: 'Да' };
      mockWhisperService.transcribeFromUrl.mockResolvedValue(emptyTranscription);
      mockWhisperService.validateTranscription.mockReturnValue({ isValid: false, issues: ['Too short'] });

      const result = await handler.processVoiceMessage(
        'user123',
        testVoiceMessage,
        'https://example.com/audio.ogg'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Не удалось распознать');
    });

    it('should work without emotion analyzer', async () => {
      const handlerNoEmotion = new VoiceDiaryHandler(mockWhisperService);
      mockWhisperService.transcribeFromUrl.mockResolvedValue(testTranscription);
      mockWhisperService.validateTranscription.mockReturnValue({ isValid: true, issues: [] });

      const result = await handlerNoEmotion.processVoiceMessage(
        'user123',
        testVoiceMessage,
        'https://example.com/audio.ogg'
      );

      expect(result.success).toBe(true);
      expect(result.entry!.emotion).toBeUndefined();
    });

    it('should handle emotion analyzer failure gracefully', async () => {
      mockWhisperService.transcribeFromUrl.mockResolvedValue(testTranscription);
      mockWhisperService.validateTranscription.mockReturnValue({ isValid: true, issues: [] });
      mockEmotionAnalyzer.mockRejectedValue(new Error('Emotion analysis failed'));

      const result = await handler.processVoiceMessage(
        'user123',
        testVoiceMessage,
        'https://example.com/audio.ogg'
      );

      // Should still succeed, just without emotion
      expect(result.success).toBe(true);
      expect(result.entry!.emotion).toBeUndefined();
    });

    it('should include validation issues in result', async () => {
      mockWhisperService.transcribeFromUrl.mockResolvedValue(testTranscription);
      mockWhisperService.validateTranscription.mockReturnValue({
        isValid: false,
        issues: ['Low confidence'],
      });
      mockEmotionAnalyzer.mockResolvedValue(testEmotionAnalysis);

      const result = await handler.processVoiceMessage(
        'user123',
        testVoiceMessage,
        'https://example.com/audio.ogg'
      );

      expect(result.success).toBe(true); // Still successful, but with issues noted
      expect(result.validationIssues).toContain('Low confidence');
    });
  });

  describe('formatResponseMessage', () => {
    it('should format success message', async () => {
      mockWhisperService.transcribeFromUrl.mockResolvedValue(testTranscription);
      mockWhisperService.validateTranscription.mockReturnValue({ isValid: true, issues: [] });
      mockEmotionAnalyzer.mockResolvedValue(testEmotionAnalysis);

      const result = await handler.processVoiceMessage(
        'user123',
        testVoiceMessage,
        'https://example.com/audio.ogg'
      );

      const message = handler.formatResponseMessage(result);

      expect(message).toContain('Запись в дневнике сохранена');
      expect(message).toContain('Радость');
      expect(message).toContain('Настроение');
    });

    it('should format error message', () => {
      const errorResult = {
        success: false,
        error: 'Test error message',
      };

      const message = handler.formatResponseMessage(errorResult);

      expect(message).toContain('Test error message');
    });

    it('should truncate long text', async () => {
      const longTranscription = {
        ...testTranscription,
        text: 'А'.repeat(200),
      };
      mockWhisperService.transcribeFromUrl.mockResolvedValue(longTranscription);
      mockWhisperService.validateTranscription.mockReturnValue({ isValid: true, issues: [] });
      mockEmotionAnalyzer.mockResolvedValue(testEmotionAnalysis);

      const result = await handler.processVoiceMessage(
        'user123',
        testVoiceMessage,
        'https://example.com/audio.ogg'
      );

      const message = handler.formatResponseMessage(result);
      expect(message).toContain('...');
    });
  });

  describe('setEmotionAnalyzer', () => {
    it('should allow setting emotion analyzer after construction', async () => {
      const handlerNoEmotion = new VoiceDiaryHandler(mockWhisperService);
      mockWhisperService.transcribeFromUrl.mockResolvedValue(testTranscription);
      mockWhisperService.validateTranscription.mockReturnValue({ isValid: true, issues: [] });

      // Process without analyzer
      let result = await handlerNoEmotion.processVoiceMessage(
        'user123',
        testVoiceMessage,
        'https://example.com/audio.ogg'
      );
      expect(result.entry!.emotion).toBeUndefined();

      // Set analyzer
      handlerNoEmotion.setEmotionAnalyzer(mockEmotionAnalyzer);
      mockEmotionAnalyzer.mockResolvedValue(testEmotionAnalysis);

      // Process with analyzer
      result = await handlerNoEmotion.processVoiceMessage(
        'user123',
        testVoiceMessage,
        'https://example.com/audio.ogg'
      );
      expect(result.entry!.emotion).toBe('joy');
    });
  });

  describe('setDurationLimits', () => {
    it('should allow custom duration limits', async () => {
      handler.setDurationLimits(5, 60);

      // Test min limit
      const shortVoice: IVoiceMessage = { ...testVoiceMessage, duration: 3 };
      let result = await handler.processVoiceMessage('user123', shortVoice, 'url');
      expect(result.success).toBe(false);
      expect(result.error).toContain('5 секунды');

      // Test max limit
      const longVoice: IVoiceMessage = { ...testVoiceMessage, duration: 120 };
      result = await handler.processVoiceMessage('user123', longVoice, 'url');
      expect(result.success).toBe(false);
      expect(result.error).toContain('1 минут');
    });
  });
});
