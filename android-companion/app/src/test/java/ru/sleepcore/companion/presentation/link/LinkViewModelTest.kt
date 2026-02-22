/**
 * LinkViewModel Unit Tests
 * =========================
 * Tests for device linking flow and state management.
 */

package ru.sleepcore.companion.presentation.link

import app.cash.turbine.test
import io.mockk.*
import io.mockk.impl.annotations.MockK
import io.sentry.Sentry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import ru.sleepcore.companion.data.repository.SleepRepository
import ru.sleepcore.companion.domain.model.DeviceInfo
import ru.sleepcore.companion.domain.model.LinkResult
import ru.sleepcore.companion.domain.model.LinkedUser
import ru.sleepcore.companion.health.HealthConnectAvailability
import ru.sleepcore.companion.health.HealthConnectManager

@OptIn(ExperimentalCoroutinesApi::class)
class LinkViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @MockK
    private lateinit var sleepRepository: SleepRepository

    @MockK
    private lateinit var healthConnectManager: HealthConnectManager

    private lateinit var viewModel: LinkViewModel

    @Before
    fun setup() {
        MockKAnnotations.init(this)
        Dispatchers.setMain(testDispatcher)

        // Mock Sentry to prevent RuntimeException in ErrorLogger
        mockkStatic(Sentry::class)
        every { Sentry.isEnabled() } returns false

        every { healthConnectManager.checkAvailability() } returns HealthConnectAvailability.Available

        viewModel = LinkViewModel(sleepRepository, healthConnectManager)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkStatic(Sentry::class)
        unmockkAll()
    }

    // ========== Initial State Tests ==========

    @Test
    fun `initial state has empty link code`() = runTest {
        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("", state.linkCode)
            assertFalse(state.isLoading)
            assertFalse(state.isLinked)
            assertNull(state.error)
        }
    }

    // ========== Link Code Update Tests ==========

    @Test
    fun `updateLinkCode updates state with uppercase`() = runTest {
        viewModel.uiState.test {
            awaitItem() // initial state

            viewModel.updateLinkCode("abc123")

            val state = awaitItem()
            assertEquals("ABC123", state.linkCode)
        }
    }

    @Test
    fun `updateLinkCode filters non-alphanumeric characters`() = runTest {
        viewModel.uiState.test {
            awaitItem()

            viewModel.updateLinkCode("AB!@#C12$%^3")

            val state = awaitItem()
            assertEquals("ABC123", state.linkCode)
        }
    }

    @Test
    fun `updateLinkCode limits to 6 characters`() = runTest {
        viewModel.uiState.test {
            awaitItem()

            viewModel.updateLinkCode("ABCDEFGHIJ")

            val state = awaitItem()
            assertEquals("ABCDEF", state.linkCode)
        }
    }

    @Test
    fun `updateLinkCode clears previous error`() = runTest {
        viewModel.uiState.test {
            awaitItem()

            // Simulate an error state first
            viewModel.updateLinkCode("ABC")
            awaitItem()

            viewModel.linkDevice() // Will fail with invalid code
            advanceUntilIdle()
            val errorState = awaitItem()
            assertNotNull(errorState.error)

            // Update code should clear error
            viewModel.updateLinkCode("ABC123")
            val clearedState = awaitItem()
            assertNull(clearedState.error)
        }
    }

    // ========== Link Device Tests ==========

    @Test
    fun `linkDevice shows error for invalid code length`() = runTest {
        viewModel.uiState.test {
            awaitItem()

            viewModel.updateLinkCode("ABC")
            awaitItem()

            viewModel.linkDevice()
            advanceUntilIdle()

            val state = awaitItem()
            assertNotNull(state.error)
            assertTrue(state.error!!.contains("valid"))
        }
    }

    @Test
    fun `linkDevice does nothing without context`() = runTest {
        viewModel.uiState.test {
            awaitItem()

            viewModel.updateLinkCode("ABC123")
            awaitItem()

            viewModel.linkDevice() // No context set
            advanceUntilIdle()

            val state = awaitItem()
            assertNotNull(state.error)
        }
    }

    @Test
    fun `linkDevice success updates state with user name`() = runTest {
        val mockContext = mockk<android.content.Context>(relaxed = true)
        mockkObject(ru.sleepcore.companion.util.DeviceUtils)
        every { ru.sleepcore.companion.util.DeviceUtils.getDeviceInfo(any()) } returns DeviceInfo(
            id = "device-123",
            name = "Test Device",
            manufacturer = "Test",
            model = "Model X"
        )

        val linkResult = LinkResult(
            token = "jwt-token",
            expiresAt = "2026-03-07T00:00:00Z",
            user = LinkedUser(
                id = "user-1",
                telegramId = 123456L,
                firstName = "Иван"
            )
        )
        coEvery { sleepRepository.linkDevice(any(), any()) } returns Result.success(linkResult)

        viewModel.initialize(mockContext)
        viewModel.uiState.test {
            skipItems(1) // initial state

            viewModel.updateLinkCode("ABC123")
            awaitItem()

            viewModel.linkDevice()

            // Loading state
            val loadingState = awaitItem()
            assertTrue(loadingState.isLoading)

            advanceUntilIdle()

            // Success state
            val successState = awaitItem()
            assertFalse(successState.isLoading)
            assertTrue(successState.isLinked)
            assertEquals("Иван", successState.userName)
            assertNull(successState.error)
        }

        unmockkObject(ru.sleepcore.companion.util.DeviceUtils)
    }

    @Test
    fun `linkDevice handles INVALID_CODE error`() = runTest {
        val mockContext = mockk<android.content.Context>(relaxed = true)
        mockkObject(ru.sleepcore.companion.util.DeviceUtils)
        every { ru.sleepcore.companion.util.DeviceUtils.getDeviceInfo(any()) } returns DeviceInfo(id = "device-123")

        coEvery { sleepRepository.linkDevice(any(), any()) } returns Result.failure(Exception("INVALID_CODE"))

        viewModel.initialize(mockContext)
        viewModel.uiState.test {
            skipItems(1)

            viewModel.updateLinkCode("ABC123")
            awaitItem()

            viewModel.linkDevice()
            awaitItem() // loading

            advanceUntilIdle()

            val state = awaitItem()
            assertFalse(state.isLoading)
            assertFalse(state.isLinked)
            assertTrue(state.error!!.contains("Invalid"))
        }

        unmockkObject(ru.sleepcore.companion.util.DeviceUtils)
    }

    @Test
    fun `linkDevice handles EXPIRED_CODE error`() = runTest {
        val mockContext = mockk<android.content.Context>(relaxed = true)
        mockkObject(ru.sleepcore.companion.util.DeviceUtils)
        every { ru.sleepcore.companion.util.DeviceUtils.getDeviceInfo(any()) } returns DeviceInfo(id = "device-123")

        coEvery { sleepRepository.linkDevice(any(), any()) } returns Result.failure(Exception("EXPIRED_CODE"))

        viewModel.initialize(mockContext)
        viewModel.uiState.test {
            skipItems(1)

            viewModel.updateLinkCode("ABC123")
            awaitItem()

            viewModel.linkDevice()
            awaitItem() // loading

            advanceUntilIdle()

            val state = awaitItem()
            assertFalse(state.isLoading)
            assertTrue(state.error!!.contains("expired"))
        }

        unmockkObject(ru.sleepcore.companion.util.DeviceUtils)
    }

    @Test
    fun `linkDevice handles network error`() = runTest {
        val mockContext = mockk<android.content.Context>(relaxed = true)
        mockkObject(ru.sleepcore.companion.util.DeviceUtils)
        every { ru.sleepcore.companion.util.DeviceUtils.getDeviceInfo(any()) } returns DeviceInfo(id = "device-123")

        coEvery { sleepRepository.linkDevice(any(), any()) } returns Result.failure(Exception("Network error"))

        viewModel.initialize(mockContext)
        viewModel.uiState.test {
            skipItems(1)

            viewModel.updateLinkCode("ABC123")
            awaitItem()

            viewModel.linkDevice()
            awaitItem() // loading

            advanceUntilIdle()

            val state = awaitItem()
            assertFalse(state.isLoading)
            assertTrue(state.error!!.contains("Connection"))
        }

        unmockkObject(ru.sleepcore.companion.util.DeviceUtils)
    }

    // ========== Health Connect Availability Tests ==========

    @Test
    fun `initialize checks Health Connect availability`() = runTest {
        val mockContext = mockk<android.content.Context>(relaxed = true)

        every { healthConnectManager.checkAvailability() } returns HealthConnectAvailability.NotInstalled

        val viewModelWithUnavailable = LinkViewModel(sleepRepository, healthConnectManager)
        viewModelWithUnavailable.initialize(mockContext)

        viewModelWithUnavailable.uiState.test {
            val state = awaitItem()
            assertFalse(state.isHealthConnectAvailable)
        }
    }

    @Test
    fun `Health Connect available sets state correctly`() = runTest {
        val mockContext = mockk<android.content.Context>(relaxed = true)

        every { healthConnectManager.checkAvailability() } returns HealthConnectAvailability.Available

        viewModel.initialize(mockContext)

        viewModel.uiState.test {
            val state = awaitItem()
            assertTrue(state.isHealthConnectAvailable)
        }
    }
}
