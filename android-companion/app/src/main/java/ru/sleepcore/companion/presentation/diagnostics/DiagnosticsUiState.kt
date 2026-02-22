/**
 * Diagnostics UI State
 * ====================
 * UI state for Health Connect diagnostics screen.
 *
 * Based on research (February 2026):
 * - Progressive disclosure UX pattern for technical information
 * - WCAG 2.1 AA compliance for accessibility
 * - Material Design 3 status patterns
 *
 * Sources:
 * - developer.android.com/health-and-fitness/health-connect
 * - m3.material.io/foundations/accessibility
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.presentation.diagnostics

import ru.sleepcore.companion.data.local.TokenStorage
import java.time.Instant

/**
 * Overall status severity for visual indicators
 */
enum class StatusSeverity {
    /** Everything working normally */
    OK,
    /** Non-critical issues, some features may be limited */
    WARNING,
    /** Critical issues, sync not possible */
    ERROR
}

/**
 * Individual diagnostic item
 */
data class DiagnosticItem(
    val name: String,
    val status: StatusSeverity,
    val value: String,
    val detail: String? = null
)

/**
 * Data source info from Health Connect
 */
data class DataSourceInfo(
    val name: String,
    val packageName: String,
    val isInstalled: Boolean
)

/**
 * Known manufacturer issue
 */
data class KnownIssue(
    val title: String,
    val description: String,
    val learnMoreUrl: String? = null
)

/**
 * Troubleshooting step
 */
data class TroubleshootingStep(
    val title: String,
    val description: String,
    val actionLabel: String? = null,
    val actionType: TroubleshootingAction? = null
)

/**
 * Troubleshooting action types
 */
enum class TroubleshootingAction {
    OPEN_HEALTH_CONNECT_SETTINGS,
    OPEN_APP_INFO,
    REQUEST_PERMISSIONS,
    RELINK_DEVICE,
    CONTACT_SUPPORT
}

/**
 * UI state for diagnostics screen
 */
data class DiagnosticsUiState(
    val isLoading: Boolean = true,

    // Overall status
    val overallStatus: StatusSeverity = StatusSeverity.OK,
    val overallStatusMessage: String = "",

    // Health Connect status
    val healthConnectAvailable: Boolean = false,
    val healthConnectVersion: String? = null,
    val healthConnectUpdateRequired: Boolean = false,

    // Permissions
    val permissions: List<DiagnosticItem> = emptyList(),
    val hasMinimumPermissions: Boolean = false,
    val hasBackgroundReadFeature: Boolean = false,
    val hasHistoryReadFeature: Boolean = false,

    // Data sources
    val dataSources: List<DataSourceInfo> = emptyList(),
    val lastSessionSource: String? = null,
    val lastSessionTime: Instant? = null,

    // Token status
    val tokenDiagnostics: TokenStorage.TokenDiagnostics? = null,
    val tokenExpiresAt: Instant? = null,
    val hasRefreshToken: Boolean = false,

    // Known issues (manufacturer-specific)
    val knownIssues: List<KnownIssue> = emptyList(),

    // Troubleshooting
    val troubleshootingSteps: List<TroubleshootingStep> = emptyList(),

    // Diagnostic report for copying
    val diagnosticReport: String = "",

    // UI state
    val showCopyConfirmation: Boolean = false,
    val expandedSections: Set<String> = setOf("status", "permissions")
)
