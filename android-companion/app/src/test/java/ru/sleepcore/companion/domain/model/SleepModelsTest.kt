/**
 * SleepModels Unit Tests
 * =======================
 * Tests for domain models and computed properties.
 * Validates World Sleep Society 2025 Fundamental Sleep Measures calculations.
 */

package ru.sleepcore.companion.domain.model

import org.junit.Assert.*
import org.junit.Test
import ru.sleepcore.companion.data.local.StoredCredentials
import ru.sleepcore.companion.presentation.link.LinkUiState
import java.time.Instant

class SleepModelsTest {

    // ========== SleepStageType Tests ==========

    @Test
    fun `SleepStageType fromHealthConnect returns correct type for valid values`() {
        assertEquals(SleepStageType.UNKNOWN, SleepStageType.fromHealthConnect(0))
        assertEquals(SleepStageType.AWAKE, SleepStageType.fromHealthConnect(1))
        assertEquals(SleepStageType.SLEEPING, SleepStageType.fromHealthConnect(2))
        assertEquals(SleepStageType.OUT_OF_BED, SleepStageType.fromHealthConnect(3))
        assertEquals(SleepStageType.AWAKE_IN_BED, SleepStageType.fromHealthConnect(4))
        assertEquals(SleepStageType.LIGHT, SleepStageType.fromHealthConnect(5))
        assertEquals(SleepStageType.DEEP, SleepStageType.fromHealthConnect(6))
        assertEquals(SleepStageType.REM, SleepStageType.fromHealthConnect(7))
    }

    @Test
    fun `SleepStageType fromHealthConnect returns UNKNOWN for invalid values`() {
        assertEquals(SleepStageType.UNKNOWN, SleepStageType.fromHealthConnect(-1))
        assertEquals(SleepStageType.UNKNOWN, SleepStageType.fromHealthConnect(8))
        assertEquals(SleepStageType.UNKNOWN, SleepStageType.fromHealthConnect(100))
    }

    @Test
    fun `SleepStageType fromString returns correct type`() {
        assertEquals(SleepStageType.LIGHT, SleepStageType.fromString("light"))
        assertEquals(SleepStageType.LIGHT, SleepStageType.fromString("LIGHT"))
        assertEquals(SleepStageType.LIGHT, SleepStageType.fromString("Light"))
        assertEquals(SleepStageType.DEEP, SleepStageType.fromString("deep"))
        assertEquals(SleepStageType.REM, SleepStageType.fromString("rem"))
    }

    @Test
    fun `SleepStageType fromString returns UNKNOWN for invalid strings`() {
        assertEquals(SleepStageType.UNKNOWN, SleepStageType.fromString("invalid"))
        assertEquals(SleepStageType.UNKNOWN, SleepStageType.fromString(""))
        assertEquals(SleepStageType.UNKNOWN, SleepStageType.fromString("sleep"))
    }

    // ========== SleepStage Tests ==========

    @Test
    fun `SleepStage calculates durationMinutes correctly`() {
        val start = Instant.parse("2026-02-07T23:00:00Z")
        val end = Instant.parse("2026-02-08T01:30:00Z")

        val stage = SleepStage(
            type = SleepStageType.DEEP,
            startTime = start,
            endTime = end
        )

        assertEquals(150, stage.durationMinutes) // 2.5 hours = 150 minutes
    }

    @Test
    fun `SleepStage calculates zero duration for same start and end`() {
        val time = Instant.parse("2026-02-07T23:00:00Z")

        val stage = SleepStage(
            type = SleepStageType.LIGHT,
            startTime = time,
            endTime = time
        )

        assertEquals(0, stage.durationMinutes)
    }

    // ========== HrvSample Tests ==========

    @Test
    fun `HrvSample isValid returns true for valid RMSSD range`() {
        val sample = HrvSample(
            timestamp = Instant.now(),
            rmssd = 45.0,
            quality = 0.9
        )

        assertTrue(sample.isValid)
    }

    @Test
    fun `HrvSample isValid returns false for RMSSD below 10`() {
        val sample = HrvSample(
            timestamp = Instant.now(),
            rmssd = 5.0,
            quality = 0.9
        )

        assertFalse(sample.isValid)
    }

    @Test
    fun `HrvSample isValid returns false for RMSSD above 200`() {
        val sample = HrvSample(
            timestamp = Instant.now(),
            rmssd = 250.0,
            quality = 0.9
        )

        assertFalse(sample.isValid)
    }

