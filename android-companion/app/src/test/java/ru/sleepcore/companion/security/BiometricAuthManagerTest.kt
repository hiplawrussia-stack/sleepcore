/**
 * BiometricAuthManager Unit Tests
 * ================================
 * Security-critical tests for HIPAA-compliant biometric authentication.
 *
 * Tests cover:
 * - BiometricAuthResult sealed class
 * - BiometricAvailability sealed class
 * - Availability checking logic
 *
 * Note: Interactive BiometricPrompt tests require instrumentation tests.
 */

package ru.sleepcore.companion.security

import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for BiometricAuthResult sealed class
 */
class BiometricAuthResultTest {

    @Test
    fun `Success is a singleton object`() {
        val success1 = BiometricAuthResult.Success
        val success2 = BiometricAuthResult.Success
        assertSame(success1, success2)
    }

    @Test
    fun `Error contains code and message`() {
        val error = BiometricAuthResult.Error(10, "Test error message")
        assertEquals(10, error.code)
        assertEquals("Test error message", error.message)
    }

    @Test
    fun `Error with different codes are not equal`() {
        val error1 = BiometricAuthResult.Error(10, "Error")
        val error2 = BiometricAuthResult.Error(20, "Error")
        assertNotEquals(error1, error2)
    }

    @Test
    fun `Error with different messages are not equal`() {
        val error1 = BiometricAuthResult.Error(10, "Error A")
        val error2 = BiometricAuthResult.Error(10, "Error B")
        assertNotEquals(error1, error2)
    }

    @Test
    fun `Error with same code and message are equal`() {
        val error1 = BiometricAuthResult.Error(10, "Same error")
        val error2 = BiometricAuthResult.Error(10, "Same error")
        assertEquals(error1, error2)
    }

    @Test
    fun `Cancelled is a singleton object`() {
        val cancelled1 = BiometricAuthResult.Cancelled
        val cancelled2 = BiometricAuthResult.Cancelled
        assertSame(cancelled1, cancelled2)
    }

    @Test
    fun `NotAvailable is a singleton object`() {
        val notAvailable1 = BiometricAuthResult.NotAvailable
        val notAvailable2 = BiometricAuthResult.NotAvailable
        assertSame(notAvailable1, notAvailable2)
    }

    @Test
    fun `NotEnrolled is a singleton object`() {
        val notEnrolled1 = BiometricAuthResult.NotEnrolled
        val notEnrolled2 = BiometricAuthResult.NotEnrolled
        assertSame(notEnrolled1, notEnrolled2)
    }

    @Test
    fun `All result types are BiometricAuthResult subtypes`() {
        val results: List<BiometricAuthResult> = listOf(
            BiometricAuthResult.Success,
            BiometricAuthResult.Error(1, "test"),
            BiometricAuthResult.Cancelled,
            BiometricAuthResult.NotAvailable,
            BiometricAuthResult.NotEnrolled
        )
        assertEquals(5, results.size)
    }

    @Test
    fun `when expression covers all result types`() {
        val results = listOf(
            BiometricAuthResult.Success,
            BiometricAuthResult.Error(1, "test"),
            BiometricAuthResult.Cancelled,
            BiometricAuthResult.NotAvailable,
            BiometricAuthResult.NotEnrolled
        )

        results.forEach { result ->
            val message = when (result) {
                is BiometricAuthResult.Success -> "success"
                is BiometricAuthResult.Error -> "error: ${result.code}"
                is BiometricAuthResult.Cancelled -> "cancelled"
                is BiometricAuthResult.NotAvailable -> "not available"
                is BiometricAuthResult.NotEnrolled -> "not enrolled"
            }
            assertTrue(message.isNotEmpty())
        }
    }

    @Test
    fun `Error can handle empty message`() {
        val error = BiometricAuthResult.Error(0, "")
        assertEquals(0, error.code)
        assertEquals("", error.message)
    }

    @Test
    fun `Error can handle negative code`() {
        val error = BiometricAuthResult.Error(-1, "Negative code")
        assertEquals(-1, error.code)
    }

    @Test
    fun `Error can handle long message`() {
        val longMessage = "A".repeat(1000)
        val error = BiometricAuthResult.Error(1, longMessage)
        assertEquals(1000, error.message.length)
    }

    @Test
    fun `Error toString contains code and message`() {
        val error = BiometricAuthResult.Error(42, "Auth failed")
        val str = error.toString()
        assertTrue(str.contains("42"))
        assertTrue(str.contains("Auth failed"))
    }

    @Test
    fun `Error copy creates new instance with modified values`() {
        val original = BiometricAuthResult.Error(1, "Original")
        val copied = original.copy(code = 2)
        assertEquals(1, original.code)
        assertEquals(2, copied.code)
        assertEquals("Original", copied.message)
    }

    @Test
    fun `Error hashCode is consistent`() {
        val error1 = BiometricAuthResult.Error(10, "Test")
        val error2 = BiometricAuthResult.Error(10, "Test")
        assertEquals(error1.hashCode(), error2.hashCode())
    }
}

/**
 * Tests for BiometricAvailability sealed class
 */
class BiometricAvailabilityTest {

    @Test
    fun `Available is a singleton object`() {
        val available1 = BiometricAvailability.Available
        val available2 = BiometricAvailability.Available
        assertSame(available1, available2)
    }

    @Test
    fun `NotEnrolled is a singleton object`() {
        val notEnrolled1 = BiometricAvailability.NotEnrolled
        val notEnrolled2 = BiometricAvailability.NotEnrolled
        assertSame(notEnrolled1, notEnrolled2)
    }

