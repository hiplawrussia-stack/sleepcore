/**
 * SleepCore API Client
 * =====================
 * Retrofit interface for backend wearable API.
 *
 * Endpoints match api/src/routes/wearable.ts:
 * - POST /link - Device linking with 6-char code
 * - POST /sync - Sleep session sync
 * - GET /status - Device and sync status
 * - DELETE /unlink - Device unlinking
 */

package ru.sleepcore.companion.data.api

import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.*

/**
 * Base API response wrapper
 */
@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: String? = null,
    val timestamp: Long
)

/**
 * Link device request
 */
@Serializable
data class LinkDeviceRequest(
    val linkCode: String,
    val device: DeviceDto
)

@Serializable
data class DeviceDto(
    val id: String,
    val name: String? = null,
    val manufacturer: String? = null,
    val model: String? = null,
    val osVersion: String? = null,
    val appVersion: String? = null
)

/**
 * Link response
 */
@Serializable
data class LinkResponseDto(
    val token: String,
    val expiresAt: String,
    val user: UserDto
)

@Serializable
data class UserDto(
    val id: String,
    val telegramId: Long,
    val firstName: String
)

/**
 * Sync request matching backend schema
 */
@Serializable
data class SyncRequest(
    val syncType: String = "manual",  // manual, background, initial
    val lastSyncTime: String? = null,
    val sleepSessions: List<SleepSessionDto>
)

@Serializable
data class SleepSessionDto(
    val sessionId: String,
    val source: String,
    val startTime: String,
    val endTime: String,
    val notes: String? = null,
    val stages: List<StageDto>? = null,
    val hrv: List<HrvDto>? = null,
    val heartRate: List<HeartRateDto>? = null,
    val restingHeartRate: Int? = null
)

@Serializable
data class StageDto(
    val type: String,
    val startTime: String,
    val endTime: String
)

@Serializable
data class HrvDto(
    val timestamp: String,
    val rmssd: Double,
    val sdnn: Double? = null,
    val quality: Double? = null
)

@Serializable
data class HeartRateDto(
    val timestamp: String,
    val bpm: Int
)

/**
 * Sync response
 */
@Serializable
data class SyncResponseDto(
    val processed: Int,
    val skipped: Int,
    val errors: List<SyncErrorDto>,
    val syncId: String,
    val nextSyncRecommended: String
)

@Serializable
data class SyncErrorDto(
    val sessionId: String,
    val error: String
)

/**
 * Status response
 */
@Serializable
data class StatusResponseDto(
    val device: DeviceStatusDto,
    val stats: StatsDto,
    val recentSyncs: List<RecentSyncDto>
)

@Serializable
data class DeviceStatusDto(
    val id: String,
    val name: String?,
    val manufacturer: String?,
    val model: String?,
    val linkedAt: String?,
    val lastSyncAt: String?
)

@Serializable
data class StatsDto(
    val totalSessions: Int,
    val sessionsLast7Days: Int,
    val lastSyncStatus: String?
)

@Serializable
data class RecentSyncDto(
    val id: String,
    val type: String,
    val processed: Int,
    val status: String?,
    val completedAt: String?
)

/**
 * Unlink response
 */
@Serializable
data class UnlinkResponseDto(
    val unlinked: Boolean
)

/**
 * SleepCore Wearable API interface
 */
interface SleepCoreApi {

    /**
     * Link device using 6-character code
     * POST /api/wearable/link
     */
    @POST("wearable/link")
    suspend fun linkDevice(
        @Body request: LinkDeviceRequest
    ): Response<ApiResponse<LinkResponseDto>>

    /**
     * Sync sleep sessions
     * POST /api/wearable/sync
     * Requires: Bearer token in Authorization header
     */
    @POST("wearable/sync")
    suspend fun syncSessions(
        @Header("Authorization") token: String,
        @Body request: SyncRequest
    ): Response<ApiResponse<SyncResponseDto>>

    /**
     * Get device and sync status
     * GET /api/wearable/status
     * Requires: Bearer token in Authorization header
     */
    @GET("wearable/status")
    suspend fun getStatus(
        @Header("Authorization") token: String
    ): Response<ApiResponse<StatusResponseDto>>

    /**
     * Unlink device
     * DELETE /api/wearable/unlink
     * Requires: Bearer token in Authorization header
     */
    @DELETE("wearable/unlink")
    suspend fun unlinkDevice(
        @Header("Authorization") token: String
    ): Response<ApiResponse<UnlinkResponseDto>>
}
