/**
 * useHaptics Hook
 * ===============
 * React hook for haptic feedback with settings persistence.
 */

import { useState, useEffect, useCallback } from 'react';
import { haptics } from '@/services/haptics';
import { telegram } from '@/services/telegram';

interface UseHapticsReturn {
  isEnabled: boolean;
  isAvailable: boolean;
  setEnabled: (enabled: boolean) => void;
  impact: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notification: (type: 'success' | 'error' | 'warning') => void;
  selectionChanged: () => void;
}

const HAPTICS_STORAGE_KEY = 'sleepcore_haptics_enabled';

export const useHaptics = (): UseHapticsReturn => {
  const [isEnabled, setIsEnabled] = useState(true);

  // Load saved preference
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await telegram.getStorageItem(HAPTICS_STORAGE_KEY);
        if (saved !== null) {
          const enabled = saved === 'true';
          setIsEnabled(enabled);
          haptics.setEnabled(enabled);
        }
      } catch (error) {
        console.warn('[useHaptics] Failed to load preference:', error);
      }
    };

    loadPreference();
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    setIsEnabled(enabled);
    haptics.setEnabled(enabled);

    // Save preference
    try {
      await telegram.setStorageItem(HAPTICS_STORAGE_KEY, String(enabled));
    } catch (error) {
      console.warn('[useHaptics] Failed to save preference:', error);
    }
  }, []);

  const impact = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    haptics.impact(style);
  }, []);

  const notification = useCallback((type: 'success' | 'error' | 'warning') => {
    haptics.notification(type);
  }, []);

  const selectionChanged = useCallback(() => {
    haptics.selectionChanged();
  }, []);

  return {
    isEnabled,
    isAvailable: haptics.isAvailable(),
    setEnabled,
    impact,
    notification,
    selectionChanged,
  };
};

export default useHaptics;
