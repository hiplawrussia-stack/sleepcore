/**
 * SyncWorker Unit Tests
 * ======================
 * Tests for background sync worker.
 *
 * Covers:
 * - Work request creation (periodic and one-time)
 * - Sync flow with various conditions
 * - Error handling and retry logic
 * - Pending queue processing
 */

package ru.sleepcore.companion.worker

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.work.*
import androidx.work.testing.TestListenableWorkerBuilder
import io.mockk.*
import io.mockk.impl.annotations.MockK
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import ru.sleepcore.companion.data.repository.SleepRepository
import ru.sleepcore.companion.domain.model.SyncResult
import ru.sleepcore.companion.health.HealthConnectAvailability
import ru.sleepcore.companion.health.HealthConnectManager
import ru.sleepcore.companion.health.HealthConnectPermissions
import java.util.concurrent.TimeUnit

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, sdk = [28])
class SyncWorkerTest {

    @MockK
    private lateinit var sleepRepository: SleepRepository

    @MockK
    private lateinit var healthConnectManager: HealthConnectManager

    private lateinit var context: Context

    @Before
    fun setup() {
        MockKAnnotations.init(this)
        context = ApplicationProvider.getApplicationContext()
    }

    @After
    fun teardown() {
        clearAllMocks()
    }

    // ==================== CONSTANTS TESTS ====================

    @Test
    fun `SYNC_INTERVAL_MINUTES is 15`() {
        assertEquals(15L, SyncWorker.SYNC_INTERVAL_MINUTES)
    }

    @Test
    fun `WORK_NAME is correct`() {
        assertEquals("sleepcore_sync", SyncWorker.WORK_NAME)
    }

    // ==================== WORK REQUEST CREATION TESTS ====================

    @Test
    fun `createPeriodicWorkRequest creates valid request`() {
        val request = SyncWorker.createPeriodicWorkRequest()

        assertNotNull(request)
        assertTrue(request.tags.contains(SyncWorker.WORK_NAME))
    }

    @Test
    fun `createOneTimeSyncRequest creates valid request`() {
        val request = SyncWorker.createOneTimeSyncRequest()

        assertNotNull(request)
        assertTrue(request.tags.contains(SyncWorker.WORK_NAME))
    }

    // ==================== DO WORK - NOT LINKED TESTS ====================

