/**
 * Background Sync Worker
 * =======================
 * WorkManager worker for periodic background sync.
 *
 * Based on research (February 2026):
 * - WorkManager minimum interval: 15 minutes
 * - Respects Doze mode and battery optimization
 * - Uses constraints for network and battery
 *
 * Android 15+ enables background Health Connect reads.
 *
 * Source: developer.android.com/topic/libraries/architecture/workmanager
 */

package ru.sleepcore.companion.worker

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import ru.sleepcore.companion.data.repository.SleepRepository
import ru.sleepcore.companion.health.HealthConnectAvailability
import ru.sleepcore.companion.health.HealthConnectManager
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
            Log.i(TAG, "Periodic sync scheduled (every $SYNC_INTERVAL_MINUTES minutes)")
        }

        /**
         * Cancel periodic sync
         */
        fun cancelPeriodicSync(context: Context) {
            WorkManager.getInstance(context)
                .cancelUniqueWork(WORK_NAME)
            Log.i(TAG, "Periodic sync cancelled")
        }

        /**
         * Trigger immediate sync
         */
        fun triggerImmediateSync(context: Context) {
            WorkManager.getInstance(context)
                .enqueue(createOneTimeSyncRequest())
            Log.i(TAG, "Immediate sync triggered")
        }
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "Starting sync work")

        // Check if linked
        if (!sleepRepository.isLinked()) {
            Log.w(TAG, "Device not linked, skipping sync")
            return Result.success()
        }

        // Check Health Connect availability
        when (healthConnectManager.checkAvailability()) {
            is HealthConnectAvailability.Available -> {
                // OK
            }
            else -> {
                Log.w(TAG, "Health Connect not available")
                return Result.retry()
            }
        }

        // Check permissions
        val permissions = healthConnectManager.checkPermissions()
        if (!permissions.hasMinimumPermissions) {
            Log.w(TAG, "Missing Health Connect permissions")
            return Result.success()  // Don't retry - user needs to grant permissions
        }

        // Perform sync
        val syncResult = sleepRepository.syncSessions(syncType = "background")

        return when {
            syncResult.isSuccess -> {
                val data = syncResult.getOrThrow()
                Log.i(TAG, "Sync completed: processed=${data.processed}, skipped=${data.skipped}")
                Result.success()
            }
            else -> {
                val error = syncResult.exceptionOrNull()?.message ?: "Unknown error"
                Log.e(TAG, "Sync failed: $error")

                when (error) {
                    "NO_NEW_DATA" -> Result.success()  // No data is OK
                    "TOKEN_EXPIRED" -> Result.failure()  // Need re-auth
                    "NOT_LINKED" -> Result.success()  // Not linked is OK
                    else -> Result.retry()  // Retry on other errors
                }
            }
        }
    }
}
