/**
 * Secure Token Storage with DataStore + Tink
 * ============================================
 * Migrated from EncryptedSharedPreferences (Feb 2026)
 *
 * Why DataStore + Tink instead of EncryptedSharedPreferences:
 * - EncryptedSharedPreferences has KeyStoreException issues on Samsung devices
 * - DataStore is fully async (no ANR risk)
 * - Tink provides robust key management used by Google (Gmail, Google Pay)
 * - Better error recovery when keys are corrupted
 *
 * Sources:
 * - issuetracker.google.com/issues/164901843 (Samsung KeyStoreException)
 * - developer.android.com/topic/libraries/architecture/datastore (2025)
 * - developers.google.com/tink (2025)
 */

package ru.sleepcore.companion.data.local

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.crypto.tink.Aead
import com.google.crypto.tink.KeyTemplates
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.integration.android.AndroidKeysetManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.security.GeneralSecurityException
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

// DataStore extension for Context
private val Context.tokenDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "sleepcore_secure_datastore"
)

/**
 * Storage initialization state
 *
 * Prevents race conditions by exposing initialization status.
 * UI should observe this state to avoid flickering.
 *
 * Pattern based on:
 * - Android Developers: UI State Production (2025)
 * - Kotlin Docs: CompletableDeferred for await
 */
sealed class StorageInitState {
    /** Storage is initializing (Tink, migration, loading credentials) */
    data object Initializing : StorageInitState()

    /** Storage is ready to use */
    data object Ready : StorageInitState()

    /** Initialization failed - storage unavailable */
    data class Failed(val error: Throwable) : StorageInitState()
}

/**
 * Stored credentials with refresh token support
 *
 * Token lifecycle (RFC 9700 compliant):
 * - Access token: 1 hour lifetime
 * - Refresh token: 30 days lifetime, rotated on each use
 *
 * @property token Access token for API calls
 * @property refreshToken Refresh token for obtaining new access tokens
 * @property expiresAt Access token expiration time
 */
data class StoredCredentials(
    val token: String,
    val expiresAt: Instant,
    val userId: String,
    val telegramId: Long,
    val userName: String,
    val deviceId: String,
    val linkedAt: Instant,
    val refreshToken: String? = null  // Optional for backward compatibility
) {
    /**
     * Access token is expired
     */
    val isExpired: Boolean
        get() = Instant.now().isAfter(expiresAt)

    /**
     * Access token expires within 5 minutes (should refresh proactively)
     */
    val isExpiringSoon: Boolean
        get() = Instant.now().plusSeconds(5 * 60).isAfter(expiresAt)

    /**
     * Has valid refresh token for renewal
     */
    val canRefresh: Boolean
        get() = refreshToken != null
}

