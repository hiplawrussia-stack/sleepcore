/**
 * Privacy Policy Activity
 * =======================
 * Displays the privacy policy for Health Connect data usage.
 * Required by Google Play and Health Connect guidelines.
 *
 * Research (February 2026):
 * - Must match Play Console privacy policy exactly
 * - GDPR Article 13/14 compliance required
 * - Android 13: ACTION_SHOW_PERMISSIONS_RATIONALE
 * - Android 14+: VIEW_PERMISSION_USAGE + HEALTH_PERMISSIONS
 *
 * Sources:
 * - developer.android.com/health-and-fitness/health-connect/get-started
 * - gdpr-info.eu/art-13-gdpr/
 * - support.google.com/googleplay/android-developer/answer/12991134
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.presentation.privacy

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dagger.hilt.android.AndroidEntryPoint
import ru.sleepcore.companion.R
import ru.sleepcore.companion.presentation.theme.SleepCoreCompanionTheme

@AndroidEntryPoint
class PrivacyPolicyActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SleepCoreCompanionTheme {
                PrivacyPolicyScreen(
                    onBackClick = { finish() }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrivacyPolicyScreen(
    onBackClick: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.privacy_policy_title)) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.content_description_back)
                        )
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Introduction
            Text(
                text = stringResource(R.string.privacy_policy_intro),
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Data Controller (GDPR Article 13.1.a)
            PrivacySectionTitle(stringResource(R.string.privacy_section_controller))
            Text(
                text = stringResource(R.string.privacy_controller_content),
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Health Connect Data We Read
            PrivacySectionTitle(stringResource(R.string.privacy_section_data_collected))
            PrivacyBulletList(
                items = listOf(
                    stringResource(R.string.privacy_data_sleep),
                    stringResource(R.string.privacy_data_hrv),
                    stringResource(R.string.privacy_data_heart_rate),
                    stringResource(R.string.privacy_data_resting_hr),
                    stringResource(R.string.privacy_data_spo2),
                    stringResource(R.string.privacy_data_respiratory),
                    stringResource(R.string.privacy_data_temperature)
                )
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Purpose of Processing (GDPR Article 13.1.c)
            PrivacySectionTitle(stringResource(R.string.privacy_section_purpose))
            PrivacyBulletList(
                items = listOf(
                    stringResource(R.string.privacy_purpose_therapy),
                    stringResource(R.string.privacy_purpose_progress),
                    stringResource(R.string.privacy_purpose_metrics),
                    stringResource(R.string.privacy_purpose_patterns),
                    stringResource(R.string.privacy_purpose_screening),
                    stringResource(R.string.privacy_purpose_circadian)
                )
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Legal Basis (GDPR Article 13.1.c)
            PrivacySectionTitle(stringResource(R.string.privacy_section_legal_basis))
            Text(
                text = stringResource(R.string.privacy_legal_basis_content),
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Data Retention (GDPR Article 13.2.a)
            PrivacySectionTitle(stringResource(R.string.privacy_section_retention))
            Text(
                text = stringResource(R.string.privacy_retention_content),
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Data Protection & Security
            PrivacySectionTitle(stringResource(R.string.privacy_section_security))
            PrivacyBulletList(
                items = listOf(
                    stringResource(R.string.privacy_security_tls),
                    stringResource(R.string.privacy_security_encryption),
                    stringResource(R.string.privacy_security_hipaa),
                    stringResource(R.string.privacy_security_no_sharing)
                )
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Data Transfers (GDPR Article 13.1.f)
            PrivacySectionTitle(stringResource(R.string.privacy_section_transfers))
            Text(
                text = stringResource(R.string.privacy_transfers_content),
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Your Rights (GDPR Article 13.2.b-d)
            PrivacySectionTitle(stringResource(R.string.privacy_section_rights))
            PrivacyBulletList(
                items = listOf(
                    stringResource(R.string.privacy_right_access),
                    stringResource(R.string.privacy_right_rectification),
                    stringResource(R.string.privacy_right_erasure),
                    stringResource(R.string.privacy_right_portability),
                    stringResource(R.string.privacy_right_withdraw),
                    stringResource(R.string.privacy_right_complaint)
                )
            )

            Spacer(modifier = Modifier.height(20.dp))

            // How to Exercise Rights
            PrivacySectionTitle(stringResource(R.string.privacy_section_exercise_rights))
            Text(
                text = stringResource(R.string.privacy_exercise_rights_content),
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Contact & Last Updated
            HorizontalDivider()

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = stringResource(R.string.privacy_contact),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = stringResource(R.string.privacy_last_updated),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = stringResource(R.string.privacy_version),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun PrivacySectionTitle(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.primary
    )
    Spacer(modifier = Modifier.height(8.dp))
}

@Composable
private fun PrivacyBulletList(items: List<String>) {
    items.forEach { item ->
        Row(
            modifier = Modifier.padding(start = 8.dp, top = 4.dp, bottom = 4.dp)
        ) {
            Text(
                text = "\u2022 ",
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = item,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
