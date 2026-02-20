/**
 * Audit Log Entity
 * =================
 * Room entity for HIPAA-compliant audit trail.
 *
 * Requirements (45 CFR §164.312):
 * - Unique record ID (immutable)
 * - Timestamp (UTC, immutable)
 * - User/device identifier
 * - Action performed
 * - Resource affected
 * - Outcome (success/failure)
 * - Retention: 6 years minimum
 *
 * Security:
 * - Entity is INSERT-ONLY (no updates/deletes at DAO level)
 * - Hash integrity for tamper detection
 * - Encrypted via SQLCipher in production
 *
 * Confidence: HIGH
 * Source: HIPAA Security Rule §164.312(b)(1), FDA 21 CFR Part 11
 */

package ru.sleepcore.companion.data.local.audit

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.security.MessageDigest

/**
 * Audit event categories per HIPAA
 */
enum class AuditCategory {
    AUTHENTICATION,    // Login, logout, token refresh
    AUTHORIZATION,     // Permission grants/denials
    DATA_ACCESS,       // PHI read operations
    DATA_MODIFICATION, // PHI write operations
    DATA_SYNC,         // Sync with server
    SECURITY_EVENT,    // Security-relevant events
    SYSTEM_EVENT       // App lifecycle, errors
}

/**
 * Audit event outcomes
 */
enum class AuditOutcome {
    SUCCESS,
    FAILURE,
    DENIED,
    ERROR
}

@Entity(
    tableName = "audit_logs",
    indices = [
        Index(value = ["timestamp"]),
        Index(value = ["category"]),
        Index(value = ["device_id"]),
        Index(value = ["user_id"])
    ]
)
data class AuditLogEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    /**
     * UTC timestamp in ISO-8601 format
     * Immutable after creation
     */
    @ColumnInfo(name = "timestamp")
    val timestamp: String,

    /**
     * Event category (HIPAA classification)
     */
    @ColumnInfo(name = "category")
    val category: AuditCategory,

    /**
     * Action performed (e.g., "TOKEN_REFRESH", "SYNC_SESSIONS")
     */
    @ColumnInfo(name = "action")
    val action: String,

    /**
     * Resource affected (e.g., "credentials", "sleep_sessions")
     */
    @ColumnInfo(name = "resource")
    val resource: String?,

    /**
     * User ID if known (null for pre-auth events)
     */
    @ColumnInfo(name = "user_id")
    val userId: String?,

    /**
     * Device ID (Android ID or installation UUID)
     */
    @ColumnInfo(name = "device_id")
    val deviceId: String,

    /**
     * Event outcome
     */
    @ColumnInfo(name = "outcome")
    val outcome: AuditOutcome,

    /**
     * Additional details (non-PHI only!)
     * Do NOT store actual health data here
     */
    @ColumnInfo(name = "details")
    val details: String?,

    /**
     * Error message if outcome is FAILURE/ERROR
     */
    @ColumnInfo(name = "error_message")
    val errorMessage: String?,

    /**
     * Source location (class:method)
     */
    @ColumnInfo(name = "source")
    val source: String?,

    /**
     * SHA-256 hash for integrity verification
     * Computed from: timestamp + category + action + resource + userId + deviceId + outcome
     */
    @ColumnInfo(name = "integrity_hash")
    val integrityHash: String
) {
    companion object {
        /**
         * Compute integrity hash for tamper detection
         */
        fun computeIntegrityHash(
            timestamp: String,
            category: AuditCategory,
            action: String,
            resource: String?,
            userId: String?,
            deviceId: String,
            outcome: AuditOutcome
        ): String {
            val data = "$timestamp|${category.name}|$action|$resource|$userId|$deviceId|${outcome.name}"
            val digest = MessageDigest.getInstance("SHA-256")
            val hashBytes = digest.digest(data.toByteArray(Charsets.UTF_8))
            return hashBytes.joinToString("") { "%02x".format(it) }
        }
    }
}
