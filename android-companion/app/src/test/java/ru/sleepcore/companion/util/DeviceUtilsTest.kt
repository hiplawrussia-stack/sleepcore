/**
 * DeviceUtils Unit Tests
 * =======================
 * Tests for device identification utilities.
 *
 * Tests cover:
 * - Device name formatting
 * - Device info construction
 * - Android ID fallback logic
 *
 * Note: Uses Robolectric for Context-dependent tests.
 */

package ru.sleepcore.companion.util

import android.content.Context
import android.os.Build
import android.provider.Settings
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import ru.sleepcore.companion.domain.model.DeviceInfo

/**
 * Tests for DeviceUtils with Robolectric
 */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [28])
class DeviceUtilsTest {

    private lateinit var context: Context

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        // Set a consistent ANDROID_ID for test reproducibility
        Settings.Secure.putString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID,
            "test_android_id_12345"
        )
    }

    // ============================================================================
    // getDeviceId tests
    // ============================================================================

    @Test
    fun `getDeviceId returns non-empty string`() {
        val deviceId = DeviceUtils.getDeviceId(context)
        assertTrue(deviceId.isNotEmpty())
    }

    @Test
    fun `getDeviceId returns consistent value for same context`() {
        val id1 = DeviceUtils.getDeviceId(context)
        val id2 = DeviceUtils.getDeviceId(context)
        assertEquals(id1, id2)
    }

    @Test
    fun `getDeviceId does not return null`() {
        val deviceId = DeviceUtils.getDeviceId(context)
        assertNotNull(deviceId)
    }

    // ============================================================================
    // getDeviceName tests
    // ============================================================================

    @Test
    fun `getDeviceName returns non-empty string`() {
        val deviceName = DeviceUtils.getDeviceName()
        assertTrue(deviceName.isNotEmpty())
    }

    @Test
    fun `getDeviceName returns consistent value`() {
        val name1 = DeviceUtils.getDeviceName()
        val name2 = DeviceUtils.getDeviceName()
        assertEquals(name1, name2)
    }

    @Test
    fun `getDeviceName includes manufacturer or model`() {
        val deviceName = DeviceUtils.getDeviceName()
        val manufacturer = Build.MANUFACTURER
        val model = Build.MODEL

        // Device name should contain at least the model
        assertTrue(
            deviceName.contains(model, ignoreCase = true) ||
            deviceName.contains(manufacturer, ignoreCase = true)
        )
    }

    @Test
    fun `getDeviceName does not have leading or trailing spaces`() {
        val deviceName = DeviceUtils.getDeviceName()
        assertEquals(deviceName, deviceName.trim())
    }

    // ============================================================================
    // getManufacturer tests
    // ============================================================================

    @Test
    fun `getManufacturer returns non-empty string`() {
        val manufacturer = DeviceUtils.getManufacturer()
        assertTrue(manufacturer.isNotEmpty())
    }

    @Test
    fun `getManufacturer equals Build MANUFACTURER`() {
        assertEquals(Build.MANUFACTURER, DeviceUtils.getManufacturer())
    }

    @Test
    fun `getManufacturer returns consistent value`() {
        val m1 = DeviceUtils.getManufacturer()
        val m2 = DeviceUtils.getManufacturer()
        assertEquals(m1, m2)
    }

    // ============================================================================
    // getModel tests
    // ============================================================================

    @Test
    fun `getModel returns non-empty string`() {
        val model = DeviceUtils.getModel()
        assertTrue(model.isNotEmpty())
    }

    @Test
    fun `getModel equals Build MODEL`() {
        assertEquals(Build.MODEL, DeviceUtils.getModel())
    }

    @Test
    fun `getModel returns consistent value`() {
        val m1 = DeviceUtils.getModel()
        val m2 = DeviceUtils.getModel()
        assertEquals(m1, m2)
    }

    // ============================================================================
    // getOsVersion tests
    // ============================================================================

    @Test
    fun `getOsVersion returns non-empty string`() {
        val osVersion = DeviceUtils.getOsVersion()
        assertTrue(osVersion.isNotEmpty())
    }

    @Test
    fun `getOsVersion contains Android`() {
        val osVersion = DeviceUtils.getOsVersion()
        assertTrue(osVersion.contains("Android"))
    }

    @Test
    fun `getOsVersion contains API level`() {
        val osVersion = DeviceUtils.getOsVersion()
        assertTrue(osVersion.contains("API"))
    }

    @Test
    fun `getOsVersion contains version release`() {
        val osVersion = DeviceUtils.getOsVersion()
        assertTrue(osVersion.contains(Build.VERSION.RELEASE))
    }

    @Test
    fun `getOsVersion contains SDK_INT`() {
        val osVersion = DeviceUtils.getOsVersion()
        assertTrue(osVersion.contains(Build.VERSION.SDK_INT.toString()))
    }

    @Test
    fun `getOsVersion follows expected format`() {
        val osVersion = DeviceUtils.getOsVersion()
        // Expected format: "Android X.Y (API Z)"
        assertTrue(osVersion.matches(Regex("Android .+ \\(API \\d+\\)")))
    }

    // ============================================================================
    // getAppVersion tests
    // ============================================================================

    @Test
    fun `getAppVersion returns non-empty string`() {
        val appVersion = DeviceUtils.getAppVersion()
        assertTrue(appVersion.isNotEmpty())
    }

    @Test
    fun `getAppVersion returns consistent value`() {
        val v1 = DeviceUtils.getAppVersion()
        val v2 = DeviceUtils.getAppVersion()
        assertEquals(v1, v2)
    }

    // ============================================================================
    // getDeviceInfo tests
    // ============================================================================

    @Test
    fun `getDeviceInfo returns complete DeviceInfo`() {
        val deviceInfo = DeviceUtils.getDeviceInfo(context)

        assertNotNull(deviceInfo.id)
        assertTrue(deviceInfo.id.isNotEmpty())

        assertNotNull(deviceInfo.name)
        assertTrue(deviceInfo.name!!.isNotEmpty())

        assertNotNull(deviceInfo.manufacturer)
        assertTrue(deviceInfo.manufacturer!!.isNotEmpty())

        assertNotNull(deviceInfo.model)
        assertTrue(deviceInfo.model!!.isNotEmpty())

        assertNotNull(deviceInfo.osVersion)
        assertTrue(deviceInfo.osVersion!!.isNotEmpty())

        assertNotNull(deviceInfo.appVersion)
        assertTrue(deviceInfo.appVersion!!.isNotEmpty())
    }

    @Test
    fun `getDeviceInfo id matches getDeviceId`() {
        val deviceInfo = DeviceUtils.getDeviceInfo(context)
        val deviceId = DeviceUtils.getDeviceId(context)
        assertEquals(deviceId, deviceInfo.id)
    }

    @Test
    fun `getDeviceInfo name matches getDeviceName`() {
        val deviceInfo = DeviceUtils.getDeviceInfo(context)
        val deviceName = DeviceUtils.getDeviceName()
        assertEquals(deviceName, deviceInfo.name)
    }

    @Test
    fun `getDeviceInfo manufacturer matches getManufacturer`() {
        val deviceInfo = DeviceUtils.getDeviceInfo(context)
        val manufacturer = DeviceUtils.getManufacturer()
        assertEquals(manufacturer, deviceInfo.manufacturer)
    }

    @Test
    fun `getDeviceInfo model matches getModel`() {
        val deviceInfo = DeviceUtils.getDeviceInfo(context)
        val model = DeviceUtils.getModel()
        assertEquals(model, deviceInfo.model)
    }

    @Test
    fun `getDeviceInfo osVersion matches getOsVersion`() {
        val deviceInfo = DeviceUtils.getDeviceInfo(context)
        val osVersion = DeviceUtils.getOsVersion()
        assertEquals(osVersion, deviceInfo.osVersion)
    }

    @Test
    fun `getDeviceInfo appVersion matches getAppVersion`() {
        val deviceInfo = DeviceUtils.getDeviceInfo(context)
        val appVersion = DeviceUtils.getAppVersion()
        assertEquals(appVersion, deviceInfo.appVersion)
    }

    @Test
    fun `getDeviceInfo returns consistent DeviceInfo`() {
        val info1 = DeviceUtils.getDeviceInfo(context)
        val info2 = DeviceUtils.getDeviceInfo(context)
        assertEquals(info1, info2)
    }
}

