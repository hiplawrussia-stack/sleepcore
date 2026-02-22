/**
 * Manual Diary DAO
 * =================
 * Data Access Object for manual sleep diary entries.
 *
 * Features:
 * - CRUD operations for diary entries
 * - Sync status tracking
 * - Conflict resolution (Last Write Wins)
 *
 * Created: February 2026
 */

package ru.sleepcore.companion.data.local.diary

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface ManualDiaryDao {

    /**
     * Insert or replace diary entry (Last Write Wins).
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entry: ManualDiaryEntity)

    /**
     * Get entry by date.
     */
    @Query("SELECT * FROM manual_diary WHERE date = :date")
    suspend fun getByDate(date: String): ManualDiaryEntity?

    /**
     * Get all entries ordered by date (descending).
     */
    @Query("SELECT * FROM manual_diary ORDER BY date DESC")
    fun observeAll(): Flow<List<ManualDiaryEntity>>

    /**
     * Get entries within date range.
     */
    @Query("SELECT * FROM manual_diary WHERE date BETWEEN :startDate AND :endDate ORDER BY date DESC")
    suspend fun getInRange(startDate: String, endDate: String): List<ManualDiaryEntity>

    /**
     * Get pending entries (not yet synced).
     */
    @Query("SELECT * FROM manual_diary WHERE sync_status = 'PENDING' ORDER BY created_at ASC")
    suspend fun getPending(): List<ManualDiaryEntity>

    /**
     * Get failed entries.
     */
    @Query("SELECT * FROM manual_diary WHERE sync_status = 'FAILED' ORDER BY created_at ASC")
    suspend fun getFailed(): List<ManualDiaryEntity>

    /**
     * Mark entry as synced.
     */
    @Query("UPDATE manual_diary SET sync_status = 'SYNCED', synced_at = :syncedAt, sync_error = NULL WHERE date = :date")
    suspend fun markSynced(date: String, syncedAt: Long = System.currentTimeMillis())

    /**
     * Mark entry as failed.
     */
    @Query("UPDATE manual_diary SET sync_status = 'FAILED', sync_error = :error WHERE date = :date")
    suspend fun markFailed(date: String, error: String)

    /**
     * Reset all failed entries to pending.
     */
    @Query("UPDATE manual_diary SET sync_status = 'PENDING', sync_error = NULL WHERE sync_status = 'FAILED'")
    suspend fun resetFailed()

    /**
     * Count pending entries.
     */
    @Query("SELECT COUNT(*) FROM manual_diary WHERE sync_status = 'PENDING'")
    fun observePendingCount(): Flow<Int>

    /**
     * Count entries in last N days.
     */
    @Query("SELECT COUNT(*) FROM manual_diary WHERE date >= :startDate")
    suspend fun countSince(startDate: String): Int

    /**
     * Delete entry.
     */
    @Query("DELETE FROM manual_diary WHERE date = :date")
    suspend fun delete(date: String)

    /**
     * Delete all entries (for testing/unlink).
     */
    @Query("DELETE FROM manual_diary")
    suspend fun deleteAll()
}
