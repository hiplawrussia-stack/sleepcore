/**
 * SleepRepository Unit Tests
 * ===========================
 * Tests for data orchestration between API, Health Connect, and local storage.
 */

package ru.sleepcore.companion.data.repository

import io.mockk.*
import io.mockk.impl.annotations.MockK
import io.sentry.Sentry
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Response
import ru.sleepcore.companion.data.api.*
import ru.sleepcore.companion.data.local.StoredCredentials
import ru.sleepcore.companion.data.local.TokenStorage
import ru.sleepcore.companion.data.local.audit.AuditLogger
import ru.sleepcore.companion.domain.model.*
import ru.sleepcore.companion.health.HealthConnectManager
import java.time.Instant

@OptIn(ExperimentalCoroutinesApi::class)
class SleepRepositoryTest {

    @MockK
    private lateinit var api: SleepCoreApi

    @MockK
    private lateinit var tokenStorage: TokenStorage

    @MockK
    private lateinit var healthConnectManager: HealthConnectManager

    @MockK
    private lateinit var auditLogger: AuditLogger

    @MockK
    private lateinit var pendingSyncRepository: PendingSyncRepository

    private lateinit var repository: SleepRepository

    @Before
    fun setup() {
        MockKAnnotations.init(this)

        // Mock Sentry to prevent RuntimeException in ErrorLogger
        mockkStatic(Sentry::class)
        every { Sentry.isEnabled() } returns false

        repository = SleepRepository(
            api,
            tokenStorage,
            healthConnectManager,
            auditLogger,
            pendingSyncRepository
        )
    }

    @After
    fun teardown() {
        unmockkStatic(Sentry::class)
    }

    // ========== Link Device Tests ==========

    @Test
    fun `linkDevice success saves credentials and returns result`() = runTest {
        val deviceInfo = DeviceInfo(
            id = "device-123",
            name = "Test Phone",
            manufacturer = "Samsung",
            model = "Galaxy S24"
        )

        val linkResponseDto = LinkResponseDto(
            token = "jwt-token-123",
            expiresAt = "2026-03-07T00:00:00Z",
            user = UserDto(
                id = "user-1",
                telegramId = 123456L,
                firstName = "Иван"
            )
        )

        val apiResponse = ApiResponse(
            success = true,
            data = linkResponseDto,
            error = null,
            timestamp = System.currentTimeMillis()
        )

        coEvery { api.linkDevice(any()) } returns Response.success(apiResponse)
        coEvery { tokenStorage.saveCredentials(any(), any(), any(), any(), any(), any()) } returns 0

        val result = repository.linkDevice("ABC123", deviceInfo)

        assertTrue(result.isSuccess)
        val linkResult = result.getOrThrow()
        assertEquals("jwt-token-123", linkResult.token)
        assertEquals("Иван", linkResult.user.firstName)
        assertEquals(123456L, linkResult.user.telegramId)

        coVerify {
            tokenStorage.saveCredentials(
                token = "jwt-token-123",
                expiresAt = "2026-03-07T00:00:00Z",
                userId = "user-1",
                telegramId = 123456L,
                userName = "Иван",
                deviceId = "device-123"
            )
        }
    }

    @Test
    fun `linkDevice normalizes code to uppercase`() = runTest {
        val deviceInfo = DeviceInfo(id = "device-123")

        val linkResponseDto = LinkResponseDto(
            token = "token",
            expiresAt = "2026-03-07T00:00:00Z",
            user = UserDto(id = "u1", telegramId = 1L, firstName = "Test")
        )

        val apiResponse = ApiResponse(
            success = true,
            data = linkResponseDto,
            error = null,
            timestamp = System.currentTimeMillis()
        )

        coEvery { api.linkDevice(any()) } returns Response.success(apiResponse)
        coEvery { tokenStorage.saveCredentials(any(), any(), any(), any(), any(), any()) } returns 0

        repository.linkDevice("abc123", deviceInfo)

        coVerify {
            api.linkDevice(match { it.linkCode == "ABC123" })
        }
    }

    @Test
    fun `linkDevice returns INVALID_CODE error`() = runTest {
        val deviceInfo = DeviceInfo(id = "device-123")

        val apiResponse = ApiResponse<LinkResponseDto>(
            success = false,
            data = null,
            error = "Invalid link code",
            timestamp = System.currentTimeMillis()
        )

        coEvery { api.linkDevice(any()) } returns Response.success(apiResponse)

        val result = repository.linkDevice("ABC123", deviceInfo)

        assertTrue(result.isFailure)
        assertEquals("INVALID_CODE", result.exceptionOrNull()?.message)
    }

