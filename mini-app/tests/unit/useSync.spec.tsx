/**
 * useSync Hook Tests
 * ==================
 * Tests for offline-first synchronization hook.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5
 * - Offline resilience testing
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock modules before imports
vi.mock('@/api', () => ({
  apiClient: {
    request: vi.fn(),
  },
  queryKeys: {
    breathing: {
      all: ['breathing'],
    },
    user: {
      profile: () => ['user', 'profile'],
      quests: () => ['user', 'quests'],
      badges: () => ['user', 'badges'],
    },
  },
}));

vi.mock('@/store/syncStore', () => ({
  useSyncStore: vi.fn(() => ({
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: [],
    syncError: null,
    setSyncing: vi.fn(),
    setLastSyncTime: vi.fn(),
    removePendingChange: vi.fn(),
    incrementRetryCount: vi.fn(),
    setSyncError: vi.fn(),
  })),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: true,
  })),
}));

import { apiClient, queryKeys } from '@/api';
import { useSyncStore } from '@/store/syncStore';
import { useAuthStore } from '@/store/authStore';
import { useSync } from '@/hooks/useSync';

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

describe('useSync', () => {
  const mockPendingChange = {
    localId: 'local-123',
    entity: 'session' as const,
    action: 'create' as const,
    data: { duration: 300, pattern: '478' },
    clientTimestamp: Date.now(),
    retryCount: 0,
  };

  const mockSetSyncing = vi.fn();
  const mockSetLastSyncTime = vi.fn();
  const mockRemovePendingChange = vi.fn();
  const mockIncrementRetryCount = vi.fn();
  const mockSetSyncError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Default mock state
    vi.mocked(useSyncStore).mockReturnValue({
      isOnline: true,
      isSyncing: false,
      lastSyncTime: null,
      pendingChanges: [],
      syncError: null,
      setSyncing: mockSetSyncing,
      setLastSyncTime: mockSetLastSyncTime,
      removePendingChange: mockRemovePendingChange,
      incrementRetryCount: mockIncrementRetryCount,
      setSyncError: mockSetSyncError,
    });

    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
    } as ReturnType<typeof useAuthStore>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should return sync state from store', () => {
      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.lastSyncTime).toBeNull();
      expect(result.current.pendingCount).toBe(0);
      expect(result.current.syncError).toBeNull();
    });

    it('should have sync and forcePush functions', () => {
      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.sync).toBe('function');
      expect(typeof result.current.forcePush).toBe('function');
    });
  });

  describe('sync', () => {
    it('should push and pull changes successfully', async () => {
      vi.mocked(useSyncStore).mockReturnValue({
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: [mockPendingChange],
        syncError: null,
        setSyncing: mockSetSyncing,
        setLastSyncTime: mockSetLastSyncTime,
        removePendingChange: mockRemovePendingChange,
        incrementRetryCount: mockIncrementRetryCount,
        setSyncError: mockSetSyncError,
      });

      const serverTime = Date.now();

      vi.mocked(apiClient.request)
        .mockResolvedValueOnce({
          results: [{ localId: 'local-123', status: 'synced' }],
          serverTime,
        })
        .mockResolvedValueOnce({
          changes: [],
          serverTime,
        });

      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      vi.clearAllMocks(); // Clear any calls from mount effects

      await act(async () => {
        await result.current.sync();
      });

      expect(mockSetSyncing).toHaveBeenCalledWith(true);
      expect(mockSetSyncing).toHaveBeenLastCalledWith(false);
    });

    it('should not sync when offline', async () => {
      vi.mocked(useSyncStore).mockReturnValue({
        isOnline: false,
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: [mockPendingChange],
        syncError: null,
        setSyncing: mockSetSyncing,
        setLastSyncTime: mockSetLastSyncTime,
        removePendingChange: mockRemovePendingChange,
        incrementRetryCount: mockIncrementRetryCount,
        setSyncError: mockSetSyncError,
      });

      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sync();
      });

      expect(mockSetSyncing).not.toHaveBeenCalled();
      expect(apiClient.request).not.toHaveBeenCalled();
    });

    it('should not sync when not authenticated', async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
      } as ReturnType<typeof useAuthStore>);

      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sync();
      });

      expect(mockSetSyncing).not.toHaveBeenCalled();
      expect(apiClient.request).not.toHaveBeenCalled();
    });

    it('should not sync when already syncing', async () => {
      vi.mocked(useSyncStore).mockReturnValue({
        isOnline: true,
        isSyncing: true, // Already syncing
        lastSyncTime: null,
        pendingChanges: [mockPendingChange],
        syncError: null,
        setSyncing: mockSetSyncing,
        setLastSyncTime: mockSetLastSyncTime,
        removePendingChange: mockRemovePendingChange,
        incrementRetryCount: mockIncrementRetryCount,
        setSyncError: mockSetSyncError,
      });

      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sync();
      });

      expect(apiClient.request).not.toHaveBeenCalled();
    });

    it('should handle push errors', async () => {
      vi.mocked(useSyncStore).mockReturnValue({
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: [mockPendingChange],
        syncError: null,
        setSyncing: mockSetSyncing,
        setLastSyncTime: mockSetLastSyncTime,
        removePendingChange: mockRemovePendingChange,
        incrementRetryCount: mockIncrementRetryCount,
        setSyncError: mockSetSyncError,
      });

      vi.mocked(apiClient.request).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sync();
      });

      expect(mockSetSyncError).toHaveBeenCalledWith('Network error');
    });

    it('should remove synced changes and increment retry for failed', async () => {
      vi.mocked(useSyncStore).mockReturnValue({
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: [
          mockPendingChange,
          { ...mockPendingChange, localId: 'local-456' },
        ],
        syncError: null,
        setSyncing: mockSetSyncing,
        setLastSyncTime: mockSetLastSyncTime,
        removePendingChange: mockRemovePendingChange,
        incrementRetryCount: mockIncrementRetryCount,
        setSyncError: mockSetSyncError,
      });

      const serverTime = Date.now();

      vi.mocked(apiClient.request)
        .mockResolvedValueOnce({
          results: [
            { localId: 'local-123', status: 'synced' },
            { localId: 'local-456', status: 'failed' },
          ],
          serverTime,
        })
        .mockResolvedValueOnce({
          changes: [],
          serverTime,
        });

      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sync();
      });

      expect(mockRemovePendingChange).toHaveBeenCalledWith('local-123');
      expect(mockIncrementRetryCount).toHaveBeenCalledWith('local-456');
    });

    it('should skip changes exceeding retry count', async () => {
      const expiredChange = { ...mockPendingChange, retryCount: 3 }; // MAX_RETRY_COUNT = 3

      vi.mocked(useSyncStore).mockReturnValue({
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: [expiredChange],
        syncError: null,
        setSyncing: mockSetSyncing,
        setLastSyncTime: mockSetLastSyncTime,
        removePendingChange: mockRemovePendingChange,
        incrementRetryCount: mockIncrementRetryCount,
        setSyncError: mockSetSyncError,
      });

      vi.mocked(apiClient.request).mockResolvedValueOnce({
        changes: [],
        serverTime: Date.now(),
      });

      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      vi.clearAllMocks(); // Clear any calls from mount effects

      await act(async () => {
        await result.current.sync();
      });

      // Only pull should happen, no push because all changes exceeded retry
      // Verify the request was made to pull endpoint
      const calls = vi.mocked(apiClient.request).mock.calls;
      const pullCall = calls.find(call => String(call[0]).includes('/sync/changes'));
      expect(pullCall).toBeDefined();
    });
  });

  describe('pullChanges', () => {
    it('should invalidate queries for changed entities', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
        },
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      vi.mocked(useSyncStore).mockReturnValue({
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: [],
        syncError: null,
        setSyncing: mockSetSyncing,
        setLastSyncTime: mockSetLastSyncTime,
        removePendingChange: mockRemovePendingChange,
        incrementRetryCount: mockIncrementRetryCount,
        setSyncError: mockSetSyncError,
      });

      const serverTime = Date.now();

      vi.mocked(apiClient.request).mockResolvedValueOnce({
        changes: [
          { entity: 'session', action: 'create', data: {} },
          { entity: 'profile', action: 'update', data: {} },
          { entity: 'quest', action: 'complete', data: {} },
          { entity: 'badge', action: 'earn', data: {} },
        ],
        serverTime,
      });

      const { result } = renderHook(() => useSync(), {
        wrapper,
      });

      await act(async () => {
        await result.current.sync();
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.breathing.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.user.profile() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.user.quests() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.user.badges() });
    });

    it('should handle pull errors', async () => {
      vi.mocked(useSyncStore).mockReturnValue({
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: [],
        syncError: null,
        setSyncing: mockSetSyncing,
        setLastSyncTime: mockSetLastSyncTime,
        removePendingChange: mockRemovePendingChange,
        incrementRetryCount: mockIncrementRetryCount,
        setSyncError: mockSetSyncError,
      });

      vi.mocked(apiClient.request).mockRejectedValueOnce(new Error('Pull failed'));

      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sync();
      });

      expect(mockSetSyncError).toHaveBeenCalledWith('Pull failed');
    });
  });

  describe('forcePush', () => {
    it('should push without pulling', async () => {
      vi.mocked(useSyncStore).mockReturnValue({
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: [mockPendingChange],
        syncError: null,
        setSyncing: mockSetSyncing,
        setLastSyncTime: mockSetLastSyncTime,
        removePendingChange: mockRemovePendingChange,
        incrementRetryCount: mockIncrementRetryCount,
        setSyncError: mockSetSyncError,
      });

      vi.mocked(apiClient.request).mockResolvedValueOnce({
        results: [{ localId: 'local-123', status: 'synced' }],
        serverTime: Date.now(),
      });

      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      vi.clearAllMocks(); // Clear any calls from mount effects

      await act(async () => {
        await result.current.forcePush();
      });

      // Should call push endpoint
      expect(apiClient.request).toHaveBeenCalledWith(
        '/sync/push',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should not force push when offline', async () => {
      vi.mocked(useSyncStore).mockReturnValue({
        isOnline: false,
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: [mockPendingChange],
        syncError: null,
        setSyncing: mockSetSyncing,
        setLastSyncTime: mockSetLastSyncTime,
        removePendingChange: mockRemovePendingChange,
        incrementRetryCount: mockIncrementRetryCount,
        setSyncError: mockSetSyncError,
      });

      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.forcePush();
      });

      expect(apiClient.request).not.toHaveBeenCalled();
    });
  });

  describe('pendingCount', () => {
    it('should reflect number of pending changes', () => {
      vi.mocked(useSyncStore).mockReturnValue({
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: [
          mockPendingChange,
          { ...mockPendingChange, localId: 'local-456' },
          { ...mockPendingChange, localId: 'local-789' },
        ],
        syncError: null,
        setSyncing: mockSetSyncing,
        setLastSyncTime: mockSetLastSyncTime,
        removePendingChange: mockRemovePendingChange,
        incrementRetryCount: mockIncrementRetryCount,
        setSyncError: mockSetSyncError,
      });

      const { result } = renderHook(() => useSync(), {
        wrapper: createWrapper(),
      });

      expect(result.current.pendingCount).toBe(3);
    });
  });
});
