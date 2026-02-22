/**
 * ErrorLogger Unit Tests
 * =======================
 * Tests for centralized error logging utility with HIPAA PHI filtering.
 *
 * Tests cover:
 * - ErrorSeverity enum
 * - ErrorContext data class
 * - PHI filtering logic (HIPAA compliance)
 * - Log message building
 */

package ru.sleepcore.companion.util

import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for ErrorSeverity enum
 */
class ErrorSeverityTest {

    @Test
    fun `all severity levels exist`() {
        val severities = ErrorSeverity.entries
        assertEquals(5, severities.size)
    }

    @Test
    fun `severity levels have correct names`() {
        assertEquals("DEBUG", ErrorSeverity.DEBUG.name)
        assertEquals("INFO", ErrorSeverity.INFO.name)
        assertEquals("WARNING", ErrorSeverity.WARNING.name)
        assertEquals("ERROR", ErrorSeverity.ERROR.name)
        assertEquals("CRITICAL", ErrorSeverity.CRITICAL.name)
    }

    @Test
    fun `severity levels have correct ordinals`() {
        assertEquals(0, ErrorSeverity.DEBUG.ordinal)
        assertEquals(1, ErrorSeverity.INFO.ordinal)
        assertEquals(2, ErrorSeverity.WARNING.ordinal)
        assertEquals(3, ErrorSeverity.ERROR.ordinal)
        assertEquals(4, ErrorSeverity.CRITICAL.ordinal)
    }

    @Test
    fun `severities can be compared by ordinal`() {
        assertTrue(ErrorSeverity.DEBUG.ordinal < ErrorSeverity.INFO.ordinal)
        assertTrue(ErrorSeverity.INFO.ordinal < ErrorSeverity.WARNING.ordinal)
        assertTrue(ErrorSeverity.WARNING.ordinal < ErrorSeverity.ERROR.ordinal)
        assertTrue(ErrorSeverity.ERROR.ordinal < ErrorSeverity.CRITICAL.ordinal)
    }

    @Test
    fun `valueOf returns correct severity`() {
        assertEquals(ErrorSeverity.DEBUG, ErrorSeverity.valueOf("DEBUG"))
        assertEquals(ErrorSeverity.INFO, ErrorSeverity.valueOf("INFO"))
        assertEquals(ErrorSeverity.WARNING, ErrorSeverity.valueOf("WARNING"))
        assertEquals(ErrorSeverity.ERROR, ErrorSeverity.valueOf("ERROR"))
        assertEquals(ErrorSeverity.CRITICAL, ErrorSeverity.valueOf("CRITICAL"))
    }

    @Test(expected = IllegalArgumentException::class)
    fun `valueOf throws for invalid name`() {
        ErrorSeverity.valueOf("INVALID")
    }

    @Test
    fun `entries returns all severities in order`() {
        val entries = ErrorSeverity.entries
        assertEquals(ErrorSeverity.DEBUG, entries[0])
        assertEquals(ErrorSeverity.INFO, entries[1])
        assertEquals(ErrorSeverity.WARNING, entries[2])
        assertEquals(ErrorSeverity.ERROR, entries[3])
        assertEquals(ErrorSeverity.CRITICAL, entries[4])
    }
}

/**
 * Tests for ErrorContext data class
 */
class ErrorContextTest {

    @Test
    fun `ErrorContext with required fields only`() {
        val context = ErrorContext(
            tag = "TestTag",
            operation = "testOperation"
        )
        assertEquals("TestTag", context.tag)
        assertEquals("testOperation", context.operation)
        assertNull(context.userId)
        assertNull(context.deviceId)
        assertTrue(context.extras.isEmpty())
    }

    @Test
    fun `ErrorContext with all fields`() {
        val extras = mapOf("key1" to "value1", "key2" to 42)
        val context = ErrorContext(
            tag = "FullTag",
            operation = "fullOperation",
            userId = "user123",
            deviceId = "device456",
            extras = extras
        )
        assertEquals("FullTag", context.tag)
        assertEquals("fullOperation", context.operation)
        assertEquals("user123", context.userId)
        assertEquals("device456", context.deviceId)
        assertEquals(2, context.extras.size)
        assertEquals("value1", context.extras["key1"])
        assertEquals(42, context.extras["key2"])
    }

    @Test
    fun `ErrorContext with empty extras`() {
        val context = ErrorContext(
            tag = "Tag",
            operation = "op",
            extras = emptyMap()
        )
        assertTrue(context.extras.isEmpty())
    }

