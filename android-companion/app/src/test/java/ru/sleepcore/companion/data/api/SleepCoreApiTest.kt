/**
 * SleepCore API DTOs Unit Tests
 * ==============================
 * Tests for API data transfer objects and response handling.
 *
 * Tests cover:
 * - DTO data classes
 * - Response wrapper logic
 * - Token resolution logic
 * - Data validation
 */

package ru.sleepcore.companion.data.api

import org.junit.Assert.*
import org.junit.Test
import java.time.Instant

/**
 * Tests for ApiResponse wrapper
 */
class ApiResponseTest {

    @Test
    fun `success response with data`() {
        val response = ApiResponse(
            success = true,
            data = "test data",
            error = null,
            timestamp = 1234567890L
        )
        assertTrue(response.success)
        assertEquals("test data", response.data)
        assertNull(response.error)
        assertEquals(1234567890L, response.timestamp)
    }

    @Test
    fun `error response without data`() {
        val response = ApiResponse<String>(
            success = false,
            data = null,
            error = "Something went wrong",
            timestamp = 1234567890L
        )
        assertFalse(response.success)
        assertNull(response.data)
        assertEquals("Something went wrong", response.error)
    }

    @Test
    fun `response with complex data type`() {
        val user = UserDto(id = "user1", telegramId = 123L, firstName = "John")
        val response = ApiResponse(
            success = true,
            data = user,
            error = null,
            timestamp = System.currentTimeMillis()
        )
        assertTrue(response.success)
        assertEquals("user1", response.data?.id)
    }

    @Test
    fun `response equality`() {
        val response1 = ApiResponse(success = true, data = "data", error = null, timestamp = 100L)
        val response2 = ApiResponse(success = true, data = "data", error = null, timestamp = 100L)
        assertEquals(response1, response2)
    }

    @Test
    fun `response copy with modified success`() {
        val original = ApiResponse(success = true, data = "data", error = null, timestamp = 100L)
        val copied = original.copy(success = false)
        assertTrue(original.success)
        assertFalse(copied.success)
    }
}

/**
 * Tests for LinkDeviceRequest
 */
class LinkDeviceRequestTest {

    @Test
    fun `create request with code and device`() {
        val device = DeviceDto(id = "device123")
        val request = LinkDeviceRequest(linkCode = "ABC123", device = device)

        assertEquals("ABC123", request.linkCode)
        assertEquals("device123", request.device.id)
    }

    @Test
    fun `request with full device info`() {
        val device = DeviceDto(
            id = "device123",
            name = "My Phone",
            manufacturer = "Samsung",
            model = "Galaxy S24",
            osVersion = "Android 14",
            appVersion = "1.0.0"
        )
        val request = LinkDeviceRequest(linkCode = "XYZ789", device = device)

        assertEquals("Samsung", request.device.manufacturer)
        assertEquals("Galaxy S24", request.device.model)
    }

    @Test
    fun `request equality`() {
        val device = DeviceDto(id = "device123")
        val request1 = LinkDeviceRequest(linkCode = "ABC123", device = device)
        val request2 = LinkDeviceRequest(linkCode = "ABC123", device = device)
        assertEquals(request1, request2)
    }
}

/**
 * Tests for DeviceDto
 */
class DeviceDtoTest {

    @Test
    fun `device with id only`() {
        val device = DeviceDto(id = "device123")

        assertEquals("device123", device.id)
        assertNull(device.name)
        assertNull(device.manufacturer)
        assertNull(device.model)
        assertNull(device.osVersion)
        assertNull(device.appVersion)
    }

    @Test
    fun `device with all fields`() {
        val device = DeviceDto(
            id = "device123",
            name = "My Phone",
            manufacturer = "Google",
            model = "Pixel 8",
            osVersion = "Android 14 (API 34)",
            appVersion = "1.0.0"
        )

        assertEquals("device123", device.id)
        assertEquals("My Phone", device.name)
        assertEquals("Google", device.manufacturer)
        assertEquals("Pixel 8", device.model)
        assertEquals("Android 14 (API 34)", device.osVersion)
        assertEquals("1.0.0", device.appVersion)
    }

