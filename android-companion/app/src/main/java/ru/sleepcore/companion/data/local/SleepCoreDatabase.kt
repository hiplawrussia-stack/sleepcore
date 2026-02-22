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
import ru.sleepcore.companion.data.local.sync.PendingSyncDao
import ru.sleepcore.companion.data.local.sync.PendingSyncEntity

@Database(
    entities = [
        AuditLogEntity::class,
        PendingSyncEntity::class
    ],
    version = 2,
    exportSchema = true,  // Required for migrations
    autoMigrations = [
        AutoMigration(from = 1, to = 2)
    ]
)
abstract class SleepCoreDatabase : RoomDatabase() {

    abstract fun auditLogDao(): AuditLogDao
    abstract fun pendingSyncDao(): PendingSyncDao

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
                // Fallback migration in case AutoMigration fails
                .addMigrations(MIGRATION_1_2)
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
