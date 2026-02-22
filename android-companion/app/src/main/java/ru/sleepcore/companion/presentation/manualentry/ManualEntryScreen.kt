/**
 * Manual Sleep Entry Screen
 * ==========================
 * UI for Consensus Sleep Diary (CSD) manual entry with progressive disclosure.
 *
 * UX Research (February 2026):
 * - Progressive disclosure: 3 steps (Timing → Quality → Review)
 * - WCAG 2.1 AA: 44x44dp touch targets, semantic headings
 * - Offline-first: entries saved locally, synced when online
 *
 * Clinical basis:
 * - Consensus Sleep Diary (Carney et al., 2012)
 * - 5-point Likert scale for quality rating
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.presentation.manualentry

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import ru.sleepcore.companion.R
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManualEntryScreen(
    onBack: () -> Unit,
    onSaved: () -> Unit,
    viewModel: ManualEntryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDatePicker by remember { mutableStateOf(false) }

    // Handle success
    LaunchedEffect(uiState.showSuccessMessage) {
        if (uiState.showSuccessMessage) {
            viewModel.dismissSuccessMessage()
            onSaved()
        }
    }

    // Handle errors
    LaunchedEffect(uiState.saveError) {
        uiState.saveError?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.dismissError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.manual_entry_title)) },
                navigationIcon = {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.semantics {
                            contentDescription = "Go back"
                        }
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Progress indicator
            StepProgress(currentStep = uiState.currentStep)

            // Date selector
            DateSelector(
                date = uiState.entry.date,
                onClick = { showDatePicker = true }
            )

            // Step content
            AnimatedContent(
                targetState = uiState.currentStep,
                label = "step_content"
            ) { step ->
                when (step) {
                    EntryStep.TIMING -> TimingStep(
                        entry = uiState.entry,
                        activeTimePicker = uiState.activeTimePicker,
                        onShowTimePicker = { viewModel.showTimePicker(it) },
                        onDismissTimePicker = { viewModel.dismissTimePicker() },
                        onSetBedTime = { viewModel.setBedTime(it) },
                        onSetTryToSleepTime = { viewModel.setTryToSleepTime(it) },
                        onSetFinalWakeTime = { viewModel.setFinalWakeTime(it) },
                        onSetOutOfBedTime = { viewModel.setOutOfBedTime(it) },
                        onNext = { viewModel.nextStep() }
                    )
                    EntryStep.QUALITY -> QualityStep(
                        entry = uiState.entry,
                        showAdvanced = uiState.showAdvancedFields,
                        onToggleAdvanced = { viewModel.toggleAdvancedFields() },
                        onSetSol = { viewModel.setSleepOnsetLatency(it) },
                        onSetNwak = { viewModel.setNumberOfAwakenings(it) },
                        onSetWaso = { viewModel.setWakeAfterSleepOnset(it) },
                        onSetQuality = { viewModel.setSleepQuality(it) },
                        onSetComments = { viewModel.setComments(it) },
                        onBack = { viewModel.previousStep() },
                        onNext = { viewModel.nextStep() }
                    )
                    EntryStep.REVIEW -> ReviewStep(
                        entry = uiState.entry,
                        validation = uiState.validation,
                        isSaving = uiState.isSaving,
                        sleepEfficiency = viewModel.calculateSleepEfficiencyPreview(),
                        totalSleepTime = viewModel.calculateTstPreview(),
                        onBack = { viewModel.previousStep() },
                        onSave = { viewModel.saveDiaryEntry() }
                    )
                }
            }
        }
    }

    // Date picker dialog
    if (showDatePicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = uiState.entry.date
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli()
        )

        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            val date = Instant.ofEpochMilli(millis)
                                .atZone(ZoneId.systemDefault())
                                .toLocalDate()
                            viewModel.setDate(date)
                        }
                        showDatePicker = false
                    }
                ) {
                    Text(stringResource(R.string.manual_entry_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

@Composable
private fun StepProgress(currentStep: EntryStep) {
    val progress = when (currentStep) {
        EntryStep.TIMING -> 0.33f
        EntryStep.QUALITY -> 0.66f
        EntryStep.REVIEW -> 1f
    }

    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            StepLabel(
                label = stringResource(R.string.manual_entry_step_timing),
                isActive = currentStep == EntryStep.TIMING,
                isCompleted = currentStep.ordinal > EntryStep.TIMING.ordinal
            )
            StepLabel(
                label = stringResource(R.string.manual_entry_step_quality),
                isActive = currentStep == EntryStep.QUALITY,
                isCompleted = currentStep.ordinal > EntryStep.QUALITY.ordinal
            )
            StepLabel(
                label = stringResource(R.string.manual_entry_step_review),
                isActive = currentStep == EntryStep.REVIEW,
                isCompleted = false
            )
        }
    }
}

@Composable
private fun StepLabel(label: String, isActive: Boolean, isCompleted: Boolean) {
    val color = when {
        isActive -> MaterialTheme.colorScheme.primary
        isCompleted -> MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    Text(
        text = label,
        style = MaterialTheme.typography.labelSmall,
        color = color,
        fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal
    )
}

@Composable
private fun DateSelector(date: LocalDate, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.DateRange,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = stringResource(R.string.manual_entry_sleep_date),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = date.format(DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

// ========== Step 1: Timing ==========

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimingStep(
    entry: SleepDiaryEntry,
    activeTimePicker: TimePickerField?,
    onShowTimePicker: (TimePickerField) -> Unit,
    onDismissTimePicker: () -> Unit,
    onSetBedTime: (LocalTime) -> Unit,
    onSetTryToSleepTime: (LocalTime) -> Unit,
    onSetFinalWakeTime: (LocalTime) -> Unit,
    onSetOutOfBedTime: (LocalTime) -> Unit,
    onNext: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = stringResource(R.string.manual_entry_timing_title),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.semantics { heading() }
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.manual_entry_timing_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(24.dp))

        // Bed Time
        TimeField(
            label = stringResource(R.string.manual_entry_bed_time),
            description = stringResource(R.string.manual_entry_bed_time_desc),
            time = entry.bedTime,
            onClick = { onShowTimePicker(TimePickerField.BED_TIME) },
            isRequired = true
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Try to Sleep Time (optional)
        TimeField(
            label = stringResource(R.string.manual_entry_try_sleep_time),
            description = stringResource(R.string.manual_entry_try_sleep_time_desc),
            time = entry.tryToSleepTime,
            onClick = { onShowTimePicker(TimePickerField.TRY_TO_SLEEP_TIME) },
            isRequired = false
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Final Wake Time (optional)
        TimeField(
            label = stringResource(R.string.manual_entry_final_wake_time),
            description = stringResource(R.string.manual_entry_final_wake_time_desc),
            time = entry.finalWakeTime,
            onClick = { onShowTimePicker(TimePickerField.FINAL_WAKE_TIME) },
            isRequired = false
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Out of Bed Time
        TimeField(
            label = stringResource(R.string.manual_entry_out_of_bed_time),
            description = stringResource(R.string.manual_entry_out_of_bed_time_desc),
            time = entry.outOfBedTime,
            onClick = { onShowTimePicker(TimePickerField.OUT_OF_BED_TIME) },
            isRequired = true
        )

        Spacer(modifier = Modifier.weight(1f))

        // Next button
        Button(
            onClick = onNext,
            modifier = Modifier.fillMaxWidth(),
            enabled = entry.bedTime != null && entry.outOfBedTime != null
        ) {
            Text(stringResource(R.string.manual_entry_next))
        }
    }

    // Time picker dialogs
    activeTimePicker?.let { field ->
        val initialTime = when (field) {
            TimePickerField.BED_TIME -> entry.bedTime ?: LocalTime.of(23, 0)
            TimePickerField.TRY_TO_SLEEP_TIME -> entry.tryToSleepTime ?: entry.bedTime ?: LocalTime.of(23, 30)
            TimePickerField.FINAL_WAKE_TIME -> entry.finalWakeTime ?: LocalTime.of(7, 0)
            TimePickerField.OUT_OF_BED_TIME -> entry.outOfBedTime ?: LocalTime.of(7, 30)
        }

        val timePickerState = rememberTimePickerState(
            initialHour = initialTime.hour,
            initialMinute = initialTime.minute
        )

        AlertDialog(
            onDismissRequest = onDismissTimePicker,
            confirmButton = {
                TextButton(
                    onClick = {
                        val time = LocalTime.of(timePickerState.hour, timePickerState.minute)
                        when (field) {
                            TimePickerField.BED_TIME -> onSetBedTime(time)
                            TimePickerField.TRY_TO_SLEEP_TIME -> onSetTryToSleepTime(time)
                            TimePickerField.FINAL_WAKE_TIME -> onSetFinalWakeTime(time)
                            TimePickerField.OUT_OF_BED_TIME -> onSetOutOfBedTime(time)
                        }
                    }
                ) {
                    Text(stringResource(R.string.manual_entry_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = onDismissTimePicker) {
                    Text(stringResource(R.string.cancel))
                }
            },
            text = {
                TimePicker(state = timePickerState)
            }
        )
    }
}

@Composable
private fun TimeField(
    label: String,
    description: String,
    time: LocalTime?,
    onClick: () -> Unit,
    isRequired: Boolean
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (time != null) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            } else {
                MaterialTheme.colorScheme.surface
            }
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    if (isRequired) {
                        Text(
                            text = " *",
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(
                        if (time != null) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.surfaceVariant
                        }
                    )
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Text(
                    text = time?.format(DateTimeFormatter.ofPattern("HH:mm"))
                        ?: stringResource(R.string.manual_entry_tap_to_set),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (time != null) {
                        MaterialTheme.colorScheme.onPrimary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    }
                )
            }
        }
    }
}

// ========== Step 2: Quality ==========

@Composable
private fun QualityStep(
    entry: SleepDiaryEntry,
    showAdvanced: Boolean,
    onToggleAdvanced: () -> Unit,
    onSetSol: (Int?) -> Unit,
    onSetNwak: (Int?) -> Unit,
    onSetWaso: (Int?) -> Unit,
    onSetQuality: (SleepQuality) -> Unit,
    onSetComments: (String) -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = stringResource(R.string.manual_entry_quality_title),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.semantics { heading() }
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.manual_entry_quality_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(24.dp))

        // Sleep Quality Rating
        Text(
            text = stringResource(R.string.manual_entry_quality_rating) + " *",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(8.dp))
        QualityRatingSelector(
            selected = entry.sleepQuality,
            onSelect = onSetQuality
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Advanced fields toggle
        TextButton(onClick = onToggleAdvanced) {
            Text(
                text = if (showAdvanced) {
                    stringResource(R.string.manual_entry_hide_advanced)
                } else {
                    stringResource(R.string.manual_entry_show_advanced)
                }
            )
        }

        AnimatedVisibility(visible = showAdvanced) {
            Column {
                Spacer(modifier = Modifier.height(16.dp))

                // Sleep Onset Latency
                DurationField(
                    label = stringResource(R.string.manual_entry_sol),
                    description = stringResource(R.string.manual_entry_sol_desc),
                    value = entry.sleepOnsetLatency,
                    onValueChange = onSetSol,
                    unit = stringResource(R.string.manual_entry_minutes)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Number of Awakenings
                DurationField(
                    label = stringResource(R.string.manual_entry_nwak),
                    description = stringResource(R.string.manual_entry_nwak_desc),
                    value = entry.numberOfAwakenings,
                    onValueChange = onSetNwak,
                    unit = stringResource(R.string.manual_entry_times)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Wake After Sleep Onset
                DurationField(
                    label = stringResource(R.string.manual_entry_waso),
                    description = stringResource(R.string.manual_entry_waso_desc),
                    value = entry.wakeAfterSleepOnset,
                    onValueChange = onSetWaso,
                    unit = stringResource(R.string.manual_entry_minutes)
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Comments
        OutlinedTextField(
            value = entry.comments ?: "",
            onValueChange = onSetComments,
            label = { Text(stringResource(R.string.manual_entry_comments)) },
            placeholder = { Text(stringResource(R.string.manual_entry_comments_placeholder)) },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2,
            maxLines = 4
        )

        Spacer(modifier = Modifier.weight(1f))

        // Navigation buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier.weight(1f)
            ) {
                Text(stringResource(R.string.manual_entry_back))
            }
            Button(
                onClick = onNext,
                modifier = Modifier.weight(1f),
                enabled = entry.sleepQuality != null
            ) {
                Text(stringResource(R.string.manual_entry_next))
            }
        }
    }
}

@Composable
private fun QualityRatingSelector(
    selected: SleepQuality?,
    onSelect: (SleepQuality) -> Unit
) {
    val qualities = SleepQuality.entries
    val labels = listOf(
        stringResource(R.string.manual_entry_quality_very_poor),
        stringResource(R.string.manual_entry_quality_poor),
        stringResource(R.string.manual_entry_quality_fair),
        stringResource(R.string.manual_entry_quality_good),
        stringResource(R.string.manual_entry_quality_very_good)
    )

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        qualities.forEachIndexed { index, quality ->
            QualityOption(
                value = quality.value,
                label = labels[index],
                isSelected = selected == quality,
                onClick = { onSelect(quality) }
            )
        }
    }
}

@Composable
private fun QualityOption(
    value: Int,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(8.dp)
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(
                    if (isSelected) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    }
                )
                .border(
                    width = if (isSelected) 2.dp else 1.dp,
                    color = if (isSelected) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.outline
                    },
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = value.toString(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (isSelected) {
                    MaterialTheme.colorScheme.onPrimary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                }
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = if (isSelected) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            }
        )
    }
}

@Composable
private fun DurationField(
    label: String,
    description: String,
    value: Int?,
    onValueChange: (Int?) -> Unit,
    unit: String
) {
    Column {
        Text(
            text = label,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = description,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = value?.toString() ?: "",
                onValueChange = { text ->
                    onValueChange(text.toIntOrNull())
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.width(100.dp),
                singleLine = true
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = unit,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// ========== Step 3: Review ==========

@Composable
private fun ReviewStep(
    entry: SleepDiaryEntry,
    validation: ValidationResult,
    isSaving: Boolean,
    sleepEfficiency: Int?,
    totalSleepTime: Int?,
    onBack: () -> Unit,
    onSave: () -> Unit
) {
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = stringResource(R.string.manual_entry_review_title),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.semantics { heading() }
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.manual_entry_review_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(24.dp))

        // Summary card
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                ReviewRow(
                    label = stringResource(R.string.manual_entry_bed_time),
                    value = entry.bedTime?.format(timeFormatter) ?: "-"
                )
                ReviewRow(
                    label = stringResource(R.string.manual_entry_out_of_bed_time),
                    value = entry.outOfBedTime?.format(timeFormatter) ?: "-"
                )
                if (entry.sleepOnsetLatency != null) {
                    ReviewRow(
                        label = stringResource(R.string.manual_entry_sol_short),
                        value = "${entry.sleepOnsetLatency} min"
                    )
                }
                if (entry.wakeAfterSleepOnset != null) {
                    ReviewRow(
                        label = stringResource(R.string.manual_entry_waso_short),
                        value = "${entry.wakeAfterSleepOnset} min"
                    )
                }
                ReviewRow(
                    label = stringResource(R.string.manual_entry_quality_label),
                    value = entry.sleepQuality?.value?.toString() ?: "-"
                )
            }
        }

        // Calculated metrics
        if (sleepEfficiency != null || totalSleepTime != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = stringResource(R.string.manual_entry_calculated_metrics),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    totalSleepTime?.let { tst ->
                        val hours = tst / 60
                        val minutes = tst % 60
                        ReviewRow(
                            label = stringResource(R.string.manual_entry_tst),
                            value = "${hours}h ${minutes}m"
                        )
                    }
                    sleepEfficiency?.let { se ->
                        ReviewRow(
                            label = stringResource(R.string.manual_entry_se),
                            value = "$se%"
                        )
                    }
                }
            }
        }

        // Warnings
        if (validation.warnings.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            validation.warnings.forEach { warning ->
                WarningBanner(messageResId = warning.messageResId)
                Spacer(modifier = Modifier.height(8.dp))
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Navigation buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier.weight(1f),
                enabled = !isSaving
            ) {
                Text(stringResource(R.string.manual_entry_back))
            }
            Button(
                onClick = onSave,
                modifier = Modifier.weight(1f),
                enabled = validation.isValid && !isSaving
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.manual_entry_save))
                }
            }
        }
    }
}

@Composable
private fun ReviewRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun WarningBanner(messageResId: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.Warning,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.error,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = stringResource(messageResId),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onErrorContainer
        )
    }
}