    @Test
    fun `device copy with modified fields`() {
        val original = DeviceDto(id = "device1", name = "Original")
        val copied = original.copy(id = "device2", name = "Copied")

        assertEquals("device1", original.id)
        assertEquals("device2", copied.id)
        assertEquals("Copied", copied.name)
    }
}

/**
 * Tests for LinkResponseDto
 */
class LinkResponseDtoTest {

    @Test
    fun `legacy format with token only`() {
        val user = UserDto(id = "user1", telegramId = 123L, firstName = "John")
        val response = LinkResponseDto(
            token = "legacy_token",
            expiresAt = "2026-03-01T00:00:00Z",
            user = user
        )

        assertEquals("legacy_token", response.token)
        assertEquals("2026-03-01T00:00:00Z", response.expiresAt)
        assertNull(response.accessToken)
        assertNull(response.refreshToken)
    }

    @Test
    fun `new format with accessToken and refreshToken`() {
        val user = UserDto(id = "user1", telegramId = 123L, firstName = "John")
        val response = LinkResponseDto(
            token = "legacy",
            expiresAt = "2026-03-01T00:00:00Z",
            user = user,
            accessToken = "new_access_token",
            refreshToken = "new_refresh_token",
            tokenType = "Bearer",
            expiresIn = 3600
        )

        assertEquals("new_access_token", response.accessToken)
        assertEquals("new_refresh_token", response.refreshToken)
        assertEquals("Bearer", response.tokenType)
        assertEquals(3600, response.expiresIn)
    }

    @Test
    fun `resolveAccessToken returns accessToken when available`() {
        val user = UserDto(id = "user1", telegramId = 123L, firstName = "John")
        val response = LinkResponseDto(
            token = "legacy_token",
            expiresAt = "2026-03-01T00:00:00Z",
            user = user,
            accessToken = "new_access_token"
        )

        assertEquals("new_access_token", response.resolveAccessToken())
    }

    @Test
    fun `resolveAccessToken falls back to token when accessToken is null`() {
        val user = UserDto(id = "user1", telegramId = 123L, firstName = "John")
        val response = LinkResponseDto(
            token = "legacy_token",
            expiresAt = "2026-03-01T00:00:00Z",
            user = user
        )

        assertEquals("legacy_token", response.resolveAccessToken())
    }

    @Test
    fun `resolveExpiresAt returns expiresAt when not blank`() {
        val user = UserDto(id = "user1", telegramId = 123L, firstName = "John")
        val response = LinkResponseDto(
            token = "token",
            expiresAt = "2026-03-01T12:00:00Z",
            user = user
        )

        assertEquals("2026-03-01T12:00:00Z", response.resolveExpiresAt())
    }

    @Test
    fun `resolveExpiresAt calculates from expiresIn when expiresAt is blank`() {
        val user = UserDto(id = "user1", telegramId = 123L, firstName = "John")
        val response = LinkResponseDto(
            token = "token",
            expiresAt = "",
            user = user,
            expiresIn = 3600
        )

        val resolved = response.resolveExpiresAt()
        val instant = Instant.parse(resolved)
        val now = Instant.now()

        // Should be approximately 1 hour from now (with some tolerance)
        val diff = instant.epochSecond - now.epochSecond
        assertTrue("Expected ~3600s, got $diff", diff in 3590..3610)
    }

    @Test
    fun `resolveExpiresAt defaults to 1 hour when both are missing`() {
        val user = UserDto(id = "user1", telegramId = 123L, firstName = "John")
        val response = LinkResponseDto(
            token = "token",
            expiresAt = "",
            user = user
        )

        val resolved = response.resolveExpiresAt()
        val instant = Instant.parse(resolved)
        val now = Instant.now()

        val diff = instant.epochSecond - now.epochSecond
        assertTrue("Expected ~3600s, got $diff", diff in 3590..3610)
    }
}

/**
 * Tests for RefreshTokenRequest
 */
class RefreshTokenRequestTest {

    @Test
    fun `default grantType is refresh_token`() {
        val request = RefreshTokenRequest(refreshToken = "token123")
        assertEquals("refresh_token", request.grantType)
    }

    @Test
    fun `custom grantType can be set`() {
        val request = RefreshTokenRequest(grantType = "custom", refreshToken = "token123")
        assertEquals("custom", request.grantType)
    }

