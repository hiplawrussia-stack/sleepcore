/**
 * Evolution Celebration Modal - Gamification Reward Animation
 * ============================================================
 * Celebrates user evolution with confetti and scale animation.
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
import { motion, AnimatePresence } from 'motion/react';
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

/** Confetti particle component */
const ConfettiParticle: React.FC<{ delay: number; x: number }> = ({ delay, x }) => (
  <motion.div
    initial={{ y: -20, x: x, opacity: 1, rotate: 0 }}
    animate={{
      y: 400,
      opacity: 0,
      rotate: 720,
    }}
    transition={{
      duration: 2,
      delay,
      ease: 'easeOut',
    }}
    className="absolute text-2xl pointer-events-none"
    style={{ left: `${x}%` }}
  >
    {['🎉', '⭐', '✨', '🌟', '💫'][Math.floor(Math.random() * 5)]}
  </motion.div>
);

export const EvolutionCelebrationModal: React.FC<EvolutionCelebrationModalProps> = ({
  isVisible,
  previousStage,
  newStage,
  onClose,
}) => {
  const [confettiParticles, setConfettiParticles] = useState<Array<{ id: number; delay: number; x: number }>>([]);

  // Generate confetti particles when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      // Celebration haptic feedback
      haptics.celebrationFeedback();

      // Generate confetti particles
      const particles = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.5,
        x: 10 + Math.random() * 80,
      }));
      setConfettiParticles(particles);
    } else {
      setConfettiParticles([]);
    }
  }, [isVisible]);

  const previousName = STAGE_NAMES[previousStage] || previousStage;
  const newName = STAGE_NAMES[newStage] || newStage;
  const newIcon = STAGE_ICONS[newStage] || '🦉';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-night-900/90 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Confetti layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confettiParticles.map((particle) => (
              <ConfettiParticle
                key={particle.id}
                delay={particle.delay}
                x={particle.x}
              />
            ))}
          </div>

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 300,
              duration: 0.4,
            }}
            className="relative z-10 mx-4 p-6 rounded-3xl bg-gradient-to-b from-primary-500/20 to-night-800 border border-primary-500/30 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Evolution icon with scale animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                damping: 10,
                stiffness: 200,
                delay: 0.2,
              }}
              className="text-7xl mb-4"
            >
              {newIcon}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-primary-400 mb-2"
            >
              Эволюция!
            </motion.h2>

            {/* Evolution progress */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-4"
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
            </motion.div>

            {/* Congratulation message */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-night-300 text-sm mb-6"
            >
              Твой прогресс впечатляет! Продолжай практиковать дыхательные упражнения для достижения нового уровня.
            </motion.p>

            {/* Close button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              onClick={onClose}
              className="w-full py-3 px-6 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              Отлично!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EvolutionCelebrationModal;
