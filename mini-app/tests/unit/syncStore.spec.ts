/**
 * Sync Store Tests
 * ================
 * Tests for Zustand sync state management (offline-first).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSyncStore } from '../../src/store/syncStore';

describe('Sync Store', () => {
  const mockChange = {
    localId: 'local-123',
    entity: 'session' as const,
    action: 'create' as const,
    data: { duration: 300, pattern: '478' },
    clientTimestamp: Date.now(),
  };

  beforeEach(() => {
    // Reset store state before each test
    useSyncStore.setState({
      isOnline: true,
      isSyncing: false,
      lastSyncTime: null,
      pendingChanges: [],
      syncError: null,
    });
  });

  describe('initial state', () => {
    it('should be online by default', () => {
      const { isOnline } = useSyncStore.getState();
      expect(isOnline).toBe(true);
    });

    it('should not be syncing', () => {
      const { isSyncing } = useSyncStore.getState();
      expect(isSyncing).toBe(false);
    });

    it('should have null lastSyncTime', () => {
      const { lastSyncTime } = useSyncStore.getState();
      expect(lastSyncTime).toBeNull();
    });

    it('should have empty pendingChanges', () => {
      const { pendingChanges } = useSyncStore.getState();
      expect(pendingChanges).toEqual([]);
    });

    it('should have null syncError', () => {
      const { syncError } = useSyncStore.getState();
      expect(syncError).toBeNull();
    });
  });

  describe('setOnline', () => {
    it('should set online status to false', () => {
      const { setOnline } = useSyncStore.getState();

      setOnline(false);

      expect(useSyncStore.getState().isOnline).toBe(false);
    });

    it('should set online status to true', () => {
      useSyncStore.setState({ isOnline: false });
      const { setOnline } = useSyncStore.getState();

      setOnline(true);

      expect(useSyncStore.getState().isOnline).toBe(true);
    });
  });

  describe('setSyncing', () => {
    it('should set syncing to true', () => {
      const { setSyncing } = useSyncStore.getState();

      setSyncing(true);

      expect(useSyncStore.getState().isSyncing).toBe(true);
    });

    it('should set syncing to false', () => {
      useSyncStore.setState({ isSyncing: true });
      const { setSyncing } = useSyncStore.getState();

      setSyncing(false);

      expect(useSyncStore.getState().isSyncing).toBe(false);
    });
  });

  describe('setLastSyncTime', () => {
    it('should set last sync time', () => {
      const { setLastSyncTime } = useSyncStore.getState();
      const time = Date.now();

      setLastSyncTime(time);

      expect(useSyncStore.getState().lastSyncTime).toBe(time);
    });
  });

  describe('addPendingChange', () => {
    it('should add a pending change', () => {
      const { addPendingChange } = useSyncStore.getState();

      addPendingChange(mockChange);

      const { pendingChanges } = useSyncStore.getState();
      expect(pendingChanges).toHaveLength(1);
      expect(pendingChanges[0].localId).toBe('local-123');
      expect(pendingChanges[0].entity).toBe('session');
      expect(pendingChanges[0].action).toBe('create');
      expect(pendingChanges[0].retryCount).toBe(0);
    });

    it('should add multiple pending changes', () => {
      const { addPendingChange } = useSyncStore.getState();

      addPendingChange(mockChange);
      addPendingChange({
        ...mockChange,
        localId: 'local-456',
        entity: 'profile',
        action: 'update',
      });

      const { pendingChanges } = useSyncStore.getState();
      expect(pendingChanges).toHaveLength(2);
    });
  });

  describe('removePendingChange', () => {
    it('should remove a pending change by localId', () => {
      const { addPendingChange, removePendingChange } = useSyncStore.getState();

      addPendingChange(mockChange);
      expect(useSyncStore.getState().pendingChanges).toHaveLength(1);

      removePendingChange('local-123');

      expect(useSyncStore.getState().pendingChanges).toHaveLength(0);
    });

    it('should not affect other changes', () => {
      const { addPendingChange, removePendingChange } = useSyncStore.getState();

      addPendingChange(mockChange);
      addPendingChange({ ...mockChange, localId: 'local-456' });

      removePendingChange('local-123');

      const { pendingChanges } = useSyncStore.getState();
      expect(pendingChanges).toHaveLength(1);
      expect(pendingChanges[0].localId).toBe('local-456');
    });

    it('should do nothing if localId not found', () => {
      const { addPendingChange, removePendingChange } = useSyncStore.getState();

      addPendingChange(mockChange);
      removePendingChange('non-existent');

      expect(useSyncStore.getState().pendingChanges).toHaveLength(1);
    });
  });

  describe('updatePendingChange', () => {
    it('should remove change after successful sync', () => {
      const { addPendingChange, updatePendingChange } = useSyncStore.getState();

      addPendingChange(mockChange);
      expect(useSyncStore.getState().pendingChanges).toHaveLength(1);

      updatePendingChange('local-123', 'server-789');

      expect(useSyncStore.getState().pendingChanges).toHaveLength(0);
    });
  });

  describe('clearPendingChanges', () => {
    it('should clear all pending changes', () => {
      const { addPendingChange, clearPendingChanges } = useSyncStore.getState();

      addPendingChange(mockChange);
      addPendingChange({ ...mockChange, localId: 'local-456' });
      addPendingChange({ ...mockChange, localId: 'local-789' });
      expect(useSyncStore.getState().pendingChanges).toHaveLength(3);

      clearPendingChanges();

      expect(useSyncStore.getState().pendingChanges).toHaveLength(0);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', () => {
      const { addPendingChange, incrementRetryCount } = useSyncStore.getState();

      addPendingChange(mockChange);

      incrementRetryCount('local-123');

      const { pendingChanges } = useSyncStore.getState();
      expect(pendingChanges[0].retryCount).toBe(1);
    });

    it('should increment retry count multiple times', () => {
      const { addPendingChange, incrementRetryCount } = useSyncStore.getState();

      addPendingChange(mockChange);

      incrementRetryCount('local-123');
      incrementRetryCount('local-123');
      incrementRetryCount('local-123');

      const { pendingChanges } = useSyncStore.getState();
      expect(pendingChanges[0].retryCount).toBe(3);
    });

    it('should not affect other changes', () => {
      const { addPendingChange, incrementRetryCount } = useSyncStore.getState();

      addPendingChange(mockChange);
      addPendingChange({ ...mockChange, localId: 'local-456' });

      incrementRetryCount('local-123');

      const { pendingChanges } = useSyncStore.getState();
      expect(pendingChanges[0].retryCount).toBe(1);
      expect(pendingChanges[1].retryCount).toBe(0);
    });
  });

  describe('setSyncError', () => {
    it('should set sync error', () => {
      const { setSyncError } = useSyncStore.getState();

      setSyncError('Network error');

      expect(useSyncStore.getState().syncError).toBe('Network error');
    });

    it('should clear sync error', () => {
      useSyncStore.setState({ syncError: 'Previous error' });
      const { setSyncError } = useSyncStore.getState();

      setSyncError(null);

      expect(useSyncStore.getState().syncError).toBeNull();
    });
  });

  describe('sync workflow', () => {
    it('should handle complete sync flow', () => {
      const {
        addPendingChange,
        setSyncing,
        setLastSyncTime,
        removePendingChange,
      } = useSyncStore.getState();

      // Add pending change
      addPendingChange(mockChange);
      expect(useSyncStore.getState().pendingChanges).toHaveLength(1);

      // Start syncing
      setSyncing(true);
      expect(useSyncStore.getState().isSyncing).toBe(true);

      // Complete sync
      removePendingChange('local-123');
      const syncTime = Date.now();
      setLastSyncTime(syncTime);
      setSyncing(false);

      const state = useSyncStore.getState();
      expect(state.pendingChanges).toHaveLength(0);
      expect(state.isSyncing).toBe(false);
      expect(state.lastSyncTime).toBe(syncTime);
    });

    it('should handle failed sync with retry', () => {
      const {
        addPendingChange,
        setSyncing,
        setSyncError,
        incrementRetryCount,
      } = useSyncStore.getState();

      // Add pending change
      addPendingChange(mockChange);

      // Start syncing
      setSyncing(true);

      // Sync fails
      setSyncError('Connection timeout');
      incrementRetryCount('local-123');
      setSyncing(false);

      const state = useSyncStore.getState();
      expect(state.pendingChanges).toHaveLength(1);
      expect(state.pendingChanges[0].retryCount).toBe(1);
      expect(state.syncError).toBe('Connection timeout');
      expect(state.isSyncing).toBe(false);
    });

    it('should handle offline to online transition', () => {
      const { setOnline, addPendingChange } = useSyncStore.getState();

      // Go offline
      setOnline(false);
      expect(useSyncStore.getState().isOnline).toBe(false);

      // Queue changes while offline
      addPendingChange(mockChange);
      addPendingChange({ ...mockChange, localId: 'local-456' });
      expect(useSyncStore.getState().pendingChanges).toHaveLength(2);

      // Come back online
      setOnline(true);
      expect(useSyncStore.getState().isOnline).toBe(true);
      expect(useSyncStore.getState().pendingChanges).toHaveLength(2);
    });
  });
});
