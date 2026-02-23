/**
 * HapticBreathing Component
 * =========================
 * Main breathing exercise component with haptic feedback integration.
 * Combines visual animation with tactile guidance.
 *
 * PERFORMANCE: CSS-only animations for optimal mobile performance.
 * - No motion/framer-motion dependency
 * - GPU-accelerated CSS transforms
 * - ~30KB bundle savings
 *
 * Research backing:
 * - +40% improvement in breathing therapy with haptics
 * - MIT aSpire Project findings
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BreathingCircle, type BreathingPhase } from './BreathingCircle';
import {
  type BreathingPattern,
  BREATHING_PATTERNS,
  getFreePatterns,
  getTotalDuration,
  formatDuration,
} from './patterns';
import { haptics } from '@/services/haptics';
import { telegram } from '@/services/telegram';

interface HapticBreathingProps {
  onComplete?: (patternId: string, cycles: number, durationSeconds: number) => void;
  onCancel?: () => void;
  initialPatternId?: string;
}

export const HapticBreathing: React.FC<HapticBreathingProps> = ({
  onComplete,
  onCancel,
  initialPatternId = '478',
}) => {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === 'ru';

  // State
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern>(
    BREATHING_PATTERNS.find(p => p.id === initialPatternId) || BREATHING_PATTERNS[0]
  );
  const [phase, setPhase] = useState<BreathingPhase>('idle');
  const [currentCycle, setCurrentCycle] = useState(0);
  const [totalCycles, setTotalCycles] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showPatternSelector, setShowPatternSelector] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);

  // Refs for cleanup
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      abortRef.current = true;
    };
  }, []);

  // Run a single phase with timer countdown
  const runPhase = useCallback(async (
    phaseName: BreathingPhase,
    durationMs: number,
    hapticFn: () => Promise<void>
  ): Promise<void> => {
    if (abortRef.current) return;

    setPhase(phaseName);
    setTimeRemaining(Math.ceil(durationMs / 1000));

    // Start haptic pattern (runs in parallel)
    hapticFn();

    // Countdown timer
    return new Promise((resolve, reject) => {
      let remaining = durationMs;

      timerRef.current = setInterval(() => {
        if (abortRef.current) {
          if (timerRef.current) clearInterval(timerRef.current);
          reject(new Error('Aborted'));
          return;
        }

        remaining -= 100;
        setTimeRemaining(Math.max(0, Math.ceil(remaining / 1000)));

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          resolve();
        }
      }, 100);
    });
  }, []);

  // Run a complete breathing cycle
  const runCycle = useCallback(async (): Promise<void> => {
    const pattern = selectedPattern;

    // Inhale
    await runPhase(
      'inhale',
      pattern.inhale * 1000,
      () => haptics.breatheIn(pattern.inhale * 1000)
    );

    // Hold (if pattern has it)
    if (pattern.hold > 0) {
      await runPhase(
        'hold',
        pattern.hold * 1000,
        () => haptics.holdBreath(pattern.hold * 1000)
      );
    }

    // Exhale
    await runPhase(
      'exhale',
      pattern.exhale * 1000,
      () => haptics.breatheOut(pattern.exhale * 1000)
    );

    // Hold2 (for box breathing)
    const hold2Duration = pattern.hold2;
    if (hold2Duration && hold2Duration > 0) {
      await runPhase(
        'hold2',
        hold2Duration * 1000,
        () => haptics.holdBreath(hold2Duration * 1000)
      );
    }
  }, [selectedPattern, runPhase]);

  // Start the breathing exercise
  const startExercise = useCallback(async () => {
    abortRef.current = false;
    setIsRunning(true);
    setShowPatternSelector(false);
    setShowCompletion(false);
    setCurrentCycle(0);

    haptics.sessionStartFeedback();

    const startTime = Date.now();

    try {
      for (let i = 0; i < totalCycles; i++) {
        if (abortRef.current) break;
        setCurrentCycle(i + 1);
        await runCycle();
      }

      if (!abortRef.current) {
        // Completion
        setPhase('complete');
        setShowCompletion(true);
        haptics.celebrationFeedback();

        const durationSeconds = Math.round((Date.now() - startTime) / 1000);

        if (onComplete) {
          onComplete(selectedPattern.id, totalCycles, durationSeconds);
        }
      }
    } catch (_error) {
      // Exercise was cancelled - silently ignore
    } finally {
      setIsRunning(false);
    }
  }, [totalCycles, runCycle, selectedPattern, onComplete]);

  // Stop the exercise
  const stopExercise = useCallback(() => {
    abortRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    setIsRunning(false);
    setPhase('idle');
    setCurrentCycle(0);
    setShowPatternSelector(true);
    setShowCompletion(false);

    haptics.notification('warning');

    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Reset to selection state
  const resetExercise = useCallback(() => {
    setPhase('idle');
    setCurrentCycle(0);
    setShowPatternSelector(true);
    setShowCompletion(false);
  }, []);

  // Setup Telegram MainButton
  useEffect(() => {
    if (isRunning) {
      telegram.showMainButton(t('breathing.buttons.stop'), stopExercise);
    } else if (phase === 'complete') {
      telegram.showMainButton(t('breathing.buttons.done'), () => {
        resetExercise();
        telegram.hideMainButton();
      });
    } else {
      telegram.showMainButton(t('breathing.buttons.start'), startExercise);
    }

    return () => {
      telegram.hideMainButton();
    };
  }, [isRunning, phase, startExercise, stopExercise, resetExercise, t]);

  // Calculate estimated duration
  const estimatedDuration = getTotalDuration(selectedPattern, totalCycles);

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-6 bg-night-900">
      {/* Pattern Selector - CSS transitions */}
      {showPatternSelector && phase === 'idle' && (
        <div className="w-full max-w-md mb-6 breathing-selector-enter">
          {/* Header */}
          <h2 className="text-xl font-semibold text-night-100 mb-4 text-center">
            {t('breathing.title')}
          </h2>

          {/* Pattern buttons */}
          <div className="space-y-2">
            {getFreePatterns().map((pattern) => (
              <button
                key={pattern.id}
                onClick={() => {
                  setSelectedPattern(pattern);
                  haptics.selectionChanged();
                }}
                className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all duration-200 ${
                  selectedPattern.id === pattern.id
                    ? 'bg-primary-500/20 border-2 border-primary-500'
                    : 'bg-night-800 border-2 border-transparent hover:border-night-600'
                }`}
              >
                <span className="text-2xl">{pattern.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium text-night-100">
                    {isRu ? pattern.nameRu : pattern.name}
                  </div>
                  <div className="text-sm text-night-400">
                    {pattern.inhale}-{pattern.hold}-{pattern.exhale}
                    {pattern.hold2 ? `-${pattern.hold2}` : ''} {t('breathing.sec', 'сек')}
                    <span className="mx-2">•</span>
                    {t(`home.categories.${pattern.category}`)}
                  </div>
                </div>
                {selectedPattern.id === pattern.id && (
                  <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center breathing-checkmark">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Cycles selector */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-night-300">{t('breathing.cycles.title')}</span>
              <span className="text-night-400 text-sm">
                ~{formatDuration(estimatedDuration)}
              </span>
            </div>
            <div className="flex gap-2">
              {[3, 5, 7, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setTotalCycles(num);
                    haptics.selectionChanged();
                  }}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all duration-200 ${
                    totalCycles === num
                      ? 'bg-primary-500 text-white'
                      : 'bg-night-800 text-night-300 hover:bg-night-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Pattern description */}
          <div
            key={selectedPattern.id}
            className="mt-6 p-4 bg-night-800/50 rounded-xl breathing-description-fade"
          >
            <p className="text-night-300 text-sm">
              {isRu ? selectedPattern.benefitRu : selectedPattern.benefit}
            </p>
          </div>
        </div>
      )}

      {/* Breathing Circle */}
      <div className="flex-1 flex items-center justify-center">
        <BreathingCircle
          phase={phase}
          timeRemaining={timeRemaining}
          pattern={selectedPattern}
          size={280}
        />
      </div>

      {/* Progress indicator */}
      {isRunning && (
        <div className="text-center mb-8 breathing-progress-enter">
          <div className="text-night-400 mb-2">
            {t('breathing.progress', { current: currentCycle, total: totalCycles })}
          </div>
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalCycles }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  i < currentCycle
                    ? 'bg-primary-500'
                    : i === currentCycle - 1
                    ? 'bg-primary-400'
                    : 'bg-night-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completion message - CSS animation */}
      {showCompletion && (
        <div className="absolute inset-0 flex items-center justify-center bg-night-900/90 z-30 breathing-completion-enter">
          <div className="text-center px-6">
            <div className="text-6xl mb-4 breathing-celebration-bounce">
              🎉
            </div>
            <h2 className="text-2xl font-bold text-night-100 mb-2">
              {t('breathing.completion.title')}
            </h2>
            <p className="text-night-300 mb-2">
              {t('breathing.completion.message', { cycles: totalCycles })}
            </p>
            <p className="text-primary-400">
              {isRu ? selectedPattern.benefitRu : selectedPattern.benefit}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HapticBreathing;
