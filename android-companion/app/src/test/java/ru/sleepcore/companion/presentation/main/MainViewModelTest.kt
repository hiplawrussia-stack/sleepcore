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
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import ru.sleepcore.companion.data.repository.SleepRepository

@OptIn(ExperimentalCoroutinesApi::class)
class MainViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @MockK
    private lateinit var sleepRepository: SleepRepository

    @Before
    fun setup() {
        MockKAnnotations.init(this)
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    @Test
    fun `isLinked is false when repository returns false`() = runTest {
        every { sleepRepository.isLinked() } returns false

        val viewModel = MainViewModel(sleepRepository)
        advanceUntilIdle()

        viewModel.isLinked.test {
            val state = awaitItem()
            assertFalse(state)
        }
    }

    @Test
    fun `isLinked is true when repository returns true`() = runTest {
        every { sleepRepository.isLinked() } returns true

        val viewModel = MainViewModel(sleepRepository)
        advanceUntilIdle()

        viewModel.isLinked.test {
            val state = awaitItem()
            assertTrue(state)
        }
    }

    @Test
    fun `checkLinkStatus is called on init`() = runTest {
        every { sleepRepository.isLinked() } returns false

        MainViewModel(sleepRepository)
        advanceUntilIdle()

        verify { sleepRepository.isLinked() }
    }
}
