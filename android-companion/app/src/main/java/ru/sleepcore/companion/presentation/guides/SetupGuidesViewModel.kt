/**
 * Setup Guides ViewModel
 * =======================
 * Provides manufacturer-specific Health Connect setup instructions.
 *
 * Research basis (February 2026):
 * - Samsung Health v6.27.1+ required for Health Connect sync
 * - Garmin Connect v5.14.1+ (July 2025) enables HC integration
 * - Xiaomi ecosystem fragmented: Zepp (Amazfit) best support
 * - Fitbit: Google account migration deadline May 19, 2026
 *
 * Sources:
 * - Samsung Health release notes (developer.samsung.com)
 * - Garmin Connect changelog (support.garmin.com)
 * - Health Connect SDK 1.1.0 documentation (developer.android.com)
 *
 * Confidence: HIGH for Samsung/Garmin, MEDIUM for Xiaomi
 */

package ru.sleepcore.companion.presentation.guides

import android.content.Context
import android.os.Build
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SetupGuidesViewModel @Inject constructor(
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(SetupGuidesUiState())
    val uiState: StateFlow<SetupGuidesUiState> = _uiState.asStateFlow()

    init {
        loadGuides()
    }

    private fun loadGuides() {
        viewModelScope.launch {
            val detectedManufacturer = detectManufacturer()
            val guides = buildAllGuides()

            _uiState.update {
                it.copy(
                    isLoading = false,
                    detectedManufacturer = detectedManufacturer,
                    guides = guides,
                    expandedManufacturer = detectedManufacturer,
                    showManualEntryPrompt = detectedManufacturer == Manufacturer.OTHER
                )
            }
        }
    }

    /**
     * Detect device manufacturer from Build.MANUFACTURER.
     */
    private fun detectManufacturer(): Manufacturer {
        val manufacturer = Build.MANUFACTURER.lowercase()
        return when {
            manufacturer.contains("samsung") -> Manufacturer.SAMSUNG
            manufacturer.contains("xiaomi") || manufacturer.contains("redmi") -> Manufacturer.XIAOMI
            manufacturer.contains("huami") || manufacturer.contains("amazfit") -> Manufacturer.XIAOMI
            manufacturer.contains("google") -> Manufacturer.GOOGLE
            // Note: Garmin/Fitbit are wearables, not phones, so detection is limited
            else -> Manufacturer.OTHER
        }
    }

    fun expandManufacturer(manufacturer: Manufacturer) {
        _uiState.update {
            it.copy(
                expandedManufacturer = if (it.expandedManufacturer == manufacturer) null else manufacturer
            )
        }
    }

    fun dismissManualEntryPrompt() {
        _uiState.update { it.copy(showManualEntryPrompt = false) }
    }

    private fun buildAllGuides(): List<ManufacturerGuide> = listOf(
        buildSamsungGuide(),
        buildGarminGuide(),
        buildXiaomiGuide(),
        buildFitbitGuide(),
        buildGoogleGuide(),
        buildOtherGuide()
    )

    /**
     * Samsung Galaxy Watch Guide
     * Research: Samsung Health v6.27.1+ required, battery optimization critical
     * Confidence: HIGH
     */
    private fun buildSamsungGuide() = ManufacturerGuide(
        manufacturer = Manufacturer.SAMSUNG,
        minAppVersion = "Samsung Health 6.27.1+",
        setupSteps = listOf(
            SetupStep(
                stepNumber = 1,
                title = "Update Samsung Health",
                description = "Open Galaxy Store and update Samsung Health to version 6.27.1 or later.",
                actionLabel = "Open Galaxy Store",
                actionIntent = "com.sec.android.app.samsungapps"
            ),
            SetupStep(
                stepNumber = 2,
                title = "Open Samsung Health Settings",
                description = "Launch Samsung Health app and tap the menu icon (☰), then select Settings."
            ),
            SetupStep(
                stepNumber = 3,
                title = "Find Health Connect",
                description = "Scroll down to 'Health Connect' section in Settings."
            ),
            SetupStep(
                stepNumber = 4,
                title = "Enable Data Sharing",
                description = "Tap 'Connected services' and enable Health Connect integration."
            ),
            SetupStep(
                stepNumber = 5,
                title = "Grant Permissions",
                description = "Allow Samsung Health to write sleep, heart rate, and HRV data to Health Connect."
            ),
            SetupStep(
                stepNumber = 6,
                title = "Disable Battery Optimization",
                description = "Go to Android Settings → Apps → Samsung Health → Battery → Unrestricted. This is critical for background sync.",
                warningText = "Without this step, sleep data may not sync automatically."
            ),
            SetupStep(
                stepNumber = 7,
                title = "Wear Watch Tonight",
                description = "Wear your Galaxy Watch while sleeping. Data will sync in the morning."
            ),
            SetupStep(
                stepNumber = 8,
                title = "Verify in SleepCore",
                description = "Return to SleepCore and tap 'Sync Now' to verify data is flowing.",
                isOptional = true
            )
        ),
        limitations = listOf(
            KnownLimitation(
                title = "One-Way Sync Only",
                description = "Data flows from Samsung Health → Health Connect. SleepCore cannot write back to Samsung Health.",
                severity = LimitationSeverity.INFO
            ),
            KnownLimitation(
                title = "Galaxy Watch 7/Ultra Sleep Stage Issues",
                description = "Some One UI 8 devices may report inaccurate sleep stages. This is a known Samsung firmware issue.",
                workaround = "Use subjective sleep diary as primary data source if you notice significant discrepancies.",
                severity = LimitationSeverity.WARNING
            ),
            KnownLimitation(
                title = "Sync Delay",
                description = "Sleep data typically syncs 15-30 minutes after waking and opening Samsung Health.",
                severity = LimitationSeverity.INFO
            )
        ),
        syncDelayMinutes = 15,
        supportsBackgroundSync = true,
        supportsSleepStages = true,
        supportsHrv = true,
        learnMoreUrl = "https://www.samsung.com/health-connect"
    )

    /**
     * Garmin Guide
     * Research: Connect v5.14.1+ (July 2025), one-way sync, ~10min delay
     * Confidence: HIGH
     */
    private fun buildGarminGuide() = ManufacturerGuide(
        manufacturer = Manufacturer.GARMIN,
        minAppVersion = "Garmin Connect 5.14.1+",
        setupSteps = listOf(
            SetupStep(
                stepNumber = 1,
                title = "Update Garmin Connect",
                description = "Open Google Play Store and update Garmin Connect to version 5.14.1 or later."
            ),
            SetupStep(
                stepNumber = 2,
                title = "Open Garmin Connect Settings",
                description = "Launch Garmin Connect, tap the menu (☰), then Settings."
            ),
            SetupStep(
                stepNumber = 3,
                title = "Find Health Connect",
                description = "Scroll to 'Health Connect' under Connected Apps section."
            ),
            SetupStep(
                stepNumber = 4,
                title = "Enable Integration",
                description = "Toggle on Health Connect and grant all requested permissions for sleep and heart rate data."
            ),
            SetupStep(
                stepNumber = 5,
                title = "Disable Battery Optimization",
                description = "Go to Android Settings → Apps → Garmin Connect → Battery → Unrestricted.",
                warningText = "Required for automatic background sync."
            ),
            SetupStep(
                stepNumber = 6,
                title = "Sync Your Watch",
                description = "Open Garmin Connect and sync your watch. Sleep data will flow to Health Connect within ~10 minutes."
            )
        ),
        limitations = listOf(
            KnownLimitation(
                title = "HRV Status Not Shared",
                description = "Garmin's proprietary HRV Status metric is not sent to Health Connect. Only raw HRV samples are shared.",
                severity = LimitationSeverity.WARNING
            ),
            KnownLimitation(
                title = "Body Battery Not Available",
                description = "Garmin's Body Battery is proprietary and cannot be shared via Health Connect.",
                severity = LimitationSeverity.INFO
            ),
            KnownLimitation(
                title = "~10 Minute Sync Delay",
                description = "After syncing your watch to Garmin Connect, data reaches Health Connect in approximately 10 minutes.",
                severity = LimitationSeverity.INFO
            )
        ),
        syncDelayMinutes = 10,
        supportsBackgroundSync = true,
        supportsSleepStages = true,
        supportsHrv = true,
        alternativeApps = listOf("Gadgetbridge (open-source, supports 70+ models)"),
        learnMoreUrl = "https://support.garmin.com/health-connect"
    )

    /**
     * Xiaomi / Amazfit Guide
     * Research: Fragmented ecosystem, Zepp best support, Mi Fitness uncertain
     * Confidence: MEDIUM
     */
    private fun buildXiaomiGuide() = ManufacturerGuide(
        manufacturer = Manufacturer.XIAOMI,
        minAppVersion = "Zepp 8.0+ or Mi Fitness 3.0+",
        setupSteps = listOf(
            SetupStep(
                stepNumber = 1,
                title = "Identify Your App",
                description = "Amazfit watches use Zepp app. Mi Band/Xiaomi Watch use Mi Fitness or Xiaomi Wear."
            ),
            SetupStep(
                stepNumber = 2,
                title = "Update Your App",
                description = "Open Google Play Store and update Zepp or Mi Fitness to the latest version."
            ),
            SetupStep(
                stepNumber = 3,
                title = "Find Health Connect",
                description = "Open app settings and look for 'Health Connect' or 'Connected Services'."
            ),
            SetupStep(
                stepNumber = 4,
                title = "Enable Integration",
                description = "If available, toggle on Health Connect and grant sleep data permissions.",
                warningText = "Mi Fitness Health Connect support may be limited or unavailable in some regions."
            ),
            SetupStep(
                stepNumber = 5,
                title = "Consider Alternatives",
                description = "If official app doesn't support Health Connect, consider Notify for Mi Band or Gadgetbridge.",
                isOptional = true
            )
        ),
        limitations = listOf(
            KnownLimitation(
                title = "Fragmented Ecosystem",
                description = "Xiaomi uses different apps for different devices. Health Connect support varies significantly.",
                severity = LimitationSeverity.WARNING
            ),
            KnownLimitation(
                title = "Mi Fitness HC Support Uncertain",
                description = "As of February 2026, Mi Fitness Health Connect integration is incomplete in some regions.",
                workaround = "Use Notify for Mi Band ($4.99) or Gadgetbridge (free, open-source) as alternatives.",
                severity = LimitationSeverity.WARNING
            ),
            KnownLimitation(
                title = "Zepp Has Best Support",
                description = "Zepp (Amazfit) supports 26 Health Connect data types including sleep and HRV.",
                severity = LimitationSeverity.INFO
            )
        ),
        syncDelayMinutes = 15,
        supportsBackgroundSync = true,
        supportsSleepStages = true,
        supportsHrv = true,
        alternativeApps = listOf(
            "Notify for Mi Band (recommended for Mi Band)",
            "Gadgetbridge (open-source, free)"
        ),
        learnMoreUrl = null
    )

    /**
     * Fitbit Guide
     * Research: Google-owned, write-only to HC, account migration May 2026
     * Confidence: HIGH
     */
    private fun buildFitbitGuide() = ManufacturerGuide(
        manufacturer = Manufacturer.FITBIT,
        minAppVersion = "Fitbit 4.0+",
        setupSteps = listOf(
            SetupStep(
                stepNumber = 1,
                title = "Update Fitbit App",
                description = "Open Google Play Store and update Fitbit app to the latest version."
            ),
            SetupStep(
                stepNumber = 2,
                title = "Link Google Account",
                description = "If prompted, link your Fitbit account with Google. This is required for Health Connect integration.",
                warningText = "Google account migration deadline: May 19, 2026. Link your account before this date."
            ),
            SetupStep(
                stepNumber = 3,
                title = "Open Fitbit Settings",
                description = "Launch Fitbit app, tap your profile picture, then Settings."
            ),
            SetupStep(
                stepNumber = 4,
                title = "Find Health Connect",
                description = "Tap 'Privacy & Security' then 'Manage Health Connect'."
            ),
            SetupStep(
                stepNumber = 5,
                title = "Grant Permissions",
                description = "Enable write permissions for sleep, heart rate, and other data types."
            ),
            SetupStep(
                stepNumber = 6,
                title = "Sync Your Tracker",
                description = "Open Fitbit app to sync. Data flows to Health Connect within 15-30 minutes."
            )
        ),
        limitations = listOf(
            KnownLimitation(
                title = "Google Account Required",
                description = "Fitbit accounts must be linked to Google for Health Connect. Deadline: May 19, 2026.",
                severity = LimitationSeverity.WARNING
            ),
            KnownLimitation(
                title = "Sleep Stage Accuracy ~50-60%",
                description = "Independent research shows Fitbit sleep stage accuracy around 50-60% compared to polysomnography.",
                workaround = "Use subjective diary for detailed sleep quality assessment.",
                severity = LimitationSeverity.INFO
            ),
            KnownLimitation(
                title = "Premium Features Not Shared",
                description = "Fitbit Premium features like Sleep Profile and detailed HRV trends are not shared via Health Connect.",
                severity = LimitationSeverity.INFO
            )
        ),
        syncDelayMinutes = 20,
        supportsBackgroundSync = true,
        supportsSleepStages = true,
        supportsHrv = true,
        learnMoreUrl = "https://support.google.com/fitbit/health-connect"
    )

    /**
     * Google Pixel Watch Guide
     * Research: Native Health Connect support
     * Confidence: HIGH
     */
    private fun buildGoogleGuide() = ManufacturerGuide(
        manufacturer = Manufacturer.GOOGLE,
        minAppVersion = "Fitbit 4.0+ (manages Pixel Watch)",
        setupSteps = listOf(
            SetupStep(
                stepNumber = 1,
                title = "Health Connect Pre-Installed",
                description = "Google Pixel Watch uses Fitbit app which has native Health Connect support."
            ),
            SetupStep(
                stepNumber = 2,
                title = "Open Fitbit App",
                description = "Launch Fitbit app and ensure your Pixel Watch is synced."
            ),
            SetupStep(
                stepNumber = 3,
                title = "Check Health Connect",
                description = "Go to Settings → Privacy & Security → Manage Health Connect."
            ),
            SetupStep(
                stepNumber = 4,
                title = "Grant Permissions",
                description = "Enable all sleep and heart rate permissions for Health Connect."
            )
        ),
        limitations = listOf(
            KnownLimitation(
                title = "Uses Fitbit Infrastructure",
                description = "Pixel Watch data flows through Fitbit servers. Same limitations as Fitbit apply.",
                severity = LimitationSeverity.INFO
            )
        ),
        syncDelayMinutes = 15,
        supportsBackgroundSync = true,
        supportsSleepStages = true,
        supportsHrv = true,
        learnMoreUrl = "https://support.google.com/pixelwatch"
    )

    /**
     * Other Devices Guide
     * For unsupported manufacturers, recommend manual entry
     */
    private fun buildOtherGuide() = ManufacturerGuide(
        manufacturer = Manufacturer.OTHER,
        minAppVersion = null,
        setupSteps = listOf(
            SetupStep(
                stepNumber = 1,
                title = "Check Your App",
                description = "Open your wearable's companion app and look for Health Connect in settings."
            ),
            SetupStep(
                stepNumber = 2,
                title = "Try Gadgetbridge",
                description = "Gadgetbridge is a free, open-source app that supports 70+ wearable models with Health Connect export.",
                isOptional = true
            ),
            SetupStep(
                stepNumber = 3,
                title = "Use Manual Entry",
                description = "If your device doesn't support Health Connect, use SleepCore's manual sleep diary for best results."
            )
        ),
        limitations = listOf(
            KnownLimitation(
                title = "Limited Automatic Sync",
                description = "Without Health Connect support, you'll need to enter sleep data manually.",
                workaround = "Manual sleep diary is clinically validated and may be more accurate for CBT-I therapy.",
                severity = LimitationSeverity.INFO
            )
        ),
        syncDelayMinutes = null,
        supportsBackgroundSync = false,
        supportsSleepStages = false,
        supportsHrv = false,
        alternativeApps = listOf("Gadgetbridge (free, open-source, 70+ devices)")
    )
}
