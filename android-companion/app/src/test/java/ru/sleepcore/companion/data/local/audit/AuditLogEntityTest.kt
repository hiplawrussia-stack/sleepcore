/**
 * AuditLogEntity Unit Tests
 * ==========================
 * Tests for HIPAA-compliant audit log entity.
 *
 * HIPAA §164.312(b)(1) requirements:
 * - Record integrity (hash verification)
 * - Immutable records
 * - All required fields present
 *
 * FDA 21 CFR Part 11 requirements:
 * - Audit trail integrity
 * - Tamper-evident design
 */

package ru.sleepcore.companion.data.local.audit

import org.junit.Assert.*
import org.junit.Test

class AuditLogEntityTest {

    // ==================== ENUM TESTS ====================

    @Test
    fun `AuditCategory has all expected values`() {
        val categories = AuditCategory.values()
        assertEquals(7, categories.size)
        assertTrue(categories.contains(AuditCategory.AUTHENTICATION))
        assertTrue(categories.contains(AuditCategory.AUTHORIZATION))
        assertTrue(categories.contains(AuditCategory.DATA_ACCESS))
        assertTrue(categories.contains(AuditCategory.DATA_MODIFICATION))
        assertTrue(categories.contains(AuditCategory.DATA_SYNC))
        assertTrue(categories.contains(AuditCategory.SECURITY_EVENT))
        assertTrue(categories.contains(AuditCategory.SYSTEM_EVENT))
    }

    @Test
    fun `AuditOutcome has all expected values`() {
        val outcomes = AuditOutcome.values()
        assertEquals(4, outcomes.size)
        assertTrue(outcomes.contains(AuditOutcome.SUCCESS))
        assertTrue(outcomes.contains(AuditOutcome.FAILURE))
        assertTrue(outcomes.contains(AuditOutcome.DENIED))
        assertTrue(outcomes.contains(AuditOutcome.ERROR))
    }

    @Test
    fun `AuditCategory valueOf works correctly`() {
        assertEquals(AuditCategory.AUTHENTICATION, AuditCategory.valueOf("AUTHENTICATION"))
        assertEquals(AuditCategory.DATA_ACCESS, AuditCategory.valueOf("DATA_ACCESS"))
        assertEquals(AuditCategory.SECURITY_EVENT, AuditCategory.valueOf("SECURITY_EVENT"))
    }

    @Test
    fun `AuditOutcome valueOf works correctly`() {
        assertEquals(AuditOutcome.SUCCESS, AuditOutcome.valueOf("SUCCESS"))
        assertEquals(AuditOutcome.FAILURE, AuditOutcome.valueOf("FAILURE"))
        assertEquals(AuditOutcome.DENIED, AuditOutcome.valueOf("DENIED"))
        assertEquals(AuditOutcome.ERROR, AuditOutcome.valueOf("ERROR"))
    }

    // ==================== ENTITY CREATION TESTS ====================

    @Test
    fun `entity creates with all required fields`() {
        val entity = createEntity()

        assertNotNull(entity.timestamp)
        assertNotNull(entity.category)
        assertNotNull(entity.action)
        assertNotNull(entity.deviceId)
        assertNotNull(entity.outcome)
        assertNotNull(entity.integrityHash)
    }

    @Test
    fun `entity preserves all fields correctly`() {
        val entity = AuditLogEntity(
            id = 123L,
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.DATA_ACCESS,
            action = "READ_SESSIONS",
            resource = "sleep_sessions",
            userId = "user-456",
            deviceId = "device-abc",
            outcome = AuditOutcome.SUCCESS,
            details = "Read 5 sessions",
            errorMessage = null,
            source = "SyncWorker:execute",
            integrityHash = "abc123"
        )

        assertEquals(123L, entity.id)
        assertEquals("2026-02-22T12:00:00Z", entity.timestamp)
        assertEquals(AuditCategory.DATA_ACCESS, entity.category)
        assertEquals("READ_SESSIONS", entity.action)
        assertEquals("sleep_sessions", entity.resource)
        assertEquals("user-456", entity.userId)
        assertEquals("device-abc", entity.deviceId)
        assertEquals(AuditOutcome.SUCCESS, entity.outcome)
        assertEquals("Read 5 sessions", entity.details)
        assertNull(entity.errorMessage)
        assertEquals("SyncWorker:execute", entity.source)
        assertEquals("abc123", entity.integrityHash)
    }

