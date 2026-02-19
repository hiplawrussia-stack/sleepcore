/**
 * Health Connect Manager
 * =======================
 * Manages all Health Connect interactions for sleep data.
 *
 * Based on research (February 2026):
 * - Health Connect Jetpack SDK 1.1.0 stable
 * - 8 sleep stage types supported
 * - HRV (RMSSD) available via HeartRateVariabilityRmssdRecord
 * - Background read requires Android 15+ and separate permission
 *
 * Data types collected (World Sleep Society 2025 FSM):
 * - Sleep sessions with stages
 * - Heart Rate Variability (RMSSD)
 * - Heart Rate during sleep
 * - Resting Heart Rate
 *
 * Sources:
 * - developer.android.com/health-and-fitness/health-connect
 * - pubmed.ncbi.nlm.nih.gov/40300398/ (World Sleep Society 2025)
 */

package ru.sleepcore.companion.health

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.RespiratoryRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SkinTemperatureRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.withContext
import ru.sleepcore.companion.domain.model.BreathingDisturbance
import ru.sleepcore.companion.domain.model.HeartRateSample
import ru.sleepcore.companion.domain.model.HrvSample
import ru.sleepcore.companion.domain.model.SleepSession
import ru.sleepcore.companion.domain.model.SleepStage
import ru.sleepcore.companion.domain.model.SleepStageType
import ru.sleepcore.companion.domain.model.SpO2Sample
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Health Connect availability status
 */
sealed class HealthConnectAvailability {
    data object Available : HealthConnectAvailability()
    data object NotInstalled : HealthConnectAvailability()
    data object NotSupported : HealthConnectAvailability()
    data class UpdateRequired(val intent: Intent?) : HealthConnectAvailability()
}

/**
 * Permission status
 */
data class HealthConnectPermissions(
    val sleepRead: Boolean = false,
    val hrvRead: Boolean = false,
    val heartRateRead: Boolean = false,
    val restingHeartRateRead: Boolean = false,
    val backgroundRead: Boolean = false,
    val historyRead: Boolean = false,
    // NEW (2025-02): Enhanced metrics permissions
    val spo2Read: Boolean = false,
    val respirationRateRead: Boolean = false,
    val skinTemperatureRead: Boolean = false
) {
    val hasMinimumPermissions: Boolean
        get() = sleepRead

    val hasFullPermissions: Boolean
        get() = sleepRead && hrvRead && heartRateRead && restingHeartRateRead

    /**
     * Has enhanced metrics permissions (SpO2, respiration, temperature)
     * These enable FDA-cleared sleep apnea screening indicators
     */
    val hasEnhancedMetrics: Boolean
        get() = spo2Read || respirationRateRead || skinTemperatureRead

    /**
     * Has all permissions including optional background/history
     */
    val hasAllPermissions: Boolean
        get() = hasFullPermissions && backgroundRead && historyRead && spo2Read && respirationRateRead && skinTemperatureRead

    /**
     * Can perform background sync (WorkManager)
     */
    val canSyncInBackground: Boolean
        get() = hasMinimumPermissions && backgroundRead

    val missingPermissions: Set<String>
        get() = buildSet {
            if (!sleepRead) add(HealthPermission.getReadPermission(SleepSessionRecord::class))
            if (!hrvRead) add(HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class))
            if (!heartRateRead) add(HealthPermission.getReadPermission(HeartRateRecord::class))
            if (!restingHeartRateRead) add(HealthPermission.getReadPermission(RestingHeartRateRecord::class))
        }

    /**
     * Missing optional permissions (background, history, enhanced metrics)
     */
    val missingOptionalPermissions: Set<String>
        get() = buildSet {
            if (!backgroundRead) add(HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND)
            if (!historyRead) add(HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY)
            if (!spo2Read) add(HealthPermission.getReadPermission(OxygenSaturationRecord::class))
            if (!respirationRateRead) add(HealthPermission.getReadPermission(RespiratoryRateRecord::class))
            if (!skinTemperatureRead) add(HealthPermission.getReadPermission(SkinTemperatureRecord::class))
        }
}

