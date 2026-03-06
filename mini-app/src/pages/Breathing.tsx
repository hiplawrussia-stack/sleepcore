/**
 * Breathing Page
 * ==============
 * Full breathing exercise experience with haptic feedback.
 *
 * @see CLAUDE.md §6 - Mini-App Architecture
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HapticBreathing } from '@/components/breathing';
import { getPatternById } from '@/components/breathing/patterns';
import { EvolutionCelebrationModal } from '@/components/common';
import { useTelegram, useLogSession, useEvolution } from '@/hooks';
import { telegram } from '@/services/telegram';

/** Default pattern ID for fallback */
const DEFAULT_PATTERN_ID = '478';

/** Retry configuration for evolution check */
const EVOLUTION_CHECK_RETRIES = 2;
const EVOLUTION_RETRY_DELAY_MS = 1000;

interface EvolutionData {
  previousStage: string;
  newStage: string;
}

export const Breathing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showBackButton, hideBackButton } = useTelegram();
  const { logSession } = useLogSession();
  const { evolution, refetch: refetchEvolution } = useEvolution();

  const [evolutionData, setEvolutionData] = useState<EvolutionData | null>(null);

  // Track previous stage for evolution detection
  const previousStageRef = useRef<string | null>(null);
  useEffect(() => {
    if (evolution?.currentStage && !previousStageRef.current) {
      previousStageRef.current = evolution.currentStage;
    }
  }, [evolution?.currentStage]);

  // Validate pattern parameter against known patterns (security: input validation)
  const initialPattern = useMemo(() => {
    const patternParam = searchParams.get('pattern');
    if (patternParam && getPatternById(patternParam)) {
      return patternParam;
    }
    return DEFAULT_PATTERN_ID;
  }, [searchParams]);

  // Setup back button
  useEffect(() => {
    showBackButton(() => {
      navigate('/');
    });

    return () => {
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate]);

  // Handle session completion
  const handleComplete = useCallback(async (
    patternId: string,
    cycles: number,
    durationSeconds: number
  ) => {
    console.log('[Breathing] Session completed:', { patternId, cycles, durationSeconds });

    // Store current stage before logging session
    const previousStage = previousStageRef.current || evolution?.currentStage || 'owlet';

    // Get pattern name for API (required field)
    const pattern = getPatternById(patternId);
    const patternName = pattern?.name || patternId;

    // Log to backend with error feedback
    try {
      await logSession({
        patternId,
        patternName,
        cycles,
        duration: durationSeconds,
      });
    } catch (error) {
      console.error('[Breathing] Failed to save session:', error);
      // Show user-friendly error message via Telegram alert
      telegram.showAlert(t('errors.sessionSaveFailed', 'Failed to save session. Please try again.'));
      return; // Don't check evolution if session save failed
    }

    // Check for evolution with retry using the hook's refetch
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= EVOLUTION_CHECK_RETRIES; attempt++) {
      try {
        const result = await refetchEvolution();
        const newEvolution = result.data;

        // Check if stage changed (indicates evolution)
        if (newEvolution && previousStage && newEvolution.currentStage !== previousStage) {
          console.log('[Breathing] Evolution!', newEvolution);
          setEvolutionData({
            previousStage,
            newStage: newEvolution.currentStage,
          });
          // Update the ref for future comparisons
          previousStageRef.current = newEvolution.currentStage;
        }
        // Success - break out of retry loop
        return;
      } catch (error) {
        lastError = error;
        if (attempt < EVOLUTION_CHECK_RETRIES) {
          console.warn(`[Breathing] Evolution check attempt ${attempt + 1}/${EVOLUTION_CHECK_RETRIES + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, EVOLUTION_RETRY_DELAY_MS));
        }
      }
    }
    // All retries failed - log but don't show error (session was saved successfully)
    console.error('[Breathing] Failed to check evolution after retries:', lastError);
  }, [evolution?.currentStage, logSession, refetchEvolution, t]);

  // Handle evolution modal close
  const handleEvolutionClose = () => {
    setEvolutionData(null);
  };

  // Handle cancellation
  const handleCancel = useCallback(() => {
    console.log('[Breathing] Session cancelled');
  }, []);

  return (
    <>
      <HapticBreathing
        initialPatternId={initialPattern}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />

      {/* Evolution Celebration Modal */}
      <EvolutionCelebrationModal
        isVisible={evolutionData !== null}
        previousStage={evolutionData?.previousStage || 'owlet'}
        newStage={evolutionData?.newStage || 'young_owl'}
        onClose={handleEvolutionClose}
      />
    </>
  );
};

export default Breathing;
