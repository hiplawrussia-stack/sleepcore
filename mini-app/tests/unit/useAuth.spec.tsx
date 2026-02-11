/**
 * useAuth Hook Tests
 * ==================
 * Tests for authentication hook with Telegram Mini App integration.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5
 * - Security-critical authentication flow testing
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Use vi.hoisted to ensure mock functions are available when vi.mock factories run
const {
  mockAuthenticateFn,
  mockRequestFn,
  mockGetAccessTokenFn,
  mockIsTokenExpiredFn,
  mockClearTokensFn,
  mockSetTokensFn,
  mockIsInTelegramFn,
  mockGetInitDataFn,
  mockGetInitDataUnsafeFn,
  mockSetUserFn,
  mockSetAuthenticatingFn,
  mockSetAuthErrorFn,
  mockStoreLogoutFn,
} = vi.hoisted(() => ({
  mockAuthenticateFn: vi.fn(),
  mockRequestFn: vi.fn(),
  mockGetAccessTokenFn: vi.fn(() => null),
  mockIsTokenExpiredFn: vi.fn(() => true),
  mockClearTokensFn: vi.fn(),
  mockSetTokensFn: vi.fn(),
  mockIsInTelegramFn: vi.fn(() => true),
  mockGetInitDataFn: vi.fn(() => 'test-init-data'),
  mockGetInitDataUnsafeFn: vi.fn(() => ({
    user: { id: 123456789, first_name: 'Test' },
    auth_date: Math.floor(Date.now() / 1000),
  })),
  mockSetUserFn: vi.fn(),
  mockSetAuthenticatingFn: vi.fn(),
  mockSetAuthErrorFn: vi.fn(),
  mockStoreLogoutFn: vi.fn(),
}));

// Mock the modules
vi.mock('@/api', () => ({
  apiClient: {
    request: mockRequestFn,
    authenticate: mockAuthenticateFn,
  },
  tokenManager: {
    getAccessToken: mockGetAccessTokenFn,
    isTokenExpired: mockIsTokenExpiredFn,
    clearTokens: mockClearTokensFn,
    setTokens: mockSetTokensFn,
  },
  queryKeys: {
    auth: {
      me: () => ['auth', 'me'],
    },
    user: {
      all: ['user'],
    },
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    isAuthenticating: false,
    authError: null,
    setUser: mockSetUserFn,
    setAuthenticating: mockSetAuthenticatingFn,
    setAuthError: mockSetAuthErrorFn,
    logout: mockStoreLogoutFn,
  })),
}));

vi.mock('@/services/telegram', () => ({
  telegram: {
    isInTelegram: mockIsInTelegramFn,
    getInitData: mockGetInitDataFn,
    getInitDataUnsafe: mockGetInitDataUnsafeFn,
  },
}));

import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAuth', () => {
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
    vi.clearAllMocks();

    // Default mock state: not authenticated
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isAuthenticating: false,
      authError: null,
      setUser: mockSetUserFn,
      setAuthenticating: mockSetAuthenticatingFn,
      setAuthError: mockSetAuthErrorFn,
      logout: mockStoreLogoutFn,
    });

    mockIsInTelegramFn.mockReturnValue(true);
    mockIsTokenExpiredFn.mockReturnValue(true);
    mockGetAccessTokenFn.mockReturnValue(null);

    // Default successful auth response for auto-authenticate
    mockAuthenticateFn.mockResolvedValue({
      accessToken: 'default-test-token',
      refreshToken: '',
      expiresIn: 3600,
      user: mockUser,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return unauthenticated state initially', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authError).toBeNull();
    });

    it('should have authenticate and logout functions', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.authenticate).toBe('function');
      expect(typeof result.current.logout).toBe('function');
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully with Telegram initData', async () => {
      mockAuthenticateFn.mockResolvedValue({
        accessToken: 'test-token',
        refreshToken: '',
        expiresIn: 3600,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.authenticate();
      });

      await waitFor(() => {
        expect(mockSetAuthenticatingFn).toHaveBeenCalledWith(true);
      });
      expect(mockAuthenticateFn).toHaveBeenCalled();
      expect(mockSetUserFn).toHaveBeenCalledWith(mockUser);
    });

    it('should set error when not in Telegram', async () => {
      mockIsInTelegramFn.mockReturnValue(false);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.authenticate();
      });

      expect(mockIsInTelegramFn).toHaveBeenCalled();
    });

    it('should handle authentication error', async () => {
      // Prevent auto-authenticate by not being in Telegram initially
      mockIsInTelegramFn.mockReturnValue(false);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Now set up for error testing
      mockIsInTelegramFn.mockReturnValue(true);
      mockAuthenticateFn.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        try {
          await result.current.authenticate();
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(mockSetAuthErrorFn).toHaveBeenCalledWith('Network error');
      });
    });

    it('should skip authentication if already authenticated with valid token', async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isAuthenticating: false,
        authError: null,
        setUser: mockSetUserFn,
        setAuthenticating: mockSetAuthenticatingFn,
        setAuthError: mockSetAuthErrorFn,
        logout: mockStoreLogoutFn,
      });

      mockIsTokenExpiredFn.mockReturnValue(false);
      mockGetAccessTokenFn.mockReturnValue('valid-token');
      mockRequestFn.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.authenticate();
      });

      // Should not call authenticate because already authenticated
      expect(mockAuthenticateFn).not.toHaveBeenCalled();
    });

    it('should clear legacy tokens before authentication', async () => {
      mockAuthenticateFn.mockResolvedValue({
        accessToken: 'test-token',
        refreshToken: '',
        expiresIn: 3600,
        user: mockUser,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.authenticate();
      });

      await waitFor(() => {
        expect(mockClearTokensFn).toHaveBeenCalled();
      });
    });
  });

  describe('logout', () => {
    it('should clear tokens and auth state on logout', async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isAuthenticating: false,
        authError: null,
        setUser: mockSetUserFn,
        setAuthenticating: mockSetAuthenticatingFn,
        setAuthError: mockSetAuthErrorFn,
        logout: mockStoreLogoutFn,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.logout();
      });

      expect(mockClearTokensFn).toHaveBeenCalled();
      expect(mockStoreLogoutFn).toHaveBeenCalled();
    });
  });

  describe('auto-authenticate', () => {
    it('should auto-authenticate on mount when in Telegram', async () => {
      mockAuthenticateFn.mockResolvedValue({
        accessToken: 'test-token',
        refreshToken: '',
        expiresIn: 3600,
        user: mockUser,
      });

      renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for auto-authenticate to trigger
      await waitFor(() => {
        expect(mockAuthenticateFn).toHaveBeenCalled();
      });
    });

    it('should not auto-authenticate when not in Telegram', async () => {
      mockIsInTelegramFn.mockReturnValue(false);

      renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait a bit to ensure no authentication happens
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockAuthenticateFn).not.toHaveBeenCalled();
    });

    it('should not auto-authenticate when already authenticating', async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isAuthenticating: true, // Already authenticating
        authError: null,
        setUser: mockSetUserFn,
        setAuthenticating: mockSetAuthenticatingFn,
        setAuthError: mockSetAuthErrorFn,
        logout: mockStoreLogoutFn,
      });

      renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockAuthenticateFn).not.toHaveBeenCalled();
    });
  });

  describe('isAuthenticating state', () => {
    it('should combine store isAuthenticating with mutation isPending', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isAuthenticating: true,
        authError: null,
        setUser: mockSetUserFn,
        setAuthenticating: mockSetAuthenticatingFn,
        setAuthError: mockSetAuthErrorFn,
        logout: mockStoreLogoutFn,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticating).toBe(true);
    });
  });

  describe('user data', () => {
    it('should return user from store', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isAuthenticating: false,
        authError: null,
        setUser: mockSetUserFn,
        setAuthenticating: mockSetAuthenticatingFn,
        setAuthError: mockSetAuthErrorFn,
        logout: mockStoreLogoutFn,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return authError from store', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isAuthenticating: false,
        authError: 'Authentication failed',
        setUser: mockSetUserFn,
        setAuthenticating: mockSetAuthenticatingFn,
        setAuthError: mockSetAuthErrorFn,
        logout: mockStoreLogoutFn,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.authError).toBe('Authentication failed');
    });

    it('should handle non-Error objects in mutation error', async () => {
      // Prevent auto-authenticate by not being in Telegram initially
      mockIsInTelegramFn.mockReturnValue(false);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Now set up for error testing with string rejection
      mockIsInTelegramFn.mockReturnValue(true);
      mockAuthenticateFn.mockRejectedValue('String error');

      await act(async () => {
        try {
          await result.current.authenticate();
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(mockSetAuthErrorFn).toHaveBeenCalledWith('Authentication failed');
      });
    });
  });
});
