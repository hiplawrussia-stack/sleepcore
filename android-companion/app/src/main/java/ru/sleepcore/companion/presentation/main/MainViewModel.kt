/**
 * Main ViewModel
 * ================
 * Manages app-level state and navigation decisions.
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
    }

    private fun checkLinkStatus() {
        viewModelScope.launch {
            _isLinked.value = sleepRepository.isLinked()
        }
    }
}
