/**
 * Main ViewModel
 * ================
 * Manages app-level state and navigation decisions.
 *
 * IMPORTANT: Uses suspend version of isLinked() to avoid ANR risk.
 * Also observes credentialsFlow for reactive updates (e.g., after unlink).
 */

package ru.sleepcore.companion.presentation.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import ru.sleepcore.companion.data.repository.SleepRepository
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val sleepRepository: SleepRepository
) : ViewModel() {

    private val _isLinked = MutableStateFlow(false)
    val isLinked: StateFlow<Boolean> = _isLinked.asStateFlow()

    init {
        checkLinkStatus()
        observeCredentialsChanges()
    }

    /**
     * Initial link status check using suspend version (NO ANR RISK)
     */
    private fun checkLinkStatus() {
        viewModelScope.launch {
            _isLinked.value = sleepRepository.suspendIsLinked()
        }
    }

    /**
     * Observe credentials changes for reactive UI updates
     *
     * This fixes the issue where MainViewModel doesn't react to
     * credential changes (e.g., after unlink in SyncViewModel).
     */
    private fun observeCredentialsChanges() {
        viewModelScope.launch {
            sleepRepository.observeCredentials().collect { credentials ->
                // Update isLinked based on credential state
                _isLinked.value = credentials != null &&
                    (!credentials.isExpired || credentials.canRefresh)
            }
        }
    }
}