    @Test
    fun `HrvSample isValid returns false for quality below 0_8`() {
        val sample = HrvSample(
            timestamp = Instant.now(),
            rmssd = 45.0,
            quality = 0.7
        )

        assertFalse(sample.isValid)
    }

    @Test
    fun `HrvSample isValid returns true when quality is null`() {
        val sample = HrvSample(
            timestamp = Instant.now(),
            rmssd = 45.0,
            quality = null
        )

        assertTrue(sample.isValid)
    }

    @Test
    fun `HrvSample isValid boundary test at RMSSD 10`() {
        val sample = HrvSample(
            timestamp = Instant.now(),
            rmssd = 10.0,
            quality = 0.85
        )

        assertTrue(sample.isValid)
    }

    @Test
    fun `HrvSample isValid boundary test at RMSSD 200`() {
        val sample = HrvSample(
            timestamp = Instant.now(),
            rmssd = 200.0,
            quality = 0.85
        )

        assertTrue(sample.isValid)
    }

    @Test
    fun `HrvSample isValid boundary test at quality 0_8`() {
        val sample = HrvSample(
            timestamp = Instant.now(),
            rmssd = 50.0,
            quality = 0.8
        )

        assertTrue(sample.isValid)
    }

    // ========== SleepSession Tests ==========

    @Test
    fun `SleepSession tibMinutes calculates correctly`() {
        val session = createTestSession(
            startTime = "2026-02-07T22:00:00Z",
            endTime = "2026-02-08T06:00:00Z"
        )

        assertEquals(480, session.tibMinutes) // 8 hours
    }

    @Test
    fun `SleepSession tstMinutes sums only sleep stages`() {
        val startTime = Instant.parse("2026-02-07T22:00:00Z")
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = startTime,
            endTime = startTime.plusSeconds(8 * 60 * 60), // 8 hours
            stages = listOf(
                SleepStage(SleepStageType.LIGHT, startTime, startTime.plusSeconds(120 * 60)),
                SleepStage(SleepStageType.DEEP, startTime.plusSeconds(120 * 60), startTime.plusSeconds(180 * 60)),
                SleepStage(SleepStageType.REM, startTime.plusSeconds(180 * 60), startTime.plusSeconds(240 * 60)),
                SleepStage(SleepStageType.AWAKE, startTime.plusSeconds(240 * 60), startTime.plusSeconds(270 * 60))
            )
        )

