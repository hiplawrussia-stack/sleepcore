/**
 * Session Manager
 * ================
 * HIPAA-compliant session timeout management.
 *
 * Requirements per HIPAA §164.312(a)(2)(iii):
 * - Automatic logoff after period of inactivity
 * - Healthcare recommendation: 10-15 minutes
 * - We use 15 minutes (configurable)
 *
 * Implementation:
 * - Track last activity timestamp
 * - Check timeout on app resume
 * - Clear session on timeout
 *
 * Confidence: HIGH
 * Source: HIPAA Security Rule §164.312(a)(2)(iii)
 */

package ru.sleepcore.companion.security

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import ru.sleepcore.companion.data.local.audit.AuditLogger
import ru.sleepcore.companion.data.local.audit.AuditOutcome
import javax.inject.Inject
import javax.inject.Singleton

private val Context.sessionDataStore by preferencesDataStore(name = "session")

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val auditLogger: AuditLogger
) {
    companion object {
        /**
         * Session timeout in milliseconds
         * HIPAA recommendation: 10-15 minutes
         * We use 15 minutes (900,000 ms)
         */
        const val SESSION_TIMEOUT_MS = 15 * 60 * 1000L // 15 minutes

        /**
         * Grace period for background tasks (2 minutes)
         * Allows sync operations to complete without premature logout
         */
        const val BACKGROUND_GRACE_PERIOD_MS = 2 * 60 * 1000L // 2 minutes

        private val KEY_LAST_ACTIVITY = longPreferencesKey("last_activity_timestamp")
        private val KEY_SESSION_START = longPreferencesKey("session_start_timestamp")
    }

    /**
     * Update last activity timestamp
     * Call this on any user interaction
     */
    suspend fun updateLastActivity() {
        context.sessionDataStore.edit { preferences ->
            preferences[KEY_LAST_ACTIVITY] = System.currentTimeMillis()
        }
    }

    /**
     * Start a new session
     * Call this after successful authentication
     */
    suspend fun startSession() {
        val now = System.currentTimeMillis()
        context.sessionDataStore.edit { preferences ->
            preferences[KEY_SESSION_START] = now
            preferences[KEY_LAST_ACTIVITY] = now
        }

        auditLogger.logSecurityEvent(
            action = "SESSION_START",
            outcome = AuditOutcome.SUCCESS,
            source = "SessionManager:startSession"
        )
    }

    /**
     * End session (logout)
     */
    suspend fun endSession() {
        context.sessionDataStore.edit { preferences ->
            preferences.remove(KEY_SESSION_START)
            preferences.remove(KEY_LAST_ACTIVITY)
        }

        auditLogger.logSecurityEvent(
            action = "SESSION_END",
            outcome = AuditOutcome.SUCCESS,
            source = "SessionManager:endSession"
        )
    }

    /**
     * Check if session has timed out
     * @return true if session is expired
     */
    suspend fun isSessionExpired(): Boolean {
        val lastActivity = getLastActivityTimestamp() ?: return true
        val elapsed = System.currentTimeMillis() - lastActivity
        return elapsed > SESSION_TIMEOUT_MS
    }

    /**
     * Check if session is expired and handle timeout
     * @param onTimeout Callback when session times out
     * @return true if session is valid, false if timed out
     */
    suspend fun checkSessionWithTimeout(onTimeout: suspend () -> Unit): Boolean {
        if (isSessionExpired()) {
            // Log timeout
            auditLogger.logSecurityEvent(
                action = "SESSION_TIMEOUT",
                outcome = AuditOutcome.SUCCESS,
                details = "Session timed out after inactivity",
                source = "SessionManager:checkSessionWithTimeout"
            )

            // End session
            endSession()

            // Call timeout handler
            onTimeout()

            return false
        }
        return true
    }

    /**
     * Get remaining session time in milliseconds
     */
    suspend fun getRemainingSessionTime(): Long {
        val lastActivity = getLastActivityTimestamp() ?: return 0
        val elapsed = System.currentTimeMillis() - lastActivity
        return maxOf(0, SESSION_TIMEOUT_MS - elapsed)
    }

    /**
     * Check if session is about to expire (within 2 minutes)
     */
    suspend fun isSessionAboutToExpire(): Boolean {
        val remaining = getRemainingSessionTime()
        return remaining in 1..BACKGROUND_GRACE_PERIOD_MS
    }

    /**
     * Get session duration since start
     */
    suspend fun getSessionDuration(): Long? {
        val sessionStart = getSessionStartTimestamp() ?: return null
        return System.currentTimeMillis() - sessionStart
    }

    /**
     * Get last activity timestamp
     */
    private suspend fun getLastActivityTimestamp(): Long? {
        return context.sessionDataStore.data
            .map { preferences -> preferences[KEY_LAST_ACTIVITY] }
            .first()
    }

    /**
     * Get session start timestamp
     */
    private suspend fun getSessionStartTimestamp(): Long? {
        return context.sessionDataStore.data
            .map { preferences -> preferences[KEY_SESSION_START] }
            .first()
    }

    /**
     * Check if there is an active session
     */
    suspend fun hasActiveSession(): Boolean {
        return getSessionStartTimestamp() != null && !isSessionExpired()
    }
}
