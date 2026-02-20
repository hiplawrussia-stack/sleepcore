/**
 * SleepCore Room Database
 * ========================
 * Local database for HIPAA-compliant data storage.
 *
 * Current entities:
 * - AuditLogEntity: Immutable audit trail (6-year retention)
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
 * Confidence: HIGH
 * Source: Android Room documentation, HIPAA Security Rule
 */

package ru.sleepcore.companion.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import ru.sleepcore.companion.data.local.audit.AuditLogDao
import ru.sleepcore.companion.data.local.audit.AuditLogEntity

@Database(
    entities = [AuditLogEntity::class],
    version = 1,
    exportSchema = true  // Required for migrations
)
abstract class SleepCoreDatabase : RoomDatabase() {

    abstract fun auditLogDao(): AuditLogDao

    companion object {
        const val DATABASE_NAME = "sleepcore.db"

        @Volatile
        private var INSTANCE: SleepCoreDatabase? = null

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
                // Do NOT use fallbackToDestructiveMigration() - audit logs must persist
                // .fallbackToDestructiveMigration() // NEVER for HIPAA compliance
                .build()
        }
    }
}
