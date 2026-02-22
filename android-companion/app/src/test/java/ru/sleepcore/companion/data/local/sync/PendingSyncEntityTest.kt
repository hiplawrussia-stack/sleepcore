/**
 * PendingSyncEntity Unit Tests
 * =============================
 * Tests for offline sync queue entity.
 *
 * Covers:
 * - Status enum behavior
 * - Entity state transitions (PENDING → SYNCING → COMPLETED/FAILED)
 * - Retry logic and exhaustion
 * - Staleness detection
 * - Data integrity
 */

package ru.sleepcore.companion.data.local.sync

import org.junit.Assert.*
import org.junit.Test

class PendingSyncEntityTest {

    // ==================== STATUS ENUM TESTS ====================

    @Test
    fun `PendingSyncStatus has all expected values`() {
        val statuses = PendingSyncStatus.values()
        assertEquals(4, statuses.size)
        assertTrue(statuses.contains(PendingSyncStatus.PENDING))
        assertTrue(statuses.contains(PendingSyncStatus.SYNCING))
        assertTrue(statuses.contains(PendingSyncStatus.FAILED))
        assertTrue(statuses.contains(PendingSyncStatus.COMPLETED))
    }

    @Test
    fun `PendingSyncStatus valueOf works correctly`() {
        assertEquals(PendingSyncStatus.PENDING, PendingSyncStatus.valueOf("PENDING"))
        assertEquals(PendingSyncStatus.SYNCING, PendingSyncStatus.valueOf("SYNCING"))
        assertEquals(PendingSyncStatus.FAILED, PendingSyncStatus.valueOf("FAILED"))
        assertEquals(PendingSyncStatus.COMPLETED, PendingSyncStatus.valueOf("COMPLETED"))
    }

    // ==================== ENTITY CREATION TESTS ====================

    @Test
    fun `entity creates with default values`() {
        val entity = createEntity()

        assertEquals(PendingSyncStatus.PENDING, entity.status)
        assertEquals(0, entity.attempts)
        assertEquals(PendingSyncEntity.MAX_SYNC_ATTEMPTS, entity.maxAttempts)
        assertNull(entity.lastAttemptAt)
        assertNull(entity.lastError)
        assertTrue(entity.createdAt > 0)
    }

    @Test
    fun `entity preserves all fields`() {
        val entity = PendingSyncEntity(
            sessionId = "session-123",
            payload = """{"data": "test"}""",
            status = PendingSyncStatus.SYNCING,
            attempts = 2,
            maxAttempts = 5,
            createdAt = 1000L,
            lastAttemptAt = 2000L,
            lastError = "Network error",
            sessionStartTime = "2026-02-01T22:00:00Z",
            sessionEndTime = "2026-02-02T06:00:00Z",
            source = "Samsung Health"
        )

        assertEquals("session-123", entity.sessionId)
        assertEquals("""{"data": "test"}""", entity.payload)
        assertEquals(PendingSyncStatus.SYNCING, entity.status)
        assertEquals(2, entity.attempts)
        assertEquals(5, entity.maxAttempts)
        assertEquals(1000L, entity.createdAt)
        assertEquals(2000L, entity.lastAttemptAt)
        assertEquals("Network error", entity.lastError)
        assertEquals("2026-02-01T22:00:00Z", entity.sessionStartTime)
        assertEquals("2026-02-02T06:00:00Z", entity.sessionEndTime)
        assertEquals("Samsung Health", entity.source)
    }

    // ==================== EXHAUSTION TESTS ====================

    @Test
    fun `isExhausted returns false when attempts below max`() {
        val entity = createEntity(attempts = 0)
        assertFalse(entity.isExhausted)
    }

    @Test
    fun `isExhausted returns false when attempts one below max`() {
        val entity = createEntity(
            attempts = PendingSyncEntity.MAX_SYNC_ATTEMPTS - 1
        )
        assertFalse(entity.isExhausted)
    }

