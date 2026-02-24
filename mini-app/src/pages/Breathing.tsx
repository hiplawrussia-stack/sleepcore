/**
 * Breathing Page
 * ==============
 * Full breathing exercise experience with haptic feedback.
 *
 * @see CLAUDE.md §6 - Mini-App Architecture
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { HapticBreathing } from '@/components/breathing';
import { getPatternById } from '@/components/breathing/patterns';
import { EvolutionCelebrationModal } from '@/components/common';
import { useTelegram } from '@/hooks';
import { useUserStore } from '@/store';
import { apiClient } from '@/api';
import type { EvolutionStatus } from '@/api';

/** Default pattern ID for fallback */
const DEFAULT_PATTERN_ID = '478';

interface EvolutionData {
  previousStage: string;
  newStage: string;
}

export const Breathing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showBackButton, hideBackButton } = useTelegram();
  const { logSession, profile } = useUserStore();

  const [evolutionData, setEvolutionData] = useState<EvolutionData | null>(null);

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
  const handleComplete = async (
    patternId: string,
    cycles: number,
    durationSeconds: number
  ) => {
    console.log('[Breathing] Session completed:', { patternId, cycles, durationSeconds });

    // Store current stage before logging session
    const previousStage = profile?.evolutionStage || 'owlet';

    // Log to backend
    await logSession(patternId, cycles, durationSeconds);

    // Check for evolution
    try {
      const evolutionStatus = await apiClient.request<EvolutionStatus & { evolved?: boolean }>(
        '/user/evolution'
      );
      if (evolutionStatus.evolved) {
        console.log('[Breathing] Evolution!', evolutionStatus);
        setEvolutionData({
          previousStage,
          newStage: evolutionStatus.currentStage,
        });
      }
    } catch (error) {
      console.error('[Breathing] Failed to check evolution:', error);
    }
  };

  // Handle evolution modal close
  const handleEvolutionClose = () => {
    setEvolutionData(null);
  };

  // Handle cancellation
  const handleCancel = () => {
    console.log('[Breathing] Session cancelled');
  };

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
