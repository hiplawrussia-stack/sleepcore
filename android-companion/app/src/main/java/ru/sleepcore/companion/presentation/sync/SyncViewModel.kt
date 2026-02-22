/**
 * Sync ViewModel
 * ================
 * Manages sync dashboard state and operations.
 *
 * Updated (February 2026):
 * - Added retry logic with exponential backoff for network operations
 * - Integrated centralized error logging
 * - Added offline sync queue UI integration
 *
 * Sources:
 * - developer.android.com/topic/libraries/architecture/workmanager
 * - medium.com/@hiren6997/workmanager-in-2025-5-patterns-that-actually-work-in-production
 * - developer.android.com/topic/architecture/data-layer/offline-first
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
import ru.sleepcore.companion.data.repository.PendingSyncRepository
import ru.sleepcore.companion.data.repository.SleepRepository
import ru.sleepcore.companion.health.HealthConnectManager
import ru.sleepcore.companion.util.ErrorContext
import ru.sleepcore.companion.util.ErrorLogger
import ru.sleepcore.companion.util.ErrorSeverity
import ru.sleepcore.companion.util.RetryHelper
import ru.sleepcore.companion.util.RetryResult
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
    val isUnlinked: Boolean = false,
    // Offline sync queue state (February 2026)
    val pendingCount: Int = 0,
    val failedCount: Int = 0,
    val isRetryingFailed: Boolean = false
)

@HiltViewModel
class SyncViewModel @Inject constructor(
    private val sleepRepository: SleepRepository,
    private val healthConnectManager: HealthConnectManager,
    private val pendingSyncRepository: PendingSyncRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SyncUiState())
    val uiState: StateFlow<SyncUiState> = _uiState.asStateFlow()

    private var appContext: Context? = null

    fun initialize(context: Context) {
        appContext = context.applicationContext
        loadUserInfo()
        checkPermissions()
        refreshStatus()
        observePendingQueue()
    }

    /**
     * Observe pending sync queue counts
     * Updates UI badge when items are queued for sync
     */
    private fun observePendingQueue() {
        viewModelScope.launch {
            pendingSyncRepository.observePendingCount().collect { count ->
                _uiState.update { it.copy(pendingCount = count) }
            }
        }
        viewModelScope.launch {
            pendingSyncRepository.observeFailedCount().collect { count ->
                _uiState.update { it.copy(failedCount = count) }
            }
        }
    }

    private fun loadUserInfo() {
        val credentials = sleepRepository.getCredentials()
        _uiState.update {
            it.copy(userName = credentials?.userName)
        }
    }

    private fun checkPermissions() {
        viewModelScope.launch {
            // Must call checkAvailability first to initialize healthConnectClient
            healthConnectManager.checkAvailability()
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
            // Must call checkAvailability first to initialize healthConnectClient
            healthConnectManager.checkAvailability()
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
            // Use retry helper for network resilience
            val result = RetryHelper.withRetryResult(
                config = RetryHelper.NETWORK_CONFIG.copy(maxAttempts = 2), // Fewer retries for status
                onRetry = { attempt, delayMs, error ->
                    ErrorLogger.logNetworkError(
                        tag = TAG,
                        operation = "refreshStatus",
                        attempt = attempt,
                        maxAttempts = 2,
                        delayMs = delayMs,
                        throwable = error
                    )
                }
            ) {
                sleepRepository.getSyncStatus()
            }

            result.onSuccess { status ->
                _uiState.update {
                    it.copy(
                        totalSessions = status.stats.totalSessions,
                        sessionsLast7Days = status.stats.sessionsLast7Days,
                        lastSyncAt = status.device.lastSyncAt?.let { Instant.parse(it) },
                        lastSyncStatus = status.stats.lastSyncStatus
                    )
                }
            }.onFailure { error ->
                ErrorLogger.log(
                    severity = ErrorSeverity.WARNING,
                    context = ErrorContext(TAG, "refreshStatus"),
                    message = "Failed to refresh status",
                    throwable = error
                )
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

            // Use retry helper with exponential backoff for network resilience
            val retryResult = RetryHelper.withRetryResult(
                config = RetryHelper.NETWORK_CONFIG,
                onRetry = { attempt, delayMs, error ->
                    ErrorLogger.logNetworkError(
                        tag = TAG,
                        operation = "syncNow",
                        attempt = attempt,
                        maxAttempts = RetryHelper.NETWORK_CONFIG.maxAttempts,
                        delayMs = delayMs,
                        throwable = error
                    )
                    // Update UI to show retry status
                    _uiState.update {
                        it.copy(syncMessage = "Retrying... (attempt $attempt)")
                    }
                }
            ) {
                sleepRepository.syncSessions(syncType = "manual")
            }

            retryResult.fold(
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
                    ErrorLogger.logSync(
                        success = true,
                        operation = "manual",
                        processed = syncResult.processed,
                        skipped = syncResult.skipped
                    )
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
                    ErrorLogger.logSync(
                        success = false,
                        operation = "manual",
                        error = exception.message,
                        throwable = exception
                    )
                }
            )
        }
    }

    companion object {
        private const val TAG = "SyncViewModel"
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

    /**
     * Retry all failed sync items
     *
     * Resets failed items to pending and triggers immediate sync.
     * Based on offline-first pattern (February 2026).
     */
    fun retryFailedItems() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRetryingFailed = true) }

            try {
                pendingSyncRepository.resetAllFailed()

                ErrorLogger.log(
                    severity = ErrorSeverity.INFO,
                    context = ErrorContext(TAG, "retryFailedItems"),
                    message = "Reset failed items for retry"
                )

                // Trigger immediate sync to process the queue
                val context = appContext
                if (context != null) {
                    SyncWorker.triggerImmediateSync(context)
                }

                _uiState.update {
                    it.copy(
                        isRetryingFailed = false,
                        syncMessage = "Retrying failed syncs..."
                    )
                }
            } catch (e: Exception) {
                ErrorLogger.log(
                    severity = ErrorSeverity.ERROR,
                    context = ErrorContext(TAG, "retryFailedItems"),
                    message = "Failed to retry items",
                    throwable = e
                )
                _uiState.update {
                    it.copy(
                        isRetryingFailed = false,
                        syncMessage = "Failed to retry: ${e.message}",
                        syncError = true
                    )
                }
            }
        }
    }

    /**
     * Clear all failed sync items (user chose to discard)
     */
    fun clearFailedItems() {
        viewModelScope.launch {
            try {
                // Get failed items and delete them
                val failedItems = pendingSyncRepository.getFailedItems()
                failedItems.forEach { item ->
                    pendingSyncRepository.markSynced(item.sessionId)  // Removes from queue
                }

                ErrorLogger.log(
                    severity = ErrorSeverity.INFO,
                    context = ErrorContext(TAG, "clearFailedItems"),
                    message = "Cleared ${failedItems.size} failed items"
                )

                _uiState.update {
                    it.copy(syncMessage = "Cleared ${failedItems.size} failed item(s)")
                }
            } catch (e: Exception) {
                ErrorLogger.log(
                    severity = ErrorSeverity.ERROR,
                    context = ErrorContext(TAG, "clearFailedItems"),
                    message = "Failed to clear items",
                    throwable = e
                )
            }
        }
    }
}
