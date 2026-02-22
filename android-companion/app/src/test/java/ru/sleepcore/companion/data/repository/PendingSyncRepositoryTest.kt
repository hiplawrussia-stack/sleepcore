/**
 * PendingSyncRepository Unit Tests
 * ==================================
 * Tests for offline sync queue management.
 *
 * Covers:
 * - Enqueue/dequeue operations (FIFO)
 * - Duplicate detection
 * - Status transitions
 * - Batch operations
 * - Retry and reset logic
 * - Cleanup operations
 * - Flow observation for UI
 */

package ru.sleepcore.companion.data.repository

import io.mockk.*
import io.mockk.impl.annotations.MockK
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import ru.sleepcore.companion.data.api.SleepSessionDto
import ru.sleepcore.companion.data.local.sync.PendingSyncDao
import ru.sleepcore.companion.data.local.sync.PendingSyncEntity
import ru.sleepcore.companion.data.local.sync.PendingSyncStatus
import ru.sleepcore.companion.util.ErrorLogger

@OptIn(ExperimentalCoroutinesApi::class)
class PendingSyncRepositoryTest {

    @MockK
    private lateinit var pendingSyncDao: PendingSyncDao

    private lateinit var json: Json
    private lateinit var repository: PendingSyncRepository

    @Before
    fun setup() {
        MockKAnnotations.init(this)

        // Mock ErrorLogger to prevent android.util.Log calls
        mockkObject(ErrorLogger)
        every { ErrorLogger.log(any(), any(), any(), any()) } just Runs

        json = Json {
            ignoreUnknownKeys = true
            encodeDefaults = true
        }
        repository = PendingSyncRepository(pendingSyncDao, json)
    }

    @After
    fun teardown() {
        unmockkObject(ErrorLogger)
    }

    // ==================== ENQUEUE TESTS ====================

    @Test
    fun `enqueue adds session to queue`() = runTest {
        val session = createSessionDto("session-1")
        coEvery { pendingSyncDao.isQueued("session-1") } returns false
        coEvery { pendingSyncDao.insert(any()) } just Runs

        val result = repository.enqueue(session)

        assertTrue(result)
        coVerify { pendingSyncDao.insert(match { it.sessionId == "session-1" }) }
    }

    @Test
    fun `enqueue returns false for duplicate session`() = runTest {
        val session = createSessionDto("session-1")
        coEvery { pendingSyncDao.isQueued("session-1") } returns true

        val result = repository.enqueue(session)

        assertFalse(result)
        coVerify(exactly = 0) { pendingSyncDao.insert(any()) }
    }

    @Test
    fun `enqueue serializes session to JSON payload`() = runTest {
        val session = createSessionDto("session-1")
        coEvery { pendingSyncDao.isQueued("session-1") } returns false

        val capturedEntity = slot<PendingSyncEntity>()
        coEvery { pendingSyncDao.insert(capture(capturedEntity)) } just Runs

        repository.enqueue(session)

        val payload = capturedEntity.captured.payload
        assertTrue(payload.contains("session-1"))
        assertTrue(payload.contains("startTime"))
    }

    @Test
    fun `enqueue sets correct metadata`() = runTest {
        val session = createSessionDto(
            sessionId = "session-1",
            startTime = "2026-02-01T22:00:00Z",
            endTime = "2026-02-02T06:00:00Z",
            source = "Samsung Health"
        )
        coEvery { pendingSyncDao.isQueued("session-1") } returns false

        val capturedEntity = slot<PendingSyncEntity>()
        coEvery { pendingSyncDao.insert(capture(capturedEntity)) } just Runs

        repository.enqueue(session)

        with(capturedEntity.captured) {
            assertEquals("session-1", sessionId)
            assertEquals(PendingSyncStatus.PENDING, status)
            assertEquals("2026-02-01T22:00:00Z", sessionStartTime)
            assertEquals("2026-02-02T06:00:00Z", sessionEndTime)
            assertEquals("Samsung Health", source)
        }
    }

    @Test
    fun `enqueueAll adds multiple sessions`() = runTest {
        val sessions = listOf(
            createSessionDto("session-1"),
            createSessionDto("session-2"),
            createSessionDto("session-3")
        )
        coEvery { pendingSyncDao.isQueued(any()) } returns false
        coEvery { pendingSyncDao.insert(any()) } just Runs

        val count = repository.enqueueAll(sessions)

        assertEquals(3, count)
        coVerify(exactly = 3) { pendingSyncDao.insert(any()) }
    }

