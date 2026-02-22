/**
 * Pending Sync DAO
 * =================
 * Data Access Object for offline sync queue operations.
 *
 * Research (February 2026):
 * - Use Flow for reactive UI updates
 * - Batch operations for efficiency
 * - FIFO processing (oldest first)
 *
 * Sources:
 * - developer.android.com/training/data-storage/room/accessing-data
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.data.local.sync

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingSyncDao {

    // ==================== INSERT ====================

    /**
     * Insert a new pending sync item
     * Uses REPLACE to handle duplicate session IDs (idempotency)
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: PendingSyncEntity)

    /**
     * Insert multiple pending sync items
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entities: List<PendingSyncEntity>)

    // ==================== QUERY ====================

    /**
     * Get all pending items (for sync processing)
     * Ordered by creation time (FIFO - oldest first)
     */
    @Query("SELECT * FROM pending_sync WHERE status = 'PENDING' ORDER BY created_at ASC")
    suspend fun getPendingItems(): List<PendingSyncEntity>

    /**
     * Get pending items as Flow (for UI observation)
     */
    @Query("SELECT * FROM pending_sync WHERE status IN ('PENDING', 'SYNCING') ORDER BY created_at ASC")
    fun observePendingItems(): Flow<List<PendingSyncEntity>>

    /**
     * Get count of pending items (for UI badge)
     */
    @Query("SELECT COUNT(*) FROM pending_sync WHERE status IN ('PENDING', 'SYNCING')")
    fun observePendingCount(): Flow<Int>

    /**
     * Get count of pending items (non-reactive)
     */
    @Query("SELECT COUNT(*) FROM pending_sync WHERE status IN ('PENDING', 'SYNCING')")
    suspend fun getPendingCount(): Int

    /**
     * Get failed items (for user review/retry)
     */
    @Query("SELECT * FROM pending_sync WHERE status = 'FAILED' ORDER BY created_at DESC")
    suspend fun getFailedItems(): List<PendingSyncEntity>

    /**
     * Get failed items count
     */
    @Query("SELECT COUNT(*) FROM pending_sync WHERE status = 'FAILED'")
    fun observeFailedCount(): Flow<Int>

    /**
     * Get item by session ID
     */
    @Query("SELECT * FROM pending_sync WHERE session_id = :sessionId")
    suspend fun getBySessionId(sessionId: String): PendingSyncEntity?

    /**
     * Check if session is already queued
     */
    @Query("SELECT EXISTS(SELECT 1 FROM pending_sync WHERE session_id = :sessionId)")
    suspend fun isQueued(sessionId: String): Boolean

    /**
     * Get oldest pending item (for FIFO processing)
     */
    @Query("SELECT * FROM pending_sync WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT 1")
    suspend fun getOldestPending(): PendingSyncEntity?

    /**
     * Get batch of pending items for processing
     */
    @Query("SELECT * FROM pending_sync WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT :batchSize")
    suspend fun getPendingBatch(batchSize: Int): List<PendingSyncEntity>

    // ==================== UPDATE ====================

    /**
     * Update entity
     */
    @Update
    suspend fun update(entity: PendingSyncEntity)

    /**
     * Mark item as syncing
     */
    @Query("UPDATE pending_sync SET status = 'SYNCING', last_attempt_at = :timestamp WHERE session_id = :sessionId")
    suspend fun markSyncing(sessionId: String, timestamp: Long = System.currentTimeMillis())

    /**
     * Mark item as failed with error
     */
    @Query("""
        UPDATE pending_sync
        SET status = CASE WHEN attempts + 1 >= max_attempts THEN 'FAILED' ELSE 'PENDING' END,
            attempts = attempts + 1,
            last_attempt_at = :timestamp,
            last_error = :error
        WHERE session_id = :sessionId
    """)
    suspend fun markFailed(sessionId: String, error: String?, timestamp: Long = System.currentTimeMillis())

    /**
     * Reset failed items to pending (for manual retry)
     */
    @Query("UPDATE pending_sync SET status = 'PENDING', attempts = 0, last_error = NULL WHERE status = 'FAILED'")
    suspend fun resetFailedItems()

    /**
     * Reset specific failed item to pending
     */
    @Query("UPDATE pending_sync SET status = 'PENDING', attempts = 0, last_error = NULL WHERE session_id = :sessionId")
    suspend fun resetItem(sessionId: String)

    /**
     * Reset items stuck in SYNCING state (crashed during sync)
     * Should be called on app startup
     */
    @Query("UPDATE pending_sync SET status = 'PENDING' WHERE status = 'SYNCING'")
    suspend fun resetSyncingItems()

    // ==================== DELETE ====================

    /**
     * Delete item by session ID (after successful sync)
     */
    @Query("DELETE FROM pending_sync WHERE session_id = :sessionId")
    suspend fun deleteBySessionId(sessionId: String)

    /**
     * Delete completed items
     */
    @Query("DELETE FROM pending_sync WHERE status = 'COMPLETED'")
    suspend fun deleteCompleted()

    /**
     * Delete multiple items by session IDs
     */
    @Query("DELETE FROM pending_sync WHERE session_id IN (:sessionIds)")
    suspend fun deleteBySessionIds(sessionIds: List<String>)

    /**
     * Delete stale items (older than 7 days)
     */
    @Query("DELETE FROM pending_sync WHERE created_at < :cutoffTimestamp")
    suspend fun deleteStaleItems(cutoffTimestamp: Long)

    /**
     * Delete all items (for testing or full reset)
     */
    @Query("DELETE FROM pending_sync")
    suspend fun deleteAll()

    // ==================== CLEANUP ====================

    /**
     * Cleanup routine: delete completed and stale items
     * Should be called periodically (e.g., daily)
     */
    @Transaction
    suspend fun cleanup() {
        deleteCompleted()
        deleteStaleItems(System.currentTimeMillis() - PendingSyncEntity.MAX_AGE_MILLIS)
    }
}