    @Test
    fun `ErrorContext with null values in extras`() {
        val extras = mapOf<String, Any?>("key1" to null, "key2" to "value")
        val context = ErrorContext(
            tag = "Tag",
            operation = "op",
            extras = extras
        )
        assertEquals(2, context.extras.size)
        assertNull(context.extras["key1"])
        assertEquals("value", context.extras["key2"])
    }

    @Test
    fun `ErrorContext equality`() {
        val context1 = ErrorContext("Tag", "op", "user1", "device1")
        val context2 = ErrorContext("Tag", "op", "user1", "device1")
        assertEquals(context1, context2)
    }

    @Test
    fun `ErrorContext inequality by tag`() {
        val context1 = ErrorContext("Tag1", "op")
        val context2 = ErrorContext("Tag2", "op")
        assertNotEquals(context1, context2)
    }

    @Test
    fun `ErrorContext inequality by operation`() {
        val context1 = ErrorContext("Tag", "op1")
        val context2 = ErrorContext("Tag", "op2")
        assertNotEquals(context1, context2)
    }

    @Test
    fun `ErrorContext hashCode consistency`() {
        val context1 = ErrorContext("Tag", "op", "user", "device")
        val context2 = ErrorContext("Tag", "op", "user", "device")
        assertEquals(context1.hashCode(), context2.hashCode())
    }

    @Test
    fun `ErrorContext copy with modified tag`() {
        val original = ErrorContext("Original", "op")
        val copied = original.copy(tag = "Copied")
        assertEquals("Original", original.tag)
        assertEquals("Copied", copied.tag)
        assertEquals(original.operation, copied.operation)
    }

    @Test
    fun `ErrorContext copy with modified operation`() {
        val original = ErrorContext("Tag", "original")
        val copied = original.copy(operation = "copied")
        assertEquals("original", original.operation)
        assertEquals("copied", copied.operation)
    }

    @Test
    fun `ErrorContext toString contains all fields`() {
        val context = ErrorContext(
            tag = "TestTag",
            operation = "testOp",
            userId = "user123"
        )
        val str = context.toString()
        assertTrue(str.contains("TestTag"))
        assertTrue(str.contains("testOp"))
        assertTrue(str.contains("user123"))
    }

    @Test
    fun `ErrorContext with special characters in tag`() {
        val context = ErrorContext(
            tag = "Tag:With:Colons",
            operation = "op/with/slashes"
        )
        assertEquals("Tag:With:Colons", context.tag)
        assertEquals("op/with/slashes", context.operation)
    }

    @Test
    fun `ErrorContext with unicode in extras`() {
        val extras = mapOf("message" to "Привет мир", "emoji" to "🌙")
        val context = ErrorContext(
            tag = "Unicode",
            operation = "test",
            extras = extras
        )
        assertEquals("Привет мир", context.extras["message"])
        assertEquals("🌙", context.extras["emoji"])
    }

    @Test
    fun `ErrorContext with numeric extras`() {
        val extras = mapOf<String, Any?>(
            "int" to 42,
            "long" to 1234567890L,
            "double" to 3.14,
            "float" to 2.5f
        )
        val context = ErrorContext("Tag", "op", extras = extras)
        assertEquals(42, context.extras["int"])
        assertEquals(1234567890L, context.extras["long"])
        assertEquals(3.14, context.extras["double"])
        assertEquals(2.5f, context.extras["float"])
    }

    @Test
    fun `ErrorContext with boolean extras`() {
        val extras = mapOf<String, Any?>("success" to true, "retry" to false)
        val context = ErrorContext("Tag", "op", extras = extras)
        assertEquals(true, context.extras["success"])
        assertEquals(false, context.extras["retry"])
    }

    @Test
    fun `ErrorContext with list extras`() {
        val extras = mapOf<String, Any?>("items" to listOf(1, 2, 3))
        val context = ErrorContext("Tag", "op", extras = extras)
        assertEquals(listOf(1, 2, 3), context.extras["items"])
    }
}

/**
 * Tests for PHI filtering patterns (HIPAA compliance)
 */
class PhiFilteringTest {

    // Simulate the PHI filtering logic from ErrorLogger
    // HIPAA PHI identifiers - catch all variations (camelCase, snake_case, etc.)
    private val phiKeys = setOf(
        "email", "name", "phone", "address", "dob", "birth",
        "ssn", "social", "medical", "health", "diagnosis", "medication",
        "sleep", "heart", "hrv", "spo2", "oxygen", "respiratory",
        "weight", "height", "bmi", "temperature",
        "password", "token", "secret", "key", "credential", "auth"
    )