    @Test
    fun `enqueueAll skips duplicates`() = runTest {
        val sessions = listOf(
            createSessionDto("session-1"),
            createSessionDto("session-2"),
            createSessionDto("session-3")
        )
        coEvery { pendingSyncDao.isQueued("session-1") } returns false
        coEvery { pendingSyncDao.isQueued("session-2") } returns true // Duplicate
        coEvery { pendingSyncDao.isQueued("session-3") } returns false
        coEvery { pendingSyncDao.insert(any()) } just Runs

        val count = repository.enqueueAll(sessions)

        assertEquals(2, count)
        coVerify(exactly = 2) { pendingSyncDao.insert(any()) }
    }

    // ==================== DEQUEUE TESTS ====================

    @Test
    fun `dequeue returns oldest pending item`() = runTest {
        val entity = createEntity("session-1")
        coEvery { pendingSyncDao.getOldestPending() } returns entity
        coEvery { pendingSyncDao.markSyncing("session-1") } just Runs

        val result = repository.dequeue()

        assertNotNull(result)
        assertEquals("session-1", result!!.sessionId)
        coVerify { pendingSyncDao.markSyncing("session-1") }
    }

    @Test
    fun `dequeue returns null when queue empty`() = runTest {
        coEvery { pendingSyncDao.getOldestPending() } returns null

        val result = repository.dequeue()

        assertNull(result)
    }

    @Test
    fun `dequeueBatch returns multiple items`() = runTest {
        val entities = listOf(
            createEntity("session-1"),
            createEntity("session-2"),
            createEntity("session-3")
        )
        coEvery { pendingSyncDao.getPendingBatch(10) } returns entities
        coEvery { pendingSyncDao.markSyncing(any()) } just Runs

        val result = repository.dequeueBatch(10)

        assertEquals(3, result.size)
        coVerify(exactly = 3) { pendingSyncDao.markSyncing(any()) }
    }

    @Test
    fun `dequeueBatch marks all items as syncing`() = runTest {
        val entities = listOf(
            createEntity("session-1"),
            createEntity("session-2")
        )
        coEvery { pendingSyncDao.getPendingBatch(any()) } returns entities
        coEvery { pendingSyncDao.markSyncing(any()) } just Runs

        repository.dequeueBatch(5)

        coVerify { pendingSyncDao.markSyncing("session-1") }
        coVerify { pendingSyncDao.markSyncing("session-2") }
    }

    // ==================== PARSE SESSION TESTS ====================

    @Test
    fun `parseSession deserializes valid payload`() {
        val sessionDto = createSessionDto("session-1")
        val payload = json.encodeToString(SleepSessionDto.serializer(), sessionDto)
        val entity = createEntity("session-1", payload = payload)

        val result = repository.parseSession(entity)

        assertNotNull(result)
        assertEquals("session-1", result!!.sessionId)
    }

    @Test
    fun `parseSession returns null for invalid payload`() {
        val entity = createEntity("session-1", payload = "invalid json")

        val result = repository.parseSession(entity)

        assertNull(result)
    }

    @Test
    fun `parseSession returns null for empty payload`() {
        val entity = createEntity("session-1", payload = "")

        val result = repository.parseSession(entity)

        assertNull(result)
    }

    // ==================== STATUS UPDATE TESTS ====================

    @Test
    fun `markSynced removes item from queue`() = runTest {
        coEvery { pendingSyncDao.deleteBySessionId("session-1") } just Runs

        repository.markSynced("session-1")

        coVerify { pendingSyncDao.deleteBySessionId("session-1") }
    }

    @Test
    fun `markSyncedBatch removes multiple items`() = runTest {
        val sessionIds = listOf("session-1", "session-2", "session-3")
        coEvery { pendingSyncDao.deleteBySessionIds(sessionIds) } just Runs

        repository.markSyncedBatch(sessionIds)

        coVerify { pendingSyncDao.deleteBySessionIds(sessionIds) }
    }

    @Test
    fun `markFailed calls dao with error`() = runTest {
        coEvery { pendingSyncDao.markFailed("session-1", "Network error") } just Runs

        repository.markFailed("session-1", "Network error")

        coVerify { pendingSyncDao.markFailed("session-1", "Network error") }
    }

    @Test
    fun `markFailed handles null error`() = runTest {
        coEvery { pendingSyncDao.markFailed("session-1", null) } just Runs

        repository.markFailed("session-1", null)

        coVerify { pendingSyncDao.markFailed("session-1", null) }
    }

