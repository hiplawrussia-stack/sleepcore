/**
 * Centralized Error Logger with Sentry Integration
 * =================================================
 * Provides centralized error logging and crash reporting.
 *
 * Research (February 2026):
 * - Sentry SDK 8.33.0 with Jetpack Compose support
 * - HIPAA BAA available on Sentry Business tier
 * - beforeSend callback for PHI scrubbing
 *
 * Sources:
 * - docs.sentry.io/platforms/android/
 * - sentry.io/legal/baa/ (HIPAA Business Associate Agreement)
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.util

import android.util.Log
import io.sentry.Breadcrumb
import io.sentry.Sentry
import io.sentry.SentryLevel
import ru.sleepcore.companion.BuildConfig

/**
 * Error severity levels
 */
enum class ErrorSeverity {
    DEBUG,      // Development only
    INFO,       // Informational
    WARNING,    // Recoverable issues
    ERROR,      // Errors that affect functionality
    CRITICAL    // Critical failures
}

/**
 * Error context for structured logging
 *
 * HIPAA Note: Never include PHI (patient health info) in context.
 * - userId should be anonymized ID, not email/name
 * - extras should not contain health data
 */
data class ErrorContext(
    val tag: String,
    val operation: String,
    val userId: String? = null,
    val deviceId: String? = null,
    val extras: Map<String, Any?> = emptyMap()
)

/**
 * Centralized error logging utility with Sentry integration
 *
 * Usage:
 * ```kotlin
 * ErrorLogger.log(
 *     severity = ErrorSeverity.ERROR,
 *     context = ErrorContext("SyncViewModel", "syncNow"),
 *     message = "Sync failed",
 *     throwable = exception
 * )
 * ```
 */
object ErrorLogger {

    private const val APP_TAG = "SleepCore"

    /**
     * Log an error with context
     *
     * @param severity Error severity level
     * @param context Structured context (tag, operation, user info)
     * @param message Human-readable error message
     * @param throwable Optional exception
     */
    fun log(
        severity: ErrorSeverity,
        context: ErrorContext,
        message: String,
        throwable: Throwable? = null
    ) {
        // Skip DEBUG logs in release builds
        if (severity == ErrorSeverity.DEBUG && !BuildConfig.DEBUG) {
            return
        }

        val fullTag = "$APP_TAG:${context.tag}"
        val fullMessage = buildLogMessage(context, message)

        // Local Android logging (stripped in release by ProGuard)
        when (severity) {
            ErrorSeverity.DEBUG -> Log.d(fullTag, fullMessage, throwable)
            ErrorSeverity.INFO -> Log.i(fullTag, fullMessage, throwable)
            ErrorSeverity.WARNING -> Log.w(fullTag, fullMessage, throwable)
            ErrorSeverity.ERROR -> Log.e(fullTag, fullMessage, throwable)
            ErrorSeverity.CRITICAL -> Log.e(fullTag, "[CRITICAL] $fullMessage", throwable)
        }

        // Sentry breadcrumb for all logs (helps debug crashes)
        if (Sentry.isEnabled()) {
            addSentryBreadcrumb(severity, context, message)

            // Send to Sentry for ERROR and CRITICAL
            if (severity == ErrorSeverity.ERROR || severity == ErrorSeverity.CRITICAL) {
                sendToSentry(severity, context, message, throwable)
            }
        }
    }

    /**
     * Log a network error with retry context
     */
    fun logNetworkError(
        tag: String,
        operation: String,
        attempt: Int,
        maxAttempts: Int,
        delayMs: Long,
        throwable: Throwable
    ) {
        log(
            severity = ErrorSeverity.WARNING,
            context = ErrorContext(
                tag = tag,
                operation = operation,
                extras = mapOf(
                    "attempt" to attempt,
                    "maxAttempts" to maxAttempts,
                    "retryDelayMs" to delayMs
                )
            ),
            message = "Retry $attempt/$maxAttempts after ${delayMs}ms",
            throwable = throwable
        )
    }

    /**
     * Log a sync event (success or failure)
     */
    fun logSync(
        success: Boolean,
        operation: String,
        processed: Int = 0,
        skipped: Int = 0,
        error: String? = null,
        throwable: Throwable? = null
    ) {
        if (success) {
            log(
                severity = ErrorSeverity.INFO,
                context = ErrorContext(
                    tag = "Sync",
                    operation = operation,
                    extras = mapOf(
                        "processed" to processed,
                        "skipped" to skipped
                    )
                ),
                message = "Sync completed: processed=$processed, skipped=$skipped"
            )
        } else {
            log(
                severity = ErrorSeverity.ERROR,
                context = ErrorContext(
                    tag = "Sync",
                    operation = operation,
                    extras = mapOf(
                        "error" to error
                    )
                ),
                message = "Sync failed: $error",
                throwable = throwable
            )
        }
    }