    private fun isSafeKey(key: String): Boolean {
        val lowerKey = key.lowercase()
        return !phiKeys.any { lowerKey.contains(it) }
    }

    private fun isSafeValue(value: String): Boolean {
        // Check for email pattern
        if (value.contains("@") && value.contains(".")) return false
        // Check for SSN pattern
        if (value.matches(Regex("\\d{3}-\\d{2}-\\d{4}"))) return false
        // Check for phone pattern
        if (value.matches(Regex("\\+?\\d{10,}"))) return false
        return true
    }

    @Test
    fun `blocks email key`() {
        assertFalse(isSafeKey("email"))
        assertFalse(isSafeKey("userEmail"))
        assertFalse(isSafeKey("EMAIL"))
        assertFalse(isSafeKey("user_email_address"))
    }

    @Test
    fun `blocks name key`() {
        assertFalse(isSafeKey("name"))
        assertFalse(isSafeKey("userName"))
        assertFalse(isSafeKey("firstName"))
        assertFalse(isSafeKey("last_name"))
    }

    @Test
    fun `blocks phone key`() {
        assertFalse(isSafeKey("phone"))
        assertFalse(isSafeKey("phoneNumber"))
        assertFalse(isSafeKey("user_phone"))
    }

    @Test
    fun `blocks address key`() {
        assertFalse(isSafeKey("address"))
        assertFalse(isSafeKey("homeAddress"))
        assertFalse(isSafeKey("user_address"))
    }

    @Test
    fun `blocks date of birth keys`() {
        assertFalse(isSafeKey("dob"))
        assertFalse(isSafeKey("birthdate"))
        assertFalse(isSafeKey("dateOfBirth"))
    }

    @Test
    fun `blocks SSN key`() {
        assertFalse(isSafeKey("ssn"))
        assertFalse(isSafeKey("socialSecurityNumber"))
    }

    @Test
    fun `blocks medical keys`() {
        assertFalse(isSafeKey("medical"))
        assertFalse(isSafeKey("medicalRecord"))
        assertFalse(isSafeKey("medical_history"))
    }

    @Test
    fun `blocks health keys`() {
        assertFalse(isSafeKey("health"))
        assertFalse(isSafeKey("healthData"))
        assertFalse(isSafeKey("health_records"))
    }

    @Test
    fun `blocks diagnosis key`() {
        assertFalse(isSafeKey("diagnosis"))
        assertFalse(isSafeKey("diagnosisCode"))
    }

    @Test
    fun `blocks medication key`() {
        assertFalse(isSafeKey("medication"))
        assertFalse(isSafeKey("currentMedications"))
    }

    @Test
    fun `blocks sleep data keys`() {
        assertFalse(isSafeKey("sleep_data"))
        assertFalse(isSafeKey("sleepData"))
    }

    @Test
    fun `blocks biometric keys`() {
        assertFalse(isSafeKey("heart_rate"))
        assertFalse(isSafeKey("hrv"))
        assertFalse(isSafeKey("spo2"))
        assertFalse(isSafeKey("weight"))
        assertFalse(isSafeKey("height"))
    }

    @Test
    fun `blocks credential keys`() {
        assertFalse(isSafeKey("password"))
        assertFalse(isSafeKey("token"))
        assertFalse(isSafeKey("secret"))
        assertFalse(isSafeKey("key"))
        assertFalse(isSafeKey("credential"))
        assertFalse(isSafeKey("apiKey"))
        assertFalse(isSafeKey("accessToken"))
        assertFalse(isSafeKey("secretKey"))
    }

    @Test
    fun `allows safe keys`() {
        assertTrue(isSafeKey("operation"))
        assertTrue(isSafeKey("attempt"))
        assertTrue(isSafeKey("retryCount"))
        assertTrue(isSafeKey("status"))
        assertTrue(isSafeKey("errorCode"))
        assertTrue(isSafeKey("timestamp"))
        assertTrue(isSafeKey("duration"))
        assertTrue(isSafeKey("processed"))
        assertTrue(isSafeKey("skipped"))
    }

    @Test
    fun `blocks email-like values`() {
        assertFalse(isSafeValue("user@example.com"))
        assertFalse(isSafeValue("test.user@domain.co.uk"))
    }

    @Test
    fun `blocks SSN-like values`() {
        assertFalse(isSafeValue("123-45-6789"))
        assertFalse(isSafeValue("000-00-0000"))
    }

    @Test
    fun `blocks phone-like values`() {
        assertFalse(isSafeValue("1234567890"))
        assertFalse(isSafeValue("+12345678901"))
        assertFalse(isSafeValue("79001234567"))
    }