    @Test
    fun `entity handles null optional fields`() {
        val entity = AuditLogEntity(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.SYSTEM_EVENT,
            action = "APP_START",
            resource = null,
            userId = null,
            deviceId = "device-123",
            outcome = AuditOutcome.SUCCESS,
            details = null,
            errorMessage = null,
            source = null,
            integrityHash = "hash"
        )

        assertNull(entity.resource)
        assertNull(entity.userId)
        assertNull(entity.details)
        assertNull(entity.errorMessage)
        assertNull(entity.source)
    }

    @Test
    fun `entity default id is 0`() {
        val entity = createEntity()
        assertEquals(0L, entity.id)
    }

    // ==================== INTEGRITY HASH TESTS ====================

    @Test
    fun `computeIntegrityHash returns consistent hash`() {
        val hash1 = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.AUTHENTICATION,
            action = "LOGIN",
            resource = "credentials",
            userId = "user-123",
            deviceId = "device-abc",
            outcome = AuditOutcome.SUCCESS
        )

        val hash2 = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.AUTHENTICATION,
            action = "LOGIN",
            resource = "credentials",
            userId = "user-123",
            deviceId = "device-abc",
            outcome = AuditOutcome.SUCCESS
        )

        assertEquals(hash1, hash2)
    }

    @Test
    fun `computeIntegrityHash returns different hash for different data`() {
        val hash1 = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.AUTHENTICATION,
            action = "LOGIN",
            resource = "credentials",
            userId = "user-123",
            deviceId = "device-abc",
            outcome = AuditOutcome.SUCCESS
        )

        val hash2 = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.AUTHENTICATION,
            action = "LOGOUT", // Different action
            resource = "credentials",
            userId = "user-123",
            deviceId = "device-abc",
            outcome = AuditOutcome.SUCCESS
        )

        assertNotEquals(hash1, hash2)
    }

    @Test
    fun `computeIntegrityHash detects timestamp change`() {
        val originalHash = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.DATA_ACCESS,
            action = "READ",
            resource = "sessions",
            userId = "user",
            deviceId = "device",
            outcome = AuditOutcome.SUCCESS
        )

        val tamperedHash = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:01Z", // 1 second different
            category = AuditCategory.DATA_ACCESS,
            action = "READ",
            resource = "sessions",
            userId = "user",
            deviceId = "device",
            outcome = AuditOutcome.SUCCESS
        )

        assertNotEquals(originalHash, tamperedHash)
    }

    @Test
    fun `computeIntegrityHash detects category change`() {
        val originalHash = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.DATA_ACCESS,
            action = "READ",
            resource = "sessions",
            userId = "user",
            deviceId = "device",
            outcome = AuditOutcome.SUCCESS
        )

        val tamperedHash = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.DATA_MODIFICATION, // Changed
            action = "READ",
            resource = "sessions",
            userId = "user",
            deviceId = "device",
            outcome = AuditOutcome.SUCCESS
        )

        assertNotEquals(originalHash, tamperedHash)
    }

    @Test
    fun `computeIntegrityHash detects outcome change`() {
        val successHash = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.AUTHENTICATION,
            action = "LOGIN",
            resource = null,
            userId = "user",
            deviceId = "device",
            outcome = AuditOutcome.SUCCESS
        )

        val failureHash = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.AUTHENTICATION,
            action = "LOGIN",
            resource = null,
            userId = "user",
            deviceId = "device",
            outcome = AuditOutcome.FAILURE // Changed
        )

        assertNotEquals(successHash, failureHash)
    }

    @Test
    fun `computeIntegrityHash handles null values`() {
        val hash = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.SYSTEM_EVENT,
            action = "APP_START",
            resource = null,
            userId = null,
            deviceId = "device",
            outcome = AuditOutcome.SUCCESS
        )

        assertNotNull(hash)
        assertTrue(hash.isNotEmpty())
    }

    @Test
    fun `computeIntegrityHash returns 64 character hex string`() {
        val hash = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.AUTHENTICATION,
            action = "TEST",
            resource = null,
            userId = null,
            deviceId = "device",
            outcome = AuditOutcome.SUCCESS
        )

        // SHA-256 produces 32 bytes = 64 hex characters
        assertEquals(64, hash.length)
        // Should only contain hex characters
        assertTrue(hash.all { it in '0'..'9' || it in 'a'..'f' })
    }

    @Test
    fun `computeIntegrityHash handles unicode`() {
        val hash = AuditLogEntity.computeIntegrityHash(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.DATA_ACCESS,
            action = "READ_Пользователь_用户",
            resource = "данные",
            userId = "用户123",
            deviceId = "device",
            outcome = AuditOutcome.SUCCESS
        )

        assertNotNull(hash)
        assertEquals(64, hash.length)
    }

    // ==================== EQUALITY TESTS ====================

    @Test
    fun `entities with same data are equal`() {
        val entity1 = AuditLogEntity(
            id = 1L,
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.AUTHENTICATION,
            action = "LOGIN",
            resource = "credentials",
            userId = "user",
            deviceId = "device",
            outcome = AuditOutcome.SUCCESS,
            details = null,
            errorMessage = null,
            source = null,
            integrityHash = "hash"
        )

        val entity2 = AuditLogEntity(
            id = 1L,
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.AUTHENTICATION,
            action = "LOGIN",
            resource = "credentials",
            userId = "user",
            deviceId = "device",
            outcome = AuditOutcome.SUCCESS,
            details = null,
            errorMessage = null,
            source = null,
            integrityHash = "hash"
        )

        assertEquals(entity1, entity2)
        assertEquals(entity1.hashCode(), entity2.hashCode())
    }

    @Test
    fun `entities with different id are not equal`() {
        val entity1 = createEntity(id = 1L)
        val entity2 = createEntity(id = 2L)

        assertNotEquals(entity1, entity2)
    }

    // ==================== COPY TESTS ====================

    @Test
    fun `copy preserves unchanged fields`() {
        val original = createEntity(
            timestamp = "2026-02-22T12:00:00Z",
            action = "ORIGINAL"
        )

        val copied = original.copy(action = "MODIFIED")

        assertEquals("MODIFIED", copied.action)
        assertEquals(original.timestamp, copied.timestamp)
        assertEquals(original.category, copied.category)
        assertEquals(original.deviceId, copied.deviceId)
    }

    // ==================== ERROR SCENARIOS ====================

    @Test
    fun `entity handles error message`() {
        val entity = AuditLogEntity(
            timestamp = "2026-02-22T12:00:00Z",
            category = AuditCategory.DATA_SYNC,
            action = "SYNC_FAILED",
            resource = "sleep_sessions",
            userId = "user-123",
            deviceId = "device-abc",
            outcome = AuditOutcome.ERROR,
            details = "Network timeout",
            errorMessage = "java.net.SocketTimeoutException: connect timed out",
            source = "SyncWorker:doWork",
            integrityHash = "hash"
        )

        assertEquals(AuditOutcome.ERROR, entity.outcome)
        assertNotNull(entity.errorMessage)
        assertTrue(entity.errorMessage!!.contains("SocketTimeoutException"))
    }

    @Test
    fun `entity handles denied outcome`() {
        val entity = createEntity(
            category = AuditCategory.AUTHORIZATION,
            action = "ACCESS_DENIED",
            outcome = AuditOutcome.DENIED
        )

        assertEquals(AuditOutcome.DENIED, entity.outcome)
    }

    // ==================== HELPER ====================

    private fun createEntity(
        id: Long = 0L,
        timestamp: String = "2026-02-22T12:00:00Z",
        category: AuditCategory = AuditCategory.SYSTEM_EVENT,
        action: String = "TEST_ACTION",
        resource: String? = null,
        userId: String? = null,
        deviceId: String = "test-device",
        outcome: AuditOutcome = AuditOutcome.SUCCESS,
        details: String? = null,
        errorMessage: String? = null,
        source: String? = null
    ): AuditLogEntity {
        val hash = AuditLogEntity.computeIntegrityHash(
            timestamp = timestamp,
            category = category,
            action = action,
            resource = resource,
            userId = userId,
            deviceId = deviceId,
            outcome = outcome
        )
        return AuditLogEntity(
            id = id,
            timestamp = timestamp,
            category = category,
            action = action,
            resource = resource,
            userId = userId,
            deviceId = deviceId,
            outcome = outcome,
            details = details,
            errorMessage = errorMessage,
            source = source,
            integrityHash = hash
        )
    }
}