/**
 * Tests for DeviceInfo data class
 */
class DeviceInfoTest {

    @Test
    fun `DeviceInfo with all fields`() {
        val info = DeviceInfo(
            id = "device123",
            name = "Test Device",
            manufacturer = "TestCorp",
            model = "Model X",
            osVersion = "Android 14 (API 34)",
            appVersion = "1.0.0"
        )

        assertEquals("device123", info.id)
        assertEquals("Test Device", info.name)
        assertEquals("TestCorp", info.manufacturer)
        assertEquals("Model X", info.model)
        assertEquals("Android 14 (API 34)", info.osVersion)
        assertEquals("1.0.0", info.appVersion)
    }

    @Test
    fun `DeviceInfo with id only`() {
        val info = DeviceInfo(id = "device123")

        assertEquals("device123", info.id)
        assertNull(info.name)
        assertNull(info.manufacturer)
        assertNull(info.model)
        assertNull(info.osVersion)
        assertNull(info.appVersion)
    }

    @Test
    fun `DeviceInfo equality`() {
        val info1 = DeviceInfo(
            id = "device123",
            name = "Device",
            manufacturer = "Corp",
            model = "Model",
            osVersion = "Android 14",
            appVersion = "1.0.0"
        )
        val info2 = DeviceInfo(
            id = "device123",
            name = "Device",
            manufacturer = "Corp",
            model = "Model",
            osVersion = "Android 14",
            appVersion = "1.0.0"
        )
        assertEquals(info1, info2)
    }

