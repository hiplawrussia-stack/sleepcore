/**
 * Sync ViewModel
 * ================
 * Manages sync dashboard state and operations.
 */

package ru.sleepcore.companion.presentation.sync

import android.content.Context
import androidx.activity.result.contract.ActivityResultContract
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ru.sleepcore.companion.data.repository.SleepRepository
import ru.sleepcore.companion.health.HealthConnectManager
import ru.sleepcore.companion.worker.SyncWorker
import java.time.Instant
import javax.inject.Inject

data class SyncUiState(
    val userName: String? = null,
    val hasPermissions: Boolean = false,
    val totalSessions: Int = 0,
    val sessionsLast7Days: Int = 0,
    val lastSyncAt: Instant? = null,
    val lastSyncStatus: String? = null,
    val isSyncing: Boolean = false,
    val syncMessage: String? = null,
    val syncError: Boolean = false,
    val backgroundSyncEnabled: Boolean = true,
    val showUnlinkDialog: Boolean = false,
    val isUnlinked: Boolean = false
)

@HiltViewModel
class SyncViewModel @Inject constructor(
    private val sleepRepository: SleepRepository,
    private val healthConnectManager: HealthConnectManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(SyncUiState())
    val uiState: StateFlow<SyncUiState> = _uiState.asStateFlow()

    private var appContext: Context? = null

    fun initialize(context: Context) {
        appContext = context.applicationContext
        loadUserInfo()
        checkPermissions()
        refreshStatus()
    }

    private fun loadUserInfo() {
        val credentials = sleepRepository.getCredentials()
        _uiState.update {
            it.copy(userName = credentials?.userName)
        }
    }

    private fun checkPermissions() {
        viewModelScope.launch {
            val permissions = healthConnectManager.checkPermissions()
            _uiState.update {
                it.copy(hasPermissions = permissions.hasMinimumPermissions)
            }
        }
    }

    fun getPermissionContract(): ActivityResultContract<Set<String>, Set<String>> {
        return healthConnectManager.createPermissionContract()
    }

    fun onPermissionsResult(granted: Set<String>) {
        viewModelScope.launch {
            val permissions = healthConnectManager.checkPermissions()
            _uiState.update {
                it.copy(hasPermissions = permissions.hasMinimumPermissions)
            }

            if (permissions.hasMinimumPermissions) {
                // Auto-sync after permissions granted
                syncNow()
            }
        }
    }

    fun refreshStatus() {
        viewModelScope.launch {
            val result = sleepRepository.getSyncStatus()
            result.onSuccess { status ->
                _uiState.update {
                    it.copy(
                        totalSessions = status.stats.totalSessions,
                        sessionsLast7Days = status.stats.sessionsLast7Days,
                        lastSyncAt = status.device.lastSyncAt?.let { Instant.parse(it) },
                        lastSyncStatus = status.stats.lastSyncStatus
                    )
                }
            }
        }
    }

    fun syncNow() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isSyncing = true,
                    syncMessage = null,
                    syncError = false
                )
            }

            val result = sleepRepository.syncSessions(syncType = "manual")

            result.fold(
                onSuccess = { syncResult ->
                    val message = when {
                        syncResult.processed > 0 ->
                            "Synced ${syncResult.processed} sleep session(s)"
                        syncResult.skipped > 0 ->
                            "${syncResult.skipped} session(s) already synced"
                        else ->
                            "Sync complete"
                    }
                    _uiState.update {
                        it.copy(
                            isSyncing = false,
                            syncMessage = message,
                            syncError = false
                        )
                    }
                    refreshStatus()
                },
                onFailure = { exception ->
                    val message = when (exception.message) {
                        "NO_NEW_DATA" -> "No new sleep data to sync"
                        "TOKEN_EXPIRED" -> "Session expired. Please re-link device."
                        else -> "Sync failed: ${exception.message}"
                    }
                    _uiState.update {
                        it.copy(
                            isSyncing = false,
                            syncMessage = message,
                            syncError = exception.message != "NO_NEW_DATA"
                        )
                    }
                }
            )
        }
    }

    fun toggleBackgroundSync(enabled: Boolean) {
        val context = appContext ?: return

        _uiState.update { it.copy(backgroundSyncEnabled = enabled) }

        if (enabled) {
            SyncWorker.schedulePeriodicSync(context)
        } else {
            SyncWorker.cancelPeriodicSync(context)
        }
    }

    fun showUnlinkDialog() {
        _uiState.update { it.copy(showUnlinkDialog = true) }
    }

    fun hideUnlinkDialog() {
        _uiState.update { it.copy(showUnlinkDialog = false) }
    }

    fun confirmUnlink() {
        viewModelScope.launch {
            val context = appContext
            if (context != null) {
                SyncWorker.cancelPeriodicSync(context)
            }

            sleepRepository.unlinkDevice()

            _uiState.update {
                it.copy(
                    showUnlinkDialog = false,
                    isUnlinked = true
                )
            }
        }
    }
}
