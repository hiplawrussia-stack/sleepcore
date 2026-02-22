/**
 * Pending Sync Entity
 * ====================
 * Room entity for offline sync queue.
 *
 * Research (February 2026):
 * - Offline-first pattern: save locally, sync when network available
 * - Exponential backoff for retries (WorkManager handles this)
 * - Last Write Wins conflict resolution
 *
 * Sources:
 * - developer.android.com/topic/architecture/data-layer/offline-first
 * - droidcon.com/2025/12/16/the-complete-guide-to-offline-first-architecture-in-android/
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.data.local.sync

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Sync status for pending items
 */
enum class PendingSyncStatus {
    /** Waiting to be synced */
    PENDING,
    /** Currently being synced */
    SYNCING,
    /** Failed after max retries - requires manual intervention */
    FAILED,
    /** Successfully synced - will be deleted */
    COMPLETED
}

/**
 * Entity representing a sleep session pending sync to server.
 *
 * When network is unavailable or sync fails:
 * 1. Session is saved here with PENDING status
 * 2. WorkManager schedules retry with exponential backoff
 * 3. On success, entry is deleted
 * 4. After max retries, status becomes FAILED
 *
 * HIPAA Note: This entity stores health data (PHI).
 * Database should be encrypted in production.
 */
@Entity(
    tableName = "pending_sync",
    indices = [
        Index(value = ["status"]),
        Index(value = ["created_at"])
    ]
)
data class PendingSyncEntity(
    /**
     * Health Connect session ID - ensures idempotency
     * Server can safely ignore duplicate submissions
     */
    @PrimaryKey
    @ColumnInfo(name = "session_id")
    val sessionId: String,

    /**
     * JSON-serialized SleepSessionDto
     * Contains all sleep data: stages, HRV, heart rate, SpO2, etc.
     */
    @ColumnInfo(name = "payload")
    val payload: String,

    /**
     * Current sync status
     */
    @ColumnInfo(name = "status")
    val status: PendingSyncStatus = PendingSyncStatus.PENDING,

    /**
     * Number of sync attempts
     */
    @ColumnInfo(name = "attempts")
    val attempts: Int = 0,

    /**
     * Maximum allowed attempts before marking as FAILED
     * After this, user needs to manually retry or data is considered lost
     */
    @ColumnInfo(name = "max_attempts")
    val maxAttempts: Int = MAX_SYNC_ATTEMPTS,

    /**
     * Timestamp when session was added to queue (epoch millis)
     */
    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    /**
     * Timestamp of last sync attempt (epoch millis)
     */
    @ColumnInfo(name = "last_attempt_at")
    val lastAttemptAt: Long? = null,

    /**
     * Last error message if sync failed
     */
    @ColumnInfo(name = "last_error")
    val lastError: String? = null,

    /**
     * Session start time for display purposes (ISO-8601)
     */
    @ColumnInfo(name = "session_start_time")
    val sessionStartTime: String,

    /**
     * Session end time for display purposes (ISO-8601)
     */
    @ColumnInfo(name = "session_end_time")
    val sessionEndTime: String,

    /**
     * Data source (e.g., "Samsung Health", "Fitbit")
     */
    @ColumnInfo(name = "source")
    val source: String? = null
) {
    companion object {
        /**
         * Maximum sync attempts before marking as FAILED
         *
         * Research: With exponential backoff (10s base), 5 attempts = ~5 minutes total
         * This is reasonable for transient network issues without being too aggressive
         */
        const val MAX_SYNC_ATTEMPTS = 5

        /**
         * Maximum age for pending items (7 days in millis)
         * Older items should be cleaned up to prevent unbounded growth
         */
        const val MAX_AGE_MILLIS = 7 * 24 * 60 * 60 * 1000L
    }

    /**
     * Check if this item has exceeded max retry attempts
     */
    val isExhausted: Boolean
        get() = attempts >= maxAttempts

    /**
     * Check if this item is stale (older than MAX_AGE)
     */
    val isStale: Boolean
        get() = System.currentTimeMillis() - createdAt > MAX_AGE_MILLIS

    /**
     * Create updated entity with incremented attempt count
     */
    fun withIncrementedAttempt(error: String? = null): PendingSyncEntity {
        val newAttempts = attempts + 1
        return copy(
            attempts = newAttempts,
            lastAttemptAt = System.currentTimeMillis(),
            lastError = error,
            status = if (newAttempts >= maxAttempts) PendingSyncStatus.FAILED else PendingSyncStatus.PENDING
        )
    }

    /**
     * Create updated entity marked as syncing
     */
    fun markSyncing(): PendingSyncEntity = copy(
        status = PendingSyncStatus.SYNCING,
        lastAttemptAt = System.currentTimeMillis()
    )

    /**
     * Create updated entity marked as completed
     */
    fun markCompleted(): PendingSyncEntity = copy(
        status = PendingSyncStatus.COMPLETED
    )
}