        // LIGHT(120) + DEEP(60) + REM(60) = 240 minutes (AWAKE excluded)
        assertEquals(240, session.tstMinutes)
    }

    @Test
    fun `SleepSession tstMinutes includes SLEEPING stage type`() {
        val startTime = Instant.parse("2026-02-07T22:00:00Z")
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = startTime,
            endTime = startTime.plusSeconds(8 * 60 * 60),
            stages = listOf(
                SleepStage(SleepStageType.SLEEPING, startTime, startTime.plusSeconds(300 * 60))
            )
        )

        assertEquals(300, session.tstMinutes)
    }

    @Test
    fun `SleepSession sleepEfficiency calculates correctly`() {
        val startTime = Instant.parse("2026-02-07T22:00:00Z")
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = startTime,
            endTime = startTime.plusSeconds(8 * 60 * 60), // TIB = 480 min
            stages = listOf(
                SleepStage(SleepStageType.LIGHT, startTime, startTime.plusSeconds(240 * 60)),
                SleepStage(SleepStageType.DEEP, startTime.plusSeconds(240 * 60), startTime.plusSeconds(360 * 60))
                // TST = 360 min
            )
        )

        // SE = (360/480) * 100 = 75%
        assertEquals(75.0, session.sleepEfficiency, 0.01)
    }

    @Test
    fun `SleepSession sleepEfficiency returns 0 for zero TIB`() {
        val time = Instant.parse("2026-02-07T22:00:00Z")
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = time,
            endTime = time,
            stages = emptyList()
        )

        assertEquals(0.0, session.sleepEfficiency, 0.01)
    }

    @Test
    fun `SleepSession wasoMinutes calculates correctly`() {
        val startTime = Instant.parse("2026-02-07T22:00:00Z")
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = startTime,
            endTime = startTime.plusSeconds(8 * 60 * 60),
            stages = listOf(
                SleepStage(SleepStageType.LIGHT, startTime, startTime.plusSeconds(120 * 60)),
                SleepStage(SleepStageType.AWAKE, startTime.plusSeconds(120 * 60), startTime.plusSeconds(135 * 60)),
                SleepStage(SleepStageType.DEEP, startTime.plusSeconds(135 * 60), startTime.plusSeconds(300 * 60)),
                SleepStage(SleepStageType.AWAKE_IN_BED, startTime.plusSeconds(300 * 60), startTime.plusSeconds(320 * 60)),
                SleepStage(SleepStageType.OUT_OF_BED, startTime.plusSeconds(320 * 60), startTime.plusSeconds(330 * 60))
            )
        )

        // AWAKE(15) + AWAKE_IN_BED(20) + OUT_OF_BED(10) = 45 min
        assertEquals(45, session.wasoMinutes)
    }

    @Test
    fun `SleepSession awakenings counts transitions from sleep to wake`() {
        val startTime = Instant.parse("2026-02-07T22:00:00Z")
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = startTime,
            endTime = startTime.plusSeconds(8 * 60 * 60),
            stages = listOf(
                SleepStage(SleepStageType.LIGHT, startTime, startTime.plusSeconds(60 * 60)),
                SleepStage(SleepStageType.AWAKE, startTime.plusSeconds(60 * 60), startTime.plusSeconds(70 * 60)),
                SleepStage(SleepStageType.DEEP, startTime.plusSeconds(70 * 60), startTime.plusSeconds(180 * 60)),
                SleepStage(SleepStageType.AWAKE_IN_BED, startTime.plusSeconds(180 * 60), startTime.plusSeconds(190 * 60)),
                SleepStage(SleepStageType.REM, startTime.plusSeconds(190 * 60), startTime.plusSeconds(300 * 60)),
                SleepStage(SleepStageType.OUT_OF_BED, startTime.plusSeconds(300 * 60), startTime.plusSeconds(310 * 60))
            )
        )

        // 3 awakenings: LIGHT→AWAKE, DEEP→AWAKE_IN_BED, REM→OUT_OF_BED
        assertEquals(3, session.awakenings)
    }

    @Test
    fun `SleepSession awakenings returns 0 with no wake stages`() {
        val startTime = Instant.parse("2026-02-07T22:00:00Z")
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = startTime,
            endTime = startTime.plusSeconds(8 * 60 * 60),
            stages = listOf(
                SleepStage(SleepStageType.LIGHT, startTime, startTime.plusSeconds(240 * 60)),
                SleepStage(SleepStageType.DEEP, startTime.plusSeconds(240 * 60), startTime.plusSeconds(360 * 60)),
                SleepStage(SleepStageType.REM, startTime.plusSeconds(360 * 60), startTime.plusSeconds(480 * 60))
            )
        )

        assertEquals(0, session.awakenings)
    }

    @Test
    fun `SleepSession meanHrvRmssd calculates average of valid samples`() {
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = Instant.now(),
            endTime = Instant.now().plusSeconds(8 * 60 * 60),
            hrvSamples = listOf(
                HrvSample(Instant.now(), rmssd = 40.0, quality = 0.9),
                HrvSample(Instant.now(), rmssd = 50.0, quality = 0.85),
                HrvSample(Instant.now(), rmssd = 60.0, quality = 0.95)
            )
        )

        // (40 + 50 + 60) / 3 = 50
        assertEquals(50.0, session.meanHrvRmssd!!, 0.01)
    }

    @Test
    fun `SleepSession meanHrvRmssd excludes invalid samples`() {
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = Instant.now(),
            endTime = Instant.now().plusSeconds(8 * 60 * 60),
            hrvSamples = listOf(
                HrvSample(Instant.now(), rmssd = 40.0, quality = 0.9),  // valid
                HrvSample(Instant.now(), rmssd = 5.0, quality = 0.9),   // invalid - too low
                HrvSample(Instant.now(), rmssd = 60.0, quality = 0.5)   // invalid - low quality
            )
        )

        // Only first sample is valid
        assertEquals(40.0, session.meanHrvRmssd!!, 0.01)
    }

    @Test
    fun `SleepSession meanHrvRmssd returns null for empty samples`() {
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = Instant.now(),
            endTime = Instant.now().plusSeconds(8 * 60 * 60),
            hrvSamples = emptyList()
        )

        assertNull(session.meanHrvRmssd)
    }

    @Test
    fun `SleepSession meanHrvRmssd returns null when all samples invalid`() {
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = Instant.now(),
            endTime = Instant.now().plusSeconds(8 * 60 * 60),
            hrvSamples = listOf(
                HrvSample(Instant.now(), rmssd = 5.0, quality = 0.9),
                HrvSample(Instant.now(), rmssd = 300.0, quality = 0.9)
            )
        )

        assertNull(session.meanHrvRmssd)
    }

    @Test
    fun `SleepSession stageDistribution calculates percentages correctly`() {
        val startTime = Instant.parse("2026-02-07T22:00:00Z")
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = startTime,
            endTime = startTime.plusSeconds(4 * 60 * 60), // 4 hours
            stages = listOf(
                SleepStage(SleepStageType.LIGHT, startTime, startTime.plusSeconds(120 * 60)), // 50%
                SleepStage(SleepStageType.DEEP, startTime.plusSeconds(120 * 60), startTime.plusSeconds(180 * 60)), // 25%
                SleepStage(SleepStageType.REM, startTime.plusSeconds(180 * 60), startTime.plusSeconds(240 * 60))  // 25%
            )
        )

        val distribution = session.stageDistribution

        assertEquals(50.0, distribution[SleepStageType.LIGHT]!!, 0.01)
        assertEquals(25.0, distribution[SleepStageType.DEEP]!!, 0.01)
        assertEquals(25.0, distribution[SleepStageType.REM]!!, 0.01)
    }

    @Test
    fun `SleepSession stageDistribution returns empty map for no stages`() {
        val session = SleepSession(
            id = "test-1",
            source = "test",
            startTime = Instant.now(),
            endTime = Instant.now().plusSeconds(8 * 60 * 60),
            stages = emptyList()
        )

        assertTrue(session.stageDistribution.isEmpty())
    }

    // ========== StoredCredentials Tests ==========

    @Test
    fun `StoredCredentials isExpired returns true for past expiration`() {
        val credentials = createTestCredentials(
            expiresAt = Instant.now().minusSeconds(60)
        )

        assertTrue(credentials.isExpired)
    }

    @Test
    fun `StoredCredentials isExpired returns false for future expiration`() {
        val credentials = createTestCredentials(
            expiresAt = Instant.now().plusSeconds(60 * 60)
        )

        assertFalse(credentials.isExpired)
    }

    @Test
    fun `StoredCredentials isExpiringSoon returns true within 7 days`() {
        val credentials = createTestCredentials(
            expiresAt = Instant.now().plusSeconds(5 * 24 * 60 * 60) // 5 days
        )

        assertTrue(credentials.isExpiringSoon)
    }

    @Test
    fun `StoredCredentials isExpiringSoon returns false beyond 7 days`() {
        val credentials = createTestCredentials(
            expiresAt = Instant.now().plusSeconds(10 * 24 * 60 * 60) // 10 days
        )

        assertFalse(credentials.isExpiringSoon)
    }

    // ========== LinkUiState Tests ==========

    @Test
    fun `LinkUiState isValidCode returns true for 6 alphanumeric chars`() {
        val state = LinkUiState(linkCode = "ABC123")
        assertTrue(state.isValidCode)
    }

    @Test
    fun `LinkUiState isValidCode returns false for less than 6 chars`() {
        val state = LinkUiState(linkCode = "ABC12")
        assertFalse(state.isValidCode)
    }

    @Test
    fun `LinkUiState isValidCode returns false for more than 6 chars`() {
        val state = LinkUiState(linkCode = "ABC1234")
        assertFalse(state.isValidCode)
    }

    @Test
    fun `LinkUiState isValidCode returns false for special chars`() {
        val state = LinkUiState(linkCode = "ABC12!")
        assertFalse(state.isValidCode)
    }

    @Test
    fun `LinkUiState isValidCode returns true for all letters`() {
        val state = LinkUiState(linkCode = "ABCDEF")
        assertTrue(state.isValidCode)
    }

    @Test
    fun `LinkUiState isValidCode returns true for all digits`() {
        val state = LinkUiState(linkCode = "123456")
        assertTrue(state.isValidCode)
    }

    // ========== Helper Functions ==========

    private fun createTestSession(
        startTime: String = "2026-02-07T22:00:00Z",
        endTime: String = "2026-02-08T06:00:00Z",
        stages: List<SleepStage> = emptyList()
    ): SleepSession {
        return SleepSession(
            id = "test-session",
            source = "test",
            startTime = Instant.parse(startTime),
            endTime = Instant.parse(endTime),
            stages = stages
        )
    }

    private fun createTestCredentials(
        expiresAt: Instant = Instant.now().plusSeconds(24 * 60 * 60)
    ): ru.sleepcore.companion.data.local.StoredCredentials {
        return ru.sleepcore.companion.data.local.StoredCredentials(
            token = "test-token",
            expiresAt = expiresAt,
            userId = "user-1",
            telegramId = 123456L,
            userName = "Test User",
            deviceId = "device-1",
            linkedAt = Instant.now()
        )
    }
}
