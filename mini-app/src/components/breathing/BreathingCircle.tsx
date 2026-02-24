/**
 * BreathingCircle Component
 * =========================
 * Animated SVG circle that expands/contracts with breathing phases.
 *
 * PERFORMANCE: Uses CSS-only animations for 60fps on mobile.
 * - CSS transitions for phase changes (GPU-accelerated transform/opacity)
 * - CSS keyframes for pulse effects
 * - CSS variables for dynamic durations
 * - Zero JavaScript animation libraries = ~30KB bundle savings
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
} as const;

// Glow colors (slightly lighter)
const GLOW_COLORS = {
  idle: 'rgba(100, 116, 139, 0.3)',
  inhale: 'rgba(129, 140, 248, 0.4)',
  hold: 'rgba(196, 181, 253, 0.4)',
  exhale: 'rgba(125, 211, 252, 0.4)',
  hold2: 'rgba(196, 181, 253, 0.4)',
  complete: 'rgba(134, 239, 172, 0.5)',
} as const;

// Scale values for each phase
const PHASE_SCALES = {
  idle: 0.6,
  inhale: 1,
  hold: 1,
  exhale: 0.6,
  hold2: 0.6,
  complete: 0.8,
} as const;

export const BreathingCircle: React.FC<BreathingCircleProps> = ({
  phase,
  timeRemaining,
  pattern,
  size = 280,
}) => {
  const { t } = useTranslation();

  // Get phase duration for CSS transition
  const phaseDuration = useMemo((): number => {
    switch (phase) {
      case 'inhale': return pattern.inhale;
      case 'hold': return pattern.hold;
      case 'exhale': return pattern.exhale;
      case 'hold2': return pattern.hold2 || 0;
      default: return 0.5;
    }
  }, [phase, pattern]);

  // Get phase label
  const phaseLabel = useMemo((): string => {
    switch (phase) {
      case 'idle': return t('breathing.phases.ready');
      case 'inhale': return t('breathing.phases.inhale');
      case 'hold': return t('breathing.phases.hold');
      case 'exhale': return t('breathing.phases.exhale');
      case 'hold2': return t('breathing.phases.pause');
      case 'complete': return t('breathing.phases.done');
      default: return '';
    }
  }, [phase, t]);

  const scale = PHASE_SCALES[phase];
  const circleRadius = (size - 40) / 2;
  const centerX = size / 2;
  const centerY = size / 2;
  const showPulse = phase === 'inhale' || phase === 'exhale';

  // CSS custom properties for dynamic values
  const cssVars = {
    '--phase-duration': `${phaseDuration}s`,
    '--phase-color': PHASE_COLORS[phase],
    '--glow-color': GLOW_COLORS[phase],
    '--scale': scale,
    '--main-radius': circleRadius * 0.9 * scale,
    '--inner-radius': circleRadius * 0.6 * scale,
  } as React.CSSProperties;

  return (
    <div
      className="relative breathing-circle-container"
      style={{ width: size, height: size, ...cssVars }}
    >
      {/* Glow effect - CSS transition */}
      <div
        className="absolute inset-0 rounded-full blur-2xl breathing-glow"
        style={{
          backgroundColor: GLOW_COLORS[phase],
          transform: `scale(${scale * 1.1})`,
          transition: `transform var(--phase-duration) ease-in-out, background-color var(--phase-duration) ease-in-out`,
        }}
      />

      {/* Main SVG Circle */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-10"
        role="img"
        aria-label={t('a11y.breathing.circleVisualization', { phase: phaseLabel })}
      >
        {/* Background ring (static) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={circleRadius}
          fill="none"
          stroke="rgba(100, 116, 139, 0.2)"
          strokeWidth="2"
        />

        {/* Animated main circle - CSS transition on r doesn't work, use transform */}
        <circle
          cx={centerX}
          cy={centerY}
          r={circleRadius * 0.9}
          fill={PHASE_COLORS[phase]}
          fillOpacity={0.15}
          stroke={PHASE_COLORS[phase]}
          strokeWidth="3"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${centerX}px ${centerY}px`,
            transition: `transform var(--phase-duration) ease-in-out, fill var(--phase-duration) ease-in-out, stroke var(--phase-duration) ease-in-out`,
          }}
        />

        {/* Inner glow circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={circleRadius * 0.6}
          fill={PHASE_COLORS[phase]}
          fillOpacity={phase === 'hold' || phase === 'hold2' ? 0.3 : 0.25}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${centerX}px ${centerY}px`,
            transition: `transform var(--phase-duration) ease-in-out, fill-opacity var(--phase-duration) ease-in-out`,
          }}
        />

        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={8}
          fill={PHASE_COLORS[phase]}
          className={phase === 'complete' ? 'breathing-dot-pulse' : ''}
          style={{
            transition: 'fill 0.3s ease-in-out',
          }}
        />
      </svg>

      {/* Text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        {/* Phase label with fade transition */}
        <span
          key={phase}
          className="text-2xl font-semibold text-night-100 breathing-text-fade"
        >
          {phaseLabel}
        </span>

        {/* Time remaining */}
        {phase !== 'idle' && phase !== 'complete' && (
          <span
            key={`time-${timeRemaining}`}
            className="text-5xl font-bold text-night-50 mt-2 breathing-time-pop"
          >
            {timeRemaining}
          </span>
        )}

        {/* Pattern timing hint (idle state) */}
        {phase === 'idle' && (
          <span className="text-night-400 mt-2 text-sm">
            {pattern.inhale}-{pattern.hold}-{pattern.exhale}
            {pattern.hold2 ? `-${pattern.hold2}` : ''}
          </span>
        )}
      </div>

      {/* Pulse rings - CSS keyframe animations */}
      {showPulse && (
        <>
          <div
            className="absolute inset-0 rounded-full border-2 breathing-pulse-ring"
            style={{ borderColor: PHASE_COLORS[phase] }}
          />
          <div
            className="absolute inset-0 rounded-full border breathing-pulse-ring breathing-pulse-ring-delayed"
            style={{ borderColor: PHASE_COLORS[phase] }}
          />
        </>
      )}
    </div>
  );
};

export default BreathingCircle;
