/**
 * useSync Hook
 * ============
 * Offline-first synchronization hook.
 * Reuses the same pattern as Telegram mini-app.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/hooks
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@/api';
import type { SyncChange, SyncResponse } from '@/api';
import { useSyncStore } from '@/store/syncStore';

const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 30_000; // 30 seconds

/**
 * useSync - Offline-first synchronization hook
 */
export const useSync = () => {
  const queryClient = useQueryClient();
  const {
    pendingChanges,
    isOnline,
    isSyncing,
    lastSyncTime,
    syncError,
    addPendingChange,
    removePendingChange,
    incrementRetryCount,
    setOnline,
    setSyncing,
    setLastSyncTime,
    setSyncError,
    clearPendingChanges,
  } = useSyncStore();

  /**
   * Push pending changes to server
   */
  const pushChanges = useCallback(async () => {
    if (pendingChanges.length === 0) return;
    if (isSyncing) return;

    setSyncing(true);

    try {
      const response = await apiClient.request<SyncResponse>('/sync/push', {
        method: 'POST',
        body: { changes: pendingChanges },
      });

      // Remove successfully processed changes
      if (response.processed > 0) {
        // Clear all pending changes that were processed
        clearPendingChanges();
        setLastSyncTime(Date.now());
      }

      // Handle failed changes
      if (response.errors && response.errors.length > 0) {
        for (const error of response.errors) {
          const change = pendingChanges.find((c) => c.id === error.id);
          if (change && change.retryCount >= MAX_RETRY_COUNT) {
            removePendingChange(error.id);
          } else if (change) {
            incrementRetryCount(error.id);
          }
        }
        setSyncError(`${response.failed} changes failed to sync`);
      } else {
        setSyncError(null);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [
    pendingChanges,
    isSyncing,
    setSyncing,
    clearPendingChanges,
    setLastSyncTime,
    removePendingChange,
    incrementRetryCount,
    setSyncError,
  ]);

  /**
   * Pull changes from server
   */
  const pullChanges = useCallback(async () => {
    if (!isOnline) return;

    try {
      // Invalidate queries to fetch fresh data
      await queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.breathing.all });
    } catch (error) {
      console.error('[Sync] Pull failed:', error);
    }
  }, [isOnline, queryClient]);

  /**
   * Full sync: push then pull
   */
  const sync = useCallback(async () => {
    if (!isOnline) return;

    await pushChanges();
    await pullChanges();
  }, [isOnline, pushChanges, pullChanges]);

  /**
   * Force push pending changes (manual sync)
   */
  const forcePush = useCallback(async () => {
    if (!isOnline) {
      setSyncError('Cannot sync while offline');
      return;
    }
    await pushChanges();
  }, [isOnline, pushChanges, setSyncError]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Auto-sync when coming online
      sync();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, sync]);

  // Periodic sync
  useEffect(() => {
    if (!isOnline) return;

    const intervalId = setInterval(() => {
      if (pendingChanges.length > 0) {
        sync();
      }
    }, SYNC_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isOnline, pendingChanges.length, sync]);

  // Sync on visibility change (tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isOnline) {
        sync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOnline, sync]);

  return {
    isOnline,
    isSyncing,
    pendingCount: pendingChanges.length,
    lastSyncTime,
    syncError,
    sync,
    forcePush,
    addPendingChange: (change: SyncChange) => addPendingChange(change),
  };
};

export default useSync;
