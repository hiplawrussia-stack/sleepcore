/**
 * SleepCore Room Database
 * ========================
 * Local database for HIPAA-compliant data storage.
 *
 * Entities:
 * - AuditLogEntity: Immutable audit trail (6-year retention)
 * - PendingSyncEntity: Offline sync queue (February 2026)
 *
 * Security considerations:
 * - Database file should be encrypted (SQLCipher for production)
 * - Located in app-private storage (no SD card)
 * - Excluded from backup via data_extraction_rules.xml
 *
 * Migration strategy:
 * - Always use migrations, never fallbackToDestructiveMigration()
 * - Audit logs must never be lost
 *
 * Research (February 2026):
 * - Offline-first pattern requires persistent queue
 * - Room 2.6+ supports auto-migrations
 *
 * Sources:
 * - developer.android.com/training/data-storage/room
 * - developer.android.com/topic/architecture/data-layer/offline-first
 *
 * Confidence: HIGH
 */

package ru.sleepcore.companion.data.local

import android.content.Context
import androidx.room.AutoMigration
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import ru.sleepcore.companion.data.local.audit.AuditLogDao
import ru.sleepcore.companion.data.local.audit.AuditLogEntity
import ru.sleepcore.companion.data.local.diary.ManualDiaryDao
import ru.sleepcore.companion.data.local.diary.ManualDiaryEntity
import ru.sleepcore.companion.data.local.sync.PendingSyncDao
import ru.sleepcore.companion.data.local.sync.PendingSyncEntity

@Database(
    entities = [
        AuditLogEntity::class,
        PendingSyncEntity::class,
        ManualDiaryEntity::class
    ],
    version = 3,
    exportSchema = true,  // Required for migrations
    autoMigrations = [
        AutoMigration(from = 1, to = 2),
        AutoMigration(from = 2, to = 3)
    ]
)
abstract class SleepCoreDatabase : RoomDatabase() {

    abstract fun auditLogDao(): AuditLogDao
    abstract fun pendingSyncDao(): PendingSyncDao
    abstract fun manualDiaryDao(): ManualDiaryDao

    companion object {
        const val DATABASE_NAME = "sleepcore.db"

        @Volatile
        private var INSTANCE: SleepCoreDatabase? = null

        /**
         * Manual migration from v1 to v2
         * Adds pending_sync table for offline queue
         *
         * Note: Using AutoMigration instead, but keeping this as fallback
         */
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `pending_sync` (
                        `session_id` TEXT NOT NULL PRIMARY KEY,
                        `payload` TEXT NOT NULL,
                        `status` TEXT NOT NULL DEFAULT 'PENDING',
                        `attempts` INTEGER NOT NULL DEFAULT 0,
                        `max_attempts` INTEGER NOT NULL DEFAULT 5,
                        `created_at` INTEGER NOT NULL,
                        `last_attempt_at` INTEGER,
                        `last_error` TEXT,
                        `session_start_time` TEXT NOT NULL,
                        `session_end_time` TEXT NOT NULL,
                        `source` TEXT
                    )
                """.trimIndent())

                db.execSQL("CREATE INDEX IF NOT EXISTS `index_pending_sync_status` ON `pending_sync` (`status`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_pending_sync_created_at` ON `pending_sync` (`created_at`)")
            }
        }

        /**
         * Manual migration from v2 to v3
         * Adds manual_diary table for CSD entries (February 2026)
         */
        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `manual_diary` (
                        `date` TEXT NOT NULL PRIMARY KEY,
                        `bed_time` TEXT,
                        `try_to_sleep_time` TEXT,
                        `final_wake_time` TEXT,
                        `out_of_bed_time` TEXT,
                        `sleep_onset_latency` INTEGER,
                        `number_of_awakenings` INTEGER,
                        `wake_after_sleep_onset` INTEGER,
                        `sleep_quality` INTEGER,
                        `comments` TEXT,
                        `total_sleep_time` INTEGER,
                        `time_in_bed` INTEGER,
                        `sleep_efficiency` INTEGER,
                        `sync_status` TEXT NOT NULL DEFAULT 'PENDING',
                        `created_at` INTEGER NOT NULL,
                        `updated_at` INTEGER NOT NULL,
                        `synced_at` INTEGER,
                        `sync_error` TEXT
                    )
                """.trimIndent())

                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_manual_diary_date` ON `manual_diary` (`date`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_manual_diary_sync_status` ON `manual_diary` (`sync_status`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_manual_diary_created_at` ON `manual_diary` (`created_at`)")
            }
        }

        /**
         * Get singleton database instance
         *
         * Note: In production, consider using SQLCipher for encryption:
         * ```kotlin
         * val factory = SupportFactory(passphrase)
         * Room.databaseBuilder(...)
         *     .openHelperFactory(factory)
         *     .build()
         * ```
         */
        fun getInstance(context: Context): SleepCoreDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: buildDatabase(context).also { INSTANCE = it }
            }
        }

        private fun buildDatabase(context: Context): SleepCoreDatabase {
            return Room.databaseBuilder(
                context.applicationContext,
                SleepCoreDatabase::class.java,
                DATABASE_NAME
            )
                // Fallback migrations in case AutoMigration fails
                .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
                // Do NOT use fallbackToDestructiveMigration() - audit logs must persist
                // .fallbackToDestructiveMigration() // NEVER for HIPAA compliance
                .build()
        }

        /**
         * Close database instance (for testing)
         */
        fun closeInstance() {
            INSTANCE?.close()
            INSTANCE = null
        }
    }
}
