/**
 * BreathingCircle Component
 * =========================
 * Animated SVG circle that expands/contracts with breathing phases.
 * Uses Motion (Framer Motion) for smooth 60fps animations.
 */

import { motion } from 'motion/react';
import type { BreathingPattern } from './patterns';

export type BreathingPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'hold2' | 'complete';

interface BreathingCircleProps {
  phase: BreathingPhase;
  timeRemaining: number;
  pattern: BreathingPattern;
  size?: number;
}

// Phase colors from tailwind config
const PHASE_COLORS = {
  idle: '#64748b',      // night-500
  inhale: '#818cf8',    // breathing-inhale (indigo)
  hold: '#c4b5fd',      // breathing-hold (purple)
  exhale: '#7dd3fc',    // breathing-exhale (sky)
  hold2: '#c4b5fd',     // same as hold
  complete: '#86efac',  // calm-green
};

// Glow colors (slightly lighter)
const GLOW_COLORS = {
  idle: 'rgba(100, 116, 139, 0.3)',
  inhale: 'rgba(129, 140, 248, 0.4)',
  hold: 'rgba(196, 181, 253, 0.4)',
  exhale: 'rgba(125, 211, 252, 0.4)',
  hold2: 'rgba(196, 181, 253, 0.4)',
  complete: 'rgba(134, 239, 172, 0.5)',
};

export const BreathingCircle: React.FC<BreathingCircleProps> = ({
  phase,
  timeRemaining,
  pattern,
  size = 280,
}) => {
  // Calculate scale based on phase
  const getScale = (): number => {
    switch (phase) {
      case 'idle':
        return 0.6;
      case 'inhale':
        return 1;
      case 'hold':
        return 1;
      case 'exhale':
        return 0.6;
      case 'hold2':
        return 0.6;
      case 'complete':
        return 0.8;
      default:
        return 0.6;
    }
  };

  // Get phase duration for animation
  const getPhaseDuration = (): number => {
    switch (phase) {
      case 'inhale':
        return pattern.inhale;
      case 'hold':
        return pattern.hold;
      case 'exhale':
        return pattern.exhale;
      case 'hold2':
        return pattern.hold2 || 0;
      default:
        return 1;
    }
  };

  // Get phase label in Russian
  const getPhaseLabel = (): string => {
    switch (phase) {
      case 'idle':
        return 'Готов';
      case 'inhale':
        return 'Вдох';
      case 'hold':
        return 'Задержка';
      case 'exhale':
        return 'Выдох';
      case 'hold2':
        return 'Пауза';
      case 'complete':
        return 'Готово!';
      default:
        return '';
    }
  };

  const circleRadius = (size - 40) / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        animate={{
          backgroundColor: GLOW_COLORS[phase],
          scale: getScale() * 1.1,
        }}
        transition={{
          duration: getPhaseDuration(),
          ease: 'easeInOut',
        }}
      />

      {/* Main SVG Circle */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-10"
      >
        {/* Background ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={circleRadius}
          fill="none"
          stroke="rgba(100, 116, 139, 0.2)"
          strokeWidth="2"
        />

        {/* Animated main circle */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r={circleRadius * 0.9}
          fill={PHASE_COLORS[phase]}
          fillOpacity={0.15}
          stroke={PHASE_COLORS[phase]}
          strokeWidth="3"
          animate={{
            r: circleRadius * 0.9 * getScale(),
            fill: PHASE_COLORS[phase],
            stroke: PHASE_COLORS[phase],
          }}
          transition={{
            duration: getPhaseDuration(),
            ease: 'easeInOut',
          }}
        />

        {/* Inner glow circle */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r={circleRadius * 0.6}
          fill={PHASE_COLORS[phase]}
          fillOpacity={0.25}
          animate={{
            r: circleRadius * 0.6 * getScale(),
            fillOpacity: phase === 'hold' || phase === 'hold2' ? 0.3 : 0.25,
          }}
          transition={{
            duration: getPhaseDuration(),
            ease: 'easeInOut',
          }}
        />

        {/* Center dot */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r={8}
          fill={PHASE_COLORS[phase]}
          animate={{
            scale: phase === 'complete' ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 0.5,
            repeat: phase === 'complete' ? 2 : 0,
          }}
        />
      </svg>

      {/* Text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        {/* Phase label */}
        <motion.span
          key={phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-2xl font-semibold text-night-100"
        >
          {getPhaseLabel()}
        </motion.span>

        {/* Time remaining */}
        {phase !== 'idle' && phase !== 'complete' && (
          <motion.span
            key={`time-${timeRemaining}`}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-5xl font-bold text-night-50 mt-2"
          >
            {timeRemaining}
          </motion.span>
        )}

        {/* Pattern timing hint (idle state) */}
        {phase === 'idle' && (
          <span className="text-night-400 mt-2 text-sm">
            {pattern.inhale}-{pattern.hold}-{pattern.exhale}
            {pattern.hold2 ? `-${pattern.hold2}` : ''}
          </span>
        )}
      </div>

      {/* Pulse rings (during active breathing) */}
      {(phase === 'inhale' || phase === 'exhale') && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: PHASE_COLORS[phase] }}
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 1.3, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: PHASE_COLORS[phase] }}
            initial={{ scale: 0.6, opacity: 0.4 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
              delay: 0.5,
            }}
          />
        </>
      )}
    </div>
  );
};

export default BreathingCircle;