    @Test
    fun `isExhausted returns true when attempts equal max`() {
        val entity = createEntity(
            attempts = PendingSyncEntity.MAX_SYNC_ATTEMPTS
        )
        assertTrue(entity.isExhausted)
    }

    @Test
    fun `isExhausted returns true when attempts exceed max`() {
        val entity = createEntity(
            attempts = PendingSyncEntity.MAX_SYNC_ATTEMPTS + 5
        )
        assertTrue(entity.isExhausted)
    }

    @Test
    fun `isExhausted respects custom maxAttempts`() {
        val entity = createEntity(attempts = 3, maxAttempts = 3)
        assertTrue(entity.isExhausted)

        val entity2 = createEntity(attempts = 3, maxAttempts = 10)
        assertFalse(entity2.isExhausted)
    }

    // ==================== STALENESS TESTS ====================

    @Test
    fun `isStale returns false for recent items`() {
        val entity = createEntity(createdAt = System.currentTimeMillis())
        assertFalse(entity.isStale)
    }

    @Test
    fun `isStale returns false for items younger than 7 days`() {
        val sixDaysAgo = System.currentTimeMillis() - (6 * 24 * 60 * 60 * 1000L)
        val entity = createEntity(createdAt = sixDaysAgo)
        assertFalse(entity.isStale)
    }

    @Test
    fun `isStale returns true for items older than 7 days`() {
        val eightDaysAgo = System.currentTimeMillis() - (8 * 24 * 60 * 60 * 1000L)
        val entity = createEntity(createdAt = eightDaysAgo)
        assertTrue(entity.isStale)
    }

    @Test
    fun `MAX_AGE_MILLIS is 7 days`() {
        val sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000L
        assertEquals(sevenDaysInMillis, PendingSyncEntity.MAX_AGE_MILLIS)
    }

    // ==================== STATE TRANSITION TESTS ====================

    @Test
    fun `markSyncing updates status and timestamp`() {
        val original = createEntity(status = PendingSyncStatus.PENDING)
        val updated = original.markSyncing()

        assertEquals(PendingSyncStatus.SYNCING, updated.status)
        assertNotNull(updated.lastAttemptAt)
        // Other fields unchanged
        assertEquals(original.sessionId, updated.sessionId)
        assertEquals(original.payload, updated.payload)
        assertEquals(original.attempts, updated.attempts)
    }

    @Test
    fun `markCompleted updates status only`() {
        val original = createEntity(status = PendingSyncStatus.SYNCING)
        val updated = original.markCompleted()

        assertEquals(PendingSyncStatus.COMPLETED, updated.status)
        // Other fields unchanged
        assertEquals(original.sessionId, updated.sessionId)
        assertEquals(original.attempts, updated.attempts)
    }

    @Test
    fun `withIncrementedAttempt increments attempts`() {
        val original = createEntity(attempts = 2)
        val updated = original.withIncrementedAttempt()

        assertEquals(3, updated.attempts)
        assertNotNull(updated.lastAttemptAt)
    }

    @Test
    fun `withIncrementedAttempt sets error message`() {
        val original = createEntity(attempts = 0)
        val updated = original.withIncrementedAttempt("Connection timeout")

        assertEquals("Connection timeout", updated.lastError)
    }

    @Test
    fun `withIncrementedAttempt keeps PENDING when below max`() {
        val original = createEntity(attempts = 2, maxAttempts = 5)
        val updated = original.withIncrementedAttempt()

        assertEquals(PendingSyncStatus.PENDING, updated.status)
        assertEquals(3, updated.attempts)
    }

    @Test
    fun `withIncrementedAttempt sets FAILED when reaching max`() {
        val original = createEntity(attempts = 4, maxAttempts = 5)
        val updated = original.withIncrementedAttempt()

        assertEquals(PendingSyncStatus.FAILED, updated.status)
        assertEquals(5, updated.attempts)
    }

