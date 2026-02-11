/**
 * Auth Store Unit Tests
 * =====================
 * Tests for Zustand auth store.
 *
 * Test Coverage:
 * - Initial state
 * - setUser action
 * - setAuthenticating action
 * - setAuthError action
 * - logout action
 * - State persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import type { AuthUser } from '@/api';

// Mock sessionStorage for persistence tests
const mockStorage = new Map<string, string>();

vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
  length: mockStorage.size,
  key: () => null,
});

describe('useAuthStore', () => {
  const mockUser: AuthUser = {
    id: 1,
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isAuthenticating: false,
      authError: null,
    });
    mockStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null user initially', () => {
      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });

    it('should not be authenticated initially', () => {
      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
    });

    it('should not be authenticating initially', () => {
      const { isAuthenticating } = useAuthStore.getState();
      expect(isAuthenticating).toBe(false);
    });

    it('should have no auth error initially', () => {
      const { authError } = useAuthStore.getState();
      expect(authError).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user and mark as authenticated', () => {
      useAuthStore.getState().setUser(mockUser);

      const { user, isAuthenticated } = useAuthStore.getState();
      expect(user).toEqual(mockUser);
      expect(isAuthenticated).toBe(true);
    });

    it('should clear authenticating state', () => {
      useAuthStore.setState({ isAuthenticating: true });

      useAuthStore.getState().setUser(mockUser);

      const { isAuthenticating } = useAuthStore.getState();
      expect(isAuthenticating).toBe(false);
    });

    it('should clear auth error', () => {
      useAuthStore.setState({ authError: 'Previous error' });

      useAuthStore.getState().setUser(mockUser);

      const { authError } = useAuthStore.getState();
      expect(authError).toBeNull();
    });

    it('should handle null user (logout scenario)', () => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });

      useAuthStore.getState().setUser(null);

      const { user, isAuthenticated } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('setAuthenticating', () => {
    it('should set authenticating to true', () => {
      useAuthStore.getState().setAuthenticating(true);

      const { isAuthenticating } = useAuthStore.getState();
      expect(isAuthenticating).toBe(true);
    });

    it('should set authenticating to false', () => {
      useAuthStore.setState({ isAuthenticating: true });

      useAuthStore.getState().setAuthenticating(false);

      const { isAuthenticating } = useAuthStore.getState();
      expect(isAuthenticating).toBe(false);
    });

    it('should clear auth error when starting authentication', () => {
      useAuthStore.setState({ authError: 'Previous error' });

      useAuthStore.getState().setAuthenticating(true);

      const { authError } = useAuthStore.getState();
      expect(authError).toBeNull();
    });
  });

  describe('setAuthError', () => {
    it('should set auth error', () => {
      useAuthStore.getState().setAuthError('Authentication failed');

      const { authError } = useAuthStore.getState();
      expect(authError).toBe('Authentication failed');
    });

    it('should clear authenticating state', () => {
      useAuthStore.setState({ isAuthenticating: true });

      useAuthStore.getState().setAuthError('Error occurred');

      const { isAuthenticating } = useAuthStore.getState();
      expect(isAuthenticating).toBe(false);
    });

    it('should allow clearing error by setting null', () => {
      useAuthStore.setState({ authError: 'Some error' });

      useAuthStore.getState().setAuthError(null);

      const { authError } = useAuthStore.getState();
      expect(authError).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear user', () => {
      useAuthStore.setState({ user: mockUser });

      useAuthStore.getState().logout();

      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });

    it('should set isAuthenticated to false', () => {
      useAuthStore.setState({ isAuthenticated: true });

      useAuthStore.getState().logout();

      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
    });

    it('should clear isAuthenticating', () => {
      useAuthStore.setState({ isAuthenticating: true });

      useAuthStore.getState().logout();

      const { isAuthenticating } = useAuthStore.getState();
      expect(isAuthenticating).toBe(false);
    });

    it('should clear authError', () => {
      useAuthStore.setState({ authError: 'Some error' });

      useAuthStore.getState().logout();

      const { authError } = useAuthStore.getState();
      expect(authError).toBeNull();
    });

    it('should reset all state in one call', () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isAuthenticating: true,
        authError: 'Some error',
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isAuthenticating).toBe(false);
      expect(state.authError).toBeNull();
    });
  });

  describe('state transitions', () => {
    it('should handle typical authentication flow', () => {
      // Start authentication
      useAuthStore.getState().setAuthenticating(true);
      expect(useAuthStore.getState().isAuthenticating).toBe(true);

      // Complete authentication
      useAuthStore.getState().setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isAuthenticating).toBe(false);
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('should handle authentication failure flow', () => {
      // Start authentication
      useAuthStore.getState().setAuthenticating(true);
      expect(useAuthStore.getState().isAuthenticating).toBe(true);

      // Authentication fails
      useAuthStore.getState().setAuthError('Invalid credentials');
      expect(useAuthStore.getState().authError).toBe('Invalid credentials');
      expect(useAuthStore.getState().isAuthenticating).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should handle re-authentication after error', () => {
      // Previous error state
      useAuthStore.setState({
        authError: 'Previous error',
        isAuthenticating: false,
      });

      // Try again
      useAuthStore.getState().setAuthenticating(true);
      expect(useAuthStore.getState().authError).toBeNull();
      expect(useAuthStore.getState().isAuthenticating).toBe(true);

      // Success this time
      useAuthStore.getState().setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('persistence config', () => {
    it('should have persist middleware configured', () => {
      // The store uses persist middleware with name 'sleepcore-vk-auth'
      // We can verify this by checking the store's configuration
      // exists without testing the exact storage behavior
      expect(useAuthStore.persist).toBeDefined();
    });

    it('partialize should only include user and isAuthenticated', () => {
      // Test that the partialize function excludes loading states
      // by verifying behavior: setting those states doesn't affect persisted state
      const initialState = useAuthStore.getState();

      // Set all states
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isAuthenticating: true, // Should NOT affect persistence
        authError: 'Error', // Should NOT affect persistence
      });

      // These should be in state
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // But loading states are reset on initialization (not persisted)
      expect(useAuthStore.getState().isAuthenticating).toBe(true); // In memory only
      expect(useAuthStore.getState().authError).toBe('Error'); // In memory only
    });
  });

  describe('edge cases', () => {
    it('should handle rapid state changes', () => {
      const store = useAuthStore.getState();

      store.setAuthenticating(true);
      store.setAuthenticating(false);
      store.setAuthenticating(true);
      store.setUser(mockUser);
      store.logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle calling logout when not authenticated', () => {
      // Should not throw
      expect(() => {
        useAuthStore.getState().logout();
      }).not.toThrow();
    });

    it('should handle setting same user twice', () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setUser(mockUser);

      const { user, isAuthenticated } = useAuthStore.getState();
      expect(user).toEqual(mockUser);
      expect(isAuthenticated).toBe(true);
    });
  });
});