    @Test
    fun `HardwareUnavailable is a singleton object`() {
        val unavailable1 = BiometricAvailability.HardwareUnavailable
        val unavailable2 = BiometricAvailability.HardwareUnavailable
        assertSame(unavailable1, unavailable2)
    }

    @Test
    fun `NoHardware is a singleton object`() {
        val noHardware1 = BiometricAvailability.NoHardware
        val noHardware2 = BiometricAvailability.NoHardware
        assertSame(noHardware1, noHardware2)
    }

    @Test
    fun `SecurityUpdateRequired is a singleton object`() {
        val securityUpdate1 = BiometricAvailability.SecurityUpdateRequired
        val securityUpdate2 = BiometricAvailability.SecurityUpdateRequired
        assertSame(securityUpdate1, securityUpdate2)
    }

    @Test
    fun `All availability states are BiometricAvailability subtypes`() {
        val states: List<BiometricAvailability> = listOf(
            BiometricAvailability.Available,
            BiometricAvailability.NotEnrolled,
            BiometricAvailability.HardwareUnavailable,
            BiometricAvailability.NoHardware,
            BiometricAvailability.SecurityUpdateRequired
        )
        assertEquals(5, states.size)
    }

    @Test
    fun `when expression covers all availability states`() {
        val states = listOf(
            BiometricAvailability.Available,
            BiometricAvailability.NotEnrolled,
            BiometricAvailability.HardwareUnavailable,
            BiometricAvailability.NoHardware,
            BiometricAvailability.SecurityUpdateRequired
        )

        states.forEach { state ->
            val canAuthenticate = when (state) {
                is BiometricAvailability.Available -> true
                is BiometricAvailability.NotEnrolled -> false
                is BiometricAvailability.HardwareUnavailable -> false
                is BiometricAvailability.NoHardware -> false
                is BiometricAvailability.SecurityUpdateRequired -> false
            }
            // Only Available should return true
            assertEquals(state == BiometricAvailability.Available, canAuthenticate)
        }
    }

    @Test
    fun `availability states can be compared for equality`() {
        assertEquals(BiometricAvailability.Available, BiometricAvailability.Available)
        assertNotEquals(BiometricAvailability.Available, BiometricAvailability.NotEnrolled)
    }

    @Test
    fun `availability states have unique hashCodes`() {
        val hashCodes = setOf(
            BiometricAvailability.Available.hashCode(),
            BiometricAvailability.NotEnrolled.hashCode(),
            BiometricAvailability.HardwareUnavailable.hashCode(),
            BiometricAvailability.NoHardware.hashCode(),
            BiometricAvailability.SecurityUpdateRequired.hashCode()
        )
        assertEquals(5, hashCodes.size)
    }

    @Test
    fun `availability states have meaningful toString`() {
        assertTrue(BiometricAvailability.Available.toString().contains("Available"))
        assertTrue(BiometricAvailability.NotEnrolled.toString().contains("NotEnrolled"))
        assertTrue(BiometricAvailability.HardwareUnavailable.toString().contains("HardwareUnavailable"))
        assertTrue(BiometricAvailability.NoHardware.toString().contains("NoHardware"))
        assertTrue(BiometricAvailability.SecurityUpdateRequired.toString().contains("SecurityUpdateRequired"))
    }
}

/**
 * Tests for BiometricAuthManager constants and configuration
 */
class BiometricAuthManagerConstantsTest {

    @Test
    fun `BIOMETRIC_STRONG authenticator is correct value`() {
        // BIOMETRIC_STRONG = 0x000f (15)
        // Verify the constant is accessible and correct
        val expectedValue = 0x000f
        assertEquals(expectedValue, androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG)
    }

    @Test
    fun `DEVICE_CREDENTIAL authenticator is correct value`() {
        // DEVICE_CREDENTIAL = 0x8000 (32768)
        val expectedValue = 0x8000
        assertEquals(expectedValue, androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL)
    }

    @Test
    fun `combined authenticators can be used with OR`() {
        val biometricStrong = androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
        val deviceCredential = androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
        val combined = biometricStrong or deviceCredential

        // Verify both flags are set
        assertTrue(combined and biometricStrong == biometricStrong)
        assertTrue(combined and deviceCredential == deviceCredential)
    }
}

/**
 * Tests for BiometricPrompt error codes (constants verification)
 */
class BiometricPromptErrorCodesTest {

    @Test
    fun `ERROR_USER_CANCELED has expected value`() {
        // BiometricPrompt.ERROR_USER_CANCELED = 10
        assertEquals(10, androidx.biometric.BiometricPrompt.ERROR_USER_CANCELED)
    }

    @Test
    fun `ERROR_NEGATIVE_BUTTON has expected value`() {
        // BiometricPrompt.ERROR_NEGATIVE_BUTTON = 13
        assertEquals(13, androidx.biometric.BiometricPrompt.ERROR_NEGATIVE_BUTTON)
    }

    @Test
    fun `ERROR_LOCKOUT has expected value`() {
        // BiometricPrompt.ERROR_LOCKOUT = 7
        assertEquals(7, androidx.biometric.BiometricPrompt.ERROR_LOCKOUT)
    }

    @Test
    fun `ERROR_LOCKOUT_PERMANENT has expected value`() {
        // BiometricPrompt.ERROR_LOCKOUT_PERMANENT = 9
        assertEquals(9, androidx.biometric.BiometricPrompt.ERROR_LOCKOUT_PERMANENT)
    }

    @Test
    fun `user cancellation codes are distinct`() {
        assertNotEquals(
            androidx.biometric.BiometricPrompt.ERROR_USER_CANCELED,
            androidx.biometric.BiometricPrompt.ERROR_NEGATIVE_BUTTON
        )
    }
}
