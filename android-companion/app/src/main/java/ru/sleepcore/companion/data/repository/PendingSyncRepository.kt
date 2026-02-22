/**
 * Pending Sync Repository
 * ========================
 * Manages the offline sync queue for sleep sessions.
 *
 * Research (February 2026):
 * - Offline-first pattern: queue locally, sync when network available
 * - FIFO processing for predictable behavior
 * - Exponential backoff handled by WorkManager
 *
 * Sources:
 * - developer.android.com/topic/architecture/data-layer/offline-first
 * - droidcon.com/2025/12/16/the-complete-guide-to-offline-first-architecture-in-android/
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.data.repository

import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import ru.sleepcore.companion.data.api.SleepSessionDto
import ru.sleepcore.companion.data.local.sync.PendingSyncDao
import ru.sleepcore.companion.data.local.sync.PendingSyncEntity
import ru.sleepcore.companion.data.local.sync.PendingSyncStatus
import ru.sleepcore.companion.util.ErrorContext
import ru.sleepcore.companion.util.ErrorLogger
import ru.sleepcore.companion.util.ErrorSeverity
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Result of queue processing
 */
data class QueueProcessResult(
    val processed: Int,
    val failed: Int,
    val remaining: Int
)

@Singleton
class PendingSyncRepository @Inject constructor(
    private val pendingSyncDao: PendingSyncDao,
    private val json: Json
) {
    companion object {
        private const val TAG = "PendingSyncRepository"
    }

    // ==================== QUEUE OPERATIONS ====================

    /**
     * Add session to pending queue
     *
     * @param session Sleep session DTO to queue
     * @return true if added, false if already queued
     */
    suspend fun enqueue(session: SleepSessionDto): Boolean {
        // Check if already queued
        if (pendingSyncDao.isQueued(session.sessionId)) {
            ErrorLogger.log(
                severity = ErrorSeverity.DEBUG,
                context = ErrorContext(TAG, "enqueue"),
                message = "Session ${session.sessionId} already queued, skipping"
            )
            return false
        }

        val entity = PendingSyncEntity(
            sessionId = session.sessionId,
            payload = json.encodeToString(session),
            status = PendingSyncStatus.PENDING,
            sessionStartTime = session.startTime,
            sessionEndTime = session.endTime,
            source = session.source
        )

        pendingSyncDao.insert(entity)

        ErrorLogger.log(
            severity = ErrorSeverity.INFO,
            context = ErrorContext(TAG, "enqueue"),
            message = "Session ${session.sessionId} added to pending queue"
        )

        return true
    }

    /**
     * Add multiple sessions to pending queue
     *
     * @param sessions List of sleep session DTOs to queue
     * @return Number of sessions actually added (excludes duplicates)
     */
    suspend fun enqueueAll(sessions: List<SleepSessionDto>): Int {
        var added = 0
        sessions.forEach { session ->
            if (enqueue(session)) {
                added++
            }
        }
        return added
    }

    /**
     * Get next pending session for sync
     */
    suspend fun dequeue(): PendingSyncEntity? {
        val item = pendingSyncDao.getOldestPending()
        if (item != null) {
            pendingSyncDao.markSyncing(item.sessionId)
        }
        return item
    }

    /**
     * Get batch of pending sessions for sync
     */
    suspend fun dequeueBatch(batchSize: Int = 10): List<PendingSyncEntity> {
        val items = pendingSyncDao.getPendingBatch(batchSize)
        items.forEach { item ->
            pendingSyncDao.markSyncing(item.sessionId)
        }
        return items
    }

    /**
     * Parse session DTO from entity payload
     */
    fun parseSession(entity: PendingSyncEntity): SleepSessionDto? {
        return try {
            json.decodeFromString<SleepSessionDto>(entity.payload)
        } catch (e: Exception) {
            ErrorLogger.log(
                severity = ErrorSeverity.ERROR,
                context = ErrorContext(TAG, "parseSession"),
                message = "Failed to parse session ${entity.sessionId}",
                throwable = e
            )
            null
        }
    }

    // ==================== STATUS UPDATES ====================

    /**
     * Mark session as successfully synced (removes from queue)
     */
    suspend fun markSynced(sessionId: String) {
        pendingSyncDao.deleteBySessionId(sessionId)
        ErrorLogger.log(
            severity = ErrorSeverity.DEBUG,
            context = ErrorContext(TAG, "markSynced"),
            message = "Session $sessionId removed from queue (synced)"
        )
    }

    /**
     * Mark multiple sessions as synced
     */
    suspend fun markSyncedBatch(sessionIds: List<String>) {
        pendingSyncDao.deleteBySessionIds(sessionIds)
        ErrorLogger.log(
            severity = ErrorSeverity.DEBUG,
            context = ErrorContext(TAG, "markSyncedBatch"),
            message = "${sessionIds.size} sessions removed from queue (synced)"
        )
    }

    /**
     * Mark session as failed (increments retry count)
     */
    suspend fun markFailed(sessionId: String, error: String?) {
        pendingSyncDao.markFailed(sessionId, error)
        ErrorLogger.log(
            severity = ErrorSeverity.WARNING,
            context = ErrorContext(TAG, "markFailed"),
            message = "Session $sessionId marked as failed: $error"
        )
    }

    /**
     * Reset session to pending (for manual retry)
     */
    suspend fun resetForRetry(sessionId: String) {
        pendingSyncDao.resetItem(sessionId)
        ErrorLogger.log(
            severity = ErrorSeverity.INFO,
            context = ErrorContext(TAG, "resetForRetry"),
            message = "Session $sessionId reset for retry"
        )
    }

    /**
     * Reset all failed sessions to pending
     */
    suspend fun resetAllFailed() {
        pendingSyncDao.resetFailedItems()
        ErrorLogger.log(
            severity = ErrorSeverity.INFO,
            context = ErrorContext(TAG, "resetAllFailed"),
            message = "All failed sessions reset for retry"
        )
    }

    /**
     * Reset sessions stuck in SYNCING state (app crashed during sync)
     * Call on app startup
     */
    suspend fun resetStuckItems() {
        pendingSyncDao.resetSyncingItems()
        ErrorLogger.log(
            severity = ErrorSeverity.DEBUG,
            context = ErrorContext(TAG, "resetStuckItems"),
            message = "Reset items stuck in SYNCING state"
        )
    }

    // ==================== QUERIES ====================

    /**
     * Get all pending items
     */
    suspend fun getPendingItems(): List<PendingSyncEntity> {
        return pendingSyncDao.getPendingItems()
    }

    /**
     * Get all failed items
     */
    suspend fun getFailedItems(): List<PendingSyncEntity> {
        return pendingSyncDao.getFailedItems()
    }

    /**
     * Check if there are pending items
     */
    suspend fun hasPendingItems(): Boolean {
        return pendingSyncDao.getPendingCount() > 0
    }

    /**
     * Get pending count
     */
    suspend fun getPendingCount(): Int {
        return pendingSyncDao.getPendingCount()
    }

    /**
     * Observe pending items count (for UI badge)
     */
    fun observePendingCount(): Flow<Int> {
        return pendingSyncDao.observePendingCount()
    }

    /**
     * Observe failed items count
     */
    fun observeFailedCount(): Flow<Int> {
        return pendingSyncDao.observeFailedCount()
    }

    /**
     * Observe all pending items
     */
    fun observePendingItems(): Flow<List<PendingSyncEntity>> {
        return pendingSyncDao.observePendingItems()
    }

    // ==================== CLEANUP ====================

    /**
     * Run cleanup routine
     * - Delete completed items
     * - Delete stale items (older than 7 days)
     */
    suspend fun cleanup() {
        pendingSyncDao.cleanup()
        ErrorLogger.log(
            severity = ErrorSeverity.DEBUG,
            context = ErrorContext(TAG, "cleanup"),
            message = "Queue cleanup completed"
        )
    }

    /**
     * Clear entire queue (for testing or full reset)
     */
    suspend fun clearAll() {
        pendingSyncDao.deleteAll()
        ErrorLogger.log(
            severity = ErrorSeverity.INFO,
            context = ErrorContext(TAG, "clearAll"),
            message = "Queue cleared"
        )
    }
}
