/**
 * Link ViewModel
 * ================
 * Manages device linking state and logic.
 */

package ru.sleepcore.companion.presentation.link

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ru.sleepcore.companion.data.repository.SleepRepository
import ru.sleepcore.companion.health.HealthConnectAvailability
import ru.sleepcore.companion.health.HealthConnectManager
import ru.sleepcore.companion.util.DeviceUtils
import javax.inject.Inject

data class LinkUiState(
    val linkCode: String = "",
    val isLoading: Boolean = false,
    val isLinked: Boolean = false,
    val error: String? = null,
    val isHealthConnectAvailable: Boolean = true,
    val userName: String? = null
) {
    val isValidCode: Boolean
        get() = linkCode.length == 6 && linkCode.all { it.isLetterOrDigit() }
}

@HiltViewModel
class LinkViewModel @Inject constructor(
    private val sleepRepository: SleepRepository,
    private val healthConnectManager: HealthConnectManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(LinkUiState())
    val uiState: StateFlow<LinkUiState> = _uiState.asStateFlow()

    private var deviceContext: Context? = null

    fun initialize(context: Context) {
        // BUG-02 FIX: Use applicationContext to prevent Activity memory leak
        // Storing Activity context in ViewModel causes memory leak because ViewModel survives configuration changes
        // Source: developer.android.com/topic/libraries/architecture/viewmodel (2025)
        deviceContext = context.applicationContext
        checkHealthConnect()
    }

    private fun checkHealthConnect() {
        val availability = healthConnectManager.checkAvailability()
        _uiState.update {
            it.copy(
                isHealthConnectAvailable = availability is HealthConnectAvailability.Available
            )
        }
    }

    fun updateLinkCode(code: String) {
        // Only allow alphanumeric, max 6 chars
        val filtered = code.filter { it.isLetterOrDigit() }.take(6).uppercase()
        _uiState.update {
            it.copy(
                linkCode = filtered,
                error = null
            )
        }
    }

    fun linkDevice() {
        val context = deviceContext ?: return
        val code = _uiState.value.linkCode

        if (!_uiState.value.isValidCode) {
            _uiState.update { it.copy(error = "Please enter a valid 6-character code") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val deviceInfo = DeviceUtils.getDeviceInfo(context)
            val result = sleepRepository.linkDevice(code, deviceInfo)

            result.fold(
                onSuccess = { linkResult ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isLinked = true,
                            userName = linkResult.user.firstName
                        )
                    }
                },
                onFailure = { exception ->
                    val errorMessage = when (exception.message) {
                        "INVALID_CODE" -> "Invalid link code. Please check and try again."
                        "EXPIRED_CODE" -> "Link code has expired. Please generate a new one."
                        else -> "Connection error. Please try again."
                    }
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = errorMessage
                        )
                    }
                }
            )
        }
    }
}
