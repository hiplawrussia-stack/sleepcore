/**
 * SyncViewModel Unit Tests
 * =========================
 * Tests for sync dashboard state and operations.
 */

package ru.sleepcore.companion.presentation.sync

import app.cash.turbine.test
import io.mockk.*
import io.mockk.impl.annotations.MockK
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import ru.sleepcore.companion.data.local.StoredCredentials
import ru.sleepcore.companion.data.repository.PendingSyncRepository
import ru.sleepcore.companion.data.repository.SleepRepository
import ru.sleepcore.companion.domain.model.*
import ru.sleepcore.companion.health.HealthConnectManager
import ru.sleepcore.companion.health.HealthConnectPermissions
import java.time.Instant

@OptIn(ExperimentalCoroutinesApi::class)
class SyncViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @MockK
    private lateinit var sleepRepository: SleepRepository

    @MockK
    private lateinit var healthConnectManager: HealthConnectManager

    @MockK
    private lateinit var pendingSyncRepository: PendingSyncRepository

    private lateinit var viewModel: SyncViewModel

    @Before
    fun setup() {
        MockKAnnotations.init(this)
        Dispatchers.setMain(testDispatcher)

        // Default mocks
        every { sleepRepository.getCredentials() } returns null
        coEvery { healthConnectManager.checkPermissions() } returns HealthConnectPermissions(
            sleepRead = false,
            hrvRead = false,
            heartRateRead = false,
            restingHeartRateRead = false,
            backgroundRead = false
        )
        coEvery { sleepRepository.getSyncStatus() } returns Result.failure(Exception("Not linked"))

        viewModel = SyncViewModel(sleepRepository, healthConnectManager, pendingSyncRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    // ========== Initial State Tests ==========

    @Test
    fun `initial state has correct defaults`() = runTest {
        viewModel.uiState.test {
            val state = awaitItem()
            assertNull(state.userName)
            assertFalse(state.hasPermissions)
            assertEquals(0, state.totalSessions)
            assertEquals(0, state.sessionsLast7Days)
            assertNull(state.lastSyncAt)
            assertFalse(state.isSyncing)
            assertFalse(state.showUnlinkDialog)
            assertFalse(state.isUnlinked)
        }
    }

    // ========== Initialize Tests ==========

    @Test
    fun `initialize loads user info from credentials`() = runTest {
        val credentials = StoredCredentials(
            token = "test-token",
            expiresAt = Instant.now().plusSeconds(3600),
            userId = "user-1",
            telegramId = 123456L,
            userName = "Мария",
            deviceId = "device-1",
            linkedAt = Instant.now()
        )
        every { sleepRepository.getCredentials() } returns credentials

        val vm = SyncViewModel(sleepRepository, healthConnectManager, pendingSyncRepository)
        val mockContext = mockk<android.content.Context>(relaxed = true)
        every { mockContext.applicationContext } returns mockContext

        vm.initialize(mockContext)
        advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertEquals("Мария", state.userName)
        }
    }

    @Test
    fun `initialize checks permissions`() = runTest {
        coEvery { healthConnectManager.checkPermissions() } returns HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = false,
            backgroundRead = false
        )

        val vm = SyncViewModel(sleepRepository, healthConnectManager, pendingSyncRepository)
        val mockContext = mockk<android.content.Context>(relaxed = true)
        every { mockContext.applicationContext } returns mockContext

        vm.initialize(mockContext)
        advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertTrue(state.hasPermissions) // hasMinimumPermissions = sleepRead
        }
    }

    @Test
    fun `initialize refreshes status from server`() = runTest {
        val syncStatus = SyncStatus(
            device = DeviceStatus(
                id = "device-1",
                name = "Test Phone",
                manufacturer = "Samsung",
                model = "Galaxy S24",
                linkedAt = "2026-02-01T00:00:00Z",
                lastSyncAt = "2026-02-07T10:30:00Z"
            ),
            stats = SyncStats(
                totalSessions = 42,
                sessionsLast7Days = 7,
                lastSyncStatus = "success"
            ),
            recentSyncs = emptyList()
        )
        coEvery { sleepRepository.getSyncStatus() } returns Result.success(syncStatus)

        val vm = SyncViewModel(sleepRepository, healthConnectManager, pendingSyncRepository)
        val mockContext = mockk<android.content.Context>(relaxed = true)
        every { mockContext.applicationContext } returns mockContext

        vm.initialize(mockContext)
        advanceUntilIdle()

        vm.uiState.test {
            val state = awaitItem()
            assertEquals(42, state.totalSessions)
            assertEquals(7, state.sessionsLast7Days)
            assertNotNull(state.lastSyncAt)
        }
    }

    // ========== Sync Now Tests ==========

    @Test
    fun `syncNow shows loading state`() = runTest {
        coEvery { sleepRepository.syncSessions(any()) } coAnswers {
            kotlinx.coroutines.delay(100)
            Result.success(SyncResult(
                processed = 3,
                skipped = 0,
                errors = emptyList(),
                syncId = "sync-1",
                nextSyncRecommended = "PT15M"
            ))
        }
        coEvery { sleepRepository.getSyncStatus() } returns Result.failure(Exception("Not loaded"))

        viewModel.uiState.test {
            awaitItem() // initial

            viewModel.syncNow()

            val loadingState = awaitItem()
            assertTrue(loadingState.isSyncing)
            assertNull(loadingState.syncMessage)
        }
    }

    @Test
    fun `syncNow success shows processed count`() = runTest {
        coEvery { sleepRepository.syncSessions(any()) } returns Result.success(
            SyncResult(
                processed = 5,
                skipped = 0,
                errors = emptyList(),
                syncId = "sync-1",
                nextSyncRecommended = "PT15M"
            )
        )
        coEvery { sleepRepository.getSyncStatus() } returns Result.failure(Exception("Not loaded"))

        viewModel.uiState.test {
            awaitItem() // initial

            viewModel.syncNow()
            awaitItem() // loading

            advanceUntilIdle()

            val successState = awaitItem()
            assertFalse(successState.isSyncing)
            assertFalse(successState.syncError)
            assertTrue(successState.syncMessage!!.contains("5"))
        }
    }

    @Test
    fun `syncNow success shows skipped count when no new processed`() = runTest {
        coEvery { sleepRepository.syncSessions(any()) } returns Result.success(
            SyncResult(
                processed = 0,
                skipped = 3,
                errors = emptyList(),
                syncId = "sync-1",
                nextSyncRecommended = "PT15M"
            )
        )
        coEvery { sleepRepository.getSyncStatus() } returns Result.failure(Exception("Not loaded"))

        viewModel.uiState.test {
            awaitItem()

            viewModel.syncNow()
            awaitItem() // loading

            advanceUntilIdle()

            val state = awaitItem()
            assertTrue(state.syncMessage!!.contains("3"))
            assertTrue(state.syncMessage!!.contains("already"))
        }
    }

    @Test
    fun `syncNow NO_NEW_DATA is not an error`() = runTest {
        coEvery { sleepRepository.syncSessions(any()) } returns Result.failure(Exception("NO_NEW_DATA"))

        viewModel.uiState.test {
            awaitItem()

            viewModel.syncNow()
            awaitItem() // loading

            advanceUntilIdle()

            val state = awaitItem()
            assertFalse(state.isSyncing)
            assertFalse(state.syncError) // NO_NEW_DATA is not an error
            assertTrue(state.syncMessage!!.contains("No new"))
        }
    }

    @Test
    fun `syncNow TOKEN_EXPIRED shows session expired message`() = runTest {
        coEvery { sleepRepository.syncSessions(any()) } returns Result.failure(Exception("TOKEN_EXPIRED"))

        viewModel.uiState.test {
            awaitItem()

            viewModel.syncNow()
            awaitItem() // loading

            advanceUntilIdle()

            val state = awaitItem()
            assertTrue(state.syncError)
            assertTrue(state.syncMessage!!.contains("expired") || state.syncMessage!!.contains("re-link"))
        }
    }

    @Test
    fun `syncNow generic error shows error state`() = runTest {
        coEvery { sleepRepository.syncSessions(any()) } returns Result.failure(Exception("Network error"))

        viewModel.uiState.test {
            awaitItem()

            viewModel.syncNow()
            awaitItem() // loading

            advanceUntilIdle()

            val state = awaitItem()
            assertTrue(state.syncError)
            assertTrue(state.syncMessage!!.contains("failed"))
        }
    }

    @Test
    fun `syncNow refreshes status after success`() = runTest {
        coEvery { sleepRepository.syncSessions(any()) } returns Result.success(
            SyncResult(processed = 1, skipped = 0, errors = emptyList(), syncId = "sync-1", nextSyncRecommended = "PT15M")
        )
        coEvery { sleepRepository.getSyncStatus() } returns Result.success(
            SyncStatus(
                device = DeviceStatus("d1", null, null, null, null, "2026-02-07T12:00:00Z"),
                stats = SyncStats(totalSessions = 10, sessionsLast7Days = 3, lastSyncStatus = "success"),
                recentSyncs = emptyList()
            )
        )

        viewModel.uiState.test {
            awaitItem()

            viewModel.syncNow()
            awaitItem() // loading

            advanceUntilIdle()

            // Skip success message state
            awaitItem()

            // Status refresh state
            val refreshedState = awaitItem()
            assertEquals(10, refreshedState.totalSessions)
            assertEquals(3, refreshedState.sessionsLast7Days)
        }
    }

    // ========== Permissions Tests ==========

    @Test
    fun `onPermissionsResult updates state and auto-syncs`() = runTest {
        coEvery { healthConnectManager.checkPermissions() } returns HealthConnectPermissions(
            sleepRead = true,
            hrvRead = true,
            heartRateRead = true,
            restingHeartRateRead = true,
            backgroundRead = false
        )
        coEvery { sleepRepository.syncSessions(any()) } returns Result.success(
            SyncResult(processed = 2, skipped = 0, errors = emptyList(), syncId = "sync-1", nextSyncRecommended = "PT15M")
        )
        coEvery { sleepRepository.getSyncStatus() } returns Result.failure(Exception("Not loaded"))

        viewModel.uiState.test {
            awaitItem()

            viewModel.onPermissionsResult(setOf("android.permission.health.READ_SLEEP"))

            advanceUntilIdle()

            // Permission update
            val permState = awaitItem()
            assertTrue(permState.hasPermissions)

            // Auto-sync loading
            val loadingState = awaitItem()
            assertTrue(loadingState.isSyncing)

            // Sync complete
            awaitItem()
        }

        coVerify { sleepRepository.syncSessions(any()) }
    }

    // ========== Background Sync Toggle Tests ==========

    @Test
    fun `toggleBackgroundSync updates state`() = runTest {
        val mockContext = mockk<android.content.Context>(relaxed = true)
        every { mockContext.applicationContext } returns mockContext

        mockkObject(ru.sleepcore.companion.worker.SyncWorker)
        every { ru.sleepcore.companion.worker.SyncWorker.schedulePeriodicSync(any()) } just Runs
        every { ru.sleepcore.companion.worker.SyncWorker.cancelPeriodicSync(any()) } just Runs

        viewModel.initialize(mockContext)
        advanceUntilIdle()

        viewModel.uiState.test {
            awaitItem()

            viewModel.toggleBackgroundSync(false)

            val disabledState = awaitItem()
            assertFalse(disabledState.backgroundSyncEnabled)

            viewModel.toggleBackgroundSync(true)

            val enabledState = awaitItem()
            assertTrue(enabledState.backgroundSyncEnabled)
        }

        verify { ru.sleepcore.companion.worker.SyncWorker.cancelPeriodicSync(any()) }
        verify { ru.sleepcore.companion.worker.SyncWorker.schedulePeriodicSync(any()) }

        unmockkObject(ru.sleepcore.companion.worker.SyncWorker)
    }

    // ========== Unlink Dialog Tests ==========

    @Test
    fun `showUnlinkDialog sets dialog visible`() = runTest {
        viewModel.uiState.test {
            awaitItem()

            viewModel.showUnlinkDialog()

            val state = awaitItem()
            assertTrue(state.showUnlinkDialog)
        }
    }

    @Test
    fun `hideUnlinkDialog sets dialog hidden`() = runTest {
        viewModel.uiState.test {
            awaitItem()

            viewModel.showUnlinkDialog()
            awaitItem()

            viewModel.hideUnlinkDialog()

            val state = awaitItem()
            assertFalse(state.showUnlinkDialog)
        }
    }

    @Test
    fun `confirmUnlink cancels sync and clears credentials`() = runTest {
        val mockContext = mockk<android.content.Context>(relaxed = true)
        every { mockContext.applicationContext } returns mockContext

        mockkObject(ru.sleepcore.companion.worker.SyncWorker)
        every { ru.sleepcore.companion.worker.SyncWorker.cancelPeriodicSync(any()) } just Runs

        coEvery { sleepRepository.unlinkDevice() } returns Result.success(true)

        viewModel.initialize(mockContext)
        advanceUntilIdle()

        viewModel.uiState.test {
            awaitItem()

            viewModel.showUnlinkDialog()
            awaitItem()

            viewModel.confirmUnlink()

            advanceUntilIdle()

            val state = awaitItem()
            assertFalse(state.showUnlinkDialog)
            assertTrue(state.isUnlinked)
        }

        verify { ru.sleepcore.companion.worker.SyncWorker.cancelPeriodicSync(any()) }
        coVerify { sleepRepository.unlinkDevice() }

        unmockkObject(ru.sleepcore.companion.worker.SyncWorker)
    }
}