    @Test
    fun `allows safe values`() {
        assertTrue(isSafeValue("success"))
        assertTrue(isSafeValue("error"))
        assertTrue(isSafeValue("123"))
        assertTrue(isSafeValue("sync-completed"))
        assertTrue(isSafeValue("user_12345"))
    }

    @Test
    fun `allows short numeric values`() {
        assertTrue(isSafeValue("123"))
        assertTrue(isSafeValue("42"))
        assertTrue(isSafeValue("0"))
    }

    @Test
    fun `allows values with @ but no dot`() {
        assertTrue(isSafeValue("test@local"))
    }

    @Test
    fun `allows values with dot but no @`() {
        assertTrue(isSafeValue("version.1.2.3"))
    }
}

/**
 * Tests for log message building patterns
 */
class LogMessageBuildingTest {

    // Simulate buildLogMessage from ErrorLogger
    private fun buildLogMessage(context: ErrorContext, message: String): String {
        val extras = context.extras.entries
            .filter { it.value != null }
            .joinToString(", ") { "${it.key}=${it.value}" }

        return buildString {
            append("[${context.operation}]")
            if (extras.isNotEmpty()) {
                append(" {$extras}")
            }
            append(" $message")
        }
    }

    @Test
    fun `builds message with operation only`() {
        val context = ErrorContext("Tag", "syncData")
        val result = buildLogMessage(context, "Sync completed")
        assertEquals("[syncData] Sync completed", result)
    }

    @Test
    fun `builds message with extras`() {
        val context = ErrorContext(
            tag = "Tag",
            operation = "retry",
            extras = mapOf("attempt" to 3, "maxAttempts" to 5)
        )
        val result = buildLogMessage(context, "Retrying")
        assertTrue(result.startsWith("[retry]"))
        assertTrue(result.contains("attempt=3"))
        assertTrue(result.contains("maxAttempts=5"))
        assertTrue(result.endsWith("Retrying"))
    }

    @Test
    fun `builds message filtering null extras`() {
        val context = ErrorContext(
            tag = "Tag",
            operation = "test",
            extras = mapOf("valid" to "value", "invalid" to null)
        )
        val result = buildLogMessage(context, "Test")
        assertTrue(result.contains("valid=value"))
        assertFalse(result.contains("invalid"))
    }

    @Test
    fun `builds message with empty extras`() {
        val context = ErrorContext(
            tag = "Tag",
            operation = "test",
            extras = emptyMap()
        )
        val result = buildLogMessage(context, "Test message")
        assertEquals("[test] Test message", result)
    }

    @Test
    fun `builds message with special characters`() {
        val context = ErrorContext(
            tag = "Tag",
            operation = "test:operation",
            extras = mapOf("path" to "/data/sync")
        )
        val result = buildLogMessage(context, "Processing complete")
        assertTrue(result.contains("[test:operation]"))
        assertTrue(result.contains("path=/data/sync"))
    }
}

/**
 * Tests for specific logging methods patterns
 */
class LoggingMethodPatternsTest {

    @Test
    fun `network error extras format`() {
        val extras = mapOf(
            "attempt" to 1,
            "maxAttempts" to 3,
            "retryDelayMs" to 1000L
        )
        val context = ErrorContext(
            tag = "Network",
            operation = "fetchData",
            extras = extras
        )

        assertEquals(1, context.extras["attempt"])
        assertEquals(3, context.extras["maxAttempts"])
        assertEquals(1000L, context.extras["retryDelayMs"])
    }

    @Test
    fun `sync success extras format`() {
        val extras = mapOf(
            "processed" to 10,
            "skipped" to 2
        )
        val context = ErrorContext(
            tag = "Sync",
            operation = "fullSync",
            extras = extras
        )

        assertEquals(10, context.extras["processed"])
        assertEquals(2, context.extras["skipped"])
    }

    @Test
    fun `sync failure extras format`() {
        val extras = mapOf<String, Any?>(
            "error" to "Connection timeout"
        )
        val context = ErrorContext(
            tag = "Sync",
            operation = "fullSync",
            extras = extras
        )

        assertEquals("Connection timeout", context.extras["error"])
    }

    @Test
    fun `permission extras format`() {
        val extras = mapOf(
            "type" to "SLEEP_READ",
            "granted" to true
        )
        val context = ErrorContext(
            tag = "Permissions",
            operation = "check",
            extras = extras
        )

        assertEquals("SLEEP_READ", context.extras["type"])
        assertEquals(true, context.extras["granted"])
    }
}