    @Test
    fun `request equality`() {
        val request1 = RefreshTokenRequest(refreshToken = "token123")
        val request2 = RefreshTokenRequest(refreshToken = "token123")
        assertEquals(request1, request2)
    }
}

/**
 * Tests for RefreshTokenResponseDto
 */
class RefreshTokenResponseDtoTest {

    @Test
    fun `all fields are populated`() {
        val response = RefreshTokenResponseDto(
            accessToken = "new_access",
            tokenType = "Bearer",
            expiresIn = 3600,
            refreshToken = "new_refresh"
        )

        assertEquals("new_access", response.accessToken)
        assertEquals("Bearer", response.tokenType)
        assertEquals(3600, response.expiresIn)
        assertEquals("new_refresh", response.refreshToken)
    }

    @Test
    fun `response equality`() {
        val response1 = RefreshTokenResponseDto(
            accessToken = "token",
            tokenType = "Bearer",
            expiresIn = 3600,
            refreshToken = "refresh"
        )
        val response2 = RefreshTokenResponseDto(
            accessToken = "token",
            tokenType = "Bearer",
            expiresIn = 3600,
            refreshToken = "refresh"
        )
        assertEquals(response1, response2)
    }
}

/**
 * Tests for UserDto
 */
class UserDtoTest {

    @Test
    fun `user with all fields`() {
        val user = UserDto(
            id = "user123",
            telegramId = 987654321L,
            firstName = "Alice"
        )

        assertEquals("user123", user.id)
        assertEquals(987654321L, user.telegramId)
        assertEquals("Alice", user.firstName)
    }

    @Test
    fun `user with unicode firstName`() {
        val user = UserDto(
            id = "user123",
            telegramId = 123L,
            firstName = "Алексей"
        )

        assertEquals("Алексей", user.firstName)
    }

    @Test
    fun `user equality`() {
        val user1 = UserDto(id = "user1", telegramId = 123L, firstName = "John")
        val user2 = UserDto(id = "user1", telegramId = 123L, firstName = "John")
        assertEquals(user1, user2)
    }

    @Test
    fun `user with large telegramId`() {
        val user = UserDto(
            id = "user",
            telegramId = 9999999999L,
            firstName = "User"
        )
        assertEquals(9999999999L, user.telegramId)
    }
}

/**
 * Tests for SyncRequest
 */
class SyncRequestTest {

    @Test
    fun `default syncType is manual`() {
        val request = SyncRequest(sleepSessions = emptyList())
        assertEquals("manual", request.syncType)
    }

    @Test
    fun `background sync type`() {
        val request = SyncRequest(
            syncType = "background",
            sleepSessions = emptyList()
        )
        assertEquals("background", request.syncType)
    }

    @Test
    fun `initial sync type`() {
        val request = SyncRequest(
            syncType = "initial",
            sleepSessions = emptyList()
        )
        assertEquals("initial", request.syncType)
    }

    @Test
    fun `request with lastSyncTime`() {
        val request = SyncRequest(
            lastSyncTime = "2026-02-20T12:00:00Z",
            sleepSessions = emptyList()
        )
        assertEquals("2026-02-20T12:00:00Z", request.lastSyncTime)
    }

    @Test
    fun `request with sleep sessions`() {
        val session = SleepSessionDto(
            sessionId = "session1",
            source = "samsung_health",
            startTime = "2026-02-19T23:00:00Z",
            endTime = "2026-02-20T07:00:00Z"
        )
        val request = SyncRequest(sleepSessions = listOf(session))

        assertEquals(1, request.sleepSessions.size)
        assertEquals("session1", request.sleepSessions[0].sessionId)
    }
}

/**
 * Tests for SleepSessionDto
 */
class SleepSessionDtoTest {

    @Test
    fun `session with required fields only`() {
        val session = SleepSessionDto(
            sessionId = "session123",
            source = "fitbit",
            startTime = "2026-02-19T22:00:00Z",
            endTime = "2026-02-20T06:30:00Z"
        )

        assertEquals("session123", session.sessionId)
        assertEquals("fitbit", session.source)
        assertEquals("2026-02-19T22:00:00Z", session.startTime)
        assertEquals("2026-02-20T06:30:00Z", session.endTime)
        assertNull(session.notes)
        assertNull(session.stages)
        assertNull(session.hrv)
        assertNull(session.heartRate)
    }