    @Test
    fun `doWork returns success when not linked`() = runTest {
        coEvery { sleepRepository.isLinked() } returns false

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.success(), result)
        coVerify(exactly = 0) { sleepRepository.syncSessions(any()) }
    }

    // ==================== DO WORK - TOKEN REFRESH TESTS ====================

    @Test
    fun `doWork refreshes token when needed`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns true
        coEvery { sleepRepository.refreshAccessToken() } returns Result.success(Unit)
        coEvery { sleepRepository.processPendingQueue() } returns Result.success(0)
        coEvery { sleepRepository.syncSessions(any()) } returns Result.success(
            createSyncResult(processed = 0, skipped = 0)
        )

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.success(), result)
        coVerify { sleepRepository.refreshAccessToken() }
    }

    @Test
    fun `doWork retries when token refresh fails`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns true
        coEvery { sleepRepository.refreshAccessToken() } returns Result.failure(
            Exception("Refresh failed")
        )

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.retry(), result)
    }

    // ==================== DO WORK - HEALTH CONNECT AVAILABILITY TESTS ====================

    @Test
    fun `doWork retries when Health Connect not available`() = runTest {
        coEvery { sleepRepository.isLinked() } returns true
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { healthConnectManager.checkAvailability() } returns
            HealthConnectAvailability.NotInstalled

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.retry(), result)
    }

    @Test
    fun `doWork retries when Health Connect not supported`() = runTest {
        coEvery { sleepRepository.isLinked() } returns true
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { healthConnectManager.checkAvailability() } returns
            HealthConnectAvailability.NotSupported

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.retry(), result)
    }

    // ==================== DO WORK - PERMISSIONS TESTS ====================

    @Test
    fun `doWork returns success when no permissions`() = runTest {
        coEvery { sleepRepository.isLinked() } returns true
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { healthConnectManager.checkAvailability() } returns
            HealthConnectAvailability.Available
        coEvery { healthConnectManager.checkPermissions() } returns
            HealthConnectPermissions(sleepRead = false)

        val worker = createWorker()
        val result = worker.doWork()

        // Success, not retry - user needs to grant permissions manually
        assertEquals(ListenableWorker.Result.success(), result)
        coVerify(exactly = 0) { sleepRepository.syncSessions(any()) }
    }

    // ==================== DO WORK - QUEUE PROCESSING TESTS ====================

    @Test
    fun `doWork processes pending queue before sync`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { sleepRepository.processPendingQueue() } returns Result.success(5)
        coEvery { sleepRepository.syncSessions(any()) } returns Result.success(
            createSyncResult(processed = 0, skipped = 0)
        )

        val worker = createWorker()
        worker.doWork()

        coVerifyOrder {
            sleepRepository.processPendingQueue()
            sleepRepository.syncSessions(any())
        }
    }

    @Test
    fun `doWork continues sync even if queue processing fails`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { sleepRepository.processPendingQueue() } returns Result.failure(
            Exception("Queue error")
        )
        coEvery { sleepRepository.syncSessions(any()) } returns Result.success(
            createSyncResult(processed = 1, skipped = 0)
        )

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.success(), result)
        coVerify { sleepRepository.syncSessions(any()) }
    }

    @Test
    fun `doWork fails when queue reports TOKEN_EXPIRED`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { sleepRepository.processPendingQueue() } returns Result.failure(
            Exception("TOKEN_EXPIRED")
        )

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.failure(), result)
    }

    // ==================== DO WORK - SYNC TESTS ====================

    @Test
    fun `doWork returns success on successful sync`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { sleepRepository.processPendingQueue() } returns Result.success(0)
        coEvery { sleepRepository.syncSessions(any()) } returns Result.success(
            createSyncResult(processed = 5, skipped = 1)
        )

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.success(), result)
    }

    @Test
    fun `doWork passes background syncType`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { sleepRepository.processPendingQueue() } returns Result.success(0)
        coEvery { sleepRepository.syncSessions(syncType = "background") } returns Result.success(
            createSyncResult(processed = 0, skipped = 0)
        )

        val worker = createWorker()
        worker.doWork()

        coVerify { sleepRepository.syncSessions(syncType = "background") }
    }

    @Test
    fun `doWork returns success on NO_NEW_DATA`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { sleepRepository.processPendingQueue() } returns Result.success(0)
        coEvery { sleepRepository.syncSessions(any()) } returns Result.failure(
            Exception("NO_NEW_DATA")
        )

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.success(), result)
    }

    @Test
    fun `doWork returns failure on TOKEN_EXPIRED during sync`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { sleepRepository.processPendingQueue() } returns Result.success(0)
        coEvery { sleepRepository.syncSessions(any()) } returns Result.failure(
            Exception("TOKEN_EXPIRED")
        )

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.failure(), result)
    }

    @Test
    fun `doWork returns success on NOT_LINKED during sync`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { sleepRepository.processPendingQueue() } returns Result.success(0)
        coEvery { sleepRepository.syncSessions(any()) } returns Result.failure(
            Exception("NOT_LINKED")
        )

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.success(), result)
    }

    @Test
    fun `doWork returns retry on network error`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { sleepRepository.processPendingQueue() } returns Result.success(0)
        coEvery { sleepRepository.syncSessions(any()) } returns Result.failure(
            Exception("Network error")
        )

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.retry(), result)
    }

    @Test
    fun `doWork returns retry on unknown error`() = runTest {
        setupLinkedWithPermissions()
        coEvery { sleepRepository.needsTokenRefresh() } returns false
        coEvery { sleepRepository.processPendingQueue() } returns Result.success(0)
        coEvery { sleepRepository.syncSessions(any()) } returns Result.failure(
            Exception("Something went wrong")
        )

        val worker = createWorker()
        val result = worker.doWork()

        assertEquals(ListenableWorker.Result.retry(), result)
    }

    // ==================== HELPERS ====================

    private fun createWorker(): SyncWorker {
        return TestListenableWorkerBuilder<SyncWorker>(context)
            .setWorkerFactory(object : WorkerFactory() {
                override fun createWorker(
                    appContext: Context,
                    workerClassName: String,
                    workerParameters: WorkerParameters
                ): ListenableWorker {
                    return SyncWorker(
                        appContext,
                        workerParameters,
                        sleepRepository,
                        healthConnectManager
                    )
                }
            })
            .build() as SyncWorker
    }

    private fun setupLinkedWithPermissions() {
        coEvery { sleepRepository.isLinked() } returns true
        coEvery { healthConnectManager.checkAvailability() } returns
            HealthConnectAvailability.Available
        coEvery { healthConnectManager.checkPermissions() } returns
            HealthConnectPermissions(sleepRead = true)
    }

    private fun createSyncResult(
        processed: Int = 0,
        skipped: Int = 0
    ) = SyncResult(
        processed = processed,
        skipped = skipped,
        errors = emptyList(),
        syncId = "test-sync-${System.nanoTime()}",
        nextSyncRecommended = "PT15M"
    )
}
