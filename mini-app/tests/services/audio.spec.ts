/**
 * Audio Service Tests
 * ===================
 * Unit tests for breathing exercise audio feedback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Web Audio API before imports
const mockOscillatorInstance = {
  type: 'sine' as OscillatorType,
  frequency: {
    value: 0,
    setValueAtTime: vi.fn().mockReturnThis(),
    exponentialRampToValueAtTime: vi.fn().mockReturnThis(),
  },
  connect: vi.fn().mockReturnThis(),
  disconnect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGainInstance = {
  gain: {
    value: 0,
    setValueAtTime: vi.fn().mockReturnThis(),
    linearRampToValueAtTime: vi.fn().mockReturnThis(),
    exponentialRampToValueAtTime: vi.fn().mockReturnThis(),
  },
  connect: vi.fn().mockReturnThis(),
  disconnect: vi.fn(),
};

let mockContextState = 'running';
let mockContextTime = 0;

const mockAudioContextInstance = {
  get state() {
    return mockContextState;
  },
  get currentTime() {
    return mockContextTime;
  },
  destination: {},
  createOscillator: vi.fn(() => ({ ...mockOscillatorInstance })),
  createGain: vi.fn(() => ({
    ...mockGainInstance,
    gain: { ...mockGainInstance.gain },
  })),
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

// Mock AudioContext globally
const MockAudioContext = vi.fn(() => mockAudioContextInstance);
vi.stubGlobal('AudioContext', MockAudioContext);

// Import after mocking
import { audio } from '../../src/services/audio';

describe('AudioService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset mock state
    mockContextState = 'running';
    mockContextTime = 0;

    // Reset audio service state by destroying and re-enabling
    audio.destroy();
    audio.setEnabled(true);
    audio.setPreferences({
      enabled: true,
      volume: 0.3,
      toneType: 'sine',
      baseFrequency: 220,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    audio.abort();
  });

  describe('initialization', () => {
    it('should not be available before init', () => {
      // After destroy, should not be available
      expect(audio.isAvailable()).toBe(false);
    });

    it('should initialize AudioContext on init()', () => {
      const result = audio.init();
      expect(result).toBe(true);
      expect(MockAudioContext).toHaveBeenCalled();
    });

    it('should resume suspended AudioContext', () => {
      audio.init();
      mockContextState = 'suspended';
      audio.init(); // Second init should resume
      expect(mockAudioContextInstance.resume).toHaveBeenCalled();
    });

    it('should be available after init', () => {
      audio.init();
      expect(audio.isAvailable()).toBe(true);
    });

    it('should not be available when disabled', () => {
      audio.init();
      audio.setEnabled(false);
      expect(audio.isAvailable()).toBe(false);
    });
  });

  describe('volume control', () => {
    beforeEach(() => {
      audio.init();
    });

    it('should set volume within valid range', () => {
      audio.setVolume(0.5);
      expect(audio.getVolume()).toBe(0.5);
    });

    it('should clamp volume to minimum 0', () => {
      audio.setVolume(-0.5);
      expect(audio.getVolume()).toBe(0);
    });

    it('should clamp volume to maximum 1', () => {
      audio.setVolume(1.5);
      expect(audio.getVolume()).toBe(1);
    });

    it('should update volume correctly', () => {
      audio.setVolume(0.7);
      expect(audio.getVolume()).toBe(0.7);
    });
  });

  describe('preferences', () => {
    it('should return current preferences', () => {
      const prefs = audio.getPreferences();
      expect(prefs).toHaveProperty('enabled');
      expect(prefs).toHaveProperty('volume');
      expect(prefs).toHaveProperty('toneType');
      expect(prefs).toHaveProperty('baseFrequency');
    });

    it('should update preferences partially', () => {
      audio.setPreferences({
        volume: 0.5,
        baseFrequency: 432,
      });

      const prefs = audio.getPreferences();
      expect(prefs.volume).toBe(0.5);
      expect(prefs.baseFrequency).toBe(432);
    });

    it('should disable audio when enabled is set to false', () => {
      audio.init();
      audio.setPreferences({ enabled: false });
      expect(audio.isAvailable()).toBe(false);
    });
  });

  describe('breathing phases', () => {
    beforeEach(() => {
      audio.init();
      vi.clearAllMocks(); // Clear init calls
    });

    it('should play breatheIn with frequency sweep', async () => {
      const promise = audio.breatheIn(1000);

      // Advance timers
      await vi.advanceTimersByTimeAsync(1100);
      await promise;

      expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled();
      expect(mockAudioContextInstance.createGain).toHaveBeenCalled();
    });

    it('should play breatheOut with frequency sweep', async () => {
      const promise = audio.breatheOut(1000);

      await vi.advanceTimersByTimeAsync(1100);
      await promise;

      expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled();
    });

    it('should play holdBreath with steady tone', async () => {
      const promise = audio.holdBreath(1000);

      await vi.advanceTimersByTimeAsync(1100);
      await promise;

      expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled();
    });

    it('should not play when disabled', async () => {
      audio.setEnabled(false);

      const promise = audio.breatheIn(100);
      await vi.advanceTimersByTimeAsync(150);
      await promise;

      expect(mockAudioContextInstance.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('feedback sounds', () => {
    beforeEach(() => {
      audio.init();
      vi.clearAllMocks();
    });

    it('should play session start tone', () => {
      audio.playSessionStart();
      expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled();
      expect(mockAudioContextInstance.createGain).toHaveBeenCalled();
    });

    it('should play completion chime with multiple notes', () => {
      audio.playCompletionChime();
      // Should create 3 oscillators for the chord
      expect(mockAudioContextInstance.createOscillator).toHaveBeenCalledTimes(3);
    });

    it('should not play feedback when unavailable', () => {
      audio.setEnabled(false);
      audio.playSessionStart();
      audio.playCompletionChime();
      expect(mockAudioContextInstance.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('abort functionality', () => {
    beforeEach(() => {
      audio.init();
    });

    it('should stop audio on abort', async () => {
      const promise = audio.breatheIn(5000);

      // Abort after 100ms
      await vi.advanceTimersByTimeAsync(100);
      audio.abort();

      // Should resolve without waiting full duration
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      // Promise resolved, test passes
      expect(true).toBe(true);
    });

    it('should handle stop gracefully', () => {
      // Stop should not throw even if nothing is playing
      expect(() => audio.stop()).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should close AudioContext on destroy', () => {
      audio.init();
      vi.clearAllMocks();
      audio.destroy();
      expect(mockAudioContextInstance.close).toHaveBeenCalled();
    });
  });

  describe('WCAG compliance', () => {
    beforeEach(() => {
      audio.init();
    });

    it('should have volume control for WCAG 1.4.2', () => {
      // User should be able to control volume independently
      audio.setVolume(0);
      expect(audio.getVolume()).toBe(0);

      audio.setVolume(1);
      expect(audio.getVolume()).toBe(1);
    });

    it('should be able to stop audio for WCAG 1.4.2', () => {
      // User should be able to stop audio - should not throw
      expect(() => {
        audio.stop();
        audio.abort();
      }).not.toThrow();
    });

    it('should have enable/disable toggle', () => {
      audio.setEnabled(false);
      expect(audio.isAvailable()).toBe(false);

      audio.setEnabled(true);
      expect(audio.isAvailable()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle init failure gracefully', () => {
      // Temporarily make AudioContext throw
      const originalAC = global.AudioContext;
      vi.stubGlobal('AudioContext', vi.fn(() => {
        throw new Error('Not supported');
      }));

      audio.destroy();
      const result = audio.init();

      expect(result).toBe(false);
      expect(audio.isAvailable()).toBe(false);

      // Restore
      vi.stubGlobal('AudioContext', originalAC);
    });

    it('should handle multiple abort calls', () => {
      audio.init();
      expect(() => {
        audio.abort();
        audio.abort();
        audio.abort();
      }).not.toThrow();
    });

    it('should handle breathing phases when not initialized', async () => {
      // Don't init - should just sleep without error
      const promise = audio.breatheIn(100);
      await vi.advanceTimersByTimeAsync(150);
      await promise;
      // Should complete without error
      expect(true).toBe(true);
    });
  });
});
