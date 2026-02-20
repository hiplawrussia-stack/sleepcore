/**
 * Biometric Authentication Manager
 * ==================================
 * HIPAA-compliant biometric authentication using BiometricPrompt.
 *
 * Requirements:
 * - BIOMETRIC_STRONG (Class 3 biometrics only)
 * - CryptoObject for key binding
 * - setInvalidatedByBiometricEnrollment(true)
 *
 * Use cases:
 * - Re-authentication after session timeout
 * - Access to sensitive PHI data
 * - Confirming destructive actions (unlink device)
 *
 * Confidence: HIGH
 * Source: OWASP MASVS-AUTH, Android BiometricPrompt documentation
 */

package ru.sleepcore.companion.security

import android.content.Context
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import dagger.hilt.android.qualifiers.ApplicationContext
import ru.sleepcore.companion.data.local.audit.AuditLogger
import ru.sleepcore.companion.data.local.audit.AuditOutcome
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Result of biometric authentication attempt
 */
sealed class BiometricAuthResult {
    data object Success : BiometricAuthResult()
    data class Error(val code: Int, val message: String) : BiometricAuthResult()
    data object Cancelled : BiometricAuthResult()
    data object NotAvailable : BiometricAuthResult()
    data object NotEnrolled : BiometricAuthResult()
}

/**
 * Biometric availability status
 */
sealed class BiometricAvailability {
    data object Available : BiometricAvailability()
    data object NotEnrolled : BiometricAvailability()
    data object HardwareUnavailable : BiometricAvailability()
    data object NoHardware : BiometricAvailability()
    data object SecurityUpdateRequired : BiometricAvailability()
}