    // ==================== RESET TESTS ====================

    @Test
    fun `resetForRetry resets single item`() = runTest {
        coEvery { pendingSyncDao.resetItem("session-1") } just Runs

        repository.resetForRetry("session-1")

        coVerify { pendingSyncDao.resetItem("session-1") }
    }

    @Test
    fun `resetAllFailed resets all failed items`() = runTest {
        coEvery { pendingSyncDao.resetFailedItems() } just Runs

        repository.resetAllFailed()

        coVerify { pendingSyncDao.resetFailedItems() }
    }

    @Test
    fun `resetStuckItems resets syncing items`() = runTest {
        coEvery { pendingSyncDao.resetSyncingItems() } just Runs

        repository.resetStuckItems()

        coVerify { pendingSyncDao.resetSyncingItems() }
    }

    // ==================== QUERY TESTS ====================

    @Test
    fun `getPendingItems returns all pending`() = runTest {
        val entities = listOf(createEntity("session-1"), createEntity("session-2"))
        coEvery { pendingSyncDao.getPendingItems() } returns entities

        val result = repository.getPendingItems()

        assertEquals(2, result.size)
    }

    @Test
    fun `getFailedItems returns all failed`() = runTest {
        val entities = listOf(
            createEntity("session-1", status = PendingSyncStatus.FAILED)
        )
        coEvery { pendingSyncDao.getFailedItems() } returns entities

        val result = repository.getFailedItems()

        assertEquals(1, result.size)
    }

    @Test
    fun `hasPendingItems returns true when count greater than 0`() = runTest {
        coEvery { pendingSyncDao.getPendingCount() } returns 5

        val result = repository.hasPendingItems()

        assertTrue(result)
    }

    @Test
    fun `hasPendingItems returns false when count is 0`() = runTest {
        coEvery { pendingSyncDao.getPendingCount() } returns 0

        val result = repository.hasPendingItems()

        assertFalse(result)
    }

    @Test
    fun `getPendingCount returns count from dao`() = runTest {
        coEvery { pendingSyncDao.getPendingCount() } returns 42

        val result = repository.getPendingCount()

        assertEquals(42, result)
    }

    // ==================== FLOW OBSERVATION TESTS ====================

    @Test
    fun `observePendingCount returns flow from dao`() = runTest {
        every { pendingSyncDao.observePendingCount() } returns flowOf(5)

        val result = repository.observePendingCount().first()

        assertEquals(5, result)
    }

    @Test
    fun `observeFailedCount returns flow from dao`() = runTest {
        every { pendingSyncDao.observeFailedCount() } returns flowOf(3)

        val result = repository.observeFailedCount().first()

        assertEquals(3, result)
    }

    @Test
    fun `observePendingItems returns flow from dao`() = runTest {
        val entities = listOf(createEntity("session-1"))
        every { pendingSyncDao.observePendingItems() } returns flowOf(entities)

        val result = repository.observePendingItems().first()

        assertEquals(1, result.size)
    }

    // ==================== CLEANUP TESTS ====================

    @Test
    fun `cleanup calls dao cleanup`() = runTest {
        coEvery { pendingSyncDao.cleanup() } just Runs

        repository.cleanup()

        coVerify { pendingSyncDao.cleanup() }
    }

    @Test
    fun `clearAll calls dao deleteAll`() = runTest {
        coEvery { pendingSyncDao.deleteAll() } just Runs

        repository.clearAll()

        coVerify { pendingSyncDao.deleteAll() }
    }

    // ==================== HELPERS ====================

    private fun createSessionDto(
        sessionId: String = "session-${System.nanoTime()}",
        startTime: String = "2026-02-01T22:00:00Z",
        endTime: String = "2026-02-02T06:00:00Z",
        source: String = "test"
    ) = SleepSessionDto(
        sessionId = sessionId,
        startTime = startTime,
        endTime = endTime,
        source = source,
        stages = emptyList(),
        hrv = emptyList(),
        heartRate = emptyList()
    )

    private fun createEntity(
        sessionId: String = "session-${System.nanoTime()}",
        payload: String = "{}",
        status: PendingSyncStatus = PendingSyncStatus.PENDING
    ) = PendingSyncEntity(
        sessionId = sessionId,
        payload = payload,
        status = status,
        sessionStartTime = "2026-02-01T22:00:00Z",
        sessionEndTime = "2026-02-02T06:00:00Z"
    )
}
