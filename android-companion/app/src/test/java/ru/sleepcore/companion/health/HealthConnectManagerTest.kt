/**
 * HealthConnectManager Unit Tests
 * =================================
 * Tests for Health Connect availability and permission checks.
 *
 * Note: Full integration tests require instrumented tests with Health Connect APK.
 */

package ru.sleepcore.companion.health

import io.mockk.*
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import ru.sleepcore.companion.domain.model.SleepStageType

class HealthConnectManagerTest {

    // ========== HealthConnectAvailability Tests ==========

    @Test
    fun `HealthConnectAvailability Available is singleton`() {
        assertSame(HealthConnectAvailability.Available, HealthConnectAvailability.Available)
    }

    @Test
    fun `HealthConnectAvailability NotInstalled is singleton`() {
        assertSame(HealthConnectAvailability.NotInstalled, HealthConnectAvailability.NotInstalled)
    }

    @Test
    fun `HealthConnectAvailability NotSupported is singleton`() {
        assertSame(HealthConnectAvailability.NotSupported, HealthConnectAvailability.NotSupported)
    }

    @Test
    fun `HealthConnectAvailability UpdateRequired contains intent`() {
        val mockIntent = mockk<android.content.Intent>()
        val availability = HealthConnectAvailability.UpdateRequired(mockIntent)

        assertEquals(mockIntent, availability.intent)
    }

    @Test
    fun `HealthConnectAvailability UpdateRequired can have null intent`() {
        val availability = HealthConnectAvailability.UpdateRequired(null)

        assertNull(availability.intent)
    }

    // ========== HealthConnectPermissions Tests ==========

    @Test
    fun `HealthConnectPermissions hasMinimumPermissions true when sleepRead is true`() {
        val permissions = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = false,
            heartRateRead = false,
            restingHeartRateRead = false
        )

