/**
 * SleepCore Companion - Domain Models
 * ====================================
 * Sleep data models aligned with:
 * - World Sleep Society 2025 Fundamental Sleep Measures
 * - Health Connect SleepSessionRecord structure
 * - Backend API schema (wearable.ts)
 */

package ru.sleepcore.companion.domain.model

import kotlinx.serialization.Serializable
import java.time.Instant

/**
 * Sleep stage types matching Health Connect specification
 * Based on: developer.android.com/health-and-fitness/health-connect/features/sleep-sessions
 */
enum class SleepStageType(val healthConnectValue: Int) {
    UNKNOWN(0),
    AWAKE(1),
    SLEEPING(2),
    OUT_OF_BED(3),
    AWAKE_IN_BED(4),
    LIGHT(5),
    DEEP(6),
    REM(7);

    companion object {
        fun fromHealthConnect(value: Int): SleepStageType =
            entries.find { it.healthConnectValue == value } ?: UNKNOWN

        fun fromString(value: String): SleepStageType =
            entries.find { it.name.equals(value, ignoreCase = true) } ?: UNKNOWN
    }
}

/**
 * Sleep stage with duration
 */
data class SleepStage(
    val type: SleepStageType,
    val startTime: Instant,
    val endTime: Instant
) {
    val durationMinutes: Long
        get() = java.time.Duration.between(startTime, endTime).toMinutes()
}

/**
 * HRV sample with quality indicator
 * Based on research: 80% validity threshold for 5-minute segments
 */
data class HrvSample(
    val timestamp: Instant,
    val rmssd: Double,
    val sdnn: Double? = null,
    val quality: Double? = null  // 0.0-1.0, >0.8 is valid
) {
    val isValid: Boolean
        get() = rmssd in 10.0..200.0 && (quality == null || quality >= 0.8)
}

/**
 * Heart rate sample
 */
data class HeartRateSample(
    val timestamp: Instant,
    val bpm: Int
)

/**
 * Complete sleep session from Health Connect
 * Includes all World Sleep Society 2025 Fundamental Sleep Measures
 */
data class SleepSession(
    val id: String,
    val source: String,  // e.g., "samsung_health", "fitbit", "oura"
    val startTime: Instant,
    val endTime: Instant,
    val stages: List<SleepStage> = emptyList(),
    val hrvSamples: List<HrvSample> = emptyList(),
    val heartRateSamples: List<HeartRateSample> = emptyList(),
    val restingHeartRate: Int? = null,
    val notes: String? = null
) {
    /**
     * Time In Bed (TIB) - Fundamental Sleep Measure
     */
    val tibMinutes: Long
        get() = java.time.Duration.between(startTime, endTime).toMinutes()

    /**
     * Total Sleep Time (TST) - Fundamental Sleep Measure
     * Sum of LIGHT + DEEP + REM stages
     */
    val tstMinutes: Long
        get() = stages
            .filter { it.type in listOf(SleepStageType.LIGHT, SleepStageType.DEEP, SleepStageType.REM, SleepStageType.SLEEPING) }
            .sumOf { it.durationMinutes }

    /**
     * Sleep Efficiency (SE) - Fundamental Sleep Measure
     * TST / TIB * 100
     */
    val sleepEfficiency: Double
        get() = if (tibMinutes > 0) (tstMinutes.toDouble() / tibMinutes) * 100 else 0.0

    /**
     * Wake After Sleep Onset (WASO) - Fundamental Sleep Measure
     */
    val wasoMinutes: Long
        get() = stages
            .filter { it.type in listOf(SleepStageType.AWAKE, SleepStageType.AWAKE_IN_BED, SleepStageType.OUT_OF_BED) }
            .sumOf { it.durationMinutes }

    /**
     * Number of awakenings - Fundamental Sleep Measure
     */
    val awakenings: Int
        get() {
            var count = 0
            var wasAsleep = false
            for (stage in stages) {
                val isAwake = stage.type in listOf(SleepStageType.AWAKE, SleepStageType.AWAKE_IN_BED, SleepStageType.OUT_OF_BED)
                if (isAwake && wasAsleep) count++
                wasAsleep = !isAwake
            }
            return count
        }

    /**
     * Mean HRV (RMSSD) - Quality indicator
     * Research: Valid samples require RMSSD 10-200ms, quality >0.8
     */
    val meanHrvRmssd: Double?
        get() {
            val validSamples = hrvSamples.filter { it.isValid }
            return if (validSamples.isNotEmpty()) {
                validSamples.map { it.rmssd }.average()
            } else null
        }

    /**
     * Stage distribution percentages
     */
    val stageDistribution: Map<SleepStageType, Double>
        get() {
            val totalStagedMinutes = stages.sumOf { it.durationMinutes }.toDouble()
            if (totalStagedMinutes <= 0) return emptyMap()

            return stages
                .groupBy { it.type }
                .mapValues { (_, stages) ->
                    (stages.sumOf { it.durationMinutes } / totalStagedMinutes) * 100
                }
        }
}

/**
 * Device info for linking
 */
@Serializable
data class DeviceInfo(
    val id: String,
    val name: String? = null,
    val manufacturer: String? = null,
    val model: String? = null,
    val osVersion: String? = null,
    val appVersion: String? = null
)

/**
 * Link code response from server
 */
@Serializable
data class LinkCodeResponse(
    val linkCode: String,
    val expiresAt: String,
    val expiresInSeconds: Int
)

/**
 * Link result from server
 */
@Serializable
data class LinkResult(
    val token: String,
    val expiresAt: String,
    val user: LinkedUser
)

@Serializable
data class LinkedUser(
    val id: String,
    val telegramId: Long,
    val firstName: String
)

/**
 * Sync status from server
 */
@Serializable
data class SyncStatus(
    val device: DeviceStatus,
    val stats: SyncStats,
    val recentSyncs: List<RecentSync>
)

@Serializable
data class DeviceStatus(
    val id: String,
    val name: String?,
    val manufacturer: String?,
    val model: String?,
    val linkedAt: String?,
    val lastSyncAt: String?
)

@Serializable
data class SyncStats(
    val totalSessions: Int,
    val sessionsLast7Days: Int,
    val lastSyncStatus: String?
)

@Serializable
data class RecentSync(
    val id: String,
    val type: String,
    val processed: Int,
    val status: String?,
    val completedAt: String?
)

/**
 * Sync result from server
 */
@Serializable
data class SyncResult(
    val processed: Int,
    val skipped: Int,
    val errors: List<SyncError>,
    val syncId: String,
    val nextSyncRecommended: String  // ISO 8601 duration
)

@Serializable
data class SyncError(
    val sessionId: String,
    val error: String
)