    /**
     * Log Health Connect permission state
     */
    fun logPermissions(
        granted: Boolean,
        permissionType: String,
        details: String? = null
    ) {
        log(
            severity = if (granted) ErrorSeverity.INFO else ErrorSeverity.WARNING,
            context = ErrorContext(
                tag = "Permissions",
                operation = "check",
                extras = mapOf(
                    "type" to permissionType,
                    "granted" to granted
                )
            ),
            message = if (granted) {
                "Permission granted: $permissionType"
            } else {
                "Permission denied: $permissionType${details?.let { " ($it)" } ?: ""}"
            }
        )
    }

    /**
     * Log token refresh events
     */
    fun logTokenRefresh(success: Boolean, reason: String? = null) {
        log(
            severity = if (success) ErrorSeverity.INFO else ErrorSeverity.WARNING,
            context = ErrorContext(
                tag = "Auth",
                operation = "tokenRefresh"
            ),
            message = if (success) {
                "Token refreshed successfully"
            } else {
                "Token refresh failed: ${reason ?: "unknown"}"
            }
        )
    }

    /**
     * Build structured log message
     */
    private fun buildLogMessage(context: ErrorContext, message: String): String {
        val extras = context.extras.entries
            .filter { it.value != null }
            .joinToString(", ") { "${it.key}=${it.value}" }

        return buildString {
            append("[${context.operation}]")
            if (extras.isNotEmpty()) {
                append(" {$extras}")
            }
            append(" $message")
        }
    }

    /**
     * Add breadcrumb to Sentry for debugging
     */
    private fun addSentryBreadcrumb(
        severity: ErrorSeverity,
        context: ErrorContext,
        message: String
    ) {
        val breadcrumb = Breadcrumb().apply {
            category = context.tag
            this.message = message
            level = mapToSentryLevel(severity)
            type = "debug"

            // Add safe context data (no PHI)
            data["operation"] = context.operation
            context.extras.forEach { (key, value) ->
                if (value != null && isSafeForSentry(key, value)) {
                    data[key] = value
                }
            }
        }
        Sentry.addBreadcrumb(breadcrumb)
    }

    /**
     * Send error/exception to Sentry
     */
    private fun sendToSentry(
        severity: ErrorSeverity,
        context: ErrorContext,
        message: String,
        throwable: Throwable?
    ) {
        Sentry.configureScope { scope ->
            scope.setTag("component", context.tag)
            scope.setTag("operation", context.operation)
            scope.level = mapToSentryLevel(severity)

            // Add safe extras as context
            context.extras.forEach { (key, value) ->
                if (value != null && isSafeForSentry(key, value)) {
                    scope.setExtra(key, value.toString())
                }
            }
        }

        if (throwable != null) {
            Sentry.captureException(throwable)
        } else {
            Sentry.captureMessage(message, mapToSentryLevel(severity))
        }
    }

    /**
     * Map ErrorSeverity to Sentry level
     */
    private fun mapToSentryLevel(severity: ErrorSeverity): SentryLevel {
        return when (severity) {
            ErrorSeverity.DEBUG -> SentryLevel.DEBUG
            ErrorSeverity.INFO -> SentryLevel.INFO
            ErrorSeverity.WARNING -> SentryLevel.WARNING
            ErrorSeverity.ERROR -> SentryLevel.ERROR
            ErrorSeverity.CRITICAL -> SentryLevel.FATAL
        }
    }

    /**
     * Check if a key-value pair is safe to send to Sentry (no PHI)
     *
     * HIPAA Compliance: Filter out potential PHI before sending.
     */
    private fun isSafeForSentry(key: String, value: Any): Boolean {
        // Block known PHI fields
        val phiKeys = setOf(
            "email", "name", "phone", "address", "dob", "birthdate",
            "ssn", "medical", "health", "diagnosis", "medication",
            "sleep_data", "heart_rate", "hrv", "spo2", "weight", "height",
            "password", "token", "secret", "key", "credential"
        )

        val lowerKey = key.lowercase()
        if (phiKeys.any { lowerKey.contains(it) }) {
            return false
        }

        // Block values that look like PHI
        val stringValue = value.toString()
        if (stringValue.contains("@") && stringValue.contains(".")) {
            return false // Looks like email
        }
        if (stringValue.matches(Regex("\\d{3}-\\d{2}-\\d{4}"))) {
            return false // Looks like SSN
        }
        if (stringValue.matches(Regex("\\+?\\d{10,}"))) {
            return false // Looks like phone
        }

        return true
    }
}
