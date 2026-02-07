/**
 * Test Utilities
 * ================
 * Shared test fixtures and helpers for Android Companion tests.
 */

package ru.sleepcore.companion

import ru.sleepcore.companion.data.local.StoredCredentials
import ru.sleepcore.companion.domain.model.*
import java.time.Instant

/**
 * Factory for creating test fixtures
 */
object TestFixtures {

    /**
     * Create a test sleep session with typical values
     */
    fun createSleepSession(
        id: String = "session-${System.currentTimeMillis()}",
        source: String = "test",
        startTime: Instant = Instant.parse("2026-02-07T22:00:00Z"),
        endTime: Instant = Instant.parse("2026-02-08T06:00:00Z"),
        includeStages: Boolean = true,
        includeHrv: Boolean = true,
        includeHeartRate: Boolean = false
    ): SleepSession {
        val stages = if (includeStages) {
            listOf(
                SleepStage(SleepStageType.LIGHT, startTime, startTime.plusSeconds(7200)),
                SleepStage(SleepStageType.DEEP, startTime.plusSeconds(7200), startTime.plusSeconds(10800)),
                SleepStage(SleepStageType.REM, startTime.plusSeconds(10800), startTime.plusSeconds(14400)),
                SleepStage(SleepStageType.LIGHT, startTime.plusSeconds(14400), startTime.plusSeconds(18000)),
                SleepStage(SleepStageType.AWAKE, startTime.plusSeconds(18000), startTime.plusSeconds(18900)),
                SleepStage(SleepStageType.LIGHT, startTime.plusSeconds(18900), startTime.plusSeconds(25200)),
                SleepStage(SleepStageType.DEEP, startTime.plusSeconds(25200), startTime.plusSeconds(28800))
            )
        } else emptyList()

        val hrvSamples = if (includeHrv) {
            listOf(
                HrvSample(startTime.plusSeconds(3600), 42.0, quality = 0.92),
                HrvSample(startTime.plusSeconds(7200), 38.0, quality = 0.88),
                HrvSample(startTime.plusSeconds(10800), 45.0, quality = 0.95),
                HrvSample(startTime.plusSeconds(14400), 40.0, quality = 0.90),
                HrvSample(startTime.plusSeconds(18000), 35.0, quality = 0.85)
            )
        } else emptyList()

        val heartRateSamples = if (includeHeartRate) {
            listOf(
                HeartRateSample(startTime.plusSeconds(3600), 58),
                HeartRateSample(startTime.plusSeconds(7200), 52),
                HeartRateSample(startTime.plusSeconds(10800), 55),
                HeartRateSample(startTime.plusSeconds(14400), 60),
                HeartRateSample(startTime.plusSeconds(18000), 65)
            )
        } else emptyList()

        return SleepSession(
            id = id,
            source = source,
            startTime = startTime,
            endTime = endTime,
            stages = stages,
            hrvSamples = hrvSamples,
            heartRateSamples = heartRateSamples,
            restingHeartRate = 55
        )
    }

    /**
     * Create test credentials
     */
    fun createCredentials(
        token: String = "test-jwt-token-${System.currentTimeMillis()}",
        expiresAt: Instant = Instant.now().plusSeconds(30 * 24 * 3600), // 30 days
        userId: String = "user-123",
        telegramId: Long = 123456789L,
        userName: String = "Тест Пользователь",
        deviceId: String = "device-${System.currentTimeMillis()}"
    ): StoredCredentials {
        return StoredCredentials(
            token = token,
            expiresAt = expiresAt,
            userId = userId,
            telegramId = telegramId,
            userName = userName,
            deviceId = deviceId,
            linkedAt = Instant.now()
        )
    }

    /**
     * Create test device info
     */
    fun createDeviceInfo(
        id: String = "device-${System.currentTimeMillis()}",
        name: String = "Test Device",
        manufacturer: String = "Test Manufacturer",
        model: String = "Test Model",
        osVersion: String = "14",
        appVersion: String = "1.0.0"
    ): DeviceInfo {
        return DeviceInfo(
            id = id,
            name = name,
            manufacturer = manufacturer,
            model = model,
            osVersion = osVersion,
            appVersion = appVersion
        )
    }

    /**
     * Create test link result
     */
    fun createLinkResult(
        token: String = "test-token",
        expiresAt: String = "2026-03-07T00:00:00Z",
        userId: String = "user-1",
        telegramId: Long = 123456L,
        firstName: String = "Иван"
    ): LinkResult {
        return LinkResult(
            token = token,
            expiresAt = expiresAt,
            user = LinkedUser(
                id = userId,
                telegramId = telegramId,
                firstName = firstName
            )
        )
    }