@Singleton
class TokenStorage @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "TokenStorage"

        /**
         * Initialization timeout in milliseconds
         * Prevents infinite blocking if Tink fails
         */
        private const val INIT_TIMEOUT_MS = 5000L

        // DataStore keys
        private val KEY_TOKEN = stringPreferencesKey("device_token")
        private val KEY_REFRESH_TOKEN = stringPreferencesKey("refresh_token")  // Added Feb 2026
        private val KEY_EXPIRES_AT = stringPreferencesKey("token_expires_at")
        private val KEY_USER_ID = stringPreferencesKey("user_id")
        // SECURITY: TelegramId encrypted (MASVS-STORAGE L2, HIPAA)
        // Changed from longPreferencesKey to stringPreferencesKey for encryption
        private val KEY_TELEGRAM_ID = stringPreferencesKey("telegram_id_encrypted")
        private val KEY_USER_NAME = stringPreferencesKey("user_name")
        private val KEY_DEVICE_ID = stringPreferencesKey("device_id")
        private val KEY_LINKED_AT = stringPreferencesKey("linked_at")
        private val KEY_LAST_SYNC_TIME = stringPreferencesKey("last_sync_time")
        private val KEY_MIGRATED = stringPreferencesKey("migrated_from_esp")

        // Tink keyset
        private const val TINK_KEYSET_NAME = "sleepcore_tink_keyset"
        private const val TINK_PREF_FILE = "sleepcore_tink_prefs"

        // Legacy EncryptedSharedPreferences (for migration)
        private const val LEGACY_PREFS_NAME = "sleepcore_secure_prefs"
    }

    private val dataStore = context.tokenDataStore

    private val _credentialsFlow = MutableStateFlow<StoredCredentials?>(null)
    val credentialsFlow: Flow<StoredCredentials?> = _credentialsFlow.asStateFlow()

    // Tink AEAD for encryption
    private var aead: Aead? = null
    private var initializationError: Exception? = null

    /**
     * Initialization state for UI observation
     *
     * UI should check this before calling sync methods like isLinked().
     * Pattern: Android Developers UI State Production (2025)
     */
    private val _initState = MutableStateFlow<StorageInitState>(StorageInitState.Initializing)
    val initState: StateFlow<StorageInitState> = _initState.asStateFlow()

    /**
     * CompletableDeferred for awaiting initialization
     *
     * Sync methods can use this to block until ready.
     * Pattern: Kotlin Docs CompletableDeferred (2025)
     */
    private val initCompleted = CompletableDeferred<Unit>()

    init {
        // Initialize Tink and migrate in background
        CoroutineScope(Dispatchers.IO).launch {
            try {
                initializeTink()
                migrateFromEncryptedSharedPreferences()
                loadCredentialsAsync()

                // Signal initialization complete
                _initState.value = StorageInitState.Ready
                initCompleted.complete(Unit)
                Log.d(TAG, "TokenStorage initialization completed")
            } catch (e: Exception) {
                Log.e(TAG, "Initialization failed", e)
                initializationError = e
                _initState.value = StorageInitState.Failed(e)
                initCompleted.completeExceptionally(e)
            }
        }
    }

    /**
     * Await initialization (suspend version)
     *
     * Use this in coroutines before accessing credentials.
     */
    suspend fun awaitInitialization(): Boolean {
        return try {
            initCompleted.await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Initialization await failed", e)
            false
        }
    }

    /**
     * Wait for initialization with timeout (blocking version)
     *
     * For sync methods that need to ensure initialization.
     * Returns true if initialized, false if timeout/failed.
     */
    private fun awaitInitializationBlocking(): Boolean {
        if (initCompleted.isCompleted) return !initCompleted.isCompletedExceptionally

        return try {
            runBlocking {
                withTimeoutOrNull(INIT_TIMEOUT_MS) {
                    initCompleted.await()
                    true
                } ?: false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Blocking init await failed", e)
            false
        }
    }

    /**
     * Initialize Tink AEAD encryption
     */
    private fun initializeTink() {
        try {
            AeadConfig.register()

            val keysetManager = AndroidKeysetManager.Builder()
                .withSharedPref(context, TINK_KEYSET_NAME, TINK_PREF_FILE)
                .withKeyTemplate(KeyTemplates.get("AES256_GCM"))
                .withMasterKeyUri("android-keystore://sleepcore_tink_master_key")
                .build()

            aead = keysetManager.keysetHandle.getPrimitive(Aead::class.java)
            Log.d(TAG, "Tink AEAD initialized successfully")
        } catch (e: GeneralSecurityException) {
            Log.e(TAG, "Tink initialization failed, attempting recovery", e)
            // Try to recover by clearing corrupted keyset
            try {
                context.getSharedPreferences(TINK_PREF_FILE, Context.MODE_PRIVATE)
                    .edit()
                    .clear()
                    .apply()

                // Retry initialization
                val keysetManager = AndroidKeysetManager.Builder()
                    .withSharedPref(context, TINK_KEYSET_NAME, TINK_PREF_FILE)
                    .withKeyTemplate(KeyTemplates.get("AES256_GCM"))
                    .withMasterKeyUri("android-keystore://sleepcore_tink_master_key")
                    .build()

                aead = keysetManager.keysetHandle.getPrimitive(Aead::class.java)
                Log.w(TAG, "Tink recovered after clearing corrupted keyset")
            } catch (e2: Exception) {
                Log.e(TAG, "Tink recovery failed", e2)
                initializationError = e2
            }
        }
    }

    /**
     * Migrate from old EncryptedSharedPreferences to DataStore + Tink
     */
    private suspend fun migrateFromEncryptedSharedPreferences() {
        // Check if already migrated
        val migrated = dataStore.data.first()[KEY_MIGRATED]
        if (migrated == "true") {
            Log.d(TAG, "Already migrated from EncryptedSharedPreferences")
            return
        }

        try {
            // Try to read from old EncryptedSharedPreferences
            val legacyPrefs = getLegacyPrefs()
            if (legacyPrefs == null) {
                Log.d(TAG, "No legacy data to migrate")
                markAsMigrated()
                return
            }

            val token = legacyPrefs.getString("device_token", null)
            val expiresAt = legacyPrefs.getString("token_expires_at", null)
            val userId = legacyPrefs.getString("user_id", null)
            val telegramId = legacyPrefs.getLong("telegram_id", 0)
            val userName = legacyPrefs.getString("user_name", null)
            val deviceId = legacyPrefs.getString("device_id", null)
            val linkedAt = legacyPrefs.getString("linked_at", null)
            val lastSyncTime = legacyPrefs.getString("last_sync_time", null)

            if (token != null && userId != null && userName != null && deviceId != null) {
                Log.i(TAG, "Migrating credentials from EncryptedSharedPreferences")

                // Save to new DataStore with Tink encryption
                // SECURITY: All PII including telegramId is encrypted (HIPAA/MASVS)
                dataStore.edit { prefs ->
                    prefs[KEY_TOKEN] = encrypt(token)
                    expiresAt?.let { prefs[KEY_EXPIRES_AT] = it }
                    prefs[KEY_USER_ID] = encrypt(userId)
                    prefs[KEY_TELEGRAM_ID] = encrypt(telegramId.toString())
                    prefs[KEY_USER_NAME] = encrypt(userName)
                    prefs[KEY_DEVICE_ID] = encrypt(deviceId)
                    linkedAt?.let { prefs[KEY_LINKED_AT] = it }
                    lastSyncTime?.let { prefs[KEY_LAST_SYNC_TIME] = it }
                }

                Log.i(TAG, "Migration successful")
            }

            // Clear old storage after successful migration
            legacyPrefs.edit().clear().apply()
            context.deleteSharedPreferences(LEGACY_PREFS_NAME)
            Log.d(TAG, "Cleared legacy EncryptedSharedPreferences")

            markAsMigrated()
        } catch (e: Exception) {
            Log.e(TAG, "Migration failed, will use fresh storage", e)
            // Don't block on migration failure - just start fresh
            markAsMigrated()
        }
    }

    private suspend fun markAsMigrated() {
        dataStore.edit { prefs ->
            prefs[KEY_MIGRATED] = "true"
        }
    }

    /**
     * Get legacy EncryptedSharedPreferences (for migration only)
     */
    private fun getLegacyPrefs(): SharedPreferences? {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                LEGACY_PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            Log.w(TAG, "Cannot access legacy EncryptedSharedPreferences", e)
            null
        }
    }

    /**
     * Encrypt string with Tink AEAD
     *
     * SECURITY: Never falls back to plaintext storage.
     * If encryption fails, an exception is thrown.
     *
     * @throws SecurityException if Tink is not initialized or encryption fails
     */
    private fun encrypt(plaintext: String): String {
        val cipher = aead ?: throw SecurityException(
            "Tink AEAD not initialized. Cannot store credentials securely. " +
            "Error: ${initializationError?.message ?: "Unknown"}"
        )
        return try {
            val ciphertext = cipher.encrypt(plaintext.toByteArray(Charsets.UTF_8), null)
            Base64.encodeToString(ciphertext, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e(TAG, "Encryption failed", e)
            throw SecurityException("Failed to encrypt sensitive data: ${e.message}", e)
        }
    }

    /**
     * Decrypt string with Tink AEAD
     *
     * SECURITY: Never returns ciphertext as-is on failure.
     * If decryption fails, an exception is thrown.
     *
     * @throws SecurityException if Tink is not initialized or decryption fails
     */
    private fun decrypt(ciphertext: String): String {
        val cipher = aead ?: throw SecurityException(
            "Tink AEAD not initialized. Cannot decrypt credentials. " +
            "Error: ${initializationError?.message ?: "Unknown"}"
        )
        return try {
            val decoded = Base64.decode(ciphertext, Base64.NO_WRAP)
            String(cipher.decrypt(decoded, null), Charsets.UTF_8)
        } catch (e: Exception) {
            Log.e(TAG, "Decryption failed", e)
            throw SecurityException("Failed to decrypt sensitive data: ${e.message}", e)
        }
    }

    /**
     * Load credentials asynchronously
     */
    private suspend fun loadCredentialsAsync() {
        try {
            val prefs = dataStore.data.first()
            val credentials = parseCredentials(prefs)
            _credentialsFlow.value = credentials
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load credentials", e)
        }
    }

    /**
     * Parse credentials from DataStore preferences
     */
    /**
     * Parse credentials from DataStore preferences
     *
     * SECURITY: All PII fields are encrypted, including telegramId (HIPAA/MASVS-STORAGE L2)
     */
    private fun parseCredentials(prefs: Preferences): StoredCredentials? {
        val tokenEncrypted = prefs[KEY_TOKEN] ?: return null
        val expiresAt = prefs[KEY_EXPIRES_AT] ?: return null
        val userIdEncrypted = prefs[KEY_USER_ID] ?: return null
        val telegramIdEncrypted = prefs[KEY_TELEGRAM_ID] ?: return null
        val userNameEncrypted = prefs[KEY_USER_NAME] ?: return null
        val deviceIdEncrypted = prefs[KEY_DEVICE_ID] ?: return null
        val linkedAt = prefs[KEY_LINKED_AT] ?: return null
        val refreshTokenEncrypted = prefs[KEY_REFRESH_TOKEN]

        return try {
            StoredCredentials(
                token = decrypt(tokenEncrypted),
                expiresAt = Instant.parse(expiresAt),
                userId = decrypt(userIdEncrypted),
                telegramId = decrypt(telegramIdEncrypted).toLong(),
                userName = decrypt(userNameEncrypted),
                deviceId = decrypt(deviceIdEncrypted),
                linkedAt = Instant.parse(linkedAt),
                refreshToken = refreshTokenEncrypted?.let { decrypt(it) }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse credentials", e)
            null
        }
    }

    /**
     * Save device credentials after successful linking
     *
     * @param refreshToken Optional refresh token (new in Feb 2026)
     */
    suspend fun saveCredentials(
        token: String,
        expiresAt: String,
        userId: String,
        telegramId: Long,
        userName: String,
        deviceId: String,
        refreshToken: String? = null
    ) = withContext(Dispatchers.IO) {
        val linkedAt = Instant.now()

        // SECURITY: All PII encrypted including telegramId (HIPAA/MASVS-STORAGE L2)
        dataStore.edit { prefs ->
            prefs[KEY_TOKEN] = encrypt(token)
            prefs[KEY_EXPIRES_AT] = expiresAt
            prefs[KEY_USER_ID] = encrypt(userId)
            prefs[KEY_TELEGRAM_ID] = encrypt(telegramId.toString())
            prefs[KEY_USER_NAME] = encrypt(userName)
            prefs[KEY_DEVICE_ID] = encrypt(deviceId)
            prefs[KEY_LINKED_AT] = linkedAt.toString()
            if (refreshToken != null) {
                prefs[KEY_REFRESH_TOKEN] = encrypt(refreshToken)
            }
        }

        val credentials = StoredCredentials(
            token = token,
            expiresAt = Instant.parse(expiresAt),
            userId = userId,
            telegramId = telegramId,
            userName = userName,
            deviceId = deviceId,
            linkedAt = linkedAt,
            refreshToken = refreshToken
        )
        _credentialsFlow.value = credentials

        Log.d(TAG, "Credentials saved successfully (refreshToken: ${refreshToken != null})")
    }

    /**
     * Update tokens after refresh
     *
     * @param accessToken New access token
     * @param expiresIn Expiry in seconds (typically 3600 = 1 hour)
     * @param refreshToken New refresh token (rotated)
     */
    suspend fun updateTokens(
        accessToken: String,
        expiresIn: Int,
        refreshToken: String
    ) = withContext(Dispatchers.IO) {
        val expiresAt = Instant.now().plusSeconds(expiresIn.toLong())

        dataStore.edit { prefs ->
            prefs[KEY_TOKEN] = encrypt(accessToken)
            prefs[KEY_EXPIRES_AT] = expiresAt.toString()
            prefs[KEY_REFRESH_TOKEN] = encrypt(refreshToken)
        }

        // Update in-memory credentials
        val current = _credentialsFlow.value
        if (current != null) {
            _credentialsFlow.value = current.copy(
                token = accessToken,
                expiresAt = expiresAt,
                refreshToken = refreshToken
            )
        }

        Log.d(TAG, "Tokens refreshed successfully, expires at: $expiresAt")
    }

    /**
     * Get refresh token for token renewal
     */
    /**
     * Get refresh token for token renewal
     *
     * Waits for initialization to complete before returning.
     */
    fun getRefreshToken(): String? {
        awaitInitializationBlocking()
        return _credentialsFlow.value?.refreshToken
    }

    /**
     * Load stored credentials (sync version for compatibility)
     *
     * Waits for initialization to complete before returning.
     * For non-blocking access, use credentialsFlow.
     */
    fun loadCredentials(): StoredCredentials? {
        awaitInitializationBlocking()
        return _credentialsFlow.value
    }

    /**
     * Get bearer token header value
     *
     * Waits for initialization to complete before returning.
     */
    fun getBearerToken(): String? {
        awaitInitializationBlocking()
        val credentials = _credentialsFlow.value
        if (credentials == null || credentials.isExpired) return null
        return "Bearer ${credentials.token}"
    }

    /**
     * Check if device is linked
     *
     * Waits for initialization to complete before returning.
     * For non-blocking check, observe initState and credentialsFlow.
     */
    fun isLinked(): Boolean {
        awaitInitializationBlocking()
        val credentials = _credentialsFlow.value
        return credentials != null && !credentials.isExpired
    }

    /**
     * Save last sync time
     */
    suspend fun saveLastSyncTime(time: Instant) = withContext(Dispatchers.IO) {
        dataStore.edit { prefs ->
            prefs[KEY_LAST_SYNC_TIME] = time.toString()
        }
    }

    /**
     * Get last sync time
     */
    suspend fun getLastSyncTime(): Instant? = withContext(Dispatchers.IO) {
        try {
            val timeStr = dataStore.data.first()[KEY_LAST_SYNC_TIME]
            timeStr?.let { Instant.parse(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get last sync time", e)
            null
        }
    }

    /**
     * Get last sync time (sync version for compatibility)
     */
    fun getLastSyncTimeSync(): Instant? {
        // For backward compatibility - returns null if not yet loaded
        // Prefer using suspend version getLastSyncTime()
        return null
    }

    /**
     * Clear all stored credentials (on unlink)
     *
     * SECURITY: Removes ALL credentials including refresh token to prevent
     * unauthorized access after device unlink (MASVS-AUTH-2)
     */
    suspend fun clearCredentials() = withContext(Dispatchers.IO) {
        dataStore.edit { prefs ->
            prefs.remove(KEY_TOKEN)
            prefs.remove(KEY_REFRESH_TOKEN)  // SECURITY FIX: Was missing, caused credential leak
            prefs.remove(KEY_EXPIRES_AT)
            prefs.remove(KEY_USER_ID)
            prefs.remove(KEY_TELEGRAM_ID)
            prefs.remove(KEY_USER_NAME)
            prefs.remove(KEY_DEVICE_ID)
            prefs.remove(KEY_LINKED_AT)
            prefs.remove(KEY_LAST_SYNC_TIME)
        }
        _credentialsFlow.value = null
        Log.d(TAG, "Credentials cleared (including refresh token)")
    }

    /**
     * Check if storage is available and initialized
     */
    /**
     * Check if storage is available and initialized
     */
    fun isStorageAvailable(): Boolean = initCompleted.isCompleted &&
        !initCompleted.isCompletedExceptionally &&
        aead != null

    /**
     * Observe credentials as Flow
     */
    fun observeCredentials(): Flow<StoredCredentials?> = dataStore.data.map { prefs ->
        parseCredentials(prefs)
    }
}
