/**
 * HapticBreathing Component
 * =========================
 * Main breathing exercise component with haptic feedback integration.
 * Combines visual animation with tactile guidance.
 *
 * Research backing:
 * - +40% improvement in breathing therapy with haptics
 * - MIT aSpire Project findings
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BreathingCircle, type BreathingPhase } from './BreathingCircle';
import {
  type BreathingPattern,
  BREATHING_PATTERNS,
  getFreePatterns,
  getTotalDuration,
  formatDuration,
  CATEGORY_LABELS,
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
        haptics.celebrationFeedback();

        const durationSeconds = Math.round((Date.now() - startTime) / 1000);

        if (onComplete) {
          onComplete(selectedPattern.id, totalCycles, durationSeconds);
        }
      }
    } catch (error) {
      // Exercise was cancelled
      console.log('[HapticBreathing] Exercise cancelled');
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
  }, []);

  // Setup Telegram MainButton
  useEffect(() => {
    if (isRunning) {
      telegram.showMainButton('Остановить', stopExercise);
    } else if (phase === 'complete') {
      telegram.showMainButton('Готово', () => {
        resetExercise();
        telegram.hideMainButton();
      });
    } else {
      telegram.showMainButton('Начать', startExercise);
    }

    return () => {
      telegram.hideMainButton();
    };
  }, [isRunning, phase, startExercise, stopExercise, resetExercise]);

  // Calculate estimated duration
  const estimatedDuration = getTotalDuration(selectedPattern, totalCycles);

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-6 bg-night-900">
      {/* Pattern Selector */}
      <AnimatePresence>
        {showPatternSelector && phase === 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-md mb-6"
          >
            {/* Header */}
            <h2 className="text-xl font-semibold text-night-100 mb-4 text-center">
              Выбери технику дыхания
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
                  className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${
                    selectedPattern.id === pattern.id
                      ? 'bg-primary-500/20 border-2 border-primary-500'
                      : 'bg-night-800 border-2 border-transparent hover:border-night-600'
                  }`}
                >
                  <span className="text-2xl">{pattern.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-night-100">
                      {pattern.nameRu}
                    </div>
                    <div className="text-sm text-night-400">
                      {pattern.inhale}-{pattern.hold}-{pattern.exhale}
                      {pattern.hold2 ? `-${pattern.hold2}` : ''} сек
                      <span className="mx-2">•</span>
                      {CATEGORY_LABELS[pattern.category]}
                    </div>
                  </div>
                  {selectedPattern.id === pattern.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </button>
              ))}
            </div>

            {/* Cycles selector */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-night-300">Количество циклов</span>
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
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
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
            <motion.div
              key={selectedPattern.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 bg-night-800/50 rounded-xl"
            >
              <p className="text-night-300 text-sm">
                {selectedPattern.benefitRu}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-night-400 mb-2">
            Цикл {currentCycle} из {totalCycles}
          </div>
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalCycles }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < currentCycle
                    ? 'bg-primary-500'
                    : i === currentCycle - 1
                    ? 'bg-primary-400'
                    : 'bg-night-700'
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Completion message */}
      <AnimatePresence>
        {phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center bg-night-900/90 z-30"
          >
            <div className="text-center px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold text-night-100 mb-2">
                Отлично!
              </h2>
              <p className="text-night-300 mb-2">
                Ты выполнил {totalCycles} циклов дыхания
              </p>
              <p className="text-primary-400">
                {selectedPattern.benefitRu}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HapticBreathing;
