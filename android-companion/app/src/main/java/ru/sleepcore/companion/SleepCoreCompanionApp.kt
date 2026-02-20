/**
 * SleepCore Companion Application
 * =================================
 * Main application class with Hilt and WorkManager initialization.
 *
 * Features:
 * - WorkManager for background sync
 * - Session timeout monitoring (HIPAA compliance)
 * - Audit logging initialization
 */

package ru.sleepcore.companion

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.work.Configuration
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import ru.sleepcore.companion.security.SessionManager
import javax.inject.Inject

@HiltAndroidApp
class SleepCoreCompanionApp : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    @Inject
    lateinit var sessionManager: SessionManager

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun onCreate() {
        super.onCreate()

        // Register lifecycle observer for session management
        ProcessLifecycleOwner.get().lifecycle.addObserver(SessionLifecycleObserver())
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
