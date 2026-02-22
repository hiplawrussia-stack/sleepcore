/**
 * MainViewModel Unit Tests
 * =========================
 * Tests for app-level state and navigation decisions.
 */

package ru.sleepcore.companion.presentation.main

import app.cash.turbine.test
import io.mockk.*
import io.mockk.impl.annotations.MockK
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import ru.sleepcore.companion.data.local.StoredCredentials
import ru.sleepcore.companion.data.repository.SleepRepository
import ru.sleepcore.companion.util.ErrorLogger

@OptIn(ExperimentalCoroutinesApi::class)
class MainViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @MockK(relaxed = true)
    private lateinit var sleepRepository: SleepRepository

    @Before
    fun setup() {
        MockKAnnotations.init(this)
        Dispatchers.setMain(testDispatcher)

        // Mock ErrorLogger to prevent android.util.Log calls
        mockkObject(ErrorLogger)
        every { ErrorLogger.log(any(), any(), any(), any()) } just Runs

        // Default mock for observeCredentials (required by init)
        every { sleepRepository.observeCredentials() } returns flowOf(null)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkObject(ErrorLogger)
        unmockkAll()
    }

    @Test
    fun `isLinked is false when repository returns false`() = runTest {
        coEvery { sleepRepository.suspendIsLinked() } returns false

        val viewModel = MainViewModel(sleepRepository)
        advanceUntilIdle()

        viewModel.isLinked.test {
            val state = awaitItem()
            assertFalse(state)
        }
    }

    @Test
    fun `isLinked is true when repository returns true`() = runTest {
        coEvery { sleepRepository.suspendIsLinked() } returns true
        // Must provide valid credentials for observeCredentials, otherwise it will override to false
        val credentials = StoredCredentials(
            token = "test-token",
            expiresAt = java.time.Instant.now().plusSeconds(3600),
            userId = "user-1",
            telegramId = 123L,
            userName = "Test",
            deviceId = "device-1",
            linkedAt = java.time.Instant.now()
        )
        every { sleepRepository.observeCredentials() } returns flowOf(credentials)

        val viewModel = MainViewModel(sleepRepository)
        advanceUntilIdle()

        viewModel.isLinked.test {
            val state = awaitItem()
            assertTrue(state)
        }
    }

    @Test
    fun `checkLinkStatus is called on init`() = runTest {
        coEvery { sleepRepository.suspendIsLinked() } returns false

        MainViewModel(sleepRepository)
        advanceUntilIdle()

        coVerify { sleepRepository.suspendIsLinked() }
    }
}
