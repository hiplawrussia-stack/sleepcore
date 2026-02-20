/**
 * Audit Log DAO
 * ==============
 * INSERT-ONLY DAO for HIPAA audit trail.
 *
 * IMPORTANT: No @Update or @Delete methods!
 * Audit logs must be immutable per HIPAA §164.312(b)(1).
 *
 * Query methods are for:
 * - Compliance audits
 * - Log export
 * - Integrity verification
 *
 * Retention cleanup is handled by scheduled job, not ad-hoc deletion.
 *
 * Confidence: HIGH
 * Source: HIPAA Security Rule, FDA 21 CFR Part 11
 */

package ru.sleepcore.companion.data.local.audit

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface AuditLogDao {

    /**
     * Insert single audit log entry
     * OnConflictStrategy.ABORT ensures no silent overwrites
     */
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(log: AuditLogEntity): Long

    /**
     * Insert multiple audit log entries (batch)
     */
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insertAll(logs: List<AuditLogEntity>): List<Long>

    /**
     * Get all logs (for export/audit)
     * Ordered by timestamp descending (newest first)
     */
    @Query("SELECT * FROM audit_logs ORDER BY timestamp DESC")
    suspend fun getAll(): List<AuditLogEntity>

    /**
     * Get logs by category
     */
    @Query("SELECT * FROM audit_logs WHERE category = :category ORDER BY timestamp DESC")
    suspend fun getByCategory(category: AuditCategory): List<AuditLogEntity>

    /**
     * Get logs by user ID
     */
    @Query("SELECT * FROM audit_logs WHERE user_id = :userId ORDER BY timestamp DESC")
    suspend fun getByUserId(userId: String): List<AuditLogEntity>

    /**
     * Get logs by device ID
     */
    @Query("SELECT * FROM audit_logs WHERE device_id = :deviceId ORDER BY timestamp DESC")
    suspend fun getByDeviceId(deviceId: String): List<AuditLogEntity>

    /**
     * Get logs within time range
     * @param startTime ISO-8601 UTC timestamp
     * @param endTime ISO-8601 UTC timestamp
     */
    @Query("""
        SELECT * FROM audit_logs
        WHERE timestamp >= :startTime AND timestamp <= :endTime
        ORDER BY timestamp DESC
    """)
    suspend fun getByTimeRange(startTime: String, endTime: String): List<AuditLogEntity>

    /**
     * Get recent logs (last N entries)
     */
    @Query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecent(limit: Int): List<AuditLogEntity>

    /**
     * Observe recent logs (Flow for UI)
     */
    @Query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<AuditLogEntity>>

    /**
     * Get log count (for monitoring)
     */
    @Query("SELECT COUNT(*) FROM audit_logs")
    suspend fun getCount(): Int

    /**
     * Get log count by outcome (for dashboards)
     */
    @Query("SELECT COUNT(*) FROM audit_logs WHERE outcome = :outcome")
    suspend fun getCountByOutcome(outcome: AuditOutcome): Int

    /**
     * Get oldest log timestamp (for retention management)
     */
    @Query("SELECT MIN(timestamp) FROM audit_logs")
    suspend fun getOldestTimestamp(): String?

    /**
     * Get security events (for incident response)
     */
    @Query("""
        SELECT * FROM audit_logs
        WHERE category = 'SECURITY_EVENT' OR outcome IN ('FAILURE', 'DENIED', 'ERROR')
        ORDER BY timestamp DESC
        LIMIT :limit
    """)
    suspend fun getSecurityEvents(limit: Int = 100): List<AuditLogEntity>

    /**
     * Verify log integrity
     * Returns logs with mismatched integrity hash (potential tampering)
     */
    @Query("SELECT * FROM audit_logs WHERE integrity_hash != :expectedHash AND id = :id")
    suspend fun verifyIntegrity(id: Long, expectedHash: String): AuditLogEntity?

    /**
     * Delete logs older than date (RETENTION CLEANUP ONLY)
     *
     * WARNING: This is for 6-year retention policy compliance only!
     * Should be called from scheduled job, not user code.
     * Requires additional authorization check before execution.
     *
     * @param cutoffDate ISO-8601 UTC timestamp (6 years ago)
     * @return Number of deleted records
     */
    @Query("DELETE FROM audit_logs WHERE timestamp < :cutoffDate")
    suspend fun deleteOlderThan(cutoffDate: String): Int
}
