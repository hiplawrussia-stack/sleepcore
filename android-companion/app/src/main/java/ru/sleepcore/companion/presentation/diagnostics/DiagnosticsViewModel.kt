/**
 * Diagnostics ViewModel
 * ======================
 * Manages Health Connect diagnostics data collection.
 *
 * Based on research (February 2026):
 * - Health Connect SDK 1.1.0 APIs
 * - Android 14/15 background read features
 * - Manufacturer-specific known issues
 *
 * Sources:
 * - developer.android.com/health-and-fitness/health-connect
 * - us.community.samsung.com (Galaxy Watch issues)
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.presentation.diagnostics

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ru.sleepcore.companion.data.local.TokenStorage
import ru.sleepcore.companion.data.repository.SleepRepository
import ru.sleepcore.companion.health.HealthConnectAvailability
import ru.sleepcore.companion.health.HealthConnectManager
import ru.sleepcore.companion.util.ErrorContext
import ru.sleepcore.companion.util.ErrorLogger
import ru.sleepcore.companion.util.ErrorSeverity
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import javax.inject.Inject

@HiltViewModel
class DiagnosticsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val healthConnectManager: HealthConnectManager,
    private val sleepRepository: SleepRepository,
    private val tokenStorage: TokenStorage
) : ViewModel() {

    companion object {
        private const val TAG = "DiagnosticsViewModel"

        // Samsung Galaxy Watch known issues URLs
        private const val SAMSUNG_SLEEP_ISSUE_URL =
            "https://us.community.samsung.com/t5/Galaxy-Watch/Galaxy-Watch-7-Ultra-inaccurate-sleep-tracking/td-p/3057389"

        // Health Connect package
        private const val HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata"
    }

    private val _uiState = MutableStateFlow(DiagnosticsUiState())
    val uiState: StateFlow<DiagnosticsUiState> = _uiState.asStateFlow()

    init {
        loadDiagnostics()
    }

    /**
     * Load all diagnostic data
     */
    fun loadDiagnostics() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                // Check Health Connect availability
                val availability = healthConnectManager.checkAvailability()
                val isAvailable = availability is HealthConnectAvailability.Available
                val needsUpdate = availability is HealthConnectAvailability.UpdateRequired

                // Get Health Connect version
                val hcVersion = getHealthConnectVersion()

                // Check permissions
                val permissions = if (isAvailable) {
                    healthConnectManager.checkPermissions()
                } else null

                // Check features
                val hasBackgroundRead = if (isAvailable) {
                    healthConnectManager.isBackgroundReadFeatureAvailable()
                } else false

                val hasHistoryRead = if (isAvailable) {
                    healthConnectManager.isHistoryReadFeatureAvailable()
                } else false

                // Build permission items
                val permissionItems = buildPermissionItems(permissions)

                // Get token diagnostics
                val tokenDiag = tokenStorage.diagnoseTokenState()
                val credentials = tokenStorage.loadCredentials()

                // Detect known issues
                val knownIssues = detectKnownIssues()

                // Generate troubleshooting steps
                val troubleshooting = generateTroubleshootingSteps(
                    isAvailable = isAvailable,
                    needsUpdate = needsUpdate,
                    hasMinimumPermissions = permissions?.hasMinimumPermissions == true,
                    tokenDiag = tokenDiag
                )

                // Calculate overall status
                val (overallStatus, statusMessage) = calculateOverallStatus(
                    isAvailable = isAvailable,
                    needsUpdate = needsUpdate,
                    hasMinimumPermissions = permissions?.hasMinimumPermissions == true,
                    tokenDiag = tokenDiag
                )

                // Generate diagnostic report
                val report = generateDiagnosticReport(
                    availability = availability,
                    hcVersion = hcVersion,
                    permissions = permissions,
                    hasBackgroundRead = hasBackgroundRead,
                    hasHistoryRead = hasHistoryRead,
                    tokenDiag = tokenDiag,
                    credentials = credentials,
                    knownIssues = knownIssues
                )

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        overallStatus = overallStatus,
                        overallStatusMessage = statusMessage,
                        healthConnectAvailable = isAvailable,
                        healthConnectVersion = hcVersion,
                        healthConnectUpdateRequired = needsUpdate,
                        permissions = permissionItems,
                        hasMinimumPermissions = permissions?.hasMinimumPermissions == true,
                        hasBackgroundReadFeature = hasBackgroundRead,
                        hasHistoryReadFeature = hasHistoryRead,
                        tokenDiagnostics = tokenDiag,
                        tokenExpiresAt = credentials?.expiresAt,
                        hasRefreshToken = credentials?.canRefresh == true,
                        knownIssues = knownIssues,
                        troubleshootingSteps = troubleshooting,
                        diagnosticReport = report
                    )
                }

                ErrorLogger.log(
                    severity = ErrorSeverity.DEBUG,
                    context = ErrorContext(TAG, "loadDiagnostics"),
                    message = "Diagnostics loaded: status=$overallStatus"
                )
            } catch (e: Exception) {
                ErrorLogger.log(
                    severity = ErrorSeverity.ERROR,
                    context = ErrorContext(TAG, "loadDiagnostics"),
                    message = "Failed to load diagnostics",
                    throwable = e
                )

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        overallStatus = StatusSeverity.ERROR,
                        overallStatusMessage = "Failed to load diagnostics: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * Get Health Connect app version
     */
    private fun getHealthConnectVersion(): String? {
        return try {
            val packageInfo = context.packageManager.getPackageInfo(HEALTH_CONNECT_PACKAGE, 0)
            packageInfo.versionName
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Build permission diagnostic items
     */
    private fun buildPermissionItems(
        permissions: ru.sleepcore.companion.health.HealthConnectPermissions?
    ): List<DiagnosticItem> {
        if (permissions == null) return emptyList()

        return listOf(
            DiagnosticItem(
                name = "Sleep Sessions",
                status = if (permissions.sleepRead) StatusSeverity.OK else StatusSeverity.ERROR,
                value = if (permissions.sleepRead) "Granted" else "Not Granted",
                detail = "Required for basic sync"
            ),
            DiagnosticItem(
                name = "Heart Rate",
                status = if (permissions.heartRateRead) StatusSeverity.OK else StatusSeverity.WARNING,
                value = if (permissions.heartRateRead) "Granted" else "Not Granted",
                detail = "Optional, improves sleep analysis"
            ),
            DiagnosticItem(
                name = "HRV (Variability)",
                status = if (permissions.hrvRead) StatusSeverity.OK else StatusSeverity.WARNING,
                value = if (permissions.hrvRead) "Granted" else "Not Granted",
                detail = "Optional, enables readiness score"
            ),
            DiagnosticItem(
                name = "Resting Heart Rate",
                status = if (permissions.restingHeartRateRead) StatusSeverity.OK else StatusSeverity.WARNING,
                value = if (permissions.restingHeartRateRead) "Granted" else "Not Granted",
                detail = "Optional, baseline tracking"
            ),
            DiagnosticItem(
                name = "Background Read",
                status = if (permissions.backgroundRead) StatusSeverity.OK else StatusSeverity.WARNING,
                value = if (permissions.backgroundRead) "Granted" else "Not Granted",
                detail = "Android 15+, auto-sync without opening app"
            ),
            DiagnosticItem(
                name = "History Read",
                status = if (permissions.historyRead) StatusSeverity.OK else StatusSeverity.WARNING,
                value = if (permissions.historyRead) "Granted" else "Not Granted",
                detail = "Access data older than 30 days"
            ),
            DiagnosticItem(
                name = "SpO2 (Blood Oxygen)",
                status = if (permissions.spo2Read) StatusSeverity.OK else StatusSeverity.WARNING,
                value = if (permissions.spo2Read) "Granted" else "Not Granted",
                detail = "Optional, sleep apnea indicators"
            ),
            DiagnosticItem(
                name = "Respiratory Rate",
                status = if (permissions.respirationRateRead) StatusSeverity.OK else StatusSeverity.WARNING,
                value = if (permissions.respirationRateRead) "Granted" else "Not Granted",
                detail = "Optional, breathing analysis"
            )
        )
    }

    /**
     * Detect known manufacturer issues
     */
    private fun detectKnownIssues(): List<KnownIssue> {
        val issues = mutableListOf<KnownIssue>()
        val manufacturer = Build.MANUFACTURER.lowercase()
        val model = Build.MODEL.lowercase()

        // Samsung Galaxy Watch issues
        if (manufacturer == "samsung") {
            issues.add(
                KnownIssue(
                    title = "Samsung Galaxy Watch Sleep Tracking",
                    description = "Some Samsung Galaxy Watch models (especially Galaxy Watch 7/Ultra with One UI 8) may report inaccurate sleep stage detection. Consider using subjective diary as primary source.",
                    learnMoreUrl = SAMSUNG_SLEEP_ISSUE_URL
                )
            )
        }

        // Fitbit issues (general note)
        if (isFitbitInstalled()) {
            issues.add(
                KnownIssue(
                    title = "Fitbit Health Connect Sync",
                    description = "Fitbit syncs data to Health Connect with a delay (typically 15-30 minutes after waking). Recent sleep sessions may not appear immediately.",
                    learnMoreUrl = null
                )
            )
        }

        // Garmin issues
        if (isGarminInstalled()) {
            issues.add(
                KnownIssue(
                    title = "Garmin Connect Sync",
                    description = "Garmin Connect may require manual sync to Health Connect. Open Garmin Connect app after sleep to ensure data is available.",
                    learnMoreUrl = null
                )
            )
        }

        // Android version warnings
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            issues.add(
                KnownIssue(
                    title = "Background Sync Limited",
                    description = "Background read permissions require Android 14 or higher. Sync will only work when the app is open or via scheduled WorkManager tasks.",
                    learnMoreUrl = null
                )
            )
        }

        return issues
    }

    /**
     * Check if Fitbit app is installed
     */
    private fun isFitbitInstalled(): Boolean {
        return try {
            context.packageManager.getPackageInfo("com.fitbit.FitbitMobile", 0)
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Check if Garmin Connect is installed
     */
    private fun isGarminInstalled(): Boolean {
        return try {
            context.packageManager.getPackageInfo("com.garmin.android.apps.connectmobile", 0)
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Generate troubleshooting steps based on current state
     */
    private fun generateTroubleshootingSteps(
        isAvailable: Boolean,
        needsUpdate: Boolean,
        hasMinimumPermissions: Boolean,
        tokenDiag: TokenStorage.TokenDiagnostics
    ): List<TroubleshootingStep> {
        val steps = mutableListOf<TroubleshootingStep>()

        // Health Connect not available
        if (!isAvailable && !needsUpdate) {
            steps.add(
                TroubleshootingStep(
                    title = "Install Health Connect",
                    description = "Health Connect is not installed on this device. Install it from Google Play Store.",
                    actionLabel = "Install",
                    actionType = TroubleshootingAction.OPEN_HEALTH_CONNECT_SETTINGS
                )
            )
        }

        // Health Connect needs update
        if (needsUpdate) {
            steps.add(
                TroubleshootingStep(
                    title = "Update Health Connect",
                    description = "Health Connect requires an update for compatibility with this app.",
                    actionLabel = "Update",
                    actionType = TroubleshootingAction.OPEN_HEALTH_CONNECT_SETTINGS
                )
            )
        }

        // Missing permissions
        if (isAvailable && !hasMinimumPermissions) {
            steps.add(
                TroubleshootingStep(
                    title = "Grant Permissions",
                    description = "Sleep read permission is required for sync. Please grant at least the sleep sessions permission.",
                    actionLabel = "Grant Permissions",
                    actionType = TroubleshootingAction.REQUEST_PERMISSIONS
                )
            )
        }

        // Token issues
        if (tokenDiag.needsRelink) {
            steps.add(
                TroubleshootingStep(
                    title = "Re-link Device",
                    description = tokenDiag.message,
                    actionLabel = "Unlink & Re-link",
                    actionType = TroubleshootingAction.RELINK_DEVICE
                )
            )
        }

        // General app info
        steps.add(
            TroubleshootingStep(
                title = "Check App Permissions",
                description = "Verify SleepCore has all required system permissions in Android Settings.",
                actionLabel = "App Settings",
                actionType = TroubleshootingAction.OPEN_APP_INFO
            )
        )

        // Contact support
        steps.add(
            TroubleshootingStep(
                title = "Contact Support",
                description = "If issues persist, copy the diagnostic report and send it to our support team.",
                actionLabel = "Copy Report",
                actionType = TroubleshootingAction.CONTACT_SUPPORT
            )
        )

        return steps
    }

    /**
     * Calculate overall status
     */
    private fun calculateOverallStatus(
        isAvailable: Boolean,
        needsUpdate: Boolean,
        hasMinimumPermissions: Boolean,
        tokenDiag: TokenStorage.TokenDiagnostics
    ): Pair<StatusSeverity, String> {
        return when {
            !isAvailable -> StatusSeverity.ERROR to "Health Connect is not available"
            needsUpdate -> StatusSeverity.ERROR to "Health Connect needs update"
            !hasMinimumPermissions -> StatusSeverity.ERROR to "Missing required permissions"
            tokenDiag.needsRelink -> StatusSeverity.ERROR to tokenDiag.message
            tokenDiag == TokenStorage.TokenDiagnostics.EXPIRING_SOON ->
                StatusSeverity.WARNING to "Token expiring soon, will auto-refresh"
            else -> StatusSeverity.OK to "All systems operational"
        }
    }

    /**
     * Generate diagnostic report for support
     */
    private fun generateDiagnosticReport(
        availability: HealthConnectAvailability,
        hcVersion: String?,
        permissions: ru.sleepcore.companion.health.HealthConnectPermissions?,
        hasBackgroundRead: Boolean,
        hasHistoryRead: Boolean,
        tokenDiag: TokenStorage.TokenDiagnostics,
        credentials: ru.sleepcore.companion.data.local.StoredCredentials?,
        knownIssues: List<KnownIssue>
    ): String {
        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
            .withZone(ZoneId.systemDefault())

        return buildString {
            appendLine("=== SleepCore Diagnostics Report ===")
            appendLine("Generated: ${formatter.format(Instant.now())}")
            appendLine()

            appendLine("--- Device Info ---")
            appendLine("Manufacturer: ${Build.MANUFACTURER}")
            appendLine("Model: ${Build.MODEL}")
            appendLine("Android Version: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
            appendLine()

            appendLine("--- Health Connect ---")
            appendLine("Status: ${availability.javaClass.simpleName}")
            appendLine("Version: ${hcVersion ?: "N/A"}")
            appendLine("Background Read Feature: $hasBackgroundRead")
            appendLine("History Read Feature: $hasHistoryRead")
            appendLine()

            appendLine("--- Permissions ---")
            if (permissions != null) {
                appendLine("Sleep Read: ${permissions.sleepRead}")
                appendLine("Heart Rate: ${permissions.heartRateRead}")
                appendLine("HRV: ${permissions.hrvRead}")
                appendLine("Resting HR: ${permissions.restingHeartRateRead}")
                appendLine("Background Read: ${permissions.backgroundRead}")
                appendLine("History Read: ${permissions.historyRead}")
                appendLine("SpO2: ${permissions.spo2Read}")
                appendLine("Respiratory: ${permissions.respirationRateRead}")
                appendLine("Minimum Required: ${permissions.hasMinimumPermissions}")
            } else {
                appendLine("Unable to check permissions")
            }
            appendLine()

            appendLine("--- Token Status ---")
            appendLine("State: ${tokenDiag.name}")
            appendLine("Message: ${tokenDiag.message}")
            appendLine("Needs Re-link: ${tokenDiag.needsRelink}")
            if (credentials != null) {
                appendLine("Linked At: ${formatter.format(credentials.linkedAt)}")
                appendLine("Expires At: ${formatter.format(credentials.expiresAt)}")
                appendLine("Has Refresh Token: ${credentials.canRefresh}")
            }
            appendLine()

            if (knownIssues.isNotEmpty()) {
                appendLine("--- Known Issues ---")
                knownIssues.forEach { issue ->
                    appendLine("- ${issue.title}")
                }
                appendLine()
            }

            appendLine("=== End of Report ===")
        }
    }

    /**
     * Toggle section expansion
     */
    fun toggleSection(sectionId: String) {
        _uiState.update { state ->
            val newExpanded = if (state.expandedSections.contains(sectionId)) {
                state.expandedSections - sectionId
            } else {
                state.expandedSections + sectionId
            }
            state.copy(expandedSections = newExpanded)
        }
    }

    /**
     * Copy diagnostic report to clipboard
     */
    fun copyDiagnosticReport() {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE)
            as android.content.ClipboardManager
        val clip = android.content.ClipData.newPlainText(
            "SleepCore Diagnostics",
            _uiState.value.diagnosticReport
        )
        clipboard.setPrimaryClip(clip)

        _uiState.update { it.copy(showCopyConfirmation = true) }

        ErrorLogger.log(
            severity = ErrorSeverity.INFO,
            context = ErrorContext(TAG, "copyDiagnosticReport"),
            message = "Diagnostic report copied to clipboard"
        )

        // Auto-hide confirmation after delay
        viewModelScope.launch {
            kotlinx.coroutines.delay(2000)
            _uiState.update { it.copy(showCopyConfirmation = false) }
        }
    }

    /**
     * Open Health Connect settings
     */
    fun openHealthConnectSettings() {
        try {
            val intent = Intent(Settings.ACTION_HEALTH_CONNECT_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            // Fallback to Play Store
            try {
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    data = Uri.parse("market://details?id=$HEALTH_CONNECT_PACKAGE")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } catch (e2: Exception) {
                ErrorLogger.log(
                    severity = ErrorSeverity.WARNING,
                    context = ErrorContext(TAG, "openHealthConnectSettings"),
                    message = "Cannot open Health Connect settings",
                    throwable = e2
                )
            }
        }
    }

    /**
     * Open app info settings
     */
    fun openAppInfo() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            ErrorLogger.log(
                severity = ErrorSeverity.WARNING,
                context = ErrorContext(TAG, "openAppInfo"),
                message = "Cannot open app info",
                throwable = e
            )
        }
    }

    /**
     * Open URL in browser
     */
    fun openUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse(url)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            ErrorLogger.log(
                severity = ErrorSeverity.WARNING,
                context = ErrorContext(TAG, "openUrl"),
                message = "Cannot open URL: $url",
                throwable = e
            )
        }
    }
}