    /**
     * Create test sync result
     */
    fun createSyncResult(
        processed: Int = 3,
        skipped: Int = 0,
        errors: List<SyncError> = emptyList(),
        syncId: String = "sync-${System.currentTimeMillis()}",
        nextSyncRecommended: String = "PT15M"
    ): SyncResult {
        return SyncResult(
            processed = processed,
            skipped = skipped,
            errors = errors,
            syncId = syncId,
            nextSyncRecommended = nextSyncRecommended
        )
    }

    /**
     * Create test sync status
     */
    fun createSyncStatus(
        deviceId: String = "device-1",
        deviceName: String = "Test Phone",
        totalSessions: Int = 42,
        sessionsLast7Days: Int = 7,
        lastSyncAt: String? = "2026-02-07T10:00:00Z"
    ): SyncStatus {
        return SyncStatus(
            device = DeviceStatus(
                id = deviceId,
                name = deviceName,
                manufacturer = "Test",
                model = "Model X",
                linkedAt = "2026-01-01T00:00:00Z",
                lastSyncAt = lastSyncAt
            ),
            stats = SyncStats(
                totalSessions = totalSessions,
                sessionsLast7Days = sessionsLast7Days,
                lastSyncStatus = "success"
            ),
            recentSyncs = listOf(
                RecentSync(
                    id = "sync-1",
                    type = "manual",
                    processed = 3,
                    status = "success",
                    completedAt = lastSyncAt
                )
            )
        )
    }

    /**
     * Create a session that represents good sleep
     */
    fun createGoodSleepSession(): SleepSession {
        val start = Instant.parse("2026-02-07T22:30:00Z")
        val end = Instant.parse("2026-02-08T06:30:00Z") // 8 hours TIB

        return SleepSession(
            id = "good-sleep",
            source = "samsung_health",
            startTime = start,
            endTime = end,
            stages = listOf(
                // 20% light (96 min)
                SleepStage(SleepStageType.LIGHT, start, start.plusSeconds(5760)),
                // 25% deep (120 min)
                SleepStage(SleepStageType.DEEP, start.plusSeconds(5760), start.plusSeconds(12960)),
                // 25% REM (120 min)
                SleepStage(SleepStageType.REM, start.plusSeconds(12960), start.plusSeconds(20160)),
                // 20% light (96 min)
                SleepStage(SleepStageType.LIGHT, start.plusSeconds(20160), start.plusSeconds(25920)),
                // 10% awake (48 min) - still gives ~90% SE
                SleepStage(SleepStageType.AWAKE, start.plusSeconds(25920), start.plusSeconds(28800))
            ),
            hrvSamples = listOf(
                HrvSample(start.plusSeconds(3600), 48.0, quality = 0.95),
                HrvSample(start.plusSeconds(7200), 52.0, quality = 0.92),
                HrvSample(start.plusSeconds(14400), 55.0, quality = 0.98)
            ),
            restingHeartRate = 52
        )
    }

    /**
     * Create a session that represents poor sleep
     */
    fun createPoorSleepSession(): SleepSession {
        val start = Instant.parse("2026-02-07T01:00:00Z") // Late bedtime
        val end = Instant.parse("2026-02-07T05:30:00Z") // Only 4.5 hours

        return SleepSession(
            id = "poor-sleep",
            source = "fitbit",
            startTime = start,
            endTime = end,
            stages = listOf(
                SleepStage(SleepStageType.AWAKE_IN_BED, start, start.plusSeconds(1800)), // 30 min to fall asleep
                SleepStage(SleepStageType.LIGHT, start.plusSeconds(1800), start.plusSeconds(5400)),
                SleepStage(SleepStageType.AWAKE, start.plusSeconds(5400), start.plusSeconds(7200)), // 30 min awake
                SleepStage(SleepStageType.LIGHT, start.plusSeconds(7200), start.plusSeconds(12600)),
                SleepStage(SleepStageType.DEEP, start.plusSeconds(12600), start.plusSeconds(14400)),
                SleepStage(SleepStageType.AWAKE, start.plusSeconds(14400), start.plusSeconds(16200)) // 30 min awake
            ),
            hrvSamples = listOf(
                HrvSample(start.plusSeconds(3600), 28.0, quality = 0.75), // Low HRV, borderline quality
                HrvSample(start.plusSeconds(7200), 25.0, quality = 0.70)  // Invalid - low quality
            ),
            restingHeartRate = 72 // Elevated
        )
    }
}
