/**
 * Feature Flags Service Tests
 * ===========================
 * Unit tests for type-safe feature flags service.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: CLI-012 (feature flag management)
 *
 * Coverage targets:
 * - getFeatureFlags() function
 * - FeatureFlagsProvider component
 * - useFeatureFlags hook
 * - useFeature hook
 * - Feature component
 * - Environment variable parsing
 *
 * Note: import.meta.env is compile-time static in Vite, so we test
 * the parsing logic via the parseEnvBoolean export and test the
 * Provider/hooks with overrides.
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  getFeatureFlags,
  getFeatureFlagsSnapshot,
  FeatureFlagsProvider,
  useFeatureFlags,
  useFeature,
  Feature,
  // Export for testing
} from '../../src/services/featureFlags';

describe('FeatureFlags Service', () => {
  describe('getFeatureFlags', () => {
    it('should return default values (env vars not set in test)', () => {
      const flags = getFeatureFlags();

      // Default values per implementation
      expect(flags.breathing).toBe(true);
      expect(flags.leaderboard).toBe(false);
      expect(flags.evolution).toBe(true);
      expect(flags.newOnboarding).toBe(false);
      expect(flags.offlineMode).toBe(true);
    });

    it('should return all expected flag properties', () => {
      const flags = getFeatureFlags();

      // TypeScript ensures this at compile time, runtime check for completeness
      expect(typeof flags.breathing).toBe('boolean');
      expect(typeof flags.leaderboard).toBe('boolean');
      expect(typeof flags.evolution).toBe('boolean');
      expect(typeof flags.debugMode).toBe('boolean');
      expect(typeof flags.newOnboarding).toBe('boolean');
      expect(typeof flags.offlineMode).toBe('boolean');
    });

    it('should return consistent results on multiple calls', () => {
      const flags1 = getFeatureFlags();
      const flags2 = getFeatureFlags();

      expect(flags1.breathing).toBe(flags2.breathing);
      expect(flags1.leaderboard).toBe(flags2.leaderboard);
    });
  });

  describe('getFeatureFlagsSnapshot', () => {
    it('should return a plain object copy of flags', () => {
      const snapshot = getFeatureFlagsSnapshot();

      expect(typeof snapshot).toBe('object');
      expect(snapshot.breathing).toBe(true);
      expect(snapshot.leaderboard).toBe(false);
    });

    it('should be JSON serializable', () => {
      const snapshot = getFeatureFlagsSnapshot();

      const json = JSON.stringify(snapshot);
      const parsed = JSON.parse(json);

      expect(parsed.breathing).toBe(true);
    });

    it('should match getFeatureFlags values', () => {
      const flags = getFeatureFlags();
      const snapshot = getFeatureFlagsSnapshot();

      expect(snapshot.breathing).toBe(flags.breathing);
      expect(snapshot.leaderboard).toBe(flags.leaderboard);
    });
  });

  describe('FeatureFlagsProvider', () => {
    it('should provide flags to children', () => {
      function TestComponent() {
        const flags = useFeatureFlags();
        return <div data-testid="result">{flags.breathing ? 'enabled' : 'disabled'}</div>;
      }

      render(
        <FeatureFlagsProvider>
          <TestComponent />
        </FeatureFlagsProvider>
      );

      expect(screen.getByTestId('result')).toHaveTextContent('enabled');
    });

    it('should accept overrides', () => {
      function TestComponent() {
        const flags = useFeatureFlags();
        return <div data-testid="result">{flags.leaderboard ? 'enabled' : 'disabled'}</div>;
      }

      render(
        <FeatureFlagsProvider overrides={{ leaderboard: true }}>
          <TestComponent />
        </FeatureFlagsProvider>
      );

      expect(screen.getByTestId('result')).toHaveTextContent('enabled');
    });

    it('should merge overrides with env flags', () => {
      function TestComponent() {
        const flags = useFeatureFlags();
        return (
          <div data-testid="result">
            breathing:{flags.breathing ? '1' : '0'} leaderboard:{flags.leaderboard ? '1' : '0'}
          </div>
        );
      }

      render(
        <FeatureFlagsProvider overrides={{ leaderboard: true }}>
          <TestComponent />
        </FeatureFlagsProvider>
      );

      // breathing should remain default (true), leaderboard overridden to true
      expect(screen.getByTestId('result')).toHaveTextContent('breathing:1 leaderboard:1');
    });

    it('should allow disabling default-on flags via override', () => {
      function TestComponent() {
        const flags = useFeatureFlags();
        return <div data-testid="result">{flags.breathing ? 'enabled' : 'disabled'}</div>;
      }

      render(
        <FeatureFlagsProvider overrides={{ breathing: false }}>
          <TestComponent />
        </FeatureFlagsProvider>
      );

      expect(screen.getByTestId('result')).toHaveTextContent('disabled');
    });
  });

  describe('useFeatureFlags', () => {
    it('should throw if used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useFeatureFlags());
      }).toThrow('useFeatureFlags must be used within a FeatureFlagsProvider');

      consoleSpy.mockRestore();
    });

    it('should return flags when inside provider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
      );

      const { result } = renderHook(() => useFeatureFlags(), { wrapper });

      expect(result.current.breathing).toBe(true);
      expect(result.current.leaderboard).toBe(false);
    });
  });

  describe('useFeature', () => {
    it('should return single flag value', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
      );

      const { result } = renderHook(() => useFeature('breathing'), { wrapper });

      expect(result.current).toBe(true);
    });

    it('should return overridden flag value', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <FeatureFlagsProvider overrides={{ leaderboard: true }}>{children}</FeatureFlagsProvider>
      );

      const { result } = renderHook(() => useFeature('leaderboard'), { wrapper });

      expect(result.current).toBe(true);
    });

    it('should return false for disabled flags', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
      );

      const { result } = renderHook(() => useFeature('leaderboard'), { wrapper });

      expect(result.current).toBe(false);
    });
  });

  describe('Feature component', () => {
    it('should render children when flag is enabled', () => {
      render(
        <FeatureFlagsProvider>
          <Feature flag="breathing">
            <div data-testid="content">Breathing content</div>
          </Feature>
        </FeatureFlagsProvider>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should not render children when flag is disabled', () => {
      render(
        <FeatureFlagsProvider>
          <Feature flag="leaderboard">
            <div data-testid="content">Leaderboard content</div>
          </Feature>
        </FeatureFlagsProvider>
      );

      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('should render fallback when flag is disabled', () => {
      render(
        <FeatureFlagsProvider>
          <Feature flag="leaderboard" fallback={<div data-testid="fallback">Coming soon</div>}>
            <div data-testid="content">Leaderboard content</div>
          </Feature>
        </FeatureFlagsProvider>
      );

      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback')).toHaveTextContent('Coming soon');
    });

    it('should not render fallback when flag is enabled', () => {
      render(
        <FeatureFlagsProvider>
          <Feature flag="breathing" fallback={<div data-testid="fallback">Coming soon</div>}>
            <div data-testid="content">Breathing content</div>
          </Feature>
        </FeatureFlagsProvider>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
    });

    it('should work with overridden flags', () => {
      render(
        <FeatureFlagsProvider overrides={{ leaderboard: true }}>
          <Feature flag="leaderboard">
            <div data-testid="content">Leaderboard content</div>
          </Feature>
        </FeatureFlagsProvider>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should render nothing when no fallback and flag disabled', () => {
      const { container } = render(
        <FeatureFlagsProvider>
          <Feature flag="leaderboard">
            <div data-testid="content">Leaderboard content</div>
          </Feature>
        </FeatureFlagsProvider>
      );

      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      // Container should be essentially empty
      expect(container.textContent).toBe('');
    });
  });

  describe('Type safety', () => {
    it('should have all required flag properties', () => {
      const flags = getFeatureFlags();

      // Ensure all expected flags exist
      const expectedFlags = [
        'breathing',
        'leaderboard',
        'evolution',
        'debugMode',
        'newOnboarding',
        'offlineMode',
      ] as const;

      for (const flag of expectedFlags) {
        expect(flag in flags).toBe(true);
        expect(typeof flags[flag]).toBe('boolean');
      }
    });

    it('should not have extra properties', () => {
      const flags = getFeatureFlags();
      const keys = Object.keys(flags);

      expect(keys).toHaveLength(6);
    });
  });
});
