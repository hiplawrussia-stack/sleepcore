/**
 * Setup Guides UI State
 * ======================
 * Data classes for manufacturer-specific Health Connect setup guides.
 *
 * Research basis (February 2026):
 * - Samsung: Galaxy Watch requires Samsung Health v6.27.1+, battery optimization exemption
 * - Garmin: Connect v5.14.1+, one-way sync with ~10min delay
 * - Xiaomi: Fragmented ecosystem - Zepp (Amazfit), Mi Fitness, Gadgetbridge
 * - Fitbit: Google-owned, write-only to HC, Google account migration by May 2026
 *
 * Confidence: HIGH (official documentation verified)
 */

package ru.sleepcore.companion.presentation.guides

/**
 * Supported wearable manufacturers with Health Connect integration.
 */
enum class Manufacturer(
    val displayName: String,
    val iconRes: Int? = null
) {
    SAMSUNG("Samsung Galaxy Watch"),
    GARMIN("Garmin"),
    XIAOMI("Xiaomi / Amazfit"),
    FITBIT("Fitbit"),
    GOOGLE("Google Pixel Watch"),
    OTHER("Other Devices")
}

/**
 * Single setup step with instruction and optional action.
 */
data class SetupStep(
    val stepNumber: Int,
    val title: String,
    val description: String,
    val actionLabel: String? = null,
    val actionIntent: String? = null,
    val isOptional: Boolean = false,
    val warningText: String? = null
)

/**
 * Known limitation or issue for a manufacturer.
 */
data class KnownLimitation(
    val title: String,
    val description: String,
    val workaround: String? = null,
    val severity: LimitationSeverity = LimitationSeverity.INFO
)

enum class LimitationSeverity {
    INFO,       // FYI only
    WARNING,    // May affect experience
    CRITICAL    // Significant impact on functionality
}

/**
 * Complete manufacturer guide with all setup information.
 */
data class ManufacturerGuide(
    val manufacturer: Manufacturer,
    val minAppVersion: String?,
    val setupSteps: List<SetupStep>,
    val limitations: List<KnownLimitation>,
    val syncDelayMinutes: Int?,
    val supportsBackgroundSync: Boolean,
    val supportsSleepStages: Boolean,
    val supportsHrv: Boolean,
    val alternativeApps: List<String> = emptyList(),
    val learnMoreUrl: String? = null
)

/**
 * UI state for the setup guides screen.
 */
data class SetupGuidesUiState(
    val isLoading: Boolean = true,
    val detectedManufacturer: Manufacturer? = null,
    val guides: List<ManufacturerGuide> = emptyList(),
    val expandedManufacturer: Manufacturer? = null,
    val showManualEntryPrompt: Boolean = false
)
