/**
 * Breathing Page
 * ==============
 * Full breathing exercise experience with haptic feedback.
 */

import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { HapticBreathing } from '@/components/breathing';
import { useTelegram } from '@/hooks';
import { useUserStore } from '@/store';
import { api } from '@/services/api';

export const Breathing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showBackButton, hideBackButton } = useTelegram();
  const { logSession } = useUserStore();

  const initialPattern = searchParams.get('pattern') || '478';

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

    // Log to backend
    await logSession(patternId, cycles, durationSeconds);

    // Check for evolution (if applicable)
    const evolutionResult = await api.checkEvolution();
    if (evolutionResult.success && evolutionResult.data?.evolved) {
      // TODO: Show evolution celebration modal
      console.log('[Breathing] Evolution!', evolutionResult.data);
    }
  };

  // Handle cancellation
  const handleCancel = () => {
    console.log('[Breathing] Session cancelled');
  };

  return (
    <HapticBreathing
      initialPatternId={initialPattern}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
};

export default Breathing;
