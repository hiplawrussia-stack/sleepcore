/**
 * Breathing Page
 * ==============
 * Full breathing exercise experience with haptic feedback.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { HapticBreathing, getPatternById } from '@/components/breathing';
import { EvolutionCelebrationModal } from '@/components/common';
import { useTelegram } from '@/hooks';
import { useUserStore } from '@/store';
import { api } from '@/services/api';

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
    const evolutionResult = await api.checkEvolution();
    if (evolutionResult.success && evolutionResult.data?.evolved) {
      console.log('[Breathing] Evolution!', evolutionResult.data);
      setEvolutionData({
        previousStage,
        newStage: evolutionResult.data.currentStage,
      });
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
