/**
 * Sync Store
 * ==========
 * Zustand store for offline-first synchronization.
 * Manages pending changes and sync status.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PendingChange {
  localId: string;
  entity: 'session' | 'profile' | 'quest' | 'badge';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  clientTimestamp: number;
  retryCount?: number;
}

interface SyncState {
  // State
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: PendingChange[];
  syncError: string | null;

  // Actions
  setOnline: (isOnline: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  addPendingChange: (change: Omit<PendingChange, 'retryCount'>) => void;
  removePendingChange: (localId: string) => void;
  updatePendingChange: (localId: string, serverId: string) => void;
  clearPendingChanges: () => void;
  incrementRetryCount: (localId: string) => void;
  setSyncError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: false,
      lastSyncTime: null,
      pendingChanges: [],
      syncError: null,

      // Set online status
      setOnline: (isOnline) => set({ isOnline }),

      // Set syncing status
      setSyncing: (isSyncing) => set({ isSyncing }),

      // Set last sync time
      setLastSyncTime: (time) => set({ lastSyncTime: time }),

      // Add pending change
      addPendingChange: (change) =>
        set((state) => ({
          pendingChanges: [
            ...state.pendingChanges,
            { ...change, retryCount: 0 },
          ],
        })),

      // Remove pending change after successful sync
      removePendingChange: (localId) =>
        set((state) => ({
          pendingChanges: state.pendingChanges.filter(
            (c) => c.localId !== localId
          ),
        })),

      // Update pending change with server ID
      updatePendingChange: (localId, _serverId) => {
        // Remove from pending after successful sync
        get().removePendingChange(localId);
      },

      // Clear all pending changes
      clearPendingChanges: () => set({ pendingChanges: [] }),

      // Increment retry count for failed sync
      incrementRetryCount: (localId) =>
        set((state) => ({
          pendingChanges: state.pendingChanges.map((c) =>
            c.localId === localId
              ? { ...c, retryCount: (c.retryCount || 0) + 1 }
              : c
          ),
        })),

      // Set sync error
      setSyncError: (error) => set({ syncError: error }),
    }),
    {
      name: 'sleepcore-sync',
      // Persist pending changes and last sync time
      partialize: (state) => ({
        pendingChanges: state.pendingChanges,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

// Initialize online status listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useSyncStore.getState().setOnline(true);
  });

  window.addEventListener('offline', () => {
    useSyncStore.getState().setOnline(false);
  });
}

export default useSyncStore;
