/**
 * Feature Flags Service
 * =====================
 * Type-safe feature flags with build-time validation.
 *
 * Architecture Decision:
 * - BUILD-TIME flags via environment variables (preferred for DTx)
 * - Provides traceability required by IEC 62304 §5.1.9
 * - Each release has deterministic feature set (no runtime surprises)
 *
 * Why build-time over runtime for medical software:
 * 1. Traceability: exact flag state captured in build manifest
 * 2. Determinism: same build = same behavior (no remote config drift)
 * 3. Compliance: easier audit trail for FDA/CE validation
 * 4. Security: no external service dependency for critical features
 *
 * Pattern: flagged library style (React Context + hooks)
 * Reference: https://github.com/sergiodxa/flagged
 *
 * @module @sleepcore/mini-app/services/featureFlags
 */

import { createContext, useContext, type ReactNode } from 'react';
import { env } from '@/env';

/**
 * Feature flag definitions
 *
 * Add new flags here with their env var mappings.
 * All flags must be prefixed with VITE_FEATURE_ for Vite exposure.
 */
export interface FeatureFlags {
  /**
   * Enable breathing exercises feature
   * @default true (core feature)
   */
  readonly breathing: boolean;

  /**
   * Enable leaderboard feature (opt-in, GDPR compliant)
   * @default false (requires explicit enablement)
   */
  readonly leaderboard: boolean;

  /**
   * Enable evolution/gamification system
   * @default true (engagement feature)
   */
  readonly evolution: boolean;

  /**
   * Enable debug mode (dev tools, verbose logging)
   * @default false (only in development)
   */
  readonly debugMode: boolean;

  /**
   * Enable new onboarding flow (A/B test candidate)
   * @default false (controlled rollout)
   */
  readonly newOnboarding: boolean;

  /**
   * Enable offline mode with sync queue
   * @default true (core reliability feature)
   */
  readonly offlineMode: boolean;
}

/**
 * Parse boolean from environment variable
 *
 * Handles string values from env vars:
 * - 'true', '1', 'yes' -> true
 * - 'false', '0', 'no', undefined -> false
 */
function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Get feature flags from environment
 *
 * Build-time resolution ensures flags are baked into the bundle.
 * No runtime fetching or external dependencies.
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    breathing: parseEnvBoolean(import.meta.env.VITE_FEATURE_BREATHING, true),
    leaderboard: parseEnvBoolean(import.meta.env.VITE_FEATURE_LEADERBOARD, false),
    evolution: parseEnvBoolean(import.meta.env.VITE_FEATURE_EVOLUTION, true),
    debugMode: parseEnvBoolean(import.meta.env.VITE_FEATURE_DEBUG_MODE, env.DEV),
    newOnboarding: parseEnvBoolean(import.meta.env.VITE_FEATURE_NEW_ONBOARDING, false),
    offlineMode: parseEnvBoolean(import.meta.env.VITE_FEATURE_OFFLINE_MODE, true),
  };
}

/**
 * Feature flags context
 * Provides flags throughout the component tree
 */
const FeatureFlagsContext = createContext<FeatureFlags | null>(null);

/**
 * Feature flags provider props
 */
export interface FeatureFlagsProviderProps {
  children: ReactNode;
  /**
   * Override flags for testing or specific scenarios
   * Merged with environment flags (overrides take precedence)
   */
  overrides?: Partial<FeatureFlags>;
}

/**
 * Feature flags provider component
 *
 * Wrap your app with this to enable useFeature hook.
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { FeatureFlagsProvider } from '@/services/featureFlags';
 *
 * function App() {
 *   return (
 *     <FeatureFlagsProvider>
 *       <MyApp />
 *     </FeatureFlagsProvider>
 *   );
 * }
 *
 * // Override for testing
 * <FeatureFlagsProvider overrides={{ leaderboard: true }}>
 *   <MyComponent />
 * </FeatureFlagsProvider>
 * ```
 */
export function FeatureFlagsProvider({ children, overrides }: FeatureFlagsProviderProps) {
  const baseFlags = getFeatureFlags();
  const flags: FeatureFlags = overrides ? { ...baseFlags, ...overrides } : baseFlags;

  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access all feature flags
 *
 * @throws Error if used outside FeatureFlagsProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const flags = useFeatureFlags();
 *   return flags.breathing ? <BreathingExercise /> : null;
 * }
 * ```
 */
export function useFeatureFlags(): FeatureFlags {
  const flags = useContext(FeatureFlagsContext);
  if (!flags) {
    throw new Error(
      'useFeatureFlags must be used within a FeatureFlagsProvider. ' +
      'Wrap your app with <FeatureFlagsProvider> in main.tsx.'
    );
  }
  return flags;
}

/**
 * Hook to check a single feature flag
 *
 * @param flag - Name of the feature flag to check
 * @returns boolean - Whether the feature is enabled
 *
 * @example
 * ```tsx
 * function LeaderboardButton() {
 *   const isEnabled = useFeature('leaderboard');
 *
 *   if (!isEnabled) {
 *     return null; // Don't render if feature disabled
 *   }
 *
 *   return <Button>View Leaderboard</Button>;
 * }
 * ```
 */
export function useFeature<K extends keyof FeatureFlags>(flag: K): FeatureFlags[K] {
  const flags = useFeatureFlags();
  return flags[flag];
}

/**
 * Component that renders children only if feature is enabled
 *
 * @example
 * ```tsx
 * <Feature flag="leaderboard">
 *   <LeaderboardPanel />
 * </Feature>
 *
 * // With fallback
 * <Feature flag="leaderboard" fallback={<ComingSoon />}>
 *   <LeaderboardPanel />
 * </Feature>
 * ```
 */
export interface FeatureProps {
  flag: keyof FeatureFlags;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Feature({ flag, children, fallback = null }: FeatureProps) {
  const isEnabled = useFeature(flag);
  return <>{isEnabled ? children : fallback}</>;
}

/**
 * Get current flags as JSON for debugging/logging
 * Useful for Sentry context or analytics
 */
export function getFeatureFlagsSnapshot(): Record<string, boolean> {
  const flags = getFeatureFlags();
  return { ...flags };
}

/**
 * Type declaration for Vite env
 * Extends ImportMetaEnv with feature flag variables
 */
declare global {
  interface ImportMetaEnv {
    readonly VITE_FEATURE_BREATHING?: string;
    readonly VITE_FEATURE_LEADERBOARD?: string;
    readonly VITE_FEATURE_EVOLUTION?: string;
    readonly VITE_FEATURE_DEBUG_MODE?: string;
    readonly VITE_FEATURE_NEW_ONBOARDING?: string;
    readonly VITE_FEATURE_OFFLINE_MODE?: string;
  }
}
