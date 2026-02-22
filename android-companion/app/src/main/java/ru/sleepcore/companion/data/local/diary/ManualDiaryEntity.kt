/**
 * Manual Sleep Diary Entity
 * ==========================
 * Room entity for storing manual sleep diary entries.
 *
 * Based on Consensus Sleep Diary (Carney et al., 2012):
 * - 9 core fields (bedtime, wake time, SOL, NWAK, WASO, etc.)
 * - 5-point Likert scale for quality
 *
 * Offline-first:
 * - Entries saved locally first
 * - Synced to backend when online
 * - Last Write Wins conflict resolution
 *
 * Created: February 2026
 */

package ru.sleepcore.companion.data.local.diary

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "manual_diary",
    indices = [
        Index(value = ["date"], unique = true),
        Index(value = ["sync_status"]),
        Index(value = ["created_at"])
    ]
)
data class ManualDiaryEntity(
    @PrimaryKey
    @ColumnInfo(name = "date")
    val date: String,  // ISO date format: YYYY-MM-DD

    // Timing fields (stored as HH:mm format)
    @ColumnInfo(name = "bed_time")
    val bedTime: String?,

    @ColumnInfo(name = "try_to_sleep_time")
    val tryToSleepTime: String?,

    @ColumnInfo(name = "final_wake_time")
    val finalWakeTime: String?,

    @ColumnInfo(name = "out_of_bed_time")
    val outOfBedTime: String?,

    // Duration fields (in minutes)
    @ColumnInfo(name = "sleep_onset_latency")
    val sleepOnsetLatency: Int?,

    @ColumnInfo(name = "number_of_awakenings")
    val numberOfAwakenings: Int?,

    @ColumnInfo(name = "wake_after_sleep_onset")
    val wakeAfterSleepOnset: Int?,

    // Subjective quality (1-5 Likert scale)
    @ColumnInfo(name = "sleep_quality")
    val sleepQuality: Int?,

    // Optional comments
    @ColumnInfo(name = "comments")
    val comments: String?,

    // Calculated metrics
    @ColumnInfo(name = "total_sleep_time")
    val totalSleepTime: Int?,  // in minutes

    @ColumnInfo(name = "time_in_bed")
    val timeInBed: Int?,  // in minutes

    @ColumnInfo(name = "sleep_efficiency")
    val sleepEfficiency: Int?,  // percentage

    // Sync metadata
    @ColumnInfo(name = "sync_status", defaultValue = "PENDING")
    val syncStatus: String = "PENDING",  // PENDING, SYNCED, FAILED

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "synced_at")
    val syncedAt: Long? = null,

    @ColumnInfo(name = "sync_error")
    val syncError: String? = null
)
