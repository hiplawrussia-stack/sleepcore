/**
 * Sleep Repository
 * ==================
 * Orchestrates data flow between Health Connect, API, and local storage.
 *
 * Responsibilities:
 * - Read sleep data from Health Connect
 * - Sync to backend API
 * - Track sync state
 * - Handle errors and retries
 */

package ru.sleepcore.companion.data.repository

import ru.sleepcore.companion.data.api.*
import ru.sleepcore.companion.data.local.TokenStorage
import ru.sleepcore.companion.domain.model.*
import ru.sleepcore.companion.health.HealthConnectManager
import java.time.Instant
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

sealed class LinkError {
    data object InvalidCode : LinkError()
    data object ExpiredCode : LinkError()
    data object NetworkError : LinkError()
    data class ServerError(val message: String) : LinkError()
}

sealed class SyncError {
    data object NotLinked : SyncError()
    data object TokenExpired : SyncError()
    data object HealthConnectUnavailable : SyncError()
    data object NoPermissions : SyncError()
    data object NoNewData : SyncError()
    data object NetworkError : SyncError()
    data class ServerError(val message: String) : SyncError()
}

@Singleton
class SleepRepository @Inject constructor(
    private val api: SleepCoreApi,
    private val tokenStorage: TokenStorage,
    private val healthConnectManager: HealthConnectManager
) {
    /**
     * Link device using 6-character code
     */
    suspend fun linkDevice(
        linkCode: String,
        deviceInfo: DeviceInfo
    ): Result<LinkResult> {
        return try {
            val request = LinkDeviceRequest(
                linkCode = linkCode.uppercase().trim(),
                device = DeviceDto(
                    id = deviceInfo.id,
                    name = deviceInfo.name,
                    manufacturer = deviceInfo.manufacturer,
                    model = deviceInfo.model,
                    osVersion = deviceInfo.osVersion,
                    appVersion = deviceInfo.appVersion
                )
            )

            val response = api.linkDevice(request)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()!!.data!!

                // Save credentials (with refresh token if available)
                tokenStorage.saveCredentials(
                    token = data.getAccessToken(),
                    expiresAt = data.getAccessTokenExpiresAt(),
                    userId = data.user.id,
                    telegramId = data.user.telegramId,
                    userName = data.user.firstName,
                    deviceId = deviceInfo.id,
                    refreshToken = data.refreshToken
                )

                Result.success(
                    LinkResult(
                        token = data.token,
                        expiresAt = data.expiresAt,
                        user = LinkedUser(
                            id = data.user.id,
                            telegramId = data.user.telegramId,
                            firstName = data.user.firstName
                        )
                    )
                )
            } else {
                val error = response.body()?.error ?: "Unknown error"
                when {
                    error.contains("Invalid", ignoreCase = true) -> Result.failure(Exception("INVALID_CODE"))
                    error.contains("expired", ignoreCase = true) -> Result.failure(Exception("EXPIRED_CODE"))
                    else -> Result.failure(Exception(error))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Sync sleep sessions to backend
     */
    suspend fun syncSessions(
        syncType: String = "manual"
    ): Result<SyncResult> {
        // Check if linked (with automatic token refresh)
        val token = getValidBearerToken()
            ?: return Result.failure(Exception("NOT_LINKED"))

        // Get last sync time
        val lastSyncTime = tokenStorage.getLastSyncTime()

        // Read from Health Connect
        val sessionsResult = healthConnectManager.readSessionsSinceLastSync(lastSyncTime)
        if (sessionsResult.isFailure) {
            return Result.failure(sessionsResult.exceptionOrNull() ?: Exception("Health Connect error"))
        }

        val sessions = sessionsResult.getOrThrow()
        if (sessions.isEmpty()) {
            return Result.failure(Exception("NO_NEW_DATA"))
        }

        // Convert to API format (including new 2025-02 metrics)
        val sessionDtos = sessions.map { session ->
            SleepSessionDto(
                sessionId = session.id,
                source = session.source,
                startTime = session.startTime.toString(),
                endTime = session.endTime.toString(),
                notes = session.notes,
                stages = session.stages.map { stage ->
                    StageDto(
                        type = stage.type.name.lowercase(),
                        startTime = stage.startTime.toString(),
                        endTime = stage.endTime.toString()
                    )
                }.takeIf { it.isNotEmpty() },
                hrv = session.hrvSamples.map { hrv ->
                    HrvDto(
                        timestamp = hrv.timestamp.toString(),
                        rmssd = hrv.rmssd,
                        sdnn = hrv.sdnn,
                        quality = hrv.quality
                    )
                }.takeIf { it.isNotEmpty() },
                heartRate = session.heartRateSamples.map { hr ->
                    HeartRateDto(
                        timestamp = hr.timestamp.toString(),
                        bpm = hr.bpm
                    )
                }.takeIf { it.isNotEmpty() },
                restingHeartRate = session.restingHeartRate,
                // NEW (2025-02): Advanced wearable metrics
                spo2 = session.spo2Samples.map { sample ->
                    SpO2Dto(
                        timestamp = sample.timestamp.toString(),
                        percentage = sample.percentage
                    )
                }.takeIf { it.isNotEmpty() },
                breathingDisturbances = session.breathingDisturbances.map { disturbance ->
                    BreathingDisturbanceDto(
                        timestamp = disturbance.timestamp.toString(),
                        durationSeconds = disturbance.durationSeconds
                    )
                }.takeIf { it.isNotEmpty() },
                respirationRate = session.respirationRate,
                skinTemperature = session.skinTemperature
            )
        }

        // Send to API
        return try {
            val request = SyncRequest(
                syncType = syncType,
                lastSyncTime = lastSyncTime?.toString(),
                sleepSessions = sessionDtos
            )

            val response = api.syncSessions(token, request)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()!!.data!!

                // Update last sync time
                tokenStorage.saveLastSyncTime(Instant.now())

                Result.success(
                    SyncResult(
                        processed = data.processed,
                        skipped = data.skipped,
                        errors = data.errors.map { SyncError(it.sessionId, it.error) },
                        syncId = data.syncId,
                        nextSyncRecommended = data.nextSyncRecommended
                    )
                )
            } else {
                val error = response.body()?.error ?: "Sync failed"
                when (response.code()) {
                    401 -> Result.failure(Exception("TOKEN_EXPIRED"))
                    else -> Result.failure(Exception(error))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get sync status from backend
     */
    suspend fun getSyncStatus(): Result<SyncStatus> {
        // Check if linked (with automatic token refresh)
        val token = getValidBearerToken()
            ?: return Result.failure(Exception("NOT_LINKED"))

        return try {
            val response = api.getStatus(token)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()!!.data!!
                Result.success(
                    SyncStatus(
                        device = DeviceStatus(
                            id = data.device.id,
                            name = data.device.name,
                            manufacturer = data.device.manufacturer,
                            model = data.device.model,
                            linkedAt = data.device.linkedAt,
                            lastSyncAt = data.device.lastSyncAt
                        ),
                        stats = SyncStats(
                            totalSessions = data.stats.totalSessions,
                            sessionsLast7Days = data.stats.sessionsLast7Days,
                            lastSyncStatus = data.stats.lastSyncStatus
                        ),
                        recentSyncs = data.recentSyncs.map { sync ->
                            RecentSync(
                                id = sync.id,
                                type = sync.type,
                                processed = sync.processed,
                                status = sync.status,
                                completedAt = sync.completedAt
                            )
                        }
                    )
                )
            } else {
                // BUG-05 FIX: Consistent HTTP 401 handling across all API calls
                val error = response.body()?.error ?: "Failed to get status"
                when (response.code()) {
                    401 -> Result.failure(Exception("TOKEN_EXPIRED"))
                    else -> Result.failure(Exception(error))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Unlink device
     */
    suspend fun unlinkDevice(): Result<Boolean> {
        val token = tokenStorage.getBearerToken()

        // Clear local credentials first
        tokenStorage.clearCredentials()

        // If we have a token, try to notify the server
        if (token != null) {
            try {
                api.unlinkDevice(token)
            } catch (e: Exception) {
                // Ignore server errors during unlink - local state is already cleared
            }
        }

        return Result.success(true)
    }

    /**
     * Check if device is linked
     */
    fun isLinked(): Boolean = tokenStorage.isLinked()

    /**
     * Get stored credentials
     */
    fun getCredentials() = tokenStorage.loadCredentials()

    /**
     * Get credentials flow for observing changes
     */
    fun observeCredentials() = tokenStorage.credentialsFlow

    /**
     * Refresh access token using refresh token
     *
     * Token rotation: Each refresh invalidates the old refresh token
     * and returns a new one. This is a security feature that detects
     * token theft (RFC 9700).
     *
     * @return true if refresh succeeded, false otherwise
     */
    suspend fun refreshAccessToken(): Boolean {
        val refreshToken = tokenStorage.getRefreshToken()
            ?: return false

        return try {
            val request = RefreshTokenRequest(
                grantType = "refresh_token",
                refreshToken = refreshToken
            )

            val response = api.refreshToken(request)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()!!.data!!

                // Update tokens with rotation
                tokenStorage.updateTokens(
                    accessToken = data.accessToken,
                    expiresIn = data.expiresIn,
                    refreshToken = data.refreshToken  // New rotated refresh token
                )

                true
            } else {
                // Refresh failed - user needs to re-link
                false
            }
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Get valid bearer token, refreshing if necessary
     *
     * @return Bearer token string or null if not linked/refresh failed
     */
    private suspend fun getValidBearerToken(): String? {
        val credentials = tokenStorage.loadCredentials()
            ?: return null

        // If token is expiring soon, try to refresh
        if (credentials.isExpiringSoon && credentials.canRefresh) {
            if (refreshAccessToken()) {
                // Get updated token after refresh
                return tokenStorage.getBearerToken()
            }
        }

        // Return current token if not expired
        return if (!credentials.isExpired) {
            "Bearer ${credentials.token}"
        } else if (credentials.canRefresh) {
            // Token expired but we can refresh
            if (refreshAccessToken()) {
                tokenStorage.getBearerToken()
            } else {
                null
            }
        } else {
            null
        }
    }
}
