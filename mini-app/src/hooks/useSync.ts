/**
 * useSync Hook
 * ============
 * Offline-first synchronization hook.
 * Manages pending changes and syncs with server when online.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/api';
import type { SyncPushResponse, SyncChangesResponse } from '@/api';
import { useSyncStore } from '@/store/syncStore';
import { useAuthStore } from '@/store/authStore';

interface UseSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  syncError: string | null;
  sync: () => Promise<void>;
  forcePush: () => Promise<void>;
}

const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

export const useSync = (): UseSyncReturn => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const {
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingChanges,
    syncError,
    setSyncing,
    setLastSyncTime,
    removePendingChange,
    incrementRetryCount,
    setSyncError,
  } = useSyncStore();

  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Push pending changes to server
  const pushChanges = useCallback(async (): Promise<boolean> => {
    const changesToPush = pendingChanges.filter(
      (c) => (c.retryCount || 0) < MAX_RETRY_COUNT
    );

    if (changesToPush.length === 0) {
      return true;
    }

    try {
      const response = await apiClient.request<SyncPushResponse>('/sync/push', {
        method: 'POST',
        body: JSON.stringify({
          changes: changesToPush,
          lastSyncTime: lastSyncTime || 0,
        }),
      });

      // Process results
      for (const result of response.results) {
        if (result.status === 'synced') {
          removePendingChange(result.localId);
        } else {
          incrementRetryCount(result.localId);
        }
      }

      setLastSyncTime(response.serverTime);
      return true;
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Push failed');
      return false;
    }
  }, [pendingChanges, lastSyncTime, removePendingChange, incrementRetryCount, setLastSyncTime, setSyncError]);

  // Pull changes from server
  const pullChanges = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.request<SyncChangesResponse>(
        `/sync/changes?since=${lastSyncTime || 0}`
      );

      if (response.changes.length > 0) {
        // Invalidate queries for changed entities
        const entities = new Set(response.changes.map((c) => c.entity));

        if (entities.has('session')) {
          queryClient.invalidateQueries({ queryKey: queryKeys.breathing.all });
        }
        if (entities.has('profile')) {
          queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
        }
        if (entities.has('quest')) {
          queryClient.invalidateQueries({ queryKey: queryKeys.user.quests() });
        }
        if (entities.has('badge')) {
          queryClient.invalidateQueries({ queryKey: queryKeys.user.badges() });
        }
      }

      setLastSyncTime(response.serverTime);
      return true;
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Pull failed');
      return false;
    }
  }, [lastSyncTime, queryClient, setLastSyncTime, setSyncError]);

  // Full sync: push then pull
  const sync = useCallback(async () => {
    if (!isAuthenticated || !isOnline || isSyncing) {
      return;
    }

    setSyncing(true);
    setSyncError(null);

    try {
      // Push first
      await pushChanges();
      // Then pull
      await pullChanges();
    } finally {
      setSyncing(false);
    }
  }, [isAuthenticated, isOnline, isSyncing, pushChanges, pullChanges, setSyncing, setSyncError]);

  // Force push pending changes
  const forcePush = useCallback(async () => {
    if (!isOnline || isSyncing) {
      return;
    }

    setSyncing(true);
    setSyncError(null);

    try {
      await pushChanges();
    } finally {
      setSyncing(false);
    }
  }, [isOnline, isSyncing, pushChanges, setSyncing, setSyncError]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && isAuthenticated && pendingChanges.length > 0) {
      sync();
    }
  }, [isOnline, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic sync
  useEffect(() => {
    if (isOnline && isAuthenticated) {
      syncIntervalRef.current = setInterval(() => {
        sync();
      }, SYNC_INTERVAL);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync on visibility change (when user returns to app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isOnline && isAuthenticated) {
        sync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOnline, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isOnline,
    isSyncing,
    pendingCount: pendingChanges.length,
    lastSyncTime,
    syncError,
    sync,
    forcePush,
  };
};

export default useSync;