        assertTrue(permissions.hasMinimumPermissions)
    }

    @Test
    fun `HealthConnectPermissions hasMinimumPermissions false when sleepRead is false`() {
        val permissions = HealthConnectPermissions(
            sleepRead = false,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true
        )

        assertFalse(permissions.hasMinimumPermissions)
    }

    @Test
    fun `HealthConnectPermissions hasFullPermissions true when all main permissions granted`() {
        val permissions = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true
        )

        assertTrue(permissions.hasFullPermissions)
    }

    @Test
    fun `HealthConnectPermissions hasFullPermissions false when any permission missing`() {
        val permissionsMissingSleep = HealthConnectPermissions(
            sleepRead = false,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true
        )
        assertFalse(permissionsMissingSleep.hasFullPermissions)

        val permissionsMissingHrv = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = false,
            heartRateRead = true,
            restingHeartRateRead = true
        )
        assertFalse(permissionsMissingHrv.hasFullPermissions)

        val permissionsMissingHr = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = false,
            restingHeartRateRead = true
        )
        assertFalse(permissionsMissingHr.hasFullPermissions)

        val permissionsMissingResting = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = false
        )
        assertFalse(permissionsMissingResting.hasFullPermissions)
    }

    @Test
    fun `HealthConnectPermissions missingPermissions returns correct set`() {
        val permissions = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = false,
            heartRateRead = true,
            restingHeartRateRead = false
        )

        val missing = permissions.missingPermissions

        assertEquals(2, missing.size)
        // The exact permission strings depend on Health Connect SDK
        assertTrue(missing.any { it.contains("HEART_RATE_VARIABILITY") })
        assertTrue(missing.any { it.contains("RESTING_HEART_RATE") })
    }

    @Test
    fun `HealthConnectPermissions missingPermissions empty when all granted`() {
        val permissions = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true
        )

        assertTrue(permissions.missingPermissions.isEmpty())
    }

    @Test
    fun `HealthConnectPermissions default values are all false`() {
        val permissions = HealthConnectPermissions()

        assertFalse(permissions.sleepRead)
        assertFalse(permissions.hrvRead)
        assertFalse(permissions.heartRateRead)
        assertFalse(permissions.restingHeartRateRead)
        assertFalse(permissions.backgroundRead)
        assertFalse(permissions.historyRead)
    }

    // ========== Background/History Permission Tests ==========

    @Test
    fun `HealthConnectPermissions hasAllPermissions true when all permissions granted`() {
        val permissions = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true,
            backgroundRead = true,
            historyRead = true
        )

        assertTrue(permissions.hasAllPermissions)
    }

    @Test
    fun `HealthConnectPermissions hasAllPermissions false when background missing`() {
        val permissions = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true,
            backgroundRead = false,
            historyRead = true
        )

        assertFalse(permissions.hasAllPermissions)
    }

    @Test
    fun `HealthConnectPermissions hasAllPermissions false when history missing`() {
        val permissions = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true,
            backgroundRead = true,
            historyRead = false
        )

        assertFalse(permissions.hasAllPermissions)
    }

    @Test
    fun `HealthConnectPermissions canSyncInBackground true when sleep and background granted`() {
        val permissions = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = false,
            heartRateRead = false,
            restingHeartRateRead = false,
            backgroundRead = true,
            historyRead = false
        )

        assertTrue(permissions.canSyncInBackground)
    }

    @Test
    fun `HealthConnectPermissions canSyncInBackground false when background missing`() {
        val permissions = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true,
            backgroundRead = false,
            historyRead = true
        )

        assertFalse(permissions.canSyncInBackground)
    }

    @Test
    fun `HealthConnectPermissions canSyncInBackground false when sleep missing`() {
        val permissions = HealthConnectPermissions(
            sleepRead = false,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true,
            backgroundRead = true,
            historyRead = true
        )

        assertFalse(permissions.canSyncInBackground)
    }

    @Test
    fun `HealthConnectPermissions missingOptionalPermissions returns correct set`() {
        val permissions = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true,
            backgroundRead = false,
            historyRead = false
        )

        val missing = permissions.missingOptionalPermissions

        assertEquals(2, missing.size)
        assertTrue(missing.any { it.contains("BACKGROUND") })
        assertTrue(missing.any { it.contains("HISTORY") })
    }

    @Test
    fun `HealthConnectPermissions missingOptionalPermissions empty when all granted`() {
        val permissions = HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true,
            backgroundRead = true,
            historyRead = true
        )

        assertTrue(permissions.missingOptionalPermissions.isEmpty())
    }

    // ========== SleepStageType Mapping Tests ==========

    @Test
    fun `SleepStageType maps correctly from Health Connect values`() {
        // These values correspond to SleepSessionRecord.STAGE_TYPE_*
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
    fun `SleepStageType healthConnectValue returns correct values`() {
        assertEquals(0, SleepStageType.UNKNOWN.healthConnectValue)
        assertEquals(1, SleepStageType.AWAKE.healthConnectValue)
        assertEquals(2, SleepStageType.SLEEPING.healthConnectValue)
        assertEquals(3, SleepStageType.OUT_OF_BED.healthConnectValue)
        assertEquals(4, SleepStageType.AWAKE_IN_BED.healthConnectValue)
        assertEquals(5, SleepStageType.LIGHT.healthConnectValue)
        assertEquals(6, SleepStageType.DEEP.healthConnectValue)
        assertEquals(7, SleepStageType.REM.healthConnectValue)
    }

    // ========== Required Permissions Tests ==========

    @Test
    fun `REQUIRED_PERMISSIONS contains all 4 required permissions`() {
        assertEquals(4, HealthConnectManager.REQUIRED_PERMISSIONS.size)
    }

    @Test
    fun `MINIMUM_PERMISSIONS contains only sleep permission`() {
        assertEquals(1, HealthConnectManager.MINIMUM_PERMISSIONS.size)
    }

    @Test
    fun `EXTENDED_PERMISSIONS contains all 9 permissions`() {
        // 4 required + 3 enhanced metrics + background + history
        assertEquals(9, HealthConnectManager.EXTENDED_PERMISSIONS.size)
    }

    @Test
    fun `EXTENDED_PERMISSIONS includes REQUIRED_PERMISSIONS`() {
        assertTrue(
            HealthConnectManager.EXTENDED_PERMISSIONS.containsAll(
                HealthConnectManager.REQUIRED_PERMISSIONS
            )
        )
    }

    @Test
    fun `EXTENDED_PERMISSIONS includes ENHANCED_METRICS_PERMISSIONS`() {
        assertTrue(
            HealthConnectManager.EXTENDED_PERMISSIONS.containsAll(
                HealthConnectManager.ENHANCED_METRICS_PERMISSIONS
            )
        )
    }

    @Test
    fun `ENHANCED_METRICS_PERMISSIONS contains 3 permissions`() {
        // SpO2, respirationRate, skinTemperature
        assertEquals(3, HealthConnectManager.ENHANCED_METRICS_PERMISSIONS.size)
    }

    @Test
    fun `EXTENDED_PERMISSIONS includes BACKGROUND_READ_PERMISSION`() {
        assertTrue(
            HealthConnectManager.EXTENDED_PERMISSIONS.contains(
                HealthConnectManager.BACKGROUND_READ_PERMISSION
            )
        )
    }

    @Test
    fun `EXTENDED_PERMISSIONS includes HISTORY_READ_PERMISSION`() {
        assertTrue(
            HealthConnectManager.EXTENDED_PERMISSIONS.contains(
                HealthConnectManager.HISTORY_READ_PERMISSION
            )
        )
    }

    @Test
    fun `BACKGROUND_READ_PERMISSION is not null`() {
        assertNotNull(HealthConnectManager.BACKGROUND_READ_PERMISSION)
    }

    @Test
    fun `HISTORY_READ_PERMISSION is not null`() {
        assertNotNull(HealthConnectManager.HISTORY_READ_PERMISSION)
    }
}