@Singleton
class HealthConnectManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "HealthConnectManager"

        /**
         * Required permissions for full functionality
         */
        val REQUIRED_PERMISSIONS = setOf(
            HealthPermission.getReadPermission(SleepSessionRecord::class),
            HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(RestingHeartRateRecord::class)
        )

        /**
         * NEW (2025-02): Optional permissions for enhanced metrics
         * SpO2, respiration rate, skin temperature
         * FDA-cleared sleep apnea screening metrics
         */
        val ENHANCED_METRICS_PERMISSIONS = setOf(
            HealthPermission.getReadPermission(OxygenSaturationRecord::class),
            HealthPermission.getReadPermission(RespiratoryRateRecord::class),
            HealthPermission.getReadPermission(SkinTemperatureRecord::class)
        )

        /**
         * Minimum permissions (sleep only)
         */
        val MINIMUM_PERMISSIONS = setOf(
            HealthPermission.getReadPermission(SleepSessionRecord::class)
        )

        /**
         * Background read permission (Android 15+)
         * Allows reading health data when app is in background
         * Source: https://developer.android.com/health-and-fitness/health-connect/read-data
         */
        val BACKGROUND_READ_PERMISSION = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND

        /**
         * History read permission
         * Allows reading historical data beyond 30 days
         */
        val HISTORY_READ_PERMISSION = HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY

        /**
         * Extended permissions including background and history read
         * Use this when requesting permissions for optimal background sync
         */
        val EXTENDED_PERMISSIONS = REQUIRED_PERMISSIONS + ENHANCED_METRICS_PERMISSIONS + setOf(
            BACKGROUND_READ_PERMISSION,
            HISTORY_READ_PERMISSION
        )

        /**
         * Map Health Connect stage types to our model
         */
        private fun mapStageType(stage: Int): SleepStageType = when (stage) {
            SleepSessionRecord.STAGE_TYPE_UNKNOWN -> SleepStageType.UNKNOWN
            SleepSessionRecord.STAGE_TYPE_AWAKE -> SleepStageType.AWAKE
            SleepSessionRecord.STAGE_TYPE_SLEEPING -> SleepStageType.SLEEPING
            SleepSessionRecord.STAGE_TYPE_OUT_OF_BED -> SleepStageType.OUT_OF_BED
            SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED -> SleepStageType.AWAKE_IN_BED
            SleepSessionRecord.STAGE_TYPE_LIGHT -> SleepStageType.LIGHT
            SleepSessionRecord.STAGE_TYPE_DEEP -> SleepStageType.DEEP
            SleepSessionRecord.STAGE_TYPE_REM -> SleepStageType.REM
            else -> SleepStageType.UNKNOWN
        }
    }

    private var healthConnectClient: HealthConnectClient? = null

    /**
     * Check Health Connect availability
     * Based on: developer.android.com/health-and-fitness/guides/health-connect/plan/availability
     */
    fun checkAvailability(): HealthConnectAvailability {
        val status = HealthConnectClient.getSdkStatus(context)
        return when (status) {
            HealthConnectClient.SDK_AVAILABLE -> {
                healthConnectClient = HealthConnectClient.getOrCreate(context)
                HealthConnectAvailability.Available
            }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                val intent = try {
                    context.packageManager.getLaunchIntentForPackage("com.google.android.apps.healthdata")
                } catch (e: Exception) {
                    null
                }
                HealthConnectAvailability.UpdateRequired(intent)
            }
            HealthConnectClient.SDK_UNAVAILABLE -> {
                // Check if it's a version issue
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
                    HealthConnectAvailability.NotSupported
                } else {
                    HealthConnectAvailability.NotInstalled
                }
            }
            else -> HealthConnectAvailability.NotSupported
        }
    }

    /**
     * Get current permission status
     */
    suspend fun checkPermissions(): HealthConnectPermissions = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext HealthConnectPermissions()

        val granted = client.permissionController.getGrantedPermissions()

        // Check background read permission (Android 15+ feature)
        val backgroundReadGranted = checkBackgroundReadPermission(client, granted)

        // Check history read permission
        val historyReadGranted = granted.contains(HISTORY_READ_PERMISSION)

        HealthConnectPermissions(
            sleepRead = granted.contains(HealthPermission.getReadPermission(SleepSessionRecord::class)),
            hrvRead = granted.contains(HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class)),
            heartRateRead = granted.contains(HealthPermission.getReadPermission(HeartRateRecord::class)),
            restingHeartRateRead = granted.contains(HealthPermission.getReadPermission(RestingHeartRateRecord::class)),
            backgroundRead = backgroundReadGranted,
            historyRead = historyReadGranted,
            // NEW (2025-02): Enhanced metrics permissions
            spo2Read = granted.contains(HealthPermission.getReadPermission(OxygenSaturationRecord::class)),
            respirationRateRead = granted.contains(HealthPermission.getReadPermission(RespiratoryRateRecord::class)),
            skinTemperatureRead = granted.contains(HealthPermission.getReadPermission(SkinTemperatureRecord::class))
        )
    }

    /**
     * Check if background read permission is granted
     * Background read requires:
     * 1. Android 15+ (API 35+) OR Health Connect with feature support
     * 2. Feature must be available on device
     * 3. Permission must be granted
     *
     * Source: https://developer.android.com/health-and-fitness/health-connect/read-data
     */
    private suspend fun checkBackgroundReadPermission(
        client: HealthConnectClient,
        grantedPermissions: Set<String>
    ): Boolean {
        return try {
            // First check if the feature is available
            val featureStatus = client.features.getFeatureStatus(
                HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND
            )

            if (featureStatus != HealthConnectFeatures.FEATURE_STATUS_AVAILABLE) {
                Log.d(TAG, "Background read feature not available (status: $featureStatus)")
                return false
            }

            // Feature is available, check if permission is granted
            val isGranted = grantedPermissions.contains(BACKGROUND_READ_PERMISSION)
            Log.d(TAG, "Background read permission granted: $isGranted")
            isGranted
        } catch (e: Exception) {
            Log.w(TAG, "Error checking background read permission", e)
            false
        }
    }

    /**
     * Check if background read feature is available on this device
     * Useful for UI to show/hide background sync options
     */
    suspend fun isBackgroundReadFeatureAvailable(): Boolean = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext false

        try {
            val featureStatus = client.features.getFeatureStatus(
                HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND
            )
            featureStatus == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
        } catch (e: Exception) {
            Log.w(TAG, "Error checking background read feature availability", e)
            false
        }
    }

    /**
     * Check if history read feature is available on this device
     */
    suspend fun isHistoryReadFeatureAvailable(): Boolean = withContext(Dispatchers.IO) {
        val client = healthConnectClient ?: return@withContext false

        try {
            val featureStatus = client.features.getFeatureStatus(
                HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_HISTORY
            )
            featureStatus == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
        } catch (e: Exception) {
            Log.w(TAG, "Error checking history read feature availability", e)
            false
        }
    }

    /**
     * Create permission request contract
     */
    fun createPermissionContract() = PermissionController.createRequestPermissionResultContract()

    /**
     * Read sleep sessions from Health Connect
     *
     * @param startTime Start of time range
     * @param endTime End of time range
     * @return List of sleep sessions with stages, HRV, and heart rate data
     */
    /**
     * PERFORMANCE FIX (Feb 2026): Parallelized Health Connect reads
     * Previous: Sequential reads = 7 round-trips
     * Current: Parallel reads = 1 round-trip (all in parallel)
     * Source: Kotlin Coroutines Best Practices 2025
     */
    suspend fun readSleepSessions(
        startTime: Instant,
        endTime: Instant
    ): Result<List<SleepSession>> = withContext(Dispatchers.IO) {
        try {
            val client = healthConnectClient
                ?: return@withContext Result.failure(IllegalStateException("Health Connect not available"))

            val timeFilter = TimeRangeFilter.between(startTime, endTime)

            // PERFORMANCE: Run all Health Connect reads in parallel using coroutineScope + async
            // This reduces latency from O(n) to O(1) for n data types
            val sessions = kotlinx.coroutines.coroutineScope {
                // Primary: Sleep sessions (required)
                val sleepDeferred = async {
                    client.readRecords(ReadRecordsRequest(
                        recordType = SleepSessionRecord::class,
                        timeRangeFilter = timeFilter
                    ))
                }

                // HRV data
                val hrvDeferred = async {
                    try {
                        client.readRecords(ReadRecordsRequest(
                            recordType = HeartRateVariabilityRmssdRecord::class,
                            timeRangeFilter = timeFilter
                        ))
                    } catch (e: Exception) {
                        null  // HRV might not be available
                    }
                }

                // Heart rate data
                val hrDeferred = async {
                    try {
                        client.readRecords(ReadRecordsRequest(
                            recordType = HeartRateRecord::class,
                            timeRangeFilter = timeFilter
                        ))
                    } catch (e: Exception) {
                        null
                    }
                }

                // Resting heart rate
                val restingHrDeferred = async {
                    try {
                        client.readRecords(ReadRecordsRequest(
                            recordType = RestingHeartRateRecord::class,
                            timeRangeFilter = timeFilter
                        ))
                    } catch (e: Exception) {
                        null
                    }
                }

                // SpO2 / Blood Oxygen data
                val spo2Deferred = async {
                    try {
                        client.readRecords(ReadRecordsRequest(
                            recordType = OxygenSaturationRecord::class,
                            timeRangeFilter = timeFilter
                        ))
                    } catch (e: Exception) {
                        Log.d(TAG, "SpO2 data not available: ${e.message}")
                        null
                    }
                }

                // Respiration rate data
                val respirationDeferred = async {
                    try {
                        client.readRecords(ReadRecordsRequest(
                            recordType = RespiratoryRateRecord::class,
                            timeRangeFilter = timeFilter
                        ))
                    } catch (e: Exception) {
                        Log.d(TAG, "Respiration rate data not available: ${e.message}")
                        null
                    }
                }

                // Skin temperature data
                val skinTempDeferred = async {
                    try {
                        client.readRecords(ReadRecordsRequest(
                            recordType = SkinTemperatureRecord::class,
                            timeRangeFilter = timeFilter
                        ))
                    } catch (e: Exception) {
                        Log.d(TAG, "Skin temperature data not available: ${e.message}")
                        null
                    }
                }

                // Await all results
                val sleepResponse = sleepDeferred.await()
                val hrvResponse = hrvDeferred.await()
                val hrResponse = hrDeferred.await()
                val restingHrResponse = restingHrDeferred.await()
                val spo2Response = spo2Deferred.await()
                val respirationResponse = respirationDeferred.await()
                val skinTempResponse = skinTempDeferred.await()

                // Map to domain models (inside coroutineScope to access responses)
                sleepResponse.records.map { record ->
                val sessionStart = record.startTime
                val sessionEnd = record.endTime

                // Get HRV samples for this session
                val hrvSamples = hrvResponse?.records
                    ?.filter { it.time >= sessionStart && it.time <= sessionEnd }
                    ?.map { hrv ->
                        HrvSample(
                            timestamp = hrv.time,
                            rmssd = hrv.heartRateVariabilityMillis,
                            quality = null  // Health Connect doesn't provide quality
                        )
                    } ?: emptyList()

                // Get heart rate samples for this session
                val heartRateSamples = hrResponse?.records
                    ?.filter { it.startTime >= sessionStart && it.endTime <= sessionEnd }
                    ?.flatMap { hr ->
                        hr.samples.map { sample ->
                            HeartRateSample(
                                timestamp = sample.time,
                                bpm = sample.beatsPerMinute.toInt()
                            )
                        }
                    } ?: emptyList()

                // Get resting heart rate (most recent before session)
                val restingHr = restingHrResponse?.records
                    ?.filter { it.time <= sessionStart }
                    ?.maxByOrNull { it.time }
                    ?.beatsPerMinute
                    ?.toInt()

                // NEW (2025-02): Get SpO2 samples for this session
                val spo2Samples = spo2Response?.records
                    ?.filter { it.time >= sessionStart && it.time <= sessionEnd }
                    ?.map { spo2 ->
                        SpO2Sample(
                            timestamp = spo2.time,
                            percentage = spo2.percentage.value
                        )
                    } ?: emptyList()

                // NEW (2025-02): Get respiration rate for this session
                val respirationRate = respirationResponse?.records
                    ?.filter { it.time >= sessionStart && it.time <= sessionEnd }
                    ?.map { it.rate }
                    ?.average()
                    ?.takeIf { !it.isNaN() }

                // NEW (2025-02): Get skin temperature deviation for this session
                // SkinTemperatureRecord is an IntervalRecord with startTime/endTime
                val skinTemperature = skinTempResponse?.records
                    ?.filter { it.startTime >= sessionStart && it.endTime <= sessionEnd }
                    ?.mapNotNull { record ->
                        // Get the first delta value (deviation from baseline)
                        record.deltas.firstOrNull()?.delta?.inCelsius
                    }
                    ?.average()
                    ?.takeIf { !it.isNaN() }

                // Map stages
                val stages = record.stages.map { stage ->
                    SleepStage(
                        type = mapStageType(stage.stage),
                        startTime = stage.startTime,
                        endTime = stage.endTime
                    )
                }

                // Determine source from metadata
                val source = record.metadata.dataOrigin.packageName
                    .substringAfterLast(".")
                    .replace("health", "")
                    .ifEmpty { "unknown" }

                SleepSession(
                    id = record.metadata.id,
                    source = source,
                    startTime = sessionStart,
                    endTime = sessionEnd,
                    stages = stages,
                    hrvSamples = hrvSamples,
                    heartRateSamples = heartRateSamples,
                    restingHeartRate = restingHr,
                    notes = record.title,
                    // NEW (2025-02): Enhanced metrics
                    spo2Samples = spo2Samples,
                    respirationRate = respirationRate,
                    skinTemperature = skinTemperature
                )
            }
            } // end coroutineScope

            Result.success(sessions)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Read sleep sessions since last sync
     */
    suspend fun readSessionsSinceLastSync(
        lastSyncTime: Instant?
    ): Result<List<SleepSession>> {
        val startTime = lastSyncTime ?: Instant.now().minusSeconds(30L * 24 * 60 * 60)  // 30 days
        val endTime = Instant.now()
        return readSleepSessions(startTime, endTime)
    }

    /**
     * Check if any new sessions are available
     */
    suspend fun hasNewSessions(lastSyncTime: Instant): Boolean = withContext(Dispatchers.IO) {
        try {
            val client = healthConnectClient ?: return@withContext false

            val request = ReadRecordsRequest(
                recordType = SleepSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.after(lastSyncTime)
            )
            val response = client.readRecords(request)
            response.records.isNotEmpty()
        } catch (e: Exception) {
            false
        }
    }
}
