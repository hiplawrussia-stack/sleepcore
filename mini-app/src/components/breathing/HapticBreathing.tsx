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
  // Screen reader announcement for current breathing phase
  const [srAnnouncement, setSrAnnouncement] = useState('');

  // Refs for cleanup
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  // E2E test speed multiplier (window.__E2E_SPEED_MULTIPLIER__ = 100 means 100x faster)
  // Direct access is more reliable than 'in' operator across bundlers
  const getSpeedMultiplier = useCallback(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const multiplier = (window as any).__E2E_SPEED_MULTIPLIER__;
      if (typeof multiplier === 'number' && multiplier > 1) {
        return multiplier;
      }
    }
    return 1;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      abortRef.current = true;
      haptics.abort(); // Stop any running haptic patterns
    };
  }, []);

  // Get localized phase label for screen reader
  const getPhaseLabel = useCallback((phaseName: BreathingPhase): string => {
    switch (phaseName) {
      case 'inhale': return t('breathing.phases.inhale');
      case 'hold': return t('breathing.phases.hold');
      case 'exhale': return t('breathing.phases.exhale');
      case 'hold2': return t('breathing.phases.pause');
      case 'complete': return t('breathing.phases.done');
      default: return '';
    }
  }, [t]);

  // Run a single phase with timer countdown
  const runPhase = useCallback(async (
    phaseName: BreathingPhase,
    durationMs: number,
    hapticFn: () => Promise<void>
  ): Promise<void> => {
    if (abortRef.current) return;

    const speedMultiplier = getSpeedMultiplier();
    // With 100x speed: 4000ms phase completes in 40ms real time
    // tickInterval: min 10ms for browser stability
    const tickInterval = Math.max(10, Math.round(100 / speedMultiplier));
    // Each tick advances by: tickInterval * speedMultiplier ms of "original time"
    // E.g., 100x speed, 10ms tick = 1000ms original time per tick
    const decrementPerTick = tickInterval * speedMultiplier;

    setPhase(phaseName);
    setTimeRemaining(Math.ceil(durationMs / 1000)); // Display original duration

    // Announce phase change to screen readers (assertive for immediate feedback)
    const durationSec = Math.ceil(durationMs / 1000);
    const phaseLabel = getPhaseLabel(phaseName);
    setSrAnnouncement(`${phaseLabel}, ${durationSec} ${t('breathing.sec', 'сек')}`);

    // Start haptic pattern (runs in parallel) - skip in fast mode
    if (speedMultiplier === 1) {
      hapticFn();
    }

    // Countdown timer - use local interval ID for proper cleanup
    return new Promise((resolve, reject) => {
      let remainingOriginal = durationMs;

      const intervalId = setInterval(() => {
        if (abortRef.current) {
          clearInterval(intervalId);
          reject(new Error('Aborted'));
          return;
        }

        remainingOriginal -= decrementPerTick;
        setTimeRemaining(Math.max(0, Math.ceil(remainingOriginal / 1000)));

        if (remainingOriginal <= 0) {
          clearInterval(intervalId);
          resolve();
        }
      }, tickInterval);

      // Store for unmount cleanup
      timerRef.current = intervalId;
    });
  }, [getSpeedMultiplier, getPhaseLabel, t]);

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

        // Announce completion to screen readers
        setSrAnnouncement(t('breathing.completion.title'));

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

    // Abort any running haptic patterns
    haptics.abort();

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

  // Handle Escape key for completion modal
  useEffect(() => {
    if (!showCompletion) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetExercise();
        telegram.hideMainButton();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCompletion, resetExercise]);

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
      {/* Screen reader live region for breathing phase announcements */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {srAnnouncement}
      </div>

      {/* Pattern Selector - CSS transitions */}
      {showPatternSelector && phase === 'idle' && (
        <div className="w-full max-w-md mb-6 breathing-selector-enter">
          {/* Pattern selector - Native fieldset/legend for WCAG 1.3.1 */}
          <fieldset className="border-0 p-0 m-0">
            <legend className="text-xl font-semibold text-night-100 mb-4 text-center w-full">
              {t('breathing.title')}
            </legend>

            <div className="space-y-2">
              {getFreePatterns().map((pattern) => {
                const patternName = isRu ? pattern.nameRu : pattern.name;
                const isSelected = selectedPattern.id === pattern.id;
                return (
                  <label
                    key={pattern.id}
                    className={`relative w-full p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary-500/20 border-2 border-primary-500'
                        : 'bg-night-800 border-2 border-transparent hover:border-night-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="breathing-pattern"
                      value={pattern.id}
                      checked={isSelected}
                      onChange={() => {
                        setSelectedPattern(pattern);
                        haptics.selectionChanged();
                      }}
                      className="absolute opacity-0 w-full h-full top-0 left-0 cursor-pointer"
                    />
                    <span className="text-2xl" aria-hidden="true">{pattern.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-night-100">
                        {patternName}
                      </div>
                      <div className="text-sm text-night-400">
                        {pattern.inhale}-{pattern.hold}-{pattern.exhale}
                        {pattern.hold2 ? `-${pattern.hold2}` : ''} {t('breathing.sec', 'сек')}
                        <span className="mx-2">•</span>
                        {t(`home.categories.${pattern.category}`)}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center breathing-checkmark" aria-hidden="true">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Cycles selector - Native fieldset/legend for WCAG 1.3.1 */}
          <fieldset className="mt-6 border-0 p-0 m-0">
            <legend className="sr-only">{t('breathing.cycles.title')}</legend>
            <div className="flex items-center justify-between mb-3">
              <span className="text-night-300" aria-hidden="true">{t('breathing.cycles.title')}</span>
              <span className="text-night-400 text-sm">
                ~{formatDuration(estimatedDuration)}
              </span>
            </div>
            <div className="flex gap-2">
              {/* WCAG 2.5.5: Touch target minimum 44x44px */}
              {[3, 5, 7, 10].map((num) => {
                const isSelected = totalCycles === num;
                return (
                  <label
                    key={num}
                    className={`relative flex-1 py-3 min-h-[44px] rounded-xl font-medium text-center cursor-pointer transition-all duration-200 flex items-center justify-center ${
                      isSelected
                        ? 'bg-primary-500 text-white'
                        : 'bg-night-800 text-night-300 hover:bg-night-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="breathing-cycles"
                      value={num}
                      checked={isSelected}
                      onChange={() => {
                        setTotalCycles(num);
                        haptics.selectionChanged();
                      }}
                      className="absolute opacity-0 w-full h-full top-0 left-0 cursor-pointer"
                    />
                    {num}
                  </label>
                );
              })}
            </div>
          </fieldset>

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
        <div className="text-center mb-8 breathing-progress-enter" role="status" aria-live="polite">
          <div className="text-night-400 mb-2">
            {t('breathing.progress', { current: currentCycle, total: totalCycles })}
          </div>
          {/* Progress dots */}
          <div className="flex justify-center gap-2" aria-hidden="true">
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
        <div
          className="absolute inset-0 flex items-center justify-center bg-night-900/90 z-30 breathing-completion-enter"
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-title"
        >
          <div className="text-center px-6">
            <div className="text-6xl mb-4 breathing-celebration-bounce" aria-hidden="true">
              🎉
            </div>
            <h2 id="completion-title" className="text-2xl font-bold text-night-100 mb-2">
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
