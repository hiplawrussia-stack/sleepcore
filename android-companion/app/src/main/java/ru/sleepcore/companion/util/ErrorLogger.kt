/**
 * Centralized Error Logger
 * =========================
 * Provides centralized error logging and crash reporting.
 *
 * Based on research (February 2026):
 * - Sentry vs Crashlytics: Sentry provides deeper context
 * - For now: Android Log with structured format
 * - Future: Add Sentry SDK integration
 *
 * Sources:
 * - docs.sentry.io/platforms/android/
 * - www.baytechconsulting.com/blog/sentry-io-comprehensive-guide-2025
 *
 * Confidence: HIGH (pattern), MEDIUM (specific SDK choice)
 */

package ru.sleepcore.companion.util

import android.util.Log
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
 */
data class ErrorContext(
    val tag: String,
    val operation: String,
    val userId: String? = null,
    val deviceId: String? = null,
    val extras: Map<String, Any?> = emptyMap()
)

/**
 * Centralized error logging utility
 *
 * Currently uses Android Log. Designed for easy migration to Sentry/Crashlytics.
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

        when (severity) {
            ErrorSeverity.DEBUG -> Log.d(fullTag, fullMessage, throwable)
            ErrorSeverity.INFO -> Log.i(fullTag, fullMessage, throwable)
            ErrorSeverity.WARNING -> Log.w(fullTag, fullMessage, throwable)
            ErrorSeverity.ERROR -> Log.e(fullTag, fullMessage, throwable)
            ErrorSeverity.CRITICAL -> {
                Log.e(fullTag, "[CRITICAL] $fullMessage", throwable)
                // Future: Send to Sentry immediately
                // Sentry.captureException(throwable)
            }
        }

        // Future: Add breadcrumb for Sentry
        // Sentry.addBreadcrumb(Breadcrumb().apply {
        //     category = context.tag
        //     this.message = message
        //     level = mapToSentryLevel(severity)
        // })
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

    // ============================================
    // Future Sentry Integration (Commented Out)
    // ============================================
    //
    // To integrate Sentry:
    // 1. Add to build.gradle.kts:
    //    implementation("io.sentry:sentry-android:7.x.x")
    //
    // 2. Add to AndroidManifest.xml:
    //    <meta-data android:name="io.sentry.dsn" android:value="YOUR_DSN" />
    //
    // 3. Initialize in Application class:
    //    SentryAndroid.init(this) { options ->
    //        options.dsn = "YOUR_DSN"
    //        options.tracesSampleRate = if (BuildConfig.DEBUG) 1.0 else 0.1
    //    }
    //
    // 4. Uncomment Sentry calls in this file
    //
    // private fun mapToSentryLevel(severity: ErrorSeverity): SentryLevel {
    //     return when (severity) {
    //         ErrorSeverity.DEBUG -> SentryLevel.DEBUG
    //         ErrorSeverity.INFO -> SentryLevel.INFO
    //         ErrorSeverity.WARNING -> SentryLevel.WARNING
    //         ErrorSeverity.ERROR -> SentryLevel.ERROR
    //         ErrorSeverity.CRITICAL -> SentryLevel.FATAL
    //     }
    // }
}