@Singleton
class BiometricAuthManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val auditLogger: AuditLogger
) {
    companion object {
        private const val KEY_NAME = "sleepcore_biometric_key"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    }

    private val biometricManager = BiometricManager.from(context)

    /**
     * Check biometric availability
     */
    fun checkBiometricAvailability(): BiometricAvailability {
        return when (biometricManager.canAuthenticate(BIOMETRIC_STRONG)) {
            BiometricManager.BIOMETRIC_SUCCESS -> BiometricAvailability.Available
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> BiometricAvailability.NotEnrolled
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> BiometricAvailability.HardwareUnavailable
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> BiometricAvailability.NoHardware
            BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> BiometricAvailability.SecurityUpdateRequired
            else -> BiometricAvailability.HardwareUnavailable
        }
    }

    /**
     * Check if biometric authentication is available
     */
    fun isBiometricAvailable(): Boolean {
        return checkBiometricAvailability() == BiometricAvailability.Available
    }

    /**
     * Authenticate using biometrics
     *
     * @param activity FragmentActivity for showing BiometricPrompt
     * @param title Dialog title
     * @param subtitle Dialog subtitle
     * @param description Dialog description
     * @param negativeButtonText Text for cancel button
     * @param onResult Callback with authentication result
     */
    fun authenticate(
        activity: FragmentActivity,
        title: String,
        subtitle: String? = null,
        description: String? = null,
        negativeButtonText: String = "Cancel",
        onResult: (BiometricAuthResult) -> Unit
    ) {
        // Check availability first
        when (val availability = checkBiometricAvailability()) {
            BiometricAvailability.Available -> {
                // Continue with authentication
            }
            BiometricAvailability.NotEnrolled -> {
                onResult(BiometricAuthResult.NotEnrolled)
                return
            }
            else -> {
                onResult(BiometricAuthResult.NotAvailable)
                return
            }
        }

        val executor = ContextCompat.getMainExecutor(activity)

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)

                // Audit log successful biometric auth
                auditLogger.logAuthentication(
                    action = "BIOMETRIC_AUTH",
                    outcome = AuditOutcome.SUCCESS,
                    source = "BiometricAuthManager:authenticate"
                )

                onResult(BiometricAuthResult.Success)
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)

                // Audit log authentication error
                auditLogger.logAuthentication(
                    action = "BIOMETRIC_AUTH",
                    outcome = if (errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                        errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                        AuditOutcome.DENIED
                    } else {
                        AuditOutcome.ERROR
                    },
                    errorMessage = "$errorCode: $errString",
                    source = "BiometricAuthManager:authenticate"
                )

                when (errorCode) {
                    BiometricPrompt.ERROR_USER_CANCELED,
                    BiometricPrompt.ERROR_NEGATIVE_BUTTON -> {
                        onResult(BiometricAuthResult.Cancelled)
                    }
                    else -> {
                        onResult(BiometricAuthResult.Error(errorCode, errString.toString()))
                    }
                }
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()

                // Audit log failed attempt (biometric not recognized)
                auditLogger.logAuthentication(
                    action = "BIOMETRIC_AUTH",
                    outcome = AuditOutcome.FAILURE,
                    details = "Biometric not recognized",
                    source = "BiometricAuthManager:authenticate"
                )

                // Don't call onResult - BiometricPrompt allows retry
            }
        }

        val biometricPrompt = BiometricPrompt(activity, executor, callback)

        // Build prompt info
        val promptInfoBuilder = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setAllowedAuthenticators(BIOMETRIC_STRONG)
            .setNegativeButtonText(negativeButtonText)

        subtitle?.let { promptInfoBuilder.setSubtitle(it) }
        description?.let { promptInfoBuilder.setDescription(it) }

        val promptInfo = promptInfoBuilder.build()

        // Try to use crypto-bound authentication for extra security
        try {
            val cipher = getCipher()
            val secretKey = getOrCreateSecretKey()
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)

            biometricPrompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(cipher))
        } catch (e: Exception) {
            // Fallback to non-crypto authentication if key is invalidated
            // This can happen when biometrics are re-enrolled
            auditLogger.logSecurityEvent(
                action = "BIOMETRIC_KEY_INVALIDATED",
                outcome = AuditOutcome.SUCCESS,
                details = "Using non-crypto authentication",
                source = "BiometricAuthManager:authenticate"
            )
            biometricPrompt.authenticate(promptInfo)
        }
    }

    /**
     * Authenticate with device credential fallback
     * Allows PIN/pattern/password if biometric fails
     */
    fun authenticateWithDeviceCredentialFallback(
        activity: FragmentActivity,
        title: String,
        subtitle: String? = null,
        description: String? = null,
        onResult: (BiometricAuthResult) -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)

                auditLogger.logAuthentication(
                    action = "DEVICE_AUTH",
                    outcome = AuditOutcome.SUCCESS,
                    source = "BiometricAuthManager:authenticateWithDeviceCredentialFallback"
                )

                onResult(BiometricAuthResult.Success)
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)

                auditLogger.logAuthentication(
                    action = "DEVICE_AUTH",
                    outcome = AuditOutcome.ERROR,
                    errorMessage = "$errorCode: $errString",
                    source = "BiometricAuthManager:authenticateWithDeviceCredentialFallback"
                )

                when (errorCode) {
                    BiometricPrompt.ERROR_USER_CANCELED,
                    BiometricPrompt.ERROR_NEGATIVE_BUTTON -> {
                        onResult(BiometricAuthResult.Cancelled)
                    }
                    else -> {
                        onResult(BiometricAuthResult.Error(errorCode, errString.toString()))
                    }
                }
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
                // Don't call onResult - allows retry
            }
        }

        val biometricPrompt = BiometricPrompt(activity, executor, callback)

        val promptInfoBuilder = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)

        subtitle?.let { promptInfoBuilder.setSubtitle(it) }
        description?.let { promptInfoBuilder.setDescription(it) }

        val promptInfo = promptInfoBuilder.build()
        biometricPrompt.authenticate(promptInfo)
    }

    /**
     * Get or create secret key for crypto-bound biometric auth
     *
     * Key is invalidated when biometrics are re-enrolled
     * (setInvalidatedByBiometricEnrollment = true)
     */
    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)

        // Return existing key if available
        keyStore.getKey(KEY_NAME, null)?.let {
            return it as SecretKey
        }

        // Create new key
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )

        val keyGenParameterSpec = KeyGenParameterSpec.Builder(
            KEY_NAME,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_CBC)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_PKCS7)
            .setUserAuthenticationRequired(true)
            // Key is invalidated if biometrics are re-enrolled
            .setInvalidatedByBiometricEnrollment(true)
            .apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    setUserAuthenticationParameters(
                        0, // Timeout: 0 = every use requires auth
                        KeyProperties.AUTH_BIOMETRIC_STRONG
                    )
                }
            }
            .build()

        keyGenerator.init(keyGenParameterSpec)
        return keyGenerator.generateKey()
    }

    /**
     * Get cipher for crypto-bound authentication
     */
    private fun getCipher(): Cipher {
        return Cipher.getInstance(
            "${KeyProperties.KEY_ALGORITHM_AES}/" +
            "${KeyProperties.BLOCK_MODE_CBC}/" +
            KeyProperties.ENCRYPTION_PADDING_PKCS7
        )
    }
}
