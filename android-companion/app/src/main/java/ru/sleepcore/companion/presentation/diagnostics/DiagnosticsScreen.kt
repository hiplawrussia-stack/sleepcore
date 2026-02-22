/**
 * Health Connect Diagnostics Screen
 * ===================================
 * Technical diagnostics UI for troubleshooting Health Connect issues.
 *
 * Based on research (February 2026):
 * - Material Design 3 patterns for status/diagnostics
 * - Progressive disclosure UX pattern
 * - WCAG 2.1 AA accessibility compliance
 *
 * Sources:
 * - m3.material.io/components
 * - developer.android.com/develop/ui/compose/accessibility
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.presentation.diagnostics

import android.view.HapticFeedbackConstants
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import ru.sleepcore.companion.R
import ru.sleepcore.companion.data.local.TokenStorage
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiagnosticsScreen(
    onBack: () -> Unit,
    onRequestPermissions: () -> Unit,
    onRelink: () -> Unit,
    viewModel: DiagnosticsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val view = LocalView.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.diagnostics_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.content_description_back)
                        )
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                            viewModel.loadDiagnostics()
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.content_description_refresh)
                        )
                    }
                }
            )
        },
        snackbarHost = {
            if (uiState.showCopyConfirmation) {
                Snackbar(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(stringResource(R.string.diagnostics_copied))
                }
            }
        }
    ) { paddingValues ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Overall Status Card
                OverallStatusCard(
                    status = uiState.overallStatus,
                    message = uiState.overallStatusMessage
                )

                // Health Connect Section
                ExpandableSection(
                    title = stringResource(R.string.diagnostics_health_connect),
                    icon = Icons.Default.HealthAndSafety,
                    isExpanded = uiState.expandedSections.contains("healthconnect"),
                    onToggle = { viewModel.toggleSection("healthconnect") }
                ) {
                    HealthConnectSection(
                        isAvailable = uiState.healthConnectAvailable,
                        version = uiState.healthConnectVersion,
                        needsUpdate = uiState.healthConnectUpdateRequired,
                        hasBackgroundRead = uiState.hasBackgroundReadFeature,
                        hasHistoryRead = uiState.hasHistoryReadFeature,
                        onOpenSettings = { viewModel.openHealthConnectSettings() }
                    )
                }

                // Permissions Section
                ExpandableSection(
                    title = stringResource(R.string.diagnostics_permissions),
                    icon = Icons.Default.Security,
                    isExpanded = uiState.expandedSections.contains("permissions"),
                    onToggle = { viewModel.toggleSection("permissions") }
                ) {
                    PermissionsSection(
                        permissions = uiState.permissions,
                        hasMinimum = uiState.hasMinimumPermissions,
                        onRequestPermissions = onRequestPermissions
                    )
                }

                // Token Section
                ExpandableSection(
                    title = stringResource(R.string.diagnostics_token),
                    icon = Icons.Default.Key,
                    isExpanded = uiState.expandedSections.contains("token"),
                    onToggle = { viewModel.toggleSection("token") }
                ) {
                    TokenSection(
                        diagnostics = uiState.tokenDiagnostics,
                        expiresAt = uiState.tokenExpiresAt,
                        hasRefreshToken = uiState.hasRefreshToken,
                        onRelink = onRelink
                    )
                }

                // Known Issues Section (if any)
                if (uiState.knownIssues.isNotEmpty()) {
                    ExpandableSection(
                        title = stringResource(R.string.diagnostics_known_issues),
                        icon = Icons.Default.Warning,
                        isExpanded = uiState.expandedSections.contains("issues"),
                        onToggle = { viewModel.toggleSection("issues") }
                    ) {
                        KnownIssuesSection(
                            issues = uiState.knownIssues,
                            onOpenUrl = { viewModel.openUrl(it) }
                        )
                    }
                }

                // Troubleshooting Section
                ExpandableSection(
                    title = stringResource(R.string.diagnostics_troubleshooting),
                    icon = Icons.Default.Build,
                    isExpanded = uiState.expandedSections.contains("troubleshooting"),
                    onToggle = { viewModel.toggleSection("troubleshooting") }
                ) {
                    TroubleshootingSection(
                        steps = uiState.troubleshootingSteps,
                        onAction = { action ->
                            when (action) {
                                TroubleshootingAction.OPEN_HEALTH_CONNECT_SETTINGS ->
                                    viewModel.openHealthConnectSettings()
                                TroubleshootingAction.OPEN_APP_INFO ->
                                    viewModel.openAppInfo()
                                TroubleshootingAction.REQUEST_PERMISSIONS ->
                                    onRequestPermissions()
                                TroubleshootingAction.RELINK_DEVICE ->
                                    onRelink()
                                TroubleshootingAction.CONTACT_SUPPORT ->
                                    viewModel.copyDiagnosticReport()
                            }
                        }
                    )
                }

                // Copy Diagnostics Button
                OutlinedButton(
                    onClick = {
                        view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                        viewModel.copyDiagnosticReport()
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        imageVector = Icons.Default.ContentCopy,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.diagnostics_copy_report))
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@Composable
private fun OverallStatusCard(
    status: StatusSeverity,
    message: String
) {
    val (icon, color, backgroundColor) = when (status) {
        StatusSeverity.OK -> Triple(
            Icons.Default.CheckCircle,
            MaterialTheme.colorScheme.primary,
            MaterialTheme.colorScheme.primaryContainer
        )
        StatusSeverity.WARNING -> Triple(
            Icons.Default.Warning,
            MaterialTheme.colorScheme.tertiary,
            MaterialTheme.colorScheme.tertiaryContainer
        )
        StatusSeverity.ERROR -> Triple(
            Icons.Default.Error,
            MaterialTheme.colorScheme.error,
            MaterialTheme.colorScheme.errorContainer
        )
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = backgroundColor)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(48.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = when (status) {
                        StatusSeverity.OK -> stringResource(R.string.diagnostics_status_ok)
                        StatusSeverity.WARNING -> stringResource(R.string.diagnostics_status_warning)
                        StatusSeverity.ERROR -> stringResource(R.string.diagnostics_status_error)
                    },
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = color.copy(alpha = 0.8f)
                )
            }
        }
    }
}

@Composable
private fun ExpandableSection(
    title: String,
    icon: ImageVector,
    isExpanded: Boolean,
    onToggle: () -> Unit,
    content: @Composable () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onToggle() }
                    .padding(16.dp)
                    .semantics { heading() },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f)
                )
                Icon(
                    imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (isExpanded) "Collapse" else "Expand"
                )
            }

            // Content
            AnimatedVisibility(
                visible = isExpanded,
                enter = expandVertically(),
                exit = shrinkVertically()
            ) {
                Column(
                    modifier = Modifier.padding(
                        start = 16.dp,
                        end = 16.dp,
                        bottom = 16.dp
                    )
                ) {
                    HorizontalDivider(modifier = Modifier.padding(bottom = 12.dp))
                    content()
                }
            }
        }
    }
}

@Composable
private fun HealthConnectSection(
    isAvailable: Boolean,
    version: String?,
    needsUpdate: Boolean,
    hasBackgroundRead: Boolean,
    hasHistoryRead: Boolean,
    onOpenSettings: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        DiagnosticRow(
            label = stringResource(R.string.diagnostics_hc_status),
            value = when {
                !isAvailable && !needsUpdate -> stringResource(R.string.diagnostics_hc_not_installed)
                needsUpdate -> stringResource(R.string.diagnostics_hc_update_required)
                else -> stringResource(R.string.diagnostics_hc_available)
            },
            status = when {
                !isAvailable -> StatusSeverity.ERROR
                needsUpdate -> StatusSeverity.WARNING
                else -> StatusSeverity.OK
            }
        )

        if (version != null) {
            DiagnosticRow(
                label = stringResource(R.string.diagnostics_hc_version),
                value = version,
                status = StatusSeverity.OK
            )
        }

        DiagnosticRow(
            label = stringResource(R.string.diagnostics_feature_background),
            value = if (hasBackgroundRead)
                stringResource(R.string.diagnostics_available)
            else stringResource(R.string.diagnostics_not_available),
            status = if (hasBackgroundRead) StatusSeverity.OK else StatusSeverity.WARNING
        )

        DiagnosticRow(
            label = stringResource(R.string.diagnostics_feature_history),
            value = if (hasHistoryRead)
                stringResource(R.string.diagnostics_available)
            else stringResource(R.string.diagnostics_not_available),
            status = if (hasHistoryRead) StatusSeverity.OK else StatusSeverity.WARNING
        )

        if (!isAvailable || needsUpdate) {
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onOpenSettings,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = if (needsUpdate)
                        stringResource(R.string.diagnostics_update_hc)
                    else stringResource(R.string.diagnostics_install_hc)
                )
            }
        }
    }
}

@Composable
private fun PermissionsSection(
    permissions: List<DiagnosticItem>,
    hasMinimum: Boolean,
    onRequestPermissions: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        permissions.forEach { item ->
            DiagnosticRow(
                label = item.name,
                value = item.value,
                status = item.status,
                detail = item.detail
            )
        }

        if (!hasMinimum) {
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onRequestPermissions,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.sync_grant_permissions))
            }
        }
    }
}

@Composable
private fun TokenSection(
    diagnostics: TokenStorage.TokenDiagnostics?,
    expiresAt: Instant?,
    hasRefreshToken: Boolean,
    onRelink: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        DiagnosticRow(
            label = stringResource(R.string.diagnostics_token_state),
            value = diagnostics?.name ?: "Unknown",
            status = when (diagnostics) {
                TokenStorage.TokenDiagnostics.VALID -> StatusSeverity.OK
                TokenStorage.TokenDiagnostics.EXPIRING_SOON,
                TokenStorage.TokenDiagnostics.EXPIRED_CAN_REFRESH -> StatusSeverity.WARNING
                else -> StatusSeverity.ERROR
            }
        )

        if (diagnostics != null) {
            Text(
                text = diagnostics.message,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (expiresAt != null) {
            DiagnosticRow(
                label = stringResource(R.string.diagnostics_token_expires),
                value = expiresAt.formatDateTime(),
                status = when {
                    expiresAt.isBefore(Instant.now()) -> StatusSeverity.ERROR
                    expiresAt.isBefore(Instant.now().plusSeconds(600)) -> StatusSeverity.WARNING
                    else -> StatusSeverity.OK
                }
            )
        }

        DiagnosticRow(
            label = stringResource(R.string.diagnostics_refresh_token),
            value = if (hasRefreshToken)
                stringResource(R.string.diagnostics_available)
            else stringResource(R.string.diagnostics_not_available),
            status = if (hasRefreshToken) StatusSeverity.OK else StatusSeverity.WARNING
        )

        if (diagnostics?.needsRelink == true) {
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onRelink,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text(stringResource(R.string.diagnostics_relink))
            }
        }
    }
}

@Composable
private fun KnownIssuesSection(
    issues: List<KnownIssue>,
    onOpenUrl: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        issues.forEach { issue ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = issue.title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = issue.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (issue.learnMoreUrl != null) {
                        TextButton(
                            onClick = { onOpenUrl(issue.learnMoreUrl) },
                            modifier = Modifier.align(Alignment.End)
                        ) {
                            Text(stringResource(R.string.samsung_disclaimer_learn_more))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TroubleshootingSection(
    steps: List<TroubleshootingStep>,
    onAction: (TroubleshootingAction) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        steps.forEachIndexed { index, step ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                // Step number
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = MaterialTheme.colorScheme.primaryContainer,
                    modifier = Modifier.size(28.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "${index + 1}",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = step.title,
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text(
                        text = step.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    if (step.actionLabel != null && step.actionType != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedButton(
                            onClick = { onAction(step.actionType) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(step.actionLabel)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DiagnosticRow(
    label: String,
    value: String,
    status: StatusSeverity,
    detail: String? = null
) {
    val statusColor = when (status) {
        StatusSeverity.OK -> MaterialTheme.colorScheme.primary
        StatusSeverity.WARNING -> MaterialTheme.colorScheme.tertiary
        StatusSeverity.ERROR -> MaterialTheme.colorScheme.error
    }

    val statusIcon = when (status) {
        StatusSeverity.OK -> Icons.Default.CheckCircle
        StatusSeverity.WARNING -> Icons.Default.Warning
        StatusSeverity.ERROR -> Icons.Default.Error
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = statusIcon,
            contentDescription = null,
            tint = statusColor,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium
            )
            if (detail != null) {
                Text(
                    text = detail,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontFamily = FontFamily.Monospace,
            color = statusColor
        )
    }
}

private fun Instant.formatDateTime(): String {
    val formatter = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.SHORT, FormatStyle.SHORT)
        .withZone(ZoneId.systemDefault())
    return formatter.format(this)
}