    @Test
    fun `session with all fields`() {
        val stages = listOf(
            StageDto(type = "LIGHT", startTime = "2026-02-19T22:00:00Z", endTime = "2026-02-19T23:00:00Z")
        )
        val hrv = listOf(
            HrvDto(timestamp = "2026-02-19T22:30:00Z", rmssd = 45.5, sdnn = 55.2, quality = 0.95)
        )
        val heartRate = listOf(
            HeartRateDto(timestamp = "2026-02-19T22:30:00Z", bpm = 62)
        )
        val spo2 = listOf(
            SpO2Dto(timestamp = "2026-02-19T22:30:00Z", percentage = 97.5)
        )
        val breathing = listOf(
            BreathingDisturbanceDto(timestamp = "2026-02-19T23:00:00Z", durationSeconds = 15)
        )

        val session = SleepSessionDto(
            sessionId = "session123",
            source = "oura",
            startTime = "2026-02-19T22:00:00Z",
            endTime = "2026-02-20T06:30:00Z",
            notes = "Good sleep",
            stages = stages,
            hrv = hrv,
            heartRate = heartRate,
            restingHeartRate = 58,
            spo2 = spo2,
            breathingDisturbances = breathing,
            respirationRate = 14.5,
            skinTemperature = -0.3
        )

        assertEquals("Good sleep", session.notes)
        assertEquals(1, session.stages?.size)
        assertEquals(1, session.hrv?.size)
        assertEquals(1, session.heartRate?.size)
        assertEquals(58, session.restingHeartRate)
        assertEquals(1, session.spo2?.size)
        assertEquals(1, session.breathingDisturbances?.size)
        assertEquals(14.5, session.respirationRate)
        assertEquals(-0.3, session.skinTemperature)
    }
}

/**
 * Tests for StageDto
 */
class StageDtoTest {

    @Test
    fun `stage types`() {
        val stageTypes = listOf("UNKNOWN", "AWAKE", "SLEEPING", "OUT_OF_BED", "AWAKE_IN_BED", "LIGHT", "DEEP", "REM")

        stageTypes.forEach { type ->
            val stage = StageDto(
                type = type,
                startTime = "2026-02-19T22:00:00Z",
                endTime = "2026-02-19T23:00:00Z"
            )
            assertEquals(type, stage.type)
        }
    }

    @Test
    fun `stage equality`() {
        val stage1 = StageDto(type = "LIGHT", startTime = "22:00:00Z", endTime = "23:00:00Z")
        val stage2 = StageDto(type = "LIGHT", startTime = "22:00:00Z", endTime = "23:00:00Z")
        assertEquals(stage1, stage2)
    }
}

/**
 * Tests for HrvDto
 */
class HrvDtoTest {

    @Test
    fun `hrv with required fields`() {
        val hrv = HrvDto(
            timestamp = "2026-02-19T22:30:00Z",
            rmssd = 45.5
        )

        assertEquals("2026-02-19T22:30:00Z", hrv.timestamp)
        assertEquals(45.5, hrv.rmssd, 0.01)
        assertNull(hrv.sdnn)
        assertNull(hrv.quality)
    }

    @Test
    fun `hrv with all fields`() {
        val hrv = HrvDto(
            timestamp = "2026-02-19T22:30:00Z",
            rmssd = 45.5,
            sdnn = 55.2,
            quality = 0.95
        )

        assertEquals(55.2, hrv.sdnn)
        assertEquals(0.95, hrv.quality)
    }

    @Test
    fun `hrv with low quality`() {
        val hrv = HrvDto(
            timestamp = "2026-02-19T22:30:00Z",
            rmssd = 30.0,
            quality = 0.5
        )

        assertEquals(0.5, hrv.quality)
    }
}

/**
 * Tests for SpO2Dto
 */
class SpO2DtoTest {

