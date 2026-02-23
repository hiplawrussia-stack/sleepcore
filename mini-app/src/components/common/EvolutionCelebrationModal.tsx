/**
 * Evolution Celebration Modal - Gamification Reward Animation
 * ============================================================
 * Celebrates user evolution with confetti and scale animation.
 *
 * PERFORMANCE: CSS-only animations, no motion dependency.
 * Uses CSS @keyframes for confetti effect.
 *
 * UX Research:
 * - Optimal celebration duration: 200-500ms (Google Material Design)
 * - Confetti + scale combination for maximum engagement
 * - Haptic feedback integration for tactile reinforcement
 *
 * @see CLAUDE.md §13 - Gamification module
 * @module @sleepcore/mini-app/components
 */

import React, { useEffect, useState } from 'react';
import { haptics } from '@/services/haptics';

interface EvolutionCelebrationModalProps {
  isVisible: boolean;
  previousStage: string;
  newStage: string;
  onClose: () => void;
}

/** Stage display names in Russian */
const STAGE_NAMES: Record<string, string> = {
  owlet: 'Совёнок',
  young_owl: 'Молодая Сова',
  wise_owl: 'Мудрая Сова',
};

/** Stage icons */
const STAGE_ICONS: Record<string, string> = {
  owlet: '🐣',
  young_owl: '🦉',
  wise_owl: '🦉✨',
};

/** Confetti particle component - CSS animation */
const ConfettiParticle: React.FC<{ delay: number; x: number; emoji: string }> = ({ delay, x, emoji }) => (
  <div
    style={{
      left: `${x}%`,
      animationDelay: `${delay}s`,
    }}
    className="absolute text-2xl pointer-events-none animate-confetti-fall"
  >
    {emoji}
  </div>
);

export const EvolutionCelebrationModal: React.FC<EvolutionCelebrationModalProps> = ({
  isVisible,
  previousStage,
  newStage,
  onClose,
}) => {
  const [confettiParticles, setConfettiParticles] = useState<Array<{ id: number; delay: number; x: number; emoji: string }>>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Generate confetti particles when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      // Celebration haptic feedback
      haptics.celebrationFeedback();
      setIsAnimating(true);

      // Generate confetti particles
      const emojis = ['🎉', '⭐', '✨', '🌟', '💫'];
      const particles = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.5,
        x: 10 + Math.random() * 80,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
      }));
      setConfettiParticles(particles);
    } else {
      setIsAnimating(false);
      setConfettiParticles([]);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const previousName = STAGE_NAMES[previousStage] || previousStage;
  const newName = STAGE_NAMES[newStage] || newStage;
  const newIcon = STAGE_ICONS[newStage] || '🦉';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-night-900/90 backdrop-blur-sm transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      {/* Confetti layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiParticles.map((particle) => (
          <ConfettiParticle
            key={particle.id}
            delay={particle.delay}
            x={particle.x}
            emoji={particle.emoji}
          />
        ))}
      </div>

      {/* Modal content */}
      <div
        className={`relative z-10 mx-4 p-6 rounded-3xl bg-gradient-to-b from-primary-500/20 to-night-800 border border-primary-500/30 max-w-sm w-full text-center transition-all duration-400 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Evolution icon with scale animation */}
        <div
          className="text-7xl mb-4 animate-celebration-bounce"
          style={{ animationDelay: '0.2s' }}
        >
          {newIcon}
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold text-primary-400 mb-2 animate-slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          Эволюция!
        </h2>

        {/* Evolution progress */}
        <div
          className="mb-4 animate-slide-up"
          style={{ animationDelay: '0.4s' }}
        >
          <div className="text-night-400 text-sm mb-2">
            {previousName}
          </div>
          <div className="flex items-center justify-center gap-2 text-night-300">
            <span>→</span>
          </div>
          <div className="text-xl font-semibold text-night-100 mt-2">
            {newName}
          </div>
        </div>

        {/* Congratulation message */}
        <p
          className="text-night-300 text-sm mb-6 animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          Твой прогресс впечатляет! Продолжай практиковать дыхательные упражнения для достижения нового уровня.
        </p>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-6 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors animate-slide-up"
          style={{ animationDelay: '0.6s' }}
        >
          Отлично!
        </button>
      </div>
    </div>
  );
};

export default EvolutionCelebrationModal;