    @Test
    fun `linkDevice returns EXPIRED_CODE error`() = runTest {
        val deviceInfo = DeviceInfo(id = "device-123")

        val apiResponse = ApiResponse<LinkResponseDto>(
            success = false,
            data = null,
            error = "Link code has expired",
            timestamp = System.currentTimeMillis()
        )

        coEvery { api.linkDevice(any()) } returns Response.success(apiResponse)

        val result = repository.linkDevice("ABC123", deviceInfo)

        assertTrue(result.isFailure)
        assertEquals("EXPIRED_CODE", result.exceptionOrNull()?.message)
    }

    @Test
    fun `linkDevice handles network exception`() = runTest {
        val deviceInfo = DeviceInfo(id = "device-123")

        coEvery { api.linkDevice(any()) } throws Exception("Network unavailable")

        val result = repository.linkDevice("ABC123", deviceInfo)

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()?.message?.contains("Network") == true)
    }

    // ========== Sync Sessions Tests ==========

    @Test
    fun `syncSessions returns NOT_LINKED when no token`() = runTest {
        every { tokenStorage.getBearerToken() } returns null

        val result = repository.syncSessions()

        assertTrue(result.isFailure)
        assertEquals("NOT_LINKED", result.exceptionOrNull()?.message)
    }

    @Test
    fun `syncSessions returns NO_NEW_DATA when empty sessions`() = runTest {
        every { tokenStorage.getBearerToken() } returns "Bearer token"
        coEvery { tokenStorage.getLastSyncTime() } returns null
        coEvery { healthConnectManager.readSessionsSinceLastSync(any()) } returns Result.success(emptyList())

        val result = repository.syncSessions()

        assertTrue(result.isFailure)
        assertEquals("NO_NEW_DATA", result.exceptionOrNull()?.message)
    }

    @Test
    fun `syncSessions sends sessions to API and updates last sync time`() = runTest {
        val sessions = listOf(
            SleepSession(
                id = "session-1",
                source = "samsung_health",
                startTime = Instant.parse("2026-02-07T22:00:00Z"),
                endTime = Instant.parse("2026-02-08T06:00:00Z"),
                stages = listOf(
                    SleepStage(
                        type = SleepStageType.LIGHT,
                        startTime = Instant.parse("2026-02-07T22:00:00Z"),
                        endTime = Instant.parse("2026-02-08T00:00:00Z")
                    )
                ),
                hrvSamples = listOf(
                    HrvSample(
                        timestamp = Instant.parse("2026-02-07T23:00:00Z"),
                        rmssd = 45.0,
                        quality = 0.9
                    )
                )
            )
        )

        val syncResponseDto = SyncResponseDto(
            processed = 1,
            skipped = 0,
            errors = emptyList(),
            syncId = "sync-123",
            nextSyncRecommended = "PT15M"
        )

        val apiResponse = ApiResponse(
            success = true,
            data = syncResponseDto,
            error = null,
            timestamp = System.currentTimeMillis()
        )

        every { tokenStorage.getBearerToken() } returns "Bearer token"
        coEvery { tokenStorage.getLastSyncTime() } returns null
        coEvery { healthConnectManager.readSessionsSinceLastSync(any()) } returns Result.success(sessions)
        coEvery { api.syncSessions(any(), any()) } returns Response.success(apiResponse)
        coEvery { tokenStorage.saveLastSyncTime(any()) } returns mockk(relaxed = true)

        val result = repository.syncSessions(syncType = "manual")

        assertTrue(result.isSuccess)
        val syncResult = result.getOrThrow()
        assertEquals(1, syncResult.processed)
        assertEquals("sync-123", syncResult.syncId)

        coVerify {
            api.syncSessions(
                token = "Bearer token",
                request = match {
                    it.syncType == "manual" &&
                    it.sleepSessions.size == 1 &&
                    it.sleepSessions[0].sessionId == "session-1" &&
                    it.sleepSessions[0].stages?.size == 1 &&
                    it.sleepSessions[0].hrv?.size == 1
                }
            )
        }

        coVerify { tokenStorage.saveLastSyncTime(any()) }
    }

    @Test
    fun `syncSessions returns TOKEN_EXPIRED on 401`() = runTest {
        val sessions = listOf(
            SleepSession(
                id = "session-1",
                source = "test",
                startTime = Instant.now().minusSeconds(3600),
                endTime = Instant.now()
            )
        )

        every { tokenStorage.getBearerToken() } returns "Bearer token"
        coEvery { tokenStorage.getLastSyncTime() } returns null
        coEvery { healthConnectManager.readSessionsSinceLastSync(any()) } returns Result.success(sessions)
        coEvery { api.syncSessions(any(), any()) } returns Response.error(401, mockk(relaxed = true))

        val result = repository.syncSessions()

        assertTrue(result.isFailure)
        assertEquals("TOKEN_EXPIRED", result.exceptionOrNull()?.message)
    }

    @Test
    fun `syncSessions propagates Health Connect error`() = runTest {
        every { tokenStorage.getBearerToken() } returns "Bearer token"
        coEvery { tokenStorage.getLastSyncTime() } returns null
        coEvery { healthConnectManager.readSessionsSinceLastSync(any()) } returns Result.failure(Exception("Permission denied"))

        val result = repository.syncSessions()

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()?.message?.contains("Permission") == true)
    }

    // ========== Get Sync Status Tests ==========

    @Test
    fun `getSyncStatus returns NOT_LINKED when no token`() = runTest {
        every { tokenStorage.getBearerToken() } returns null

        val result = repository.getSyncStatus()

        assertTrue(result.isFailure)
        assertEquals("NOT_LINKED", result.exceptionOrNull()?.message)
    }

    @Test
    fun `getSyncStatus returns parsed status from API`() = runTest {
        val statusResponseDto = StatusResponseDto(
            device = DeviceStatusDto(
                id = "device-1",
                name = "Pixel 8",
                manufacturer = "Google",
                model = "Pixel 8 Pro",
                linkedAt = "2026-01-01T00:00:00Z",
                lastSyncAt = "2026-02-07T10:00:00Z"
            ),
            stats = StatsDto(
                totalSessions = 50,
                sessionsLast7Days = 7,
                lastSyncStatus = "success"
            ),
            recentSyncs = listOf(
                RecentSyncDto(
                    id = "sync-1",
                    type = "manual",
                    processed = 3,
                    status = "success",
                    completedAt = "2026-02-07T10:00:00Z"
                )
            )
        )

        val apiResponse = ApiResponse(
            success = true,
            data = statusResponseDto,
            error = null,
            timestamp = System.currentTimeMillis()
        )

        every { tokenStorage.getBearerToken() } returns "Bearer token"
        coEvery { api.getStatus(any()) } returns Response.success(apiResponse)

        val result = repository.getSyncStatus()

        assertTrue(result.isSuccess)
        val status = result.getOrThrow()
        assertEquals("device-1", status.device.id)
        assertEquals(50, status.stats.totalSessions)
        assertEquals(7, status.stats.sessionsLast7Days)
        assertEquals(1, status.recentSyncs.size)
    }

    // ========== Unlink Device Tests ==========

    @Test
    fun `unlinkDevice clears local credentials first`() = runTest {
        val unlinkResponse = ApiResponse(
            success = true,
            data = UnlinkResponseDto(unlinked = true),
            error = null,
            timestamp = System.currentTimeMillis()
        )

        every { tokenStorage.getBearerToken() } returns "Bearer token"
        coEvery { tokenStorage.clearCredentials() } returns 0
        coEvery { api.unlinkDevice(any()) } returns Response.success(unlinkResponse)

        val result = repository.unlinkDevice()

        assertTrue(result.isSuccess)

        coVerifyOrder {
            tokenStorage.clearCredentials()
            api.unlinkDevice(any())
        }
    }

    @Test
    fun `unlinkDevice succeeds even if API fails`() = runTest {
        every { tokenStorage.getBearerToken() } returns "Bearer token"
        coEvery { tokenStorage.clearCredentials() } returns 0
        coEvery { api.unlinkDevice(any()) } throws Exception("Network error")

        val result = repository.unlinkDevice()

        assertTrue(result.isSuccess) // Local clear succeeded
    }

    @Test
    fun `unlinkDevice succeeds without token`() = runTest {
        every { tokenStorage.getBearerToken() } returns null
        coEvery { tokenStorage.clearCredentials() } returns 0

        val result = repository.unlinkDevice()

        assertTrue(result.isSuccess)
        coVerify(exactly = 0) { api.unlinkDevice(any()) }
    }

    // ========== Is Linked Tests ==========

    @Test
    fun `isLinked returns true when valid credentials exist`() {
        every { tokenStorage.isLinked() } returns true

        assertTrue(repository.isLinked())
    }

    @Test
    fun `isLinked returns false when no credentials`() {
        every { tokenStorage.isLinked() } returns false

        assertFalse(repository.isLinked())
    }

    // ========== Get Credentials Tests ==========

    @Test
    fun `getCredentials returns stored credentials`() {
        val credentials = StoredCredentials(
            token = "token",
            expiresAt = Instant.now().plusSeconds(3600),
            userId = "user-1",
            telegramId = 123L,
            userName = "Test",
            deviceId = "device-1",
            linkedAt = Instant.now()
        )
        every { tokenStorage.loadCredentials() } returns credentials

        val result = repository.getCredentials()

        assertEquals(credentials, result)
    }

    @Test
    fun `getCredentials returns null when none stored`() {
        every { tokenStorage.loadCredentials() } returns null

        assertNull(repository.getCredentials())
    }
}
