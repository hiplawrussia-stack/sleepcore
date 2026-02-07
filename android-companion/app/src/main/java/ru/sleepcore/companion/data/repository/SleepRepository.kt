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

                // Save credentials
                tokenStorage.saveCredentials(
                    token = data.token,
                    expiresAt = data.expiresAt,
                    userId = data.user.id,
                    telegramId = data.user.telegramId,
                    userName = data.user.firstName,
                    deviceId = deviceInfo.id
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
        // Check if linked
        val token = tokenStorage.getBearerToken()
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

        // Convert to API format
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
                restingHeartRate = session.restingHeartRate
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
        val token = tokenStorage.getBearerToken()
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
                Result.failure(Exception(response.body()?.error ?: "Failed to get status"))
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
}
