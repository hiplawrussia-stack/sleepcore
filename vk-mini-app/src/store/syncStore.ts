/**
 * Sync Store
 * ==========
 * Zustand store for offline-first sync state.
 * Tracks pending changes and sync status.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app/store
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SyncChange } from '@/api';

/**
 * Pending change with metadata
 */
interface PendingChange extends SyncChange {
  retryCount: number;
  createdAt: number;
}

/**
 * Sync store state
 */
interface SyncState {
  pendingChanges: PendingChange[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;

  // Actions
  addPendingChange: (change: SyncChange) => void;
  removePendingChange: (id: string) => void;
  incrementRetryCount: (id: string) => void;
  setOnline: (isOnline: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  setSyncError: (error: string | null) => void;
  clearPendingChanges: () => void;
}

/**
 * Sync store
 */
export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      pendingChanges: [],
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: false,
      lastSyncTime: null,
      syncError: null,

      addPendingChange: (change) =>
        set((state) => ({
          pendingChanges: [
            ...state.pendingChanges,
            {
              ...change,
              retryCount: 0,
              createdAt: Date.now(),
            },
          ],
        })),

      removePendingChange: (id) =>
        set((state) => ({
          pendingChanges: state.pendingChanges.filter((c) => c.id !== id),
        })),

      incrementRetryCount: (id) =>
        set((state) => ({
          pendingChanges: state.pendingChanges.map((c) =>
            c.id === id ? { ...c, retryCount: c.retryCount + 1 } : c
          ),
        })),

      setOnline: (isOnline) => set({ isOnline }),

      setSyncing: (isSyncing) => set({ isSyncing }),

      setLastSyncTime: (time) => set({ lastSyncTime: time, syncError: null }),

      setSyncError: (error) => set({ syncError: error, isSyncing: false }),

      clearPendingChanges: () => set({ pendingChanges: [] }),
    }),
    {
      name: 'sleepcore-vk-sync',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist pending changes and last sync time
        pendingChanges: state.pendingChanges,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

export default useSyncStore;
