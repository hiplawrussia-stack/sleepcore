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

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import ru.sleepcore.companion.data.api.*
import ru.sleepcore.companion.data.local.TokenStorage
import ru.sleepcore.companion.data.local.audit.AuditLogger
import ru.sleepcore.companion.data.local.audit.AuditOutcome
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
    private val healthConnectManager: HealthConnectManager,
    private val auditLogger: AuditLogger
) {
    /**
     * Mutex for token refresh to prevent race condition (RFC 9700 compliance)
     *
     * Without this mutex, concurrent callers could both try to refresh the token,
     * causing the second refresh to fail (token rotation invalidates old refresh token).
     */
    private val tokenRefreshMutex = Mutex()
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
                    token = data.resolveAccessToken(),
                    expiresAt = data.resolveExpiresAt(),
                    userId = data.user.id,
                    telegramId = data.user.telegramId,
                    userName = data.user.firstName,
                    deviceId = deviceInfo.id,
                    refreshToken = data.refreshToken
                )

                // HIPAA Audit: Log successful device linking
                auditLogger.setCurrentUser(data.user.id)
                auditLogger.logAuthentication(
                    action = "DEVICE_LINK",
                    outcome = AuditOutcome.SUCCESS,
                    userId = data.user.id,
                    details = "Device linked successfully",
                    source = "SleepRepository:linkDevice"
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
                // HIPAA Audit: Log failed device linking
                auditLogger.logAuthentication(
                    action = "DEVICE_LINK",
                    outcome = AuditOutcome.FAILURE,
                    errorMessage = error,
                    source = "SleepRepository:linkDevice"
                )
                when {
                    error.contains("Invalid", ignoreCase = true) -> Result.failure(Exception("INVALID_CODE"))
                    error.contains("expired", ignoreCase = true) -> Result.failure(Exception("EXPIRED_CODE"))
                    else -> Result.failure(Exception(error))
                }
            }
        } catch (e: Exception) {
            // HIPAA Audit: Log link error
            auditLogger.logAuthentication(
                action = "DEVICE_LINK",
                outcome = AuditOutcome.ERROR,
                errorMessage = e.message,
                source = "SleepRepository:linkDevice"
            )
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

                // HIPAA Audit: Log successful sync
                auditLogger.logDataSync(
                    action = "SYNC_SESSIONS",
                    outcome = AuditOutcome.SUCCESS,
                    details = "processed=${data.processed}, skipped=${data.skipped}, syncType=$syncType",
                    source = "SleepRepository:syncSessions"
                )

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
                // HIPAA Audit: Log failed sync
                auditLogger.logDataSync(
                    action = "SYNC_SESSIONS",
                    outcome = AuditOutcome.FAILURE,
                    errorMessage = error,
                    source = "SleepRepository:syncSessions"
                )
                when (response.code()) {
                    401 -> Result.failure(Exception("TOKEN_EXPIRED"))
                    else -> Result.failure(Exception(error))
                }
            }
        } catch (e: Exception) {
            // HIPAA Audit: Log sync error
            auditLogger.logDataSync(
                action = "SYNC_SESSIONS",
                outcome = AuditOutcome.ERROR,
                errorMessage = e.message,
                source = "SleepRepository:syncSessions"
            )
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
        val userId = tokenStorage.loadCredentials()?.userId

        // HIPAA Audit: Log device unlink attempt
        auditLogger.logAuthentication(
            action = "DEVICE_UNLINK",
            outcome = AuditOutcome.SUCCESS,
            userId = userId,
            details = "Device unlink initiated",
            source = "SleepRepository:unlinkDevice"
        )

        // Clear local credentials first
        tokenStorage.clearCredentials()
        auditLogger.setCurrentUser(null)

        // If we have a token, try to notify the server
        if (token != null) {
            try {
                api.unlinkDevice(token)
            } catch (e: Exception) {
                // Ignore server errors during unlink - local state is already cleared
                // But log it for audit trail
                auditLogger.logAuthentication(
                    action = "DEVICE_UNLINK_SERVER_NOTIFY",
                    outcome = AuditOutcome.ERROR,
                    errorMessage = e.message,
                    source = "SleepRepository:unlinkDevice"
                )
            }
        }

        return Result.success(true)
    }

    /**
     * Check if device is linked
     *
     * WARNING: Uses runBlocking internally - avoid on Main thread.
     * Prefer suspendIsLinked() in coroutines.
     */
    fun isLinked(): Boolean = tokenStorage.isLinked()

    /**
     * Check if device is linked (suspend version - NO ANR RISK)
     *
     * Use this in ViewModels inside viewModelScope.launch {}
     */
    suspend fun suspendIsLinked(): Boolean = tokenStorage.suspendIsLinked()

    /**
     * Check if access token needs refresh
     *
     * Returns true if access token is expired but we have a refresh token.
     */
    fun needsTokenRefresh(): Boolean = tokenStorage.needsTokenRefresh()

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
     * THREAD-SAFETY: Uses mutex to prevent race condition when multiple
     * callers try to refresh simultaneously. Without mutex, second caller
     * would fail because first refresh already invalidated the old token.
     *
     * @return Result.success if refresh succeeded, Result.failure with exception otherwise
     */
    suspend fun refreshAccessToken(): Result<Unit> = tokenRefreshMutex.withLock {
        // Double-check after acquiring lock - another thread may have refreshed already
        val credentials = tokenStorage.suspendLoadCredentials()
        if (credentials != null && !credentials.isExpired && !credentials.isExpiringSoon) {
            // Token was refreshed by another thread while we waited for lock
            return@withLock Result.success(Unit)
        }

        val refreshToken = tokenStorage.getRefreshToken()
            ?: return@withLock Result.failure(IllegalStateException("No refresh token available"))

        return@withLock try {
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

                // HIPAA Audit: Log successful token refresh
                auditLogger.logAuthentication(
                    action = "TOKEN_REFRESH",
                    outcome = AuditOutcome.SUCCESS,
                    source = "SleepRepository:refreshAccessToken"
                )

                Result.success(Unit)
            } else {
                // Refresh failed - user needs to re-link
                val error = response.body()?.error ?: "Token refresh failed"
                // HIPAA Audit: Log failed token refresh
                auditLogger.logAuthentication(
                    action = "TOKEN_REFRESH",
                    outcome = AuditOutcome.FAILURE,
                    errorMessage = error,
                    source = "SleepRepository:refreshAccessToken"
                )
                Result.failure(IllegalStateException(error))
            }
        } catch (e: Exception) {
            // HIPAA Audit: Log token refresh error
            auditLogger.logAuthentication(
                action = "TOKEN_REFRESH",
                outcome = AuditOutcome.ERROR,
                errorMessage = e.message,
                source = "SleepRepository:refreshAccessToken"
            )
            Result.failure(e)
        }
    }

    /**
     * Get valid bearer token, refreshing if necessary
     *
     * Uses suspend versions of TokenStorage methods to avoid ANR risk.
     *
     * @return Bearer token string or null if not linked/refresh failed
     */
    private suspend fun getValidBearerToken(): String? {
        val credentials = tokenStorage.suspendLoadCredentials()
            ?: return null

        // If token is expiring soon, try to refresh
        if (credentials.isExpiringSoon && credentials.canRefresh) {
            if (refreshAccessToken().isSuccess) {
                // Get updated token after refresh
                return tokenStorage.suspendGetBearerToken()
            }
        }

        // Return current token if not expired
        return if (!credentials.isExpired) {
            "Bearer ${credentials.token}"
        } else if (credentials.canRefresh) {
            // Token expired but we can refresh
            if (refreshAccessToken().isSuccess) {
                tokenStorage.suspendGetBearerToken()
            } else {
                null
            }
        } else {
            null
        }
    }
}