    @Test
    fun `DeviceInfo inequality by id`() {
        val info1 = DeviceInfo(id = "device1")
        val info2 = DeviceInfo(id = "device2")
        assertNotEquals(info1, info2)
    }

    @Test
    fun `DeviceInfo hashCode consistency`() {
        val info1 = DeviceInfo(id = "device123", name = "Test")
        val info2 = DeviceInfo(id = "device123", name = "Test")
        assertEquals(info1.hashCode(), info2.hashCode())
    }

    @Test
    fun `DeviceInfo copy with modified id`() {
        val original = DeviceInfo(id = "original", name = "Test")
        val copied = original.copy(id = "copied")
        assertEquals("original", original.id)
        assertEquals("copied", copied.id)
        assertEquals(original.name, copied.name)
    }

    @Test
    fun `DeviceInfo toString contains id`() {
        val info = DeviceInfo(id = "device123")
        assertTrue(info.toString().contains("device123"))
    }

    @Test
    fun `DeviceInfo with empty strings`() {
        val info = DeviceInfo(
            id = "",
            name = "",
            manufacturer = "",
            model = "",
            osVersion = "",
            appVersion = ""
        )
        assertEquals("", info.id)
        assertEquals("", info.name)
    }

    @Test
    fun `DeviceInfo with unicode characters`() {
        val info = DeviceInfo(
            id = "device123",
            name = "Устройство",
            manufacturer = "Производитель"
        )
        assertEquals("Устройство", info.name)
        assertEquals("Производитель", info.manufacturer)
    }

    @Test
    fun `DeviceInfo with special characters`() {
        val info = DeviceInfo(
            id = "device:123/456",
            name = "Device (Test)",
            model = "Model-X_2"
        )
        assertEquals("device:123/456", info.id)
        assertEquals("Device (Test)", info.name)
        assertEquals("Model-X_2", info.model)
    }
}

