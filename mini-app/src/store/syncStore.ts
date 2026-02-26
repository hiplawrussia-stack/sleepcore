/**
 * Sync Store - Encrypted Offline Storage
 * =======================================
 * Zustand store for offline-first synchronization.
 * Manages pending changes and sync status.
 *
 * Security:
 * - Pending changes encrypted in localStorage (defense-in-depth)
 * - Uses AES-256-GCM via Web Crypto API
 * - P1-3: Complete storage cleanup on logout (OWASP, HIPAA)
 *
 * @see CLAUDE.md §2.2 - Encryption requirements
 * @see OWASP Session Management - localStorage cleanup
 * @module @sleepcore/mini-app/store
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createEncryptedStorage } from '@/utils/crypto';

/** Storage key for sync store - exported for cleanup utilities */
export const SYNC_STORAGE_KEY = 'sleepcore-sync-v2';

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
      name: SYNC_STORAGE_KEY,
      // Use encrypted storage for PII protection
      storage: createJSONStorage(() => createEncryptedStorage()),
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

/**
 * Clear sync storage completely from localStorage
 *
 * P1-3: OWASP requires localStorage cleanup on logout.
 * Pending changes may contain session PHI that must be cleared.
 *
 * WARNING: This will lose any unsynced data! Should only be called
 * after confirming sync is complete or user explicitly logs out.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
 */
export function clearSyncStorage(): void {
  try {
    // Reset in-memory state first
    useSyncStore.getState().clearPendingChanges();
    // Remove encrypted storage entry completely
    localStorage.removeItem(SYNC_STORAGE_KEY);
    console.log('[SyncStore] Storage cleared');
  } catch (error) {
    // Log but don't throw - cleanup should be best-effort
    console.error('[SyncStore] Failed to clear storage:', error);
  }
}

export default useSyncStore;
