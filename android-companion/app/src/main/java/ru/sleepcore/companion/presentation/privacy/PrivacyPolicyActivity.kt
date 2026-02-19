/**
 * Privacy Policy Activity
 * =======================
 * Displays the privacy policy for Health Connect data usage.
 * Required by Google Play and Health Connect guidelines.
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
            Text(
                text = stringResource(R.string.privacy_policy_content),
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Health Connect Data Usage",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(8.dp))

            PrivacySection(
                title = "Data We Read",
                items = listOf(
                    "Sleep Sessions - duration, start/end times, sleep stages",
                    "Heart Rate Variability (HRV) - RMSSD measurements during sleep",
                    "Heart Rate - average heart rate during sleep periods",
                    "Resting Heart Rate - daily resting heart rate",
                    // GDPR Article 13: Enhanced metrics disclosure (Feb 2026)
                    "Blood Oxygen (SpO2) - oxygen saturation levels during sleep",
                    "Respiratory Rate - breathing patterns and disturbances",
                    "Skin Temperature - circadian rhythm temperature variations"
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            PrivacySection(
                title = "How We Use Your Data",
                items = listOf(
                    "Generate personalized sleep therapy recommendations",
                    "Track your sleep improvement progress over time",
                    "Calculate sleep efficiency and other sleep metrics",
                    "Identify patterns that affect your sleep quality",
                    // Enhanced metrics usage (Feb 2026)
                    "Screen for potential sleep breathing disorders (SpO2, respiratory patterns)",
                    "Monitor circadian rhythm indicators (skin temperature)"
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            PrivacySection(
                title = "Data Protection",
                items = listOf(
                    "All data is encrypted in transit using TLS 1.3",
                    "Data is stored securely on HIPAA-compliant servers",
                    "We never share your data with third parties",
                    "You can delete all your data at any time by unlinking"
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            PrivacySection(
                title = "Your Rights",
                items = listOf(
                    "Access: View all data we have collected about you",
                    "Deletion: Request complete erasure of your data",
                    "Portability: Export your data in standard formats",
                    "Revocation: Revoke permissions at any time in Settings"
                )
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Contact: privacy@sleepcore.ru",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Last updated: February 2026",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun PrivacySection(
    title: String,
    items: List<String>
) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.SemiBold
    )

    Spacer(modifier = Modifier.height(4.dp))

    items.forEach { item ->
        Row(
            modifier = Modifier.padding(start = 8.dp, top = 4.dp)
        ) {
            Text(
                text = "• ",
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = item,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
