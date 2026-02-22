/**
 * SleepCore Repository
 * =====================
 * Unified repository for sleep data access.
 *
 * Responsibilities:
 * - Manual diary entry management
 * - Offline-first data persistence
 * - Sync orchestration for manual entries
 *
 * Created: February 2026
 */

package ru.sleepcore.companion.data

import kotlinx.coroutines.flow.Flow
import ru.sleepcore.companion.data.local.diary.ManualDiaryDao
import ru.sleepcore.companion.data.local.diary.ManualDiaryEntity
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SleepCoreRepository @Inject constructor(
    private val manualDiaryDao: ManualDiaryDao
) {
    private val dateFormatter = DateTimeFormatter.ISO_LOCAL_DATE
    private val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    /**
     * Save manual sleep diary entry.
     *
     * Implements Last Write Wins conflict resolution.
     */
    suspend fun saveSleepDiaryEntry(
        date: LocalDate,
        bedTime: LocalTime?,
        outOfBedTime: LocalTime?,
        tryToSleepTime: LocalTime? = null,
        finalWakeTime: LocalTime? = null,
        sleepOnsetLatency: Int? = null,
        numberOfAwakenings: Int? = null,
        wakeAfterSleepOnset: Int? = null,
        sleepQuality: Int? = null,
        comments: String? = null,
        totalSleepTime: Int? = null,
        timeInBed: Int? = null,
        sleepEfficiency: Int? = null
    ) {
        val entity = ManualDiaryEntity(
            date = date.format(dateFormatter),
            bedTime = bedTime?.format(timeFormatter),
            outOfBedTime = outOfBedTime?.format(timeFormatter),
            tryToSleepTime = tryToSleepTime?.format(timeFormatter),
            finalWakeTime = finalWakeTime?.format(timeFormatter),
            sleepOnsetLatency = sleepOnsetLatency,
            numberOfAwakenings = numberOfAwakenings,
            wakeAfterSleepOnset = wakeAfterSleepOnset,
            sleepQuality = sleepQuality,
            comments = comments,
            totalSleepTime = totalSleepTime,
            timeInBed = timeInBed,
            sleepEfficiency = sleepEfficiency,
            syncStatus = "PENDING",
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )

        manualDiaryDao.upsert(entity)
    }

    /**
     * Get diary entry by date.
     */
    suspend fun getDiaryEntry(date: LocalDate): ManualDiaryEntity? {
        return manualDiaryDao.getByDate(date.format(dateFormatter))
    }

    /**
     * Observe all diary entries.
     */
    fun observeDiaryEntries(): Flow<List<ManualDiaryEntity>> {
        return manualDiaryDao.observeAll()
    }

    /**
     * Get entries in date range.
     */
    suspend fun getDiaryEntriesInRange(
        startDate: LocalDate,
        endDate: LocalDate
    ): List<ManualDiaryEntity> {
        return manualDiaryDao.getInRange(
            startDate.format(dateFormatter),
            endDate.format(dateFormatter)
        )
    }

    /**
     * Get pending diary entries for sync.
     */
    suspend fun getPendingDiaryEntries(): List<ManualDiaryEntity> {
        return manualDiaryDao.getPending()
    }

    /**
     * Mark diary entry as synced.
     */
    suspend fun markDiaryEntrySynced(date: LocalDate) {
        manualDiaryDao.markSynced(date.format(dateFormatter))
    }

    /**
     * Mark diary entry as failed.
     */
    suspend fun markDiaryEntryFailed(date: LocalDate, error: String) {
        manualDiaryDao.markFailed(date.format(dateFormatter), error)
    }

    /**
     * Observe pending count for UI.
     */
    fun observePendingDiaryCount(): Flow<Int> {
        return manualDiaryDao.observePendingCount()
    }

    /**
     * Delete diary entry.
     */
    suspend fun deleteDiaryEntry(date: LocalDate) {
        manualDiaryDao.delete(date.format(dateFormatter))
    }
}
