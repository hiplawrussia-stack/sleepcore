/**
 * SleepCore Companion Application
 * =================================
 * Main application class with Hilt, WorkManager, and Sentry initialization.
 *
 * Features:
 * - WorkManager for background sync
 * - Session timeout monitoring (HIPAA compliance)
 * - Sentry crash reporting with PHI scrubbing
 * - Audit logging initialization
 *
 * Research (Feb 2026):
 * - Sentry 8.33.0 manual init for HIPAA compliance
 * - beforeSend callback for PHI filtering
 * - Source: docs.sentry.io/platforms/android/
 */

package ru.sleepcore.companion

import android.app.Application
import android.content.pm.PackageManager
import androidx.hilt.work.HiltWorkerFactory
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.work.Configuration
import dagger.hilt.android.HiltAndroidApp
import io.sentry.SentryEvent
import io.sentry.SentryOptions
import io.sentry.android.core.SentryAndroid
import io.sentry.protocol.User
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import ru.sleepcore.companion.data.repository.PendingSyncRepository
import ru.sleepcore.companion.security.SessionManager
import javax.inject.Inject

@HiltAndroidApp
class SleepCoreCompanionApp : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var pendingSyncRepository: PendingSyncRepository

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun onCreate() {
        super.onCreate()

        // Initialize Sentry before anything else for crash reporting
        initializeSentry()

        // Reset items stuck in SYNCING state (app may have crashed during sync)
        applicationScope.launch(Dispatchers.IO) {
            pendingSyncRepository.resetStuckItems()
        }

        // Register lifecycle observer for session management
        ProcessLifecycleOwner.get().lifecycle.addObserver(SessionLifecycleObserver())
    }

    /**
     * Initialize Sentry with HIPAA-compliant configuration
     *
     * Key HIPAA compliance measures:
     * 1. sendDefaultPii = false (no automatic PII collection)
     * 2. beforeSend callback to scrub PHI from events
     * 3. Server-side scrubbing configured in Sentry dashboard
     * 4. HIPAA BAA signed with Sentry (Business tier required)
     */
    private fun initializeSentry() {
        // Get DSN from manifest (set via build.gradle manifestPlaceholders)
        val dsn = try {
            packageManager.getApplicationInfo(
                packageName,
                PackageManager.GET_META_DATA
            ).metaData?.getString("io.sentry.dsn") ?: ""
        } catch (e: Exception) {
            ""
        }

        // Skip initialization if DSN is not configured
        if (dsn.isBlank()) {
            if (BuildConfig.DEBUG) {
                android.util.Log.w("Sentry", "Sentry DSN not configured, crash reporting disabled")
            }
            return
        }

        SentryAndroid.init(this) { options ->
            options.dsn = dsn

            // HIPAA: Disable automatic PII collection
            options.isSendDefaultPii = false

            // Performance monitoring
            options.tracesSampleRate = if (BuildConfig.DEBUG) 1.0 else 0.1
            options.profilesSampleRate = if (BuildConfig.DEBUG) 1.0 else 0.1

            // Session tracking for release health
            options.isEnableAutoSessionTracking = true
            options.sessionTrackingIntervalMillis = 30000 // 30 seconds

            // Attach screenshots only in debug (PHI risk in production)
            options.isAttachScreenshot = BuildConfig.DEBUG
            options.isAttachViewHierarchy = BuildConfig.DEBUG

            // Enable ANR detection
            options.isAnrEnabled = true
            options.anrTimeoutIntervalMillis = 5000 // 5 seconds

            // Environment and release
            options.environment = if (BuildConfig.DEBUG) "development" else "production"
            options.release = "${BuildConfig.APPLICATION_ID}@${BuildConfig.VERSION_NAME}+${BuildConfig.VERSION_CODE}"

            // HIPAA: beforeSend callback to scrub PHI
            options.beforeSend = SentryOptions.BeforeSendCallback { event, _ ->
                scrubPhiFromEvent(event)
            }

            // HIPAA: beforeSendTransaction for performance events
            options.beforeSendTransaction = SentryOptions.BeforeSendTransactionCallback { transaction, _ ->
                // Remove any PHI from transaction tags
                transaction.tags?.keys?.removeAll { key ->
                    isPhiKey(key)
                }
                transaction
            }

            // Debug logging only in debug builds
            options.isDebug = BuildConfig.DEBUG
        }
    }

    /**
     * Scrub PHI from Sentry event before sending
     *
     * HIPAA requires removal of:
     * - Names, emails, phone numbers
     * - Dates of birth, addresses
     * - Health data (sleep metrics, heart rate, etc.)
     * - Device identifiers that could identify a patient
     */
    private fun scrubPhiFromEvent(event: SentryEvent): SentryEvent {
        // Scrub user data - keep only anonymized ID
        event.user?.let { user ->
            event.user = User().apply {
                // Keep anonymized user ID (Telegram ID hash, not actual ID)
                id = user.id?.let { anonymizeUserId(it) }
                // Remove all other user data
                email = null
                username = null
                ipAddress = null
                data = null
            }
        }

        // Scrub PHI from tags
        event.tags?.let { tags ->
            val keysToRemove = tags.keys.filter { isPhiKey(it) }
            keysToRemove.forEach { tags.remove(it) }
        }

        // Scrub PHI from extra data
        event.contexts.entries.forEach { (_, context) ->
            if (context is MutableMap<*, *>) {
                @Suppress("UNCHECKED_CAST")
                val mutableContext = context as? MutableMap<String, Any?>
                mutableContext?.let { ctx ->
                    val keysToRemove = ctx.keys.filter { isPhiKey(it) }
                    keysToRemove.forEach { ctx.remove(it) }
                }
            }
        }

        // Scrub PHI from breadcrumbs
        event.breadcrumbs?.forEach { breadcrumb ->
            breadcrumb.data?.let { data ->
                val keysToRemove = data.keys.filter { isPhiKey(it) }
                keysToRemove.forEach { data.remove(it) }
            }
        }

        return event
    }

    /**
     * Check if a key might contain PHI
     */
    private fun isPhiKey(key: String): Boolean {
        val phiPatterns = listOf(
            "email", "name", "phone", "address", "dob", "birth",
            "ssn", "medical", "health", "diagnosis", "medication",
            "sleep", "heart", "hrv", "spo2", "oxygen", "respiratory",
            "weight", "height", "bmi", "temperature",
            "password", "token", "secret", "credential", "auth"
        )
        val lowerKey = key.lowercase()
        return phiPatterns.any { lowerKey.contains(it) }
    }

    /**
     * Anonymize user ID for HIPAA compliance
     * Uses first 8 chars of SHA-256 hash
     */
    private fun anonymizeUserId(userId: String): String {
        return try {
            val digest = java.security.MessageDigest.getInstance("SHA-256")
            val hash = digest.digest(userId.toByteArray())
            hash.take(4).joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            "anon"
        }
    }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .setMinimumLoggingLevel(
                if (BuildConfig.DEBUG) android.util.Log.DEBUG
                else android.util.Log.INFO
            )
            .build()

    /**
     * Lifecycle observer for HIPAA session timeout
     *
     * Checks session validity when app comes to foreground.
     * If session has timed out, user must re-authenticate.
     */
    private inner class SessionLifecycleObserver : DefaultLifecycleObserver {

        override fun onStart(owner: LifecycleOwner) {
            // App coming to foreground - check session timeout
            applicationScope.launch {
                sessionManager.checkSessionWithTimeout {
                    // Session timed out - this will be handled by the UI
                    // The MainActivity observes session state and shows login screen
                }
            }
        }

        override fun onStop(owner: LifecycleOwner) {
            // App going to background - no action needed
            // Session timer continues even when app is in background
        }
    }
}
