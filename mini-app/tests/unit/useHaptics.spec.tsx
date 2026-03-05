/**
 * useHaptics Hook Tests
 * =====================
 * Unit tests for haptic feedback hook with settings persistence.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: CLI-002 (haptic feedback for breathing guidance)
 *
 * Coverage targets:
 * - Settings persistence with Telegram CloudStorage
 * - Enable/disable functionality
 * - Haptic feedback delegation
 * - Error handling for storage failures
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock haptics and telegram services BEFORE importing the hook
vi.mock('../../src/services/haptics', () => ({
  haptics: {
    setEnabled: vi.fn(),
    isAvailable: vi.fn(() => true),
    isSupportedOnPlatform: vi.fn(() => true),
    impact: vi.fn(),
    notification: vi.fn(),
    selectionChanged: vi.fn(),
    getDebugInfo: vi.fn(() => 'platform=test, hasAPI=true'),
  },
}));

vi.mock('../../src/services/telegram', () => ({
  telegram: {
    getStorageItem: vi.fn(() => Promise.resolve(null)),
    setStorageItem: vi.fn(() => Promise.resolve(true)),
  },
}));

// Import after mocks are set up
import { useHaptics } from '../../src/hooks/useHaptics';
import { haptics } from '../../src/services/haptics';
import { telegram } from '../../src/services/telegram';

// References to mocked functions
const mockHaptics = haptics as unknown as {
  setEnabled: ReturnType<typeof vi.fn>;
  isAvailable: ReturnType<typeof vi.fn>;
  impact: ReturnType<typeof vi.fn>;
  notification: ReturnType<typeof vi.fn>;
  selectionChanged: ReturnType<typeof vi.fn>;
};

const mockTelegram = telegram as unknown as {
  getStorageItem: ReturnType<typeof vi.fn>;
  setStorageItem: ReturnType<typeof vi.fn>;
};

describe('useHaptics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTelegram.getStorageItem.mockResolvedValue(null);
    mockTelegram.setStorageItem.mockResolvedValue(true);
    mockHaptics.isAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with haptics enabled by default', async () => {
      const { result } = renderHook(() => useHaptics());

      expect(result.current.isEnabled).toBe(true);
    });

    it('should expose isAvailable from haptics service', async () => {
      mockHaptics.isAvailable.mockReturnValue(true);

      const { result } = renderHook(() => useHaptics());

      expect(result.current.isAvailable).toBe(true);
    });

    it('should return false for isAvailable when haptics not supported', async () => {
      mockHaptics.isAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useHaptics());

      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe('Persistence - Loading', () => {
    it('should load saved preference on mount', async () => {
      mockTelegram.getStorageItem.mockResolvedValue('true');

      const { result } = renderHook(() => useHaptics());

      await waitFor(() => {
        expect(mockTelegram.getStorageItem).toHaveBeenCalledWith('sleepcore_haptics_enabled');
      });

      expect(result.current.isEnabled).toBe(true);
    });

    it('should load saved false preference', async () => {
      mockTelegram.getStorageItem.mockResolvedValue('false');

      const { result } = renderHook(() => useHaptics());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(false);
      });

      expect(mockHaptics.setEnabled).toHaveBeenCalledWith(false);
    });

    it('should sync with haptics service on load', async () => {
      mockTelegram.getStorageItem.mockResolvedValue('false');

      renderHook(() => useHaptics());

      await waitFor(() => {
        expect(mockHaptics.setEnabled).toHaveBeenCalledWith(false);
      });
    });

    it('should handle storage load error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockTelegram.getStorageItem.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useHaptics());

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[useHaptics] Failed to load preference:',
          expect.any(Error)
        );
      });

      // Should keep default value
      expect(result.current.isEnabled).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should not update when no saved preference exists', async () => {
      mockTelegram.getStorageItem.mockResolvedValue(null);

      const { result } = renderHook(() => useHaptics());

      await waitFor(() => {
        expect(mockTelegram.getStorageItem).toHaveBeenCalled();
      });

      // Should keep default
      expect(result.current.isEnabled).toBe(true);
      expect(mockHaptics.setEnabled).not.toHaveBeenCalled();
    });
  });

  describe('Persistence - Saving', () => {
    it('should save preference when setEnabled called', async () => {
      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        result.current.setEnabled(false);
      });

      expect(mockTelegram.setStorageItem).toHaveBeenCalledWith(
        'sleepcore_haptics_enabled',
        'false'
      );
    });

    it('should save true preference correctly', async () => {
      mockTelegram.getStorageItem.mockResolvedValue('false');

      const { result } = renderHook(() => useHaptics());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(false);
      });

      await act(async () => {
        result.current.setEnabled(true);
      });

      expect(mockTelegram.setStorageItem).toHaveBeenCalledWith(
        'sleepcore_haptics_enabled',
        'true'
      );
    });

    it('should handle storage save error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockTelegram.setStorageItem.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        result.current.setEnabled(false);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[useHaptics] Failed to save preference:',
          expect.any(Error)
        );
      });

      // State should still be updated locally
      expect(result.current.isEnabled).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('setEnabled', () => {
    it('should update isEnabled state', async () => {
      const { result } = renderHook(() => useHaptics());

      expect(result.current.isEnabled).toBe(true);

      await act(async () => {
        result.current.setEnabled(false);
      });

      expect(result.current.isEnabled).toBe(false);
    });

    it('should sync with haptics service', async () => {
      const { result } = renderHook(() => useHaptics());

      await act(async () => {
        result.current.setEnabled(false);
      });

      expect(mockHaptics.setEnabled).toHaveBeenCalledWith(false);
    });

    it('should toggle correctly', async () => {
      const { result } = renderHook(() => useHaptics());

      expect(result.current.isEnabled).toBe(true);

      await act(async () => {
        result.current.setEnabled(false);
      });
      expect(result.current.isEnabled).toBe(false);

      await act(async () => {
        result.current.setEnabled(true);
      });
      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('Haptic Feedback Methods', () => {
    describe('impact', () => {
      it('should call haptics.impact with default style', async () => {
        const { result } = renderHook(() => useHaptics());

        act(() => {
          result.current.impact();
        });

        expect(mockHaptics.impact).toHaveBeenCalledWith('medium');
      });

      it('should call haptics.impact with specified style', async () => {
        const { result } = renderHook(() => useHaptics());

        act(() => {
          result.current.impact('heavy');
        });

        expect(mockHaptics.impact).toHaveBeenCalledWith('heavy');
      });

      it('should support all haptic styles', async () => {
        const { result } = renderHook(() => useHaptics());

        const styles: Array<'light' | 'medium' | 'heavy' | 'rigid' | 'soft'> = [
          'light', 'medium', 'heavy', 'rigid', 'soft'
        ];

        for (const style of styles) {
          act(() => {
            result.current.impact(style);
          });

          expect(mockHaptics.impact).toHaveBeenCalledWith(style);
        }
      });
    });

    describe('notification', () => {
      it('should call haptics.notification with success', async () => {
        const { result } = renderHook(() => useHaptics());

        act(() => {
          result.current.notification('success');
        });

        expect(mockHaptics.notification).toHaveBeenCalledWith('success');
      });

      it('should call haptics.notification with error', async () => {
        const { result } = renderHook(() => useHaptics());

        act(() => {
          result.current.notification('error');
        });

        expect(mockHaptics.notification).toHaveBeenCalledWith('error');
      });

      it('should call haptics.notification with warning', async () => {
        const { result } = renderHook(() => useHaptics());

        act(() => {
          result.current.notification('warning');
        });

        expect(mockHaptics.notification).toHaveBeenCalledWith('warning');
      });
    });

    describe('selectionChanged', () => {
      it('should call haptics.selectionChanged', async () => {
        const { result } = renderHook(() => useHaptics());

        act(() => {
          result.current.selectionChanged();
        });

        expect(mockHaptics.selectionChanged).toHaveBeenCalled();
      });
    });
  });

  describe('Callback Stability', () => {
    it('should return stable impact callback', async () => {
      const { result, rerender } = renderHook(() => useHaptics());

      const firstImpact = result.current.impact;
      rerender();
      const secondImpact = result.current.impact;

      expect(firstImpact).toBe(secondImpact);
    });

    it('should return stable notification callback', async () => {
      const { result, rerender } = renderHook(() => useHaptics());

      const firstNotification = result.current.notification;
      rerender();
      const secondNotification = result.current.notification;

      expect(firstNotification).toBe(secondNotification);
    });

    it('should return stable selectionChanged callback', async () => {
      const { result, rerender } = renderHook(() => useHaptics());

      const firstSelection = result.current.selectionChanged;
      rerender();
      const secondSelection = result.current.selectionChanged;

      expect(firstSelection).toBe(secondSelection);
    });

    it('should return stable setEnabled callback', async () => {
      const { result, rerender } = renderHook(() => useHaptics());

      const firstSetEnabled = result.current.setEnabled;
      rerender();
      const secondSetEnabled = result.current.setEnabled;

      expect(firstSetEnabled).toBe(secondSetEnabled);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work in typical usage flow: load → toggle → use', async () => {
      // Simulate stored preference
      mockTelegram.getStorageItem.mockResolvedValue('true');

      const { result } = renderHook(() => useHaptics());

      // Wait for preference to load
      await waitFor(() => {
        expect(mockTelegram.getStorageItem).toHaveBeenCalled();
      });

      // Use haptic feedback
      act(() => {
        result.current.impact('medium');
      });
      expect(mockHaptics.impact).toHaveBeenCalledWith('medium');

      // Disable haptics
      await act(async () => {
        result.current.setEnabled(false);
      });

      expect(result.current.isEnabled).toBe(false);
      expect(mockTelegram.setStorageItem).toHaveBeenCalledWith(
        'sleepcore_haptics_enabled',
        'false'
      );
    });

    it('should work when app starts with haptics disabled', async () => {
      mockTelegram.getStorageItem.mockResolvedValue('false');
      mockHaptics.isAvailable.mockReturnValue(true);

      const { result } = renderHook(() => useHaptics());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(false);
      });

      // Can still call haptic methods (service handles enabled state)
      act(() => {
        result.current.impact('light');
      });
      expect(mockHaptics.impact).toHaveBeenCalled();
    });
  });
});
