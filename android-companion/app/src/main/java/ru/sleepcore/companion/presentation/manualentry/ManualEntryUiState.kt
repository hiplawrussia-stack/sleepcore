/**
 * Manual Sleep Entry UI State
 * ============================
 * Data classes for Consensus Sleep Diary (CSD) manual entry.
 *
 * Clinical basis:
 * - Consensus Sleep Diary (Carney et al., 2012)
 * - 9 core fields validated across multiple studies
 * - 5-point Likert scale for subjective quality
 *
 * Research (February 2026):
 * - Progressive disclosure UX pattern
 * - WCAG 2.1 AA: 44x44dp touch targets
 * - Offline-first with Last Write Wins conflict resolution
 *
 * Confidence: HIGH (CSD is clinical standard)
 */

package ru.sleepcore.companion.presentation.manualentry

import java.time.LocalDate
import java.time.LocalTime

/**
 * Sleep quality rating on 5-point Likert scale.
 * Validated for clinical use in sleep research.
 */
enum class SleepQuality(val value: Int, val labelResId: Int) {
    VERY_POOR(1, 0),     // "Very Poor"
    POOR(2, 0),          // "Poor"
    FAIR(3, 0),          // "Fair"
    GOOD(4, 0),          // "Good"
    VERY_GOOD(5, 0)      // "Very Good"
}

/**
 * Consensus Sleep Diary entry fields.
 * Based on Carney et al. (2012) standardized format.
 */
data class SleepDiaryEntry(
    // Core timing fields
    val date: LocalDate,
    val bedTime: LocalTime?,              // "What time did you get into bed?"
    val tryToSleepTime: LocalTime?,       // "What time did you try to go to sleep?"
    val sleepOnsetLatency: Int?,          // Minutes: "How long did it take to fall asleep?"
    val numberOfAwakenings: Int?,         // "How many times did you wake up?"
    val wakeAfterSleepOnset: Int?,        // Minutes: "Total time awake during night"
    val finalWakeTime: LocalTime?,        // "What time was your final awakening?"
    val outOfBedTime: LocalTime?,         // "What time did you get out of bed?"

    // Subjective quality
    val sleepQuality: SleepQuality?,      // 5-point Likert scale

    // Optional comments
    val comments: String? = null,

    // Metadata
    val isPending: Boolean = true,        // Not yet synced
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * Validation result for diary entry.
 */
data class ValidationResult(
    val isValid: Boolean,
    val errors: List<ValidationError> = emptyList(),
    val warnings: List<ValidationWarning> = emptyList()
)

data class ValidationError(
    val field: String,
    val messageResId: Int
)

data class ValidationWarning(
    val field: String,
    val messageResId: Int
)

/**
 * UI state for manual entry screen.
 */
data class ManualEntryUiState(
    val entry: SleepDiaryEntry = SleepDiaryEntry(date = LocalDate.now()),
    val currentStep: EntryStep = EntryStep.TIMING,
    val validation: ValidationResult = ValidationResult(isValid = false),
    val isSaving: Boolean = false,
    val saveError: String? = null,
    val showSuccessMessage: Boolean = false,

    // Progressive disclosure
    val showAdvancedFields: Boolean = false,

    // Time picker states
    val activeTimePicker: TimePickerField? = null
)

/**
 * Steps for progressive disclosure.
 */
enum class EntryStep {
    TIMING,      // Bed time, try to sleep time, wake time, out of bed time
    QUALITY,     // SOL, NWAK, WASO, quality rating
    REVIEW       // Summary and submit
}

/**
 * Time picker field identifiers.
 */
enum class TimePickerField {
    BED_TIME,
    TRY_TO_SLEEP_TIME,
    FINAL_WAKE_TIME,
    OUT_OF_BED_TIME
}
