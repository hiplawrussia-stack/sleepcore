/**
 * Auth Store Tests
 * ================
 * Tests for Zustand auth state management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../src/store/authStore';

describe('Auth Store', () => {
  const mockUser = {
    id: 'user-123',
    telegramId: 123456789,
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    evolutionStage: 'owlet',
    xp: 100,
    level: 2,
  };

  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isAuthenticating: false,
      authError: null,
    });
  });

  describe('initial state', () => {
    it('should have null user', () => {
      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });

    it('should not be authenticated', () => {
      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
    });

    it('should not be authenticating', () => {
      const { isAuthenticating } = useAuthStore.getState();
      expect(isAuthenticating).toBe(false);
    });

    it('should have no auth error', () => {
      const { authError } = useAuthStore.getState();
      expect(authError).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user and mark as authenticated', () => {
      const { setUser } = useAuthStore.getState();

      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isAuthenticating).toBe(false);
      expect(state.authError).toBeNull();
    });

    it('should clear auth state when setting null user', () => {
      const { setUser } = useAuthStore.getState();

      // First set a user
      setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then set null
      setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should clear previous error when setting user', () => {
      const { setAuthError, setUser } = useAuthStore.getState();

      // Set an error first
      setAuthError('Some error');
      expect(useAuthStore.getState().authError).toBe('Some error');

      // Set user should clear error
      setUser(mockUser);
      expect(useAuthStore.getState().authError).toBeNull();
    });
  });

  describe('setAuthenticating', () => {
    it('should set authenticating to true', () => {
      const { setAuthenticating } = useAuthStore.getState();

      setAuthenticating(true);

      expect(useAuthStore.getState().isAuthenticating).toBe(true);
    });

    it('should set authenticating to false', () => {
      const { setAuthenticating } = useAuthStore.getState();

      setAuthenticating(true);
      setAuthenticating(false);

      expect(useAuthStore.getState().isAuthenticating).toBe(false);
    });

    it('should clear error when starting authentication', () => {
      const { setAuthError, setAuthenticating } = useAuthStore.getState();

      setAuthError('Previous error');
      setAuthenticating(true);

      expect(useAuthStore.getState().authError).toBeNull();
    });
  });

  describe('setAuthError', () => {
    it('should set auth error', () => {
      const { setAuthError } = useAuthStore.getState();

      setAuthError('Authentication failed');

      const state = useAuthStore.getState();
      expect(state.authError).toBe('Authentication failed');
      expect(state.isAuthenticating).toBe(false);
    });

    it('should stop authenticating when error is set', () => {
      const { setAuthenticating, setAuthError } = useAuthStore.getState();

      setAuthenticating(true);
      expect(useAuthStore.getState().isAuthenticating).toBe(true);

      setAuthError('Failed');
      expect(useAuthStore.getState().isAuthenticating).toBe(false);
    });

    it('should clear error when set to null', () => {
      const { setAuthError } = useAuthStore.getState();

      setAuthError('Error');
      expect(useAuthStore.getState().authError).toBe('Error');

      setAuthError(null);
      expect(useAuthStore.getState().authError).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear all auth state', () => {
      const { setUser, setAuthenticating, logout } = useAuthStore.getState();

      // Set up authenticated state
      setUser(mockUser);
      setAuthenticating(true);

      // Logout
      logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isAuthenticating).toBe(false);
      expect(state.authError).toBeNull();
    });

    it('should work even if already logged out', () => {
      const { logout } = useAuthStore.getState();

      // Should not throw
      expect(() => logout()).not.toThrow();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('should handle login flow', () => {
      const { setAuthenticating, setUser } = useAuthStore.getState();

      // Start authenticating
      setAuthenticating(true);
      expect(useAuthStore.getState().isAuthenticating).toBe(true);

      // Complete authentication
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.isAuthenticating).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
    });

    it('should handle failed login flow', () => {
      const { setAuthenticating, setAuthError } = useAuthStore.getState();

      // Start authenticating
      setAuthenticating(true);
      expect(useAuthStore.getState().isAuthenticating).toBe(true);

      // Fail authentication
      setAuthError('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.isAuthenticating).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.authError).toBe('Invalid credentials');
    });

    it('should handle re-authentication after logout', () => {
      const { setUser, logout, setAuthenticating } = useAuthStore.getState();

      // First login
      setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Logout
      logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Re-authenticate
      setAuthenticating(true);
      setUser({ ...mockUser, xp: 200 });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.xp).toBe(200);
    });
  });
});
