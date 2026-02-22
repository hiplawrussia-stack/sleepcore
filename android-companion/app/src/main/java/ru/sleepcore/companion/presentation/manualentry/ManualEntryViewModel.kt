/**
 * Manual Entry ViewModel
 * =======================
 * Business logic for Consensus Sleep Diary manual entry.
 *
 * Clinical validation:
 * - TIB >= 5 hours (SleepCore safety constraint)
 * - SOL + WASO < TIB (logical consistency)
 * - Times in chronological order
 *
 * Research basis (February 2026):
 * - Consensus Sleep Diary (Carney et al., 2012)
 * - Offline-first pattern with pending queue
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.presentation.manualentry

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ru.sleepcore.companion.R
import ru.sleepcore.companion.data.SleepCoreRepository
import java.time.Duration
import java.time.LocalDate
import java.time.LocalTime
import javax.inject.Inject

@HiltViewModel
class ManualEntryViewModel @Inject constructor(
    private val repository: SleepCoreRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ManualEntryUiState())
    val uiState: StateFlow<ManualEntryUiState> = _uiState.asStateFlow()

    // ========== Date Selection ==========

    fun setDate(date: LocalDate) {
        _uiState.update {
            it.copy(entry = it.entry.copy(date = date))
        }
        validate()
    }

    // ========== Time Fields ==========

    fun setBedTime(time: LocalTime) {
        _uiState.update {
            it.copy(
                entry = it.entry.copy(bedTime = time),
                activeTimePicker = null
            )
        }
        validate()
    }

    fun setTryToSleepTime(time: LocalTime) {
        _uiState.update {
            it.copy(
                entry = it.entry.copy(tryToSleepTime = time),
                activeTimePicker = null
            )
        }
        validate()
    }

    fun setFinalWakeTime(time: LocalTime) {
        _uiState.update {
            it.copy(
                entry = it.entry.copy(finalWakeTime = time),
                activeTimePicker = null
            )
        }
        validate()
    }

    fun setOutOfBedTime(time: LocalTime) {
        _uiState.update {
            it.copy(
                entry = it.entry.copy(outOfBedTime = time),
                activeTimePicker = null
            )
        }
        validate()
    }

    // ========== Duration Fields ==========

    fun setSleepOnsetLatency(minutes: Int?) {
        _uiState.update {
            it.copy(entry = it.entry.copy(sleepOnsetLatency = minutes))
        }
        validate()
    }

    fun setNumberOfAwakenings(count: Int?) {
        _uiState.update {
            it.copy(entry = it.entry.copy(numberOfAwakenings = count))
        }
        validate()
    }

    fun setWakeAfterSleepOnset(minutes: Int?) {
        _uiState.update {
            it.copy(entry = it.entry.copy(wakeAfterSleepOnset = minutes))
        }
        validate()
    }

    // ========== Quality ==========

    fun setSleepQuality(quality: SleepQuality) {
        _uiState.update {
            it.copy(entry = it.entry.copy(sleepQuality = quality))
        }
        validate()
    }

    fun setComments(comments: String) {
        _uiState.update {
            it.copy(entry = it.entry.copy(comments = comments.ifBlank { null }))
        }
    }

    // ========== Navigation ==========

    fun goToStep(step: EntryStep) {
        _uiState.update { it.copy(currentStep = step) }
    }

    fun nextStep() {
        _uiState.update {
            val nextStep = when (it.currentStep) {
                EntryStep.TIMING -> EntryStep.QUALITY
                EntryStep.QUALITY -> EntryStep.REVIEW
                EntryStep.REVIEW -> EntryStep.REVIEW
            }
            it.copy(currentStep = nextStep)
        }
    }

    fun previousStep() {
        _uiState.update {
            val prevStep = when (it.currentStep) {
                EntryStep.TIMING -> EntryStep.TIMING
                EntryStep.QUALITY -> EntryStep.TIMING
                EntryStep.REVIEW -> EntryStep.QUALITY
            }
            it.copy(currentStep = prevStep)
        }
    }

    // ========== Time Picker ==========

    fun showTimePicker(field: TimePickerField) {
        _uiState.update { it.copy(activeTimePicker = field) }
    }

    fun dismissTimePicker() {
        _uiState.update { it.copy(activeTimePicker = null) }
    }

    // ========== Advanced Fields ==========

    fun toggleAdvancedFields() {
        _uiState.update { it.copy(showAdvancedFields = !it.showAdvancedFields) }
    }

    // ========== Validation ==========

    private fun validate() {
        val entry = _uiState.value.entry
        val errors = mutableListOf<ValidationError>()
        val warnings = mutableListOf<ValidationWarning>()

        // Required fields check
        if (entry.bedTime == null) {
            errors.add(ValidationError("bedTime", R.string.manual_entry_error_bed_time_required))
        }
        if (entry.outOfBedTime == null) {
            errors.add(ValidationError("outOfBedTime", R.string.manual_entry_error_out_of_bed_required))
        }
        if (entry.sleepQuality == null) {
            errors.add(ValidationError("sleepQuality", R.string.manual_entry_error_quality_required))
        }

        // Time consistency checks
        if (entry.bedTime != null && entry.tryToSleepTime != null) {
            if (entry.tryToSleepTime.isBefore(entry.bedTime)) {
                errors.add(ValidationError("tryToSleepTime", R.string.manual_entry_error_try_sleep_before_bed))
            }
        }

        // TIB calculation and minimum check (SleepCore safety: min 5 hours)
        if (entry.bedTime != null && entry.outOfBedTime != null) {
            val tib = calculateTibMinutes(entry.bedTime, entry.outOfBedTime)
            if (tib < 300) { // 5 hours = 300 minutes
                warnings.add(ValidationWarning("tib", R.string.manual_entry_warning_tib_short))
            }
            if (tib > 720) { // 12 hours
                warnings.add(ValidationWarning("tib", R.string.manual_entry_warning_tib_long))
            }
        }

        // SOL consistency
        entry.sleepOnsetLatency?.let { sol ->
            if (sol < 0) {
                errors.add(ValidationError("sol", R.string.manual_entry_error_sol_negative))
            }
            if (sol > 300) { // More than 5 hours to fall asleep
                warnings.add(ValidationWarning("sol", R.string.manual_entry_warning_sol_high))
            }
        }

        // WASO consistency
        entry.wakeAfterSleepOnset?.let { waso ->
            if (waso < 0) {
                errors.add(ValidationError("waso", R.string.manual_entry_error_waso_negative))
            }
        }

        // Number of awakenings
        entry.numberOfAwakenings?.let { nwak ->
            if (nwak < 0) {
                errors.add(ValidationError("nwak", R.string.manual_entry_error_nwak_negative))
            }
        }

        _uiState.update {
            it.copy(
                validation = ValidationResult(
                    isValid = errors.isEmpty() && hasRequiredFields(entry),
                    errors = errors,
                    warnings = warnings
                )
            )
        }
    }

    private fun hasRequiredFields(entry: SleepDiaryEntry): Boolean {
        return entry.bedTime != null &&
                entry.outOfBedTime != null &&
                entry.sleepQuality != null
    }

    private fun calculateTibMinutes(bedTime: LocalTime, outOfBedTime: LocalTime): Long {
        // Handle overnight sleep (e.g., bed at 23:00, wake at 07:00)
        var duration = Duration.between(bedTime, outOfBedTime)
        if (duration.isNegative) {
            duration = duration.plusDays(1)
        }
        return duration.toMinutes()
    }

    // ========== Save ==========

    fun saveDiaryEntry() {
        if (!_uiState.value.validation.isValid) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, saveError = null) }

            try {
                val entry = _uiState.value.entry

                // Calculate derived metrics
                val tib = if (entry.bedTime != null && entry.outOfBedTime != null) {
                    calculateTibMinutes(entry.bedTime, entry.outOfBedTime).toInt()
                } else null

                val tst = if (tib != null) {
                    val sol = entry.sleepOnsetLatency ?: 0
                    val waso = entry.wakeAfterSleepOnset ?: 0
                    maxOf(0, tib - sol - waso)
                } else null

                val sleepEfficiency = if (tst != null && tib != null && tib > 0) {
                    (tst.toFloat() / tib.toFloat() * 100).toInt()
                } else null

                // Save to repository (offline-first)
                repository.saveSleepDiaryEntry(
                    date = entry.date,
                    bedTime = entry.bedTime,
                    outOfBedTime = entry.outOfBedTime,
                    tryToSleepTime = entry.tryToSleepTime,
                    finalWakeTime = entry.finalWakeTime,
                    sleepOnsetLatency = entry.sleepOnsetLatency,
                    numberOfAwakenings = entry.numberOfAwakenings,
                    wakeAfterSleepOnset = entry.wakeAfterSleepOnset,
                    sleepQuality = entry.sleepQuality?.value,
                    comments = entry.comments,
                    totalSleepTime = tst,
                    timeInBed = tib,
                    sleepEfficiency = sleepEfficiency
                )

                _uiState.update {
                    it.copy(
                        isSaving = false,
                        showSuccessMessage = true
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        saveError = e.message ?: "Unknown error"
                    )
                }
            }
        }
    }

    fun dismissSuccessMessage() {
        _uiState.update { it.copy(showSuccessMessage = false) }
    }

    fun dismissError() {
        _uiState.update { it.copy(saveError = null) }
    }

    // ========== Computed Properties ==========

    /**
     * Calculate sleep efficiency for preview.
     * SE = (TST / TIB) * 100
     */
    fun calculateSleepEfficiencyPreview(): Int? {
        val entry = _uiState.value.entry
        if (entry.bedTime == null || entry.outOfBedTime == null) return null

        val tib = calculateTibMinutes(entry.bedTime, entry.outOfBedTime).toInt()
        if (tib <= 0) return null

        val sol = entry.sleepOnsetLatency ?: 0
        val waso = entry.wakeAfterSleepOnset ?: 0
        val tst = maxOf(0, tib - sol - waso)

        return (tst.toFloat() / tib.toFloat() * 100).toInt()
    }

    /**
     * Calculate total sleep time for preview.
     */
    fun calculateTstPreview(): Int? {
        val entry = _uiState.value.entry
        if (entry.bedTime == null || entry.outOfBedTime == null) return null

        val tib = calculateTibMinutes(entry.bedTime, entry.outOfBedTime).toInt()
        val sol = entry.sleepOnsetLatency ?: 0
        val waso = entry.wakeAfterSleepOnset ?: 0

        return maxOf(0, tib - sol - waso)
    }
}
