/**
 * Haptics Service Tests
 * =====================
 * Unit tests for haptic feedback service with breathing patterns.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: CLI-002 (haptic feedback for breathing guidance)
 *
 * Coverage targets:
 * - Platform detection and support checking
 * - Basic haptic feedback (impact, notification, selection)
 * - Breathing patterns (inhale, hold, exhale)
 * - Complete breathing cycles (4-7-8, box, relaxing, coherent, energizing)
 * - Celebration and session feedback
 * - Error handling for unsupported platforms
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WebApp before importing the service - define mocks inline to avoid hoisting issues
vi.mock('@twa-dev/sdk', () => ({
  default: {
    platform: 'ios',
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
  },
}));

// Import after mock setup
import { haptics } from '../../src/services/haptics';
import WebApp from '@twa-dev/sdk';

// Get references to mocked functions after import
const mockHapticFeedback = WebApp.HapticFeedback as {
  impactOccurred: ReturnType<typeof vi.fn>;
  notificationOccurred: ReturnType<typeof vi.fn>;
  selectionChanged: ReturnType<typeof vi.fn>;
};

describe('HapticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset haptics to enabled state
    haptics.setEnabled(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('Platform Support', () => {
    it('should return true for isAvailable when enabled and supported', () => {
      expect(haptics.isAvailable()).toBe(true);
    });

    it('should return false for isAvailable when disabled', () => {
      haptics.setEnabled(false);
      expect(haptics.isAvailable()).toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('should enable haptics', () => {
      haptics.setEnabled(false);
      expect(haptics.isAvailable()).toBe(false);

      haptics.setEnabled(true);
      expect(haptics.isAvailable()).toBe(true);
    });

    it('should disable haptics', () => {
      haptics.setEnabled(true);
      expect(haptics.isAvailable()).toBe(true);

      haptics.setEnabled(false);
      expect(haptics.isAvailable()).toBe(false);
    });
  });

  describe('Basic Haptic Feedback', () => {
    describe('impact', () => {
      it('should call impactOccurred with default medium style', () => {
        haptics.impact();

        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('medium');
      });

      it('should call impactOccurred with specified style', () => {
        haptics.impact('heavy');

        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('heavy');
      });

      it('should support all haptic styles', () => {
        const styles = ['light', 'medium', 'heavy', 'rigid', 'soft'] as const;

        for (const style of styles) {
          haptics.impact(style);
          expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith(style);
        }
      });

      it('should not call impactOccurred when disabled', () => {
        haptics.setEnabled(false);
        haptics.impact();

        expect(mockHapticFeedback.impactOccurred).not.toHaveBeenCalled();
      });

      it('should handle error gracefully', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockHapticFeedback.impactOccurred.mockImplementationOnce(() => {
          throw new Error('Haptic error');
        });

        // Should not throw
        expect(() => haptics.impact()).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith(
          '[HapticsService] Impact failed:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });

    describe('notification', () => {
      it('should call notificationOccurred with success', () => {
        haptics.notification('success');

        expect(mockHapticFeedback.notificationOccurred).toHaveBeenCalledWith('success');
      });

      it('should call notificationOccurred with error', () => {
        haptics.notification('error');

        expect(mockHapticFeedback.notificationOccurred).toHaveBeenCalledWith('error');
      });

      it('should call notificationOccurred with warning', () => {
        haptics.notification('warning');

        expect(mockHapticFeedback.notificationOccurred).toHaveBeenCalledWith('warning');
      });

      it('should not call notificationOccurred when disabled', () => {
        haptics.setEnabled(false);
        haptics.notification('success');

        expect(mockHapticFeedback.notificationOccurred).not.toHaveBeenCalled();
      });

      it('should handle error gracefully', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockHapticFeedback.notificationOccurred.mockImplementationOnce(() => {
          throw new Error('Notification error');
        });

        expect(() => haptics.notification('success')).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith(
          '[HapticsService] Notification failed:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });

    describe('selectionChanged', () => {
      it('should call selectionChanged', () => {
        haptics.selectionChanged();

        expect(mockHapticFeedback.selectionChanged).toHaveBeenCalled();
      });

      it('should not call selectionChanged when disabled', () => {
        haptics.setEnabled(false);
        haptics.selectionChanged();

        expect(mockHapticFeedback.selectionChanged).not.toHaveBeenCalled();
      });

      it('should handle error gracefully', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockHapticFeedback.selectionChanged.mockImplementationOnce(() => {
          throw new Error('Selection error');
        });

        expect(() => haptics.selectionChanged()).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith(
          '[HapticsService] Selection failed:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Breathing Patterns', () => {
    describe('breatheIn', () => {
      it('should produce intensifying haptic pattern', async () => {
        const promise = haptics.breatheIn(4000);

        // Fast-forward through the breathing pattern
        await vi.advanceTimersByTimeAsync(4000);
        await promise;

        // Should call with styles: soft, light, medium, heavy
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('soft');
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('light');
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('medium');
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('heavy');
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledTimes(4);
      });

      it('should complete in specified duration', async () => {
        const startTime = Date.now();
        const promise = haptics.breatheIn(2000);

        await vi.advanceTimersByTimeAsync(2000);
        await promise;

        const elapsed = Date.now() - startTime;
        expect(elapsed).toBe(2000);
      });

      it('should just sleep when disabled', async () => {
        haptics.setEnabled(false);
        const promise = haptics.breatheIn(4000);

        await vi.advanceTimersByTimeAsync(4000);
        await promise;

        expect(mockHapticFeedback.impactOccurred).not.toHaveBeenCalled();
      });
    });

    describe('holdBreath', () => {
      it('should produce rhythmic soft pulses', async () => {
        const promise = haptics.holdBreath(7000);

        // 7000ms / 1500ms interval = 4 pulses
        await vi.advanceTimersByTimeAsync(7000);
        await promise;

        // Should call with soft style for each pulse
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('soft');
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledTimes(4);
      });

      it('should handle remaining time after pulses', async () => {
        // 5000ms / 1500ms = 3 pulses + 500ms remaining
        const promise = haptics.holdBreath(5000);

        await vi.advanceTimersByTimeAsync(5000);
        await promise;

        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledTimes(3);
      });

      it('should just sleep when disabled', async () => {
        haptics.setEnabled(false);
        const promise = haptics.holdBreath(7000);

        await vi.advanceTimersByTimeAsync(7000);
        await promise;

        expect(mockHapticFeedback.impactOccurred).not.toHaveBeenCalled();
      });
    });

    describe('breatheOut', () => {
      it('should produce softening haptic pattern', async () => {
        const promise = haptics.breatheOut(8000);

        await vi.advanceTimersByTimeAsync(8000);
        await promise;

        // Should call with styles: heavy, medium, light, soft
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('heavy');
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('medium');
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('light');
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('soft');
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledTimes(4);
      });

      it('should just sleep when disabled', async () => {
        haptics.setEnabled(false);
        const promise = haptics.breatheOut(8000);

        await vi.advanceTimersByTimeAsync(8000);
        await promise;

        expect(mockHapticFeedback.impactOccurred).not.toHaveBeenCalled();
      });
    });
  });

  describe('Complete Breathing Cycles', () => {
    describe('breathing478Cycle', () => {
      it('should complete 4-7-8 cycle in 19 seconds', async () => {
        const promise = haptics.breathing478Cycle();

        // 4s inhale + 7s hold + 8s exhale = 19s
        await vi.advanceTimersByTimeAsync(19000);
        await promise;

        // 4 inhale + 4 hold (7000/1500≈4) + 4 exhale = ~12 impacts
        expect(mockHapticFeedback.impactOccurred.mock.calls.length).toBeGreaterThanOrEqual(10);
      });
    });

    describe('boxBreathingCycle', () => {
      it('should complete box breathing cycle in 16 seconds', async () => {
        const promise = haptics.boxBreathingCycle();

        // 4s inhale + 4s hold + 4s exhale + 4s hold = 16s
        await vi.advanceTimersByTimeAsync(16000);
        await promise;

        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalled();
      });
    });

    describe('relaxingBreathCycle', () => {
      it('should complete relaxing breath cycle in 16 seconds', async () => {
        const promise = haptics.relaxingBreathCycle();

        // 6s inhale + 2s hold + 8s exhale = 16s
        await vi.advanceTimersByTimeAsync(16000);
        await promise;

        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalled();
      });
    });

    describe('coherentBreathCycle', () => {
      it('should complete coherent breathing cycle in 10 seconds', async () => {
        const promise = haptics.coherentBreathCycle();

        // 5s inhale + 5s exhale = 10s
        await vi.advanceTimersByTimeAsync(10000);
        await promise;

        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalled();
      });
    });

    describe('energizingBreathCycle', () => {
      it('should complete energizing breath cycle in 8 seconds', async () => {
        const promise = haptics.energizingBreathCycle();

        // 4s inhale + 4s exhale = 8s
        await vi.advanceTimersByTimeAsync(8000);
        await promise;

        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalled();
      });
    });
  });

  describe('Celebration & Feedback', () => {
    describe('celebrationFeedback', () => {
      it('should produce notification and descending impacts', () => {
        haptics.celebrationFeedback();

        expect(mockHapticFeedback.notificationOccurred).toHaveBeenCalledWith('success');

        // Advance timers to trigger delayed impacts
        vi.advanceTimersByTime(200);
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('heavy');

        vi.advanceTimersByTime(200);
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('medium');

        vi.advanceTimersByTime(200);
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('light');
      });
    });

    describe('sessionStartFeedback', () => {
      it('should produce notification and medium impact', () => {
        haptics.sessionStartFeedback();

        expect(mockHapticFeedback.notificationOccurred).toHaveBeenCalledWith('success');
        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('medium');
      });
    });

    describe('phaseTransitionFeedback', () => {
      it('should produce light impact', () => {
        haptics.phaseTransitionFeedback();

        expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledWith('light');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive calls', () => {
      for (let i = 0; i < 10; i++) {
        haptics.impact('light');
      }

      expect(mockHapticFeedback.impactOccurred).toHaveBeenCalledTimes(10);
    });

    it('should handle toggle during breathing cycle', async () => {
      const promise = haptics.breatheIn(4000);

      // Disable after first interval
      await vi.advanceTimersByTimeAsync(1000);
      haptics.setEnabled(false);

      await vi.advanceTimersByTimeAsync(3000);
      await promise;

      // Should have been called only during enabled period
      expect(mockHapticFeedback.impactOccurred.mock.calls.length).toBeLessThan(4);
    });
  });
});

describe('HapticsService - Unsupported Platform', () => {
  // This test creates a fresh instance to test unsupported platform behavior
  it('should not call haptic functions when platform is unsupported', async () => {
    // Import a fresh module with mocked unsupported platform
    vi.resetModules();

    // Mock WebApp with unsupported platform and no HapticFeedback API
    vi.doMock('@twa-dev/sdk', () => ({
      default: {
        platform: 'web', // Not iOS or Android
        HapticFeedback: null, // No haptic support
      },
    }));

    // Import fresh instance
    const { haptics: unsupportedHaptics } = await import('../../src/services/haptics');

    expect(unsupportedHaptics.isSupportedOnPlatform()).toBe(false);
    expect(unsupportedHaptics.isAvailable()).toBe(false);
  });
});