    @Test
    fun `normal SpO2 value`() {
        val spo2 = SpO2Dto(
            timestamp = "2026-02-19T22:30:00Z",
            percentage = 97.5
        )

        assertEquals("2026-02-19T22:30:00Z", spo2.timestamp)
        assertEquals(97.5, spo2.percentage, 0.01)
    }

    @Test
    fun `low SpO2 value`() {
        val spo2 = SpO2Dto(
            timestamp = "2026-02-19T22:30:00Z",
            percentage = 88.0
        )

        assertEquals(88.0, spo2.percentage, 0.01)
    }

    @Test
    fun `SpO2 equality`() {
        val spo2_1 = SpO2Dto(timestamp = "time", percentage = 95.0)
        val spo2_2 = SpO2Dto(timestamp = "time", percentage = 95.0)
        assertEquals(spo2_1, spo2_2)
    }
}

/**
 * Tests for BreathingDisturbanceDto
 */
class BreathingDisturbanceDtoTest {

    @Test
    fun `disturbance with timestamp only`() {
        val disturbance = BreathingDisturbanceDto(
            timestamp = "2026-02-19T23:00:00Z"
        )

        assertEquals("2026-02-19T23:00:00Z", disturbance.timestamp)
        assertNull(disturbance.durationSeconds)
    }

    @Test
    fun `disturbance with duration`() {
        val disturbance = BreathingDisturbanceDto(
            timestamp = "2026-02-19T23:00:00Z",
            durationSeconds = 20
        )

        assertEquals(20, disturbance.durationSeconds)
    }
}

/**
 * Tests for SyncResponseDto
 */
class SyncResponseDtoTest {

    @Test
    fun `successful sync response`() {
        val response = SyncResponseDto(
            processed = 5,
            skipped = 1,
            errors = emptyList(),
            syncId = "sync123",
            nextSyncRecommended = "PT15M"
        )

        assertEquals(5, response.processed)
        assertEquals(1, response.skipped)
        assertTrue(response.errors.isEmpty())
        assertEquals("sync123", response.syncId)
        assertEquals("PT15M", response.nextSyncRecommended)
    }

    @Test
    fun `sync response with errors`() {
        val errors = listOf(
            SyncErrorDto(sessionId = "session1", error = "Invalid data"),
            SyncErrorDto(sessionId = "session2", error = "Duplicate")
        )
        val response = SyncResponseDto(
            processed = 3,
            skipped = 0,
            errors = errors,
            syncId = "sync123",
            nextSyncRecommended = "PT1H"
        )

        assertEquals(2, response.errors.size)
        assertEquals("Invalid data", response.errors[0].error)
    }
}

/**
 * Tests for StatusResponseDto
 */
class StatusResponseDtoTest {

    @Test
    fun `complete status response`() {
        val device = DeviceStatusDto(
            id = "device123",
            name = "My Phone",
            manufacturer = "Samsung",
            model = "Galaxy S24",
            linkedAt = "2026-02-01T10:00:00Z",
            lastSyncAt = "2026-02-20T08:00:00Z"
        )
        val stats = StatsDto(
            totalSessions = 30,
            sessionsLast7Days = 7,
            lastSyncStatus = "success"
        )
        val recentSyncs = listOf(
            RecentSyncDto(
                id = "sync1",
                type = "manual",
                processed = 1,
                status = "completed",
                completedAt = "2026-02-20T08:00:00Z"
            )
        )
        val response = StatusResponseDto(
            device = device,
            stats = stats,
            recentSyncs = recentSyncs
        )

        assertEquals("device123", response.device.id)
        assertEquals(30, response.stats.totalSessions)
        assertEquals(1, response.recentSyncs.size)
    }
}

/**
 * Tests for UnlinkResponseDto
 */
class UnlinkResponseDtoTest {

    @Test
    fun `successful unlink`() {
        val response = UnlinkResponseDto(unlinked = true)
        assertTrue(response.unlinked)
    }

    @Test
    fun `failed unlink`() {
        val response = UnlinkResponseDto(unlinked = false)
        assertFalse(response.unlinked)
    }

    @Test
    fun `unlink response equality`() {
        val response1 = UnlinkResponseDto(unlinked = true)
        val response2 = UnlinkResponseDto(unlinked = true)
        assertEquals(response1, response2)
    }
}
