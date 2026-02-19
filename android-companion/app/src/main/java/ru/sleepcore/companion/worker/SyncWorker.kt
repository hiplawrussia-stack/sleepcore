/**
 * Background Sync Worker
 * =======================
 * WorkManager worker for periodic background sync.
 *
 * Based on research (February 2026):
 * - WorkManager minimum interval: 15 minutes
 * - Respects Doze mode and battery optimization
 * - Uses constraints for network and battery
 * - CoroutineWorker preferred over Worker for Kotlin
 * - Automatic cancellation handling via coroutines
 *
 * Android 15+ enables background Health Connect reads.
 *
 * Sources:
 * - developer.android.com/topic/libraries/architecture/workmanager
 * - medium.com/@hiren6997/workmanager-in-2025-5-patterns-that-actually-work-in-production
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import ru.sleepcore.companion.data.repository.SleepRepository
import ru.sleepcore.companion.health.HealthConnectAvailability
import ru.sleepcore.companion.health.HealthConnectManager
import ru.sleepcore.companion.util.ErrorContext
import ru.sleepcore.companion.util.ErrorLogger
import ru.sleepcore.companion.util.ErrorSeverity
import java.util.concurrent.TimeUnit

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val sleepRepository: SleepRepository,
    private val healthConnectManager: HealthConnectManager
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val WORK_NAME = "sleepcore_sync"
        const val TAG = "SyncWorker"

        /**
         * Minimum sync interval (WorkManager limitation)
         * Based on research: WorkManager clamps to 15 minutes minimum
         */
        const val SYNC_INTERVAL_MINUTES = 15L

        /**
         * Create periodic sync work request
         */
        fun createPeriodicWorkRequest(): PeriodicWorkRequest {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()

            return PeriodicWorkRequestBuilder<SyncWorker>(
                SYNC_INTERVAL_MINUTES, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .addTag(WORK_NAME)
                .build()
        }

        /**
         * Create one-time sync work request
         */
        fun createOneTimeSyncRequest(): OneTimeWorkRequest {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            return OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .addTag(WORK_NAME)
                .build()
        }

        /**
         * Schedule periodic sync
         */
        fun schedulePeriodicSync(context: Context) {
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    createPeriodicWorkRequest()
                )
            ErrorLogger.log(
                severity = ErrorSeverity.INFO,
                context = ErrorContext(TAG, "schedulePeriodicSync"),
                message = "Periodic sync scheduled (every $SYNC_INTERVAL_MINUTES minutes)"
            )
        }

        /**
         * Cancel periodic sync
         */
        fun cancelPeriodicSync(context: Context) {
            WorkManager.getInstance(context)
                .cancelUniqueWork(WORK_NAME)
            ErrorLogger.log(
                severity = ErrorSeverity.INFO,
                context = ErrorContext(TAG, "cancelPeriodicSync"),
                message = "Periodic sync cancelled"
            )
        }

        /**
         * Trigger immediate sync
         */
        fun triggerImmediateSync(context: Context) {
            WorkManager.getInstance(context)
                .enqueue(createOneTimeSyncRequest())
            ErrorLogger.log(
                severity = ErrorSeverity.INFO,
                context = ErrorContext(TAG, "triggerImmediateSync"),
                message = "Immediate sync triggered"
            )
        }
    }

    override suspend fun doWork(): Result {
        ErrorLogger.log(
            severity = ErrorSeverity.DEBUG,
            context = ErrorContext(TAG, "doWork"),
            message = "Starting background sync work"
        )

        // Check if linked
        if (!sleepRepository.isLinked()) {
            ErrorLogger.log(
                severity = ErrorSeverity.DEBUG,
                context = ErrorContext(TAG, "doWork"),
                message = "Device not linked, skipping sync"
            )
            return Result.success()
        }

        // Check Health Connect availability
        when (healthConnectManager.checkAvailability()) {
            is HealthConnectAvailability.Available -> {
                // OK
            }
            else -> {
                ErrorLogger.log(
                    severity = ErrorSeverity.WARNING,
                    context = ErrorContext(TAG, "doWork"),
                    message = "Health Connect not available, will retry"
                )
                return Result.retry()
            }
        }

        // Check permissions
        val permissions = healthConnectManager.checkPermissions()
        if (!permissions.hasMinimumPermissions) {
            ErrorLogger.logPermissions(
                granted = false,
                permissionType = "minimum",
                details = "User needs to grant permissions manually"
            )
            return Result.success()  // Don't retry - user needs to grant permissions
        }

        // Perform sync
        val syncResult = sleepRepository.syncSessions(syncType = "background")

        return when {
            syncResult.isSuccess -> {
                val data = syncResult.getOrThrow()
                ErrorLogger.logSync(
                    success = true,
                    operation = "background",
                    processed = data.processed,
                    skipped = data.skipped
                )
                Result.success()
            }
            else -> {
                val exception = syncResult.exceptionOrNull()
                val error = exception?.message ?: "Unknown error"
                ErrorLogger.logSync(
                    success = false,
                    operation = "background",
                    error = error,
                    throwable = exception
                )

                when (error) {
                    "NO_NEW_DATA" -> Result.success()  // No data is OK
                    "TOKEN_EXPIRED" -> Result.failure()  // Need re-auth
                    "NOT_LINKED" -> Result.success()  // Not linked is OK
                    else -> Result.retry()  // Retry on other errors (with exponential backoff)
                }
            }
        }
    }
}
