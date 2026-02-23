/**
 * Breathing Components Barrel Export
 *
 * NOTE: Pattern data is exported separately to prevent motion library
 * from being bundled with pattern consumers (tree-shaking optimization).
 *
 * Import patterns directly: import { BREATHING_PATTERNS } from './patterns'
 * Import components from this barrel for code-splitting.
 */

// Components that use motion - lazy-load friendly
export { HapticBreathing, default as HapticBreathingDefault } from './HapticBreathing';
export { BreathingCircle, type BreathingPhase } from './BreathingCircle';

// Re-export patterns for convenience (pure data, no motion)
// These are safe to import without pulling motion
export {
  BREATHING_PATTERNS,
  getPatternById,
  getPatternsByCategory,
  getFreePatterns,
  getPatternDuration,
  getTotalDuration,
  formatDuration,
  getRecommendedCycles,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type BreathingPattern,
} from './patterns';
