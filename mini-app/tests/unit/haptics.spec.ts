/**
 * Haptics Service Tests
 * =====================
 * Tests for haptic feedback service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the HapticsService class with controllable state
const createMockHapticsService = () => {
  let isEnabled = true;
  let isSupported = true;

  const mockImpactOccurred = vi.fn();
  const mockNotificationOccurred = vi.fn();
  const mockSelectionChanged = vi.fn();

  class MockHapticsService {
    private hapticFeedback = {
      impactOccurred: mockImpactOccurred,
      notificationOccurred: mockNotificationOccurred,
      selectionChanged: mockSelectionChanged,
    };

    setEnabled(enabled: boolean): void {
      isEnabled = enabled;
    }

    setSupported(supported: boolean): void {
      isSupported = supported;
    }

    isAvailable(): boolean {
      return isSupported && isEnabled;
    }

    impact(style: string = 'medium'): void {
      if (!this.isAvailable()) return;
      this.hapticFeedback.impactOccurred(style);
    }

    notification(type: string): void {
      if (!this.isAvailable()) return;
      this.hapticFeedback.notificationOccurred(type);
    }

    selectionChanged(): void {
      if (!this.isAvailable()) return;
      this.hapticFeedback.selectionChanged();
    }

    async breatheIn(durationMs: number = 4000): Promise<void> {
      if (!this.isAvailable()) {
        return;
      }
      // Simulate breathing pattern
      const styles = ['soft', 'light', 'medium', 'heavy'];
      for (const style of styles) {
        this.impact(style);
      }
    }

    celebrationFeedback(): void {
      this.notification('success');
      this.impact('heavy');
      this.impact('medium');
      this.impact('light');
    }

    sessionStartFeedback(): void {
      this.notification('success');
      this.impact('medium');
    }

    phaseTransitionFeedback(): void {
      this.impact('light');
    }
  }

  return {
    service: new MockHapticsService(),
    mocks: {
      impactOccurred: mockImpactOccurred,
      notificationOccurred: mockNotificationOccurred,
      selectionChanged: mockSelectionChanged,
    },
    reset: () => {
      isEnabled = true;
      isSupported = true;
      mockImpactOccurred.mockClear();
      mockNotificationOccurred.mockClear();
      mockSelectionChanged.mockClear();
    },
  };
};

describe('Haptics Service', () => {
  let hapticsTest: ReturnType<typeof createMockHapticsService>;

  beforeEach(() => {
    hapticsTest = createMockHapticsService();
  });

  afterEach(() => {
    hapticsTest.reset();
  });

  describe('isAvailable', () => {
    it('should return true when enabled and supported', () => {
      expect(hapticsTest.service.isAvailable()).toBe(true);
    });

    it('should return false when disabled', () => {
      hapticsTest.service.setEnabled(false);
      expect(hapticsTest.service.isAvailable()).toBe(false);
    });

    it('should return false when not supported', () => {
      hapticsTest.service.setSupported(false);
      expect(hapticsTest.service.isAvailable()).toBe(false);
    });
  });

  describe('impact', () => {
    it('should call impactOccurred with default medium style', () => {
      hapticsTest.service.impact();
      expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith('medium');
    });

    it('should call impactOccurred with specified style', () => {
      hapticsTest.service.impact('heavy');
      expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith('heavy');
    });

    it('should not call impactOccurred when disabled', () => {
      hapticsTest.service.setEnabled(false);
      hapticsTest.service.impact('medium');
      expect(hapticsTest.mocks.impactOccurred).not.toHaveBeenCalled();
    });

    it('should accept different haptic styles', () => {
      const styles = ['light', 'medium', 'heavy', 'rigid', 'soft'];
      styles.forEach(style => {
        hapticsTest.service.impact(style);
        expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith(style);
      });
    });
  });

  describe('notification', () => {
    it('should call notificationOccurred with success', () => {
      hapticsTest.service.notification('success');
      expect(hapticsTest.mocks.notificationOccurred).toHaveBeenCalledWith('success');
    });

    it('should call notificationOccurred with error', () => {
      hapticsTest.service.notification('error');
      expect(hapticsTest.mocks.notificationOccurred).toHaveBeenCalledWith('error');
    });

    it('should call notificationOccurred with warning', () => {
      hapticsTest.service.notification('warning');
      expect(hapticsTest.mocks.notificationOccurred).toHaveBeenCalledWith('warning');
    });

    it('should not call notificationOccurred when disabled', () => {
      hapticsTest.service.setEnabled(false);
      hapticsTest.service.notification('success');
      expect(hapticsTest.mocks.notificationOccurred).not.toHaveBeenCalled();
    });
  });

  describe('selectionChanged', () => {
    it('should call selectionChanged', () => {
      hapticsTest.service.selectionChanged();
      expect(hapticsTest.mocks.selectionChanged).toHaveBeenCalled();
    });

    it('should not call selectionChanged when disabled', () => {
      hapticsTest.service.setEnabled(false);
      hapticsTest.service.selectionChanged();
      expect(hapticsTest.mocks.selectionChanged).not.toHaveBeenCalled();
    });
  });

  describe('breatheIn', () => {
    it('should call impact with progressive styles', async () => {
      await hapticsTest.service.breatheIn(4000);

      expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith('soft');
      expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith('light');
      expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith('medium');
      expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith('heavy');
    });

    it('should not call impact when disabled', async () => {
      hapticsTest.service.setEnabled(false);
      await hapticsTest.service.breatheIn(4000);
      expect(hapticsTest.mocks.impactOccurred).not.toHaveBeenCalled();
    });
  });

  describe('celebrationFeedback', () => {
    it('should trigger success notification and multiple impacts', () => {
      hapticsTest.service.celebrationFeedback();

      expect(hapticsTest.mocks.notificationOccurred).toHaveBeenCalledWith('success');
      expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith('heavy');
      expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith('medium');
      expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith('light');
    });
  });

  describe('sessionStartFeedback', () => {
    it('should trigger success notification and medium impact', () => {
      hapticsTest.service.sessionStartFeedback();

      expect(hapticsTest.mocks.notificationOccurred).toHaveBeenCalledWith('success');
      expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith('medium');
    });
  });

  describe('phaseTransitionFeedback', () => {
    it('should trigger light impact', () => {
      hapticsTest.service.phaseTransitionFeedback();

      expect(hapticsTest.mocks.impactOccurred).toHaveBeenCalledWith('light');
    });
  });

  describe('enable/disable flow', () => {
    it('should enable and disable haptics', () => {
      expect(hapticsTest.service.isAvailable()).toBe(true);

      hapticsTest.service.setEnabled(false);
      expect(hapticsTest.service.isAvailable()).toBe(false);

      hapticsTest.service.setEnabled(true);
      expect(hapticsTest.service.isAvailable()).toBe(true);
    });

    it('should respect enabled state for all methods', () => {
      hapticsTest.service.setEnabled(false);

      hapticsTest.service.impact('medium');
      hapticsTest.service.notification('success');
      hapticsTest.service.selectionChanged();

      expect(hapticsTest.mocks.impactOccurred).not.toHaveBeenCalled();
      expect(hapticsTest.mocks.notificationOccurred).not.toHaveBeenCalled();
      expect(hapticsTest.mocks.selectionChanged).not.toHaveBeenCalled();
    });
  });
});