/**
 * Tests for device name formatting logic
 */
class DeviceNameFormattingTest {

    /**
     * Simulates the getDeviceName logic for testing edge cases
     */
    private fun formatDeviceName(manufacturer: String, model: String): String {
        val formattedManufacturer = manufacturer.replaceFirstChar { it.uppercase() }
        return if (model.startsWith(manufacturer, ignoreCase = true)) {
            model
        } else {
            "$formattedManufacturer $model"
        }
    }

    @Test
    fun `model starting with manufacturer returns model only`() {
        val result = formatDeviceName("Samsung", "Samsung Galaxy S24")
        assertEquals("Samsung Galaxy S24", result)
    }

    @Test
    fun `model not starting with manufacturer returns combined`() {
        val result = formatDeviceName("Samsung", "Galaxy S24")
        assertEquals("Samsung Galaxy S24", result)
    }

    @Test
    fun `lowercase manufacturer gets capitalized`() {
        val result = formatDeviceName("google", "Pixel 8")
        assertEquals("Google Pixel 8", result)
    }

    @Test
    fun `case insensitive manufacturer matching`() {
        val result = formatDeviceName("SAMSUNG", "Samsung Galaxy S24")
        assertEquals("Samsung Galaxy S24", result)
    }

    @Test
    fun `model starting with different case manufacturer`() {
        val result = formatDeviceName("samsung", "SAMSUNG Galaxy")
        assertEquals("SAMSUNG Galaxy", result)
    }

    @Test
    fun `single word model`() {
        val result = formatDeviceName("Google", "Pixel")
        assertEquals("Google Pixel", result)
    }

    @Test
    fun `model equal to manufacturer`() {
        val result = formatDeviceName("Xiaomi", "Xiaomi")
        assertEquals("Xiaomi", result)
    }

    @Test
    fun `empty manufacturer`() {
        val result = formatDeviceName("", "Model")
        // Empty string is always a prefix, so model is returned as-is
        assertEquals("Model", result)
    }

    @Test
    fun `empty model`() {
        val result = formatDeviceName("Manufacturer", "")
        assertEquals("Manufacturer ", result)
    }

    @Test
    fun `model with numbers`() {
        val result = formatDeviceName("OnePlus", "12 Pro")
        assertEquals("OnePlus 12 Pro", result)
    }

    @Test
    fun `manufacturer with spaces`() {
        val result = formatDeviceName("lg electronics", "G8 ThinQ")
        assertEquals("Lg electronics G8 ThinQ", result)
    }
}

/**
 * Tests for OS version formatting
 */
class OsVersionFormattingTest {

    /**
     * Simulates getOsVersion logic for testing
     */
    private fun formatOsVersion(release: String, sdkInt: Int): String {
        return "Android $release (API $sdkInt)"
    }

    @Test
    fun `formats Android 14`() {
        val result = formatOsVersion("14", 34)
        assertEquals("Android 14 (API 34)", result)
    }

    @Test
    fun `formats Android 13`() {
        val result = formatOsVersion("13", 33)
        assertEquals("Android 13 (API 33)", result)
    }

    @Test
    fun `formats Android 12L`() {
        val result = formatOsVersion("12L", 32)
        assertEquals("Android 12L (API 32)", result)
    }

    @Test
    fun `formats Android 9`() {
        val result = formatOsVersion("9", 28)
        assertEquals("Android 9 (API 28)", result)
    }

    @Test
    fun `formats Android with point release`() {
        val result = formatOsVersion("14.0.1", 34)
        assertEquals("Android 14.0.1 (API 34)", result)
    }

    @Test
    fun `formats with beta version`() {
        val result = formatOsVersion("15 Beta", 35)
        assertEquals("Android 15 Beta (API 35)", result)
    }
}
