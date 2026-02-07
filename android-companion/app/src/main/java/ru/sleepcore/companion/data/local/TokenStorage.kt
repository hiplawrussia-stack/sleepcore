/**
 * Secure Token Storage
 * =====================
 * Uses EncryptedSharedPreferences for secure JWT storage.
 *
 * Based on research (February 2026):
 * - EncryptedSharedPreferences is the standard for Android 10+
 * - AES-256-GCM encryption with Android Keystore
 * - Never store tokens in plaintext SharedPreferences
 *
 * Source: capgo.app/blog/secure-token-storage-best-practices-for-mobile-developers/
 */

package ru.sleepcore.companion.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Stored credentials
 */
data class StoredCredentials(
    val token: String,
    val expiresAt: Instant,
    val userId: String,
    val telegramId: Long,
    val userName: String,
    val deviceId: String,
    val linkedAt: Instant
) {
    val isExpired: Boolean
        get() = Instant.now().isAfter(expiresAt)

    val isExpiringSoon: Boolean
        get() = Instant.now().plusSeconds(7 * 24 * 60 * 60).isAfter(expiresAt)  // 7 days
}

@Singleton
class TokenStorage @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val PREFS_NAME = "sleepcore_secure_prefs"
        private const val KEY_TOKEN = "device_token"
        private const val KEY_EXPIRES_AT = "token_expires_at"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_TELEGRAM_ID = "telegram_id"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_LINKED_AT = "linked_at"
        private const val KEY_LAST_SYNC_TIME = "last_sync_time"
    }

    private val _credentialsFlow = MutableStateFlow<StoredCredentials?>(null)
    val credentialsFlow: Flow<StoredCredentials?> = _credentialsFlow.asStateFlow()

    private val encryptedPrefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    init {
        // Load credentials on initialization
        loadCredentials()?.let { _credentialsFlow.value = it }
    }

    /**
     * Save device credentials after successful linking
     */
    suspend fun saveCredentials(
        token: String,
        expiresAt: String,
        userId: String,
        telegramId: Long,
        userName: String,
        deviceId: String
    ) = withContext(Dispatchers.IO) {
        val expiresAtInstant = Instant.parse(expiresAt)
        val linkedAt = Instant.now()

        encryptedPrefs.edit().apply {
            putString(KEY_TOKEN, token)
            putString(KEY_EXPIRES_AT, expiresAt)
            putString(KEY_USER_ID, userId)
            putLong(KEY_TELEGRAM_ID, telegramId)
            putString(KEY_USER_NAME, userName)
            putString(KEY_DEVICE_ID, deviceId)
            putString(KEY_LINKED_AT, linkedAt.toString())
        }.apply()

        val credentials = StoredCredentials(
            token = token,
            expiresAt = expiresAtInstant,
            userId = userId,
            telegramId = telegramId,
            userName = userName,
            deviceId = deviceId,
            linkedAt = linkedAt
        )
        _credentialsFlow.value = credentials
    }

    /**
     * Load stored credentials
     */
    fun loadCredentials(): StoredCredentials? {
        val token = encryptedPrefs.getString(KEY_TOKEN, null) ?: return null
        val expiresAt = encryptedPrefs.getString(KEY_EXPIRES_AT, null) ?: return null
        val userId = encryptedPrefs.getString(KEY_USER_ID, null) ?: return null
        val telegramId = encryptedPrefs.getLong(KEY_TELEGRAM_ID, 0)
        val userName = encryptedPrefs.getString(KEY_USER_NAME, null) ?: return null
        val deviceId = encryptedPrefs.getString(KEY_DEVICE_ID, null) ?: return null
        val linkedAt = encryptedPrefs.getString(KEY_LINKED_AT, null) ?: return null

        return try {
            StoredCredentials(
                token = token,
                expiresAt = Instant.parse(expiresAt),
                userId = userId,
                telegramId = telegramId,
                userName = userName,
                deviceId = deviceId,
                linkedAt = Instant.parse(linkedAt)
            )
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Get bearer token header value
     */
    fun getBearerToken(): String? {
        val credentials = _credentialsFlow.value ?: loadCredentials()
        if (credentials == null || credentials.isExpired) return null
        return "Bearer ${credentials.token}"
    }

    /**
     * Check if device is linked
     */
    fun isLinked(): Boolean {
        val credentials = _credentialsFlow.value ?: loadCredentials()
        return credentials != null && !credentials.isExpired
    }

    /**
     * Save last sync time
     */
    suspend fun saveLastSyncTime(time: Instant) = withContext(Dispatchers.IO) {
        encryptedPrefs.edit()
            .putString(KEY_LAST_SYNC_TIME, time.toString())
            .apply()
    }

    /**
     * Get last sync time
     */
    fun getLastSyncTime(): Instant? {
        val timeStr = encryptedPrefs.getString(KEY_LAST_SYNC_TIME, null)
        return timeStr?.let {
            try {
                Instant.parse(it)
            } catch (e: Exception) {
                null
            }
        }
    }

    /**
     * Clear all stored credentials (on unlink)
     */
    suspend fun clearCredentials() = withContext(Dispatchers.IO) {
        encryptedPrefs.edit().clear().apply()
        _credentialsFlow.value = null
    }
}