    @Test
    fun `withIncrementedAttempt sets FAILED when exceeding max`() {
        val original = createEntity(attempts = 5, maxAttempts = 5)
        val updated = original.withIncrementedAttempt()

        assertEquals(PendingSyncStatus.FAILED, updated.status)
        assertEquals(6, updated.attempts)
    }

    // ==================== CONSTANTS TESTS ====================

    @Test
    fun `MAX_SYNC_ATTEMPTS is 5`() {
        assertEquals(5, PendingSyncEntity.MAX_SYNC_ATTEMPTS)
    }

    // ==================== EQUALITY TESTS ====================

    @Test
    fun `entities with same sessionId and data are equal`() {
        val entity1 = PendingSyncEntity(
            sessionId = "session-1",
            payload = "{}",
            sessionStartTime = "2026-01-01T00:00:00Z",
            sessionEndTime = "2026-01-01T08:00:00Z",
            createdAt = 1000L
        )
        val entity2 = PendingSyncEntity(
            sessionId = "session-1",
            payload = "{}",
            sessionStartTime = "2026-01-01T00:00:00Z",
            sessionEndTime = "2026-01-01T08:00:00Z",
            createdAt = 1000L
        )

        assertEquals(entity1, entity2)
        assertEquals(entity1.hashCode(), entity2.hashCode())
    }

    @Test
    fun `entities with different sessionId are not equal`() {
        val entity1 = createEntity(sessionId = "session-1")
        val entity2 = createEntity(sessionId = "session-2")

        assertNotEquals(entity1, entity2)
    }

    // ==================== PAYLOAD TESTS ====================

    @Test
    fun `payload handles large JSON`() {
        val largePayload = """{"stages": [${(1..1000).joinToString(",") { """{"type":"light"}""" }}]}"""
        val entity = createEntity(payload = largePayload)
        assertEquals(largePayload, entity.payload)
    }

    @Test
    fun `payload handles unicode`() {
        val unicodePayload = """{"name": "Сон пользователя 用户 🌙"}"""
        val entity = createEntity(payload = unicodePayload)
        assertEquals(unicodePayload, entity.payload)
    }

    // ==================== COPY TESTS ====================

    @Test
    fun `copy preserves unchanged fields`() {
        val original = PendingSyncEntity(
            sessionId = "original-id",
            payload = "original-payload",
            status = PendingSyncStatus.PENDING,
            attempts = 2,
            createdAt = 1000L,
            sessionStartTime = "2026-01-01T00:00:00Z",
            sessionEndTime = "2026-01-01T08:00:00Z",
            source = "test"
        )

        val copied = original.copy(status = PendingSyncStatus.SYNCING)

        assertEquals("original-id", copied.sessionId)
        assertEquals("original-payload", copied.payload)
        assertEquals(PendingSyncStatus.SYNCING, copied.status)
        assertEquals(2, copied.attempts)
        assertEquals(1000L, copied.createdAt)
    }

    // ==================== HELPER ====================

    private fun createEntity(
        sessionId: String = "session-${System.nanoTime()}",
        payload: String = """{"test": true}""",
        status: PendingSyncStatus = PendingSyncStatus.PENDING,
        attempts: Int = 0,
        maxAttempts: Int = PendingSyncEntity.MAX_SYNC_ATTEMPTS,
        createdAt: Long = System.currentTimeMillis(),
        sessionStartTime: String = "2026-02-01T22:00:00Z",
        sessionEndTime: String = "2026-02-02T06:00:00Z",
        source: String? = "test"
    ) = PendingSyncEntity(
        sessionId = sessionId,
        payload = payload,
        status = status,
        attempts = attempts,
        maxAttempts = maxAttempts,
        createdAt = createdAt,
        sessionStartTime = sessionStartTime,
        sessionEndTime = sessionEndTime,
        source = source
    )
}
