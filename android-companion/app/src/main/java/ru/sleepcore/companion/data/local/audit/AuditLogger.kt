/**
 * Audit Logger
 * =============
 * High-level API for HIPAA-compliant audit logging.
 *
 * Usage:
 * ```kotlin
 * auditLogger.logAuthentication(
 *     action = "TOKEN_REFRESH",
 *     outcome = AuditOutcome.SUCCESS,
 *     userId = "user123"
 * )
 * ```
 *
 * Features:
 * - Automatic timestamp (UTC)
 * - Automatic device ID
 * - Integrity hash computation
 * - Async write (non-blocking)
 * - Error resilience (logging failures don't crash app)
 *
 * Confidence: HIGH
 * Source: HIPAA Security Rule §164.312(b)(1)
 */

package ru.sleepcore.companion.data.local.audit

import android.annotation.SuppressLint
import android.content.Context
import android.provider.Settings
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuditLogger @Inject constructor(
    @ApplicationContext private val context: Context,
    private val auditLogDao: AuditLogDao
) {
    /**
     * Dedicated scope for audit logging
     * SupervisorJob: child failures don't affect parent
     */
    private val auditScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /**
     * Cached device ID (computed once)
     */
    private val deviceId: String by lazy {
        @SuppressLint("HardwareIds")
        val id = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        id ?: "unknown"
    }

    /**
     * Current user ID (set after authentication)
     */
    @Volatile
    private var currentUserId: String? = null

    /**
     * Set current user ID (call after successful authentication)
     */
    fun setCurrentUser(userId: String?) {
        currentUserId = userId
    }

    /**
     * Log authentication event
     */
    fun logAuthentication(
        action: String,
        outcome: AuditOutcome,
        userId: String? = currentUserId,
        details: String? = null,
        errorMessage: String? = null,
        source: String? = null
    ) {
        log(
            category = AuditCategory.AUTHENTICATION,
            action = action,
            resource = "credentials",
            userId = userId,
            outcome = outcome,
            details = details,
            errorMessage = errorMessage,
            source = source
        )
    }

    /**
     * Log data access event (PHI read)
     */
    fun logDataAccess(
        action: String,
        resource: String,
        outcome: AuditOutcome,
        userId: String? = currentUserId,
        details: String? = null,
        errorMessage: String? = null,
        source: String? = null
    ) {
        log(
            category = AuditCategory.DATA_ACCESS,
            action = action,
            resource = resource,
            userId = userId,
            outcome = outcome,
            details = details,
            errorMessage = errorMessage,
            source = source
        )
    }

    /**
     * Log data modification event (PHI write)
     */
    fun logDataModification(
        action: String,
        resource: String,
        outcome: AuditOutcome,
        userId: String? = currentUserId,
        details: String? = null,
        errorMessage: String? = null,
        source: String? = null
    ) {
        log(
            category = AuditCategory.DATA_MODIFICATION,
            action = action,
            resource = resource,
            userId = userId,
            outcome = outcome,
            details = details,
            errorMessage = errorMessage,
            source = source
        )
    }

    /**
     * Log data sync event
     */
    fun logDataSync(
        action: String,
        outcome: AuditOutcome,
        userId: String? = currentUserId,
        details: String? = null,
        errorMessage: String? = null,
        source: String? = null
    ) {
        log(
            category = AuditCategory.DATA_SYNC,
            action = action,
            resource = "sleep_sessions",
            userId = userId,
            outcome = outcome,
            details = details,
            errorMessage = errorMessage,
            source = source
        )
    }

    /**
     * Log security event
     */
    fun logSecurityEvent(
        action: String,
        outcome: AuditOutcome,
        userId: String? = currentUserId,
        resource: String? = null,
        details: String? = null,
        errorMessage: String? = null,
        source: String? = null
    ) {
        log(
            category = AuditCategory.SECURITY_EVENT,
            action = action,
            resource = resource,
            userId = userId,
            outcome = outcome,
            details = details,
            errorMessage = errorMessage,
            source = source
        )
    }

    /**
     * Log system event (app lifecycle, errors)
     */
    fun logSystemEvent(
        action: String,
        outcome: AuditOutcome,
        details: String? = null,
        errorMessage: String? = null,
        source: String? = null
    ) {
        log(
            category = AuditCategory.SYSTEM_EVENT,
            action = action,
            resource = null,
            userId = currentUserId,
            outcome = outcome,
            details = details,
            errorMessage = errorMessage,
            source = source
        )
    }

    /**
     * Core logging method
     * Non-blocking, writes to database asynchronously
     */
    private fun log(
        category: AuditCategory,
        action: String,
        resource: String?,
        userId: String?,
        outcome: AuditOutcome,
        details: String?,
        errorMessage: String?,
        source: String?
    ) {
        val timestamp = Instant.now()
            .atOffset(ZoneOffset.UTC)
            .format(DateTimeFormatter.ISO_INSTANT)

        val integrityHash = AuditLogEntity.computeIntegrityHash(
            timestamp = timestamp,
            category = category,
            action = action,
            resource = resource,
            userId = userId,
            deviceId = deviceId,
            outcome = outcome
        )

        val entity = AuditLogEntity(
            timestamp = timestamp,
            category = category,
            action = action,
            resource = resource,
            userId = userId,
            deviceId = deviceId,
            outcome = outcome,
            details = details,
            errorMessage = errorMessage,
            source = source,
            integrityHash = integrityHash
        )

        auditScope.launch {
            try {
                auditLogDao.insert(entity)
            } catch (e: Exception) {
                // Log to system log as fallback (audit logging should never crash app)
                android.util.Log.e(
                    "AuditLogger",
                    "Failed to write audit log: ${e.message}",
                    e
                )
            }
        }
    }

    /**
     * Get recent audit logs (for admin/debug UI)
     */
    suspend fun getRecentLogs(limit: Int = 50): List<AuditLogEntity> {
        return auditLogDao.getRecent(limit)
    }

    /**
     * Get security events (for incident response)
     */
    suspend fun getSecurityEvents(limit: Int = 100): List<AuditLogEntity> {
        return auditLogDao.getSecurityEvents(limit)
    }

    /**
     * Export logs for compliance audit
     * Returns all logs within time range
     */
    suspend fun exportLogs(startTime: String, endTime: String): List<AuditLogEntity> {
        return auditLogDao.getByTimeRange(startTime, endTime)
    }

    /**
     * Get audit statistics
     */
    suspend fun getStatistics(): AuditStatistics {
        val total = auditLogDao.getCount()
        val failures = auditLogDao.getCountByOutcome(AuditOutcome.FAILURE)
        val errors = auditLogDao.getCountByOutcome(AuditOutcome.ERROR)
        val oldestTimestamp = auditLogDao.getOldestTimestamp()

        return AuditStatistics(
            totalLogs = total,
            failureCount = failures,
            errorCount = errors,
            oldestLogTimestamp = oldestTimestamp
        )
    }
}

/**
 * Audit statistics data class
 */
data class AuditStatistics(
    val totalLogs: Int,
    val failureCount: Int,
    val errorCount: Int,
    val oldestLogTimestamp: String?
)
